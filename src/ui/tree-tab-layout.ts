// Gear > Tree sekmesinin yerleşim hesabı (saf; DOM yok). Ömer'in seçtiği taslak: public/mockups/skill-tree-compact.html#v1 "Columns" (layouts.js > L1):
// her skill bir DİKEY SÜTUN (tepede skill plakası, altında tier'lar aşağı iner), solda tek ortak tier bandı, altta geniş ult bandı (4 kol yan yana).
// Sayfa kaymaz: her şey verilen W x H kutusuna sığar (mutlak koordinat). Düğüm şablonu data/skill-trees/_rules.json > rowShape'ten (id, tür, tier).
import type { TreeNodeKind, TreeRules } from '../progression/skill-tree-data';

export type KindLetter = 'F' | 'E' | 'B' | 'N' | 'V';
export const KIND_LETTER: Record<TreeNodeKind, KindLetter> = { filler: 'F', edge: 'E', blood: 'B', notable: 'N', evolve: 'V' };

export interface Pt {
  x: number;
  y: number;
}

/** Sütun içi yer: [x (sütun genişliğinin oranı), n (tier ızgarasında kaçıncı sıra, 0 = en üst)]. rowShape'teki her düğüm kimliği burada olmalı (test). */
export const COL_AT: Record<string, [number, number]> = {
  f1: [0.2, 0],
  f2: [0.5, 0],
  f3: [0.8, 0],
  n0: [0.5, 1],
  r: [0.5, 2],
  ea: [0.25, 3],
  eb: [0.75, 3],
  ma: [0.125, 4],
  fa: [0.375, 4],
  fb: [0.625, 4],
  mb: [0.875, 4],
  v: [0.5, 5],
};
/** Ult düğümlerinin kolun sütunundaki x oranı (adım 1 / 2 / 3). */
export const ULT_X = [0.2, 0.5, 0.8];

/** Düğüm boyutları (kendi boyutunda, k = ölçek). */
const BASE: Record<KindLetter, number> = { F: 30, E: 26, B: 34, N: 40, V: 54 };
const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
const px = (n: number): number => Math.round(n * 10) / 10;

/** Dokunma hedefi: proje kuralı 44 px. */
export const HIT_GOAL = 44;

export interface ColsIn {
  W: number;
  H: number;
  /** html.short (telefon yatay). */
  short: boolean;
}

export interface TierBox {
  tier: string;
  y: number;
  h: number;
}

export interface Hit {
  w: number;
  h: number;
}

export interface ColsLayout {
  W: number;
  H: number;
  short: boolean;
  /** Sol tier bandının genişliği. */
  labW: number;
  /** Skill plakası yüksekliği (sütun başlığı). */
  hh: number;
  /** Alt ult bandı yüksekliği (başı ult çizgisi). */
  ultH: number;
  cw: number;
  /** Tier ızgarasındaki bir sıranın yüksekliği. */
  pitch: number;
  k: number;
  sz: Record<KindLetter, number>;
  /** Düğüm merkezleri: "<satır>.<id>" ve "<ult>.<kol><adım>". */
  pos: Record<string, Pt>;
  /** Her düğümün dokunma kutusu (görünmez alan komşu boşluğa kadar büyür; en çok 44 px). */
  hit: Record<string, Hit>;
  tiers: TierBox[];
  /** Ult bandının üst çizgisi (y). */
  ultY0: number;
  /** Ult düğümlerinin merkez y'si. */
  ultNy: number;
  /** Ult skill'inin madalyonu: merkez + çap. */
  core: Pt & { d: number };
  /** Ult noktası ("n / 3") merkezi. */
  upts: Pt;
  /** Kol başına sütun başı x'i (4 sütunla aynı hizada). */
  colX: number[];
}

/** Bir tier'ın kapladığı sıralar (rowShape sırasına göre): { tier, n0, n }. */
export function tierSpans(rules: TreeRules): Array<{ tier: string; n0: number; n: number }> {
  const m: Record<string, { tier: string; n0: number; n1: number; first: number }> = {};
  rules.rowShape.forEach((d, idx) => {
    const n = COL_AT[d.id]?.[1] ?? 0;
    const t = m[d.tier] ?? (m[d.tier] = { tier: d.tier, n0: n, n1: n, first: idx });
    t.n0 = Math.min(t.n0, n);
    t.n1 = Math.max(t.n1, n);
  });
  return Object.values(m)
    .sort((a, b) => a.n0 - b.n0 || a.first - b.first)
    .map((t) => ({ tier: t.tier, n0: t.n0, n: t.n1 - t.n0 + 1 }));
}

/** Tüm düğümlerin dokunma kutusu: hedef 44 px; dikeyde, yatayda üst üste binen komşuya göre kısılır (ortak sınır = orta nokta). */
function hitBoxes(pos: Record<string, Pt>, wGoal: number, hGoal: number): Record<string, Hit> {
  const keys = Object.keys(pos);
  const out: Record<string, Hit> = {};
  for (const a of keys) {
    let h = hGoal;
    for (const b of keys) {
      if (a === b) continue;
      const dx = Math.abs(pos[a]!.x - pos[b]!.x);
      const dy = Math.abs(pos[a]!.y - pos[b]!.y);
      if (dx < wGoal && dy < h) h = Math.max(dy, 1);
    }
    out[a] = { w: px(wGoal), h: px(h) };
  }
  return out;
}

export function buildCols(o: ColsIn, rules: TreeRules): ColsLayout {
  const { W, H, short } = o;
  const labW = short ? 30 : 84;
  // telefon (Ömer 2026-11-03): daha küçük başlık / düğüm, ult bandına nefes payı (etiketler ağaçla çakışmasın)
  const hh = short ? 26 : clamp(Math.round(H * 0.15), 66, 100);
  const ultH = short ? 62 : clamp(Math.round(H * 0.19), 100, 150);
  const cw = (W - labW) / 4;
  const spans = tierSpans(rules);
  const rowsN = spans.reduce((m, t) => Math.max(m, t.n0 + t.n), 0);
  const pitch = Math.min(104, (H - hh - ultH) / rowsN);
  const k = clamp(pitch / 52, 0.5, 1.35);
  // düğümler tier sırasına sığar (dar sırada büyük evolve / notable komşu sıraya ya da ult çizgisine taşmasın)
  const sc = short ? 0.82 : 1; // telefonda düğümler daha küçük (sıralar arası boşluk açılır)
  const fit = (kind: KindLetter, cap: number): number => px(Math.min(BASE[kind] * k * sc, pitch * cap * sc));
  const sz = { F: fit('F', 0.9), E: fit('E', 0.9), B: fit('B', 1), N: fit('N', 0.95), V: fit('V', short ? 0.68 : 0.92) };
  const yk = (n: number): number => hh + pitch * (n + 0.5);
  const colX = [0, 1, 2, 3].map((i) => labW + cw * i);
  const pos: Record<string, Pt> = {};
  const rows = rules.rows;
  for (let i = 0; i < rows; i++)
    for (const d of rules.rowShape) {
      const at = COL_AT[d.id];
      if (at) pos[`${i}.${d.id}`] = { x: px(colX[i]! + cw * at[0]), y: px(yk(at[1])) };
    }
  // ult bandı
  const ultY0 = H - ultH;
  const ultNy = px(ultY0 + ultH * (short ? 0.64 : 0.6));
  const steps = rules.ult.levels.length;
  rules.ult.arms.forEach((arm, j) => {
    for (let s = 1; s <= steps; s++) pos[`${rows}.${arm}${s}`] = { x: px(colX[j]! + cw * (ULT_X[s - 1] ?? 0.5)), y: ultNy };
  });
  const coreD = short ? 26 : 46;
  const core = { x: px(labW / 2), y: px(ultY0 + ultH * 0.44), d: coreD };
  const upts = { x: core.x, y: px(core.y + coreD / 2 + (short ? 8 : 12)) };
  const wGoal = clamp(Math.floor(cw * 0.25) - 1, 20, HIT_GOAL);
  const hit = hitBoxes(pos, wGoal, HIT_GOAL);
  // ult düğümlerinde dikey kutu, ult bandının içinde kalır (üstte kol etiketi için yer bırakılır)
  const ultHitH = clamp(ultH - (short ? 18 : 26), 20, HIT_GOAL);
  for (const key of Object.keys(pos)) if (key.startsWith(`${rows}.`)) hit[key] = { w: hit[key]!.w, h: Math.min(hit[key]!.h, ultHitH) };
  const tiers: TierBox[] = spans.map((t) => ({ tier: t.tier, y: px(hh + pitch * t.n0), h: px(pitch * t.n) }));
  return { W, H, short, labW, hh, ultH, cw, pitch: px(pitch), k: px(k), sz, pos, hit, tiers, ultY0, ultNy, core, upts, colX };
}

/** İki düğüm arası yol: aynı hizada düz çizgi; dikey ağırlıklıysa dikey, yatay ağırlıklıysa yatay yumuşak eğri. */
export function link(a: Pt, b: Pt): string {
  if (a.x === b.x || a.y === b.y) return `M${a.x},${a.y} L${b.x},${b.y}`;
  if (Math.abs(b.y - a.y) > Math.abs(b.x - a.x)) {
    const my = px((a.y + b.y) / 2);
    return `M${a.x},${a.y} C${a.x},${my} ${b.x},${my} ${b.x},${b.y}`;
  }
  const mx = px((a.x + b.x) / 2);
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
}

/** Blood Price düğümünün altındaki "kapalı uç" çizgisi (kısa dikey + enine kesik). */
export const deadStub = (p: Pt, h: number): string => `M${p.x},${px(p.y + h)} V${px(p.y + h + 9)} M${px(p.x - 6)},${px(p.y + h + 9)} H${px(p.x + 6)}`;
