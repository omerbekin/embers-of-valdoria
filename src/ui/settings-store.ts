// eov.settings.v1 kaydina kucuk, guvenli okuma / yazma (diger alanlari - ses, imlec - korur). Bozuk kayit = bos nesne.
const KEY = 'eov.settings.v1';

export function readSettingsObject(raw?: string | null): Record<string, unknown> {
  try {
    const src = raw ?? (typeof window !== 'undefined' ? window.localStorage?.getItem(KEY) : null) ?? '';
    const v: unknown = JSON.parse(src);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Verilen alanlari mevcut kayitla birlestirip yazar (saklama kapaliysa sessizce gecer). */
export function patchSettings(patch: Record<string, unknown>): void {
  try {
    window.localStorage?.setItem(KEY, JSON.stringify({ ...readSettingsObject(), ...patch }));
  } catch {
    /* gizli pencere vb. */
  }
}
