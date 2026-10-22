/**
 * DİZİLİM TAHTASI kuralları (saf; DOM / Phaser / motor yok, testli: tests/formation-board.test.ts).
 * Dokunma ve sürükleme kararları (Ömer 2026-10-18, Formation A): kahramana dokun = yalnızca seçim değişir (takas YOK); seçiliyken BOŞ hücreye dokun =
 * kahraman oraya taşınır; takas yalnızca bir kahramanı başka kahramanın üstüne SÜRÜKLEYEREK olur. Menzil metni ve hücre uygunluğu da burada.
 * Dizilim ipucunun KURALI motorda kalır (src/engine/formation-hints.ts); burası yalnızca onun sonucunu renge / metne çevirir.
 */

/** Izgara: 4 sıra x 3 şerit; hücre = sıra * 3 + şerit (sıra 0 = ön, düşmana bakar). */
export const LANES = 3;
export const ROWS = 4;
export const ROW_NAMES = ['Front row', '2nd row', '3rd row', 'Back row'] as const;
export const rowOfCell = (cell: number): number => Math.floor(cell / LANES);
export const rowName = (row: number): string => ROW_NAMES[row] ?? `Row ${row + 1}`;

/** Hücrenin o kahraman için uygunluğu: iyi / zayıf (önde açıkta) / menzil dışı. */
export type Fit = 'good' | 'weak' | 'bad';

/** Motorun ipucu türünden (formation-hints.ts) uygunluğa: ipucu yok = iyi, exposed = zayıf, outOfReach = menzil dışı. */
export function fitOfHint(hint: { kind: 'outOfReach' | 'exposed' } | undefined | null): Fit {
  return !hint ? 'good' : hint.kind === 'outOfReach' ? 'bad' : 'weak';
}

/** Verilen menzilden `row` sırasından düşmanın kaç sırasına ulaşılır (0-4; menzilsiz / global = 4). */
export function reachRows(range: number | null, row: number): number {
  if (range === null || !Number.isFinite(range)) return ROWS;
  return Math.max(0, Math.min(ROWS, Math.floor(range) - row));
}

/** "From here: ..." cümlesi (İngilizce; oyun içi metin). */
export function reachText(n: number): string {
  if (n <= 0) return "Can't reach the enemy from here";
  if (n >= 4) return 'From here: hits every row';
  if (n === 3) return 'From here: hits almost every row';
  if (n === 2) return 'From here: hits the first two rows';
  return 'From here: hits the front row only';
}

/** Uygunluk + isabet edilen sıra sayısı -> vurgu rengi (hover kutusu kenarı; Formation ve savaştaki çağrı hücre seçimi ortak). */
export function fitAccent(n: number, fit: Fit): string {
  return n <= 0 || fit === 'bad' ? '#e8806a' : fit === 'weak' ? '#e0a43a' : '#8fc65a';
}

/** "Enemy rows hit" 4 parçalı çubuğun HTML'i (hover kutusu gövdesi; stil formation-board.css > .fb-reach). Dolu kutu rengi isabet sayısına göre yeşilden sarıya. */
export function reachBarHtml(n: number): string {
  const segs = [1, 2, 3, 4].map((i) => `<i class="${i <= n ? 'on' : ''}">${i}</i>`).join('');
  const t = Math.max(0, Math.min(1, (n - 1) / 3));
  const mix = (a: number, b: number): number => Math.round(a + (b - a) * t);
  const reachCol = `rgb(${mix(0x7c, 0xf2)}, ${mix(0xc6, 0xd0)}, ${mix(0x5a, 0x3e)})`;
  return `<div class="fb-reach"><span class="rl">Enemy rows hit</span><span class="rb" style="--ac:${reachCol}">${segs}</span></div>`;
}

/** Seçim durumu: `sel` seçili kahraman, `moved` son taşınan (bilgi paneli ikisinden birini gösterir). */
export interface BoardSel {
  sel: string;
  moved: string;
}

export interface BoardMove {
  id: string;
  cell: number;
}

/**
 * Hücreye TIKLAMA / DOKUNMA. Dolu hücre: o kahraman seçilir (aynısına yeniden dokunmak seçimi kaldırır), asla taşıma / takas olmaz.
 * Boş hücre: seçili kahraman varsa oraya taşınır (seçim kalkar); yoksa hiçbir şey.
 */
export function tapCell(cells: readonly string[], st: BoardSel, cell: number): { st: BoardSel; move?: BoardMove } {
  if (cell < 0 || cell >= cells.length) return { st };
  const occupant = cells[cell] ?? '';
  if (occupant) return { st: { ...st, sel: occupant === st.sel ? '' : occupant } };
  if (st.sel && cells.includes(st.sel)) return { st: { sel: '', moved: st.sel }, move: { id: st.sel, cell } };
  return { st };
}

/**
 * Sürüklenen kahramanın hücreye BIRAKILMASI: başka hücreye bırakılırsa taşınır (boşsa) ya da yer değiştirir (doluysa; takas motorda: moveHero).
 * Geçersiz yere / kendi hücresine bırakmak hareket yaratmaz. Bırakınca seçim kalkar.
 */
export function dropOnCell(cells: readonly string[], id: string, cell: number): { st: BoardSel; move?: BoardMove } {
  const from = cells.indexOf(id);
  if (from < 0 || cell < 0 || cell >= cells.length || cell === from) return { st: { sel: '', moved: '' } };
  return { st: { sel: '', moved: id }, move: { id, cell } };
}

/** Kahraman `id` hücre `cell`'e konursa (boşsa taşınır, doluysa yer değiştirir) yeni hücre listesi (uygunluk önizlemesi için; girdiyi değiştirmez). */
export function previewMove(cells: readonly string[], id: string, cell: number): string[] {
  const out = cells.slice();
  const from = out.indexOf(id);
  if (from < 0) return out;
  out[from] = out[cell] ?? '';
  out[cell] = id;
  return out;
}

/**
 * Tarayıcı noktasını (clientX, clientY) ögenin YEREL mantıksal koordinatına çevirir. `r` = ögenin getBoundingClientRect'i, `offsetW` = layout genişliği
 * (ölçek = ekrandaki / layout), `rotated` = dikey dokunmatikte sahne CSS ile 90° döner (src/ui/viewport.ts > rotatedToStage ile aynı eşleme).
 */
export function clientToLocal(cx: number, cy: number, r: { left: number; top: number; right: number; bottom: number }, offsetW: number, rotated: boolean): { x: number; y: number } {
  const w = rotated ? r.bottom - r.top : r.right - r.left;
  const s = w / Math.max(1, offsetW) || 1;
  return rotated ? { x: (cy - r.top) / s, y: (r.right - cx) / s } : { x: (cx - r.left) / s, y: (cy - r.top) / s };
}

/** Ögenin tarayıcı dikdörtgenini (`r`) kökün (`root`) YEREL mantıksal koordinatına çevirir (konum + boyut); döndürülmüş sahnede de doğru. */
export function rectToLocal(
  r: { left: number; top: number; right: number; bottom: number },
  root: { left: number; top: number; right: number; bottom: number },
  offsetW: number,
  rotated: boolean,
): { x: number; y: number; w: number; h: number } {
  const w = rotated ? root.bottom - root.top : root.right - root.left;
  const s = w / Math.max(1, offsetW) || 1;
  if (rotated) return { x: (r.top - root.top) / s, y: (root.right - r.right) / s, w: (r.bottom - r.top) / s, h: (r.right - r.left) / s };
  return { x: (r.left - root.left) / s, y: (r.top - root.top) / s, w: (r.right - r.left) / s, h: (r.bottom - r.top) / s };
}
