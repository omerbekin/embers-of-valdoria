import { describe, expect, it } from 'vitest';
import {
  accountLine,
  canSyncNow,
  cloudStatusLine,
  conflictConfirmText,
  deleteConfirmOk,
  endlessLine,
  lockedSlotsFor,
  nameErrorText,
  pinReasonText,
  relativeTime,
  savedLine,
  signInErrorText,
  slotViews,
  validateDisplayName,
} from '../src/cloud/ui/account-text';
import type { SideSummary } from '../src/cloud/cloud';
import type { SlotSummary } from '../src/campaign/save';
import suggestions from '../data/display-name-suggestions.json';

// Hesap / bulut kaydı ekranlarının saf metinleri (src/cloud/ui/account-text.ts; taslak public/mockups/account.html v1).
const NOW = Date.parse('2026-10-24T12:00:00Z');
const MIN = 60_000;
const iso = (msAgo: number): string => new Date(NOW - msAgo).toISOString();

describe('görünen ad denetimi (2-24 karakter, sunucu kuralıyla aynı)', () => {
  it('uzunluk sınırları ve boşluk temizliği', () => {
    expect(validateDisplayName('')).toEqual({ ok: false, length: 0, message: '' });
    expect(validateDisplayName('   ')).toMatchObject({ ok: false, message: '' });
    expect(validateDisplayName('A')).toMatchObject({ ok: false, message: 'Too short' });
    expect(validateDisplayName('Ab')).toEqual({ ok: true, name: 'Ab', length: 2 });
    expect(validateDisplayName('  Ashen    Wanderer ')).toEqual({ ok: true, name: 'Ashen Wanderer', length: 14 });
    expect(validateDisplayName('x'.repeat(24))).toMatchObject({ ok: true, length: 24 });
    expect(validateDisplayName('x'.repeat(25))).toMatchObject({ ok: false, message: 'Too long' });
  });

  it('harf (Türkçe dahil), rakam, boşluk ve _ . \' - kabul; diğerleri değil', () => {
    expect(validateDisplayName('Ömer Çağrı_2')).toMatchObject({ ok: true });
    expect(validateDisplayName("O'Neil-Jr.")).toMatchObject({ ok: true });
    expect(validateDisplayName('bad<name>')).toMatchObject({ ok: false });
    expect(validateDisplayName('emoji 🔥')).toMatchObject({ ok: false });
  });

  it('sunucu hatası metinleri', () => {
    expect(nameErrorText('offline')).toMatch(/offline/i);
    expect(nameErrorText('bad-name')).toMatch(/cannot be used/);
    expect(nameErrorText('http-500')).toMatch(/Try again/);
  });

  it('öneri listesi: her birleşim 24 karakteri aşmaz', () => {
    for (const a of suggestions.first) for (const b of suggestions.second) expect(validateDisplayName(`${a} ${b}`).ok, `${a} ${b}`).toBe(true);
  });
});

describe('zaman ve durum satırları', () => {
  it('göreli zaman', () => {
    expect(relativeTime(null, NOW)).toBe('');
    expect(relativeTime('nope', NOW)).toBe('');
    expect(relativeTime(iso(20_000), NOW)).toBe('just now');
    expect(relativeTime(iso(3 * MIN), NOW)).toBe('3 min ago');
    expect(relativeTime(iso(150 * MIN), NOW)).toBe('2 h ago');
    expect(relativeTime(iso(30 * 60 * MIN), NOW)).toBe('yesterday');
    expect(relativeTime(iso(5 * 1440 * MIN), NOW)).toBe('5 days ago');
    expect(relativeTime('2026-08-01T10:00:00Z', NOW)).toBe('1 Aug 2026');
    expect(relativeTime(NOW + 5000, NOW)).toBe('just now'); // saat kayması: gelecekteki zaman
  });

  it('senkron durum satırı ve Sync now', () => {
    expect(cloudStatusLine('idle', iso(3 * MIN), NOW)).toBe('Last synced 3 min ago');
    expect(cloudStatusLine('idle', null, NOW)).toBe('Not synced yet');
    expect(cloudStatusLine('syncing', null, NOW)).toBe('Syncing...');
    expect(cloudStatusLine('offline', null, NOW)).toBe('Offline, will sync when connected');
    expect(cloudStatusLine('idle', iso(MIN), NOW, false)).toBe('Offline, will sync when connected');
    expect(cloudStatusLine('error', null, NOW)).toMatch(/failed/);
    expect(cloudStatusLine('needs-choice', null, NOW)).toMatch(/choice/);
    expect(cloudStatusLine('newer-version', null, NOW, false)).toMatch(/newer version/);
    expect(canSyncNow('idle', true)).toBe(true);
    expect(canSyncNow('idle', false)).toBe(false);
    expect(canSyncNow('syncing', true)).toBe(false);
    expect(canSyncNow('newer-version', true)).toBe(false);
    expect(canSyncNow('error', true)).toBe(true);
  });

  it('oyun içi salt okunur Account satırı', () => {
    const local = { userId: 'u', rev: 1, hash: null, dirty: false, lastSyncAt: iso(3 * MIN) };
    expect(accountLine({ signedIn: false, displayName: null, local: null }, 'idle', NOW)).toBe('Sign in from the main menu');
    expect(accountLine({ signedIn: true, displayName: 'Ashen Wanderer', local }, 'idle', NOW)).toBe('Signed in as Ashen Wanderer, last synced 3 min ago');
    expect(accountLine({ signedIn: true, displayName: null, local: { ...local, lastSyncAt: null } }, 'idle', NOW)).toBe('Signed in, not synced yet');
    expect(accountLine({ signedIn: true, displayName: 'A B', local }, 'offline', NOW)).toBe('Signed in as A B, offline');
    expect(accountLine({ signedIn: true, displayName: 'A B', local }, 'syncing', NOW)).toBe('Signed in as A B, syncing...');
  });

  it('silme onayı yalnızca DELETE; giriş hatası metinleri', () => {
    expect(deleteConfirmOk('DELETE')).toBe(true);
    expect(deleteConfirmOk(' DELETE ')).toBe(true);
    expect(deleteConfirmOk('delete')).toBe(false);
    expect(deleteConfirmOk('DELET')).toBe(false);
    expect(signInErrorText('denied')).toMatch(/cancelled/);
    expect(signInErrorText('identity-taken')).toMatch(/already linked/);
    expect(signInErrorText(undefined)).toMatch(/try again/i);
  });
});

describe('çakışma diyaloğu', () => {
  const slot = (n: number, mode: 'normal' | 'ironman', stop: number, playedAgo: number): SlotSummary =>
    ({ slot: n, campaignId: `c${n}`, mode, difficulty: 'normal', lastPlayed: iso(playedAgo), saveCount: 1, latest: { summary: { stop, region: 'Greywood', node: 'Mill', classes: ['rogue', 'mage'] } } }) as unknown as SlotSummary;
  const side = (slots: Array<SlotSummary | null>, extra: Partial<SideSummary> = {}): SideSummary => ({ slots, endless: null, scores: { count: 0, bestWave: null }, savedAt: null, app: null, ...extra });

  it('yuva satırları: boş, Ironman etiketi, seçilemeyen taraf', () => {
    const pins = [{ slot: 1, keep: 'cloud' as const, reason: 'more-advanced' as const }];
    const local = side([slot(0, 'normal', 14, 5 * MIN), slot(1, 'ironman', 9, 2 * MIN)]);
    const v = slotViews(local, 3, lockedSlotsFor(pins, 'local'), NOW);
    expect(v.map((x) => x.title)).toEqual(['Slot 1', 'Slot 2', 'Slot 3']);
    expect(v[0]).toMatchObject({ ironman: false, locked: false, line: 'Stop 14, Greywood', sub: 'Rogue, Mage · 5 min ago' });
    expect(v[1]).toMatchObject({ ironman: true, locked: true });
    expect(v[2]).toMatchObject({ empty: true, line: 'Empty', locked: false });
    expect([...lockedSlotsFor(pins, 'cloud')]).toEqual([]);
  });

  it('Endless, kayıt zamanı, Ironman nedeni ve onay metni', () => {
    expect(endlessLine(side([], { endless: { wave: 41, classes: [] }, scores: { count: 3, bestWave: 52 } }))).toBe('Wave 41 in progress · Best wave 52');
    expect(endlessLine(side([]))).toBe('No run in progress · No finished runs');
    expect(savedLine(side([], { savedAt: iso(3 * MIN) }), NOW)).toBe('Saved 3 min ago');
    expect(savedLine(side([slot(0, 'normal', 1, 10 * MIN), slot(1, 'normal', 1, 2 * MIN)]), NOW)).toBe('Saved 2 min ago');
    expect(savedLine(side([null]), NOW)).toBe('');
    for (const r of ['more-advanced', 'alive', 'not-deleted'] as const) expect(pinReasonText(r).length).toBeLessThan(80);
    expect(conflictConfirmText('cloud')).toMatch(/This device progress will be backed up/);
    expect(conflictConfirmText('local')).toMatch(/cloud progress will be backed up/);
  });
});
