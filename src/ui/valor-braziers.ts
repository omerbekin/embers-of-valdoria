// VALOR göstergesi (Ömer 2026-10-13, form valor/main): düz sayı DEĞİL. Prince of Persia'nın "Sands of Time" tankları gibi ama ortaçağ kor temasında:
// yan yana iki demir mangal, her birinde perBrazier kor (data/valor.json > perBrazier); Valor arttıkça korlar tek tek yanar. Alev + ışıma = diriltme HAZIR:
// yalnızca Valor >= o yerin bedeli iken (savaşta battleCost, savaş dışında outsideCost; Ömer 2026-10-13 form valor2: perBrazier 4 / savaş bedeli 6 iken
// "dolu mangal = hazır" yanıltıyordu). Savaşta mangallarda bedel korunun altında küçük altın çentik (marker). Reduced motion = titreşim yok. Kodla çizilen piksel art (canvas, NEAREST büyütme), kit diline uygun koyu demir + kor.
// Kullananlar: savaş HUD'ı (global sütunun üstü), sefer haritası (sol üst), Endless kamp / ödül / tüccar (sol üst) + savaş dışı diriltme penceresi.
import type { ValorRules } from '../engine/types';
import { brazierFill } from '../engine/valor';
import { valorRules } from '../engine/content';
import { dismissOnBackdrop } from './backdrop';
import { lockInput, unlockInput } from './input-lock';
import { closeDom } from './motion';
import { reducedMotion } from './motion-pref';
import { uiSound, worldSound } from './ui-sound';
import './valor.css';

/** Tek mangalın piksel ızgarası (genişlik x yükseklik) ve iki mangal arası boşluk. */
const BW = 21;
const BH = 31;
const GAP = 5;

const PAL = {
  ironDark: '#17120e',
  iron: '#2c241d',
  ironMid: '#463a2f',
  ironHi: '#7a6754',
  rivet: '#a58c6c',
  coalDark: '#1f1814',
  coal: '#3a2c24',
  coalHi: '#55443a',
  emberDeep: '#9c2e12',
  ember: '#e0602a',
  emberHi: '#ffb35a',
  emberCore: '#ffe6a0',
  flameOut: '#d9481a',
  flameMid: '#ff9a30',
  flameIn: '#ffd774',
  flameCore: '#fff6d2',
};

/** Korların mangal içindeki yerleri (sol üst piksel; 3x2): altta 3, üstte 2 (yığın). Sıra = yanma sırası. */
const EMBER_SPOTS: Array<[number, number]> = [
  [4, 15],
  [9, 15],
  [14, 15],
  [6, 13],
  [12, 13],
  [9, 11],
];

function px(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string): void {
  c.fillStyle = col;
  c.fillRect(x, y, w, h);
}

/** Demir mangal: kâse (kenar, perçinler), ayak, üç bacak. */
function drawBowl(c: CanvasRenderingContext2D, ox: number): void {
  // kâse kenarı (rim)
  px(c, ox + 1, 17, BW - 2, 1, PAL.ironHi);
  px(c, ox + 0, 18, BW, 2, PAL.ironMid);
  px(c, ox + 0, 18, 1, 2, PAL.ironDark);
  px(c, ox + BW - 1, 18, 1, 2, PAL.ironDark);
  // kâse gövdesi: daralan
  const rows: Array<[number, number]> = [
    [1, BW - 2],
    [2, BW - 4],
    [3, BW - 6],
    [5, BW - 10],
  ];
  rows.forEach(([x, w], i) => {
    px(c, ox + x, 20 + i, w, 1, PAL.iron);
    px(c, ox + x, 20 + i, 1, 1, PAL.ironDark);
    px(c, ox + x + w - 1, 20 + i, 1, 1, PAL.ironDark);
  });
  px(c, ox + 2, 20, BW - 4, 1, PAL.ironMid);
  // perçinler
  for (const rx of [4, 10, 16]) px(c, ox + rx, 21, 1, 1, PAL.rivet);
  // ayak (stem) ve halka
  px(c, ox + 9, 24, 3, 2, PAL.iron);
  px(c, ox + 8, 26, 5, 1, PAL.ironMid);
  // üç bacak (tripod)
  const legs: Array<Array<[number, number]>> = [
    [
      [8, 27],
      [7, 28],
      [6, 29],
      [5, 30],
    ],
    [
      [10, 27],
      [10, 28],
      [10, 29],
      [10, 30],
    ],
    [
      [12, 27],
      [13, 28],
      [14, 29],
      [15, 30],
    ],
  ];
  for (const leg of legs) for (const [x, y] of leg) px(c, ox + x, y, 1, 1, y === 30 ? PAL.ironHi : PAL.iron);
  px(c, ox + 4, 30, 2, 1, PAL.ironMid);
  px(c, ox + 15, 30, 2, 1, PAL.ironMid);
}

/** Tek kor (3x2 + üst ışık pikseli): yanmamış = kömür; yanan = kor; `flash` = yeni tutuşan (beyaz-sarı). */
function drawEmber(c: CanvasRenderingContext2D, x: number, y: number, state: 'off' | 'on' | 'flash', shimmer: number): void {
  if (state === 'off') {
    px(c, x, y, 3, 2, PAL.coal);
    px(c, x, y + 1, 3, 1, PAL.coalDark);
    px(c, x + 1, y, 1, 1, PAL.coalHi);
    return;
  }
  if (state === 'flash') {
    px(c, x, y, 3, 2, PAL.emberHi);
    px(c, x + 1, y, 1, 1, PAL.flameCore);
    px(c, x, y + 1, 1, 1, PAL.emberCore);
    px(c, x + 2, y + 1, 1, 1, PAL.emberCore);
    return;
  }
  px(c, x, y, 3, 2, PAL.ember);
  px(c, x, y + 1, 3, 1, PAL.emberDeep);
  px(c, x + (shimmer % 3), y, 1, 1, PAL.emberHi);
}

/** Dolu mangalın alevi: üç dil, `f` karesine göre hafif oynar (f sabit = durağan). */
function drawFlame(c: CanvasRenderingContext2D, ox: number, f: number): void {
  const sway = [0, 1, 0, -1][f % 4]!;
  const tall = [0, 1, 2, 1][f % 4]!;
  const tongue = (cx: number, top: number, w: number, s: number): void => {
    for (let y = top; y < 13; y++) {
      const k = (y - top) / Math.max(1, 13 - top);
      const half = Math.max(0, Math.round((w / 2) * Math.min(1, k * 1.4)));
      const x = cx + (y < top + 3 ? s : 0);
      px(c, ox + x - half, y, half * 2 + 1, 1, PAL.flameOut);
      if (half >= 1) px(c, ox + x - half + 1, y, Math.max(1, half * 2 - 1), 1, PAL.flameMid);
      if (half >= 2 && y > top + 2) px(c, ox + x - half + 2, y, Math.max(1, half * 2 - 3), 1, PAL.flameIn);
    }
    px(c, ox + cx + s, top, 1, 1, PAL.flameIn);
  };
  tongue(10, 2 - tall, 6, sway);
  tongue(6, 6 + (f % 2), 4, -sway);
  tongue(14, 6 + ((f + 1) % 2), 4, sway);
  px(c, ox + 10, 10, 1, 2, PAL.flameCore);
}

/** Dolu mangalın piksel halesi (iki halka; kit paletinde sıcak kor). */
function drawGlow(c: CanvasRenderingContext2D, ox: number, strength: number): void {
  const a = Math.max(0, Math.min(1, strength));
  c.save();
  c.globalAlpha = 0.16 * a;
  c.fillStyle = PAL.ember;
  c.fillRect(ox - 1, 1, BW + 2, 20);
  c.globalAlpha = 0.14 * a;
  c.fillRect(ox + 2, -1, BW - 4, 24);
  c.restore();
}

export interface PaintOpts {
  /** Alev / kor titreşim karesi (sabit = durağan). */
  frame?: number;
  /** Yeni tutuşan kor (genel kor sırası 0..cap-1): beyaz-sarı parlar. */
  flash?: number;
  /** Dolu mangal ışıması (0-1). */
  glow?: number;
  /** Diriltme eşiği: Valor >= readyAt iken dolu mangallar alev alır ve ışır (yoksa perBrazier = her dolu mangal). */
  readyAt?: number;
  /** Bu kor sayısında (1..cap) mangalın gövdesine küçük çentik (savaşta battleCost); yoksa çentik yok. */
  marker?: number;
}

/** Bedel çentiği: korun altında, kâse gövdesinde dikey altın çizgi (koyu kenarlı); eşik dolunca kor rengine döner. */
function drawMarker(c: CanvasRenderingContext2D, x: number, lit: boolean): void {
  px(c, x - 1, 20, 3, 4, PAL.ironDark);
  px(c, x, 20, 1, 4, lit ? PAL.emberHi : '#e8c47e');
  px(c, x, 20, 1, 1, lit ? PAL.flameCore : '#fff0c0');
}

/** Tuval boyutu (piksel ızgarası): mangal sayısı = ceil(cap / perBrazier). */
export function canvasSize(rules: ValorRules = valorRules): { w: number; h: number; braziers: number } {
  const n = brazierFill(rules, 0).embers.length;
  return { w: n * BW + (n - 1) * GAP, h: BH, braziers: n };
}

/** Mangalları çizer (tuval canvasSize boyunda, piksel ızgarası 1:1; büyütme CSS'te NEAREST). */
export function paintBraziers(c: CanvasRenderingContext2D, valor: number, rules: ValorRules = valorRules, o: PaintOpts = {}): void {
  const { w, h } = canvasSize(rules);
  c.clearRect(0, 0, w, h);
  const fill = brazierFill(rules, valor);
  const per = Math.max(1, rules.perBrazier);
  const spots = EMBER_SPOTS.slice(0, per);
  const f = o.frame ?? 0;
  const ready = valor >= (o.readyAt ?? per);
  const mk = o.marker !== undefined && o.marker >= 1 && o.marker <= rules.cap ? o.marker - 1 : -1;
  fill.embers.forEach((lit, i) => {
    const ox = i * (BW + GAP);
    const full = lit >= per && ready;
    if (full) drawGlow(c, ox, o.glow ?? 1);
    drawBowl(c, ox);
    if (mk >= 0 && Math.floor(mk / per) === i) drawMarker(c, ox + spots[mk % per]![0] + 1, ready);
    spots.forEach(([x, y], k) => {
      const idx = i * per + k;
      drawEmber(c, ox + x, y + 1, o.flash === idx ? 'flash' : k < lit ? 'on' : 'off', f + k);
    });
    if (full) drawFlame(c, ox, f);
  });
}

/** Tek dolu mangal ikonu (savaş HUD'ındaki Revive düğmesi; durağan kare). `lit` = alevli (diriltme hazır), değilse yalnızca korlar. Önbellekli data URL. */
const iconCache = new Map<boolean, string>();
export function brazierIconUrl(lit = true): string {
  const hit = iconCache.get(lit);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas');
  cv.width = BW + 4;
  cv.height = BH + 2;
  const c = cv.getContext('2d');
  if (!c) return '';
  c.translate(2, 2);
  const one: ValorRules = { ...valorRules, cap: valorRules.perBrazier };
  paintBraziers(c, one.cap, one, { frame: 0, readyAt: lit ? one.cap : one.cap + 1 });
  const url = cv.toDataURL();
  iconCache.set(lit, url);
  return url;
}

/** Ekrana göre kısa açıklama (İngilizce, sade). */
export function valorTip(valor: number, where: 'battle' | 'map' | 'camp', rules: ValorRules = valorRules): { title: string; rows: string[] } {
  const ready = valor >= rules.revive.battleCost;
  const flawless = rules.earn.flawless > 0 ? `, +${rules.earn.flawless} if no hero falls` : '';
  const rows = [
    `Valor: ${valor} of ${rules.cap} embers. Win battles to light more (+${rules.earn.win}, +${rules.earn.elite} elite, +${rules.earn.boss} boss${flawless}).`,
    `In battle, ${rules.revive.battleCost} embers (the gold notch) raise a fallen ally with ${Math.round(rules.revive.hpRatio * 100)}% HP. It uses the turn.`,
    `Outside battle a revive costs only ${rules.revive.outsideCost} embers.`,
  ];
  if (where === 'battle') rows.push(ready ? 'Use Revive next to Rest / Skip / Move.' : `Not enough for a revive yet (${rules.revive.battleCost} needed).`);
  else rows.push(valor >= rules.revive.outsideCost ? 'Tap the braziers to revive a fallen hero.' : `A revive needs ${rules.revive.outsideCost} embers.`);
  return { title: 'Valor', rows };
}

export interface MeterOptions {
  /** Piksel büyütmesi (CSS px / ızgara pikseli). */
  scale?: number;
  /** Altında küçük "VALOR" yazısı. */
  label?: boolean;
  /** Tıklanınca (savaş dışı diriltme penceresi); yoksa yalnızca ipucu. */
  onClick?: () => void;
  /** Kendi ipucu kutusu (harita / Endless); savaş HUD'ı kendi ipucu sistemini kullanır. */
  where?: 'battle' | 'map' | 'camp';
  selfTip?: boolean;
  /** Diriltme eşiği (alev + ışıma + VALOR yazısı kor rengi): savaşta battleCost; varsayılan savaş dışı outsideCost. */
  readyAt?: number;
  /** Bedel çentiği (kor sayısı; savaş HUD'ı battleCost verir). */
  marker?: number;
}

/**
 * Valor göstergesi (DOM): tuval + isteğe bağlı etiket. `set(v, animate)`: animate = önceki değerden korlar tek tek tutuşur (kazanç) ya da söner
 * (harcama). Titreşim yalnızca dolu mangal varken ~8 kare/sn (Reduced motion: hiç).
 */
export class ValorMeter {
  readonly el: HTMLElement;
  private readonly cv: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private value = 0;
  private shown = 0;
  private flash: number | undefined;
  private frame = 0;
  private raf = 0;
  private last = 0;
  private queue: number[] = [];
  private stepAt = 0;
  private tipEl: HTMLElement | null = null;
  private destroyed = false;

  constructor(private readonly o: MeterOptions = {}) {
    const { w, h } = canvasSize();
    const s = o.scale ?? 3;
    this.el = document.createElement(o.onClick ? 'button' : 'div');
    this.el.className = `vl-meter${o.onClick ? ' vl-click' : ''}`;
    if (o.onClick) (this.el as HTMLButtonElement).type = 'button';
    this.cv = document.createElement('canvas');
    this.cv.className = 'vl-cv';
    this.cv.width = w;
    this.cv.height = h;
    this.cv.style.width = `${w * s}px`;
    this.cv.style.height = `${h * s}px`;
    this.ctx = this.cv.getContext('2d');
    this.el.append(this.cv);
    if (o.label) {
      const l = document.createElement('span');
      l.className = 'vl-lbl';
      l.textContent = 'Valor';
      this.el.append(l);
    }
    if (o.onClick) {
      this.el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideTip();
        o.onClick!();
      });
      this.el.addEventListener('mouseup', (e) => e.preventDefault());
    }
    if (o.selfTip) {
      this.el.addEventListener('pointerenter', (e) => e.pointerType !== 'touch' && this.showTip());
      this.el.addEventListener('pointerleave', () => this.hideTip());
    }
    this.paint();
  }

  get current(): number {
    return this.value;
  }

  /** Değeri ayarlar; `animate` (ve Reduced motion kapalı) ise korlar tek tek değişir. */
  set(v: number, animate = false): void {
    const to = Math.max(0, Math.floor(v));
    const from = this.queue.length ? this.queue[this.queue.length - 1]! : this.shown;
    // Süren animasyon aynı hedefe gidiyorsa (HUD her olayda yeniden yazar) bölünmez
    if (!animate && to === from && to === this.value) return;
    this.value = to;
    this.el.setAttribute('aria-label', `Valor ${to} of ${valorRules.cap}`);
    if (!animate || reducedMotion() || to === from) {
      this.queue = [];
      this.flash = undefined;
      this.shown = to;
      this.paint();
      this.tick();
      return;
    }
    const dir = to > from ? 1 : -1;
    for (let k = from + dir; dir > 0 ? k <= to : k >= to; k += dir) this.queue.push(k);
    this.stepAt = performance.now() + 180;
    this.tick();
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.hideTip();
    this.el.remove();
  }

  showTip(): void {
    if (this.tipEl || !this.o.where) return;
    const t = valorTip(this.value, this.o.where);
    const tip = document.createElement('div');
    tip.className = 'el-tip vl-tip';
    const b = document.createElement('b');
    b.textContent = t.title;
    tip.append(b);
    for (const r of t.rows) {
      const d = document.createElement('div');
      d.textContent = r;
      tip.append(d);
    }
    document.body.append(tip);
    const r = this.el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.max(8, Math.min(window.innerWidth - tw - 8, r.left))}px`;
    tip.style.top = `${r.bottom + 8}px`;
    this.tipEl = tip;
  }

  hideTip(): void {
    this.tipEl?.remove();
    this.tipEl = null;
  }

  private paint(): void {
    if (!this.ctx) return;
    paintBraziers(this.ctx, this.shown, valorRules, {
      frame: reducedMotion() ? 0 : this.frame,
      ...(this.flash !== undefined ? { flash: this.flash } : {}),
      glow: reducedMotion() ? 0.9 : 0.75 + 0.25 * Math.abs(Math.sin(this.frame * 0.7)),
      readyAt: this.readyAt,
      ...(this.o.marker !== undefined ? { marker: this.o.marker } : {}),
    });
    this.el.classList.toggle('vl-ready', this.isReady());
  }

  private get readyAt(): number {
    return this.o.readyAt ?? valorRules.revive.outsideCost;
  }

  /** Diriltme hazır görünümü (alev + titreşim): gösterilen Valor eşikte ve en az bir mangal dolu. */
  private isReady(): boolean {
    return this.shown >= this.readyAt && brazierFill(valorRules, this.shown).ready > 0;
  }

  /** Kare döngüsü: kuyruk varken her ~180 ms bir kor; dolu mangal varken ~8 kare/sn titreşim; ikisi de yoksa durur. */
  private tick = (): void => {
    cancelAnimationFrame(this.raf);
    if (this.destroyed) return;
    const flicker = !reducedMotion() && this.isReady();
    if (!this.queue.length && !flicker && this.flash === undefined) return;
    this.raf = requestAnimationFrame((now) => {
      if (this.destroyed) return;
      let dirty = false;
      // Gizliyken (üstte pencere: Spoils vb.) kazanç animasyonu bekler; görünür olunca korlar tutuşur
      if (this.queue.length && this.el.hidden) this.stepAt = now + 450;
      if (this.queue.length && now >= this.stepAt) {
        const next = this.queue.shift()!;
        const up = next > this.shown;
        this.flash = up ? next - 1 : undefined;
        this.shown = next;
        this.stepAt = now + 200;
        if (up) worldSound('ember_ignite'); // kor tutuşur: çakmak sürtmesi + alev + çıtırtı (data/audio-world.json)
        dirty = true;
      } else if (this.flash !== undefined && now >= this.stepAt - 90) {
        this.flash = undefined;
        dirty = true;
      }
      if (flicker && now - this.last > 120) {
        this.last = now;
        this.frame = (this.frame + 1) % 12;
        dirty = true;
      }
      if (dirty) this.paint();
      this.tick();
    });
  };
}

// ---------------------------------------------------------------- savaş dışı diriltme penceresi

export interface ValorReviveHero {
  id: string;
  name: string;
  sub?: string;
  portraitUrl?: string;
}

export interface ValorReviveOptions {
  valor: () => number;
  fallen: () => ValorReviveHero[];
  /** Diriltir; olmadıysa nedeni (toast yerine pencerede). */
  revive: (heroId: string) => string | null;
  onClose?: () => void;
  where: 'map' | 'camp';
}

let openDialog: HTMLElement | null = null;

/**
 * Savaş dışı Valor diriltmesi (kit Diyalog çerçevesi: kararan zemin + ortada panel, Close + Esc + zemine dokunma): üstte mangallar, altta düşmüş
 * kahramanlar ve "Revive · 4" düğmeleri. Diriltilen satır kaybolur, mangallar sönerek azalır.
 */
export function openValorRevive(o: ValorReviveOptions): void {
  if (openDialog) return;
  const root = document.getElementById('ui-root') ?? document.body;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const overlay = el('div', 'el-dialog el-modal vl-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Valor');
  const panel = el('div', 'el-panel corners el-modal-panel vl-panel');
  const title = el('h2', 'el-title vl-title', 'Valor');
  const meter = new ValorMeter({ scale: 4 });
  meter.set(o.valor());
  const note = el('p', 'vl-note');
  const list = el('div', 'vl-list');
  const msg = el('p', 'vl-msg');
  const row = el('div', 'el-row');
  const close = el('button', 'el-btn primary', 'Close');
  close.type = 'button';
  row.append(close);
  const meterBox = el('div', 'vl-meter-box');
  meterBox.append(meter.el);
  panel.append(title, meterBox, note, list, msg, row);
  overlay.append(panel);
  const cost = valorRules.revive.outsideCost;
  const render = (): void => {
    const v = o.valor();
    const heroes = o.fallen();
    note.textContent = heroes.length
      ? `Spend ${cost} embers to raise a fallen hero with ${Math.round(valorRules.revive.hpRatio * 100)}% HP. Outside battle a revive is cheaper than in battle (${valorRules.revive.battleCost}).`
      : 'No hero has fallen. Keep your embers for the battles ahead.';
    list.replaceChildren(
      ...heroes.map((h) => {
        const r = el('div', 'vl-row');
        if (h.portraitUrl) {
          const img = el('img', 'vl-face');
          img.src = h.portraitUrl;
          img.alt = '';
          img.draggable = false;
          r.append(img);
        }
        const txt = el('div', 'vl-who');
        txt.append(el('span', 'vl-name', h.name), el('span', 'vl-sub', h.sub ?? 'Fallen'));
        const b = el('button', 'el-btn vl-go', `Revive · ${cost}`);
        b.type = 'button';
        b.disabled = v < cost;
        b.title = v < cost ? `Needs ${cost} Valor (you have ${v})` : `Spend ${cost} Valor`;
        b.addEventListener('click', () => {
          const why = o.revive(h.id);
          if (why) {
            msg.textContent = why;
            uiSound('error');
            return;
          }
          uiSound('confirm');
          msg.textContent = `${h.name} rises again.`;
          meter.set(o.valor(), true);
          render();
        });
        r.append(txt, b);
        return r;
      }),
    );
  };
  render();

  let closing = false;
  const finish = (): void => {
    if (closing) return;
    closing = true;
    window.removeEventListener('keydown', onKey, true);
    offBackdrop();
    closeDom(overlay, () => {
      meter.destroy();
      overlay.remove();
      openDialog = null;
      unlockInput('valor');
      o.onClose?.();
    });
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === '`' || e.key === 'F2') return;
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    }
  };
  const offBackdrop = dismissOnBackdrop(overlay, panel, finish);
  close.addEventListener('click', finish);
  window.addEventListener('keydown', onKey, true);
  overlay.addEventListener('mouseup', (e) => e.preventDefault());
  root.append(overlay);
  openDialog = overlay;
  lockInput('valor');
  uiSound('open');
}

export const isValorReviveOpen = (): boolean => !!openDialog;

/** Son gösterilen Valor (bağlam başına): ekrana dönüşte artış varsa korlar tek tek tutuşur (zafer sonrası kazanç animasyonu). */
const lastShown = new Map<string, number>();
export function rememberShown(key: string, v: number): number | undefined {
  const prev = lastShown.get(key);
  lastShown.set(key, v);
  return prev;
}

/** Başka bir DOM penceresi (Gear, tüccar, Settings, Menu...) görünür mü: mangallar o sırada gizlenir. */
export function otherDialogOpen(): boolean {
  return [...document.querySelectorAll<HTMLElement>('#ui-root .el-modal:not(.vl-overlay), #ui-root .gr-overlay')].some((e) => !e.hidden && e.getClientRects().length > 0);
}
