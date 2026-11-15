import { describe, expect, it } from 'vitest';
import { Battle, content, describePassive, describeSkill } from '../src/engine';
import type { BattleEvent, Combatant, SkillDef } from '../src/engine';
import type { DamageEffect } from '../src/engine/spec';
import { checkTreeFx, compileTree } from '../src/progression/skill-tree-compile';
import { treeOf, type TreeData } from '../src/progression/skill-tree-data';

// Skald ağacı yama yolları (Ömer 2026-11-14 onayı, docs/design/classes/skald.md bölüm 5, öneriler 1-6). Ağacın 60 düğümü dolu ve onaylı:
// burada yalnız YOL açılır; testler skald ağacının kopyasında tek düğümün fx'ini değiştirir (sentetik). Sayılar veriden okunur.

const TREE = treeOf('skald')!;
const S = content.skills;
type AnyFx = Record<string, unknown>;
/** Skald ağacının kopyası: `key` düğümünün fx'i `fx` olur. */
const withFx = (key: string, fx: AnyFx[], tree: TreeData = TREE): TreeData => {
  const t = JSON.parse(JSON.stringify(tree)) as TreeData;
  t.nodes[key]!.fx = fx as unknown as TreeData['nodes'][string]['fx'];
  return t;
};
const compile = (t: TreeData, r: Record<string, number>) => compileTree(t, { v: t.version, r });
const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T) => events.filter((e): e is Ev<T> => e.type === type);

function fight(t: TreeData | null, r: Record<string, number>, enemies: Record<number, string> = { 1: 'warrior' }, allies: Record<number, string> = {}, skaldAt = 4, seed = 3): Battle {
  const tree = t ? compile(t, r) : undefined;
  const setup = content.battleSetup('random-battle', seed, 'test', { party: cells({ [skaldAt]: 'skald', ...allies }), enemies: cells(enemies), units: { party: tree ? { [skaldAt]: { tree } } : {}, enemies: {} } }, false);
  const b = new Battle({ ...setup, formulas: { ...setup.formulas, damage: { ...setup.formulas.damage, variance: 0, elementVariance: {} } } });
  b.debug.crit = 'never';
  for (const c of b.combatants) {
    Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, manaEcho: 0, blockChance: 0 });
    c.hp = c.maxHp = 50000;
    c.mp = c.maxMp;
  }
  return b;
}
const skald = (b: Battle): Combatant => b.combatants.find((c) => c.side === 'party' && c.defId === 'skald')!;
const foeAt = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot)!;
function cast(b: Battle, skill: string, target?: string): BattleEvent[] {
  const me = skald(b);
  me.cooldowns[skill] = 0;
  me.mp = me.maxMp;
  const r = b.useSkill(me.uid, skill, target);
  if (!r.ok) throw new Error(`${skill}: ${r.reason}`);
  b.debugClearCooldowns();
  return r.events;
}
const dmgOf = (d: SkillDef) => d.effects.find((e) => e.type === 'damage') as DamageEffect;

describe('Öneri 1: self_area alanı ağaçtan büyür (War Drum)', () => {
  const fx = [{ k: 'hook', h: 'target', area: { rows: content.formulas.formation.rows } }];
  const big = withFx('3.f1', fx);
  it('fx denetimi temiz; derlenen War Drum alanı büyür, şekil kalır', () => {
    expect(checkTreeFx(big)).toEqual([]);
    const d = compile(big, { '3.f1': 1 })!.skills!.war_drum!;
    expect(d.target).toBe('self_area');
    expect(d.area).toMatchObject({ shape: 'rect', rows: content.formulas.formation.rows, cols: S.war_drum!.area!.cols });
  });
  it('savaşta alan hücreleri (merkezde ve köşede) ve arka sıradaki dost Haste alır; yamasız almaz', () => {
    const fm = content.formulas.formation;
    const at = (t: TreeData | null, slot: number) => fight(t, { '3.f1': 1 }, { 1: 'warrior' }, {}, slot);
    // merkez (hücre 4): rows hepsi, cols 3 -> tahtanın tamamı
    expect(at(big, 4).selfAreaCells(skald(at(big, 4)).uid, 'war_drum').length).toBe(fm.rows * fm.lanes);
    const base = at(null, 4);
    expect(base.selfAreaCells(skald(base).uid, 'war_drum').length).toBe(S.war_drum!.area!.rows! * S.war_drum!.area!.cols!);
    // köşe (hücre 0): ortalanır, kenarda kırpılır (alan içeri kaymaz)
    const c = at(big, 0);
    const corner = c.selfAreaCells(skald(c).uid, 'war_drum');
    expect(corner.every((s) => s % fm.lanes <= 1)).toBe(true);
    expect(corner.length).toBe((fm.rows - Math.floor((fm.rows - 1) / 2)) * 2);
    const far = fm.rows * fm.lanes - 2; // arka sıra, orta şerit
    for (const [t, want] of [[big, true], [null, false]] as const) {
      const b = fight(t, { '3.f1': 1 }, { 1: 'warrior' }, { [far]: 'mage' });
      cast(b, 'war_drum');
      const ally = b.combatants.find((x) => x.side === 'party' && x.slot === far)!;
      expect(ally.statuses.some((s) => s.kind === 'haste'), String(want)).toBe(want);
    }
  });
  it('açıklama yamalı alanı okur; alan skill\'i olmayana alan yaması hâlâ hata', () => {
    const b = fight(big, { '3.f1': 1 });
    const def = b.skill('war_drum', skald(b))!;
    const text = describeSkill(def, skald(b).stats, content.formulas).target;
    expect(text).not.toBe(describeSkill(S.war_drum!, skald(b).stats, content.formulas).target);
    expect(checkTreeFx(withFx('2.f1', [{ k: 'hook', h: 'target', area: { rows: 2 } }]))).toEqual([expect.stringContaining('is not an area skill')]);
  });
});

describe('Öneri 2: Conductor durum listesi ağaçtan yamalanır', () => {
  const PE = content.classes.skald!.passive!.effect as { statuses: string[]; bonus: number };
  const add = withFx('0.f1', [{ k: 'passive', f: 'statuses', op: 'add', status: 'chilled' }]);
  it('add listeye ekler (tekrar etmez), remove siler; bilinmeyen durum / eksik durum / sayı op hata', () => {
    expect(checkTreeFx(add)).toEqual([]);
    const st = (compile(add, { '0.f1': 3 })!.passive!.effect as typeof PE).statuses;
    expect(st).toEqual([...PE.statuses, 'chilled']);
    expect(PE.statuses).not.toContain('chilled'); // veri kopyası değişmez
    const rm = withFx('0.f1', [{ k: 'passive', f: 'statuses', op: 'remove', status: PE.statuses[0] }]);
    expect((compile(rm, { '0.f1': 1 })!.passive!.effect as typeof PE).statuses).toEqual(PE.statuses.slice(1));
    expect(checkTreeFx(withFx('0.f1', [{ k: 'passive', f: 'statuses', op: 'add', status: 'nope' }]))).toEqual([expect.stringContaining('unknown status')]);
    expect(checkTreeFx(withFx('0.f1', [{ k: 'passive', f: 'statuses', op: 'remove', status: 'chilled' }]))).toEqual([expect.stringContaining('has no')]);
    expect(checkTreeFx(withFx('0.f1', [{ k: 'passive', f: 'statuses', op: 'mul', v: 2, status: 'chilled' }]))).toEqual([expect.stringContaining('only takes op')]);
  });
  it('savaşta: Chilled düşmana şimşek bonusu yalnız yamayla; pasif açıklaması listeyi gösterir', () => {
    const mult = (t: TreeData | null) => {
      const b = fight(t, { '0.f1': 1 });
      const foe = foeAt(b, 1);
      b.debugAddStatus(foe.uid, 'chilled', 2);
      const def = b.skill('hammer_spark', skald(b))!;
      return { m: b.dealtDamageMult(skald(b), foe, def, { ...dmgOf(def), element: 'lightning' }), b };
    };
    expect(mult(add).m).toBeCloseTo(mult(null).m * (1 + PE.bonus), 6);
    const b = mult(add).b;
    expect(describePassive(skald(b).passive!, skald(b).stats, content.formulas)).toContain('Chilled');
  });
});

describe('Öneri 3: Stormcall sıçrama sayısı (splash.jumps) ağaçtan yamalanır', () => {
  const more = withFx('4.u1', [{ k: 'skill', sel: 'self', f: 'splash.jumps', op: 'add', v: 1 }]);
  it('derlenir (+1, tam sayı); sıçraması olmayan skill\'e hata', () => {
    expect(checkTreeFx(more)).toEqual([]);
    expect(compile(more, { '4.u1': 1 })!.skills!.stormcall!.splash!.jumps).toBe(S.stormcall!.splash!.jumps! + 1);
    expect(checkTreeFx(withFx('1.f1', [{ k: 'skill', sel: 'self', f: 'splash.jumps', op: 'add', v: 1 }]))).not.toEqual([]);
  });
  it('savaşta bir düşmana daha zıplar; açıklama sayıyı gösterir', () => {
    const hitCount = (t: TreeData | null) => {
      const b = fight(t, { '4.u1': 1 }, { 0: 'warrior', 1: 'warrior', 2: 'warrior', 4: 'warrior', 5: 'warrior' });
      return new Set(ofType(cast(b, 'stormcall', foeAt(b, 1).uid), 'damage').map((d) => d.target)).size;
    };
    expect(hitCount(more)).toBe(hitCount(null) + 1);
    const b = fight(more, { '4.u1': 1 });
    const n = S.stormcall!.splash!.jumps! + 1;
    expect(describeSkill(b.skill('stormcall', skald(b))!, skald(b).stats, content.formulas).lines.join(' ')).toContain(`next ${n} most armored`);
  });
});

describe('Öneri 4: Hammer Spark bölünme payı (split.share) ağaçtan yamalanır', () => {
  const share = (v: number) => withFx('1.f1', [{ k: 'skill', sel: 'damage', f: 'split.share', op: 'add', v }]);
  it('derlenir; pay (0, 1) dışına çıkarsa hata; split\'i olmayan skill\'e hata', () => {
    expect(checkTreeFx(share(0.1))).toEqual([]);
    expect(dmgOf(compile(share(0.1), { '1.f1': 1 })!.skills!.hammer_spark!).split!.share).toBeCloseTo(dmgOf(S.hammer_spark!).split!.share + 0.1, 6);
    expect(checkTreeFx(share(1))).toEqual([expect.stringContaining('split.share must stay in (0, 1)')]);
    expect(checkTreeFx(withFx('2.f1', [{ k: 'skill', sel: 'damage', f: 'split.share', op: 'add', v: 0.1 }]))).not.toEqual([]);
  });
  it('savaşta şimşek parçası büyür, fiziksel parça küçülür', () => {
    const parts = (t: TreeData | null) => {
      const b = fight(t, { '1.f1': 1 });
      const foe = foeAt(b, 1);
      foe.stats.armor = foe.stats.magicArmor = 0;
      const d = ofType(cast(b, 'hammer_spark', foe.uid), 'damage').filter((e) => e.target === foe.uid);
      return { light: d.filter((e) => e.element === 'lightning').reduce((s, e) => s + e.amount, 0), phys: d.filter((e) => e.element !== 'lightning').reduce((s, e) => s + e.amount, 0) };
    };
    const a = parts(share(0.1));
    const o = parts(null);
    expect(a.light).toBeGreaterThan(o.light);
    expect(a.phys).toBeLessThan(o.phys);
  });
});

describe('Öneri 5: tetikte rank "chance" procChance\'ı rank ile ölçer', () => {
  type Hook = { node: string; procChance?: number };
  const hookOf = (cls: string, key: string, rank: number) => {
    const t = treeOf(cls)!;
    return (compileTree(t, { v: t.version, r: { [key]: rank } })!.hooks as Hook[]).find((h) => h.node === `${cls}:${key}`)!;
  };
  it('Mage 0.f3 Rime Touch: procChance x rank (eskiden rank\'tan bağımsızdı)', () => {
    const base = (treeOf('mage')!.nodes['0.f3']!.fx as unknown as Array<{ procChance: number }>)[0]!.procChance;
    for (const r of [1, 2, 3]) expect(hookOf('mage', '0.f3', r).procChance).toBeCloseTo(Math.min(1, base * r), 6);
  });
  it('Hexer 2.r Rot Contagion / 3.r Rumour Mill: procChance x rank, eylemler çarpılmaz (Ömer 2026-11-15 r19)', () => {
    for (const k of ['2.r', '3.r']) {
      const fx = (treeOf('hexer')!.nodes[k]!.fx as unknown as Array<{ procChance: number; rank: unknown }>)[0]!;
      expect(fx.rank).toBe('chance');
      for (const r of [1, 2, 3, 5]) expect(hookOf('hexer', k, r).procChance).toBeCloseTo(Math.min(1, fx.procChance * r), 6);
      // procChance dışındaki her şey (durum turu, yığın, hedef sayısı) rank'tan bağımsız
      const strip = (h: Hook) => JSON.stringify({ ...h, procChance: 0 });
      expect(strip(hookOf('hexer', k, 5))).toBe(strip(hookOf('hexer', k, 1)));
    }
  });
  it('rank "chance" procChance\'sız tetikte hata', () => {
    expect(checkTreeFx(withFx('0.f2', [{ k: 'hook', h: 'trigger', on: 'hit', rank: 'chance', do: [{ mp: 1 }] }]))).toEqual([expect.stringContaining('rank "chance" needs "procChance"')]);
  });
});

describe('Öneri 6: Shocked statusApplied / statusGained tetiklerinden geçer', () => {
  const onShock = withFx('0.f2', [{ k: 'hook', h: 'trigger', on: 'statusApplied', status: 'shocked', do: [{ mp: 3 }] }]);
  it('fx denetimi temiz; Thunder Strike Shocked verince tetik işler (MP), Hammer Spark (Shocked vermez) işlemez', () => {
    expect(checkTreeFx(onShock)).toEqual([]);
    const gain = (skill: string) => {
      const b = fight(onShock, { '0.f2': 1 });
      b.freeMp = true;
      const me = skald(b);
      me.mp = 0;
      b.debugClearCooldowns();
      expect(b.useSkill(me.uid, skill, foeAt(b, 1).uid).ok).toBe(true);
      return { mp: me.mp, shocked: foeAt(b, 1).statuses.some((s) => s.kind === content.formulas.thunder.badge) };
    };
    const ts = gain('thunder_strike');
    expect(ts.shocked).toBe(true);
    expect(ts.mp).toBe(3);
    expect(gain('hammer_spark').mp).toBe(0);
  });
  it('hedefin statusGained tetiği de Shocked\'ı görür (düşman Skald)', () => {
    const gained = withFx('0.f2', [{ k: 'hook', h: 'trigger', on: 'statusGained', status: 'shocked', do: [{ mp: 2 }] }]);
    const tree = compile(gained, { '0.f2': 1 })!;
    const setup = content.battleSetup('random-battle', 3, 'test', { party: cells({ 4: 'skald' }), enemies: cells({ 1: 'skald' }), units: { party: {}, enemies: { 1: { tree } } } }, false);
    const b = new Battle(setup);
    b.debug.crit = 'never';
    for (const c of b.combatants) Object.assign(c.stats, { accuracy: 10, evasion: 0, critChance: 0, surviveChance: 0, resilience: 0, blockChance: 0 });
    const me = b.combatants.find((c) => c.side === 'party')!;
    const foe = b.combatants.find((c) => c.side === 'enemy')!;
    foe.mp = 0;
    me.mp = me.maxMp;
    b.debugClearCooldowns();
    const r = b.useSkill(me.uid, 'thunder_strike', foe.uid);
    expect(r.ok).toBe(true);
    expect(foe.mp).toBe(2);
  });
});
