// Electrocuted ilk skill kuralı (Ömer 2026-11-21, form r39: "Rastgele bir dostuna yine ilk skilliyle vursun. Eğer alan vuracaksa yine skillin
// koşullarıyla alan vursun"): birim İLK skill'iyle kendi takımına vurur. Tek hedef: rastgele dost; alan (Tremor Slam): skill'in şekli rastgele
// dostun hücresinde; tüm düşmanlar (Toll): kendi takımının tümü, kendisi hariç. Motor (flushElectro) ve YZ (electroWorth) aynı planı okur
// (Battle.electroPlan). Sayılar veriden.
import { describe, expect, it } from 'vitest';
import { Battle, content } from '../src/engine';
import type { BattleEvent, BattleMode, Combatant, Side } from '../src/engine';
import { aiCoverageInternals as AC } from '../src/engine/ai';
import { DEFAULT_VALUE, ValueContext } from '../src/engine/ai-value';

const T = content.formulas.thunder;
const MODES: BattleMode[] = ['turns', 'test'];
const cells = (at: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => at[i] ?? '');
function make(party: Record<number, string>, enemies: Record<number, string>, mode: BattleMode = 'test', seed = 7): Battle {
  const b = new Battle(content.battleSetup('random-battle', seed, mode, { party: cells(party), enemies: cells(enemies) }, false));
  b.debug.dodge = 'never';
  b.debug.crit = 'never';
  for (const c of b.combatants) c.hp = c.maxHp = 5000; // kimse ölmesin: vurulanlar hasar olayıyla görünür
  return b;
}
const at = (b: Battle, side: Side, slot: number): Combatant => b.combatants.find((c) => c.side === side && c.board === side && c.slot === slot)!;
/** Birimi ıslatıp şimşekle çarpar; o andan sonra birimin verdiği hasar olaylarının hedefleri (tekil, sıralı). */
function electrocute(b: Battle, u: Combatant): string[] {
  b.debugAddStatus(u.uid, T.wetStatus, 3);
  const from = b.log.length;
  b.debugBolt(u.uid);
  expect(u.statuses.some((s) => s.kind === T.wetInto)).toBe(true);
  const hits = b.log.slice(from).filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.source === u.uid);
  return [...new Set(hits.map((e) => e.target))].sort();
}
const vc = () => ({ ...DEFAULT_VALUE, ...(content.aiConfig.value ?? {}) });
const worth = (b: Battle, u: Combatant) => AC.electroWorth(new ValueContext(b, u, vc(), () => 'lowest_ratio'), u);

describe('Electrocuted: ilk skill kendi takımına', () => {
  it('veri: oyuncu metni "basic attack" demez, ilk skill der', () => {
    const text = content.statuses[T.wetInto!]!.text ?? '';
    expect(text).not.toMatch(/basic attack/i);
    expect(text).toMatch(/first skill/i);
  });

  it.each(MODES)('tek hedef (Warrior): rastgele tek dosta vurur, düşmana ve kendine değil (%s)', (mode) => {
    const b = make({ 0: 'warrior', 1: 'mage', 3: 'druid' }, { 0: 'archer' }, mode);
    const w = at(b, 'party', 0);
    const plan = b.electroPlan(w)!;
    expect(plan.skill.id).toBe(w.skills[0]);
    const got = electrocute(b, w);
    expect(got).toHaveLength(1);
    expect(plan.picks.map((c) => c.uid)).toContain(got[0]);
  });

  it.each(MODES)('alan (Defender Tremor Slam): şekil rastgele dostun hücresinde, kendi tahtasında; kendisi ve düşman vurulmaz (%s)', (mode) => {
    for (const seed of [3, 7, 11, 19]) {
      const b = make({ 0: 'defender', 1: 'warrior', 2: 'mage', 4: 'druid', 6: 'archer' }, { 0: 'archer', 1: 'warrior' }, mode, seed);
      const d = at(b, 'party', 0);
      const plan = b.electroPlan(d)!;
      expect(plan.skill.id).toBe('tremor_slam');
      expect(plan.skill.target).toBe('area_enemies');
      const got = electrocute(b, d);
      expect(got.length).toBeGreaterThan(0);
      expect(got).not.toContain(d.uid);
      for (const uid of got) expect(b.get(uid)!.side).toBe('party');
      // vurulanlar, seçilebilecek dostlardan birinin alan penceresiyle birebir aynı (planla aynı liste)
      const options = plan.picks.map((p) => plan.hits(p).map((c) => c.uid).sort());
      expect(options).toContainEqual(got);
      // arayüz alanı doğru tahtada çizsin: skillUsed olayı kendi tahtasını taşır
      const used = b.log.filter((e): e is Extract<BattleEvent, { type: 'skillUsed' }> => e.type === 'skillUsed' && e.actor === d.uid).at(-1)!;
      expect(used.board).toBe('party');
    }
  });

  it.each(MODES)('tüm düşmanlar (Vesper Toll): kendi takımının tümü, kendisi hariç (%s)', (mode) => {
    const b = make({ 0: 'warrior', 1: 'mage', 4: 'druid', 6: 'vesper' }, { 0: 'archer' }, mode);
    const v = at(b, 'party', 6);
    const plan = b.electroPlan(v)!;
    expect(plan.skill.id).toBe('toll');
    const got = electrocute(b, v);
    const want = b.combatants.filter((c) => c.side === 'party' && c.hp > 0 && c.uid !== v.uid).map((c) => c.uid).sort();
    expect(got).toEqual(want);
  });

  it('determinizm: aynı seed = aynı vurulanlar', () => {
    const run = () => {
      const b = make({ 0: 'defender', 1: 'warrior', 2: 'mage', 4: 'druid' }, { 0: 'archer' }, 'turns', 5);
      return electrocute(b, at(b, 'party', 0)).join(',');
    };
    expect(run()).toBe(run());
  });

  it('dostu olmayan birimde ve ilk skill\'i hasarsız birimde plan yok (bir şey olmaz)', () => {
    const solo = make({ 0: 'defender' }, { 0: 'archer' });
    expect(solo.electroPlan(at(solo, 'party', 0))).toBeNull();
    expect(electrocute(solo, at(solo, 'party', 0))).toEqual([]);
    const rod = make({ 0: 'rod_tester', 1: 'warrior' }, { 0: 'archer' });
    expect(rod.electroPlan(at(rod, 'party', 0))).toBeNull();
  });

  it('buzda / yer altındaki dost seçilmez (motor ve YZ aynı liste, denetim 7.2)', () => {
    const b = make({ 0: 'warrior', 1: 'mage', 2: 'druid' }, { 0: 'archer' });
    const w = at(b, 'party', 0);
    at(b, 'party', 1).encased = true as never;
    at(b, 'party', 2).underground = true as never;
    expect(b.electroPlan(w)).toBeNull();
  });
});

describe('Electrocuted YZ değeri', () => {
  it('Defender ve Vesper için artık sıfır değil; motorun gerçek hasarına yakın (aynı hedefler)', () => {
    for (const [cls, slot] of [['defender', 0], ['vesper', 6]] as const) {
      const b = make({ 0: 'warrior', 1: 'mage', 4: 'druid', [slot]: cls }, { 0: 'archer' });
      const u = at(b, 'party', slot);
      const v = worth(b, u);
      expect(v, cls).toBeGreaterThan(0);
      // Vesper: tek seçim (tümü) olduğundan gerçek kayıp tahmine yakın olmalı (zar sapması payı)
      if (cls === 'vesper') {
        const before = new Map(b.combatants.map((c) => [c.uid, c.hp]));
        electrocute(b, u);
        const lost = b.combatants.reduce((s, c) => s + ((before.get(c.uid) ?? 0) - c.hp), 0);
        expect(lost).toBeGreaterThan(v * 0.5);
        expect(lost).toBeLessThan(v * 1.5);
      }
    }
  });

  it('dostsuz birimde değer 0', () => {
    const b = make({ 0: 'vesper' }, { 0: 'archer' });
    expect(worth(b, at(b, 'party', 0))).toBe(0);
  });
});
