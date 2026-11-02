/**
 * Oyun imleci (Ömer 2026-11-02, taslak public/mockups/cursor-6.html): varsayılan #1 Longsword; seçenekler #2 Boar Spear, #3 Kama Dagger,
 * #4 Hunting Arrow ve 'System' (işletim sisteminin kendi imleci). Her imleç üç durumda çizilir: normal (CSS `default`), tıklanabilir
 * (`pointer`, kor parıltısı + kıvılcım), kapalı (`not-allowed`, gri + küçük yasak rozeti). Uç noktası (5,3), tabandan uca hat 110,4 derece
 * (bütün nesneler uçları yukarı çizilip ~20,4 derece döndürülür). Çizim VERİDEN kurulur (OBJ tablosu); CSS data-URI olarak enjekte edilir.
 *
 * Her yerde geçerli (Phaser tuvali dahil): oyun `setDefaultCursor('default'|'pointer')` ile tuvalin satır içi stilini ve DOM düğmeleri
 * CSS `cursor`unu kendi ayarlar; biz `html[data-eov-cur=...]` + `!important` kuralıyla üstüne yazarız. Hangi durumun geçerli olduğunu
 * imlecin altındaki öğenin ÖZGÜN `cursor` değerinden okuruz (pointer -> tıklanabilir, not-allowed / disabled -> kapalı, default / auto ->
 * normal; metin / sürükleme / yeniden boyutlandırma imleçleri işletim sisteminde kalır). Dokunmatik cihazda imleç yoktur: hiçbir şey enjekte edilmez.
 *
 * Kayıt: `eov.settings.v1` içine `cursor` (kimlik) ve `cursorSize` (% olarak) alanları, mevcut alanlar (volume...) korunarak birleştirilir.
 * Saf kısımlar (ayrıştırma, sınırlar, SVG, CSS) DOM'suzdur ve testlidir (tests/cursor-theme.test.ts).
 */

export type CursorId = 'longsword' | 'boar-spear' | 'kama-dagger' | 'hunting-arrow' | 'thorn-staff' | 'ember-shard' | 'wax-candle' | 'bat-wing' | 'system';
/** Durumlar (press = fare düğmesi basılıyken görünen resim). Yeni durum eklemek: buraya + CURSOR_STATES + STATE_PAINT + FALLBACK satırı. */
export type CursorState = 'def' | 'hov' | 'press' | 'dis';
export const CURSOR_STATES: readonly CursorState[] = ['def', 'hov', 'press', 'dis'];

export const SETTINGS_KEY = 'eov.settings.v1';
export const DEFAULT_CURSOR: CursorId = 'longsword';
/**
 * Boyut adımları (% olarak, 100 = 32 birimlik çizim 1 piksel/birim). Üst sınır 200 (en çok ~88 px görüntü): tarayıcı sınırı 128 px; Chrome
 * 32 pikseli aşan imleçleri pencere kenarına / tarayıcı arayüzüne değerken bırakıp sistem imlecine döner, bu yüzden daha büyüğü sunulmaz.
 * Alt sınır 75 (en çok ~33 px): daha küçüğünde uçtaki kor parıltısı ve yasak rozeti okunmaz.
 */
export const CURSOR_SIZES: readonly number[] = [75, 100, 125, 150, 175, 200];
export const DEFAULT_CURSOR_SIZE = 100;

export interface CursorChoice {
  id: CursorId;
  name: string;
}
export const CURSOR_CHOICES: readonly CursorChoice[] = [
  { id: 'longsword', name: 'Longsword' },
  { id: 'boar-spear', name: 'Boar Spear' },
  { id: 'kama-dagger', name: 'Kama Dagger' },
  { id: 'hunting-arrow', name: 'Hunting Arrow' },
  { id: 'thorn-staff', name: 'Thorn Staff' },
  { id: 'ember-shard', name: 'Ember Shard' },
  { id: 'wax-candle', name: 'Wax Candle' },
  { id: 'bat-wing', name: 'Bat Wing' },
  { id: 'system', name: 'System' },
];

export interface CursorPrefs {
  id: CursorId;
  /** Yüzde (CURSOR_SIZES adımlarından biri). */
  size: number;
  /** Basılı resim (press) açık mı; varsayılan açık. */
  press: boolean;
}
export const DEFAULT_PRESS = true;

export const isCursorId = (v: unknown): v is CursorId => CURSOR_CHOICES.some((c) => c.id === v);
export const clampCursorId = (v: unknown): CursorId => (isCursorId(v) ? v : DEFAULT_CURSOR);
/** En yakın adıma (sayı değilse varsayılan). */
export function clampCursorSize(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return DEFAULT_CURSOR_SIZE;
  let best = CURSOR_SIZES[0]!;
  for (const s of CURSOR_SIZES) if (Math.abs(s - n) < Math.abs(best - n)) best = s;
  return best;
}
/** d adım kaydır (sınırda durur). */
export function stepCursorSize(size: number, d: number): number {
  const i = CURSOR_SIZES.indexOf(clampCursorSize(size));
  return CURSOR_SIZES[Math.min(CURSOR_SIZES.length - 1, Math.max(0, i + d))]!;
}

function parseObject(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Kayıttan imleç tercihi; alan yoksa / bozuksa varsayılanlar (eski kayıtlar göçsüz çalışır). */
export function readCursorPrefs(raw: string | null | undefined): CursorPrefs {
  const o = parseObject(raw);
  return {
    id: clampCursorId(o.cursor),
    size: clampCursorSize(o.cursorSize === undefined ? DEFAULT_CURSOR_SIZE : o.cursorSize),
    press: o.cursorPress === undefined ? DEFAULT_PRESS : !(o.cursorPress === false || o.cursorPress === 0 || o.cursorPress === '0'),
  };
}

/** Kayıt metni: mevcut alanlar (volume, steps, curve...) korunur, imleç alanları yazılır. */
export function mergeCursorPrefs(raw: string | null | undefined, prefs: CursorPrefs): string {
  return JSON.stringify({ ...parseObject(raw), cursor: clampCursorId(prefs.id), cursorSize: clampCursorSize(prefs.size), cursorPress: prefs.press !== false });
}

/** Başka bir alanı (ör. ses) yazarken imleç alanlarını silmemek için: yeni kaydı mevcut kayıtla birleştirir. */
export function mergeRecord(raw: string | null | undefined, patchJson: string): string {
  return JSON.stringify({ ...parseObject(raw), ...parseObject(patchJson) });
}

// ---------------------------------------------------------------- Çizim (cursor-6.html'den birebir)

const HALO = '#f6ecd0';
const DARK = '#15100a';
const EMBER = '#e0702a';
const EMBER2 = '#ffb35a';
const GOLD = '#e9c872';
const STEEL = '#c9ccd4';
const STEELD = '#8a8f99';
const WOOD = '#a9703a';
const WOODD = '#6b4524';
const BONE = '#efe6cf';
const CRIM = '#b8402f';
const IRON = '#3f3b36';

/** Bugünkü işaretçinin yerine geçen çizim ('System' seçeneği önizlemesi). */
const ARROW = 'M5 3 L5 24 L10.4 19.2 L14 27.2 L17.6 25.6 L14.2 17.8 L21.2 17.6 Z';
const HAND =
  'M12 3 C10.5 3 10 4 10 5 L10 15 L8.5 13.8 C7.5 13 6 13.5 6 14.8 L6 17 C6 21 8 26 10 28 L21 28 C23 26 25 22 25 18 L25 14 C25 12.8 23.5 12.2 22.8 13 L22 14 L22 12.5 C22 11.3 20.5 10.8 19.8 11.6 L19 12.5 L19 11.5 C19 10.3 17.6 9.8 16.8 10.6 L16 11.5 L14 11.5 L14 5 C14 4 13.2 3 12 3 Z';

/** Uç noktası ve tabanın en alçak noktası (32 birimlik çizim uzayı). */
export const TIP: readonly [number, number] = [5, 3];
export const TAIL: readonly [number, number] = [14, 27.2];
const RAD = Math.atan2(TAIL[1] - TIP[1], TAIL[0] - TIP[0]);
/** Tabandan uca hattın açısı (sağdan saat yönü tersi, y yukarı): 110,4 derece. */
export const LINE_ANGLE: number = 180 - (RAD * 180) / Math.PI;
const TILT = -(90 - (RAD * 180) / Math.PI);
const TR = `rotate(${TILT.toFixed(2)} ${TIP[0]} ${TIP[1]}) translate(${TIP[0]} ${TIP[1]})`;

/** Çizim uzayı 32 birim; uçtaki parıltı ve rozet kesilmesin diye her yanda PAD birim boşluk eklenir (görüntü 44 birim). */
export const PAD = 6;
export const VIEW = 32 + PAD * 2;

const circ = (cx: number, cy: number, r: number, f: string, o?: number): string => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${o ? ` opacity="${o}"` : ''}/>`;
const dia = (cx: number, cy: number, r: number, f: string, ol = DARK): string =>
  `<path d="M${cx} ${cy - r} L${cx + r * 0.72} ${cy} L${cx} ${cy + r} L${cx - r * 0.72} ${cy} Z" fill="${f}" stroke="${ol}" stroke-width=".7" stroke-linejoin="round"/>`;
const disc = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
/** İki tonlu hareket çizgisi (koyu ve açık zeminde okunur). */
const sl = (d: string, col = '#ffd27a'): string => ln(d, DARK, 2.6) + ln(d, col, 1.3);
const star4 = (cx: number, cy: number, R: number, r: number, f: string, st = DARK): string =>
  `<path d="M${cx} ${cy - R} L${cx + r} ${cy - r} L${cx + R} ${cy} L${cx + r} ${cy + r} L${cx} ${cy + R} L${cx - r} ${cy + r} L${cx - R} ${cy} L${cx - r} ${cy - r} Z" fill="${f}" stroke="${st}" stroke-width=".6" stroke-linejoin="round"/>`;
const ln = (d: string, col: string, w: number, o?: number): string =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o ? ` opacity="${o}"` : ''}/>`;

interface Part {
  d: string;
  f: string;
  /** Tıklanabilir durumda parlayan dolgu. */
  hf?: string;
  /** evenodd. */
  eo?: boolean;
  /** Çizgi kalınlığı (varsayılan 1,3). */
  sw?: number;
}
interface Obj {
  parts: Part[];
  /** Parçaların üstüne çizilen ince çizgiler. */
  extra: string;
}

/** Halolar önce, dolgular sonra (komşu parçayı hiçbir halo örtmez). */
function build(parts: Part[], hot: boolean): string {
  let a = '';
  let b = '';
  for (const p of parts) {
    const sw = p.sw ?? 1.3;
    const fr = p.eo ? ' fill-rule="evenodd"' : '';
    a += `<path d="${p.d}" fill="${p.f}"${fr} stroke="${HALO}" stroke-width="${sw + 2.4}" stroke-linejoin="round"/>`;
    b += `<path d="${p.d}" fill="${hot && p.hf ? p.hf : p.f}"${fr} stroke="${DARK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  }
  return a + b;
}

/** Nesneler uçları yukarı, uç x=0, y=0; taban y~26. */
/** Mum gövdesi (alev yolu değişir: basılıyken alev şişer). */
function candleParts(flame: string): Part[] {
  return [
    { d: 'M-3.4 12 H3.4 V24 H-3.4 Z', f: BONE },
    { d: 'M3.4 14 C5.6 14 5.8 19 4.4 19.4 C3.6 19.6 3.4 18 3.4 18 Z', f: BONE },
    { d: 'M-7 24 H7 L6 27.6 H-6 Z', f: '#a8782a' },
    { d: 'M-.7 10 H.7 V12.6 H-.7 Z', f: '#2b2622' },
    { d: flame, f: EMBER, hf: '#ffd27a' },
  ];
}

const OBJ: Record<Exclude<CursorId, 'system'>, Obj> = {
  'thorn-staff': {
    // Taslak cursor-8 #s6 (cursor-7'den düzeltilmiş): koyu meşe uç ve gövde, kalın çizgi; açık zeminde soluk görünmez, uç ince (keskin)
    parts: [
      { d: 'M0 0 L1.5 5 L-1.5 5 Z', f: '#9c6a34', hf: '#e0a850', sw: 1.6 },
      { d: 'M-1.3 4.6 H1.3 V25 H-1.3 Z', f: '#80502a', sw: 1.6 },
      { d: 'M1.2 9 C3 5.8 6.4 5.8 7 6.4 C6.4 9.8 3.8 11 1.2 9 Z', f: '#4f8a3a', sw: 1.5 },
      { d: 'M-1.2 14 C-3 10.8 -6.4 10.8 -7 11.4 C-6.4 14.8 -3.8 16 -1.2 14 Z', f: '#4f8a3a', sw: 1.5 },
      { d: 'M1.3 18 L4.6 16.6 L1.3 20.8 Z', f: '#c89a5c', sw: 1.5 },
      { d: disc(0, 25.6, 3), f: '#6b4524', sw: 1.6 },
    ],
    extra: ln('M-.4 7 V22', '#c89a5c', 0.8, 0.9) + ln('M-1.2 6 C1.4 8 -1.4 10 1.2 12', '#1f4a1c', 0.9),
  },
  'wax-candle': { parts: candleParts('M0 0 C1.3 2.4 4.2 4.8 3.8 8.6 C3.4 10.8 -3.4 10.8 -3.8 8.6 C-4.2 5.8 -1 3.2 0 0 Z'), extra: ln('M-1.4 14 V22', '#fffbee', 0.9, 0.8) + '<path d="M0 3.4 C1.2 5.2 1.8 6.8 1.5 8.6 L-1.5 8.6 C-1.9 6.8 -1.1 5.2 0 3.4 Z" fill="#fff0b0"/>' },
  // Bat Wing (cursor-8 #9): gerçek 32 px'te ayrıntı kaybolduğu için kemik kaburgalar kalın / açık, zar kenarı koyu ve belirgin (pençe ucu keskin)
  'bat-wing': {
    parts: [
      { d: 'M0 3 C5 6 9.4 11 9.8 17.4 C7.6 16 6.4 18 6.6 20.2 C5.4 17.8 4 19.2 3.8 21.8 C2.8 20 1.6 21.6 1.4 24 L0 27.4 L-1.2 21 L-1.4 8 Z', f: '#5a4780', hf: '#8a76b3', sw: 1.6 },
      { d: 'M0 0 C1.8 1.6 2.6 3.4 2.4 5.6 L-1.6 5.2 C-1.6 3 -.8 1.4 0 0 Z', f: BONE },
    ],
    extra: ln('M0 5 L9.4 16.8', '#f3ead2', 1.3) + ln('M0 5 L6.6 18.4', '#f3ead2', 1.3) + ln('M0 5 L3.8 19.8', '#f3ead2', 1.3) + ln('M0 5 L1 22', '#f3ead2', 1.3),
  },
  'ember-shard': {
    parts: [
      { d: 'M0 0 L3.6 7 L3 13 L0 17.4 L-3 13 L-3.6 7 Z', f: EMBER, hf: '#ffd27a' },
      { d: 'M-3.4 16.8 H3.4 V19 H-3.4 Z', f: IRON },
      { d: 'M-1.6 19 H1.6 V25 H-1.6 Z', f: '#2b2622' },
    ],
    extra: ln('M0 1.8 L.5 14', '#ffe2a0', 1, 0.9) + dia(0, 26.4, 1.7, EMBER2, '#7a3a10'),
  },
  longsword: {
    parts: [
      { d: 'M0 0 L2.5 5 L2.5 16.5 L-2.5 16.5 L-2.5 5 Z', f: STEEL, hf: '#fff1cf' },
      { d: 'M-6 16.5 H6 V18.8 H-6 Z', f: GOLD },
      { d: 'M-1.5 18.8 H1.5 V24 H-1.5 Z', f: WOODD },
      { d: 'M0 23.6 a2.1 2.1 0 1 0 .01 0 Z', f: GOLD },
    ],
    extra: ln('M0 3 V15', STEELD, 0.9),
  },
  'boar-spear': {
    parts: [
      { d: 'M0 0 L3.2 7.5 L0 9.4 L-3.2 7.5 Z', f: STEEL, hf: '#fff1cf' },
      { d: 'M-1.4 9 H1.4 V11.4 H-1.4 Z', f: GOLD },
      { d: 'M-.95 11 H.95 V26 H-.95 Z', f: WOOD },
      { d: 'M-2.8 11.6 L2.8 11.6 L3.4 16 L0 15 L-3.4 16 Z', f: CRIM },
    ],
    extra: ln('M0 1.6 V7', STEELD, 0.8),
  },
  'kama-dagger': {
    parts: [
      { d: 'M0 0 L3.6 7 L2.8 14 L-2.8 14 L-3.6 7 Z', f: STEEL, hf: '#fff1cf' },
      { d: 'M-5.8 14 Q0 12.4 5.8 14 L5.8 16.2 Q0 14.7 -5.8 16.2 Z', f: GOLD },
      { d: 'M-1.6 15.6 H1.6 V21.6 H-1.6 Z', f: CRIM },
      { d: 'M0 21.5 a2.5 2.5 0 1 0 .01 0 Z M0 23 a1 1 0 1 1 -.01 0 Z', f: GOLD, eo: true },
    ],
    extra: ln('M0 2.4 V12', STEELD, 0.8),
  },
  'hunting-arrow': {
    parts: [
      { d: 'M0 0 L3.2 5.8 L0 4.6 L-3.2 5.8 Z', f: STEEL, hf: '#fff1cf' },
      { d: 'M-.85 4.6 H.85 V25 H-.85 Z', f: WOOD },
      { d: 'M-.85 15 L-4.2 19.4 L-4.2 26 L-.85 22.4 Z', f: CRIM },
      { d: 'M.85 15 L4.2 19.4 L4.2 26 L.85 22.4 Z', f: BONE },
    ],
    extra: '',
  },
};

/**
 * Basılı resim (taslak cursor-8 #s1-#s6): nesne ucu etrafında `pg` kadar döner / ölçeklenir, üstüne `extra` çizimi biner; arkada kor yıldızı, uçta
 * parlak nokta. Sıcak nokta ve boşluk payı diğer durumlarla AYNI (uç (5,3)). Durum tablosu: kimlik x durum.
 */
const PRESS: Record<Exclude<CursorId, 'system'>, { pg: string; extra: string; parts?: Part[] }> = {
  longsword: { pg: 'rotate(8)', extra: star4(0.4, 7.4, 3.8, 1.2, '#fffbe8') + sl('M4 14 C7.2 10 7.6 5 5.6 1.6') },
  'boar-spear': { pg: 'scale(1 1.05)', extra: sl('M-5.4 14 V21') + sl('M5.6 17 V25') + star4(0, 5, 2.6, 0.9, '#fffbe8') },
  // Kama: dönme yok; çizim eksen boyunca (uç-taban hattı, 110,4 derece) uca doğru 1,3 birim ilerler; sıcak nokta değişmez (uç 1,3 birim öne taşar, boşluk payı içinde)
  'kama-dagger': { pg: 'translate(0 -1.3)', extra: star4(0.4, 6.4, 3.4, 1.1, '#fffbe8') + sl('M6.4 12 C9.6 8 9.8 3.6 8 .4') },
  'hunting-arrow': { pg: 'rotate(5)', extra: sl('M-6.4 9 V16') + sl('M6.6 11 V19') },
  'thorn-staff': { pg: 'rotate(8)', extra: circ(0, 1.6, 1.5, '#d8ff9a') + dia(5.6, 4, 1.3, '#9be06a', '#1f4a1c') + dia(-3.6, 8, 1.1, '#9be06a', '#1f4a1c') },
  'wax-candle': {
    pg: '',
    parts: candleParts('M0 0 C1.8 2.2 5.8 4.8 5.2 9 C4.8 11.4 -4.8 11.4 -5.2 9 C-5.8 5.4 -1.8 2.4 0 0 Z'),
    extra: '<path d="M0 2.6 C1.6 4.4 2.6 6.4 2.2 8.8 L-2.2 8.8 C-2.6 6.4 -1.6 4.4 0 2.6 Z" fill="#fffbe0"/>' + dia(6.4, 3.6, 1.2, EMBER2, '#7a3a10'),
  },
  'bat-wing': { pg: 'scale(.72 1)', extra: dia(8, 7, 1.2, '#b9a0e6', '#3a2a55') },
  'ember-shard': { pg: 'scale(1.22 1.06)', extra: circ(0, 8, 1.8, '#fffbe0') + dia(6.4, 10, 1.3, EMBER2, '#7a3a10') + dia(5.6, 15, 1, '#fff4d0', '#7a3a10') },
};

const plain = (d: string): string => `<path d="${d}" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>`;
const NO_SIGN =
  '<circle cx="23" cy="23" r="5" fill="rgba(255,255,255,.92)" stroke="#000" stroke-width="1"/><circle cx="23" cy="23" r="3.6" fill="none" stroke="#d22" stroke-width="1.7"/><path d="M20.4 25.6 L25.6 20.4" stroke="#d22" stroke-width="1.7"/>';

export interface CursorArt {
  /** Tam SVG metni (width/height piksel). */
  svg: string;
  /** Görüntünün piksel boyu (kare). */
  px: number;
  /** Sıcak nokta (piksel): uç. */
  hx: number;
  hy: number;
}

/** Durum başına çizim: gövde grubu (`g`, döndürülmüş nesne) ve `uid` verilir, tam iç SVG döner. Yeni durum = yeni satır. */
const STATE_PAINT: Record<CursorState, (g: string, uid: string) => string> = {
  def: (g) => g,
  // press: gövde `inner` içinde ayrıca kurulur (döndürme + ek çizim); buradaki g zaten o hâldir, arkasına kor yıldızı + önüne parlak nokta eklenir
  press: (g) => star4(TIP[0] + 2.6, TIP[1] + 4.6, 6.6, 2.1, EMBER2, '#7a3a10') + g + `<g transform="${TR}">${circ(0, 1.2, 1.5, '#fff4d0')}</g>`,
  hov: (g) =>
    circ(TIP[0], TIP[1] + 2, 7, EMBER2, 0.5) +
    g +
    dia(TIP[0] + 8, TIP[1] - 1, 1.6, EMBER2, '#7a3a10') +
    dia(TIP[0] - 3, TIP[1] + 6, 1.2, EMBER2, '#7a3a10') +
    `<g transform="${TR}">${circ(0, 1.2, 1.6, '#fff4d0')}</g>`,
  dis: (g, uid) => `<defs><filter id="gy-${uid}"><feColorMatrix type="saturate" values="0"/></filter></defs><g filter="url(#gy-${uid})" opacity=".6">${g}</g>${NO_SIGN}`,
};

/** 32 birimlik çizim uzayındaki iç SVG (boşluk payı dışarıda); `uid` süzgeç kimliğini benzersiz yapar (aynı sayfada çok önizleme). */
function inner(id: CursorId, state: CursorState, uid: string): string {
  if (id === 'system') {
    if (state === 'hov') return plain(HAND);
    if (state === 'press') return `<path d="${HAND}" fill="#c8c8c8" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>`;
    return plain(ARROW) + (state === 'dis' ? NO_SIGN : '');
  }
  const o = OBJ[id];
  if (state === 'press') {
    const pr = PRESS[id];
    return STATE_PAINT.press(`<g transform="${TR}"><g transform="${pr.pg}">${build(pr.parts ?? o.parts, true) + o.extra + pr.extra}</g></g>`, uid);
  }
  const body = build(o.parts, state === 'hov') + o.extra;
  return STATE_PAINT[state](`<g transform="${TR}">${body}</g>`, uid);
}

/** İmleç görüntüsü: `scale` 1 = 1 birim 1 piksel (yüzde / 100). Sıcak nokta uca denk gelir ve boyla ölçeklenir. */
export function cursorArt(id: CursorId, state: CursorState, scale = 1, uid = `${id}-${state}`): CursorArt {
  const px = Math.max(1, Math.round(VIEW * scale));
  const k = px / VIEW;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${-PAD} ${-PAD} ${VIEW} ${VIEW}">${inner(id, state, uid)}</svg>`;
  return { svg, px, hx: Math.round((TIP[0] + PAD) * k), hy: Math.round((TIP[1] + PAD) * k) };
}

const dataUri = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;
const FALLBACK: Record<CursorState, string> = { def: 'default', hov: 'pointer', press: 'pointer', dis: 'not-allowed' };

/** `cursor` değeri: url(...) x y, yedek anahtar sözcük. */
export function cursorValue(id: CursorId, state: CursorState, scale: number): string {
  const a = cursorArt(id, state, scale, `cur-${state}`);
  return `url("${dataUri(a.svg)}") ${a.hx} ${a.hy}, ${FALLBACK[state]}`;
}

/** Sayfaya enjekte edilen CSS ('system' için boş). Her durum `html[data-eov-cur=<durum>]` ve altındaki her öğede `!important`. */
export function buildCursorCss(prefs: CursorPrefs): string {
  if (prefs.id === 'system') return '';
  const scale = clampCursorSize(prefs.size) / 100;
  return CURSOR_STATES.filter((s) => s !== 'press' || prefs.press)
    .map((s) => `html[data-eov-cur="${s}"],html[data-eov-cur="${s}"] *{cursor:${cursorValue(prefs.id, s, scale)} !important}`)
    .join('\n');
}

// ---------------------------------------------------------------- Dokunmatik kararı

/** Arayüzün hangi hâli: 'full' fareli cihaz; 'touch' imleç yok (yalnızca bilgi satırı ve durum önizlemeleri). */
export type CursorUiMode = 'full' | 'touch';
export function cursorUiMode(hoverNone: boolean, coarse: boolean): CursorUiMode {
  return hoverNone || coarse ? 'touch' : 'full';
}
export function detectCursorUiMode(): CursorUiMode {
  try {
    const mm = (q: string): boolean => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
    return cursorUiMode(mm('(hover: none)'), mm('(pointer: coarse)'));
  } catch {
    return 'full';
  }
}

// ---------------------------------------------------------------- Durum (DOM'a dokunmayan kısım)

let prefs: CursorPrefs | null = null;
const listeners = new Set<(p: CursorPrefs) => void>();

function readStore(): string | null {
  try {
    return globalThis.localStorage?.getItem(SETTINGS_KEY) ?? null;
  } catch {
    return null;
  }
}

export function cursorPrefs(): CursorPrefs {
  if (!prefs) prefs = readCursorPrefs(readStore());
  return prefs;
}

function save(p: CursorPrefs): void {
  try {
    globalThis.localStorage?.setItem(SETTINGS_KEY, mergeCursorPrefs(readStore(), p));
  } catch {
    // depolama kapalıysa yalnızca bu oturumda geçerli
  }
}

export function setCursorPrefs(next: Partial<CursorPrefs>): void {
  const cur = cursorPrefs();
  prefs = { id: clampCursorId(next.id ?? cur.id), size: clampCursorSize(next.size ?? cur.size), press: next.press ?? cur.press };
  save(prefs);
  applyCursorTheme();
  for (const fn of listeners) fn(prefs);
}

export function onCursorPrefsChange(fn: (p: CursorPrefs) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Test için: bellekteki tercihi unut (yeniden okunur). */
export function resetCursorPrefsCache(): void {
  prefs = null;
}

// ---------------------------------------------------------------- DOM: enjeksiyon ve durum izleyici

const ATTR = 'data-eov-cur';
let styleEl: HTMLStyleElement | null = null;
let tracking = false;
let raf = 0;
let lastXY: [number, number] | null = null;

const FIELDS = 'input:not([type=range]):not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]):not([type=color]),textarea,[contenteditable=""],[contenteditable="true"]';

/** Öğenin ÖZGÜN imleç değerinden durum. */
export function modeForNative(cursor: string, disabled: boolean, textual: boolean): CursorState | 'native' {
  if (textual) return 'native';
  if (disabled) return 'dis';
  const kw = (cursor.split(',').pop() ?? '').trim().toLowerCase();
  if (kw === 'pointer') return 'hov';
  if (kw === 'not-allowed' || kw === 'no-drop') return 'dis';
  if (kw === '' || kw === 'default' || kw === 'auto') return 'def';
  return 'native'; // text, grab, move, col-resize, wait, none...
}

/**
 * Basma durumu (saf, testli): birincil fare düğmesi basılıyken true. Bırakma, iptal, odak kaybı / sekme gizlenmesi ve işaretçinin pencereden
 * çıkması bırakır. Basılı resim yalnızca normal ve tıklanabilir hâlin yerine geçer: kapalı (disabled), metin alanı ve sistem imleci değişmez.
 */
export class PressState {
  private held = false;
  down(button = 0): void {
    if (button === 0) this.held = true;
  }
  up(): void {
    this.held = false;
  }
  cancel(): void {
    this.held = false;
  }
  blur(): void {
    this.held = false;
  }
  leave(): void {
    this.held = false;
  }
  /** Hareket olayındaki `buttons` ile eşitler (bırakma olayı kaçtıysa kendini düzeltir). */
  sync(buttons: number): void {
    if (!(buttons & 1)) this.held = false;
  }
  get pressed(): boolean {
    return this.held;
  }
  /** Gösterilecek durum: `base` özgün imleçten çıkan durum. */
  mode(base: CursorState | 'native', pressOn: boolean): CursorState | 'native' {
    return pressOn && this.held && (base === 'def' || base === 'hov') ? 'press' : base;
  }
}
const pressState = new PressState();

function currentMode(): CursorState | 'native' {
  const root = document.documentElement;
  const el = lastXY ? document.elementFromPoint(lastXY[0], lastXY[1]) : null;
  if (!el) return 'def';
  const prev = root.getAttribute(ATTR);
  root.removeAttribute(ATTR); // özgün değeri okumak için kuralımızı bir an kaldır (aynı eşzamanlı bloktta geri konur)
  let mode: CursorState | 'native';
  try {
    const disabled = !!el.closest(':disabled, [aria-disabled="true"]') && !el.closest('canvas');
    mode = modeForNative(getComputedStyle(el).cursor, disabled, el.matches(FIELDS));
  } finally {
    if (prev !== null) root.setAttribute(ATTR, prev);
  }
  return mode;
}

function refresh(): void {
  raf = 0;
  if (!styleEl || !styleEl.textContent) return;
  document.documentElement.setAttribute(ATTR, pressState.mode(currentMode(), cursorPrefs().press));
}

function schedule(): void {
  if (!raf) raf = requestAnimationFrame(refresh); // Phaser kendi işaretçi işleyicisinden sonra (imleci o ayarlar)
}

function startTracking(): void {
  if (tracking) return;
  tracking = true;
  const onMove = (e: Event): void => {
    const pe = e as PointerEvent;
    if (pe.pointerType && pe.pointerType !== 'mouse' && pe.pointerType !== 'pen') return;
    lastXY = [pe.clientX, pe.clientY];
    schedule();
  };
  for (const t of ['pointermove', 'pointerdown', 'pointerup']) window.addEventListener(t, onMove, { capture: true, passive: true });
  // Basma: birincil fare düğmesi; bırakma / iptal / odak kaybı / sekme gizlenmesi / pencereden çıkış bırakır
  const mouse = (e: PointerEvent): boolean => !e.pointerType || e.pointerType === 'mouse' || e.pointerType === 'pen';
  window.addEventListener('pointerdown', (e) => mouse(e) && (pressState.down(e.button), schedule()), { capture: true, passive: true });
  window.addEventListener('pointermove', (e) => mouse(e) && pressState.sync(e.buttons), { capture: true, passive: true });
  for (const t of ['pointerup', 'pointercancel']) window.addEventListener(t, () => (pressState.up(), schedule()), { capture: true, passive: true });
  window.addEventListener('blur', () => (pressState.blur(), schedule()));
  document.addEventListener('visibilitychange', () => document.hidden && (pressState.blur(), schedule()));
  document.documentElement.addEventListener('mouseleave', () => (pressState.leave(), schedule()));
  // Phaser setDefaultCursor / useHandCursor tuvalin satır içi stilini hareketsiz işaretçide de değiştirebilir
  const mo = new MutationObserver(() => schedule());
  const watch = (c: Element): void => mo.observe(c, { attributes: true, attributeFilter: ['style'] });
  document.querySelectorAll('canvas').forEach(watch);
  new MutationObserver((recs) => {
    for (const r of recs) r.addedNodes.forEach((n) => n instanceof HTMLCanvasElement && watch(n));
  }).observe(document.documentElement, { childList: true, subtree: true });
}

/** Tercihi sayfaya uygular (ilk açılışta ve her değişimde). Dokunmatik cihazda hiçbir şey yapmaz. */
export function applyCursorTheme(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (detectCursorUiMode() === 'touch') {
    styleEl?.remove();
    styleEl = null;
    root.removeAttribute(ATTR);
    return;
  }
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'eov-cursor-theme';
    document.head.append(styleEl);
  }
  const css = buildCursorCss(cursorPrefs());
  styleEl.textContent = css;
  if (!css) {
    root.removeAttribute(ATTR);
    return;
  }
  if (!root.hasAttribute(ATTR)) root.setAttribute(ATTR, 'def');
  startTracking();
  schedule();
}

/** Açılışta bir kez (src/main.ts). */
export function installCursorTheme(): void {
  applyCursorTheme();
}
