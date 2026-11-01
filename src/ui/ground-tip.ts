// Zemin ipucu (Ömer 2026-11-01: "yerdeki alanlara hoverlandığı zaman yerin efekt adı ve efekti yazsın"): savaşta bir hücrenin üstündeki zeminlerin
// adı + etkisi, ortak A Band bağlam ipucunda (BattleHud.showContextTip). YALNIZ gösterim: kural değiştirmez. Metin data/grounds.json > text;
// sahne bağlantısı BattleScene.bindGroundTip. Saf (DOM / Phaser yok).
import type { GroundDef, GroundEffect } from '../engine/types';
import type { TipContent } from './battle-hud';

type Side = GroundEffect['board'];
/** grounds.json girişi + gösterim metni (alan types.ts'e eklenmedi: yalnız bu ipucu okur). */
export type GroundDefText = GroundDef & { text?: string };

const MUTED = '#b8ad94';

/** Zeminin etkisini anlatan kısa İngilizce metin (yoksa boş). */
export function groundText(def: GroundDef | undefined): string {
  return (def as GroundDefText | undefined)?.text?.trim() ?? '';
}

/** Hücredeki zeminler: aynı türden birden çok örnek tek satır (en uzun süreli); ilk görülme sırası korunur. */
export function groundsOnCell(list: readonly GroundEffect[], board: Side, slot: number): GroundEffect[] {
  const out = new Map<string, GroundEffect>();
  for (const g of list) {
    if (g.board !== board || !g.slots.includes(slot)) continue;
    const cur = out.get(g.ground);
    if (!cur || (!cur.permanent && (g.permanent || g.turns > cur.turns))) out.set(g.ground, g);
  }
  return [...out.values()];
}

/** Değişiklik denetimi: aynı anahtar = aynı ipucu (kalan tur değişince yenilenir). */
export function groundTipKeyOf(list: readonly GroundEffect[]): string {
  return list.map((g) => `${g.ground}:${g.permanent ? 'p' : g.turns}`).join('|');
}

function turnsRow(g: GroundEffect): string {
  if (g.permanent) return 'Lasts until its caster falls';
  if (g.envUntilRound !== undefined) return '';
  return `Lasts ${g.turns} more turn${g.turns === 1 ? '' : 's'}`;
}

/**
 * Bir hücrenin zemin ipucu: tek zeminde başlık = zeminin adı; birden çoksa ilki başlık, diğerleri bölüm başlığıyla alt alta.
 * `iconUrl`: zemin tanımından ikon adresi (sahne verir; yoksa ikonsuz). Zemin yoksa null.
 */
export function buildGroundTip(list: readonly GroundEffect[], defs: Record<string, GroundDef>, iconUrl?: (def: GroundDef) => string | undefined): TipContent | null {
  if (!list.length) return null;
  const rows: TipContent['rows'] = [];
  list.forEach((g, i) => {
    const def = defs[g.ground];
    const name = def?.name ?? g.ground;
    if (i > 0) rows.push({ text: name, section: true });
    const text = groundText(def);
    if (text) rows.push({ text });
    const t = turnsRow(g);
    if (t) rows.push({ text: t, color: MUTED });
  });
  const first = defs[list[0]!.ground];
  const icon = first && iconUrl ? iconUrl(first) : undefined;
  return {
    title: first?.name ?? list[0]!.ground,
    ...(first?.color ? { titleColor: first.color, accent: first.color } : {}),
    ...(icon ? { iconUrl: icon } : {}),
    kind: list.length > 1 ? `Ground · ${list.length} effects` : 'Ground',
    rows,
  };
}
