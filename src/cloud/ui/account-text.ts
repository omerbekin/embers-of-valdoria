/**
 * Hesap / bulut kaydı ekranlarının saf metin yardımcıları (Faz 1d arayüzü; taslak public/mockups/account.html v1 "Rows").
 * DOM / Phaser / ağ YOK: tests/cloud-ui-text.test.ts. Oyun içi metin İngilizce.
 */
import type { AccountState, CloudStatus, SideSummary } from '../cloud';
import type { IronmanPin } from '../sync-core';

export const NAME_MIN = 2;
export const NAME_MAX = 24;
/** Görünen ad kutusunun yazma sınırı (fazlası "Too long" uyarısıyla görünür, gönderilmez). */
export const NAME_INPUT_MAX = 30;
/** Hesap silme onayında yazılması gereken kelime (sunucu da {confirm:"DELETE"} ister). */
export const DELETE_WORD = 'DELETE';

export type NameCheck = { ok: true; name: string; length: number } | { ok: false; length: number; message: string };

/** Görünen ad denetimi (2-24 karakter, baş/son boşluk sayılmaz, iç boşluklar teke iner). Boş kutu uyarı göstermez (message ''). */
export function validateDisplayName(raw: string): NameCheck {
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  const length = [...name].length;
  if (length === 0) return { ok: false, length, message: '' };
  if (length < NAME_MIN) return { ok: false, length, message: 'Too short' };
  if (length > NAME_MAX) return { ok: false, length, message: 'Too long' };
  // Sunucu kuralıyla aynı (cloudflare/src/auth-logic.ts > normalizeDisplayName): harf, rakam, boşluk, _ . ' -
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(name)) return { ok: false, length, message: "Letters, numbers, spaces and _ . ' - only" };
  return { ok: true, name, length };
}

/** setDisplayName başarısızlık nedeninin oyuncu metni. */
export function nameErrorText(reason: string): string {
  if (reason === 'offline') return 'You are offline. Try again when connected.';
  if (reason === 'signed-out') return 'You were signed out. Sign in again from Settings.';
  if (reason === 'bad-name' || reason === 'invalid-name') return 'That name cannot be used. Try another.';
  return 'Could not save the name. Try again.';
}

/** Silme onay kutusu: yalnızca tam olarak DELETE (büyük harf) kabul edilir. */
export const deleteConfirmOk = (typed: string): boolean => typed.trim() === DELETE_WORD;

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "just now" / "3 min ago" / "2 h ago" / "yesterday" / "5 days ago" / "12 Oct 2026". Geçersiz zaman -> ''. */
export function relativeTime(iso: string | number | null | undefined, now: number): string {
  if (iso === null || iso === undefined || iso === '') return '';
  const t = typeof iso === 'number' ? iso : Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const d = Math.max(0, now - t);
  if (d < MIN) return 'just now';
  if (d < HOUR) return `${Math.floor(d / MIN)} min ago`;
  if (d < DAY) return `${Math.floor(d / HOUR)} h ago`;
  if (d < 2 * DAY) return 'yesterday';
  if (d < 30 * DAY) return `${Math.floor(d / DAY)} days ago`;
  const date = new Date(t);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Hesap sayfasındaki senkron durum satırı. */
export function cloudStatusLine(status: CloudStatus, lastSyncAt: string | null, now: number, online = true): string {
  if (!online && status !== 'newer-version') return 'Offline, will sync when connected';
  switch (status) {
    case 'syncing':
      return 'Syncing...';
    case 'offline':
      return 'Offline, will sync when connected';
    case 'error':
      return 'Sync failed, will try again';
    case 'needs-choice':
      return 'Waiting for your choice';
    case 'newer-version':
      return 'A newer version saved this progress. Reload to update.';
    case 'idle':
      return lastSyncAt ? `Last synced ${relativeTime(lastSyncAt, now)}` : 'Not synced yet';
  }
}

/** Sync now kullanılabilir mi (çevrimdışı, sürerken, yeni sürüm engelinde değil). */
export const canSyncNow = (status: CloudStatus, online: boolean): boolean => online && status !== 'syncing' && status !== 'newer-version';

/** Oyun içi Settings > Account salt okunur satırı (OAuth sayfayı yönlendirdiği için giriş yalnızca ana menüde). */
export function accountLine(account: Pick<AccountState, 'signedIn' | 'displayName' | 'local'>, status: CloudStatus, now: number, online = true): string {
  if (!account.signedIn) return 'Sign in from the main menu';
  const who = account.displayName ? `Signed in as ${account.displayName}` : 'Signed in';
  if (!online || status === 'offline') return `${who}, offline`;
  if (status === 'syncing') return `${who}, syncing...`;
  const last = account.local?.lastSyncAt;
  return last ? `${who}, last synced ${relativeTime(last, now)}` : `${who}, not synced yet`;
}

export const PROVIDERS = ['google', 'discord'] as const;
export type ProviderKey = (typeof PROVIDERS)[number];
export const providerName = (p: ProviderKey): string => (p === 'google' ? 'Google' : 'Discord');

/** Girişte hata (?auth=error&reason=...) oyuncu metni. */
export function signInErrorText(reason: string | undefined): string {
  if (reason === 'denied') return 'Sign-in was cancelled.';
  if (reason === 'identity-taken') return 'That account is already linked to another player.';
  if (reason === 'state') return 'Sign-in took too long or was opened in another tab. Try again.';
  return 'We could not finish signing in. Check your connection and try again.';
}

// ---------------------------------------------------------------- çakışma diyaloğu

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export interface SlotView {
  title: string;
  ironman: boolean;
  empty: boolean;
  /** "Stop 14, Ashen Marches" (kayıt yoksa "Not saved yet"). */
  line: string;
  /** "Warrior, Druid · 3 days ago". */
  sub: string;
  /** Ironman kuralı bu tarafı seçtirmez. */
  locked: boolean;
}

/** Bir tarafın yuva satırları; `lockedSlots` bu tarafta seçilemeyen yuvalar. Satır sayısı iki tarafın en uzunu (`count`). */
export function slotViews(side: SideSummary, count: number, lockedSlots: ReadonlySet<number>, now: number): SlotView[] {
  const out: SlotView[] = [];
  for (let i = 0; i < count; i++) {
    const s = side.slots[i] ?? null;
    const title = `Slot ${i + 1}`;
    if (!s) {
      out.push({ title, ironman: false, empty: true, line: 'Empty', sub: '', locked: lockedSlots.has(i) });
      continue;
    }
    const l = s.latest;
    const line = l ? `Stop ${l.summary.stop}, ${l.summary.region || l.summary.node}` : 'Not saved yet';
    const classes = l ? l.summary.classes.map(cap).join(', ') : '';
    const when = relativeTime(s.lastPlayed, now);
    out.push({ title, ironman: s.mode === 'ironman', empty: false, line, sub: [classes, when].filter(Boolean).join(' · '), locked: lockedSlots.has(i) });
  }
  return out;
}

/** Endless satırı: süren koşu + en iyi dalga. */
export function endlessLine(side: SideSummary): string {
  const run = side.endless ? `Wave ${side.endless.wave} in progress` : 'No run in progress';
  const best = side.scores.bestWave !== null ? `Best wave ${side.scores.bestWave}` : 'No finished runs';
  return `${run} · ${best}`;
}

/** Tarafın kayıt zamanı: bulutta yükleme zamanı, yerelde en son oynanan yuva. */
export function savedLine(side: SideSummary, now: number): string {
  const t = side.savedAt ?? side.slots.reduce<string | null>((m, s) => (s && (!m || s.lastPlayed > m) ? s.lastPlayed : m), null);
  const rel = relativeTime(t, now);
  return rel ? `Saved ${rel}` : '';
}

/** Ironman sabitlemesinin tek satırlık nedeni. */
export function pinReasonText(reason: IronmanPin['reason']): string {
  if (reason === 'alive') return 'Ironman: a fallen run cannot replace a living one.';
  if (reason === 'not-deleted') return 'Ironman: this run was never deleted, so it stays.';
  return 'Ironman keeps the further run; the other side cannot overwrite it.';
}

/** Taraf başına seçilemeyen yuvalar (sabitlemede kazanmayan taraf). */
export function lockedSlotsFor(pins: readonly IronmanPin[], side: 'local' | 'cloud'): Set<number> {
  return new Set(pins.filter((p) => p.keep !== side).map((p) => p.slot));
}

/** Onay adımı metni: seçilen taraf + diğer tarafın yedekleneceği. */
export function conflictConfirmText(choice: 'local' | 'cloud'): string {
  return choice === 'local'
    ? 'You chose this device. The cloud progress will be backed up on this device before it is replaced.'
    : 'You chose cloud progress. This device progress will be backed up before it is replaced.';
}
