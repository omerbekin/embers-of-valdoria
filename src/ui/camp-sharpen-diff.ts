/**
 * Kamp > Sharpen ekraninin saf yardimcilari (Omer 2026-11-02, taslak public/mockups/sharpen.html A "once kahraman"): item satirlarinin
 * onceki / sonraki listesinden degisen satirlar, ilk degisiklik ve kisa engel nedeni. DOM / oyun durumu yok; satirlar cagirandan gelir
 * (camp-screen.ts oyunun gercek Temper onizlemesinden uretir), burada sabit sayi yok.
 */

/** Bir satirin onceki / sonraki hali. `after` null = sonraki yok (engelli item); `changed` yalniz ikisi de varsa ve metin farkliysa. */
export interface DiffLine {
  before: string;
  after: string | null;
  changed: boolean;
}

/** Satir parcasi: sayilar degistiyse `from` (eski) ve `text` (yeni) dolu; ayni sayi ve duz yazi `from` olmadan. */
export interface DiffPart {
  text: string;
  from?: string;
}

const NUM = /\d+(?:\.\d+)?/g;

/** Satir listelerini sirayla esler (Temper satir sayisini ve sirasini degistirmez); fazla / eksik satir `after`siz ya da yeni satir olarak kalir. */
export function diffLines(before: readonly string[], after: readonly string[] | null): DiffLine[] {
  return before.map((b, i) => {
    const a = after ? (after[i] ?? null) : null;
    return { before: b, after: a, changed: a !== null && a !== b };
  });
}

/** Ilk degisen satir (plaka ozeti); yoksa null ("No stat change"). */
export const firstChange = (lines: readonly DiffLine[]): DiffLine | null => lines.find((l) => l.changed) ?? null;

/** Hicbir satir degismiyor mu (yalniz item seviyesi / sart yukselir). Sonraki yoksa false. */
export const noStatChange = (lines: readonly DiffLine[]): boolean => lines.length > 0 && lines.every((l) => l.after !== null) && !lines.some((l) => l.changed);

/**
 * Satiri parcalara boler: yazi sablonu (sayilar '#') ayniysa degisen sayilar `from` ile isaretlenir ("4.5% more" -> from "4.5", text "5");
 * sablon farkliysa (yazi degismis) tum satir tek parca olarak yeni haliyle doner, `from` eski satirdir.
 */
export function diffParts(before: string, after: string | null): DiffPart[] {
  if (after === null || before === after) return [{ text: before }];
  const nb = before.match(NUM) ?? [];
  const na = after.match(NUM) ?? [];
  if (nb.length !== na.length || before.replace(NUM, '#') !== after.replace(NUM, '#')) return [{ text: after, from: before }];
  const parts: DiffPart[] = [];
  let last = 0;
  let k = 0;
  for (const m of after.matchAll(NUM)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ text: after.slice(last, idx) });
    const old = nb[k++]!;
    parts.push(old === m[0] ? { text: m[0] } : { text: m[0], from: old });
    last = idx + m[0].length;
  }
  if (last < after.length) parts.push({ text: after.slice(last) });
  return parts;
}

/**
 * Oyunun kendi engel metnini plaka icin kisaltir (yeni kural uydurmaz): "Its wearer needs Level 4" -> "Needs Lv 4",
 * "Already at this region's best (item level 10)" -> "At region cap"; taninmayan metin aynen doner.
 */
export function shortReason(why: string): string {
  const lv = /needs Level (\d+)/i.exec(why);
  if (lv) return `Needs Lv ${lv[1]}`;
  if (/^Already at this region/i.test(why)) return 'At region cap';
  return why;
}
