// VALOR göstergesi (Ömer 2026-10-13, form valor/main): düz sayı DEĞİL. Prince of Persia'nın "Sands of Time" tankları gibi ama ortaçağ kor temasında:
// yan yana iki demir mangal, her birinde perBrazier kor (data/valor.json > perBrazier); Valor arttıkça korlar tek tek yanar. Alev + ışıma = diriltme HAZIR:
// yalnızca Valor >= o yerin bedeli iken (savaşta battleCost, savaş dışında outsideCost; Ömer 2026-10-13 form valor2: "dolu mangal = hazır" yanıltıyordu).
// Savaşta bedel korunun mangalının altında küçük altın çentik (marker). Reduced motion = titreşim yok.
// Görseller boyalı (Ömer 2026-10-14): assets/valor/brazier-0..4.webp (yanan kor sayısı) + brazier-ready.webp (alevli; kâse kutusunun üstüne taşar),
// kesim `node tools/make-valor-icons.mjs` (asıl assets/source/valor/brazier-sheet.png). Yumuşak ölçek; boyut CSS'te (--vl-h = kâse yüksekliği).
// Kullananlar: savaş HUD'ı (global sütunun sağı), sefer haritası ve Endless kamp / ödül / tüccar (üst bant, `.vl-corner`) + savaş dışı diriltme penceresi.
import type { ValorRules } from '../engine/types';
import { brazierFill } from '../engine/valor';
import { valorRules } from '../engine/content';
import { dismissOnBackdrop } from './backdrop';
import { lockInput, unlockInput } from './input-lock';
import { closeDom } from './motion';
import { reducedMotion } from './motion-pref';
import { uiSound, worldSound } from './ui-sound';
import './valor.css';

const FILES = import.meta.glob('../../assets/valor/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const fileUrl = (name: string): string => FILES[`../../assets/valor/${name}.webp`] ?? '';

/** Mangal kareleri: kor sayısı (0..4) -> görsel adı; alevli (diriltme hazır) kare ayrı. */
export const BRAZIER_FRAMES = ['brazier-0', 'brazier-1', 'brazier-2', 'brazier-3', 'brazier-4'] as const;
export const BRAZIER_READY = 'brazier-ready';

/** Görsel adresi (yoksa boş: gösterge yine çalışır, mangal yeri boş kalır). */
export function brazierUrl(name: string): string {
  return fileUrl(name);
}

/** Bir mangalın görünümü: kor sayısına göre kare (perBrazier 4'ten farklıysa orana çevrilir), alev yalnızca hazırken. */
export interface BrazierLook {
  frame: (typeof BRAZIER_FRAMES)[number];
  lit: number;
  ready: boolean;
}

/** Saf: Valor -> mangal başına görünüm (`readyAt` = diriltme eşiği; dolu mangal alevi yalnızca Valor >= readyAt iken). */
export function brazierLooks(valor: number, rules: ValorRules = valorRules, readyAt: number = rules.perBrazier): BrazierLook[] {
  const per = Math.max(1, rules.perBrazier);
  const max = BRAZIER_FRAMES.length - 1;
  const ready = valor >= readyAt;
  return brazierFill(rules, valor).embers.map((lit) => {
    const k = per === max ? lit : lit >= per ? max : Math.min(max - 1, Math.ceil((lit / per) * max));
    return { frame: BRAZIER_FRAMES[Math.max(0, Math.min(max, k))]!, lit, ready: lit >= per && ready };
  });
}

/** Tek dolu mangal ikonu (savaş HUD'ındaki Revive düğmesi, ipucu başlığı). `lit` = alevli (diriltme hazır), değilse dolu kor karesi. */
export function brazierIconUrl(lit = true): string {
  return fileUrl(lit ? BRAZIER_READY : BRAZIER_FRAMES[BRAZIER_FRAMES.length - 1]!);
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
  /** Kâse yüksekliği (CSS px); verilmezse yerleşim sınıfının boyu (valor.css > --vl-h). */
  size?: number;
  /** Küçük "VALOR" yazısı (mangalların yanında). */
  label?: boolean;
  /** Tıklanınca (savaş dışı diriltme penceresi); yoksa yalnızca ipucu. */
  onClick?: () => void;
  /** Kendi ipucu kutusu (harita / Endless); savaş HUD'ı kendi ipucu sistemini kullanır. */
  where?: 'battle' | 'map' | 'camp';
  selfTip?: boolean;
  /** Diriltme eşiği (alev + ışıma + VALOR yazısı kor rengi): savaşta battleCost; varsayılan savaş dışı outsideCost. */
  readyAt?: number;
  /** Bedel çentiği (kor sayısı; savaş HUD'ı battleCost verir): o korun mangalının altında küçük altın çentik. */
  marker?: number;
}

/**
 * Valor göstergesi (DOM): iki boyalı mangal + isteğe bağlı etiket. `set(v, animate)`: animate = önceki değerden korlar tek tek tutuşur (kazanç)
 * ya da söner (harcama); yeni tutuşan korun mangalı kısa parlar. Alev titreşimi CSS'te (Reduced motion: yok).
 */
export class ValorMeter {
  readonly el: HTMLElement;
  private readonly cells: Array<{ box: HTMLElement; img: HTMLImageElement; frame: string }> = [];
  private value = 0;
  private shown = 0;
  private flash: number | undefined;
  private raf = 0;
  private queue: number[] = [];
  private stepAt = 0;
  private tipEl: HTMLElement | null = null;
  private destroyed = false;

  constructor(private readonly o: MeterOptions = {}) {
    this.el = document.createElement(o.onClick ? 'button' : 'div');
    this.el.className = `vl-meter${o.onClick ? ' vl-click' : ''}`;
    if (o.size) this.el.style.setProperty('--vl-h', `${o.size}px`);
    if (o.onClick) (this.el as HTMLButtonElement).type = 'button';
    const row = document.createElement('span');
    row.className = 'vl-brs';
    const n = brazierFill(valorRules, 0).embers.length;
    const per = Math.max(1, valorRules.perBrazier);
    const mk = o.marker !== undefined && o.marker >= 1 && o.marker <= valorRules.cap ? o.marker - 1 : -1;
    const img = (cls: string, src = ''): HTMLImageElement => {
      const e = document.createElement('img');
      e.className = cls;
      e.alt = '';
      e.draggable = false;
      if (src) e.src = src;
      return e;
    };
    for (let i = 0; i < n; i++) {
      const box = document.createElement('span');
      box.className = 'vl-br';
      const base = img('vl-img');
      // alevli kare hep yerinde (önceden yüklü), yalnızca hazırken görünür: kâseyle aynı taban, yukarı taşar
      box.append(base, img('vl-flame', fileUrl(BRAZIER_READY)));
      if (mk >= 0 && Math.floor(mk / per) === i) {
        // bedel çentiği: o korun mangal içindeki sırası kadar soldan (kâse genişliğinin orta %60'ında)
        const notch = document.createElement('i');
        notch.className = 'vl-notch';
        notch.style.left = `${20 + (60 * ((mk % per) + 0.5)) / per}%`;
        box.append(notch);
      }
      row.append(box);
      this.cells.push({ box, img: base, frame: '' });
    }
    this.el.append(row);
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
    const per = Math.max(1, valorRules.perBrazier);
    brazierLooks(this.shown, valorRules, this.readyAt).forEach((look, i) => {
      const c = this.cells[i];
      if (!c) return;
      if (c.frame !== look.frame) {
        c.frame = look.frame;
        const url = fileUrl(look.frame);
        if (url) c.img.src = url;
      }
      c.box.classList.toggle('on', look.ready);
      c.box.classList.toggle('vl-flash', this.flash !== undefined && Math.floor(this.flash / per) === i);
    });
    this.el.classList.toggle('vl-ready', this.isReady());
  }

  private get readyAt(): number {
    return this.o.readyAt ?? valorRules.revive.outsideCost;
  }

  /** Diriltme hazır görünümü (alev + ışıma): gösterilen Valor eşikte ve en az bir mangal dolu. */
  private isReady(): boolean {
    return this.shown >= this.readyAt && brazierFill(valorRules, this.shown).ready > 0;
  }

  /** Kare döngüsü: kuyruk varken her ~200 ms bir kor (tutuşan korun mangalı kısa parlar); kuyruk bitince durur. */
  private tick = (): void => {
    cancelAnimationFrame(this.raf);
    if (this.destroyed) return;
    if (!this.queue.length && this.flash === undefined) return;
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
      } else if (this.flash !== undefined && now >= this.stepAt - 60) {
        this.flash = undefined;
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
  const meter = new ValorMeter({ size: 64 });
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
