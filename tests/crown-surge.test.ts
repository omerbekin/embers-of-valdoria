// Crown Surge + Ashen Taint (Ömer 2026-10-27, map2-quests-surge.md bölüm 2; data/campaign/crown-surge.json, data/global-skills.json ash_surge / salt_surge).
import { afterEach, describe, expect, it } from 'vitest';
import {
  DROWNED_REACH,
  SURGE,
  activeHeroes,
  applyBattle,
  battleOutcomeOf,
  battlePlan,
  campaignWaveTeams,
  debugAddSurgeUses,
  debugAddTaint,
  debugJumpNode,
  isChapel,
  nextTaintGain,
  resetSurgeUses,
  surgeResetBlocked,
  surgeResetPrice,
  debugRefillSurge,
  debugSetSalt,
  getMap,
  moveTo,
  newCampaign,
  nextStep,
  normalizeState,
  setMapOverride,
  surgeIdsAt,
  taintHpFactor,
  type BattleOutcome,
  type CampaignState,
} from '../src/campaign';
import { Battle, content, describeGlobalSkill } from '../src/engine';
import type { BattleEvent, BattleMode } from '../src/engine';

afterEach(() => setMapOverride(DROWNED_REACH, null));

const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);

function mk(o: { mode?: BattleMode; surge?: string[]; seed?: number } = {}): Battle {
  return new Battle(
    content.battleSetup('random-battle', o.seed ?? 3, o.mode ?? 'turns', { party: cells({ 0: 'warrior', 1: 'archer', 4: 'mage' }), enemies: cells({ 0: 'warrior', 1: 'warrior' }), ...(o.surge ? { surge: { party: o.surge } } : {}) }, false),
  );
}
/** Sıradaki oyuncu birimine kadar düşman turlarını yapay olarak Skip ile geçer (turns modu). */
function toPartyTurn(b: Battle): string {
  for (let i = 0; i < 40 && !b.winner; i++) {
    const uid = b.currentUid!;
    if (b.get(uid)!.side === 'party') return uid;
    const r = b.useGlobal(uid, 'skip_turn');
    if (!r.ok) b.useGlobal(uid, 'rest').ok || b.useGlobal(uid, 'move_tile', b.freeTiles(uid)[0]);
  }
  throw new Error('no party turn');
}

describe('Crown Surge: motor (global surge eylemi)', () => {
  it('verilmezse görünmez (Quick Battle aynen); verilince yalnız o tarafta', () => {
    const plain = mk();
    expect(plain.globalSkillIds('party')).not.toContain('ash_surge');
    expect(plain.globalSkillIds()).not.toContain('ash_surge');
    const b = mk({ surge: ['ash_surge'] });
    expect(b.globalSkillIds('party')).toContain('ash_surge');
    expect(b.globalSkillIds('party')).not.toContain('salt_surge');
    expect(b.globalSkillIds('enemy')).not.toContain('ash_surge');
  });

  it('Ash Surge: takıma ×1.3 hasar durumu, çağıranın turu biter, savaş başına bir Surge (C10 c)', () => {
    const b = mk({ surge: ['ash_surge', 'salt_surge'] });
    const uid = toPartyTurn(b);
    expect(b.canUseGlobal(uid, 'ash_surge').ok).toBe(true);
    const r = b.useGlobal(uid, 'ash_surge');
    expect(r.ok).toBe(true);
    const ev = r.ok ? r.events : [];
    expect(ofType(ev, 'surge')).toEqual([{ type: 'surge', actor: uid, side: 'party', id: 'ash_surge' }]);
    const party = b.combatants.filter((c) => c.side === 'party' && c.hp > 0);
    for (const c of party) expect(c.statuses.some((s) => s.kind === 'ash_surge'), c.uid).toBe(true);
    // çağıranın bu turu sayıldı: kalan 3 kendi turu; diğerleri 3 (Ömer 2026-10-27: 3 tur)
    expect(content.globalSkills.ash_surge!.turns).toBe(3);
    expect(b.get(uid)!.statuses.find((s) => s.kind === 'ash_surge')!.turns).toBe(3);
    for (const c of party.filter((x) => x.uid !== uid)) expect(c.statuses.find((s) => s.kind === 'ash_surge')!.turns).toBe(3);
    expect(b.currentUid).not.toBe(uid); // eylem harcandı
    expect(b.surgeSpent('party')).toBe(true);
    const next = toPartyTurn(b);
    expect(b.canUseGlobal(next, 'salt_surge').ok).toBe(false);
    expect(b.canUseGlobal(next, 'ash_surge').ok).toBe(false);
  });

  it('Ash Surge verilen hasarı ×1.3 yapar (önizleme yolu dahil)', () => {
    const b = mk({ surge: ['ash_surge'] });
    const uid = toPartyTurn(b);
    const actor = b.get(uid)!;
    const foe = b.combatants.find((c) => c.side === 'enemy')!;
    const before = b.dealtDamageMult(actor, foe);
    b.useGlobal(uid, 'ash_surge');
    expect(b.dealtDamageMult(actor, foe)).toBeCloseTo(before * content.statuses.ash_surge!.damageDealtMult!, 6);
  });

  it('Salt Surge: her yaşayan dosta maks canın %15i süreli kalkan', () => {
    const b = mk({ surge: ['salt_surge'] });
    const uid = toPartyTurn(b);
    const r = b.useGlobal(uid, 'salt_surge');
    expect(r.ok).toBe(true);
    const ratio = content.globalSkills.salt_surge!.shieldRatio!;
    for (const c of b.combatants.filter((x) => x.side === 'party' && x.hp > 0)) expect(c.shield, c.uid).toBe(Math.round(c.maxHp * ratio));
  });

  it('test modunda da çalışır ve aynı seed + aynı eylem = aynı savaş', () => {
    const b = mk({ mode: 'test', surge: ['ash_surge'] });
    const uid = b.combatants.find((c) => c.side === 'party')!.uid;
    expect(b.useGlobal(uid, 'ash_surge').ok).toBe(true);
    expect(b.canUseGlobal(uid, 'ash_surge').ok).toBe(false);
    const run = () => {
      const x = mk({ surge: ['ash_surge'] });
      x.useGlobal(toPartyTurn(x), 'ash_surge');
      return JSON.stringify(x.log);
    };
    expect(run()).toBe(run());
  });

  it('Surge etkisi 3 savaş turu sürer (turns modu): Ash her kahramanın sonraki 3 kendi turunda, Salt kalkanı 3 tur', () => {
    for (const id of ['ash_surge', 'salt_surge'] as const) {
      const b = mk({ surge: [id] });
      const caster = toPartyTurn(b);
      expect(b.useGlobal(caster, id).ok).toBe(true);
      const party = b.combatants.filter((c) => c.side === 'party' && c.hp > 0).map((c) => c.uid);
      const has = (uid: string) => (id === 'ash_surge' ? b.get(uid)!.statuses.some((s) => s.kind === 'ash_surge') : (b.get(uid)!.shieldHooks ?? []).some((h) => h.skill === 'salt_surge'));
      // her birimin kendi tur BAŞINDA etkinin hâlâ olup olmadığı
      const covered: Record<string, number> = Object.fromEntries(party.map((u) => [u, 0]));
      const seen: Record<string, number> = Object.fromEntries(party.map((u) => [u, 0]));
      for (let i = 0; i < 80 && !b.winner && party.some((u) => seen[u]! < 5); i++) {
        const uid = b.currentUid!;
        if (uid in seen) {
          seen[uid]!++;
          if (has(uid)) covered[uid]!++;
        }
        if (!b.useGlobal(uid, 'skip_turn').ok) b.useGlobal(uid, 'rest').ok || b.useGlobal(uid, 'move_tile', b.freeTiles(uid)[0]);
      }
      for (const u of party) {
        // Ash: tur sonunda azalır = sonraki 3 kendi turunun tamamı; Salt: tur başında azalır = 3. kendi turunun başında biter (arada 3 düşman aralığı)
        expect(covered[u], `${id} ${u}`).toBe(id === 'ash_surge' ? 3 : 2);
        expect(has(u), `${id} ${u} bitti`).toBe(false);
      }
    }
    expect(content.globalSkills.salt_surge!.shieldTurns).toBe(3);
  });

  it('test modunda da süre 3 yazılır (test modunda süreler işlemez; çağırana ek tur yok)', () => {
    const a = mk({ mode: 'test', surge: ['ash_surge'] });
    const u1 = a.combatants.find((c) => c.side === 'party')!.uid;
    expect(a.useGlobal(u1, 'ash_surge').ok).toBe(true);
    for (const c of a.combatants.filter((x) => x.side === 'party' && x.hp > 0)) expect(c.statuses.find((s) => s.kind === 'ash_surge')!.turns, c.uid).toBe(3);
    const s = mk({ mode: 'test', surge: ['salt_surge'] });
    const u2 = s.combatants.find((c) => c.side === 'party')!.uid;
    expect(s.useGlobal(u2, 'salt_surge').ok).toBe(true);
    for (const c of s.combatants.filter((x) => x.side === 'party' && x.hp > 0)) expect(c.shieldHooks?.find((h) => h.skill === 'salt_surge')?.turns, c.uid).toBe(3);
  });

  it('debugSetSurge Surge açar ve yeniler; tanım metni veriden', () => {
    const b = mk();
    b.debugSetSurge('party', ['ash_surge']);
    const uid = toPartyTurn(b);
    expect(b.useGlobal(uid, 'ash_surge').ok).toBe(true);
    b.debugSetSurge('party', ['ash_surge']);
    expect(b.surgeSpent('party')).toBe(false);
    const info = describeGlobalSkill(content.globalSkills.ash_surge!, content.formulas, undefined, null, content.statuses);
    expect(info.lines.join(' ')).toContain('×1.3');
  });
});

/** Bölge I'in ilk savaş düğümünde (Harita 2), savaş adımı bekliyor. */
function atBattle(id = 'dr1'): CampaignState {
  setMapOverride(DROWNED_REACH, true);
  const t = debugJumpNode(newCampaign({ mode: 'normal', seed: 21 }), id);
  expect(nextStep(t).kind).toBe('battle');
  return t;
}
const win = (s: CampaignState, surged?: BattleOutcome['surged']): BattleOutcome => ({
  victory: true,
  units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: 1, alive: true })),
  flawless: true,
  ...(surged ? { surged } : {}),
});

describe('Crown Surge: sefer (bölge hakkı, Taint, Chapel, Salt)', () => {
  it('Harita 1de yok; Harita 2 savaşında Ash hakkı plana ve motora gider', () => {
    expect(surgeIdsAt(newCampaign({ mode: 'normal', seed: 1 }))).toEqual([]);
    const s = atBattle();
    const plan = battlePlan(s);
    expect(plan.surge).toEqual([SURGE.ash]);
    expect(campaignWaveTeams(plan).surge).toEqual({ party: [SURGE.ash] });
  });

  it('savaş günlüğünden çağıran kahraman; hak harcanır, Taint her kullanımda artar (1, 2, 3 ...)', () => {
    const s = atBattle();
    const plan = battlePlan(s);
    const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...campaignWaveTeams(plan) }, false));
    const uid = toPartyTurn(b);
    expect(b.useGlobal(uid, SURGE.ash).ok).toBe(true);
    const out = battleOutcomeOf(plan, b, true);
    const hero = plan.heroOrder[Number(uid.slice('party-'.length))]!;
    expect(out.surged).toEqual({ heroId: hero, id: SURGE.ash });
    const t = applyBattle(s, { ...win(s), surged: out.surged });
    expect(t.roster.find((h) => h.id === hero)!.taint).toBe(1);
    expect(t.surge).toMatchObject({ uses: 1, taken: 1 });
    expect(t.surge!.spent).toEqual([`${DROWNED_REACH}:I:${SURGE.ash}`]);
    // aynı bölgede hak yok; başka bölgede var
    expect(surgeIdsAt(t)).toEqual([]);
    expect(surgeIdsAt({ ...t, at: 'dr13' })).toEqual([SURGE.ash]);
    // ikinci kullanım +2, üçüncü +3 (aynı kahramana)
    const t2 = applyBattle({ ...atBattle('dr13'), surge: t.surge, roster: t.roster }, { ...win(t), surged: { heroId: hero, id: SURGE.ash } });
    expect(t2.roster.find((h) => h.id === hero)!.taint).toBe(3);
    expect(t2.surge).toMatchObject({ uses: 2, taken: 3 });
  });

  it('Taint maks canı yığın başına -%3 düşürür (savaş kurulumunda)', () => {
    const s = atBattle();
    const hero = activeHeroes(s)[0]!;
    const base = battlePlan(s);
    const tainted = battlePlan({ ...s, roster: s.roster.map((h) => (h.id === hero.id ? { ...h, taint: 2 } : h)) });
    const cell = s.active.indexOf(hero.id);
    expect(tainted.units.party[cell]!.modifiers!.hpMult).toBeCloseTo((base.units.party[cell]?.modifiers?.hpMult ?? 1) * taintHpFactor(2), 3);
    expect(taintHpFactor(2)).toBeCloseTo(1 - 2 * SURGE.taint.maxHpLoss, 6);
    expect(taintHpFactor(1000)).toBe(SURGE.taint.minFactor);
  });

  it('Chapel dinlenme düğümüne varış Taint siler (C5 b); (harita geçişi kahraman verisini aynen taşır, C6 a)', () => {
    setMapOverride(DROWNED_REACH, true);
    const chapel = 'dr49';
    expect(SURGE.chapels[DROWNED_REACH]).toContain(chapel);
    expect(getMap(DROWNED_REACH).nodes.find((n) => n.id === chapel)!.type).toBe('rest');
    let t = debugJumpNode(newCampaign({ mode: 'normal', seed: 5 }), 'dr48');
    t = debugAddTaint(t, 2);
    expect(activeHeroes(t).every((h) => h.taint === 2)).toBe(true);
    while (nextStep(t).kind !== 'move') t = applyBattle(t, win(t));
    t = moveTo(t, chapel);
    expect(t.roster.some((h) => h.taint)).toBe(false);
  });

  it('Harita 2de iki Chapel: dr23 Tidewatch Chapel (bölge II, ana yol) + dr49 Cliff Chapel (bölge IV), ikisi de kamp düğümü; dr39 Beacon Quay değil', () => {
    const m = getMap(DROWNED_REACH);
    expect([...SURGE.chapels[DROWNED_REACH]!].sort()).toEqual(['dr23', 'dr49']);
    const regions = new Set<string>();
    for (const id of SURGE.chapels[DROWNED_REACH]!) {
      const n = m.nodes.find((x) => x.id === id)!;
      expect(n.type, id).toBe('rest');
      expect(n.name, id).toContain('Chapel');
      expect(isChapel(DROWNED_REACH, id)).toBe(true);
      regions.add(n.region!);
    }
    expect(regions.size).toBe(2);
    const quay = m.nodes.find((x) => x.id === 'dr39')!;
    expect(quay.name).toBe('Beacon Quay'); // Ömer 2026-10-28: ikinci Chapel dr23, dr39 eski adına döndü
    expect(isChapel(DROWNED_REACH, 'dr39')).toBe(false);
  });

  it('yenilgide hak gitmez, Taint ve sayaç yazılmaz; tekrar denemede Surge yine var (Ömer 2026-10-27)', () => {
    const s = atBattle();
    const hero = activeHeroes(s)[0]!.id;
    const lost: BattleOutcome = { victory: false, units: activeHeroes(s).map((h) => ({ heroId: h.id, hpRatio: 0, alive: false })), flawless: false, surged: { heroId: hero, id: SURGE.ash } };
    const t = applyBattle(s, lost);
    expect(t.stats.defeats).toBe(s.stats.defeats + 1);
    expect(t.surge).toEqual(s.surge);
    expect(t.roster.find((h) => h.id === hero)!.taint).toBeUndefined();
    expect(nextStep(t).kind).toBe('battle');
    expect(battlePlan(t).surge).toEqual([SURGE.ash]);
    // tekrar denemede kazanılırsa hak o zaman gider
    const w = applyBattle(t, win(t, { heroId: hero, id: SURGE.ash }));
    expect(w.surge).toMatchObject({ uses: 1, taken: 1 });
    expect(surgeIdsAt(w)).toEqual([]);
  });

  it('Chapel: altınla Surge sayacı başa döner (bedava Taint temizliği ayrı); fiyat veriden, koşullar', () => {
    setMapOverride(DROWNED_REACH, true);
    const price = surgeResetPrice(DROWNED_REACH)!;
    expect(price).toBe(400);
    let t = debugJumpNode(newCampaign({ mode: 'normal', seed: 5 }), 'dr48');
    while (nextStep(t).kind !== 'move') t = applyBattle(t, win(t));
    // Chapel dışında: yok
    t = debugAddSurgeUses({ ...t, gold: price + 50 }, 3);
    expect(surgeResetBlocked(t)).toBe('Only a chapel can ease the Crown');
    t = moveTo(t, 'dr49');
    expect(nextTaintGain(t)).toBe(SURGE.taint.firstGain + 3 * SURGE.taint.gainStep);
    expect(surgeResetBlocked({ ...t, gold: price - 1 })).toBe(`You need ${price} gold`);
    expect(() => resetSurgeUses({ ...t, gold: price - 1 })).toThrow();
    expect(surgeResetBlocked(t)).toBeNull();
    const spent = [`${DROWNED_REACH}:I:${SURGE.ash}`];
    const r = resetSurgeUses({ ...t, surge: { ...t.surge, spent, taken: 6 } });
    expect(r.gold).toBe(50);
    expect(r.surge).toEqual({ spent, taken: 6 });
    expect(nextTaintGain(r)).toBe(SURGE.taint.firstGain);
    expect(nextStep(r).kind).toBe(nextStep(t).kind); // kamp seçimini harcamaz
    expect(surgeResetBlocked(r)).toBe('The Crown asks nothing more of you yet');
    // kayıt: sayaçsız Surge alanı aynen döner
    expect(normalizeState(JSON.parse(JSON.stringify(r)))?.surge).toEqual({ spent, taken: 6 });
  });

  it('Drowned Queen zaferi Salt Surgeü açar; açıkken plana iki ayrı hak gider', () => {
    const s = atBattle(SURGE.salt.unlock.node);
    expect(battlePlan(s).surge).toEqual([SURGE.ash]);
    const t = applyBattle(s, win(s));
    expect(t.surge?.salt).toBe(true);
    const u = debugSetSalt(atBattle(), true);
    expect(battlePlan(u).surge).toEqual([SURGE.ash, SURGE.salt.id]);
  });

  it('debug yenileme ve kayıt: alanlar isteğe bağlı, bozuk değer atılır (sürüm aynı)', () => {
    const s = atBattle();
    const t = applyBattle(s, win(s, { heroId: activeHeroes(s)[0]!.id, id: SURGE.ash }));
    expect(surgeIdsAt(debugRefillSurge(t))).toEqual([SURGE.ash]);
    const back = normalizeState(JSON.parse(JSON.stringify(t)));
    expect(back?.surge).toEqual(t.surge);
    expect(back?.roster[0]?.taint ?? 0).toBe(t.roster[0]?.taint ?? 0);
    const broken = JSON.parse(JSON.stringify(t));
    broken.surge = { spent: 'x', uses: -2, salt: 'yes' };
    broken.roster[0].taint = 'lots';
    const fixed = normalizeState(broken);
    expect(fixed?.surge).toBeUndefined();
    expect(fixed?.roster[0]?.taint).toBeUndefined();
  });
});
