import { describe, expect, it } from 'vitest';
import levelsJson from '../data/levels.json';
import endlessJson from '../data/endless.json';
import campaignJson from '../data/campaign/campaign.json';
import { content } from '../src/engine';
import {
  LEVELS,
  addXp,
  allocBlocked,
  allocate,
  autoAllocate,
  baseAttrs,
  baseRuleOk,
  canAddPoint,
  chapterLevels,
  gapFactor,
  heroXpMult,
  levelAt,
  loadout,
  normalizeLevelFields,
  splitXp,
  trackKills,
  xpToNext,
  type LevelHero,
} from '../src/progression';
import {
  SAVE_KEY,
  acknowledgeLevelUps,
  activeHeroes,
  allocateStats,
  applyBattle,
  autoAllocateAll,
  autoResolve,
  debugGrantXp,
  debugSetLevel,
  memoryKV,
  moveTo,
  newCampaign,
  nextStep,
  nodeLevel,
  pickHero,
  readSaves,
  type CampaignState,
} from '../src/campaign';
import { applyOutcome, newRun, parseRun, waveLevel, waveXp, wavePlan } from '../src/endless';

// Level / XP sistemi (Ömer 2026-10-17, docs/design/progression/levels.md)

describe('eğri ve veri', () => {
  it('tavan L50, eşik artan, tavanda XP birikmez; bölüm aralıkları (bölüm 1: L1-10, bölüm 5: L41-50)', () => {
    expect(LEVELS.maxLevel).toBe(50);
    for (let l = 1; l < 49; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
    expect(xpToNext(50)).toBe(0);
    const h: LevelHero = { id: 'a', class: 'warrior', level: 49, xp: 0 };
    addXp(h, 10 ** 9);
    expect([h.level, h.xp]).toEqual([50, 0]);
    expect(chapterLevels(1)).toEqual([1, 10]);
    expect(chapterLevels(5)).toEqual([41, 50]);
    expect(chapterLevels(9)).toEqual([50, 50]);
    expect(levelAt(1, 0)).toBe(1);
    expect(levelAt(1, 1)).toBe(10);
  });

  it('level atlama: 3 stat + 1 skill puanı her level için, birden çok level tek seferde', () => {
    const h: LevelHero = { id: 'a', class: 'warrior', level: 1, xp: 0 };
    const up = addXp(h, xpToNext(1) + xpToNext(2) + 1);
    expect(up).toEqual({ heroId: 'a', from: 1, to: 3 });
    expect([h.statPoints, h.skillPoints, h.xp]).toEqual([2 * levelsJson.statPointsPerLevel, 2 * levelsJson.skillPointsPerLevel, 1]);
    expect(addXp(h, 0)).toBeNull();
  });

  it('düğüm seviyesi: Valdoria başı L1, final L10', () => {
    expect(nodeLevel('valdoria', '1')).toBe(1);
    expect(nodeLevel('valdoria', '12')).toBe(10);
  });

  it('iyileşme %20: sefer düğüm arası (victoryHeal) ve Endless dalga arası kartı (healRatio)', () => {
    expect(campaignJson.rules.victoryHeal).toBe(0.2);
    expect(endlessJson.rewards.healRatio).toBe(0.2);
  });
});

describe('XP paylaşımı, level farkı ve istisna', () => {
  const heroes = [
    { id: 'a', level: 3 },
    { id: 'b', level: 3 },
    { id: 'c', level: 3 },
  ];
  it('düşman XP x çarpan / savaşa giren sayısı; düşen bölenden çıkmaz; düştükten sonraki öldürmeler %50', () => {
    const per = (10 * Math.pow(3, LEVELS.enemyXp.pow)) / 3; // enemyXp(3) / 3 kahraman
    const base = Math.round(10 * Math.pow(3, LEVELS.enemyXp.pow));
    const x = splitXp({ heroes, nodeLevel: 3, mult: 1, kills: [{ down: [] }, { down: [] }, { down: ['c'] }] });
    expect(x.a).toBe(Math.round((3 * base) / 3));
    expect(x.c).toBe(Math.round((2 * base) / 3 + (base / 3) * LEVELS.fallenShare));
    expect(per).toBeGreaterThan(0);
    // elit 2x, boss 4x, olay / hazine 0,5x
    const b1 = splitXp({ heroes, nodeLevel: 3, mult: LEVELS.nodeMult.battle!, kills: [{ down: [] }] }).a!;
    expect(b1).toBe(Math.round(base / 3));
    expect(splitXp({ heroes, nodeLevel: 3, mult: LEVELS.nodeMult.elite!, kills: [{ down: [] }] }).a).toBe(Math.round((base * 2) / 3));
    expect(splitXp({ heroes, nodeLevel: 3, mult: LEVELS.nodeMult.boss!, kills: [{ down: [] }] }).a).toBe(Math.round((base * 4) / 3));
    expect(LEVELS.nodeMult.event).toBe(0.5);
    expect(LEVELS.nodeMult.treasure).toBe(0.5);
  });

  it('level farkı: 2 level içinde tam, 2 ile 8 arası doğrusal, 8 ve üstü 0 (yukarı ve aşağı)', () => {
    expect(gapFactor(5, 7)).toBe(1);
    expect(gapFactor(9, 7)).toBe(1);
    expect(gapFactor(5, 10)).toBeCloseTo(0.5);
    expect(gapFactor(15, 10)).toBeCloseTo(0.5);
    expect(gapFactor(2, 10)).toBe(0);
    expect(gapFactor(20, 10)).toBe(0);
  });

  it('istisna: geride kalan yeni kahraman, takım düğüme yakınsa %100 (+ yakalama bonusu); tüm takım gerideyse ceza işler; öndekine istisna yok', () => {
    // takım L8, düğüm L10, yeni gelen L1: istisna (ceza yok), üstüne yakalama bonusu (tavan)
    expect(heroXpMult(1, [8, 8, 8], 10)).toBeCloseTo(1 + LEVELS.catchUp.max);
    // tüm takım L3, düğüm L10: herkes cezalı (kimse diğerlerinden geride değil)
    expect(heroXpMult(3, [3, 3, 3], 10)).toBeCloseTo(gapFactor(3, 10));
    // takımın ortalaması düğüme 8'den uzak: istisna yok
    expect(heroXpMult(1, [1, 1, 1], 10)).toBe(0);
    // önde olan (farm) kahramana istisna yok
    expect(heroXpMult(16, [10, 10, 10], 10)).toBeCloseTo(gapFactor(16, 10));
    expect(heroXpMult(18, [10, 10, 10], 10)).toBe(0);
    // yakalama bonusu: diğerlerinin ortalamasının altında level başına catchUp.perLevel
    expect(heroXpMult(6, [8, 8, 8], 8)).toBeCloseTo(1 + 2 * LEVELS.catchUp.perLevel);
  });
});

describe('temel stat kuralı ve dağıtım', () => {
  const playable = content.randomPool;
  it('sınıf başlangıç statları: en yüksek temel stat diğer üçünün toplamının en fazla %80\'i (oynanabilir her sınıf)', () => {
    for (const id of playable) {
      const a = content.classes[id]!.attributes;
      const v = [a.str, a.int, a.dex, a.luck];
      const top = Math.max(...v);
      const rest = v.reduce((x, y) => x + y, 0) - top;
      expect(top, id).toBeLessThanOrEqual(0.8 * rest + 1e-9);
    }
  });

  it('bir temel stat diğer üçünün toplamını aşamaz; item bonusu kurala girmez', () => {
    const h: LevelHero = { id: 'w', class: 'warrior', level: 10, statPoints: 27, alloc: {} };
    let added = 0;
    while (canAddPoint('warrior', h.alloc, 'str')) {
      allocate(h, { str: 1 });
      added++;
    }
    const a = baseAttrs('warrior', h.alloc)!;
    expect(baseRuleOk(a)).toBe(true);
    expect(a.str + LEVELS.statPerPoint).toBeGreaterThan(a.int + a.dex + a.luck);
    expect(allocBlocked(h, { str: 1 })).toMatch(/never exceed/);
    expect(() => allocate(h, { str: 1 })).toThrow();
    expect(h.statPoints).toBe(27 - added);
    // başka stata puan, ana stata yer açar
    allocate(h, { dex: 1 });
    expect(canAddPoint('warrior', h.alloc, 'str')).toBe(true);
    expect(allocBlocked(h, { luck: 999 })).toMatch(/Not enough/);
  });

  it('dağıtılmış puanlar savaş gücüne girer: puan x statPerPoint temel stata (motorun attrAdd kapısı)', () => {
    const l = loadout({ class: 'mage', alloc: { int: 3 } });
    expect(l.modifiers?.attrAdd?.int).toBe(3 * LEVELS.statPerPoint);
    expect(loadout({ class: 'mage' }).modifiers?.attrAdd).toBeUndefined();
  });

  it('oyuncu vekili: önce ana stat, kural engelleyince sınıfın ikinci statı; puan kalmaz', () => {
    const h: LevelHero = { id: 'm', class: 'mage', level: 20, statPoints: 57, alloc: {} };
    autoAllocate(h);
    expect(h.statPoints).toBe(0);
    expect(baseRuleOk(baseAttrs('mage', h.alloc)!)).toBe(true);
    expect((h.alloc!.int ?? 0)).toBeGreaterThan(20);
  });
});

/** Farmsız oyuncu: her düğüm bir kez, hep kazanır, ilk (ya da `pick`.) yol. Dönen: final sonrası durum ve savaş sayacına göre level atlamaları. */
function journey(seed: number, pick: number): { s: CampaignState; ups: number[] } {
  let s = newCampaign({ mode: 'normal', seed });
  let fights = 0;
  const ups: number[] = [];
  for (let g = 0; g < 500; g++) {
    const st = nextStep(s);
    if (st.kind === 'complete') break;
    if (st.kind === 'move') {
      s = moveTo(s, st.options[Math.min(pick, st.options.length - 1)]!);
      continue;
    }
    const lead = s.roster.find((h) => !h.tutorial);
    const before = lead?.level;
    s = autoAllocateAll(autoResolve(s, st));
    if (st.kind === 'battle' && lead) fights++;
    const after = s.roster.find((h) => h.id === lead?.id)?.level;
    if (before !== undefined && after !== undefined && after > before) ups.push(fights);
  }
  return { s, ups };
}

describe('sefer: eğri hedefi ve kurallar', () => {
  it('farmsız oyuncunun Ashford bölüğü bölüm 1 sonunda ~L8 (7-9); ilk level ilk savaşta, sonrakiler giderek seyrek', () => {
    for (const pick of [0, 1, 2]) {
      const { s, ups } = journey(7 + pick, pick);
      const levels = s.roster.map((h) => h.level);
      for (const l of levels) {
        expect(l).toBeGreaterThanOrEqual(7);
        expect(l).toBeLessThanOrEqual(9);
      }
      expect(ups[0]).toBe(1); // bölüğün ilk savaşı
      const gaps = ups.slice(1).map((u, i) => u - ups[i]!);
      expect(gaps[0]!).toBeLessThanOrEqual(2); // ilk level'lar 1-2 savaşta
    }
  });

  it('zafer XP verir, level atlayan ayaktaki kahraman tam iyileşir, düşen ceset kalır; Level Up kaydı ve onayı', () => {
    let s = pickHero(newCampaign({ mode: 'normal', seed: 5 }), 'warrior');
    const h = s.roster[0]!;
    s = { ...s, roster: s.roster.map((x) => ({ ...x, xp: xpToNext(1) - 1 })) };
    const won = applyBattle(s, { victory: true, units: [{ heroId: h.id, hpRatio: 0.3, alive: true }] });
    expect(won.roster[0]!.level).toBe(2);
    expect(won.roster[0]!.hpRatio).toBe(1);
    expect(won.levelUps).toEqual([{ heroId: h.id, from: 1, to: 2 }]);
    expect(acknowledgeLevelUps(won).levelUps).toBeUndefined();
    const fell = applyBattle(s, { victory: true, units: [{ heroId: h.id, hpRatio: 0, alive: false }] });
    expect(fell.roster[0]!.level).toBe(2); // düşen de XP alır (öldürme kaydı yok: hepsi düşmeden sayılır)
    expect(fell.roster[0]).toMatchObject({ hpRatio: 0, alive: false });
  });

  it('öldürme kaydı: düştükten sonraki öldürmeler %50 (sonuçta kills)', () => {
    let s = pickHero(newCampaign({ mode: 'normal', seed: 5 }), 'warrior');
    s = { ...s, roster: s.roster.map((x) => ({ ...x, level: 1, xp: 0 })) };
    const id = s.roster[0]!.id;
    const full = applyBattle(s, { victory: true, units: [{ heroId: id, hpRatio: 1, alive: true }], kills: [{ down: [] }, { down: [] }] });
    const half = applyBattle(s, { victory: true, units: [{ heroId: id, hpRatio: 1, alive: true }], kills: [{ down: [] }, { down: [id] }] });
    const xpOf = (x: CampaignState) => x.roster[0]!.xp + (x.roster[0]!.level > 1 ? xpToNext(1) : 0);
    expect(xpOf(half)).toBeLessThan(xpOf(full));
  });

  it('stat dağıtımı (Gear > Character) ve debug: XP ver / level ayarla', () => {
    let s = pickHero(newCampaign({ mode: 'normal', seed: 5 }), 'archer');
    s = debugSetLevel(s, 5);
    const h = s.roster[0]!;
    expect([h.level, h.statPoints, h.skillPoints]).toEqual([5, 12, 4]);
    const t = allocateStats(s, h.id, { dex: 2, luck: 1 });
    expect(t.roster[0]!.alloc).toEqual({ dex: 2, luck: 1 });
    expect(t.roster[0]!.statPoints).toBe(9);
    expect(s.roster[0]!.statPoints).toBe(12); // saf: girdi değişmez
    const g = debugGrantXp(t, xpToNext(5));
    expect(g.roster[0]!.level).toBe(6);
    expect(g.levelUps?.length).toBe(1);
    expect(activeHeroes(g).length).toBe(1);
  });
});

describe('kayıt göçü (sürüm 9)', () => {
  it('eski kayıt: level ve XP aynen, eksik puanlar level\'dan; bozuk değerler varsayılana; hiçbir şey geri alınmaz', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 21, campaignId: 'c21' }), 'warrior');
    const old = JSON.parse(JSON.stringify(s)) as CampaignState;
    old.roster = old.roster.map(({ statPoints: _a, skillPoints: _b, alloc: _c, ...h }) => ({ ...h, level: 4, xp: 33 }));
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, JSON.stringify({ version: 8, counter: 1, lastSlot: 0, slots: [{ campaignId: 'c21', mode: 'normal', difficulty: 'medium', startedAt: 't', lastPlayed: 't', saves: [{ id: 's1', kind: 'auto', savedAt: 't', mode: 'normal', campaignId: 'c21', summary: {}, state: old }] }, null, null] }));
    const r = readSaves(kv);
    expect(r.migrated).toBe(true);
    expect(r.corrupt).toBe(false);
    const h = r.file.slots[0]!.saves[0]!.state.roster[0]!;
    expect(h).toMatchObject({ level: 4, xp: 33, statPoints: 9, skillPoints: 3, alloc: {} });
    const bad: LevelHero = { id: 'x', class: 'mage', level: -2, xp: NaN, statPoints: 1.5, alloc: { int: -3, dex: 2 } as never };
    normalizeLevelFields(bad);
    expect(bad).toMatchObject({ level: 1, xp: 0, statPoints: 0, skillPoints: 0, alloc: { dex: 2 } });
  });
});

describe('Endless: dalgayla level', () => {
  it('koşu L1 başlar; dalga seviyesi dalgayla artar; kazanılan dalga XP verir, level atlayan tam can', () => {
    const run = newRun(3, ['warrior', 'archer', 'mage', 'druid'], 't');
    expect(run.heroes.every((h) => h.level === 1 && h.xp === 0)).toBe(true);
    expect(waveLevel(1)).toBe(1);
    expect(waveLevel(10)).toBe(10);
    const units = run.heroes.map((h) => ({ heroId: h.id, hpRatio: 0.4, alive: true }));
    const xp = waveXp(run, 1, { units, kills: 2 });
    expect(Object.keys(xp)).toHaveLength(4);
    const plan = wavePlan(run);
    const next = applyOutcome(run, plan, { victory: true, units, kills: 2, turns: 3 });
    const h0 = next.heroes[0]!;
    if (h0.level! > 1) expect(h0.hpRatio).toBe(1);
    else expect(h0.xp).toBeGreaterThan(0);
    // düştükten sonraki öldürme %50
    const half = waveXp(run, 1, { units, kills: 2, killLog: [{ down: [] }, { down: [run.heroes[0]!.id] }] });
    expect(half[run.heroes[0]!.id]).toBeLessThan(half[run.heroes[1]!.id]!);
  });

  it('20 dalga kayıpsız: kahraman ~dalga seviyesinin 0-3 altında (item seviye şartı ilvl - 3 ile takılabilir kalır)', () => {
    let run = newRun(3, ['warrior', 'archer', 'mage', 'druid'], 't');
    for (let w = 1; w <= 20; w++) {
      const xp = waveXp(run, w, { units: run.heroes.map((h) => ({ heroId: h.id, hpRatio: 1, alive: true })), kills: 2 });
      run = { ...run, heroes: run.heroes.map((h) => { const c = { ...h }; addXp(c, xp[h.id]!); return c; }) };
    }
    const lv = run.heroes[0]!.level!;
    expect(lv).toBeGreaterThanOrEqual(waveLevel(20) - 3);
    expect(lv).toBeLessThanOrEqual(waveLevel(20) + 1);
  });

  it('kayıt: eski Endless kahramanı (level alanları yok) okununca L1, puanlar boş', () => {
    const run = newRun(3, ['warrior', 'archer'], 't');
    const raw = JSON.parse(JSON.stringify({ ...run, heroes: run.heroes.map(({ level: _l, xp: _x, statPoints: _s, skillPoints: _k, alloc: _a, ...h }) => h) }));
    const got = parseRun(JSON.stringify({ version: 4, run: raw }));
    expect(got?.heroes[0]).toMatchObject({ level: 1, xp: 0, statPoints: 0, skillPoints: 0, alloc: {} });
  });
});

describe('öldürme izleyici (motor olay akışı)', () => {
  it('düşman ölümünde o an düşmüş kahramanlar; dirilen kahraman yeniden tam pay; çağrılar sayılmaz', () => {
    type L = (ev: { type: string; target: string }) => void;
    let listener: L = () => {};
    const units: Record<string, { uid: string; side: string; summoned: boolean; hp: number }> = {
      'party-0': { uid: 'party-0', side: 'party', summoned: false, hp: 10 },
      'party-1': { uid: 'party-1', side: 'party', summoned: false, hp: 10 },
      'enemy-0': { uid: 'enemy-0', side: 'enemy', summoned: false, hp: 10 },
      'enemy-1': { uid: 'enemy-1', side: 'enemy', summoned: false, hp: 10 },
      'enemy-s': { uid: 'enemy-s', side: 'enemy', summoned: true, hp: 10 },
    };
    const battle = {
      combatants: Object.values(units),
      get: (uid: string) => units[uid],
      on: (l: L) => {
        listener = l;
        return () => {};
      },
    };
    const t = trackKills(battle as never, ['h1', 'h2']);
    listener({ type: 'death', target: 'enemy-0' });
    listener({ type: 'death', target: 'party-1' });
    listener({ type: 'death', target: 'enemy-s' });
    listener({ type: 'death', target: 'enemy-1' });
    listener({ type: 'death', target: 'enemy-1' }); // aynı düşman bir kez
    expect(t.kills()).toEqual([{ down: [] }, { down: ['h2'] }]);
  });
});
