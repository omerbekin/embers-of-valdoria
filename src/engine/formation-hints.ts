/**
 * DİZİLİM İPUÇLARI (Ömer 2026-10-18: "uygun olmayan hücreye konan birime ipucu göster; asla zorlama, engelleme, yalnızca öner").
 * Saf: Phaser/DOM yok. Kural formation-ai.ts ve range.md ile aynı: birimin ana menzili R, kendi GERÇEK sırası r (ön 0 ... arka 3; boş ön sıralar dahil);
 * düşmanın ön sırasına ulaşmak için R - 1 - r >= 0 olmalı. Menzil sistemi kapalıyken çağıran ipucu istemez (content.placementHints boş döner).
 *
 * İki ipucu:
 * - outOfReach: birim buradan düşmanın ön sırasına bile ulaşamaz (Warrior 2. sırada, Archer en arkada değil ama R'den geride). maxRow = ulaştığı en geri sıra.
 * - exposed: uzun menzilli (R >= exposedFrom) birim takımın en öndeki dolu sırasında, takımda da öne geçebilecek yakın dövüşçü (R <= meleeUpTo) var:
 *   geride durup yine ulaşabilir (Archer önde). fromRow = hâlâ ulaştığı en geri sıra.
 */

/** Eşikler (data/ai.json > formationHints). */
export interface HintRules {
  /** Bu menzilden itibaren "önde açıkta" ipucu verilir (Archer / Mage 6; Druid, Gambler, Undead, Hexer 5). Paladin / Anti-Mage (4) önde durabilir. */
  exposedFrom: number;
  /** Bu menzile kadar olan birim öne geçebilecek yakın dövüşçü sayılır (melee 1, mızrak 2). */
  meleeUpTo: number;
}

export type PlacementHint = { kind: 'outOfReach'; range: number; row: number; maxRow: number } | { kind: 'exposed'; range: number; row: number; fromRow: number };

/** Her birimin ipucu (girdiyle aynı sırada; uygun yerdeyse undefined). `ranges[i]` = birimin ana menzili (Infinity = menzilsiz), `slots[i]` = hücresi. */
export function placementHints(ranges: number[], slots: number[], lanes: number, rows: number, rules: HintRules): (PlacementHint | undefined)[] {
  const rowOf = (s: number) => Math.floor(s / lanes);
  const placed = slots.map((s) => s >= 0);
  let front = Infinity;
  slots.forEach((s, i) => placed[i] && (front = Math.min(front, rowOf(s))));
  return ranges.map((range, i) => {
    if (!placed[i]) return undefined;
    const row = rowOf(slots[i]!);
    if (range === Infinity) return undefined;
    if (range - 1 - row < 0) return { kind: 'outOfReach', range, row, maxRow: Math.max(0, range - 1) };
    if (range >= rules.exposedFrom && row === front && ranges.some((r, j) => j !== i && placed[j] && r <= rules.meleeUpTo)) {
      return { kind: 'exposed', range, row, fromRow: Math.min(rows - 1, range - 1) };
    }
    return undefined;
  });
}

const ROW_NAME = ['front row', '2nd row', '3rd row', 'back row'];
const rowName = (r: number) => ROW_NAME[r] ?? `row ${r + 1}`;

/** Oyuncuya gösterilen öneri metni (İngilizce; oyun içi metin). */
export function placementHintText(name: string, hint: PlacementHint): string {
  if (hint.kind === 'outOfReach') {
    const where = hint.maxRow === 0 ? 'the front row' : `the ${rowName(hint.maxRow)} or closer`;
    return `${name} (Range ${hint.range}) can't reach the enemy from the ${rowName(hint.row)}. Try ${where}.`;
  }
  return `${name} (Range ${hint.range}) can still reach the enemy from the ${rowName(hint.fromRow)}. It is safer behind your melee.`;
}

/** Kısa başlık (rozet / tooltip başlığı). */
export const placementHintTitle = (hint: PlacementHint): string => (hint.kind === 'outOfReach' ? 'Out of reach' : 'Exposed in front');
