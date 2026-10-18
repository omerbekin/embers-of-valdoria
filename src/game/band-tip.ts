import Phaser from 'phaser';
import { textRes } from './stage-view';
import { BODY_FONT, DISPLAY_FONT } from '../ui/menu-style';
import { EL, diamondPts, elText, fitW, hGradient } from './elegant-ui';
import { drawMiniShape, miniShapeSize } from './shape-draw';
import type { MiniShape } from '../ui/shape-diagram';
import { richSegs, splitNow } from '../ui/band-rich';

/**
 * TOOLTIP = "A - BAND" (Phaser tarafı; Ömer 2026-10-18: "sonraki benzer şeylerde bu tasarım dilini kullan"). DOM eşi: src/ui/band-tip.ts (+ band-tip.css);
 * ikisi aynı metin ayrıştırıcıyı kullanır (src/ui/band-rich.ts). Dil: ikon solda, renkli başlık şeridi, değer sağda; üstte tür etiketi, Cinzel başlık,
 * altın çizgi + ortada elmas ayırıcı, elmas madde işareti, anahtar kelime vurgu renginde + rakamlar altın, çipler, alt bilgi çubuğu, sol üst / sağ alt
 * köşe elmasları. Phaser ipucu yazmak isteyen HER ekran bunu kullanır (eski `elTip` kalktı); metni değiştirmez, yalnızca görünümü kurar.
 * Konum: elegant-ui.ts > placeElTip.
 */

export interface PhChip {
  text: string;
  /** Çipin başındaki ikon (doku adı). */
  icon?: string;
  /** Yazı rengi (element gibi kendi rengi olan etiket). */
  hex?: string;
  /** ac = vurgu rengi, v = değerli (sayı altın), ok / warn / free = durum. */
  tone?: 'ac' | 'v' | 'ok' | 'warn' | 'free';
  /** tone 'v' ise kalın altın değer ("14"). */
  num?: string;
}

/** Satır: düz metin (anahtar kelime / rakam otomatik vurgulanır) ya da elle renkli parçalar. */
export type PhLine = { text: string; hex?: string } | { segs: Array<{ text: string; hex?: string }> };

export interface PhFace {
  label: string;
  /** "3x" rozeti. */
  count?: number;
  /** Küçük karoyu çizer (portre / düğüm ikonu); (cx, cy) merkez, size kenar. */
  build: (scene: Phaser.Scene, cx: number, cy: number, size: number) => Phaser.GameObjects.GameObject[];
  /** Yanındaki durum çipi ("Elit"). */
  chip?: PhChip;
}

export interface PhSection {
  label: string;
  faces: PhFace[];
}

export interface BandTipSpec {
  /** Vurgu rengi ('#rrggbb'): element / durum / nadirlik. Yoksa altın. */
  accent?: string;
  /** Başlığın üstündeki tür etiketi. */
  kind?: string;
  title: string;
  titleSuffix?: { text: string; hex: string };
  /** Madalyon: doku adı. */
  icon?: string;
  iconSize?: number;
  /** Madalyon çerçevesi yuvarlak (kahraman / düğüm). */
  round?: boolean;
  /** Özel madalyon (sınıf portresi gibi): (cx, cy, size) merkezli nesneler. Verilirse `icon` yerine. */
  medal?: (scene: Phaser.Scene, cx: number, cy: number, size: number) => Phaser.GameObjects.GameObject[];
  value?: string;
  valueLabel?: string;
  valueDiff?: { text: string; hex: string };
  /** Başlığın sağındaki çip ("Cleared"). */
  asideChip?: PhChip;
  shape?: MiniShape | null;
  chips?: PhChip[];
  lines?: PhLine[];
  sections?: PhSection[];
  foot?: string;
  width?: number;
  /** Tüm ölçüler bu çarpanla (telefonda büyük dokunma okunurluğu). */
  scale?: number;
}

const hexNum = (c: string): number => parseInt(c.replace('#', '').slice(0, 6), 16);
const mix = (a: number, b: number, t: number): number => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const css = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
const BODY = '#e6dcc6';

const TONE = {
  ok: { fg: '#8fe39a', bg: 0x5abe6e, bgA: 0.13, bd: 0x8fe39a, bdA: 0.4 },
  warn: { fg: '#ff9a7a', bg: 0xdc5a46, bgA: 0.13, bd: 0xff8a7a, bdA: 0.4 },
  free: { fg: '#cfe8a8', bg: 0x7fbf3f, bgA: 0.13, bd: 0x7fbf3f, bdA: 0.5 },
} as const;

/** Bir satırı sözcük sözcük dizer (sığmayan alt satıra iner); satır sonu y'sini döndürür. */
function layRich(
  scene: Phaser.Scene,
  items: Phaser.GameObjects.GameObject[],
  x0: number,
  y: number,
  maxW: number,
  segs: Array<{ text: string; kind?: string; hex?: string }>,
  accentL: string,
  s: number,
): number {
  const lh = Math.round(24 * s);
  let x = x0;
  let ly = y;
  for (const seg of segs) {
    const isNum = seg.kind === 'n';
    const isKey = seg.kind === 'k';
    const color = seg.hex ?? (isKey ? accentL : isNum ? '#f3d999' : seg.kind === 'up' ? '#8fe39a' : seg.kind === 'down' ? '#ff8a7a' : BODY);
    for (const word of seg.text.split(/(?<= )/)) {
      if (!word) continue;
      const t = scene.add
        .text(0, 0, word, { fontFamily: isNum ? DISPLAY_FONT : BODY_FONT, fontSize: `${Math.round((isNum ? 17 : 19) * s)}px`, fontStyle: isNum || isKey ? '600' : 'normal', color })
        .setResolution(textRes())
        .setOrigin(0, 0.5);
      if (x > x0 && x + t.width > x0 + maxW) {
        x = x0;
        ly += lh + 1;
      }
      t.setPosition(x, ly + lh / 2);
      x += t.width;
      items.push(t);
    }
  }
  return ly + lh;
}

/** Çip çizer; sağ kenar `rightX` (align right) ya da sol kenar `x`; genişliği döndürür. */
function drawChip(scene: Phaser.Scene, items: Phaser.GameObjects.GameObject[], c: PhChip, x: number, cy: number, accent: number, s: number, rightAlign = false): number {
  const h = Math.round(26 * s);
  const pad = Math.round(10 * s);
  const ico = c.icon ? Math.round(16 * s) : 0;
  const tone = c.tone === 'ok' || c.tone === 'warn' || c.tone === 'free' ? TONE[c.tone] : null;
  const fg = c.hex ?? (tone ? tone.fg : c.tone === 'ac' ? css(mix(accent, 0xffffff, 0.52)) : c.tone === 'v' ? '#f8ebc9' : '#d9c8a2');
  const parts: Phaser.GameObjects.Text[] = [];
  let tw = 0;
  if (c.tone === 'v') {
    if (c.num) {
      const n = elText(scene, 0, cy, c.num, Math.round(15 * s), '#f3d999', { em: 0.04 }).setOrigin(0, 0.5);
      parts.push(n);
      tw += n.displayWidth + Math.round(5 * s);
    }
    if (c.text) {
      const t = scene.add.text(0, cy, c.text, { fontFamily: BODY_FONT, fontSize: `${Math.round(19 * s)}px`, color: fg }).setResolution(textRes()).setOrigin(0, 0.5);
      parts.push(t);
      tw += t.width;
    }
  } else {
    const t = elText(scene, 0, cy, c.text, Math.round(13 * s), fg, { em: 0.1 }).setOrigin(0, 0.5);
    parts.push(t);
    tw += t.displayWidth;
  }
  const w = pad * 2 + (ico ? ico + Math.round(6 * s) : 0) + tw;
  const left = rightAlign ? x - w : x;
  const g = scene.add.graphics();
  if (tone) g.fillStyle(tone.bg, tone.bgA).fillRect(left, cy - h / 2, w, h).lineStyle(1, tone.bd, tone.bdA).strokeRect(left + 0.5, cy - h / 2 + 0.5, w - 1, h - 1);
  else if (c.tone === 'ac') g.fillStyle(accent, 0.14).fillRect(left, cy - h / 2, w, h).lineStyle(1, accent, 0.5).strokeRect(left + 0.5, cy - h / 2 + 0.5, w - 1, h - 1);
  else g.fillStyle(0xffffff, 0.05).fillRect(left, cy - h / 2, w, h).lineStyle(1, EL.GOLD, 0.16).strokeRect(left + 0.5, cy - h / 2 + 0.5, w - 1, h - 1);
  items.push(g);
  let cx = left + pad;
  if (c.icon) {
    items.push(scene.add.image(cx + ico / 2, cy, c.icon).setDisplaySize(ico, ico));
    cx += ico + Math.round(6 * s);
  }
  for (const p of parts) {
    p.x = cx;
    cx += p.displayWidth + Math.round(5 * s);
    items.push(p);
  }
  return w;
}

/** Band ipucu kutusu (konumlanmamış; derinlik 5000). Konumlama: elegant-ui.ts > placeElTip. */
export function bandTip(scene: Phaser.Scene, spec: BandTipSpec): { container: Phaser.GameObjects.Container; width: number; height: number } {
  const s = spec.scale ?? 1;
  const w = Math.round((spec.width ?? 480) * s);
  const px = Math.round(20 * s);
  const accent = hexNum(spec.accent ?? '#d9b26a');
  const accentL = css(mix(accent, 0xffffff, 0.52));
  const items: Phaser.GameObjects.GameObject[] = [];
  const back = scene.add.graphics(); // çerçeve + şerit en altta; gövde sonunda boyutlanır
  const bandG = scene.add.graphics();

  // --- başlık şeridi
  const medalS = spec.icon || spec.medal ? Math.round((spec.iconSize ?? 56) * s) : 0;
  const padY = Math.round(14 * s);
  let hx = px;
  const shape = spec.shape ? { ...spec.shape, note: undefined } : null;
  const shapeSz = shape ? miniShapeSize(shape as MiniShape) : null;
  // sağ taraf: değer / şekil / çip genişliği
  let asideW = 0;
  let value: Phaser.GameObjects.Text | null = null;
  let valueSub: Phaser.GameObjects.Text | null = null;
  if (spec.value !== undefined) {
    value = elText(scene, 0, 0, spec.value, Math.round(34 * s), '#f8ebc9', { em: 0.02 }).setOrigin(1, 0.5);
    asideW = Math.max(asideW, value.displayWidth);
    if (spec.valueLabel || spec.valueDiff) {
      valueSub = scene.add
        .text(0, 0, `${spec.valueLabel ? spec.valueLabel.toUpperCase() : ''}${spec.valueDiff ? `${spec.valueLabel ? ' ' : ''}(${spec.valueDiff.text})` : ''}`, { fontFamily: DISPLAY_FONT, fontSize: `${Math.round(12 * s)}px`, fontStyle: '600', color: spec.valueDiff ? spec.valueDiff.hex : EL.MUTED })
        .setResolution(textRes())
        .setOrigin(1, 0.5);
      asideW = Math.max(asideW, valueSub.width);
    }
  }
  if (shapeSz) asideW += (asideW ? Math.round(14 * s) : 0) + shapeSz.w;
  const textMax = w - px * 2 - (medalS ? medalS + Math.round(14 * s) : 0) - (asideW ? asideW + Math.round(14 * s) : 0) - (spec.asideChip ? Math.round(110 * s) : 0);
  const kind = spec.kind ? elText(scene, 0, 0, spec.kind, Math.round(13 * s), accentL, { em: 0.2 }).setOrigin(0, 0).setAlpha(0.85) : null;
  const title = fitW(elText(scene, 0, 0, spec.title, Math.round(26 * s), accentL, { em: 0.06 }).setOrigin(0, 0), textMax);
  const titleH = title.displayHeight;
  const textH = (kind ? kind.displayHeight : 0) + titleH;
  const bandH = Math.max(medalS, textH, shapeSz ? shapeSz.h : 0) + padY * 2;
  const midY = bandH / 2;
  // şerit
  hGradient(bandG, 0, 0, w, bandH, accent, [[0, 0.3], [0.7, 0.06], [1, 0.06]]);
  bandG.lineStyle(2, accent, 0.65).lineBetween(0, bandH - 1, w, bandH - 1);
  // madalyon
  if (medalS) {
    const cx = hx + medalS / 2;
    const m = scene.add.graphics();
    const rr = medalS / 2;
    m.fillStyle(0x120c08, 1);
    if (spec.round) m.fillCircle(cx, midY, rr);
    else m.fillRect(hx, midY - rr, medalS, medalS);
    items.push(m);
    if (spec.medal) items.push(...spec.medal(scene, cx, midY, medalS - 4));
    else if (spec.icon) items.push(scene.add.image(cx, midY, spec.icon).setDisplaySize(medalS - (spec.round ? 4 : 10), medalS - (spec.round ? 4 : 10)));
    const bd = scene.add.graphics();
    bd.lineStyle(2, spec.round ? mix(accent, 0xffffff, 0.52) : mix(accent, 0x000000, 0.25), 1);
    if (spec.round) bd.strokeCircle(cx, midY, rr);
    else bd.strokeRect(hx + 1, midY - rr + 1, medalS - 2, medalS - 2);
    items.push(bd);
    hx += medalS + Math.round(14 * s);
  }
  let ty = midY - textH / 2;
  if (kind) {
    kind.setPosition(hx, ty);
    ty += kind.displayHeight;
    items.push(kind);
  }
  title.setPosition(hx, ty);
  items.push(title);
  if (spec.titleSuffix) {
    const suf = scene.add.text(0, 0, spec.titleSuffix.text, { fontFamily: BODY_FONT, fontSize: `${Math.round(20 * s)}px`, color: spec.titleSuffix.hex }).setResolution(textRes()).setOrigin(0, 0.5);
    suf.setPosition(title.x + title.displayWidth + 8, title.y + titleH / 2);
    items.push(suf);
  }
  // sağ taraf yerleşimi
  let rx = w - px;
  if (spec.asideChip) {
    const cw = drawChip(scene, items, spec.asideChip, rx, midY, accent, s, true);
    rx -= cw + Math.round(10 * s);
  }
  if (value) {
    value.setPosition(rx, valueSub ? midY - Math.round(8 * s) : midY);
    items.push(value);
    if (valueSub) {
      valueSub.setPosition(rx, midY + Math.round(18 * s));
      items.push(valueSub);
    }
    rx -= (shapeSz ? 0 : 0) + Math.max(value.displayWidth, valueSub?.width ?? 0) + Math.round(14 * s);
  }
  if (shape && shapeSz) items.push(drawMiniShape(scene, rx - shapeSz.w, midY - shapeSz.h / 2, shape as MiniShape));
  let y = bandH;

  // --- çipler
  if (spec.chips?.length) {
    y += Math.round(10 * s);
    let x = px;
    const rowH = Math.round(26 * s);
    for (const c of spec.chips) {
      // önce ölç (taşarsa alt satıra iner), sonra çiz
      const probe: Phaser.GameObjects.GameObject[] = [];
      const cw = drawChip(scene, probe, c, 0, 0, accent, s);
      probe.forEach((o) => o.destroy());
      if (x > px && x + cw > w - px) {
        x = px;
        y += rowH + Math.round(6 * s);
      }
      drawChip(scene, items, c, x, y + rowH / 2, accent, s);
      x += cw + Math.round(8 * s);
    }
    y += rowH + Math.round(10 * s);
  }

  // --- ayırıcı + gövde
  const hasBody = !!spec.lines?.length || !!spec.sections?.length;
  if (hasBody) {
    const dv = scene.add.graphics();
    for (let i = 0; i < 24; i++) {
      const t = (i + 0.5) / 24;
      const a = Math.min(1, Math.min(t, 1 - t) / 0.12);
      dv.lineStyle(1, EL.GOLD, 0.3 * a).lineBetween(px + ((w - px * 2) * i) / 24, y, px + ((w - px * 2) * (i + 1)) / 24, y);
    }
    dv.fillStyle(0x130d07, 1).fillPoints(diamondPts(w / 2, y, 4.5), true);
    dv.lineStyle(1, mix(accent, 0xffffff, 0.52), 1).strokePoints(diamondPts(w / 2, y, 4.5), true);
    items.push(dv);
    y += Math.round(12 * s);
  }
  const bulletX = px + Math.round(7 * s);
  const textX = px + Math.round(24 * s);
  for (const ln of spec.lines ?? []) {
    let segs: Array<{ text: string; kind?: string; hex?: string }>;
    let now: string | undefined;
    if ('segs' in ln) segs = ln.segs;
    else {
      const sp = splitNow(ln.text);
      now = sp.now;
      const rs = richSegs(sp.text);
      const hasKey = rs.some((r) => r.kind === 'k');
      segs = rs.map((r) => (ln.hex && (r.kind === 'k' || (!hasKey && !r.kind)) ? { ...r, hex: ln.hex } : r));
    }
    const lineTop = y;
    // sağdaki "now 84" çipi: önce ölçülür (yer ayrılır), sonra çizilir
    let nowW = 0;
    if (now) {
      const probe: Phaser.GameObjects.GameObject[] = [];
      nowW = drawChip(scene, probe, { text: now, tone: 'v' }, 0, 0, accent, s);
      probe.forEach((o) => o.destroy());
    }
    const end = layRich(scene, items, textX, lineTop, w - textX - px - (now ? nowW + Math.round(10 * s) : 0), segs, accentL, s);
    const g = scene.add.graphics();
    g.fillStyle(mix(accent, 0xffffff, 0.52), 1).fillPoints(diamondPts(bulletX, lineTop + Math.round(12 * s), Math.round(3.5 * s)), true);
    items.push(g);
    if (now) drawChip(scene, items, { text: now, tone: 'v' }, w - px, lineTop + Math.round(12 * s), accent, s, true);
    y = end + Math.round(8 * s);
  }
  // --- bölümler (Foes / Then)
  for (const sec of spec.sections ?? []) {
    const lab = elText(scene, px, y + Math.round(8 * s), sec.label, Math.round(13 * s), EL.MUTED, { em: 0.22 }).setOrigin(0, 0.5);
    items.push(lab);
    const sl = scene.add.graphics();
    sl.lineStyle(1, EL.GOLD, 0.3).lineBetween(px + lab.displayWidth + 12, y + Math.round(8 * s), w - px, y + Math.round(8 * s));
    items.push(sl);
    y += Math.round(22 * s);
    let x = px;
    const fh = Math.round(38 * s);
    for (const f of sec.faces) {
      // portre yoksa (doku yüklü değil: indirme bütçesi) çip yalnızca yazıdır, sayı "3x" önekiyle
      const made = f.build(scene, 0, 0, fh - 2);
      const hasArt = made.length > 0;
      made.forEach((o) => o.destroy());
      const lead = hasArt ? fh : 0;
      const label = scene.add.text(0, 0, hasArt || !f.count || f.count < 2 ? f.label : `${f.count}x ${f.label}`, { fontFamily: BODY_FONT, fontSize: `${Math.round(19 * s)}px`, color: BODY }).setResolution(textRes()).setOrigin(0, 0.5);
      const chipW = f.chip ? Math.round((f.chip.text.length * 9 + 24) * s) + 8 : 0;
      const fw = lead + 8 + label.width + 10 + chipW;
      if (x > px && x + fw > w - px) {
        x = px;
        y += fh + Math.round(6 * s);
      }
      const bg = scene.add.graphics();
      bg.fillStyle(0xffffff, 0.05).fillRect(x, y, fw, fh).lineStyle(1, EL.GOLD, 0.16).strokeRect(x + 0.5, y + 0.5, fw - 1, fh - 1);
      if (hasArt) bg.fillStyle(0x120c08, 1).fillRect(x, y, fh, fh).lineStyle(1, EL.GOLD, 0.3).lineBetween(x + fh, y, x + fh, y + fh);
      items.push(bg);
      if (hasArt) items.push(...f.build(scene, x + fh / 2, y + fh / 2, fh - 2));
      if (hasArt && f.count && f.count > 1) {
        const cb = elText(scene, x + fh - 2, y + fh - 2, `${f.count}x`, Math.round(11 * s), '#f8ebc9', { em: 0.02 }).setOrigin(1, 1);
        const cg = scene.add.graphics();
        cg.fillStyle(0x000000, 0.75).fillRect(cb.x - cb.displayWidth - 3, cb.y - cb.displayHeight, cb.displayWidth + 5, cb.displayHeight);
        items.push(cg, cb);
      }
      label.setPosition(x + lead + 8, y + fh / 2);
      items.push(label);
      if (f.chip) drawChip(scene, items, f.chip, x + lead + 8 + label.width + 10, y + fh / 2, accent, s);
      x += fw + Math.round(8 * s);
    }
    y += fh + Math.round(10 * s);
  }
  if (hasBody) y += Math.round(2 * s);

  // --- alt bilgi çubuğu
  let h = y;
  if (spec.foot) {
    const ft = scene.add.text(px + Math.round(18 * s), 0, spec.foot, { fontFamily: BODY_FONT, fontSize: `${Math.round(18 * s)}px`, color: '#ffd99a', wordWrap: { width: w - px * 2 - Math.round(18 * s) } }).setResolution(textRes()).setOrigin(0, 0.5);
    const fhh = ft.height + Math.round(14 * s);
    const fg = scene.add.graphics();
    fg.fillStyle(0x000000, 0.24).fillRect(0, y, w, fhh).lineStyle(1, EL.GOLD, 0.16).lineBetween(0, y, w, y);
    fg.fillStyle(mix(accent, 0xffffff, 0.52), 1).fillPoints(diamondPts(px + 5, y + fhh / 2, 3.5), true);
    ft.y = y + fhh / 2;
    items.push(fg, ft);
    h = y + fhh;
  } else if (!hasBody) h = bandH;
  else h = y + Math.round(2 * s);

  // --- çerçeve (en altta): halka, parıltı, degrade, vurgu kenarı, köşe elmasları
  back.fillStyle(0x000000, 0.3).fillRect(4, 12, w, h);
  back.lineStyle(3, EL.INK, 0.75).strokeRect(-1.5, -1.5, w + 3, h + 3);
  for (let i = 3; i >= 1; i--) back.lineStyle(i * 3, accent, 0.05).strokeRect(-i * 2, -i * 2, w + i * 4, h + i * 4);
  back.fillGradientStyle(0x1e160e, 0x1e160e, 0x0c0906, 0x0c0906, 0.985).fillRect(0, 0, w, h);
  back.lineStyle(1, mix(accent, 0xd9b26a, 0.4), 0.9).strokeRect(0.5, 0.5, w - 1, h - 1);
  const corner = scene.add.graphics();
  for (const [cx, cy] of [[0, 0], [w, h]] as const) {
    corner.fillStyle(0x130d07, 1).fillPoints(diamondPts(cx, cy, 6), true);
    corner.lineStyle(1, mix(accent, 0xffffff, 0.52), 1).strokePoints(diamondPts(cx, cy, 6), true);
  }
  return { container: scene.add.container(0, 0, [back, bandG, ...items, corner]).setDepth(5000), width: w, height: h };
}
