import { describe, expect, it } from 'vitest';
import { Battle, condHolds, content, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import type { CondHook, TreeHook } from '../src/engine/tree-hooks';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 2c (docs/design/skill-tree-implementation.md "Faz 2c notları"): motor boşlukları kapandı, bekleyen düğümlerin fx'i yazıldı.
// Her test YALNIZCA verilen düğümlerin fx'iyle derler (öbür düğüm / bar fx'leri boşaltılır), ağaçlı / ağaçsız aynı seed karşılaştırır.

const CLASSES = ['antimage', 'archer', 'cutthroat', 'defender', 'druid', 'gambler', 'hexer', 'mage', 'paladin', 'undead', 'warrior'];
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
/** Yalnızca `ranks` düğümleri (ve `bar` verilirse o bar bonusu) fx'li kalır; bar için sayaç dolgu puanıyla doldurulur. */
function only(cls: string, ranks: Record<string, number>, bar?: number): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b, i) => {
    if (i !== bar) b.fx = null;
  });
  const r: Record<string, number> = { ...ranks };
  if (bar !== undefined) r['zz.fill'] = (bar + 1) * 5;
  return compileTree(t, { v: t.version, r });
}
const withTree = (slot: number, tree: UnitSetup['tree']): Record<number, UnitSetup> => ({ [slot]: { tree } });
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
function cast(b: Battle, actor: Combatant, skill: string, target?: Combatant): BattleEvent[] {
  const from = b.log.length;
  actor.cooldowns[skill] = 0;
  actor.mp = actor.maxMp;
  const r = b.useSkill(actor.uid, skill, target?.uid);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const hooksOf = (tree: UnitSetup['tree'], node: string): TreeHook[] => (tree?.hooks ?? []).filter((h) => h.node === node);
const cond = (tree: UnitSetup['tree'], node: string): CondHook => hooksOf(tree, node).find((h) => h.h === 'cond') as CondHook;
const statusEv = (evs: BattleEvent[], target: string, status: string) =>
  evs.find((e) => e.type === 'status' && e.target === target && e.status === status) as Extract<BattleEvent, { type: 'status' }> | undefined;
const hitDamage = (evs: BattleEvent[], target: string): number => evs.reduce((s, e) => s + (e.type === 'damage' && e.target === target ? e.amount : 0), 0);
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const buff = (c: Combatant, kind: 'haste' | 'fortify' | 'blessed', turns = 3) => c.statuses.push({ kind, turns, source: c.uid });
/** Kalabalık bir seed taraması: `fn` true dönünce biter; hiç dönmezse test kırmızı. */
function seeds(what: string, fn: (seed: number) => boolean, n = 60): void {
  for (let s = 1; s <= n; s++) if (fn(s)) return;
  throw new Error(`${what}: hiçbir seed'de olmadı`);
}

describe('Faz 2c: veri', () => {
  it('11 ağacın tüm fx\'leri temiz derlenir (needs dahil)', () => {
    for (const c of CLASSES) expect(checkTreeFx(treeOf(c)!), c).toEqual([]);
  });

  it('rank "chance": yalnızca zar şansı rank ile çarpılır, +1 tur sabit kalır', () => {
    const cases: [string, string, number, number][] = [
      ['druid', '2.r', 3, 0.3],
      ['cutthroat', '3.f1', 2, 0.3],
      ['antimage', '2.f3', 5, 0.3],
      ['gambler', '3.r', 4, 0.2],
    ];
    for (const [cls, key, rank, chance] of cases) {
      const h = cond(only(cls, { [key]: rank }), `${cls}:${key}`);
      expect(h.procChance, `${cls} ${key}`).toBeCloseTo(chance, 9);
      expect(h.mod.turns, `${cls} ${key}`).toBe(1);
    }
  });

  it('hoşgörülü derleme: Spellsplitter + Drained Dry ve Desperate Sap + Deep Spring çökmeden derlenir', () => {
    const am = only('antimage', { '1.v': 1, '1.fa': 1 })!;
    const ms = am.skills!.mana_burn!;
    expect(ms.effects[0]!.type).toBe('dispel');
    expect(ms.effects.some((e) => e.type === 'damage')).toBe(false);
    const dr = only('druid', { '3.fb': 1 }, 3)!;
    const rj = dr.skills!.rejuvenate!;
    expect(rj.cooldown).toBe(4);
    expect(rj.effects.some((e) => e.type === 'hot')).toBe(false);
    const heals = rj.effects.filter((e) => e.type === 'heal') as { power: number }[];
    expect(heals.length).toBe(2);
    expect(heals[1]!.power).toBeCloseTo(0.225 * 4 * 1.25, 9);
  });

  it('Whiteout (needs Driving Snow): Blizzard Blind şansı x2, süre 2', () => {
    const t = only('mage', { '2.f3': 5, '2.eb': 1 })!;
    const st = t.skills!.blizzard!.effects.find((e) => e.type === 'status' && e.status === 'blinded') as { chance: number; turns: number };
    expect(st.chance).toBeCloseTo(0.5, 9);
    expect(st.turns).toBe(2);
  });

  it('Deep Rot + Black Mold: Wither +1 tur (Slow 3 kalır), +%30 güç, Slow yok', () => {
    const t = only('druid', { '0.fa': 1 }, 0)!;
    const e = t.passive!.effect as { status?: string; power: number; turns: number; dotTurns?: number };
    expect(e.status).toBeUndefined();
    expect(e.power).toBeCloseTo(0.195, 9);
    expect(e.turns).toBe(3);
    expect(e.dotTurns).toBe(4);
  });

  it('Gaunt Frame: maks can -%20, Vampiric Bite %70', () => {
    const t = only('undead', { '0.fa': 1 });
    expect((t!.passive!.effect as { ratio: number }).ratio).toBe(0.7);
    const plain = make({ 0: 'undead' }, { 0: 'mage' });
    const tree = make({ 0: 'undead' }, { 0: 'mage' }, withTree(0, t));
    expect(P(tree).maxHp).toBe(Math.round(P(plain).maxHp * 0.8));
  });

  it('Blind Zeal: Rising Fervor kancası düşer, yerine +%20 seri ve Divine Light -%30', () => {
    const t = only('paladin', { '1.ea': 1, '1.fa': 1 });
    expect(hooksOf(t, 'paladin:1.ea')).toEqual([]);
    const hs = hooksOf(t, 'paladin:1.fa') as CondHook[];
    expect(hs.find((h) => h.mod.powerMul === 0.2)?.skill).toBe('holy_strike');
    expect(hs.find((h) => h.at === 'passiveHeal')?.mod.powerMul).toBe(-0.3);
  });

  it('İlk cooldown\'lu skill koşulu (Warm Hands, First Refrain): ilk kullanımdan sonra tutmaz', () => {
    const t = only('mage', {}, 0);
    expect(cond(t, 'mage:bar[0]').mod.echoSet).toBe(1);
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, t));
    const sk = content.skills.blizzard!;
    expect(condHolds({ firstCooldownSkill: true }, { self: P(b), skill: sk })).toBe(true);
    cast(b, P(b), 'fire_bolt', E(b));
    expect(condHolds({ firstCooldownSkill: true }, { self: P(b), skill: sk })).toBe(P(b).treeCdUsed !== true);
    cast(b, P(b), 'blizzard', E(b));
    expect(P(b).treeCdUsed).toBe(true);
    expect(condHolds({ firstCooldownSkill: true }, { self: P(b), skill: sk })).toBe(false);
  });

  it('First Refrain: savaşın ilk cooldown\'lu büyüsü kesin yankılanır (turns modu)', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior' }, withTree(0, only('mage', {}, 0)), 5, 'turns');
    for (let i = 0; i < 6 && b.currentActor?.side !== 'party'; i++) b.skipTurn();
    const me = b.currentActor!;
    expect(me.side).toBe('party');
    const from = b.log.length;
    expect(b.useSkill(me.uid, 'blizzard', E(b).uid).ok).toBe(true);
    expect(b.log.slice(from).some((e) => e.type === 'passive' && e.actor === me.uid)).toBe(true);
    expect(me.cooldowns.blizzard ?? 0).toBe(0);
  });
});

describe('Faz 2c: durum kancası (DoT, rastgele durum, boşalma durumu)', () => {
  it('Long Con: Card Trick\'in rastgele Stun\'u kancadan geçer (zar 1 iken +1 tur)', () => {
    const t = only('gambler', { '3.r': 20 }); // procChance 0.05 x 20 = 1
    seeds('Card Trick Stun', (s) => {
      const b = make({ 0: 'gambler' }, { 0: 'mage' }, withTree(0, t), s);
      E(b).hp = E(b).maxHp = 99999;
      const ev = statusEv(cast(b, P(b), 'card_trick', E(b)), E(b).uid, 'stun');
      if (!ev) return false;
      expect(ev.turns).toBe(2);
      return true;
    });
  });

  it('Fog of Ill Luck: Withering Curse\'ün Wither\'ı isabet -%2 x rank taşır', () => {
    const b = make({ 0: 'hexer' }, { 0: 'warrior' }, withTree(0, only('hexer', { '2.f2': 3 })), 3);
    E(b).hp = E(b).maxHp = 99999;
    seeds('Wither', () => {
      cast(b, P(b), 'withering_curse', E(b));
      const w = E(b).statuses.find((s) => s.kind === 'wither');
      if (!w) return false;
      expect(w.potency?.accuracyDelta).toBeCloseTo(-0.06, 9);
      return true;
    }, 10);
  });

  it('Long Quiet: Drain Field\'ın boşalma Silence\'ı kancadan geçer (zar 1 iken 2 tur)', () => {
    const t = only('antimage', { '2.f3': 17 }); // 0.06 x 17 > 1
    seeds('Silence', (s) => {
      const b = make({ 0: 'antimage' }, { 0: 'mage' }, withTree(0, t), s);
      E(b).mp = 0;
      const ev = statusEv(cast(b, P(b), 'drain_field', E(b)), E(b).uid, 'silence');
      if (!ev) return false;
      expect(ev.turns).toBe(2);
      return true;
    });
  });

  it('Deep Tangle: eklenen Stun da (Strangling Grove) kancadan geçer', () => {
    const t = only('druid', { '2.mb': 1, '2.r': 10 });
    seeds('Strangling Grove Stun', (s) => {
      const b = make({ 0: 'druid' }, { 0: 'mage' }, withTree(0, t), s);
      E(b).hp = E(b).maxHp = 99999;
      E(b).statuses.push({ kind: 'slow', turns: 3, source: P(b).uid });
      const ev = statusEv(cast(b, P(b), 'natures_wrath', E(b)), E(b).uid, 'stun');
      if (!ev) return false;
      expect(ev.turns).toBe(2);
      return true;
    });
  });
});

describe('Faz 2c: Anti-Mage', () => {
  it('Focused Siphon / Heart of Quiet: merkez hücredeki düşman %25 fazla yanar, MP 0 ise kesin Silence', () => {
    const burn = (units: Record<number, UnitSetup>) => {
      const b = make({ 0: 'antimage' }, { 0: 'mage' }, units, 4);
      E(b).mp = E(b).maxMp;
      const ev = cast(b, P(b), 'drain_field', E(b)).find((e) => e.type === 'manaBurn' && e.target === E(b).uid) as { amount: number };
      return ev.amount;
    };
    const plain = burn({});
    expect(burn(withTree(0, only('antimage', { '2.ea': 1 })))).toBe(Math.round(plain * 1.25));
    const b = make({ 0: 'antimage' }, { 0: 'mage' }, withTree(0, only('antimage', { '2.ma': 1 })), 4);
    E(b).mp = 0;
    const p = cast(b, P(b), 'drain_field', E(b)).find((e) => e.type === 'emptyProc') as { chance: number; success: boolean };
    expect(p.chance).toBe(1);
    expect(p.success).toBe(true);
  });

  it('Deep Cut: Mana Steal düz 10 + maks MP\'nin %3 x rank\'ı yakar', () => {
    seeds('Mana Steal isabet', (s) => {
      const b = make({ 0: 'antimage' }, { 0: 'mage' }, withTree(0, only('antimage', { '1.f3': 3 })), s);
      E(b).mp = E(b).maxMp;
      const ev = cast(b, P(b), 'mana_burn', E(b)).find((e) => e.type === 'manaBurn') as { amount: number } | undefined;
      if (!ev) return false;
      expect(ev.amount).toBe(10 + Math.round(E(b).maxMp * 0.09));
      return true;
    });
  });

  it('Prying Blade: Mana Steal isabette rastgele TEK buff siler (seed\'li)', () => {
    let kinds = new Set<string>();
    for (let s = 1; s <= 30; s++) {
      const run = () => {
        const b = make({ 0: 'antimage' }, { 0: 'mage' }, withTree(0, only('antimage', { '1.n0': 1 })), s);
        E(b).hp = E(b).maxHp = 99999;
        buff(E(b), 'haste');
        buff(E(b), 'fortify');
        const evs = cast(b, P(b), 'mana_burn', E(b));
        return evs.filter((e) => e.type === 'statusEnd' && e.target === E(b).uid && e.dispelled).map((e) => (e as { status: string }).status);
      };
      const a = run();
      expect(run()).toEqual(a);
      expect(a.length).toBeLessThanOrEqual(1);
      for (const k of a) kinds.add(k);
    }
    expect(kinds.size).toBe(2);
  });

  it('Shallow Net: Silence şansı %80, boşalma hasarı yok', () => {
    seeds('boşalma', (s) => {
      const b = make({ 0: 'antimage' }, { 0: 'mage' }, withTree(0, only('antimage', { '2.fb': 1 })), s);
      E(b).mp = 0;
      const evs = cast(b, P(b), 'drain_field', E(b));
      const p = evs.find((e) => e.type === 'emptyProc') as { chance: number; success: boolean };
      expect(p.chance).toBeCloseTo(0.8, 9);
      expect(hitDamage(evs, E(b).uid)).toBe(0);
      return p.success;
    });
  });

  it('Spellsplitter: önce tüm buff\'lar silinir, silinen buff başına +%15 hasar', () => {
    seeds('Spellsplitter isabet', (s) => {
      const hit = (units: Record<number, UnitSetup>, buffs: boolean) => {
        const b = make({ 0: 'antimage' }, { 0: 'mage' }, units, s);
        E(b).hp = E(b).maxHp = 99999;
        if (buffs) {
          buff(E(b), 'haste');
          buff(E(b), 'blessed');
        }
        const evs = cast(b, P(b), 'mana_burn', E(b));
        return { dmg: hitDamage(evs, E(b).uid), left: E(b).statuses.filter((x) => x.kind === 'haste' || x.kind === 'blessed').length, mult: b.statusMult(E(b), 'damageTakenMult') };
      };
      const t = withTree(0, only('antimage', { '1.v': 1 }));
      const none = hit(t, false);
      const two = hit(t, true);
      expect(two.left).toBe(0);
      if (!none.dmg || !two.dmg) return false;
      expect(two.dmg / none.dmg).toBeCloseTo(1.3, 1);
      return true;
    });
  });

  it('Ward Taunt: Spell Ward kendine atılınca taunt, dosta atılınca yok', () => {
    const t = withTree(0, only('antimage', { '3.eb': 1 }));
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, t);
    cast(b, P(b), 'spell_ward', P(b, 1));
    expect(has(P(b), 'taunt')).toBe(false);
    cast(b, P(b), 'spell_ward', P(b));
    expect(has(P(b), 'taunt')).toBe(true);
  });
});

describe('Faz 2c: Cutthroat, Hexer, Undead', () => {
  it('Far Toss: Blind uzatma yalnızca arka sıradaki düşmana (zar 1 iken)', () => {
    const t = withTree(0, only('cutthroat', { '3.f1': 7 })); // 0.15 x 7 > 1
    const b = make({ 0: 'cutthroat' }, { 0: 'mage', 9: 'mage' }, t);
    const front = cast(b, P(b), 'smoke_bomb', E(b));
    expect(statusEv(front, E(b).uid, 'blinded')?.turns).toBe(2);
    const back = cast(b, P(b), 'smoke_bomb', E(b, 9));
    expect(statusEv(back, E(b, 9).uid, 'blinded')?.turns).toBe(3);
  });

  it('Shrapnel Shell: Smoke Bomb alandaki her düşmana DEX hasarı + 2 tur Wound, dostlara değil', () => {
    const b = make({ 0: 'cutthroat' }, { 0: 'mage' }, withTree(0, only('cutthroat', { '3.mb': 1 })));
    const evs = cast(b, P(b), 'smoke_bomb', E(b));
    expect(hitDamage(evs, E(b).uid)).toBeGreaterThan(0);
    expect(statusEv(evs, E(b).uid, 'wound')?.turns).toBe(2);
    const ally = cast(b, P(b), 'smoke_bomb', P(b));
    expect(hitDamage(ally, P(b).uid)).toBe(0);
    expect(statusEv(ally, P(b).uid, 'wound')).toBeUndefined();
  });

  it('Doom Leaks: Doom Mark öldürünce de 1 Omen en yakın düşmana geçer (ağaçsız geçmez)', () => {
    const run = (units: Record<number, UnitSetup>) => {
      const b = make({ 0: 'hexer' }, { 0: 'warrior', 1: 'warrior' }, units, 7);
      E(b).statuses.push({ kind: 'omen', turns: 4, source: P(b).uid, stacks: 2 });
      E(b).hp = 1;
      E(b, 1).hp = E(b, 1).maxHp = 99999;
      cast(b, P(b), 'doom_mark', E(b));
      expect(E(b).hp).toBe(0);
      return E(b, 1).statuses.find((s) => s.kind === 'omen')?.stacks ?? 0;
    };
    expect(run({})).toBe(0);
    expect(run(withTree(0, only('hexer', { '0.eb': 1 })))).toBe(1);
  });

  it('Eye of Ruin: hasarsız Evil Eye de kritik zarı atar (kritikte 3 Omen)', () => {
    const b = make({ 0: 'hexer' }, { 0: 'mage' }, withTree(0, only('hexer', { '1.v': 1 })));
    P(b).stats.critChance = 1;
    E(b).hp = E(b).maxHp = 99999;
    seeds('Evil Eye isabet', () => {
      E(b).statuses = [];
      const o = statusEv(cast(b, P(b), 'evil_eye', E(b)), E(b).uid, 'omen');
      if (!o) return false;
      expect(o.stacks).toBe(3);
      return true;
    }, 20);
  });

  it('Grave Shackle: Slowed ve %50 altı hedefe Stun, her düşmana bir kez', () => {
    const b = make({ 0: 'undead' }, { 0: 'mage' }, withTree(0, only('undead', { '1.ma': 1 })));
    E(b).hp = E(b).maxHp = 99999;
    let first: BattleEvent[] = [];
    seeds('Bone Throw isabet', () => {
      E(b).hp = 40000;
      E(b).statuses = [{ kind: 'slow', turns: 3, source: P(b).uid }];
      first = cast(b, P(b), 'bone_throw', E(b));
      return !!statusEv(first, E(b).uid, 'stun');
    }, 20);
    for (let i = 0; i < 10; i++) {
      E(b).hp = 40000;
      E(b).statuses = [{ kind: 'slow', turns: 3, source: P(b).uid }];
      expect(statusEv(cast(b, P(b), 'bone_throw', E(b)), E(b).uid, 'stun')).toBeUndefined();
    }
  });

  it('Blood Oath / Iron Oath / Crimson Covenant: bağa bağlı guard, %60 pay, süresiz bağ', () => {
    const t = only('undead', { '3.mb': 1, '3.fb': 1, '3.v': 1 });
    expect((t!.passive!.effect as { ratio: number }).ratio).toBeCloseTo(0.4, 9);
    const b = make({ 0: 'undead', 1: 'warrior' }, { 0: 'mage' }, withTree(0, t));
    cast(b, P(b), 'dark_bond', P(b, 1));
    const g = P(b, 1).statuses.find((s) => s.kind === 'guard');
    expect(g?.share).toBeCloseTo(0.6, 9);
    expect(g?.bond).toBe(true);
    const bond = P(b, 1).statuses.find((s) => s.kind === 'dark_bond');
    expect(bond?.permanent).toBe(true);
    // Iron Oath tek başına: guard eklenmez (yalnızca bedel)
    const lone = only('undead', { '3.fb': 1 });
    expect(lone!.skills?.dark_bond?.effects.some((e) => e.type === 'guard') ?? false).toBe(false);
  });
});

describe('Faz 2c: Defender', () => {
  const armorOf = (b: Battle, c: Combatant) => b.effectiveStats(c).armor;

  it('Anchored Stone: kendine aura %50 güçlü, Move yasak', () => {
    const plain = make({ 0: 'defender' }, { 0: 'mage' });
    const b = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', { '0.fa': 1 })));
    const base = P(b).stats.armor;
    expect(armorOf(plain, P(plain)) - base).toBeCloseTo(base * 0.4, 6);
    expect(armorOf(b, P(b)) - base).toBeCloseTo(base * 0.6, 6);
    expect(b.canUseGlobal(P(b).uid, 'move').ok).toBe(false);
  });

  it('Braced Stance / Tight Formation / Rooted Stance: aura payı kancaları', () => {
    const b = make({ 0: 'defender', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('defender', { '0.f3': 2 })));
    const base = P(b).stats.armor;
    expect(armorOf(b, P(b)) - base).toBeCloseTo(base * (0.4 + 0.04), 6);
    const f1 = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', { '0.f1': 3 })));
    cast(f1, P(f1), 'taunt');
    expect(armorOf(f1, P(f1)) - base).toBeCloseTo(base * (0.4 + 0.15), 6);
    const ea = make({ 0: 'defender' }, { 0: 'mage' }, withTree(0, only('defender', { '0.ea': 1 })));
    for (let i = 0; i < 6; i++) cast(ea, P(ea), 'taunt');
    expect(armorOf(ea, P(ea)) - base).toBeCloseTo(base * (0.4 + 0.4), 6);
  });

  it('Weathered: alan skill\'ine karşı aura payı +%5 x rank (tek hedefe değil)', () => {
    const run = (skill: string) => {
      const b = make({ 0: 'defender' }, { 0: 'warrior' }, withTree(0, only('defender', { '0.r': 3 })), 2);
      P(b).hp = P(b).maxHp = 99999;
      E(b).stats.str = 400;
      const evs = cast(b, E(b), skill, P(b));
      return hitDamage(evs, P(b).uid);
    };
    const plain = (skill: string) => {
      const b = make({ 0: 'defender' }, { 0: 'warrior' }, {}, 2);
      P(b).hp = P(b).maxHp = 99999;
      E(b).stats.str = 400;
      return hitDamage(cast(b, E(b), skill, P(b)), P(b).uid);
    };
    expect(run('melee_attack')).toBe(plain('melee_attack'));
    const pb = plain('whirlwind');
    expect(pb).toBeGreaterThan(0);
    expect(run('whirlwind')).toBeLessThan(pb);
  });

  it('Last Wall Standing: herhangi bir dost düşünce Fortified', () => {
    const b = make({ 0: 'defender', 5: 'warrior' }, { 0: 'mage' }, withTree(0, only('defender', {}, 4)));
    seeds('dost düştü', () => {
      P(b, 5).hp = 1;
      cast(b, E(b), 'fire_bolt', P(b, 5));
      return P(b, 5).hp <= 0;
    }, 20);
    expect(has(P(b), 'fortify')).toBe(true);
  });

  it('Formed Up: savaşın ilk Close Ranks\'i MP harcamaz, ikincisi harcar', () => {
    const b = make({ 0: 'defender', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('defender', {}, 2)));
    const spend = () => {
      P(b).cooldowns.close_ranks = 0;
      P(b).mp = P(b).maxMp;
      expect(b.useSkill(P(b).uid, 'close_ranks', P(b, 1).uid).ok).toBe(true);
      return P(b).maxMp - P(b).mp;
    };
    expect(spend()).toBe(0);
    expect(spend()).toBe(10);
  });
});

describe('Faz 2c: Paladin, Archer, Warrior', () => {
  it('Not Yet: son turundan beri düşen dost için Resurrection MP harcamaz', () => {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('paladin', { '2.mb': 1 })));
    seeds('dost düştü', () => {
      P(b, 1).hp = 1;
      cast(b, E(b), 'fire_bolt', P(b, 1));
      return P(b, 1).hp <= 0;
    }, 20);
    P(b).cooldowns.resurrection = 0;
    P(b).mp = P(b).maxMp;
    expect(b.useSkill(P(b).uid, 'resurrection', P(b, 1).uid).ok).toBe(true);
    expect(P(b).mp).toBe(P(b).maxMp);
  });

  it('Sunder / Shattered Line: Piercing Arrow zırhı %20 düşürür, Aimed Shot Sundered hedefte zırhı tamamen yok sayar', () => {
    const t = only('archer', { '2.ea': 1, '2.ma': 1 });
    const b = make({ 0: 'archer' }, { 0: 'defender' }, withTree(0, t), 3);
    E(b).hp = E(b).maxHp = 99999;
    const before = b.effectiveStats(E(b)).armor;
    seeds('Piercing Arrow isabet', () => statusEv(cast(b, P(b), 'piercing_arrow', E(b)), E(b).uid, 'sunder')?.turns === 2, 20);
    expect(b.effectiveStats(E(b)).armor).toBeCloseTo(before * 0.8, 3);
    const h = cond(t, 'archer:2.ma');
    expect(h.skill).toBe('aimed_shot');
    expect(h.mod.ignoreDefense).toBe(1);
  });

  it('Eagle Eye: Sharpshooter bonusunun yarısı kritik şansına eklenir', () => {
    const h = cond(only('archer', { '0.n0': 1 }), 'archer:0.n0');
    expect(h.scale).toEqual({ sharpshooterBonus: 0.5 });
    expect(h.mod.critBonus).toBe(1);
  });

  it('Glass Cyclone / Martyr\'s Rush: kendine Exposed (+%15 alınan hasar), Charge taunt', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage' }, withTree(0, only('warrior', { '2.fa': 1, '3.fa': 1 })));
    cast(b, P(b), 'whirlwind', E(b));
    expect(has(P(b), 'exposed')).toBe(true);
    expect(b.statusMult(P(b), 'damageTakenMult')).toBeCloseTo(1.15, 9);
    P(b).statuses = [];
    cast(b, P(b), 'charge', E(b));
    expect(has(P(b), 'taunt')).toBe(true);
    expect(has(P(b), 'exposed')).toBe(true);
  });

  it('Banner of Dawn: hedef iyileşmeden ÖNCE %50 altındaysa Haste alır', () => {
    const b = make({ 0: 'paladin', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('paladin', { '0.mb': 1 })), 3, 'turns');
    const ally = P(b, 1);
    ally.hp = Math.floor(ally.maxHp * 0.49);
    const p = P(b);
    p.stats.int = 9999; // şifa canı %50'nin üstüne taşır
    for (let i = 0; i < 12 && !b.log.some((e) => e.type === 'heal' && e.source === p.uid); i++) b.skipTurn();
    const heal = b.log.find((e) => e.type === 'heal' && e.source === p.uid) as { target: string } | undefined;
    expect(heal?.target).toBe(ally.uid);
    expect(ally.hp).toBeGreaterThan(ally.maxHp * 0.5);
    expect(b.log.some((e) => e.type === 'status' && e.target === ally.uid && e.status === 'haste')).toBe(true);
  });

  it('Knee Shots: Shot to the Knee\'nin eklediği Slow da +1 tur', () => {
    const t = only('archer', { '1.n0': 1 }, 1);
    seeds('kritik Quick Shot', (s) => {
      const b = make({ 0: 'archer' }, { 0: 'mage' }, withTree(0, t), s);
      E(b).hp = E(b).maxHp = 99999;
      P(b).stats.critChance = 1;
      const ev = statusEv(cast(b, P(b), 'quick_shot', E(b)), E(b).uid, 'slow');
      if (!ev) return false;
      expect(ev.turns).toBe(3);
      return true;
    });
  });
});
