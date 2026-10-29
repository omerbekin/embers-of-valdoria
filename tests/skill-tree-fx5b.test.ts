import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import { focusBuild } from '../src/progression/skill-tree';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 5b (content-designer): Faz 5a'nın derleyiciden geçen 55 düğüm eşlemesi veriye yazıldı (metinle karşılaştırılıp Cloistered Ward ve
// Brittle Point düzeltildi) + Sun-Forged Will, Chain of Light, Hammerfall Quake. Her test YALNIZCA verilen düğümlerin fx'iyle derler.

const CLASSES = ['warrior', 'defender', 'paladin', 'archer', 'mage', 'druid', 'cutthroat', 'hexer', 'gambler', 'antimage', 'undead'];
/** fx'i null kalan düğümler (belge: skill-tree-implementation.md > "Faz 5b: kalan null düğümler"; Faz 5c motor eksiği 4 düğüm, altıncı tur 5 karar düğümü yazıldı). */
// Altıncı tur (Ömer 2026-10-22): Weakened düğümleri, Fervent Oath, Rot Bomb yazıldı; kalan yalnızca mockup bekleyen 5
// Faz 8 (Ömer 2026-10-23): son 5 düğüm (Focused Beam ailesi, Stacked Deck, Double Deal) seçim paneliyle yazıldı; null düğüm kalmadı
const LEFT_NULL: Record<string, string[]> = {};

const cells = (u: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
const make = (party: Record<number, string>, enemies: Record<number, string>, units: Record<number, UnitSetup> = {}, seed = 11, mode: BattleMode = 'test'): Battle => {
  const teams: Teams = { party: cells(party), enemies: cells(enemies), units: { party: units, enemies: {} } };
  return new Battle(content.battleSetup('random-battle', seed, mode, teams, false));
};
function only(cls: string, ranks: Record<string, number>): UnitSetup['tree'] {
  const t = JSON.parse(JSON.stringify(treeOf(cls)!)) as TreeData;
  for (const k of Object.keys(t.nodes)) if (!(k in ranks)) t.nodes[k]!.fx = null;
  t.mastery.bar.forEach((b) => (b.fx = null));
  return compileTree(t, { v: t.version, r: { ...ranks } });
}
const withTree = (slot: number, tree: UnitSetup['tree']): Record<number, UnitSetup> => ({ [slot]: { tree } });
const P = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'party' && c.slot === slot && !c.summoned)!;
const E = (b: Battle, slot = 0): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
function cast(b: Battle, actor: Combatant, skill: string, target?: Combatant, slot?: number): BattleEvent[] {
  if (b.mode === 'turns') untilTurn(b, actor);
  const from = b.log.length;
  actor.cooldowns[skill] = 0;
  actor.mp = actor.maxMp;
  const r = b.useSkill(actor.uid, skill, target?.uid, slot, slot !== undefined ? 'enemy' : undefined);
  expect(r.ok, `${skill}: ${JSON.stringify(r)}`).toBe(true);
  return b.log.slice(from);
}
function untilTurn(b: Battle, c: Combatant, max = 30): void {
  for (let i = 0; i < max && b.currentActor !== c; i++) expect(b.skipTurn().ok).toBe(true);
  expect(b.currentActor).toBe(c);
}
function nextTurn(b: Battle, c: Combatant): BattleEvent[] {
  const from = b.log.length;
  if (b.currentActor === c) expect(b.skipTurn().ok).toBe(true);
  untilTurn(b, c);
  return b.log.slice(from);
}
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const dmgTo = (evs: BattleEvent[], t: Combatant): number => evs.reduce((s, e) => s + (e.type === 'damage' && e.target === t.uid ? e.amount + e.absorbed : 0), 0);
const targeted = (evs: BattleEvent[], src: Combatant): Set<string> =>
  new Set(evs.flatMap((e) => ((e.type === 'damage' || e.type === 'miss' || e.type === 'dodge') && e.source === src.uid ? [e.target] : [])));
const tough = (...cs: Combatant[]): void => cs.forEach((c) => (c.hp = c.maxHp = 9000));
/** İlk tutan seed (isabet zarını test etmiyoruz). */
function firstSeed(ok: (seed: number) => boolean, max = 60): number {
  for (let seed = 1; seed < max; seed++) if (ok(seed)) return seed;
  throw new Error(`no seed in ${max}`);
}

describe('Faz 5b: veri', () => {
  it('11 ağaç checkTreeFx temiz; her satır / yön / ult kolu birleşimi derlenir', () => {
    for (const cls of CLASSES) {
      const T = treeOf(cls)!;
      expect(checkTreeFx(T), cls).toEqual([]);
      for (const rows of [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]] as [number, number][])
        for (const dir of ['a', 'b'] as const)
          for (const ult of ['u', 'r', 'd', 'l'] as const) expect(() => compileTree(T, focusBuild(T, rows, 50, { dir, ult })), `${cls} ${rows} ${dir} ${ult}`).not.toThrow();
    }
  });

  it('fx\'i yazılı her düğüm tek başına derlemeye bir şey katar', () => {
    for (const cls of CLASSES) {
      const T = treeOf(cls)!;
      for (const [k, n] of Object.entries(T.nodes)) {
        if (n.fx === null || n.inactive) continue; // pasif düğüm (Mage reworkü 2026-10-29) derlemeye katılmaz
        // onlyWith: birleşim düğümü yalnızca ön koşullarıyla birlikte işler (Counter Cut ailesi)
        const deps = n.fx.flatMap((f) => ((f as { onlyWith?: string[] }).onlyWith ?? []));
        expect(only(cls, Object.fromEntries([k, ...deps].map((d) => [d, 1]))), `${cls} ${k}`).toBeDefined();
      }
    }
  });

  it('fx null kalan düğümler tam olarak belgedeki liste', () => {
    for (const cls of CLASSES) {
      const T = treeOf(cls)!;
      const nulls = Object.entries(T.nodes).filter(([, n]) => n.fx === null).map(([k]) => k).sort();
      expect(nulls, cls).toEqual([...(LEFT_NULL[cls] ?? [])].sort());
      expect(T.mastery.bar.every((b) => b.fx !== null), `${cls} bar`).toBe(true);
    }
  });
});

describe('Faz 5b: savaşta tetiklenme (class başına en az bir düğüm)', () => {
  it('Warrior Blinding Spray: Headsman\'s Blow hedefi ve yanındakileri Blind', () => {
    const b = make({ 0: 'warrior' }, { 0: 'mage', 1: 'mage', 2: 'mage' }, withTree(0, only('warrior', { '4.l2': 1 })));
    tough(E(b, 0), E(b, 1), E(b, 2));
    const me = P(b);
    me.rage = 60;
    cast(b, me, 'headsmans_blow', E(b, 1));
    expect(has(E(b, 1), 'blinded')).toBe(true);
    expect(has(E(b, 0)!, 'blinded') || has(E(b, 2), 'blinded')).toBe(true);
  });

  it('Defender Rolling Quake: Tremor Slam arka sıraya da vurur, orada Slow yok', () => {
    let back = false;
    firstSeed((seed) => {
      const b = make({ 0: 'defender' }, { 0: 'mage', 3: 'mage' }, withTree(0, only('defender', { '1.n0': 1 })), seed);
      tough(E(b, 0), E(b, 3));
      const evs = cast(b, P(b), 'tremor_slam', undefined, 0);
      if (dmgTo(evs, E(b, 0)) <= 0) return false;
      back = dmgTo(evs, E(b, 3)) > 0;
      expect(has(E(b, 3), 'slow')).toBe(false);
      return back;
    });
    expect(back).toBe(true);
    // ağaçsız: arka sıra vurulmaz
    const plain = make({ 0: 'defender' }, { 0: 'mage', 3: 'mage' });
    expect(dmgTo(cast(plain, P(plain), 'tremor_slam', undefined, 0), E(plain, 3))).toBe(0);
  });

  it('Paladin Hammerfall Quake: Holy Strike öldürürse ölenin sırasındakilere %40 sarsıntı', () => {
    firstSeed((seed) => {
      const b = make({ 0: 'paladin' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior' }, withTree(0, only('paladin', { '1.mb': 1 })), seed);
      tough(E(b, 1), E(b, 2), E(b, 3));
      E(b, 0).hp = 1;
      const evs = cast(b, P(b), 'holy_strike', E(b, 0));
      if (E(b, 0).hp > 0) return false;
      expect(targeted(evs, P(b)).has(E(b, 1).uid) || targeted(evs, P(b)).has(E(b, 2).uid)).toBe(true);
      expect(targeted(evs, P(b)).has(E(b, 3).uid)).toBe(false);
      return true;
    });
  });

  it('Paladin Chain of Light: smite öldürünce hemen yeniden smite (yeni en zayıf düşmana)', () => {
    const run = (ranks: Record<string, number>): number => {
      const b = make({ 0: 'paladin' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior' }, withTree(0, only('paladin', ranks)), 11, 'turns');
      P(b).stats = { ...P(b).stats, int: P(b).stats.int * 4 }; // smite her biri öldürsün (güç denge turunda değişebilir; düşmanlar tur başı yenilenir)
      E(b, 0).hp = 1;
      E(b, 1).hp = 2;
      E(b, 2).hp = 3;
      nextTurn(b, P(b));
      return [E(b, 0), E(b, 1), E(b, 2)].filter((c) => c.hp <= 0).length;
    };
    expect(run({ '0.ea': 1 })).toBe(1);
    // ikinci smite de öldürür ama zincir tur başına bir kez (metin "again", "repeats" değil; madde 395)
    expect(run({ '0.ea': 1, '0.ma': 1 })).toBe(2);
  });

  it('Archer Brittle Point: Piercing Arrow ilk 2 düşmanda durur, Sunder zırhı %40 düşürür', () => {
    const b = make({ 0: 'archer' }, { 0: 'defender', 3: 'defender', 6: 'defender' }, withTree(0, only('archer', { '2.ea': 1, '2.fa': 1 })));
    tough(E(b, 0), E(b, 3), E(b, 6));
    const base = b.effectiveStats(E(b, 0)).armor;
    const evs = cast(b, P(b), 'piercing_arrow', undefined, 0);
    const hit = targeted(evs, P(b));
    expect(hit.size).toBe(2);
    expect(hit.has(E(b, 6).uid)).toBe(false);
    expect(has(E(b, 0), 'sunder')).toBe(true);
    expect(b.effectiveStats(E(b, 0)).armor).toBeCloseTo(base * 0.6, 0);
  });

  it('Mage Hard Frost: Blizzard alanın ön sırasını her zaman 1 tur Slow', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior', 3: 'warrior' }, withTree(0, only('mage', { '2.n0': 1 })));
    tough(E(b, 0), E(b, 3));
    cast(b, P(b), 'blizzard', undefined, 0);
    expect(has(E(b, 0), 'slow')).toBe(true);
    expect(has(E(b, 3), 'slow')).toBe(false);
  });

  it('Mage Ember Hail: Meteor alan dışındaki 3 düşmana kor (Flung Embers\'in yerine)', () => {
    const b = make({ 0: 'mage' }, { 0: 'warrior', 2: 'warrior', 6: 'warrior', 8: 'warrior', 11: 'warrior' }, withTree(0, only('mage', { '4.d1': 1, '4.d2': 1 })));
    const foes = [0, 2, 6, 8, 11].map((s) => E(b, s));
    tough(...foes);
    cast(b, P(b), 'meteor', undefined, 0);
    const outside = foes.filter((c) => c !== E(b, 0));
    expect(outside.filter((c) => has(c, 'burning')).length).toBe(3);
  });

  it('Druid Grove Bloom: Rejuvenate\'in ilk şifası hedefin sırasındaki dostlara da', () => {
    const b = make({ 0: 'druid', 1: 'warrior', 2: 'warrior', 3: 'warrior' }, { 0: 'warrior' }, withTree(0, only('druid', { '3.ma': 1 })));
    for (const s of [1, 2, 3]) P(b, s).hp = 10;
    cast(b, P(b), 'rejuvenate', P(b, 1));
    expect(P(b, 2).hp).toBeGreaterThan(10);
    expect(P(b, 3).hp).toBe(10);
  });

  it('Druid Briar Prison: Nature\'s Wrath hasarsız, ilk sırasını Stun', () => {
    const b = make({ 0: 'druid' }, { 0: 'warrior', 3: 'warrior' }, withTree(0, only('druid', { '2.fb': 1 })));
    tough(E(b, 0), E(b, 3));
    const evs = cast(b, P(b), 'natures_wrath', undefined, 0);
    expect(dmgTo(evs, E(b, 0)) + dmgTo(evs, E(b, 3))).toBe(0);
    expect(has(E(b, 0), 'stun')).toBe(true);
    expect(has(E(b, 3), 'stun')).toBe(false);
  });

  it('Cutthroat Exposed in Smoke: Smoke Bomb içindeki canı en düşük düşman Overextended', () => {
    const b = make({ 0: 'cutthroat' }, { 0: 'warrior', 1: 'warrior' }, withTree(0, only('cutthroat', { '3.eb': 1 })));
    tough(E(b, 0), E(b, 1));
    E(b, 1).hp = 100;
    cast(b, P(b), 'smoke_bomb', undefined, 0);
    expect(has(E(b, 1), 'overextended')).toBe(true);
    expect(has(E(b, 0), 'overextended')).toBe(false);
  });

  it('Hexer Mark of Silence: Doom Mark hedefin sırasındaki büyücüleri Silence', () => {
    const b = make({ 0: 'hexer' }, { 0: 'mage', 1: 'mage', 3: 'mage' }, withTree(0, only('hexer', { '4.d3': 1 })));
    tough(E(b, 0), E(b, 1), E(b, 3));
    cast(b, P(b), 'doom_mark', E(b, 0));
    expect(has(E(b, 0), 'silence')).toBe(true);
    expect(has(E(b, 1), 'silence')).toBe(true);
    expect(has(E(b, 3), 'silence')).toBe(false);
  });

  it('Gambler Coin Toss Life + Dice Storm: savaşa %80 canla başlar; Loaded Dice 3 rastgele düşmana', () => {
    const b = make({ 0: 'gambler' }, { 0: 'warrior', 1: 'warrior', 2: 'warrior', 3: 'warrior' }, withTree(0, only('gambler', { '0.fb': 1, '1.v': 1 })));
    const me = P(b);
    expect(me.hp).toBe(me.maxHp - Math.round(me.maxHp * 0.2));
    tough(E(b, 0), E(b, 1), E(b, 2), E(b, 3));
    const evs = cast(b, me, 'loaded_dice', E(b, 0));
    expect(targeted(evs, me).size).toBe(3);
  });

  it('Anti-Mage Cloistered Ward: kendine Spell Ward %60 büyük (MP payı dahil), dosta atılamaz', () => {
    const ward = (ranks: Record<string, number> | null): { shield: number; allyOk: boolean } => {
      const b = make({ 0: 'antimage', 1: 'warrior' }, { 0: 'warrior' }, ranks ? withTree(0, only('antimage', ranks)) : {});
      const me = P(b);
      const allyOk = b.validTargets(me.uid, 'spell_ward').some((c) => c.uid === P(b, 1).uid);
      cast(b, me, 'spell_ward', me);
      return { shield: me.magicShield, allyOk };
    };
    const plain = ward(null);
    const cw = ward({ '3.fb': 1 });
    expect(plain.allyOk).toBe(true);
    expect(cw.allyOk).toBe(false);
    expect(cw.shield / plain.shield).toBeCloseTo(1 + (treeOf('antimage')!.nodes['3.fb']!.fx![1] as unknown as { mul: number }).mul, 1);
  });

  it('Undead Banshee\'s Toll: Wail tahtadaki her düşmana, bedel mevcut canın %30\'u', () => {
    const b = make({ 0: 'undead' }, { 0: 'warrior', 5: 'warrior', 10: 'warrior' }, withTree(0, only('undead', { '2.v': 1 })));
    tough(E(b, 0), E(b, 5), E(b, 10));
    const me = P(b);
    expect(b.skill('wail_of_the_dead', me.uid)!.cost.ofCurrent).toBe(0.3);
    const evs = cast(b, me, 'wail_of_the_dead');
    expect(targeted(evs, me).size).toBe(3);
  });
});
