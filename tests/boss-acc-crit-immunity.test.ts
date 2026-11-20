import { describe, expect, it } from 'vitest';
import { Battle, content, describeSkill, explainChoice, previewSkill } from '../src/engine';
import type { BattleEvent, BattleMode, Teams } from '../src/engine';
import { isAccuracyCritDebuff } from '../src/engine/cc-immunity';
import { scaleDelta } from '../src/engine/status-stack';
import { buildWiki } from '../src/wiki/catalog';

/**
 * Ömer onaylı 2026-11-09 (form 3): madde 272'nin isabet/kritik kısmı KALDIRILDI (ccImmunity.accuracyCrit: false). Boss Blinded / Jinxed / Shaken'i
 * yer; büyüklükleri ccImmunity.debuffStrength (boss 0,25, elit 0,5) ile ölçeklenir. omenCrit (Misfortune boss'ta yok) aynen. Eski metin tarih için:
 * Madde 272 (Ömer 2026-10-08): "İsabeti-kritiği bozan etkiler de boss'a işlemesin. Hexer'in Omen'indeki kritik düşürme (Misfortune) de boss'a işlemesin."
 * formulas.json > ccImmunity.accuracyCrit: isabet/kritik düşüren debuff'lar (accuracyDelta < 0 ya da critDelta < 0: Blinded, Jinxed) boss'a uygulanmaz
 * (CC ile aynı 'Immune' akışı). ccImmunity.omenCrit: Omen uygulanır (yığın, Doom aynen) ama critDeltaPerStack boss'ta yok sayılır. Taunt kararı aynen.
 */
type Ev<T extends BattleEvent['type']> = Extract<BattleEvent, { type: T }>;
const ofType = <T extends BattleEvent['type']>(events: BattleEvent[], type: T): Ev<T>[] => events.filter((e): e is Ev<T> => e.type === type);
const cells = (map: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => map[i] ?? '');
const IMM = content.formulas.ccImmunity!;
const OMEN = content.statuses.omen!;
const BOSS: Teams['units'] = { enemies: { 1: { tier: 'boss' } } };
const ELITE: Teams['units'] = { enemies: { 1: { tier: 'elite' } } };

function grid(party: Record<number, string>, enemies: Record<number, string>, opts: { mode?: BattleMode; units?: Teams['units']; natural?: boolean } = {}): Battle {
  const b = new Battle(content.battleSetup('random-battle', 1, opts.mode ?? 'test', { party: cells(party), enemies: cells(enemies), ...(opts.units ? { units: opts.units } : {}) }, false));
  b.debugClearCooldowns();
  b.freeMp = true;
  for (const c of b.combatants) {
    if (!opts.natural) Object.assign(c.stats, { critChance: 0, accuracy: 10, evasion: 0, surviveChance: 0, resilience: 0 });
    c.hp = c.maxHp = 5000;
  }
  return b;
}
const at = (b: Battle, side: 'party' | 'enemy', slot: number) => b.combatants.find((c) => c.side === side && c.slot === slot && c.hp > 0)!;
const has = (b: Battle, uid: string, kind: string) => b.get(uid)!.statuses.some((s) => s.kind === kind);

const STR = IMM.debuffStrength!;

describe('Boss isabet/kritik debuffları: veri (form 3, 2026-11-09)', () => {
  it('ccImmunity.accuracyCrit kapalı, omenCrit açık; kural accuracyDelta/critDelta < 0 olan debuffları seçer (Blinded, Jinxed, Shaken), Shrouded/Omen değil', () => {
    expect(IMM.accuracyCrit).toBe(false);
    expect(IMM.omenCrit).toBe(true);
    const picked = Object.entries(content.statuses).filter(([, d]) => isAccuracyCritDebuff(d)).map(([id]) => id).sort();
    for (const id of ['blinded', 'jinxed']) expect(picked).toContain(id); // Ömer 2026-11-16: Shaken Blinded ile birleşti (çan kaynağı 1/3 güçte Blinded)
    expect(content.statuses['shaken']).toBeUndefined();
    for (const id of picked) {
      const d = content.statuses[id]!;
      expect(d.type).toBe('debuff');
      expect(d.cc).toBeFalsy();
      expect((d.accuracyDelta ?? 0) < 0 || (d.critDelta ?? 0) < 0).toBe(true); // hepsinin sayısal büyüklüğü var: debuffStrength ölçekler
    }
    expect(picked).not.toContain('shrouded');
    expect(picked).not.toContain('omen');
    expect(IMM.taunt).toBe(true);
  });
});

describe('Boss isabet/kritik debuffları: motor', () => {
  for (const mode of ['test', 'turns'] as BattleMode[]) {
    it(`Jinx: boss da Jinxed olur (Immune yok), hasar ve Omen işler; elit ve normal düşman da (${mode})`, () => {
      for (const units of [BOSS, ELITE, undefined]) {
        const b = grid({ 4: 'hexer' }, { 1: 'warrior', 4: 'mage' }, { mode, ...(units ? { units } : {}) });
        const h = at(b, 'party', 4);
        const e = at(b, 'enemy', 1);
        if (mode === 'turns') for (let i = 0; i < 60 && b.currentUid !== h.uid; i++) b.skipTurn();
        const hp = e.hp;
        const r = b.useSkill(h.uid, 'jinx', e.uid);
        expect(r.ok).toBe(true);
        const ev = r.ok ? r.events : [];
        expect(e.hp).toBeLessThan(hp);
        expect(e.statuses.find((s) => s.kind === 'omen')?.stacks ?? 0).toBeGreaterThan(0);
        expect(ofType(ev, 'status').some((s) => s.target === e.uid && s.status === 'jinxed')).toBe(true);
        expect(ofType(ev, 'immune').filter((x) => x.status === 'jinxed')).toHaveLength(0);
      }
    });
  }

  it('Blinded / Jinxed / Shaken büyüklüğü: boss %25, elit %50, normal tam (isabet ve kritik eki)', () => {
    for (const [units, k] of [[BOSS, STR.boss!], [ELITE, STR.elite!], [undefined, 1]] as const) {
      // Ömer 2026-11-16: eski Shaken = örnek gücü 0,333 olan Blinded; boss / elit ölçeği güçten sonra çarpılır
      for (const [kind, sg] of [['blinded', 1], ['jinxed', 1], ['blinded', 0.333]] as const) {
        const b = grid({ 0: 'hexer' }, { 1: 'warrior' }, units ? { units } : {});
        const e = at(b, 'enemy', 1);
        Object.assign(e.stats, { accuracy: 1, critChance: 0.5 });
        const d = content.statuses[kind]!;
        b.debugAddStatus(e.uid, kind, 2);
        expect(has(b, e.uid, kind)).toBe(true);
        const s = e.statuses.find((x) => x.kind === kind)!;
        s.source = 'party-0'; // karşı taraftan
        if (sg !== 1) s.strength = sg;
        const st = b.effectiveStats(e);
        expect(st.accuracy).toBeCloseTo(1 + scaleDelta(d.accuracyDelta ?? 0, sg) * k, 4);
        expect(st.critChance).toBeCloseTo(Math.max(0, 0.5 + scaleDelta(d.critDelta ?? 0, sg) * k), 4);
      }
    }
  });

  it('Smoke Bomb: düşman tahtasında boss da Blinded olur (Immune yok), yanındaki normal düşman da', () => {
    const b = grid({ 0: 'cutthroat' }, { 1: 'warrior', 2: 'mage' }, { units: BOSS });
    const boss = at(b, 'enemy', 1);
    const other = at(b, 'enemy', 2);
    const anchor = b.shapeAnchors('party-0', 'smoke_bomb', 'enemy').find((a) => {
      const t = b.shapePreviewCells('party-0', 'smoke_bomb', a, 'enemy').targets;
      return t.includes(boss.uid) && t.includes(other.uid);
    })!;
    expect(anchor).toBeDefined();
    const r = b.useSkill('party-0', 'smoke_bomb', undefined, anchor, 'enemy');
    expect(r.ok).toBe(true);
    expect(has(b, boss.uid, 'blinded')).toBe(true);
    expect(has(b, other.uid, 'blinded')).toBe(true);
    expect(ofType(r.ok ? r.events : [], 'immune').map((x) => x.status)).not.toContain('blinded');
  });

  it('Misfortune: boss\'ta Omen yığını kritik şansını düşürmez (yığın ve Doom aynen); elitte düşürür', () => {
    for (const [units, ignored] of [[BOSS, true], [ELITE, false]] as const) {
      const b = grid({ 4: 'hexer' }, { 1: 'warrior' }, { units });
      const h = at(b, 'party', 4);
      const e = at(b, 'enemy', 1);
      e.stats.critChance = 0.2;
      for (let i = 0; i < 2; i++) expect(b.useSkill(h.uid, 'evil_eye', e.uid).ok).toBe(true);
      expect(e.statuses.find((s) => s.kind === 'omen')?.stacks).toBe(2);
      expect(b.ignoresMisfortune(e)).toBe(ignored);
      // elit: CC dışı debuff ccImmunity.debuffStrength.elite gücünde (Ömer 2026-11-09)
      expect(b.effectiveStats(e).critChance).toBeCloseTo(ignored ? 0.2 : 0.2 + 2 * OMEN.critDeltaPerStack! * (content.formulas.ccImmunity?.debuffStrength?.elite ?? 1));
      // 3. Omen: Doom boss'ta da patlar
      const r = b.useSkill(h.uid, 'evil_eye', e.uid);
      expect(r.ok && ofType(r.events, 'doom').length).toBe(1);
    }
  });
});

describe('Boss isabet/kritik debuffları: önizleme, YZ, skill-info, wiki', () => {
  it('önizleme: Jinx boss\'ta Immune değil, azaltılmış güç yazar; hasar ve Omen görünür', () => {
    for (const units of [BOSS, undefined]) {
      const b = grid({ 4: 'hexer' }, { 1: 'warrior' }, units ? { units } : {});
      const pv = previewSkill(b, at(b, 'party', 4).uid, 'jinx', at(b, 'enemy', 1).uid).find((p) => p.uid === at(b, 'enemy', 1).uid)!;
      expect(pv.immune ?? []).toEqual([]);
      expect(pv.damage).toBeDefined();
      expect(pv.omen).toBeDefined();
      if (units) expect((pv.statuses ?? []).join(' ')).toMatch(new RegExp(`${Math.round(STR.boss! * 100)}% strength`));
    }
  });

  it('YZ: Jinx\'in isabet/kritik bozma değeri boss\'ta da var (hasar ve Omen değeri de)', () => {
    for (const units of [BOSS, undefined]) {
      const b = grid({ 4: 'hexer' }, { 1: 'warrior' }, { natural: true, ...(units ? { units } : {}) });
      const cand = explainChoice(b, at(b, 'party', 4).uid, content.aiConfig)!.candidates.find((c) => c.skill === 'jinx')!;
      expect(cand).toBeDefined();
      expect(cand.mitigation ?? 0).toBeGreaterThan(0);
      expect(cand.dmg).toBeGreaterThan(0);
      expect(cand.curse ?? 0).toBeGreaterThan(0);
    }
  });

  it('YZ: tek düşman boss iken de Smoke Bomb\'un düşman tahtasında koruma değeri var', () => {
    for (const units of [BOSS, undefined]) {
      const b = grid({ 0: 'cutthroat' }, { 1: 'warrior' }, { natural: true, ...(units ? { units } : {}) });
      const cands = explainChoice(b, 'party-0', content.aiConfig)!.candidates.filter((c) => c.skill === 'smoke_bomb' && c.board === 'foe');
      expect(cands.length).toBeGreaterThan(0);
      expect(cands.some((c) => (c.mitigation ?? 0) > 0)).toBe(true);
    }
  });

  it('skill-info: boss bağışıklık satırları skilllerde yok; Warden pasifi Misfortune\'u anlatır, Blinded\'ı bağışıklık saymaz', () => {
    const lines = (id: string, cls: string) => describeSkill(content.skills[id]!, content.classes[cls]!.stats, content.formulas, {}, { statuses: content.statuses }).lines;
    for (const [id, cls] of [['smoke_bomb', 'cutthroat'], ['jinx', 'hexer'], ['evil_eye', 'hexer']] as const) {
      expect(lines(id, cls).some((l) => l.includes('Bosses are immune') || l.includes('Bosses ignore')), id).toBe(false);
    }
    const uy = content.bosses.bridge_warden!.boss!.passives!.find((p) => p.id === 'unyielding')!;
    expect(uy.text).toContain('Misfortune');
    expect(uy.text).not.toMatch(/Accuracy and crit penalties/);
    expect(uy.text).not.toMatch(/Stun, Slow/);
  });

  it('wiki: boss makalesi bağışıklık satırı Misfortune\'u sayar, isabet/kritik cezasını ve Slow\'u bağışıklık saymaz', () => {
    const text = JSON.stringify(buildWiki({ sprites: {}, avatars: {} }));
    const line = text.split('Bosses are immune to crowd control')[1]?.slice(0, 400) ?? '';
    expect(line).toContain('Misfortune');
    expect(line).not.toContain('accuracy/crit penalties');
    expect(line.split(')')[0]).not.toContain(content.statuses.slow!.name);
  });
});
