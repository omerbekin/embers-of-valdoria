import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, previewSkill } from '../src/engine';
import type { BattleMode, Combatant, Side, Teams } from '../src/engine';
import { cellDistance, rangeLabel, skillRangeFor } from '../src/engine/range';
import { rangeOff, rangeOn } from './range-helpers';

/**
 * MENZİL SİSTEMİ (docs/design/range.md, Ömer 2026-10-17; formulas.json > range). Sayılar veriden okunur (sınıf range'i, skill range'i).
 * Kurulumlar rangeOn/rangeOff ile bayraktan bağımsız: veri bayrağı kapatılsa da (geri dönüş) bu testler kuralı sınamaya devam eder.
 */
const F = content.formulas;
const ROWS = F.formation.rows;
const LANES = F.formation.lanes;
const cells = (map: Record<number, string>) => Array.from({ length: ROWS * LANES }, (_, i) => map[i] ?? '');
const slotAt = (row: number, lane = 0) => row * LANES + lane;
const R = (unit: string) => content.classes[unit]!.range!;
const SR = (skill: string) => content.skills[skill]!.range!;

function mk(party: Record<number, string>, enemies: Record<number, string>, opts: { mode?: BattleMode; off?: boolean; seed?: number; units?: Teams['units'] } = {}): Battle {
  const base = content.battleSetup('random-battle', opts.seed ?? 1, opts.mode ?? 'test', { party: cells(party), enemies: cells(enemies), ...(opts.units ? { units: opts.units } : {}) }, false);
  const b = new Battle(opts.off ? rangeOff(base) : rangeOn(base));
  for (const c of b.combatants) {
    Object.assign(c.stats, { critChance: 0, accuracy: 10, evasion: 0, surviveChance: 0 });
    c.hp = c.maxHp = 5000;
  }
  b.debugClearCooldowns();
  b.freeMp = true;
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.slot === slot && c.hp > 0)!;
const uids = (list: Combatant[]) => list.map((c) => c.uid).sort();

describe('mesafe kuralı (range.ts > cellDistance)', () => {
  it('ön ↔ ön 1, arka ↔ arka 2 x (sıra - 1) + 1; kendi tarafında sıra farkı', () => {
    expect(cellDistance(0, false, 0, 0)).toBe(1);
    expect(cellDistance(ROWS - 1, false, ROWS - 1, 0)).toBe(2 * (ROWS - 1) + 1);
    expect(cellDistance(1, false, 2, 0)).toBe(4);
    expect(cellDistance(3, true, 1, 0)).toBe(2);
  });

  it('hedef tarafında boş ön sıralar sayılmaz (derinlik en öndeki DOLU sıradan)', () => {
    expect(cellDistance(0, false, 2, 2)).toBe(1); // hedefin sırası 2 ama önündeki sıralar boş: hedef "ön sıra"
    expect(cellDistance(0, false, 3, 2)).toBe(2);
  });

  it('menzil = skill.range ?? sahibin range ?? default; Global ve hedef seçimi olmayan tür sınırsız; range\'siz dost skill\'i sınırsız', () => {
    expect(skillRangeFor(content.skills.melee_attack!, R('warrior'), F)).toBe(R('warrior'));
    expect(skillRangeFor(content.skills.charge!, R('warrior'), F)).toBe(SR('charge'));
    expect(skillRangeFor(content.skills.fist_crush!, R('defender'), F)).toBe(Infinity);
    expect(skillRangeFor(content.skills.shield_wall ?? content.skills.taunt!, R('defender'), F)).toBe(Infinity);
    expect(skillRangeFor(content.skills.rejuvenate!, R('druid'), F)).toBe(Infinity);
    expect(skillRangeFor(content.skills.guard!, R('defender'), F)).toBe(SR('guard'));
    const on = { range: { enabled: true, default: 1 } };
    expect(rangeLabel(content.skills.fire_bolt!, R('mage'), on)).toBe(`Range ${R('mage')}`);
    expect(rangeLabel(content.skills.fist_crush!, R('defender'), on)).toBe('Global');
    expect(rangeLabel(content.skills.rejuvenate!, R('druid'), on)).toBe('');
    expect(rangeLabel(content.skills.fire_bolt!, R('mage'), { range: { enabled: false, default: 1 } })).toBe('');
  });

  it('onaylanan tablo (range.md) veride: sınıf tabanları, istisnalar, Global listesi', () => {
    expect({ warrior: R('warrior'), defender: R('defender'), cutthroat: R('cutthroat'), paladin: R('paladin'), druid: R('druid'), antimage: R('antimage'), gambler: R('gambler'), undead: R('undead'), hexer: R('hexer'), mage: R('mage'), archer: R('archer') })
      .toEqual({ warrior: 1, defender: 1, cutthroat: 1, paladin: 4, druid: 5, antimage: 4, gambler: 5, undead: 5, hexer: 5, mage: 6, archer: 6 });
    for (const [id, r] of [['charge', 4], ['backstab', 3], ['x_cut', 3], ['smoke_bomb', 4], ['bone_throw', 4], ['drain_field', 4], ['guard', 2]] as const) expect(content.skills[id]?.range, id).toBe(r);
    for (const id of ['fist_crush', 'radiance', 'card_trick']) expect(content.skills[id]?.global, id).toBe(true);
    for (const id of ['meteor', 'blizzard', 'arrow_rain']) expect(content.skills[id]?.global, id).toBeFalsy();
  });
});

describe('savaşta menzil (validTargets / canUse / useSkill / önizleme)', () => {
  it('melee yalnızca ön ↔ ön; düşman ön sırası boşalınca sıradaki dolu sıra yeni ön sıradır', () => {
    const b = mk({ [slotAt(0)]: 'warrior' }, { [slotAt(0)]: 'mage', [slotAt(1, 1)]: 'archer' });
    const w = at(b, 'party', slotAt(0));
    expect(uids(b.validTargets(w.uid, 'melee_attack'))).toEqual([at(b, 'enemy', slotAt(0)).uid]);
    expect(b.targetProblem(w.uid, 'melee_attack', at(b, 'enemy', slotAt(1, 1)).uid)).toBe('Out of range');
    b.debugKill(at(b, 'enemy', slotAt(0)).uid, false);
    expect(uids(b.validTargets(w.uid, 'melee_attack'))).toEqual([at(b, 'enemy', slotAt(1, 1)).uid]);
  });

  it('saldıranın kendi tarafındaki boş sıralar sayılır: geride duran melee menzil dışında kalır, skill kullanılamaz (neden No target in range)', () => {
    const b = mk({ [slotAt(2)]: 'warrior' }, { [slotAt(0)]: 'mage' });
    const w = at(b, 'party', slotAt(2));
    expect(b.distanceTo(w, 'enemy', slotAt(0))).toBe(3);
    expect(b.canUse(w.uid, 'melee_attack')).toEqual({ ok: false, reason: 'No target in range' });
    expect(b.useSkill(w.uid, 'melee_attack', at(b, 'enemy', slotAt(0)).uid).ok).toBe(false);
    // Charge (menzil 4) ulaşır
    expect(b.canUse(w.uid, 'charge').ok).toBe(true);
  });

  it('menzilli sınıf: Archer ve Mage (6) en arkadan en arkaya ulaşmaz, bir adım önden ulaşır (Ömer 2026-10-17: Archer 7 -> 6)', () => {
    const back = slotAt(ROWS - 1);
    const a = mk({ [back]: 'archer' }, { [slotAt(0)]: 'warrior', [back]: 'mage' });
    expect(uids(a.validTargets(at(a, 'party', back).uid, 'quick_shot'))).toEqual([at(a, 'enemy', slotAt(0)).uid]);
    const a2 = mk({ [slotAt(ROWS - 2)]: 'archer' }, { [slotAt(0)]: 'warrior', [back]: 'mage' });
    expect(uids(a2.validTargets(at(a2, 'party', slotAt(ROWS - 2)).uid, 'quick_shot'))).toHaveLength(2);
    const m = mk({ [back]: 'mage' }, { [slotAt(0)]: 'warrior', [back]: 'archer' });
    expect(uids(m.validTargets(at(m, 'party', back).uid, 'fire_bolt'))).toEqual([at(m, 'enemy', slotAt(0)).uid]);
  });

  it('Global skill her yerden her hedefe (Fist Crush en arka sıradan)', () => {
    const b = mk({ [slotAt(ROWS - 1)]: 'defender' }, { [slotAt(ROWS - 1)]: 'mage' });
    const d = at(b, 'party', slotAt(ROWS - 1));
    expect(b.rangeOf(d, content.skills.fist_crush!)).toBe(Infinity);
    expect(b.canUse(d.uid, 'fist_crush').ok).toBe(true);
    expect(b.canUse(d.uid, 'tremor_slam').ok).toBe(false);
  });

  it('taunt yalnızca taunt eden menzildeyse zorlar', () => {
    const taunt = (c: Combatant) => c.statuses.push({ kind: 'taunt', turns: 2, source: c.uid, taken: 0 } as never);
    // taunter arkada (menzil dışı): Warrior öndeki diğer düşmanı seçebilir
    const b = mk({ [slotAt(0)]: 'warrior' }, { [slotAt(0)]: 'mage', [slotAt(2)]: 'defender' });
    taunt(at(b, 'enemy', slotAt(2)));
    expect(uids(b.validTargets(at(b, 'party', slotAt(0)).uid, 'melee_attack'))).toEqual([at(b, 'enemy', slotAt(0)).uid]);
    // taunter menzilde: zorlar
    const c = mk({ [slotAt(0)]: 'warrior' }, { [slotAt(0)]: 'mage', [slotAt(0, 1)]: 'defender' });
    taunt(at(c, 'enemy', slotAt(0, 1)));
    expect(uids(c.validTargets(at(c, 'party', slotAt(0)).uid, 'melee_attack'))).toEqual([at(c, 'enemy', slotAt(0, 1)).uid]);
  });

  it('alan skill\'i: menzil anchor hücreye bakar, alan menzil dışına taşabilir (önizleme = gerçek)', () => {
    // Mage en arkada; Meteor menzili = Mage menzili. Anchor sırası rA: mesafe (ROWS-1) + rA + 1 <= menzil
    const me = slotAt(ROWS - 1);
    const reachRow = R('mage') - (ROWS - 1) - 1; // menzildeki en derin düşman sırası
    expect(reachRow).toBeGreaterThanOrEqual(0);
    expect(reachRow).toBeLessThan(ROWS - 1);
    const foes: Record<number, string> = {};
    for (let i = 0; i < ROWS * LANES; i++) foes[i] = 'warrior';
    const b = mk({ [me]: 'mage' }, foes);
    const mage = at(b, 'party', me);
    const inAnchor = slotAt(reachRow, 1);
    const outAnchor = slotAt(reachRow + 1, 1);
    const pin = b.shapePreviewCells(mage.uid, 'meteor', inAnchor);
    expect(pin.valid).toBe(true);
    expect(pin.targets.some((u) => b.rowOf(b.get(u)!.slot) > reachRow)).toBe(true); // kenar menzil dışına taşar
    expect(b.shapePreviewCells(mage.uid, 'meteor', outAnchor)).toMatchObject({ valid: false, reason: 'Out of range' });
    expect(b.shapeAnchors(mage.uid, 'meteor').every((s) => b.rowOf(s) <= reachRow)).toBe(true);
    expect(previewSkill(b, mage.uid, 'meteor', undefined, outAnchor)).toEqual([]);
    expect(b.useSkill(mage.uid, 'meteor', undefined, outAnchor).ok).toBe(false);
    const r = b.useSkill(mage.uid, 'meteor', undefined, inAnchor);
    expect(r.ok).toBe(true);
  });

  it('Guard yalnızca yakın dostu korur (dost menzili veriden: sıra farkı); diğer dost skill\'leri sınırsız', () => {
    const g = SR('guard');
    const b = mk({ [slotAt(0)]: 'defender', [slotAt(g, 1)]: 'mage', ...(g + 1 < ROWS ? { [slotAt(g + 1, 2)]: 'archer' } : {}) }, { [slotAt(0)]: 'warrior' });
    const d = at(b, 'party', slotAt(0));
    const near = at(b, 'party', slotAt(g, 1));
    expect(uids(b.validTargets(d.uid, 'guard'))).toContain(near.uid);
    if (g + 1 < ROWS) {
      const far = at(b, 'party', slotAt(g + 1, 2));
      expect(b.targetProblem(d.uid, 'guard', far.uid)).toBe('Out of range');
    }
    // Rejuvenate (range'siz dost skill'i): en arkaya da ulaşır
    const r = mk({ [slotAt(0)]: 'druid', [slotAt(ROWS - 1)]: 'mage' }, { [slotAt(0)]: 'warrior' });
    expect(uids(r.validTargets(at(r, 'party', slotAt(0)).uid, 'rejuvenate'))).toHaveLength(2);
  });

  it('Smoke Bomb kendi tarafına atılırken de menzil (sıra farkı) geçerlidir', () => {
    const sr = SR('smoke_bomb');
    const b = mk({ [slotAt(0)]: 'cutthroat', [slotAt(ROWS - 1)]: 'mage' }, { [slotAt(0)]: 'warrior' });
    const c = at(b, 'party', slotAt(0));
    for (let row = 0; row < ROWS; row++) expect(b.inRange(c, content.skills.smoke_bomb!, 'party', slotAt(row)), `row ${row}`).toBe(row <= sr);
  });
});

describe('bayrak kapalı = eski hedefleme', () => {
  it('kapalıyken menzil hiç uygulanmaz: arka sıradaki Mage herkese, ön Warrior yalnızca ön sıraya (eski melee kuralı)', () => {
    const back = slotAt(ROWS - 1);
    const b = mk({ [back]: 'mage', [slotAt(0)]: 'warrior' }, { [slotAt(0)]: 'warrior', [back]: 'archer' }, { off: true });
    expect(b.rangeOn).toBe(false);
    expect(uids(b.validTargets(at(b, 'party', back).uid, 'fire_bolt'))).toHaveLength(2);
    expect(uids(b.validTargets(at(b, 'party', slotAt(0)).uid, 'melee_attack'))).toEqual([at(b, 'enemy', slotAt(0)).uid]);
    expect(b.inRange(at(b, 'party', back), content.skills.fire_bolt!, 'enemy', back)).toBe(true);
  });

  it('aynı seed ile tam YZ savaşı: kapalı kurulum veri bayrağından bağımsız ve belirleyici (iki koşu birebir)', () => {
    const run = () => {
      const base = content.battleSetup('random-battle', 7, 'turns', { party: ['warrior', 'mage', 'archer', 'paladin'], enemies: ['defender', 'druid', 'hexer', 'cutthroat'] }, false);
      const b = new Battle(rangeOff(base));
      for (let i = 0; i < 400 && !b.winner; i++) {
        const uid = b.currentUid!;
        const ch = chooseAction(b, uid, content.aiConfig);
        if (!ch || !b.applyChoice(uid, ch).ok) b.skipTurn();
      }
      return JSON.stringify(b.log);
    };
    expect(run()).toBe(run());
  });
});

describe('YZ: menzil dışında takılmaz, menzile girer (iki mod)', () => {
  for (const mode of ['turns', 'test'] as const)
    it(`${mode}: hiçbir skill'i ulaşmayan arka sıra Warrior Move ile yaklaşır (Rest/Skip ile beklemez)`, () => {
      // Charge (menzil 4) kilitli: hiçbir saldırı ulaşmıyor
      const b = mk({ [slotAt(ROWS - 1)]: 'warrior' }, { [slotAt(0)]: 'mage' }, { mode, units: { party: { [slotAt(ROWS - 1)]: { lockSkills: ['charge'] } } } });
      const w = at(b, 'party', slotAt(ROWS - 1));
      expect(b.canUse(w.uid, 'melee_attack').ok).toBe(false);
      if (mode === 'turns') {
        for (let i = 0; i < 40 && b.currentUid !== w.uid; i++) b.skipTurn(); // sıra Warrior'a gelsin
        expect(b.currentUid).toBe(w.uid);
      }
      const ch = chooseAction(b, w.uid, content.aiConfig);
      expect(ch?.skillId).toBe('move_tile');
      expect(b.rowOf(ch!.slot!)).toBeLessThan(ROWS - 1);
    });

  it('menzil açık tam YZ savaşları biter (takılma yok) ve aynı seed aynı sonuç', () => {
    const run = (seed: number) => {
      const base = content.battleSetup('random-battle', seed, 'turns', undefined, false);
      const b = new Battle(rangeOn(base));
      let n = 0;
      for (; n < 2000 && !b.winner; n++) {
        const uid = b.currentUid!;
        const ch = chooseAction(b, uid, content.aiConfig);
        if (!ch || !b.applyChoice(uid, ch).ok) b.skipTurn();
      }
      return { winner: b.winner, n, log: b.log.length };
    };
    for (const seed of [1, 2, 3, 4, 5]) {
      const r = run(seed);
      expect(r.winner, `seed ${seed}`).toBeTruthy();
      expect(run(seed)).toEqual(r);
    }
  });
});

describe('dizilim: yakın dövüşçü sınıfı menzilden (range.md)', () => {
  it('menzil açıkken taban menzili <= 1 olan sınıf yakın dövüşçü (ön sıraya dizilir); Anti-Mage (menzil 4) uzak sınıf gibi dizilir', () => {
    const r = content.formulas.range!;
    const was = r.enabled;
    try {
      r.enabled = true;
      expect(content.isMeleeClass('warrior')).toBe(true);
      expect(content.isMeleeClass('cutthroat')).toBe(true);
      expect(content.isMeleeClass('antimage')).toBe(false);
      r.enabled = false;
      expect(content.isMeleeClass('antimage')).toBe(true); // eski kural: ilk skill (Mana Steal) melee
    } finally {
      r.enabled = was;
    }
  });
});

describe('arayüz: menzil dışı düşman hücreleri soluk (src/game/target-cells.ts > outOfRangeCells)', () => {
  it('tek hedef: Out of range olan düşmanlar; alan: menzil dışı anchor hücreleri; menzil kapalıyken boş', async () => {
    const { outOfRangeCells } = await import('../src/game/target-cells');
    const b = mk({ [slotAt(0)]: 'warrior' }, { [slotAt(0)]: 'mage', [slotAt(2, 1)]: 'archer' });
    const w = at(b, 'party', slotAt(0));
    expect(outOfRangeCells(b, w.uid, 'melee_attack')).toEqual([{ board: 'enemy', slot: slotAt(2, 1) }]);
    const m = mk({ [slotAt(ROWS - 1)]: 'mage' }, { [slotAt(0)]: 'warrior', [slotAt(ROWS - 1)]: 'archer' });
    const mage = at(m, 'party', slotAt(ROWS - 1));
    expect(outOfRangeCells(m, mage.uid, 'meteor')).toEqual([{ board: 'enemy', slot: slotAt(ROWS - 1) }]);
    const off = mk({ [slotAt(0)]: 'warrior' }, { [slotAt(0)]: 'mage', [slotAt(2, 1)]: 'archer' }, { off: true });
    expect(outOfRangeCells(off, at(off, 'party', slotAt(0)).uid, 'melee_attack')).toEqual([]);
  });
});
