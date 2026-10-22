// Gear > Tree sekmesinin yerleşim hesabı (saf; DOM yok). Mockup public/mockups/skill-tree-gear/data/tree-layout.js'in karşılığı: satır şablonu artık
// data/skill-trees/_rules.json > rowShape'ten gelir (kolon, şerit, tür). Tier bandı TEK sefer en üstte, tüm satırlarda aynı kolonlar, ult artı şekli.
import type { TreeNodeKind, TreeRules } from '../progression/skill-tree-data';

export const COLS = 8;

export type KindLetter = 'F' | 'E' | 'B' | 'N' | 'V';
export const KIND_LETTER: Record<TreeNodeKind, KindLetter> = { filler: 'F', edge: 'E', blood: 'B', notable: 'N', evolve: 'V' };

export interface LayoutCfg {
  name: 'm' | 'l' | 'p';
  laneH: number;
  hdr: number;
  padX: number;
  padV: number;
  sz: Record<KindLetter, number>;
  lblH: number;
  ultD: number;
  coreSz: number;
  colMin: number;
  colMax: number;
  hit: number;
  /** pickColW sonucu. */
  colW: number;
}

type Preset = Omit<LayoutCfg, 'colW'>;
/** m = masaüstü (orta), l = sıkı masaüstü, p = telefon / dokunmatik (hedef >= 44 px). Düğüm adı yok (ipucunda): lblH 0. */
export const PRESETS: Record<'m' | 'l' | 'p', Preset> = {
  m: { name: 'm', laneH: 66, hdr: 46, padX: 14, padV: 8, sz: { F: 36, E: 30, B: 44, N: 54, V: 70 }, lblH: 28, ultD: 74, coreSz: 78, colMin: 104, colMax: 140, hit: 44 },
  l: { name: 'l', laneH: 30, hdr: 38, padX: 10, padV: 6, sz: { F: 28, E: 26, B: 32, N: 42, V: 56 }, lblH: 14, ultD: 50, coreSz: 62, colMin: 96, colMax: 132, hit: 36 },
  p: { name: 'p', laneH: 46, hdr: 38, padX: 6, padV: 6, sz: { F: 28, E: 28, B: 32, N: 42, V: 54 }, lblH: 14, ultD: 44, coreSz: 52, colMin: 54, colMax: 54, hit: 44 },
};

export interface TplNode {
  id: string;
  kind: KindLetter;
  tier: string;
  col: number;
  lane: number;
}

/** Satır şablonu (rowShape; her satırda aynı). */
export const template = (rules: TreeRules): TplNode[] => rules.rowShape.map((d) => ({ id: d.id, kind: KIND_LETTER[d.kind], tier: d.tier, col: d.col, lane: d.lane }));

export interface Pt {
  x: number;
  y: number;
}
export interface TierRange {
  tier: string;
  c0: number;
  c1: number;
}
export interface RowBox {
  i: number;
  top: number;
  h: number;
  cy: number;
}
export interface Layout {
  cfg: LayoutCfg;
  rows: RowBox[];
  pos: Record<string, Pt>;
  W: number;
  H: number;
  tiers: TierRange[];
  rowH: number;
  ult: { W: number; H: number; cx: number; cy: number; D: number; pos: Record<string, Pt> };
}

function tierRanges(tpl: TplNode[]): TierRange[] {
  const m: Record<string, TierRange> = {};
  for (const n of tpl) {
    const t = m[n.tier] ?? (m[n.tier] = { tier: n.tier, c0: n.col, c1: n.col });
    t.c0 = Math.min(t.c0, n.col);
    t.c1 = Math.max(t.c1, n.col);
  }
  return Object.values(m).sort((a, b) => a.c0 - b.c0);
}

/** Düğümün satır içi taşma payı (üst, alt): satır yüksekliği buna göre. */
function ext(n: TplNode, cfg: LayoutCfg): [number, number] {
  const half = cfg.sz[n.kind] / 2;
  const side = cfg.lblH && (n.kind === 'N' || n.kind === 'V') ? (n.lane < 0 ? 'up' : 'dn') : null;
  return [half + (side === 'up' ? cfg.lblH + 6 : 0), half + (side === 'dn' ? cfg.lblH + (n.kind === 'V' ? 12 : 6) : n.kind === 'F' ? 14 : 0)];
}

/** Kolon genişliği: kullanılabilir genişlikten (plaka sütunu + kenar boşlukları düşülür) sınırlar içinde. */
export function pickColW(avail: number, labW: number, cfg: Pick<LayoutCfg, 'padX' | 'colMin' | 'colMax'>): number {
  const raw = Math.floor((avail - labW - 2 * cfg.padX) / COLS);
  return Math.max(cfg.colMin, Math.min(cfg.colMax, raw));
}

export function build(cfg: LayoutCfg, rules: TreeRules): Layout {
  const tpl = template(rules);
  let lo = 1e9;
  let hi = -1e9;
  for (const n of tpl) {
    const [a, b] = ext(n, cfg);
    lo = Math.min(lo, n.lane * cfg.laneH - a);
    hi = Math.max(hi, n.lane * cfg.laneH + b);
  }
  const rowH = Math.ceil(hi - lo + cfg.padV * 2);
  const cy0 = cfg.padV - lo;
  const xc = (c: number): number => cfg.padX + cfg.colW * (c + 0.5);
  const pos: Record<string, Pt> = {};
  const rows: RowBox[] = [];
  let y = cfg.hdr;
  for (let i = 0; i < rules.rows; i++) {
    const row = { i, top: y, h: rowH, cy: y + cy0 };
    rows.push(row);
    for (const n of tpl) pos[`${i}.${n.id}`] = { x: xc(n.col), y: row.cy + n.lane * cfg.laneH };
    y += rowH;
  }
  // ult: artı şekli (kol başına adım sayısı kadar düğüm); ortada ult ikonu
  const steps = rules.ult.levels.length;
  const D = cfg.ultD;
  const half = cfg.sz.N / 2;
  const M = half + (cfg.lblH ? 22 : 12);
  const R = steps * D + M;
  const dirs: Record<string, [number, number]> = { u: [0, -1], r: [1, 0], d: [0, 1], l: [-1, 0] };
  const upos: Record<string, Pt> = {};
  for (const arm of rules.ult.arms)
    for (let s = 1; s <= steps; s++) {
      const d = dirs[arm] ?? [0, 0];
      upos[`${rules.rows}.${arm}${s}`] = { x: R + d[0] * D * s, y: R + d[1] * D * s };
    }
  return { cfg, rows, pos, W: cfg.padX * 2 + cfg.colW * COLS, H: y + 4, tiers: tierRanges(tpl), rowH, ult: { W: 2 * R, H: 2 * R, cx: R, cy: R, D, pos: upos } };
}

/** İki düğüm arası yol (aynı hizada düz, değilse yumuşak eğri). */
export const link = (p: Pt, q: Pt): string => (p.y === q.y || p.x === q.x ? `M${p.x},${p.y} L${q.x},${q.y}` : `M${p.x},${p.y} C${(p.x + q.x) / 2},${p.y} ${(p.x + q.x) / 2},${q.y} ${q.x},${q.y}`);

export interface PlateOpts {
  avail: number;
  coarse: boolean;
  short: boolean;
  /** Sahne ölçeği (--gu). */
  u: number;
}
const GP_PG = 12;
const GP_PG_SHORT = 8;
export const plateW = (o: Pick<PlateOpts, 'short' | 'u'>): number => (o.short ? 104 : Math.max(150, Math.round(200 * (o.u || 1))));
export const plateGap = (o: Pick<PlateOpts, 'short'>): number => (o.short ? GP_PG_SHORT : GP_PG);
/** En dar satır: plaka + boşluk + telefon ayarının 8 kolonu. Alan bundan darsa ağaç alanı kendi içinde yatay kayar (plaka sütunu solda yapışık). */
export const plateNeed = (o: Pick<PlateOpts, 'short' | 'u'>): number => plateW(o) + plateGap(o) + 2 * PRESETS.p.padX + COLS * PRESETS.p.colMin;

/** Plakalı satır ayarı: orta (m) -> sıkı (l) -> telefon (p); dokunmatikte l atlanır. */
export function platePreset(o: PlateOpts): 'm' | 'l' | 'p' {
  const pw = plateW(o);
  const pg = plateGap(o);
  const chain: Array<'m' | 'l' | 'p'> = o.coarse ? ['m', 'p'] : ['m', 'l', 'p'];
  for (let i = 0; i < chain.length - 1; i++) {
    const p = PRESETS[chain[i]!];
    if (o.avail >= pw + pg + 2 * p.padX + 8 * p.colMin) return chain[i]!;
  }
  return 'p';
}

/** Plakalı yerleşimin tam ayarı (V4: düğüm adı yok; kısa ekranda tek satırlık tier bandı). */
export function plateConfig(o: PlateOpts): { cfg: LayoutCfg; key: 'm' | 'l' | 'p'; pw: number; pg: number; hs: boolean } {
  const pg = plateGap(o);
  const pw = plateW(o);
  const key = platePreset(o);
  const cfg: LayoutCfg = { ...PRESETS[key], colW: 0 };
  if (o.short) {
    cfg.hdr = 20;
    cfg.padV = 3;
  }
  cfg.lblH = 0;
  if (key === 'm') {
    cfg.ultD = 64;
    cfg.coreSz = 66;
  }
  if (key === 'p') cfg.colMax = 72;
  cfg.colW = pickColW(o.avail, pw + pg, cfg);
  return { cfg, key, pw, pg, hs: o.avail < plateNeed(o) };
}
