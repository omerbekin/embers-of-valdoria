/**
 * Kan zemini + lanetli zemin (Ömer onaylı 2026-11-09). Sayılar veriden: formulas.json > heavyCrit / blood, grounds.json > blood / cursed_ground /
 * reactions (frozen, cleansed), statuses.json > unhallowed.
 * - Ağır FİZİKSEL kritik (can kaybı > maks can x heavyCrit.hpRatio) hedefin hücresine kan bırakır; kansız (bloodless) birim bırakmaz.
 * - Kan sıvıdır: içindeki herkes Soaked, şimşeği su gibi iletir, Chill/Ice ile Ice olur, Tremor Slam için liquid.
 * - Withering Curse lanetli zemin bırakır: içindeki düşman Unhallowed (alınan şifa çarpanı). Kutsal ateş + lanet = ikisi de kalkar.
 */
import { describe, expect, it } from 'vitest';
import { Battle, content, explainChoice } from '../src/engine';
import type { AiConfig, BattleEvent, Combatant, CombatantDef } from '../src/engine';

const F = content.formulas;
const BLOOD = F.blood!.ground;
const unitDef = (id: string): CombatantDef => (content.summons[id] ?? content.classes[id] ?? content.mobs[id] ?? content.bosses[id])!;
function arena(party: [string, number][], enemies: [string, number][], mode: 'turns' | 'test' = 'test', seed = 1): Battle {
  const base = content.battleSetup('random-battle', seed, mode, { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: party.map(([id]) => unitDef(id)), partySlots: party.map(([, s]) => s), enemies: enemies.map(([id]) => unitDef(id)), enemySlots: enemies.map(([, s]) => s) });
  b.freeMp = true;
  b.noCooldowns = true;
  for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, manaEcho: 0, armor: 0, magicArmor: 0, blockChance: 0 });
  return b;
}
const P = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot && !c.summoned)!;
const E = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot && !c.summoned)!;
function cast(b: Battle, uid: string, skill: string, target?: string, slot?: number): BattleEvent[] {
  const n = b.log.length;
  b.currentUid = uid; // turns modu: sıra bu birimde
  const r = b.useSkill(uid, skill, target, slot);
  if (!r.ok) throw new Error(`${uid} ${skill}: ${r.reason}`);
  return b.log.slice(n);
}
const bloodAt = (b: Battle, board: 'party' | 'enemy', slot: number) => b.ground.filter((g) => g.ground === BLOOD && g.board === board && g.slots.includes(slot));
/** Hedefin canını, tek kritik vuruşun eşiği rahatça aşacağı ya da hiç aşamayacağı kadar ayarlar. */
const setHp = (c: Combatant, hp: number) => {
  c.hp = c.maxHp = hp;
};

describe('kan zemini: veri', () => {
  it('eşik ve zemin veride; kan sıvı (soak + liquid), Chill/Ice ile donar', () => {
    expect(F.heavyCrit?.hpRatio).toBeGreaterThan(0);
    expect(F.blood!.turns).toBeGreaterThan(0);
    const g = content.grounds[BLOOD]!;
    expect(g.soak).toBe('soaked');
    expect(g.liquid).toBe(true);
    expect(content.groundReactions.frozen!.setup).toContain(BLOOD);
  });

  it('kansız birimler işaretli (iskelet, golem, ruh, bitki, yapı); kanlılar işaretsiz', () => {
    for (const id of ['skeleton', 'treant']) expect(content.summons[id]!.bloodless, id).toBe(true);
    for (const id of ['risen_skeleton', 'forge_golem', 'will_o_wisp', 'marsh_light', 'slagcart_golem', 'stonebound_warden']) expect(content.mobs[id]!.bloodless, id).toBe(true);
    for (const id of ['bridge_warden', 'iron_mooring', 'ember_of_the_first_hearth']) expect(content.bosses[id]!.bloodless, id).toBe(true);
    for (const id of ['ghoul', 'bandit_chief', 'grey_wolf']) expect(content.mobs[id]!.bloodless, id).toBeFalsy();
    expect(content.classes['warrior']!.bloodless).toBeFalsy();
  });
});

describe('kan zemini: motor', () => {
  it('ağır fiziksel kritik hedefin hücresine kan bırakır (sahibi vuran); hedef Soaked; iki modda', () => {
    for (const mode of ['turns', 'test'] as const) {
      const b = arena([['warrior', 0]], [['warrior', 0]], mode);
      const w = P(b, 0);
      const t = E(b, 0);
      setHp(t, 40);
      b.debug.crit = 'always';
      b.debug.damageMult = 20;
      cast(b, w.uid, 'melee_attack', t.uid);
      const g = bloodAt(b, 'enemy', t.slot);
      expect(g.length, mode).toBeGreaterThan(0);
      expect(g[0]!.source).toBe(w.uid);
      expect(g[0]!.turns).toBe(F.blood!.turns);
    }
  });

  it('canlı kalan hedef kanda Soaked olur', () => {
    const b = arena([['warrior', 0]], [['warrior', 0]]);
    const w = P(b, 0);
    const t = E(b, 0);
    setHp(t, 1000);
    b.debug.crit = 'always';
    // tek vuruş eşiği aşsın ama öldürmesin: hasarı eşik üstü ayarlamak için çarpanı ölç
    const ratio = F.heavyCrit!.hpRatio;
    b.debug.damageMult = 1;
    const probe = arena([['warrior', 0]], [['warrior', 0]]);
    setHp(E(probe, 0), 100000);
    probe.debug.crit = 'always';
    const ev = cast(probe, P(probe, 0).uid, 'melee_attack', E(probe, 0).uid).filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage');
    const perHit = Math.min(...ev.map((e) => e.amount));
    b.debug.damageMult = Math.ceil((t.maxHp * (ratio + 0.05)) / Math.max(1, perHit));
    cast(b, w.uid, 'melee_attack', t.uid);
    expect(t.hp).toBeGreaterThan(0);
    expect(bloodAt(b, 'enemy', t.slot).length).toBeGreaterThan(0);
    expect(t.statuses.some((s) => s.kind === 'soaked')).toBe(true);
  });

  it('kritik değilse, eşik altıysa, büyü vuruşuysa ya da hedef kansızsa kan yok', () => {
    // kritik değil
    let b = arena([['warrior', 0]], [['warrior', 0]]);
    setHp(E(b, 0), 40);
    b.debug.crit = 'never';
    b.debug.damageMult = 20;
    cast(b, P(b, 0).uid, 'melee_attack', E(b, 0).uid);
    expect(bloodAt(b, 'enemy', 0)).toHaveLength(0);
    // eşik altı (dev can)
    b = arena([['warrior', 0]], [['warrior', 0]]);
    setHp(E(b, 0), 1_000_000);
    b.debug.crit = 'always';
    cast(b, P(b, 0).uid, 'melee_attack', E(b, 0).uid);
    expect(bloodAt(b, 'enemy', 0)).toHaveLength(0);
    // büyü kritiği (Fire Bolt)
    b = arena([['mage', 0]], [['warrior', 0]]);
    setHp(E(b, 0), 40);
    b.debug.crit = 'always';
    b.debug.damageMult = 20;
    cast(b, P(b, 0).uid, 'fire_bolt', E(b, 0).uid);
    expect(bloodAt(b, 'enemy', 0)).toHaveLength(0);
    // kansız hedef (iskelet çağrısı, mob iskelet, golem)
    for (const id of ['skeleton', 'risen_skeleton', 'forge_golem']) {
      b = arena([['warrior', 0]], [[id, 0]]);
      const t = E(b, 0);
      expect(t.bloodless, id).toBe(true);
      setHp(t, 40);
      b.debug.crit = 'always';
      b.debug.damageMult = 20;
      cast(b, P(b, 0).uid, 'melee_attack', t.uid);
      expect(bloodAt(b, 'enemy', 0), id).toHaveLength(0);
    }
  });

  it('kan + Chill Ground = Ice (frozen tepkimesi); kan şimşeği su gibi iletir', () => {
    const b = arena([['mage', 0]], [['warrior', 0], ['warrior', 1]]);
    const me = P(b, 0);
    expect(b.debugPlaceGround(me.uid, BLOOD, 'enemy', [0, 1], 3).ok).toBe(true);
    const conduct = (b as unknown as { conductingCells(s: string): Set<number> }).conductingCells('enemy');
    expect([...conduct].sort()).toEqual([0, 1]);
    expect(E(b, 0).statuses.some((s) => s.kind === 'soaked')).toBe(true);
    expect(b.debugPlaceGround(me.uid, 'storm', 'enemy', [0], 3).ok).toBe(true);
    const rx = b.log.filter((e): e is Extract<BattleEvent, { type: 'groundReaction' }> => e.type === 'groundReaction');
    expect(rx.map((e) => e.reaction)).toEqual(['frozen']);
    expect(b.ground.filter((g) => g.slots.includes(0) && g.board === 'enemy').map((g) => g.ground)).toEqual(['ice_ground']);
    expect(bloodAt(b, 'enemy', 1)).toHaveLength(1);
  });
});

describe('lanetli zemin (Withering Curse)', () => {
  // Ömer 2026-11-16: Unhallowed şifa kesmez (Wound'la aynı işti); Tur 27: karanlık hasar çarpanı yok (lanet uzar: tests/tur27-curse-lingers)
  it('Withering Curse alanına Cursed Ground bırakır; içindeki düşman Unhallowed, karanlık hasar ve şifa aynı', () => {
    const eff = content.skills['withering_curse']!.effects.find((e) => e.type === 'ground');
    expect(eff && eff.type === 'ground' && eff.ground).toBe('cursed_ground');
    expect(content.statuses['unhallowed']!.healTakenMult).toBeUndefined();
    expect(content.statuses['unhallowed']!.elementTakenMult).toBeUndefined();
    for (const mode of ['turns', 'test'] as const) {
      const b = arena([['hexer', 4]], [['warrior', 0]], mode);
      const t = E(b, 0);
      t.hp = t.maxHp = 5000;
      const before = b.groundTickHeal(100, t);
      cast(b, P(b, 4).uid, 'withering_curse', undefined, t.slot);
      expect(b.ground.some((g) => g.ground === 'cursed_ground' && g.board === 'enemy' && g.slots.includes(t.slot)), mode).toBe(true);
      expect(t.statuses.some((s) => s.kind === 'unhallowed'), mode).toBe(true);
      expect(b.groundTickHeal(100, t)).toBe(before);
      expect(b.statusElementMult(t, 'dark')).toBe(1);
      expect(b.statusElementMult(t, 'fire')).toBe(1);
    }
  });

  it('dostu etkilemez (bırakanın tarafı)', () => {
    const b = arena([['hexer', 4], ['warrior', 0]], [['warrior', 0]]);
    expect(b.debugPlaceGround(P(b, 4).uid, 'cursed_ground', 'party', [0], 3).ok).toBe(true);
    expect(P(b, 0).statuses.some((s) => s.kind === 'unhallowed')).toBe(false);
  });

  it('kutsal ateş + lanet: ikisi de kalkar, hücre temiz (iki sıra)', () => {
    for (const [first, second] of [['cursed_ground', 'holy_fire'], ['holy_fire', 'cursed_ground']] as const) {
      const b = arena([['paladin', 4]], [['warrior', 0]]);
      const me = P(b, 4);
      expect(b.debugPlaceGround(me.uid, first, 'enemy', [0], 3).ok).toBe(true);
      expect(b.debugPlaceGround(me.uid, second, 'enemy', [0], 3).ok).toBe(true);
      const rx = b.log.filter((e): e is Extract<BattleEvent, { type: 'groundReaction' }> => e.type === 'groundReaction');
      expect(rx.map((e) => e.reaction), first).toEqual(['cleansed']);
      expect(b.ground.filter((g) => g.board === 'enemy' && g.slots.includes(0)), first).toHaveLength(0);
      expect(E(b, 0).statuses.some((s) => s.kind === 'unhallowed' || s.kind === 'searing'), first).toBe(false);
    }
  });
});

describe('YZ değeri', () => {
  const ai: AiConfig = { ...content.aiConfig, global: undefined };
  it('Withering Curse adayı lanetli zeminin değerini sayar (ground terimi > 0; yaralı düşman, düşman şifacısı var)', () => {
    const b = arena([['hexer', 4]], [['warrior', 0], ['paladin', 1]]);
    for (const c of b.combatants) if (c.side === 'enemy') c.hp = Math.round(c.maxHp * 0.5);
    const wc = explainChoice(b, P(b, 4).uid, ai)!.candidates.filter((c) => c.skill === 'withering_curse');
    expect(wc.length).toBeGreaterThan(0);
    expect(Math.max(...wc.map((c) => c.terms?.['ground'] ?? 0))).toBeGreaterThan(0);
  });

  it('ağır kritik olasılığı olan fiziksel vuruş kanın değerini notlar (bloodValue); kansız hedefte not yok', () => {
    const run = (enemy: string) => {
      const b = arena([['warrior', 0]], [[enemy, 0]]);
      const w = P(b, 0);
      w.stats.critChance = 0.5;
      const t = E(b, 0);
      t.hp = t.maxHp = 15;
      return explainChoice(b, w.uid, ai)!.candidates.flatMap((c) => c.notes ?? []).filter((n) => n.startsWith('blood on'));
    };
    expect(run('warrior').length).toBeGreaterThan(0);
    expect(run('risen_skeleton')).toHaveLength(0);
  });
});
