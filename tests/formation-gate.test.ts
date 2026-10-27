// Katılım zamanı + Zorunlu Formation kapısı (tutorial; Ömer 2026-10-17, 2026-10-27): ikinci kahraman Mill Road zaferinden sonra katılır;
// sıradaki savaşa (Ravenwood) dokunmak Formation açılana kadar savaş yerine spot ışıklı Formation dersini açar.
import { describe, expect, it } from 'vitest';
import {
  autoResolve,
  carriedRecruit,
  debugRequireFormation,
  debugTeleport,
  formationGate,
  formationTapGated,
  markFormationOpened,
  moveTo,
  newCampaign,
  nextStep,
  normalizeState,
  pickHero,
  recruit,
  type CampaignState,
} from '../src/campaign';
import { lessonById } from '../src/tutorial/lessons';

const clone = (s: CampaignState): CampaignState => JSON.parse(JSON.stringify(s)) as CampaignState;

/** Mill Road kazanılmış, katılım bekliyor. */
function wonMillRoad(seed = 77): CampaignState {
  let s = pickHero(newCampaign({ mode: 'normal', seed }), 'warrior');
  s = autoResolve(s); // Mill Road savaşı
  return s;
}

function recruited(seed = 77): CampaignState {
  const s = wonMillRoad(seed);
  const step = nextStep(s) as { kind: string; offer: string[] };
  expect(step.kind).toBe('recruit');
  return recruit(s, step.offer[0]!);
}

/** Eski kayıt (katılım Ravenwood'da, savaştan önceydi): Mill Road kazanılmış, takım Ravenwood'da, ikinci kahraman yok. */
function oldAtRavenwoodNoRecruit(): CampaignState {
  const s = clone(wonMillRoad());
  s.at = '2';
  s.path = [...s.path, '2'];
  s.visited = [...(s.visited ?? []), '2'];
  s.cleared = [...new Set([...(s.cleared ?? []), '1'])];
  return s;
}

describe('katılım zamanı (Mill Road zaferinden sonra)', () => {
  it('Mill Road kazanılınca haritaya dönüşte katılım; yola çıkmadan önce, bir kez', () => {
    const s = wonMillRoad();
    expect(nextStep(s)).toMatchObject({ kind: 'recruit', node: '1' });
    expect(() => moveTo(s, '2')).toThrow();
    const t = recruited();
    expect(t.roster).toHaveLength(2);
    expect(t.done).toContain('1:recruit');
    expect(nextStep(t)).toEqual({ kind: 'move', options: ['2'] });
    const at2 = moveTo(t, '2');
    expect(nextStep(at2).kind).toBe('battle'); // Ravenwood'da katılım yok
    expect(at2.roster).toHaveLength(2);
  });

  it('eski kayıt: Mill Road geçilmiş, ikinci kahraman yok -> Ravenwood\'da katılım gelir, sonra savaş kapısı', () => {
    const old = normalizeState(oldAtRavenwoodNoRecruit())!;
    expect(old).not.toBeNull();
    expect(carriedRecruit(old)).toBe('1');
    const step = nextStep(old) as { kind: string; node: string; offer: string[] };
    expect(step).toMatchObject({ kind: 'recruit', node: '1' });
    expect(step.offer).toEqual(['druid', 'undead', 'gambler']);
    const t = recruit(old, step.offer[0]!);
    expect(t.roster).toHaveLength(2);
    expect(t.at).toBe('2');
    expect(t.done).toContain('1:recruit');
    expect(carriedRecruit(t)).toBeNull();
    expect(nextStep(t).kind).toBe('battle');
    expect(t.formationDue).toBe('2');
    expect(formationTapGated(t, '2')).toBe(true);
  });

  it('eski kayıt: katılım Ravenwood\'da yapılmış (2:recruit) -> ikinci kez sorulmaz, kahraman çiftlenmez', () => {
    const t = moveTo(recruited(), '2');
    const old = clone(t);
    old.done = old.done.map((d) => (d === '1:recruit' ? '2:recruit' : d));
    const loaded = normalizeState(old)!;
    expect(loaded.done).toContain('1:recruit');
    expect(loaded.done).not.toContain('2:recruit');
    expect(nextStep(loaded).kind).toBe('battle');
    expect(loaded.roster).toHaveLength(2);
    // ilerlemiş eski kayıt (Watchtower)
    const far = clone(debugTeleport(pickHero(newCampaign({ mode: 'normal', seed: 5 }), 'archer'), '3'));
    far.done = far.done.map((d) => (d === '1:recruit' ? '2:recruit' : d));
    const farLoaded = normalizeState(far)!;
    expect(nextStep(farLoaded).kind).not.toBe('recruit');
    expect(farLoaded.roster).toHaveLength(far.roster.length);
    // idempotent
    expect(normalizeState(clone(farLoaded))!.done).toEqual(farLoaded.done);
  });
});

describe('zorunlu Formation kapısı', () => {
  it('katılımdan önce kapı yok; katılımdan sonra Ravenwood\'a dokunmak kapıya takılır', () => {
    expect(formationGate(wonMillRoad())).toBe(false);
    const s = recruited();
    expect(s.formationDue).toBe('2');
    expect(formationGate(s)).toBe(true);
    expect(formationTapGated(s, '2')).toBe(true);
    expect(formationTapGated(s, '1')).toBe(false); // başka düğüm kapıya takılmaz (sahne kilidi ayrı)
  });

  it('Formation açılınca kapı kalkar ve Ravenwood normal başlar', () => {
    const s = markFormationOpened(recruited());
    expect(s.formationDue).toBeUndefined();
    expect(formationGate(s)).toBe(false);
    expect(formationTapGated(s, '2')).toBe(false);
    expect(markFormationOpened(s)).toBe(s); // kapı yoksa aynı nesne
    const at2 = moveTo(s, '2');
    expect(nextStep(at2).kind).toBe('battle');
  });

  it('Tutorials kapalıysa ("Don\'t show again" dahil) kapı yok', () => {
    expect(formationGate(recruited(), false)).toBe(false);
    expect(formationTapGated(recruited(), '2', false)).toBe(false);
  });

  it('yola çıkınca alan silinir', () => {
    expect(moveTo(recruited(), '2').formationDue).toBeUndefined();
  });

  it('kayıt: geçerli alan korunur; bozuk ya da geçersiz alan atılır; alanı olmayan eski kayıt takılmaz', () => {
    const s = recruited();
    const round = normalizeState(clone(s))!;
    expect(round.formationDue).toBe('2');
    expect(formationGate(round)).toBe(true);
    const old = clone(s) as unknown as Record<string, unknown>;
    delete old.formationDue;
    expect(formationGate(normalizeState(old)!)).toBe(false);
    expect(normalizeState({ ...clone(s), formationDue: '7' })!.formationDue).toBeUndefined();
    expect(normalizeState({ ...clone(s), formationDue: 42 })!.formationDue).toBeUndefined();
  });

  it('debug: kapı burada ya da ileri yoldaki savaşta kurulur', () => {
    const s = markFormationOpened(recruited());
    expect(debugRequireFormation(s).formationDue).toBe('2');
    const at2 = moveTo(s, '2');
    expect(debugRequireFormation(at2).formationDue).toBe('2');
  });

  it('ders verisi: spot ışığı, Formation düğmesine odak, düğme yerine bekleme yazısı, kapı tetiği', () => {
    const l = lessonById('formation_new_hero')!;
    expect(l).toBeDefined();
    expect(l.spotlight).toBe(true);
    expect(l.focus).toBe('.camp-formation');
    expect(l.awaitText).toBeTruthy();
    expect(l.trigger).toEqual({ gate: 'formation' });
    expect(l.text).toMatch(/front row/);
    expect(l.text).toMatch(/back row/);
  });
});
