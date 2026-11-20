import { describe, expect, it } from 'vitest';
import { statusPercent, statusPercentText, statusTipText, strengthOf, type StatusPctSource } from '../src/game/status-pct';
import { Battle, content } from '../src/engine';
import type { BattleEvent, Combatant, Status } from '../src/engine';
import { scaleDelta, scaleMult } from '../src/engine/status-stack';

const defs: Record<string, Record<string, unknown>> = {
  slow: { speedMult: 0.7 },
  blinded: { accuracyDelta: -0.3 },
  exposed: { damageTakenMult: 1.15 },
  haste: { speedMult: 1.3 },
  stun: { cc: true },
  burning: { dot: {} },
};
const src = (k: number): StatusPctSource => ({
  statusDef: (kind: string) => defs[kind] as never,
  debuffStrength: (_c, s) => (defs[s.kind as string]?.['cc'] ? 1 : k),
});
const u = { side: 'enemy' as const } as never;
const inst = (kind: string, potency?: Record<string, number>) => ({ kind, source: 'x', potency }) as never;

describe('status percent text', () => {
  it('full strength shows the plain value', () => {
    expect(statusPercentText(src(1), u, inst('blinded'))).toBe('-30%');
    expect(statusPercentText(src(1), u, inst('slow'))).toBe('-30%');
    expect(statusPercentText(src(1), u, inst('exposed'))).toBe('+15%');
    expect(statusPercentText(src(1), u, inst('haste'))).toBe('+30%');
  });
  it('boss / elite scale comes from the engine strength', () => {
    expect(statusPercentText(src(0.25), u, inst('blinded'))).toBe('-7.5%');
    expect(statusPercentText(src(0.5), u, inst('slow'))).toBe('-15%');
  });
  it('tree potency is added like the engine does', () => {
    expect(statusPercent(src(1), u, inst('blinded', { accuracyDelta: -0.1 }))).toBe(-40);
  });
  it('no percent for stun, dot, unknown', () => {
    expect(statusPercentText(src(1), u, inst('stun'))).toBeNull();
    expect(statusPercentText(src(1), u, inst('burning'))).toBeNull();
    expect(statusPercentText(src(1), u, inst('nope'))).toBeNull();
  });
});

// Örnek gücü (Status.strength, Ömer 2026-11-16) ve ipucu metni: gerçek veri + gerçek motor (sayılar data/statuses.json'dan)
const S = content.statuses;
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
type Priv = { addStatus(c: Combatant, s: Status, emit: (e: BattleEvent) => void): void; debugEmit: (e: BattleEvent) => void };
function mk(): Battle {
  return new Battle(content.battleSetup('random-battle', 1, 'test', { party: cells({ 0: 'warrior' }), enemies: cells({ 0: 'warrior' }) }, false));
}
const put = (b: Battle, c: Combatant, s: Status) => (b as unknown as Priv).addStatus(c, s, (b as unknown as Priv).debugEmit);
const pct1 = (x: number) => Math.round(x * 1000) / 10;

describe('status percent: instance strength (engine order)', () => {
  it('strengthOf = instance strength + tier scale separately', () => {
    const b = mk();
    const e = b.combatants.find((c) => c.side === 'enemy')!;
    expect(strengthOf(b, e, { kind: 'shrouded', source: e.uid, strength: 0.5 }).inst).toBe(0.5);
    expect(strengthOf(b, e, { kind: 'shrouded', source: e.uid }).inst).toBe(1);
  });

  it('half Shrouded, 1/3 Blinded, 1.4 Wound, 1-stack Sunder show the real value', () => {
    const b = mk();
    const e = b.combatants.find((c) => c.side === 'enemy')!;
    const p = b.combatants.find((c) => c.side === 'party')!;
    expect(statusPercent(b, p, { kind: 'shrouded', source: p.uid, strength: 0.5 })).toBe(pct1(scaleDelta(S.shrouded!.evasionDelta!, 0.5)));
    expect(statusPercent(b, e, { kind: 'blinded', source: p.uid, strength: 0.333 })).toBe(pct1(scaleDelta(S.blinded!.accuracyDelta!, 0.333)));
    expect(statusPercent(b, e, { kind: 'wound', source: p.uid, strength: 1.4 })).toBe(pct1(scaleMult(S.wound!.healTakenMult!, 1.4) - 1));
    const lim = S.sunder!.stackLimit!;
    expect(statusPercent(b, e, { kind: 'sunder', source: p.uid, strength: 1 / lim })).toBe(pct1(scaleMult(S.sunder!.armorMult!, 1 / lim) - 1));
  });

  it('matches the engine effective stat (evasion, armor) on a live unit', () => {
    const b = mk();
    const p = b.combatants.find((c) => c.side === 'party')!;
    const e = b.combatants.find((c) => c.side === 'enemy')!;
    const eva0 = b.effectiveStats(p).evasion;
    put(b, p, { kind: 'shrouded', turns: 2, source: p.uid, strength: 0.5 });
    expect(pct1(b.effectiveStats(p).evasion - eva0)).toBeCloseTo(statusPercent(b, p, p.statuses.find((s) => s.kind === 'shrouded')!)!, 5);
    const arm0 = b.effectiveStats(e).armor;
    put(b, e, { kind: 'sunder', turns: 2, source: p.uid, strength: 1 / S.sunder!.stackLimit!, stacks: 1 });
    const st = e.statuses.find((s) => s.kind === 'sunder')!;
    expect(arm0 > 0).toBe(true);
    expect(Math.round((b.effectiveStats(e).armor / arm0 - 1) * 1000) / 10).toBeCloseTo(statusPercent(b, e, st)!, 1);
  });

  it('tooltip swaps the full-strength number for the real one', () => {
    const b = mk();
    const e = b.combatants.find((c) => c.side === 'enemy')!;
    const p = b.combatants.find((c) => c.side === 'party')!;
    const fullShr = Math.round(S.shrouded!.evasionDelta! * 100);
    const halfShr = Math.abs(pct1(scaleDelta(S.shrouded!.evasionDelta!, 0.5)));
    const txt = S.shrouded!.text!;
    expect(txt).toContain(`${fullShr}%`);
    expect(statusTipText(b, p, { kind: 'shrouded', source: p.uid, strength: 0.5 }, txt)).toBe(txt.replace(`${fullShr}%`, `${halfShr}%`));
    const fullW = Math.round((1 - S.wound!.healTakenMult!) * 100);
    const realW = Math.abs(pct1(scaleMult(S.wound!.healTakenMult!, 1.4) - 1));
    expect(statusTipText(b, e, { kind: 'wound', source: p.uid, strength: 1.4 }, S.wound!.text!)).toBe(S.wound!.text!.replace(`${fullW}%`, `${realW}%`));
    // tam güçte metin aynen
    expect(statusTipText(b, e, { kind: 'wound', source: p.uid }, S.wound!.text!)).toBe(S.wound!.text!);
    // sayısız durum aynen
    expect(statusTipText(b, e, { kind: 'stun', source: p.uid }, 'Skips its turn')).toBe('Skips its turn');
  });
});
