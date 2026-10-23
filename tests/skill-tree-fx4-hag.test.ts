import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { focusBuild } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 4b parça 3/3 (content-designer): Hexer, Anti-Mage, Gambler C3 tetik + C4 şifa / kalkan / alınan hasar fx'leri.
// Her test YALNIZCA verilen düğümlerin fx'iyle derler (only); beklenen sayılar düğüm metninden birebir.

const MINE = ['hexer', 'antimage', 'gambler'];
const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
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
/** Düğüm / bar fx sayısı veriden ('bar3' = mastery.bar[3]; yol örn. '0.do.0.heal'); denge turunda değişebilir, test mekanizmayı ölçer. */
const num = (cls: string, key: string, path: string): number => {
  const t = treeOf(cls)!;
  const fx = key.startsWith('bar') ? t.mastery.bar[Number(key.slice(3))]!.fx : t.nodes[key]!.fx;
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], fx) as number;
};
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
function cast(b: Battle, actor: Combatant, skill: string, target?: Combatant, resetCd = true): BattleEvent[] {
  const from = b.log.length;
  if (resetCd) actor.cooldowns[skill] = 0;
  actor.mp = actor.maxMp;
  const r = b.useSkill(actor.uid, skill, target?.uid);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
const procs = (b: Battle, node: string): number => b.treeProcs().find((p) => p.node === node)?.count ?? 0;
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const healBy = (evs: BattleEvent[], node: string): number => evs.reduce((s, e) => s + (e.type === 'heal' && e.cause === node ? e.amount : 0), 0);
const mpBy = (evs: BattleEvent[], node: string, uid?: string): number =>
  evs.reduce((s, e) => s + (e.type === 'mpRegen' && e.cause === node && (!uid || e.actor === uid) ? e.amount : 0), 0);
function seeds(what: string, fn: (seed: number) => boolean, n = 120): void {
  for (let s = 1; s <= n; s++) if (fn(s)) return;
  throw new Error(`${what}: hiçbir seed'de olmadı`);
}
const landed = (evs: BattleEvent[], uid: string): boolean => evs.some((e) => e.type === 'damage' && e.target === uid && e.origin === 'skill');
function untilTurn(b: Battle, c: Combatant, max = 30): BattleEvent[] {
  const from = b.log.length;
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
  return b.log.slice(from);
}

/** Bu parçada yazılan ve bilerek null bırakılan düğümler (katalogdaki C3 / C4 satırları; 4a'nın yazdıkları hariç). */
const WRITTEN: Record<string, string[]> = {
  // Faz 4c: Faz 4b'de null kalanların çoğu yazıldı (Overcharged Doom, Passing Bell, Leaping Mark ailesi, Second Ward, Brimming Ally, Spell Sink,
  // Feeding Frenzy, Overflow Strike, Run It Back, Rolling Dice, Clean Sweep, Domino)
  hexer: ['bar[4]', '0.n0', '0.mb', '2.eb', '2.mb', '2.v', '3.eb', '3.mb', '0.fa', '0.v', '4.u1', '4.u2', '4.u3'],
  antimage: ['bar[2]', 'bar[3]', '0.n0', '0.r', '1.ma', '1.mb', '3.f2', '3.r', '3.mb', '3.v', '4.r2', '0.ma', '0.mb', '3.ma', '4.r3', '4.d3'],
  gambler: ['bar[3]', '0.f1', '0.f3', '0.n0', '0.r', '0.ea', '0.eb', '0.ma', '0.fa', '0.mb', '1.r', '1.mb', '2.n0', '4.r1', '0.v', '1.f3', '4.r2', '4.r3'],
};
const LEFT_NULL: Record<string, string[]> = {
  hexer: [],
  antimage: [],
  gambler: [], // Faz 8: Stacked Deck yazıldı (seçim paneli)
};
const nodeOf = (t: TreeData, key: string) => {
  const m = /^bar\[(\d+)\]$/.exec(key);
  return m ? t.mastery.bar[Number(m[1])]! : t.nodes[key]!;
};

describe('Faz 4b (Hexer / Anti-Mage / Gambler): veri', () => {
  it('fx\'ler temiz derlenir; her satır / yön / ult kolu birleşimi derlenir', () => {
    for (const c of MINE) {
      const T = treeOf(c)!;
      expect(checkTreeFx(T), c).toEqual([]);
      for (const rows of [[0, 1], [1, 2], [2, 3], [3, 0]] as [number, number][])
        for (const dir of ['a', 'b'] as const)
          for (const ult of ['u', 'r', 'd', 'l'] as const) expect(() => compileTree(T, focusBuild(T, rows, 50, { dir, ult })), `${c} ${rows} ${dir} ${ult}`).not.toThrow();
    }
  });

  it('yazılan düğümlerde fx var, yazılamayanlar null kaldı', () => {
    for (const c of MINE) {
      const T = treeOf(c)!;
      for (const k of WRITTEN[c]!) expect(nodeOf(T, k).fx, `${c} ${k}`).not.toBeNull();
      for (const k of LEFT_NULL[c]!) expect(nodeOf(T, k).fx, `${c} ${k}`).toBeNull();
    }
  });
});

describe('Faz 4b: Hexer', () => {
  it('Hour of Ruin (bar 25): savaşta bir kez, Doom patlayınca Doom Mark cooldown\'u 2 azalır', () => {
    seeds('Evil Eye Doom', (s) => {
      const b = make({ 0: 'hexer' }, { 0: 'warrior' }, withTree(0, only('hexer', {}, 4)), s);
      const me = P(b);
      const foe = E(b);
      foe.hp = foe.maxHp = 99999;
      me.cooldowns = { doom_mark: 4 };
      foe.statuses.push({ kind: 'omen', turns: 4, source: me.uid, stacks: 2 });
      const evs = cast(b, me, 'evil_eye', foe);
      if (!evs.some((e) => e.type === 'doom')) return false;
      expect(me.cooldowns.doom_mark).toBe(2);
      // ikinci Doom: bir kez
      foe.statuses = foe.statuses.filter((x) => x.kind !== 'omen');
      foe.statuses.push({ kind: 'omen', turns: 4, source: me.uid, stacks: 2 });
      const evs2 = cast(b, me, 'evil_eye', foe);
      if (!evs2.some((e) => e.type === 'doom')) return false;
      expect(me.cooldowns.doom_mark).toBe(2);
      expect(procs(b, 'hexer:bar[4]')).toBe(1);
      return true;
    });
  });

  it('Fate Sealed: Doom\'dan sağ çıkan düşmanda 1 Omen kalır (ağaçsız Omen kalmaz)', () => {
    for (const tree of [false, true]) {
      seeds('Doom survive', (s) => {
        const b = make({ 0: 'hexer' }, { 0: 'warrior' }, tree ? withTree(0, only('hexer', { '0.n0': 1 })) : {}, s);
        const me = P(b);
        const foe = E(b);
        foe.hp = foe.maxHp = 99999;
        foe.statuses.push({ kind: 'omen', turns: 4, source: me.uid, stacks: 2 });
        const evs = cast(b, me, 'evil_eye', foe);
        if (!evs.some((e) => e.type === 'doom')) return false;
        const om = foe.statuses.find((x) => x.kind === 'omen');
        if (tree) {
          expect(om?.stacks).toBe(1);
          expect(procs(b, 'hexer:0.n0')).toBe(1);
        } else expect(om).toBeUndefined();
        return true;
      });
    }
  });

  it('Backlash + Turned Luck: Jinxed düşman ıskalayınca LUCK x 0,4 karanlık hasar yer, hedeflediği dost 1 tur Haste alır', () => {
    seeds('Jinxed miss', (s) => {
      const b = make({ 0: 'hexer', 1: 'warrior' }, { 0: 'warrior' }, withTree(0, only('hexer', { '3.eb': 1, '3.mb': 1 })), s);
      const ally = P(b, 1);
      ally.hp = ally.maxHp = 99999;
      const foe = E(b);
      foe.statuses.push({ kind: 'jinxed', turns: 2, source: P(b).uid });
      const hp0 = foe.hp;
      const evs = cast(b, foe, 'melee_attack', ally);
      if (!evs.some((e) => (e.type === 'miss' || e.type === 'dodge') && e.target === ally.uid)) return false;
      expect(foe.hp).toBeLessThan(hp0);
      expect(evs.some((e) => e.type === 'damage' && e.target === foe.uid && e.element === 'dark')).toBe(true);
      expect(ally.statuses.find((x) => x.kind === 'haste')?.turns).toBe(1);
      expect(procs(b, 'hexer:3.eb')).toBe(1);
      expect(procs(b, 'hexer:3.mb')).toBe(1);
      return true;
    }, 300);
  });

  it('Plague Curse: Withering Curse\'ün Wither tiki konağın yanındaki düşmanı 2 tur Wither\'lar (ağaçsız yayılmaz)', () => {
    for (const tree of [false, true]) {
      const b = make({ 0: 'hexer' }, { 0: 'warrior', 1: 'warrior' }, tree ? withTree(0, only('hexer', { '2.v': 1 })) : {}, 5, 'turns');
      const me = P(b);
      const host = E(b, 0);
      const other = E(b, 1);
      host.hp = host.maxHp = 99999;
      host.statuses.push({ kind: 'wither', turns: 3, source: me.uid, amount: 5 });
      // konağın YENİ turu (tik tur başında)
      for (let i = 0; i < 30; i++) {
        expect(b.skipTurn().ok).toBe(true);
        if (b.currentActor === host) break;
      }
      expect(b.currentActor).toBe(host);
      expect(has(other, 'wither'), `tree=${tree}`).toBe(tree);
      if (tree) {
        expect(other.statuses.find((x) => x.kind === 'wither')?.turns).toBe(2);
        expect(procs(b, 'hexer:2.v')).toBeGreaterThan(0);
      }
    }
  });

  it('Returning Curse: senin Wither\'ın üstündeyken ölen düşman Withering Curse cooldown\'unu sıfırlar', () => {
    seeds('Evil Eye kill', (s) => {
      const b = make({ 0: 'hexer' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('hexer', { '2.mb': 1 })), s);
      const me = P(b);
      const foe = E(b);
      foe.hp = 1;
      foe.statuses.push({ kind: 'wither', turns: 3, source: me.uid, amount: 5 });
      me.cooldowns = { withering_curse: 3 };
      cast(b, me, 'evil_eye', foe);
      if (foe.hp > 0) return false;
      expect(me.cooldowns.withering_curse).toBeUndefined();
      expect(procs(b, 'hexer:2.mb')).toBe(1);
      return true;
    });
  });
});

describe('Faz 4b: Anti-Mage', () => {
  it('Drink Deep: Mana Steal yaktığı MP kadar seni iyileştirir', () => {
    seeds('Mana Steal hit', (s) => {
      const b = make({ 0: 'antimage' }, { 0: 'mage' }, withTree(0, only('antimage', { '1.ma': 1 })), s);
      const me = P(b);
      me.hp = Math.floor(me.maxHp / 2);
      const evs = cast(b, me, 'mana_burn', E(b));
      const burned = evs.reduce((n, e) => n + (e.type === 'manaBurn' && e.source === me.uid ? e.amount : 0), 0);
      if (burned <= 0) return false;
      expect(healBy(evs, 'antimage:1.ma')).toBe(Math.round(burned * num('antimage', '1.ma', '0.do.0.heal')));
      return true;
    });
  });

  it('Wide Basin (bar 15): Drain Field MP yaktığı her düşman için takıma 1 MP', () => {
    const b = make({ 0: 'antimage', 1: 'mage' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('antimage', {}, 2)), 3);
    const ally = P(b, 1);
    ally.mp = 0;
    const evs = cast(b, P(b), 'drain_field', E(b));
    const burnedFoes = new Set(evs.filter((e) => e.type === 'manaBurn' && e.amount > 0).map((e) => (e as { target: string }).target)).size;
    expect(burnedFoes).toBeGreaterThan(0);
    expect(mpBy(evs, 'antimage:bar[2]', ally.uid)).toBe(burnedFoes);
  });

  it('Ward Mending: Spell Ward atılınca dost maks canının rank x %2\'si kadar iyileşir', () => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('antimage', { '3.f2': 3 })));
    const ally = P(b, 1);
    ally.hp = Math.floor(ally.maxHp / 2);
    const evs = cast(b, P(b), 'spell_ward', ally);
    expect(healBy(evs, 'antimage:3.f2')).toBe(Math.round(ally.maxHp * 3 * num('antimage', '3.f2', '0.do.0.heal')));
  });

  it('Mirror Ward: Spell Ward\'ın emdiği büyü vuruşunun %50\'si saldırana döner', () => {
    seeds('Fire Bolt on ward', (s) => {
      const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'mage' }, withTree(0, only('antimage', { '3.v': 1 })), s);
      const ally = P(b, 1);
      const foe = E(b);
      cast(b, P(b), 'spell_ward', ally);
      const hp0 = foe.hp;
      const evs = cast(b, foe, 'fire_bolt', ally);
      if (!landed(evs, ally.uid)) return false;
      const absorbed = evs.reduce((n, e) => n + (e.type === 'damage' && e.target === ally.uid ? e.absorbed : 0), 0);
      if (absorbed <= 0) return false;
      expect(hp0 - foe.hp).toBe(Math.max(1, Math.round(absorbed * num('antimage', '3.v', '0.do.0.damage'))));
      expect(procs(b, 'antimage:3.v')).toBe(1);
      return true;
    });
  });

  it('Bastion of Null / Warded Steps: alınan fiziksel hasar çarpanı (büyüye işlemez)', () => {
    const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'warrior' }, withTree(0, only('antimage', { '3.mb': 1 }, 3)));
    const me = P(b);
    const ally = P(b, 1);
    expect(b.treeTakenMult(ally, E(b), 'physical')).toBe(1);
    cast(b, me, 'spell_ward', ally);
    expect(b.treeTakenMult(ally, E(b), 'physical')).toBeCloseTo(1 + num('antimage', 'bar3', '0.mul'), 9);
    expect(b.treeTakenMult(ally, E(b), 'magic')).toBe(1);
    cast(b, me, 'spell_ward', me);
    expect(b.treeTakenMult(me, E(b), 'physical')).toBeCloseTo(1 + num('antimage', 'bar3', '0.mul'), 9); // taunt yok: yalnız Warded Steps
    me.statuses.push({ kind: 'taunt', turns: 2, source: me.uid });
    expect(b.treeTakenMult(me, E(b), 'physical')).toBeCloseTo((1 + num('antimage', 'bar3', '0.mul')) * 0.7, 9);
  });
});

describe('Faz 4b: Gambler', () => {
  it('All or Nothing: Double or Nothing şansı %25 -> %40 (taban)', () => {
    expect(only('gambler', { '0.fa': 1 })!.passive!.effect).toMatchObject({ type: 'spellEcho', chance: 0.4 });
  });

  it('Run the Table: All In öldürürse cooldown\'u biter (ağaçsız kalır)', () => {
    for (const tree of [false, true]) {
      seeds('All In kill', (s) => {
        const b = make({ 0: 'gambler' }, { 0: 'mage', 1: 'mage' }, tree ? withTree(0, only('gambler', { '4.r1': 1 })) : {}, s);
        const me = P(b);
        E(b).hp = 1;
        me.cooldowns = { all_in: 3 };
        cast(b, me, 'all_in', E(b), false);
        if (E(b).hp > 0) return false;
        expect(me.cooldowns.all_in, `tree=${tree}`).toBe(tree ? undefined : 3);
        return true;
      });
    }
  });

  it('Due for a Win: High Stakes Bust\'ları sonraki High Stakes\'e +%15 Jackpot şansı biriktirir, Jackpot sıfırlar', () => {
    const b = make({ 0: 'gambler' }, { 0: 'warrior' }, withTree(0, only('gambler', { '2.n0': 1 })), 7);
    const me = P(b);
    const foe = E(b);
    foe.hp = foe.maxHp = 99999;
    let busts = 0;
    let cleared = false;
    for (let i = 0; i < 40 && !cleared; i++) {
      me.hp = me.maxHp;
      const evs = cast(b, me, 'high_stakes', foe);
      const out = evs.find((e) => e.type === 'passive' && (e.passive === 'gamble_win' || e.passive === 'gamble_lose')) as { passive: string } | undefined;
      if (!out) continue;
      const buff = (me.treeBuffs ?? []).find((x) => x.node === 'gambler:2.n0');
      if (out.passive === 'gamble_lose') {
        busts++;
        expect(buff?.s).toBe(busts);
        expect(buff?.mod).toMatchObject({ winChance: num('gambler', '2.n0', '0.do.0.buff.winChance') });
      } else {
        if (busts > 0) cleared = true;
        expect(buff).toBeUndefined();
        busts = 0;
      }
    }
    expect(cleared).toBe(true);
  });

  it('Chain Reaction + Quick Shuffle: Double or Nothing tutunca öbür cooldown\'lar 1 azalır ve sıradaki tur %3 x rank erken', () => {
    seeds('echo', (s) => {
      const b = make({ 0: 'gambler' }, { 0: 'warrior' }, withTree(0, only('gambler', { '0.n0': 1, '0.f3': 2 })), s, 'turns');
      const me = P(b);
      untilTurn(b, me);
      E(b).hp = E(b).maxHp = 99999;
      me.cooldowns = { card_trick: 3 };
      cast(b, me, 'high_stakes', E(b));
      if (me.cooldowns.high_stakes !== undefined) return false; // yankı yok
      expect(me.cooldowns.card_trick).toBe(2);
      expect(b.speedBoostOf(me.uid)).toBeCloseTo(2 * num('gambler', '0.f3', '0.do.0.sooner'), 9); // değer veriden (D9 2026-10-23)
      expect(procs(b, 'gambler:0.n0')).toBe(1);
      return true;
    });
  });

  it('Snake Eyes: Loaded Dice kritik vurunca sonraki bahis +%10 Jackpot şansı; bahis sonuçlanınca silinir', () => {
    seeds('Loaded Dice crit', (s) => {
      const b = make({ 0: 'gambler' }, { 0: 'warrior' }, withTree(0, only('gambler', { '1.mb': 1 })), s);
      const me = P(b);
      const foe = E(b);
      foe.hp = foe.maxHp = 99999;
      const evs = cast(b, me, 'loaded_dice', foe);
      if (!evs.some((e) => e.type === 'damage' && e.target === foe.uid && e.crit)) return false;
      expect((me.treeBuffs ?? []).find((x) => x.node === 'gambler:1.mb')?.mod).toMatchObject({ winChance: num('gambler', '1.mb', '0.do.0.buff.winChance') });
      // bahissiz skill buff'ı harcamaz
      cast(b, me, 'loaded_dice', foe);
      expect((me.treeBuffs ?? []).some((x) => x.node === 'gambler:1.mb')).toBe(true);
      me.hp = me.maxHp;
      cast(b, me, 'high_stakes', foe);
      expect((me.treeBuffs ?? []).some((x) => x.node === 'gambler:1.mb')).toBe(false);
      return true;
    });
  });
});
