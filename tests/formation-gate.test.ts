// Zorunlu Formation kapısı (tutorial, Ravenwood; Ömer 2026-10-17): katılımdan sonra savaş, Formation açılana kadar başlamaz.
import { describe, expect, it } from 'vitest';
import { autoResolve, formationGate, markFormationOpened, moveTo, newCampaign, nextStep, normalizeState, pickHero, recruit, type CampaignState } from '../src/campaign';

/** Ravenwood'da katılım adımına kadar (Mill Road kazanılmış). */
function atRavenwood(seed = 77): CampaignState {
  let s = pickHero(newCampaign({ mode: 'normal', seed }), 'warrior');
  s = autoResolve(s);
  s = moveTo(s, '2');
  expect(nextStep(s).kind).toBe('recruit');
  return s;
}

function recruited(seed = 77): CampaignState {
  const s = atRavenwood(seed);
  const step = nextStep(s) as { offer: string[] };
  return recruit(s, step.offer[0]!);
}

describe('zorunlu Formation kapısı (Ravenwood)', () => {
  it('katılımdan önce kapı yok; katılımdan sonra savaş Formation açılana kadar kilitli', () => {
    expect(formationGate(atRavenwood())).toBe(false);
    const s = recruited();
    expect(nextStep(s).kind).toBe('battle');
    expect(s.formationDue).toBe('2');
    expect(formationGate(s)).toBe(true);
  });

  it('Formation açılınca kapı kalkar ve savaş normal çalışır', () => {
    const s = markFormationOpened(recruited());
    expect(s.formationDue).toBeUndefined();
    expect(formationGate(s)).toBe(false);
    expect(nextStep(s).kind).toBe('battle');
    // kapı yoksa aynı nesne döner (gereksiz kopya yok)
    expect(markFormationOpened(s)).toBe(s);
  });

  it('Tutorials kapalıysa kapı yok', () => {
    expect(formationGate(recruited(), false)).toBe(false);
  });

  it('savaş bitince ya da düğümden ayrılınca kapı yok', () => {
    let s = recruited();
    s = autoResolve(s); // Ravenwood savaşı
    expect(formationGate(s)).toBe(false);
    const step = nextStep(s);
    if (step.kind === 'move') {
      s = moveTo(s, step.options[0]!);
      expect(s.formationDue).toBeUndefined();
    }
  });

  it('kayıt: alan korunur; bozuk ya da başka düğümün alanı atılır; alanı olmayan eski kayıt takılmaz', () => {
    const s = recruited();
    const round = normalizeState(JSON.parse(JSON.stringify(s)));
    expect(round?.formationDue).toBe('2');
    expect(formationGate(round!)).toBe(true);
    const old = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    delete old.formationDue;
    const loadedOld = normalizeState(old)!;
    expect(loadedOld).not.toBeNull();
    expect(formationGate(loadedOld)).toBe(false);
    const wrong = normalizeState({ ...JSON.parse(JSON.stringify(s)), formationDue: '7' })!;
    expect(wrong.formationDue).toBeUndefined();
    const broken = normalizeState({ ...JSON.parse(JSON.stringify(s)), formationDue: 42 })!;
    expect(broken.formationDue).toBeUndefined();
  });
});
