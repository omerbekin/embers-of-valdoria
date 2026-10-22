// Can ve ölüm reworkü (Ömer 2026-10-19, docs/design/hp-death-rework.md): yara, birikme, 3 yara -> ceset, Valor, dinlenme, zafer şifası, MP, kayıt göçü.
import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  activeHeroes,
  applyBattle,
  autoResolve,
  battleOutcomeOf,
  battlePlan,
  debugTeleport,
  debugWounds,
  heroWoundsLine,
  readSaves,
  moveTo,
  newCampaign,
  nextStep,
  normalizeState,
  SAVE_KEY,
  restAtCamp,
  restInTown,
  reviveWithValor,
  victoryHealFor,
  type CampaignState,
  type KV,
} from '../src/campaign';
import { ENDLESS, applyOutcome, chooseReward, newRun, parseRun, wavePlan, type EndlessRun } from '../src/endless';
import { Battle, content } from '../src/engine';
import { applyWounds, fallAfterVictory, valorClearWounds, valorRevivedCounts, woundHpFactor, woundTipData, woundsLine } from '../src/progression/wounds';
import campaignJson from '../data/campaign/campaign.json';
import endlessJson from '../data/endless.json';
import valorJson from '../data/valor.json';

const W = CONFIG.rules.wounds;
const at = (node: string, seed = 5): CampaignState => debugTeleport(newCampaign({ mode: 'normal', seed }), node);
/** Tavan level: XP level atlatmasın (level şifası can kuralını örtmesin). */
const maxed = (s: CampaignState): CampaignState => ({ ...s, roster: s.roster.map((h) => ({ ...h, level: 30, xp: 0 })) });
const setHero = (s: CampaignState, id: string, patch: Partial<CampaignState['roster'][number]>): CampaignState => ({ ...s, roster: s.roster.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
const hero = (s: CampaignState, id: string) => s.roster.find((h) => h.id === id)!;
const win = (s: CampaignState, down: string[] = [], hp = 0.5) =>
  applyBattle(s, { victory: true, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: down.includes(h.id) ? 0 : hp, alive: !down.includes(h.id) })) });

describe('yara kuralı (ortak, src/progression/wounds.ts)', () => {
  it('veri: kalkış %10, yara başına -%20 (toplamsal), 3 yara ölümcül; sefer ve Endless aynı sayılar', () => {
    expect(campaignJson.rules.wounds).toEqual({ riseRatio: 0.1, maxHpLoss: 0.2, lethal: 3 });
    expect(endlessJson.carry.wounds).toEqual(campaignJson.rules.wounds);
    expect([0, 1, 2, 3].map((n) => woundHpFactor(n, W))).toEqual([1, 0.8, 0.6, 0.4]);
    expect(woundHpFactor(9, W)).toBe(0.4); // ölümcül sınırın üstü ek kayıp vermez
    expect(woundsLine(2, W)).toBe('Wounds: 2 (-40% max HP)');
    expect(woundsLine(0, W)).toBe('');
    expect(fallAfterVictory(0, W)).toEqual({ corpse: false, wounds: 1, hpRatio: 0.1 });
    expect(fallAfterVictory(2, W)).toEqual({ corpse: false, wounds: 3, hpRatio: 0.1 });
    expect(fallAfterVictory(3, W)).toEqual({ corpse: true, wounds: 3 });
  });

  it('kurulum: hpMult ve item can eki çarpanla düşer, yarasız kurulum aynen', () => {
    expect(applyWounds({}, 0, W)).toEqual({});
    expect(applyWounds({ modifiers: { hpMult: 1.5, hpAdd: 20 } }, 2, W).modifiers).toEqual({ hpMult: 0.9, hpAdd: 12 });
  });
});

describe('sefer: zafer sonrası', () => {
  it('zafer şifası düğüm türüne göre: normal %25, elit %50, boss tam', () => {
    const r = CONFIG.rules;
    expect([r.victoryHeal, r.eliteVictoryHeal, r.bossVictoryHeal]).toEqual([0.25, 0.5, 1]);
    expect(victoryHealFor(r, 'battle')).toBe(0.25);
    expect(victoryHealFor(r, 'elite')).toBe(0.5);
    expect(victoryHealFor(r, 'boss')).toBe(1);
    const s = maxed(at('moor')); // Battle
    const out = win(s, [], 0.4);
    for (const h of activeHeroes(out)) expect(h.hpRatio).toBeCloseTo(0.4 + 0.25, 5);
  });

  it('savaşı düşmüş bitiren %10 canla 1 yara alır; yaralar birikir; 3 yaralı yine düşerse ceset; savaşta kalkan yara almaz', () => {
    let s = maxed(at('moor'));
    const id = activeHeroes(s)[0]!.id;
    for (let n = 1; n <= W.lethal; n++) {
      const t = win({ ...s, done: s.done.filter((k) => k !== 'moor:battle') }, [id]);
      expect(hero(t, id)).toMatchObject({ alive: true, hpRatio: W.riseRatio, wounds: n });
      s = t;
    }
    // 3 yaralı: bir daha düşerse ceset (yaralar kalır), sonraki savaşa ceset girer
    const dead = win({ ...s, done: s.done.filter((k) => k !== 'moor:battle') }, [id]);
    expect(hero(dead, id)).toMatchObject({ alive: false, hpRatio: 0, wounds: W.lethal });
    expect(battlePlan(debugTeleportKeep(dead, 'moor')).units.party[dead.active.indexOf(id)]?.startDead).toBe('revivable');
    // savaşta düşüp kalkan (sonuçta ayakta): yara yok, zafer şifası alır
    const fresh = maxed(at('moor'));
    const ok = win(fresh, [], 0.3);
    expect(hero(ok, id).wounds).toBeUndefined();
  });

  it('boss tam şifası yara silmez; yaralı kahraman level atlasa da %10 canla kalır', () => {
    const s0 = maxed(at('9'));
    const [a, b] = activeHeroes(s0);
    const s = setHero(s0, a!.id, { wounds: 2 });
    const t = win(s, [b!.id], 0.2);
    expect(hero(t, a!.id)).toMatchObject({ hpRatio: 1, wounds: 2 });
    expect(hero(t, b!.id)).toMatchObject({ hpRatio: W.riseRatio, wounds: 1 });
    // level atlayan düşmüş: yine riseRatio
    const lv = at('moor');
    const c = activeHeroes(lv)[0]!;
    const up = win(setHero(lv, c.id, { level: 1, xp: 10 ** 6 }), [c.id]);
    expect(hero(up, c.id).level).toBeGreaterThan(1);
    expect(hero(up, c.id).hpRatio).toBe(W.riseRatio);
  });

  it('Valor cesedi kaldırır (savaş dışında 4, savaşta 6) ve 1 yara siler (Ömer 2026-10-20; hepsini değil)', () => {
    expect(valorJson.revive).toMatchObject({ battleCost: 6, outsideCost: 4, clearWounds: 1 });
    expect(valorClearWounds()).toBe(1);
    const s0 = at('5A');
    const id = activeHeroes(s0)[0]!.id;
    const s = { ...setHero(s0, id, { alive: false, hpRatio: 0, wounds: 3 }), valor: 4 };
    const t = reviveWithValor(s, id);
    expect(t.valor).toBe(0);
    expect(hero(t, id)).toMatchObject({ alive: true, wounds: 2 });
    // 1 yaralıyı kaldırınca yara kalmaz
    const one = reviveWithValor({ ...setHero(s0, id, { alive: false, hpRatio: 0, wounds: 1 }), valor: 4 }, id);
    expect(hero(one, id).wounds).toBeUndefined();
  });

  it('savaş içi Valor diriltmesi 1 yara siler; Resurrection / Raise Dead (skill dirilişi) silmez', () => {
    const order = ['h1', 'h2', 'h3'];
    const log = [
      { type: 'revive', source: 'party-1', target: 'party-0', cause: 'valor' },
      { type: 'revive', source: 'party-1', target: 'party-2' }, // Resurrection: sayılmaz
      { type: 'revive', source: 'party-1', target: 'party-0', cause: 'valor' },
      { type: 'revive', source: 'enemy-0', target: 'enemy-1', cause: 'valor' },
    ];
    expect(valorRevivedCounts(log, order)).toEqual({ h1: 2 });
    // sahne / sim kapısı: battleOutcomeOf savaş günlüğünden okur
    const sb = at('moor');
    const plan = battlePlan(sb);
    const battle = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units }, false));
    (battle.log as unknown as object[]).push({ type: 'revive', source: 'party-0', target: 'party-0', hpAfter: 1, mpAfter: 0, cause: 'valor' });
    expect(battleOutcomeOf(plan, battle, true).valorRevived).toEqual({ [plan.heroOrder[0]!]: 1 });
    const s0 = maxed(at('moor'));
    const [a, b] = activeHeroes(s0);
    const s = setHero(setHero(s0, a!.id, { wounds: 3 }), b!.id, { wounds: 2 });
    // a: Valor ile kalktı ve savaşı ayakta bitirdi -> 2 yara; b: skill ile kalktı -> 2 yara aynen
    const units = activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: 0.5, alive: true }));
    const t = applyBattle(s, { victory: true, units, valorRevived: { [a!.id]: 1 } });
    expect(hero(t, a!.id).wounds).toBe(2);
    expect(hero(t, b!.id).wounds).toBe(2);
    // 3 yaralı Valor ile kalkıp yeniden düşerse: önce 1 yara silinir (2), sonra düşüş: %10 + 3 yara (ceset değil)
    const fell = applyBattle(s, { victory: true, units: units.map((u) => (u.heroId === a!.id ? { ...u, hpRatio: 0, alive: false } : u)), valorRevived: { [a!.id]: 1 } });
    expect(hero(fell, a!.id)).toMatchObject({ alive: true, hpRatio: W.riseRatio, wounds: 3 });
  });

  it('yaralar savaş kurulumunda maks canı düşürür (motor saf; 2 yara = -%40)', () => {
    const s0 = at('2');
    const id = activeHeroes(s0)[0]!.id;
    const maxHp = (s: CampaignState) => {
      const plan = battlePlan(s);
      const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units }, false));
      return b.combatants.find((c) => c.uid === `party-${plan.heroOrder.indexOf(id)}`)!.maxHp;
    };
    const full = maxHp(s0);
    const hurt = maxHp(setHero(s0, id, { wounds: 2 }));
    expect(hurt / full).toBeGreaterThan(0.57);
    expect(hurt / full).toBeLessThan(0.63);
  });
});

/** Aynı durumu karşılaşma adımı yeniden açık olacak şekilde tutar (ceset kurulumunu görmek için). */
function debugTeleportKeep(s: CampaignState, node: string): CampaignState {
  return { ...s, at: node, done: s.done.filter((k) => k !== `${node}:battle`) };
}

describe('sefer: dinlenme', () => {
  it('kamp (Riverside Camp) %50 iyileştirir ama yara SİLMEZ', () => {
    const s0 = at('river');
    const id = s0.roster[0]!.id;
    const r = restAtCamp(setHero(s0, id, { hpRatio: 0.2, wounds: 2 }));
    expect(hero(r, id)).toMatchObject({ hpRatio: 0.7, wounds: 2 });
  });

  it('kasabaya ilk varış bedava tam şifa + yaraları siler; sonraki ücretli dinlenme de siler; ceset kalkmaz ve yarası kalır', () => {
    let p = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), 'charcoal');
    for (let i = 0; i < 20 && nextStep(p).kind !== 'move'; i++) p = autoResolve(p);
    const [a, b] = p.roster;
    p = setHero(setHero(p, a!.id, { hpRatio: 0.3, wounds: 2 }), b!.id, { alive: false, hpRatio: 0, wounds: 3 });
    const first = moveTo(p, '7');
    expect(hero(first, a!.id)).toMatchObject({ hpRatio: 1 });
    expect(hero(first, a!.id).wounds).toBeUndefined();
    expect(hero(first, b!.id)).toMatchObject({ alive: false, wounds: 3 });
    // ücretli ateş başı
    const again = { ...setHero(first, a!.id, { wounds: 1, hpRatio: 0.5 }), gold: 999 };
    const rested = restInTown(again, '7');
    expect(rested.gold).toBeLessThan(999);
    expect(hero(rested, a!.id)).toMatchObject({ hpRatio: 1 });
    expect(hero(rested, a!.id).wounds).toBeUndefined();
    expect(CONFIG.texts.townRest).toContain('wounds are healed');
  });
});

describe('sefer: kayıt (sürüm 11)', () => {
  it('eski kayıt 0 yara ile yüklenir; bozuk değer atılır; geçerli değer korunur', () => {
    const s = at('2');
    const [a, b, c] = s.roster;
    const raw = JSON.parse(JSON.stringify(s)) as CampaignState;
    (raw.roster[0] as unknown as Record<string, unknown>).wounds = 'x';
    if (b) (raw.roster[1] as unknown as Record<string, unknown>).wounds = 2.7;
    const n = normalizeState(raw)!;
    expect(n.roster.find((h) => h.id === a!.id)!.wounds).toBeUndefined();
    if (b) expect(n.roster.find((h) => h.id === b.id)!.wounds).toBe(2);
    if (c) expect(n.roster.find((h) => h.id === c.id)!.wounds).toBeUndefined();
  });

  it('sürüm 10 dosyası okunur (yaralar 0) ve yeni sürümle yeniden yazılacak olarak işaretlenir', () => {
    const s = at('2');
    const file = { version: 10, counter: 1, lastSlot: 0, slots: [{ campaignId: s.campaignId, mode: 'normal', difficulty: 'medium', saves: [{ id: 'a1', kind: 'auto', savedAt: 'x', mode: 'normal', campaignId: s.campaignId, state: s, summary: {} }] }, null, null] };
    const mem = new Map<string, string>();
    const kv: KV = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
    mem.set(SAVE_KEY, JSON.stringify(file));
    const r = readSaves(kv);
    expect(r.corrupt).toBe(false);
    expect(r.migrated).toBe(true);
    expect(r.file.slots[0]!.saves[0]!.state.roster.every((h) => h.wounds === undefined)).toBe(true);
  });

  it('debug: yara ekle / sil', () => {
    const s = at('2');
    const id = activeHeroes(s)[0]!.id;
    const w2 = debugWounds(debugWounds(s, 1), 1);
    expect(hero(w2, id).wounds).toBe(2);
    expect(heroWoundsLine(hero(w2, id))).toBe('Wounds: 2 (-40% max HP)');
    expect(hero(debugWounds(w2, -1), id).wounds).toBe(1);
    expect(hero(debugWounds(w2, null), id).wounds).toBeUndefined();
  });
});

describe('Endless: aynı kurallar', () => {
  const PARTY = ['warrior', 'archer', 'mage', 'defender'];
  const fresh = (): EndlessRun => newRun(7, PARTY, 't');
  const won = (run: EndlessRun, dead: string[] = [], hp = 0.5) =>
    applyOutcome(run, { wave: run.wave }, { victory: true, units: run.heroes.map((h) => ({ heroId: h.id, hpRatio: dead.includes(h.id) ? 0 : hp, alive: !dead.includes(h.id), mpRatio: 0.2 })), kills: 0, turns: 1 });

  it('zafer şifası normal %25, elit %50, boss tam; MP taşınmaz (dolu)', () => {
    expect([ENDLESS.carry.victoryHeal, ENDLESS.carry.eliteHeal, ENDLESS.carry.bossHeal, ENDLESS.carry.mp]).toEqual([0.25, 0.5, 1, 'full']);
    for (const [wave, heal] of [[1, 0.25], [ENDLESS.eliteEvery, 0.5], [ENDLESS.bossEvery, 1]] as const) {
      const r = won({ ...fresh(), wave }, [], 0.4);
      for (const h of r.heroes) {
        expect(h.hpRatio).toBeCloseTo(Math.min(1, 0.4 + heal), 5);
        expect(h.carry?.mpRatio).toBeUndefined();
      }
    }
  });

  it('düşen yaralı kalkar, 3 yaralı ceset; yaralar dalga kurulumunda maks canı düşürür', () => {
    let run = fresh();
    for (let n = 1; n <= 3; n++) {
      run = { ...won(run, ['h1']), phase: 'ready', offer: undefined };
      expect(run.heroes[0]).toMatchObject({ hpRatio: 0.1, wounds: n });
    }
    const mult = (r: EndlessRun) => {
      const plan = wavePlan(r);
      return plan.units.party[plan.party.indexOf('warrior')]?.modifiers?.hpMult ?? 1;
    };
    const clean = { ...run, heroes: run.heroes.map((h) => ({ ...h, wounds: 0 })) };
    expect(mult(run) / mult(clean)).toBeCloseTo(0.4, 2);
    const dead = won(run, ['h1']);
    expect(dead.heroes[0]).toMatchObject({ hpRatio: 0, wounds: 3 });
  });

  it('Endless: savaş içi Valor diriltmesi 1 yara siler (valorRevived)', () => {
    const run = { ...fresh(), heroes: fresh().heroes.map((h) => ({ ...h, wounds: 2 })) };
    const r = applyOutcome(run, { wave: 1 }, { victory: true, units: run.heroes.map((h) => ({ heroId: h.id, hpRatio: 0.5, alive: true })), kills: 0, turns: 1, valorRevived: { h1: 1 } });
    expect(r.heroes[0]!.wounds).toBe(1);
    expect(r.heroes[1]!.wounds).toBe(2);
  });

  it("dinlenme karşılığı: Hero's Feast yaraları siler, iyileştirme kartı silmez (carry.clearWounds)", () => {
    expect(ENDLESS.carry.clearWounds).toEqual(['feast']);
    const boss = { ...fresh(), wave: ENDLESS.bossEvery };
    const hurt = { ...boss, heroes: boss.heroes.map((h) => ({ ...h, wounds: 2 })) };
    let r = won(hurt);
    if (r.phase === 'relic') r = { ...r, phase: 'reward' };
    const feast = r.offer!.findIndex((c) => c.kind === 'feast');
    expect(feast).toBeGreaterThanOrEqual(0);
    for (const h of chooseReward(r, feast).heroes) expect(h.wounds).toBeUndefined();
    const norm = won({ ...fresh(), heroes: fresh().heroes.map((h) => ({ ...h, wounds: 1 })) });
    const heal = norm.offer!.findIndex((c) => c.kind === 'heal');
    for (const h of chooseReward(norm, heal).heroes) expect(h.wounds).toBe(1);
  });

  it('kayıt sürüm 6: eski MP oranı silinir (yarım savaş atılır), yara temizlenir', () => {
    const run = fresh();
    const old = { ...run, heroes: run.heroes.map((h, i) => ({ ...h, carry: { mpRatio: 0.3 }, ...(i === 0 ? { wounds: 2 } : i === 1 ? { wounds: -1 } : {}) })), suspended: { wave: 1, seed: 1, turn: 1, hash: 'x', actions: [] } };
    const r = parseRun(JSON.stringify({ version: 5, run: old }))!;
    expect(r.heroes.every((h) => h.carry?.mpRatio === undefined)).toBe(true);
    expect(r.suspended).toBeUndefined();
    expect(r.heroes[0]!.wounds).toBe(2);
    expect(r.heroes[1]!.wounds).toBeUndefined();
  });
});

describe('wound tooltip content (V1 Scar + dots)', () => {
  const R = { riseRatio: 0.1, maxHpLoss: 0.2, lethal: 3 };
  it('rounds percentages and uses real numbers', () => {
    const d = woundTipData(3, R, { baseHp: 140 })!;
    expect(d.value).toBe('-60%');
    expect(d.title).toBe('3 Wounds');
    expect(d.maxHp).toBe('Max HP 56 of 140');
    expect(d.maxed).toBe(true);
    expect(d.lines.join(' ')).toContain('20%');
    expect(d.lines.some((l) => /corpse/.test(l))).toBe(true);
    expect(d.foot).toBe('Camp rest does not heal wounds.');
  });
  it('one wound is singular, not maxed, and 0 wounds has no tip', () => {
    const d = woundTipData(1, R, { baseHp: 100 })!;
    expect(d.title).toBe('1 Wound');
    expect(d.value).toBe('-20%');
    expect(d.maxed).toBe(false);
    expect(d.lines.some((l) => /corpse/.test(l))).toBe(false);
    expect(woundTipData(0, R)).toBeNull();
  });
  it('endless (no town) has no town / camp lines', () => {
    const d = woundTipData(2, R, { town: false })!;
    expect(d.foot).toBeUndefined();
    expect(d.lines.join(' ')).not.toMatch(/town/);
  });
});
