import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import campaignJson from '../data/campaign/campaign.json';
import {
  CONFIG,
  activeHeroes,
  applyBattle,
  autoResolve,
  debugSetValor,
  debugTeleport,
  nodeLevel,
  startPatrol,
  getMap,
  joinLevel,
  moveTo,
  newCampaign,
  nextStep,
  recruitInTown,
  reforgeBlocked,
  reforgeChoices,
  reforgeItem,
  reforgePrice,
  restInTown,
  settleJoiners,
  smithCap,
  smithHotspot,
  temperItem,
  temperPreview,
  temperGain,
  temperPrice,
  townRecruitOffer,
  townRestCount,
  townRestPrice,
  restPriceLevel,
  type CampaignState,
} from '../src/campaign';
import {
  ITEMS,
  affixDef,
  instanceIlvl,
  instanceIP,
  instanceRoll,
  instanceWeaponPower,
  itemDef,
  itemValue,
  legendaryPool,
  makeItem,
  rolledAffixes,
  rollLoot,
  rollRareDrop,
  statPointsAt,
  type ItemInstance,
} from '../src/progression';
import { leveledRun } from './level-helpers';
import { LEVELS } from '../src/progression/levels';
import { ENDLESS, applyOutcome, chooseReward, itemOptions, newRun, rewardOffer, type EndlessRun } from '../src/endless';

// İlerleme sistemi kararları TUR 1 (Ömer 2026-10-18; open-questions "360. İlerleme sistemi kararları, TUR 1"): madde 6, 7, 8, 9, 10, 13.

function at(target: string, until: string, seed = 4242): CampaignState {
  let s = debugTeleport(newCampaign({ mode: 'normal', seed }), target);
  for (let i = 0; i < 20 && nextStep(s).kind !== until; i++) s = autoResolve(s);
  expect(nextStep(s).kind).toBe(until);
  return s;
}

const withLevels = (s: CampaignState, level: number): CampaignState => ({ ...s, roster: s.roster.map((h) => ({ ...h, level, xp: 0, statPoints: 0, alloc: {} })) });

// Ömer 2026-10-23 (playtest D12): joinBelow 2 -> 0, yoldaş takımın ortalama level'ında gelir; testler veriden okur
const JB = LEVELS.joinBelow ?? 2;

describe('madde 6 (+ playtest D12): sonradan katılan kahraman takım ortalamasının joinBelow altında', () => {
  it('joinLevel: aktif takımın ortalaması (aşağı yuvarlanır) - joinBelow, en az L1', () => {
    const s = withLevels(at('7', 'town'), 8);
    expect(LEVELS.joinBelow).toBe(0); // D12: ortalama level
    expect(joinLevel(s)).toBe(8 - JB);
    expect(joinLevel(withLevels(s, 2))).toBe(Math.max(1, 2 - JB));
    expect(joinLevel({ roster: [], active: [] })).toBe(1);
    const mixed = { ...s, roster: s.roster.map((h, i) => ({ ...h, level: i === 0 ? 9 : 8 })) };
    expect(joinLevel(mixed)).toBe(Math.floor(mixed.roster.filter((h) => s.active.includes(h.id)).reduce((a, h) => a + h.level, 0) / mixed.roster.filter((h) => s.active.includes(h.id)).length) - JB);
  });

  it('kasabada katılan (recruitInTown): L6, XP 0, stat puanları dağıtılmamış (L6 toplamı), skill puanı level\'dan', () => {
    const s = withLevels(at('7', 'town'), 8);
    const offer = townRecruitOffer(s);
    expect(offer.length).toBeGreaterThan(0);
    const t = recruitInTown(s, offer[0]!);
    const h = t.roster.at(-1)!;
    expect([h.level, h.xp, h.statPoints, h.alloc]).toEqual([8 - JB, 0, statPointsAt(8 - JB), {}]);
    expect(h.skillPoints).toBe(8 - JB - 1);
    // eski kahramanlar değişmez
    expect(t.roster.slice(0, -1).map((x) => x.level)).toEqual(s.roster.map((x) => x.level));
    // yeni kahraman yoksa durum aynen
    expect(settleJoiners(t, t)).toBe(t);
  });
});

describe('madde 8: sefer item düşüşü %35 az, elit en az Uncommon, boss en az Rare', () => {
  const party = [{ class: 'warrior' }, { class: 'mage' }, { class: 'archer' }, { class: 'druid' }];

  it('veri: tek çarpan (loot.dropMult 0,65) ve nadirlik tabanı', () => {
    expect(ITEMS.loot.dropMult).toBe(0.65);
    expect(ITEMS.loot.rarityFloor).toEqual({ elite: 'uncommon', boss: 'rare' });
  });

  it('normal savaşın beklenen item sayısı perPartyMember x takım x 0,65', () => {
    let n = 0;
    const runs = 1500;
    for (let i = 0; i < runs; i++) n += rollLoot({ rng: new Rng(1000 + i), kind: 'battle', chapter: 1, ilvl: 6, party }).items.length;
    const want = ITEMS.loot.perPartyMember.battle * party.length * 0.65;
    expect(n / runs).toBeGreaterThan(want - 0.08);
    expect(n / runs).toBeLessThan(want + 0.08);
  });

  it('elit düşüşünün her item\'i en az Uncommon, boss\'unki en az Rare; garanti tabanı (minItems) aynen', () => {
    for (let i = 0; i < 300; i++) {
      const e = rollLoot({ rng: new Rng(i), kind: 'elite', chapter: 1, ilvl: 6, party });
      expect(e.items.length).toBeGreaterThanOrEqual(ITEMS.loot.minItems.elite);
      for (const r of e.rarities) expect(r).not.toBe('common');
      const b = rollLoot({ rng: new Rng(5000 + i), kind: 'boss', chapter: 1, ilvl: 10, party });
      expect(b.items.length).toBeGreaterThanOrEqual(ITEMS.loot.minItems.boss);
      for (const r of b.rarities) expect(['rare', 'epic']).toContain(r);
    }
  });

  it('Endless dokunulmadı: ödül kartları rollLoot / dropMult kullanmaz (rewardOffer item kartı sayısı aynen)', () => {
    const run = { ...newRun(3, ['warrior', 'mage', 'archer', 'druid'], 't'), stats: { cleared: 4, turns: 0, kills: 0 } } as EndlessRun;
    expect(rewardOffer(run).filter((c) => c.kind === 'item').length).toBeLessThanOrEqual(1);
  });
});

describe('madde 9: Legendary ortak havuzdan, boss\'a bağlı değil', () => {
  it('havuz yalnızca bölüme bakar (kaynak türü yok); normal savaştan da Legendary düşebilir', () => {
    expect(legendaryPool({ chapter: 1 }).length).toBeGreaterThan(0);
    let hit = false;
    for (let i = 0; i < 4000 && !hit; i++) hit = rollRareDrop({ rng: new Rng(i), kind: 'battle', misses: 200, chapter: 1 }).branch === 'legendary';
    expect(hit).toBe(true);
  });
});

describe('madde 7: demirci (Temper / Reforge)', () => {
  const town = (): CampaignState => ({ ...at('7', 'town'), gold: 5000 });
  const put = (s: CampaignState, inst: ItemInstance): CampaignState => ({ ...s, inventory: [...s.inventory, inst] });
  const weapon = (rarity: 'common' | 'epic' | 'legendary' = 'epic', ilvl = 5, uid = 'i900'): ItemInstance => {
    const d = ITEMS.items.find((x) => x.slot === 'weapon' && (rarity === 'legendary' ? x.rarity === 'legendary' : x.rarity !== 'legendary'))!;
    return makeItem(d.id, uid, new Rng(7), { rarity, ilvl });
  };

  it('veri: fiyatlar campaign.json > blacksmith (PROVİZYON); bölüm tavanı bölüm x 10; her kasabanın demirci yeri görselin içinde', () => {
    expect(campaignJson.blacksmith.ilvlPerChapter).toBe(10);
    expect(campaignJson._blacksmith).toMatch(/PROVİZYON/);
    expect(smithCap(town())).toBe(10);
    for (const n of getMap('valdoria').nodes.filter((x) => x.type === 'town')) {
      const h = smithHotspot(n)!;
      expect(h.action).toBe('smith');
      const [x0, y0, x1, y1] = h.rect;
      expect(x0 >= 0 && y0 >= 0 && x1 <= 1 && y1 <= 1 && x0 < x1 && y0 < y1).toBe(true);
      // kasabanın kendi yerleriyle üst üste binmez
      for (const o of n.scene!.hotspots) {
        const overlap = Math.min(x1, o.rect[2]) - Math.max(x0, o.rect[0]) > 0.001 && Math.min(y1, o.rect[3]) - Math.max(y0, o.rect[1]) > 0.001;
        expect(overlap, `${n.name}: blacksmith / ${o.id}`).toBe(false);
      }
    }
  });

  it('Temper: item seviyesi +1, silah gücü ve affix değerleri item seviyesi formülünden büyür, zar yeri aynı; altın düşer', () => {
    const inst = weapon('epic', 5);
    const s = put(town(), inst);
    const p = temperPreview(s, inst.uid)!;
    expect(p.blocked).toBeNull();
    expect(p.price).toBe(temperPrice(inst));
    const t = temperItem(s, inst.uid);
    const after = t.inventory.find((x) => x.uid === inst.uid)!;
    expect(instanceIlvl(after)).toBe(6);
    expect(instanceWeaponPower(after)).toBeGreaterThan(instanceWeaponPower(inst));
    const a0 = rolledAffixes(inst);
    const a1 = rolledAffixes(after);
    expect(a1.map((a) => a.id)).toEqual(a0.map((a) => a.id));
    expect(instanceRoll(after).affixes.map((a) => a.q)).toEqual(instanceRoll(inst).affixes.map((a) => a.q));
    expect(a1.reduce((x, a) => x + a.values[0]!, 0)).toBeGreaterThan(a0.reduce((x, a) => x + a.values[0]!, 0));
    expect(t.gold).toBe(s.gold - p.price);
    expect(s.inventory.find((x) => x.uid === inst.uid)).toEqual(inst); // saf
  });

  it('Temper: bölüm tavanında durur; Legendary 2 kat fiyat; her nadirlikte; altın yetmezse hata', () => {
    const top = weapon('common', 10);
    const s = put(town(), top);
    expect(temperPreview(s, top.uid)!.blocked).toMatch(/item level 10/);
    expect(() => temperItem(s, top.uid)).toThrow();
    const c = weapon('common', 4, 'i901');
    const l = weapon('legendary', 4, 'i902');
    // Ömer 2026-10-23 (open-questions 404): bir adım = gainRatio x seviye başına ortalama değer artışı (gainSpan) x (1 + perLevelRise x (ilvl - 1)), en az minPrice; Legendary 2 kat
    const T = CONFIG_SMITH().temper;
    const [lo, hi] = T.gainSpan;
    const lv = (x: ItemInstance, n: number): ItemInstance => ({ ...x, rolls: { ...instanceRoll(x), ilvl: n } });
    const gain = (x: ItemInstance) => (ITEMS.budget.goldPerIP * (instanceIP(lv(x, hi)) - instanceIP(lv(x, lo)))) / (hi - lo);
    const rise = (x: ItemInstance) => 1 + T.perLevelRise * (instanceIlvl(x) - 1);
    expect(temperGain(c)).toBeCloseTo(gain(c), 6);
    expect(temperPrice(c)).toBe(Math.round(Math.max(T.minPrice, T.gainRatio * gain(c) * rise(c))));
    expect(temperPrice(l)).toBe(Math.round(Math.max(T.minPrice, T.gainRatio * gain(l) * rise(l)) * T.legendaryMult));
    const poor = { ...put(town(), c), gold: temperPrice(c) - 1 };
    expect(temperPreview(poor, c.uid)!.blocked).toMatch(/more gold/);
    expect(() => temperItem(poor, c.uid)).toThrow(/more gold/);
    expect(instanceIlvl(temperItem({ ...poor, gold: temperPrice(c) }, c.uid).inventory.at(-1)!)).toBe(5);
  });

  it('Temper fiyatı değer artışına bağlı: büyümeyen örtük stat (kalkan bloğu) fiyatı şişirmez; ortalama eski düzeyde', () => {
    const T = CONFIG_SMITH().temper;
    expect(T.gainRatio).toBeGreaterThan(0);
    expect(T.minPrice).toBeGreaterThanOrEqual(1);
    const mk = (name: string, rarity: 'common' | 'rare', ilvl: number) => makeItem(ITEMS.items.find((x) => x.name === name)!.id, 'u', new Rng(7), { rarity, ilvl });
    // eski kural: Iron Buckler (Common, iL1) 34 > Work Gloves (Rare, iL1) 17; yeni kural: fiyat yalnız adımın getirdiği değer
    const buckler = mk('Iron Buckler', 'common', 1);
    const gloves = mk('Work Gloves', 'rare', 1);
    expect(temperPrice(buckler)).toBe(Math.round(Math.max(T.minPrice, T.gainRatio * temperGain(buckler))));
    expect(temperPrice(buckler)).toBeLessThanOrEqual(temperPrice(gloves));
    // düzgün: aynı item'in fiyatı seviyeyle hiç düşmez ve bir adımda en çok ~%10 artar (yuvarlama sıçraması yok)
    for (const d of ITEMS.items.filter((x) => x.rarity !== 'legendary'))
      for (const r of ['common', 'rare', 'epic'] as const) {
        const base = makeItem(d.id, 'u', new Rng(3), { rarity: r, ilvl: 1 });
        const ps = Array.from({ length: 9 }, (_, i) => temperPrice({ ...base, rolls: { ...instanceRoll(base), ilvl: i + 1 } }));
        for (let i = 1; i < ps.length; i++) {
          expect(ps[i]!).toBeGreaterThanOrEqual(ps[i - 1]!);
          expect(ps[i]! - ps[i - 1]!).toBeLessThanOrEqual(Math.max(1, Math.ceil(ps[i - 1]! * 0.1)));
        }
      }
    // bölüm 1 (iL 1-9) ortalaması: eski kuralın (0,5 x yükseltilmiş item'in değeri) ±%15'i içinde
    let now = 0;
    let old = 0;
    for (const d of ITEMS.items.filter((x) => x.rarity !== 'legendary'))
      for (const r of ['common', 'uncommon', 'rare', 'epic'] as const)
        for (let lv = 1; lv <= 9; lv++) {
          const it = makeItem(d.id, 'u', new Rng(lv * 31), { rarity: r, ilvl: lv });
          now += temperPrice(it);
          old += 0.5 * itemValue({ ...it, rolls: { ...instanceRoll(it), ilvl: lv + 1 } });
        }
    expect(now / old).toBeGreaterThan(0.85);
    expect(now / old).toBeLessThan(1.15);
  });

  it('Temper takılı item\'de: takan kahraman yeni seviye şartını (ilvl - 3) karşılamalı', () => {
    const base = town();
    const h = base.roster[0]!;
    const inst = weapon('common', 7, 'i903'); // 7 -> 8: şart L5
    const wear = (level: number): CampaignState => ({ ...base, roster: base.roster.map((x) => (x.id === h.id ? { ...x, level, equipment: { ...x.equipment, helm: null, weapon: inst } } : x)) });
    expect(temperPreview(wear(4), inst.uid)!.blocked).toMatch(/Level 5/);
    const t = temperItem(wear(5), inst.uid);
    expect(instanceIlvl(t.roster.find((x) => x.id === h.id)!.equipment.weapon!)).toBe(8);
  });

  it('Reforge: yalnız Epic, ana affix hariç; aynı kademeden, diğer affix\'lerde olmayan bir affix (aynısı da olabilir, karar 364); seed\'li; tam fiyat, her tekrarda x1,5', () => {
    const inst = weapon('epic', 6);
    const s = put(town(), inst);
    const roll = instanceRoll(inst);
    expect(reforgeBlocked(s, inst.uid, 0)).toMatch(/main/);
    const c = weapon('common', 6, 'i904');
    expect(reforgeBlocked(put(s, c), c.uid, 1)).toMatch(/Epic/);
    const idx = roll.affixes.length - 1;
    const tier = affixDef(roll.affixes[idx]!.id)!.tier;
    const p0 = reforgePrice(inst);
    const t = reforgeItem(s, inst.uid, idx);
    const after = t.inventory.find((x) => x.uid === inst.uid)!;
    const nr = instanceRoll(after);
    expect(reforgeChoices(inst, idx)).toContain(roll.affixes[idx]!.id); // aynı affix havuzda kalır
    expect(affixDef(nr.affixes[idx]!.id)!.tier).toBe(tier);
    expect(roll.affixes.filter((_, i) => i !== idx).map((a) => a.id)).not.toContain(nr.affixes[idx]!.id);
    expect(p0).toBe(Math.round(itemValue(inst) * CONFIG_SMITH().reforge.valueRatio));
    expect(nr.affixes.filter((_, i) => i !== idx)).toEqual(roll.affixes.filter((_, i) => i !== idx));
    expect(after.reforges).toBe(1);
    expect(t.gold).toBe(s.gold - p0);
    expect(reforgePrice(after)).toBe(Math.round(itemValue(after) * CONFIG_SMITH().reforge.valueRatio * CONFIG_SMITH().reforge.growth));
    expect(CONFIG_SMITH().reforge.growth).toBe(1.5);
    expect(reforgeItem(s, inst.uid, idx)).toEqual(t); // aynı durumdan aynı sonuç (save-scum yok)
    expect(reforgeChoices(after, idx)).toContain(nr.affixes[idx]!.id);
    // birçok seed'de en az bir kez aynı affix (yeni değerle) gelir
    let same = false;
    for (let k = 0; k < 40 && !same; k++) {
      const r = reforgeItem({ ...s, seed: s.seed + k }, inst.uid, idx);
      same = instanceRoll(r.inventory.find((x) => x.uid === inst.uid)!).affixes[idx]!.id === roll.affixes[idx]!.id;
    }
    expect(same).toBe(true);
    expect(itemDef(after.id)).toBeTruthy();
  });
});

type SmithCfg = { temper: { gainRatio: number; gainSpan: [number, number]; perLevelRise: number; minPrice: number; legendaryMult: number }; reforge: { valueRatio: number; growth: number } };
const CONFIG_SMITH = (): SmithCfg => (CONFIG as unknown as { blacksmith: SmithCfg }).blacksmith;

describe('madde 10: kasabada dinlenme, diriltme yok', () => {
  it('ilk dinlenme bedava, sonrakiler rest.price (takım levelına göre); yaşayanlar tam cana, düşmüş kalkmaz; sayaç kasaba başına', () => {
    const s0 = at('7', 'town');
    const s = { ...s0, gold: 100, townRests: {}, roster: s0.roster.map((h, i) => ({ ...h, hpRatio: i === 0 ? 0 : 0.4, alive: i !== 0 })) };
    expect(townRestPrice(s, '7')).toBe(0); // (eski kayıt: varışta sayaç yazılmamış) ilk dinlenme bedava
    const a = restInTown(s);
    expect(a.gold).toBe(100);
    expect(a.roster.map((h) => [h.alive, h.hpRatio])).toEqual(s.roster.map((_, i) => (i === 0 ? [false, 0] : [true, 1])));
    expect(townRestCount(a, '7')).toBe(1);
    const price = Math.round(CONFIG.rest.price.base + CONFIG.rest.price.perLevel * (restPriceLevel(a) - 1));
    expect(townRestPrice(a, '7')).toBe(price);
    const b = restInTown(a);
    expect(b.gold).toBe(100 - price);
    expect(townRestCount(b, '7')).toBe(2);
    expect(townRestPrice(b, '4')).toBe(0); // başka kasaba: kendi sayacı
    expect(() => restInTown({ ...a, gold: price - 1 })).toThrow(/more gold/);
  });

  it('dinlenme fiyatı level başına artar (Ömer 2026-10-26): L1 = 30, aktif takımın ortalama levelı (yuvarlanmış), dizilim dışı sayılmaz', () => {
    const s0 = at('7', 'town');
    expect(CONFIG.rest.price.base).toBe(30);
    const lv = (n: number, extra?: number) => ({ ...s0, townRests: { '7': 1 }, roster: s0.roster.map((h, i) => ({ ...h, level: i === 0 && extra ? extra : n })) });
    expect(townRestPrice(lv(1), '7')).toBe(30);
    expect(restPriceLevel(lv(8))).toBe(8);
    expect(townRestPrice(lv(8), '7')).toBe(Math.round(30 + CONFIG.rest.price.perLevel * 7));
    expect(townRestPrice(lv(14), '7')).toBeGreaterThan(townRestPrice(lv(8), '7'));
    const benched = { ...lv(5), roster: [...lv(5).roster, { ...lv(5).roster[0]!, id: 'bench', level: 40 }] };
    expect(restPriceLevel(benched)).toBe(5); // yedek / dizilim dışı kahraman fiyatı etkilemez
    expect(townRestPrice({ ...lv(8), townRests: {} }, '7')).toBe(0); // ilk dinlenme yine bedava
  });

  it('karar 364: kasabaya İLK varış = bedava dinlenme (tam şifa, sayaç 1); tekrar varışta şifa yok, ateş başı ücretli', () => {
    // Valdren Keep'e ilk varış (debugTeleport moveTo ile varır): şifa verildi ve bedava dinlenme kullanıldı
    const pre = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), 'charcoal');
    let p = pre;
    for (let i = 0; i < 20 && nextStep(p).kind !== 'move'; i++) p = autoResolve(p);
    const hurt = { ...p, roster: p.roster.map((h) => ({ ...h, hpRatio: 0.3 })) };
    const first = moveTo(hurt, '7');
    expect(first.roster.every((h) => h.hpRatio === 1)).toBe(true);
    expect(townRestCount(first, '7')).toBe(1);
    expect(townRestPrice(first, '7')).toBe(Math.round(CONFIG.rest.price.base + CONFIG.rest.price.perLevel * (restPriceLevel(first) - 1)));
    // kasabayı bitir, komşuya git, yaralı dön: varışta şifa YOK, sayaç aynı
    let s = first;
    for (let i = 0; i < 20 && nextStep(s).kind !== 'move'; i++) s = autoResolve(s);
    s = moveTo(s, 'charcoal');
    const back = moveTo({ ...s, roster: s.roster.map((h) => ({ ...h, hpRatio: 0.3 })) }, '7');
    expect(back.at).toBe('7');
    expect(back.roster.every((h) => h.hpRatio === 0.3)).toBe(true);
    expect(townRestCount(back, '7')).toBe(1);
    // ateş başı dinlenme ücretli ve iyileştirir
    const rested = restInTown({ ...back, gold: 100 });
    expect(rested.gold).toBe(100 - townRestPrice(back, '7'));
    expect(rested.roster.every((h) => h.hpRatio === 1)).toBe(true);
  });

  it('kasaba dışında yok; veride diriltme alanları yok, metinler diriltme demiyor', () => {
    expect(() => restInTown(at('10', 'battle'))).toThrow();
    expect(Object.keys(CONFIG.rest).sort()).toEqual(['heal', 'price']);
    expect(CONFIG.texts.townRest).not.toMatch(/back on their feet|revived/);
  });
});

describe('madde 13 + karar 364: Endless item kartı 3 seçenekli, boss zaferi %50 + kalıntı', () => {
  const party = ['warrior', 'mage', 'archer', 'druid'];

  it('normal ve elit dalgada item kartı 2, boss sonrası 3 farklı item taşır (karar 364); seçilen seçenek torbaya girer', () => {
    expect(ENDLESS.rewards.itemOptions).toEqual({ normal: 2, elite: 2, boss: 3 });
    const normal = rewardOffer(leveledRun({ ...newRun(3, party, 't'), wave: 4, phase: 'reward' as const, stats: { cleared: 3, turns: 0, kills: 0 } } as EndlessRun));
    expect(itemOptions(normal.find((c) => c.kind === 'item')!)).toHaveLength(2);
    let found = false;
    for (let seed = 1; seed < 40 && !found; seed++) {
      const run = leveledRun({ ...newRun(seed, party, 't'), wave: ENDLESS.bossEvery + 1, phase: 'reward' as const, stats: { cleared: ENDLESS.bossEvery, turns: 0, kills: 0 } } as EndlessRun);
      const offer = rewardOffer(run);
      const i = offer.findIndex((c) => itemOptions(c).length === 3);
      if (i < 0) continue;
      found = true;
      const opts = itemOptions(offer[i]!);
      expect(new Set(opts.map((o) => o.itemId)).size).toBe(3);
      const r = { ...run, offer };
      for (const k of [2, 1]) expect((chooseReward(r, i, ENDLESS, undefined, k).bag ?? []).at(-1)!.id).toBe(opts[k]!.itemId);
      const took0 = chooseReward(r, i);
      expect((took0.bag ?? []).at(-1)!.id).toBe(opts[0]!.itemId);
      expect(chooseReward(r, i, ENDLESS, undefined, 3)).toBe(r); // olmayan seçenek
    }
    expect(found).toBe(true);
  });

  it('boss zaferi: sağ kalanlar tam iyileşir (hp-death-rework 2026-10-19; TUR 1 madde 13 +%50 idi), MP dolu, sonra kalıntı seçimi', () => {
    expect(ENDLESS.carry.bossHeal).toBe(1);
    const run = { ...newRun(9, party, 't'), wave: ENDLESS.bossEvery } as EndlessRun;
    const ids = run.heroes.map((h) => h.id);
    const r = applyOutcome(run, { wave: ENDLESS.bossEvery }, { victory: true, units: ids.map((heroId, i) => ({ heroId, hpRatio: i === 0 ? 0.2 : 0.7, alive: true, mpRatio: 0.3 })), kills: 0, turns: 1 });
    expect(r.heroes[0]!.hpRatio).toBe(1);
    expect(r.heroes[1]!.hpRatio).toBe(1);
    expect(r.heroes[0]!.carry?.mpRatio).toBeUndefined();
    expect(r.phase).toBe('relic');
  });
});

// Ömer'in cevapları (2026-10-18, open-questions 364): bölük L1, level rampası Ashford sonrası başlar; Valor düğüm başına bir kez.
describe('karar 364: bölük L1; düğüm seviyesi Ashford sonrası L1den ölçeklenir', () => {
  it('bölük kurma ekranında seçilenler L1, XP 0, puan yok; tutorial kahramanı L1', () => {
    const tut = autoResolve(newCampaign({ mode: 'normal', seed: 77 })); // tutorial kahramanı seçildi
    expect(tut.roster.map((h) => h.level)).toEqual([1]);
    const t = autoResolve(at('4', 'company', 77));
    const company = t.roster.filter((h) => !h.tutorial);
    expect(company.length).toBeGreaterThan(0);
    for (const h of company) expect([h.level, h.xp, h.statPoints, h.skillPoints, h.alloc]).toEqual([1, 0, 0, 0, {}]);
  });

  it('tutorial, Ashford ve ilk Ashford sonrası düğümler L1; sonra final düğümüne (L10) doğru artar', () => {
    expect(LEVELS.rampStartSteps).toBe(2);
    const lv = (id: string) => nodeLevel('valdoria', id);
    for (const id of ['1', '2', '3', '4', 'moor', 'cairn']) expect(lv(id), id).toBe(1);
    expect(lv('12')).toBe(10);
    expect(lv('7')).toBeGreaterThan(1);
    // ileri yolda seviye azalmaz
    const map = getMap('valdoria');
    for (const e of map.edges) expect(lv(e.to)).toBeGreaterThanOrEqual(lv(e.from));
  });
});

describe('karar 364: Valor düğüm başına bir kez (devriye zaferi Valor vermez)', () => {
  it('ilk zafer Valor kazandırır, devriye zaferi kazandırmaz (savaşta harcanan yine düşülür)', () => {
    let s = debugSetValor(at('moor', 'battle'), 2);
    const win = (x: CampaignState, valorLeft?: number) => applyBattle(x, { victory: true, units: activeHeroes(x).map((h) => ({ heroId: h.id, hpRatio: 1, alive: true })), ...(valorLeft !== undefined ? { valorLeft } : {}) });
    s = win(s);
    expect(s.valor).toBeGreaterThan(2);
    const v = s.valor!;
    const p = startPatrol(s);
    expect(win(p).valor).toBe(v);
    expect(win(p, v - 1).valor).toBe(v - 1);
  });
});
