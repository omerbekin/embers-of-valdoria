import { describe, expect, it } from 'vitest';
import { Battle, content, type BattleEvent, type BattleMode, type Combatant, type Teams, type UnitSetup } from '../src/engine';
import { chooseAction, statusModePick } from '../src/engine/ai';
import { checkTreeFx, compileTree, treeOf } from '../src/progression';
import type { TreeData } from '../src/progression/skill-tree-data';

// Skill ağacı Faz 8 (Ömer 2026-10-23, mockup tree-choices V2): son 5 düğüm. Paladin Focused Beam (4.d1) + Pillar of Wrath (4.d2) + Lance of Dawn (4.d3):
// Radiance'ın ikinci biçimi (tek düşman); Gambler Stacked Deck (3.ea) + Double Deal (3.ma): Card Trick her kullanımda durum kartı seçer.
// Biçim eylemde taşınır (BattleAction / AiChoice `mode`); ağaçsız birimde biçim yok, savaş bugünküyle birebir aynı.

const L = content.GRID.lanes;
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
const E = (b: Battle, slot: number): Combatant => b.combatants.find((c) => c.side === 'enemy' && c.slot === slot && !c.summoned)!;
const tough = (...cs: Combatant[]): void => cs.forEach((c) => (c.hp = c.maxHp = 9000));
const dmgTo = (evs: BattleEvent[], t: Combatant): number => evs.reduce((s, e) => s + (e.type === 'damage' && e.target === t.uid ? e.amount + e.absorbed : 0), 0);
const hitBy = (evs: BattleEvent[], src: Combatant): Set<string> =>
  new Set(evs.flatMap((e) => ((e.type === 'damage' || e.type === 'miss' || e.type === 'dodge') && e.source === src.uid ? [e.target] : [])));
const has = (c: Combatant, kind: string): boolean => c.statuses.some((s) => s.kind === kind);
const ready = (c: Combatant, skill: string): void => {
  c.cooldowns[skill] = 0;
  c.mp = c.maxMp;
};

const PAL_D1 = { '4.d1': 1 };
const PAL_ALL = { '4.d1': 1, '4.d2': 1, '4.d3': 1 };
const GAM_PICK = { '3.ea': 1 };
const GAM_DOUBLE = { '3.ea': 1, '3.ma': 1 };

describe('Faz 8: veri ve derleme', () => {
  it('fx temiz derlenir; artık null düğüm yok', () => {
    for (const c of ['paladin', 'gambler']) {
      expect(checkTreeFx(treeOf(c)!), c).toEqual([]);
      expect(Object.values(treeOf(c)!.nodes).some((n) => n.fx === null), c).toBe(false);
    }
  });

  it('Focused Beam: Radiance kendi biçimini korur + tek düşman biçimi (şifa yok, hasar x2.2)', () => {
    const t = only('paladin', PAL_D1)!;
    const set = t.modes!['radiance']!;
    expect(set.keepBase).toBe(true);
    expect(set.baseText).toBeTruthy();
    expect(set.list.map((m) => m.id)).toEqual(['focused_beam']);
    const m = set.list[0]!;
    expect(m.name).toBe('Focused Beam');
    expect(m.node).toMatch(/4\.d1$/);
    expect(m.skill.id).toBe('radiance');
    expect(m.skill.target).toBe('single_enemy');
    expect(m.skill.effects.some((e) => e.type === 'heal')).toBe(false);
    const base = content.skills['radiance']!.effects.find((e) => e.type === 'damage') as { power: number };
    const dmg = m.skill.effects.find((e) => e.type === 'damage') as { power: number };
    expect(dmg.power).toBeCloseTo(base.power * 2.2, 6);
    // kendi skill'i değişmez
    const own = t.skills?.['radiance'] ?? content.skills['radiance']!;
    expect(own.target).toBe('everyone');
    expect(own.effects.some((e) => e.type === 'heal')).toBe(true);
  });

  it('Pillar of Wrath + Lance of Dawn biçime eklenir (holy fire, şerit delme %60)', () => {
    const m = only('paladin', PAL_ALL)!.modes!['radiance']!.list[0]!;
    expect(m.skill.effects.some((e) => e.type === 'ground' && (e as { ground: string }).ground === 'holy_fire')).toBe(true);
    expect(m.skill.splash).toEqual({ pattern: 'lane', mult: 0.6 });
    expect(m.text).toContain('holy fire');
    expect(m.text).toContain('lane');
  });

  it('Stacked Deck: Card Trick üç durum biçimi (Slow / Wound / Stun), Stun yalnızca ilk karta; kendi biçimi seçilemez', () => {
    const set = only('gambler', GAM_PICK)!.modes!['card_trick']!;
    expect(set.keepBase).toBe(false);
    expect(set.list.map((m) => m.id)).toEqual(['slow', 'wound', 'stun']);
    for (const m of set.list) {
      expect(m.skill.effects.some((e) => e.type === 'randomStatus')).toBe(false);
      const st = m.skill.effects.find((e) => e.type === 'status') as { status: string; firstOnly?: boolean };
      expect(st.status).toBe(m.id);
      expect(!!st.firstOnly).toBe(m.id === 'stun');
    }
    expect(set.list.find((m) => m.id === 'stun')!.note).toBe('First target only');
  });

  it('Double Deal: seçilen durum + kalanlardan rastgele ikinci durum (seçilen hariç; Stun ilk karta özel)', () => {
    const set = only('gambler', GAM_DOUBLE)!.modes!['card_trick']!;
    for (const m of set.list) {
      const rs = m.skill.effects.find((e) => e.type === 'randomStatus') as { options: { status: string; firstOnly?: boolean }[] };
      expect(rs.options.map((o) => o.status).sort()).toEqual(['slow', 'stun', 'wound'].filter((s) => s !== m.id).sort());
      for (const o of rs.options) expect(!!o.firstOnly).toBe(o.status === 'stun');
    }
  });

  it('Cold Deck + Double Deal: seçim yok, Stun sabit + kendi tanımına rastgele ikinci durum (Slow / Wound)', () => {
    const t = only('gambler', { ...GAM_DOUBLE, '3.fa': 1 })!;
    expect(t.modes?.['card_trick']).toBeUndefined();
    const ct = t.skills!['card_trick']!;
    expect(ct.effects.some((e) => e.type === 'status' && (e as { status: string }).status === 'stun')).toBe(true);
    const rs = ct.effects.find((e) => e.type === 'randomStatus') as { options: { status: string }[] };
    expect(rs.options.map((o) => o.status).sort()).toEqual(['slow', 'wound']);
  });

  it('biçimi açmayan ek (needs olmadan) katı denetimde hata', () => {
    const t = JSON.parse(JSON.stringify(treeOf('paladin')!)) as TreeData;
    t.nodes['4.d1']!.fx = null;
    for (const f of t.nodes['4.d2']!.fx as { needs?: string }[]) delete f.needs;
    expect(checkTreeFx(t).join('\n')).toMatch(/focused_beam/);
  });
});

describe('Faz 8: savaşta biçim', () => {
  // düşman: 0 = ön sıra şerit 0; L = arkası; 2L = en arka; 1 = yan şerit
  const foes = { 0: 'mage', [L]: 'mage', [2 * L]: 'mage', 1: 'mage' };

  it('Focused Beam yalnızca seçilen düşmanı vurur, müttefik iyileşmez; bekleme kendi Radiance tanımı', () => {
    const b = make({ 0: 'paladin', 1: 'warrior' }, foes, withTree(0, only('paladin', PAL_D1)));
    const me = P(b);
    const ally = P(b, 1);
    tough(E(b, 0), E(b, L), E(b, 2 * L), E(b, 1));
    ally.hp = 1;
    ready(me, 'radiance');
    const from = b.log.length;
    const r = b.useSkill(me.uid, 'radiance', E(b, L).uid, undefined, undefined, undefined, 'focused_beam');
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const evs = b.log.slice(from);
    expect([...hitBy(evs, me)]).toEqual([E(b, L).uid]);
    expect(ally.hp).toBe(1);
    expect(b.skill('radiance', me)!.target).toBe('everyone'); // kullanım bitince kendi biçimi
  });

  it('Focused Beam hasarı Radiance tek vuruşunun ~2.2 katı', () => {
    const run = (mode?: string): number => {
      const b = make({ 0: 'paladin' }, { 0: 'mage' }, withTree(0, only('paladin', PAL_D1)), 5);
      const me = P(b);
      const t = E(b, 0);
      tough(t);
      ready(me, 'radiance');
      const from = b.log.length;
      expect(b.useSkill(me.uid, 'radiance', mode ? t.uid : undefined, undefined, undefined, undefined, mode).ok).toBe(true);
      return dmgTo(b.log.slice(from), t);
    };
    const base = run();
    const focused = run('focused_beam');
    expect(base).toBeGreaterThan(0);
    expect(focused / base).toBeGreaterThan(1.9);
    expect(focused / base).toBeLessThan(2.5);
  });

  it('Lance of Dawn: hedefin şeridinde arkadakilere %60, yan şeride değmez; Pillar of Wrath yalnızca hedefin hücresine holy fire', () => {
    const b = make({ 0: 'paladin' }, foes, withTree(0, only('paladin', PAL_ALL)));
    const me = P(b);
    tough(E(b, 0), E(b, L), E(b, 2 * L), E(b, 1));
    ready(me, 'radiance');
    const from = b.log.length;
    expect(b.useSkill(me.uid, 'radiance', E(b, 0).uid, undefined, undefined, undefined, 'focused_beam').ok).toBe(true);
    const evs = b.log.slice(from);
    const hit = hitBy(evs, me);
    expect(hit.has(E(b, 0).uid)).toBe(true);
    expect(hit.has(E(b, L).uid)).toBe(true);
    expect(hit.has(E(b, 2 * L).uid)).toBe(true);
    expect(hit.has(E(b, 1).uid)).toBe(false);
    const front = dmgTo(evs, E(b, 0));
    expect(dmgTo(evs, E(b, L))).toBeLessThan(front);
    const grounds = evs.filter((e) => e.type === 'ground' || (e as { type: string }).type === 'groundPlaced');
    expect(grounds.length).toBeGreaterThan(0);
  });

  it('bilinmeyen biçim reddedilir, durum değişmez; biçimsiz birimde mode da reddedilir', () => {
    const b = make({ 0: 'paladin', 1: 'paladin' }, foes, withTree(0, only('paladin', PAL_D1)));
    const me = P(b);
    ready(me, 'radiance');
    const n = b.log.length;
    expect(b.useSkill(me.uid, 'radiance', E(b, 0).uid, undefined, undefined, undefined, 'nope')).toMatchObject({ ok: false, reason: 'Unknown mode' });
    expect(b.log.length).toBe(n);
    const plain = P(b, 1);
    ready(plain, 'radiance');
    expect(b.useSkill(plain.uid, 'radiance', E(b, 0).uid, undefined, undefined, undefined, 'focused_beam').ok).toBe(false);
    expect(b.skillModes(plain.uid, 'radiance')).toBeUndefined();
  });

  it('setViewMode / withMode: önizleme yalnızca o birim + skill, sonra kendi biçimine döner', () => {
    const b = make({ 0: 'paladin' }, foes, withTree(0, only('paladin', PAL_D1)));
    const me = P(b);
    expect(b.setViewMode(me.uid, 'radiance', 'focused_beam')).toBe(true);
    expect(b.skill('radiance', me)!.target).toBe('single_enemy');
    expect(b.skill('radiance')!.target).toBe('everyone'); // birimsiz sorgu kendi tanımı
    b.setViewMode(me.uid, 'radiance', null);
    expect(b.skill('radiance', me)!.target).toBe('everyone');
    expect(b.withMode(me.uid, 'radiance', 'focused_beam', () => b.skill('radiance', me)!.target)).toBe('single_enemy');
    expect(b.skill('radiance', me)!.target).toBe('everyone');
    expect(b.setViewMode(me.uid, 'radiance', 'bad')).toBe(false);
  });

  it('Stacked Deck Stun: yalnızca ilk kart sersemletir; Slow: iki kart da yavaşlatır', () => {
    for (const mode of ['stun', 'slow'] as const) {
      const b = make({ 0: 'gambler' }, { 0: 'mage', 1: 'mage' }, withTree(0, only('gambler', GAM_PICK)), 3);
      const me = P(b);
      const [a, c] = [E(b, 0), E(b, 1)];
      tough(a, c);
      ready(me, 'card_trick');
      const from = b.log.length;
      expect(b.useSkill(me.uid, 'card_trick', undefined, undefined, undefined, undefined, mode).ok).toBe(true);
      const evs = b.log.slice(from);
      const n = [a, c].filter((x) => has(x, mode)).length;
      const others = [a, c].filter((x) => has(x, mode === 'stun' ? 'slow' : 'stun') || has(x, 'wound')).length;
      expect(others, mode).toBe(0);
      if (mode === 'stun') expect(n).toBeLessThanOrEqual(1);
      else expect(n).toBe(new Set(evs.flatMap((e) => (e.type === 'damage' && e.source === me.uid ? [e.target] : []))).size);
      expect(n, mode).toBeGreaterThan(0);
    }
  });

  it('Double Deal: seçilen durum + farklı bir ikinci durum', () => {
    const b = make({ 0: 'gambler' }, { 0: 'mage' }, withTree(0, only('gambler', GAM_DOUBLE)), 7);
    const me = P(b);
    const a = E(b, 0);
    tough(a);
    ready(me, 'card_trick');
    expect(b.useSkill(me.uid, 'card_trick', undefined, undefined, undefined, undefined, 'wound').ok).toBe(true);
    expect(has(a, 'wound')).toBe(true);
    expect(has(a, 'slow') || has(a, 'stun')).toBe(true);
  });
});

describe('Faz 8: yapay zeka', () => {
  it('durum kartı kuralı: tek düşman -> Stun; düşmanda şifacı -> Wound; yoksa Slow', () => {
    const pick = (enemies: Record<number, string>): string => {
      const b = make({ 0: 'gambler' }, enemies, withTree(0, only('gambler', GAM_PICK)));
      const me = P(b);
      return statusModePick(b, me, 'card_trick', b.skillModes(me.uid, 'card_trick')!);
    };
    expect(pick({ 0: 'warrior' })).toBe('stun');
    expect(pick({ 0: 'warrior', 1: 'paladin' })).toBe('wound');
    expect(pick({ 0: 'warrior', 1: 'archer' })).toBe('slow');
  });

  it('Card Trick seçen YZ seçimi biçimle gelir ve applyChoice onu uygular', () => {
    const b = make({ 0: 'gambler' }, { 0: 'warrior', 1: 'archer' }, withTree(0, only('gambler', GAM_PICK)));
    const me = P(b);
    me.skills = ['card_trick'];
    ready(me, 'card_trick');
    const ch = chooseAction(b, me.uid, content.aiConfig);
    expect(ch?.skillId).toBe('card_trick');
    expect(ch?.mode).toBe('slow');
    expect(b.applyChoice(me.uid, ch).ok).toBe(true);
  });

  it('tek düşman kaldıysa YZ Radiance yerine Focused Beam seçer', () => {
    const b = make({ 0: 'paladin' }, { 0: 'warrior' }, withTree(0, only('paladin', PAL_D1)));
    const me = P(b);
    me.skills = ['radiance'];
    ready(me, 'radiance');
    const ch = chooseAction(b, me.uid, content.aiConfig);
    expect(ch?.skillId).toBe('radiance');
    expect(ch?.mode).toBe('focused_beam');
    expect(b.applyChoice(me.uid, ch).ok).toBe(true);
  });

  it('ağaçsız birim: biçim yok, YZ seçimi mode taşımaz, aynı seed aynı kayıt', () => {
    const run = (): { log: string; mode: unknown } => {
      const b = make({ 0: 'paladin', 1: 'gambler' }, { 0: 'warrior', 1: 'archer', 2: 'mage' }, {}, 21, 'turns');
      let mode: unknown;
      for (let i = 0; i < 40 && !b.winner; i++) {
        const a = b.currentActor;
        if (!a) break;
        const ch = chooseAction(b, a.uid, content.aiConfig);
        if (ch?.mode !== undefined) mode = ch.mode;
        b.applyChoice(a.uid, ch);
      }
      expect(b.combatants.every((c) => !c.skillModes)).toBe(true);
      return { log: JSON.stringify(b.log), mode };
    };
    const x = run();
    expect(x.mode).toBeUndefined();
    expect(run().log).toBe(x.log);
  });
});
