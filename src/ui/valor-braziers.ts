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
import { bandTipEl, type BandTipSpec } from './band-tip';
import { BurnEdge } from './valor-fire';
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
    // Valor ile yara silme (Ömer 2026-10-26): yalnız sefer haritasında
    ...(where === 'map' && rules.woundHeal ? [`On the map, ${rules.woundHeal.outsideCost} embers also heal one wound of a living hero.`] : []),
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
  /** Yalnızca bu sıradaki mangalı çizer (Valor penceresi: sol ve sağ mangal ayrı yerde); verilmezse ikisi birden. */
  only?: number;
}

/**
 * Valor göstergesi (DOM): iki boyalı mangal + isteğe bağlı etiket. `set(v, animate)`: animate = önceki değerden korlar tek tek tutuşur (kazanç)
 * ya da söner (harcama); yeni tutuşan korun mangalı kısa parlar. Alev titreşimi CSS'te (Reduced motion: yok).
 */
export class ValorMeter {
  readonly el: HTMLElement;
  private readonly cells: Array<{ box: HTMLElement; img: HTMLImageElement; frame: string } | undefined> = [];
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
      if (o.only !== undefined && o.only !== i) continue;
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
      this.cells[i] = { box, img: base, frame: '' };
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

/** Yaralı yaşayan kahraman (Wounds bölümü): `blocked` = yara silinemiyorsa İngilizce neden (state.valorWoundHealBlocked). */
export interface ValorWoundedHero {
  id: string;
  name: string;
  wounds: number;
  blocked: string | null;
  portraitUrl?: string;
}

/** Saf: Wounds satırı düğmesi (etiket, pasif mi, ipucu). Bedel yoksa (kural kapalı) null. */
/**
 * Heal wound tıklamasının sonucu: null = başarı (pencere yenilenir), metin = hata. `heal` null döndürünce başarıdır; eski `heal?.(id) ?? '...'`
 * null'ı hataya çeviriyordu: Valor harcanıp yara silindiği hâlde pencere "Cannot heal here" gösterip yenilenmiyordu (Ömer 2026-10-28).
 */
export function woundHealOutcome(heal: ((heroId: string) => string | null) | undefined, heroId: string): string | null {
  return heal ? heal(heroId) : 'Cannot heal here';
}

export function woundHealButton(h: Pick<ValorWoundedHero, 'name' | 'blocked'>, cost: number | null): { label: string; disabled: boolean; tip: string } | null {
  if (cost === null) return null;
  return { label: `Heal wound · ${cost}`, disabled: h.blocked !== null, tip: h.blocked ?? `Spend ${cost} embers to heal one wound of ${h.name}.` };
}

export interface ValorReviveOptions {
  valor: () => number;
  fallen: () => ValorReviveHero[];
  /** Yaralı yaşayan aktif kahramanlar (yoksa bölüm gizli). */
  wounded?: () => ValorWoundedHero[];
  /** Bir yara siler; olmadıysa nedeni. */
  heal?: (heroId: string) => string | null;
  /** Diriltir; olmadıysa nedeni (toast yerine pencerede). */
  revive: (heroId: string) => string | null;
  onClose?: () => void;
  where: 'map' | 'camp';
}

let openDialog: HTMLElement | null = null;

/** Basılı tutma süresi (ms): sancak yanarken bırakılırsa diriltme iptal. */
const HOLD_MS = 900;

const CROSS_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M6 9h12"/></svg>';

/**
 * Savaş dışı Valor diriltmesi, "Nöbet" düzeni (Ömer 2026-10-19; taslak public/mockups/valor-v4.html #v1): iki yanda büyük mangal, ortada bir
 * çubuktan asılı düşmüş kahraman sancakları. Sancağa ~0.9 sn BASILI TUT (fare / dokunma; Enter / Boşluk anında): düzensiz bir yanma çizgisi
 * alttan yükselir, dolunca kahraman diriltilir; erken bırakılırsa iptal. Kurallar aynı: bedel outsideCost, dönüş hpRatio; Valor yetmezse
 * sancak soluk ve basınca neden pencerede yazar; kimse düşmediyse boş çubuk. Close + Esc + zemine dokunma.
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
  const cost = valorRules.revive.outsideCost;
  const hpPct = Math.round(valorRules.revive.hpRatio * 100);
  const overlay = el('div', 'el-dialog el-modal vl-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Valor');
  const sparks = el('div', 'vz-sparks');
  for (let i = 0; i < 16; i++) {
    const sp = el('i', '');
    sp.style.cssText = `left:${(i * 37 + 11) % 100}%;animation-delay:${-((i * 53) % 90) / 10}s;animation-duration:${7 + (i % 5)}s;--dx:${((i * 29) % 40) - 20}px`;
    sparks.append(sp);
  }
  const panel = el('div', 'el-modal-panel vg');
  const title = el('h2', 'el-title vg-title', 'Valor');
  const row = el('div', 'vg-row');
  const meters = [0, 1].map((only) => new ValorMeter({ only }));
  const tipBox = (spec: BandTipSpec): HTMLElement => {
    const b = el('div', 'vl-tipbox');
    b.append(bandTipEl(spec));
    return b;
  };
  const valorTipBox = (): HTMLElement => {
    const r = valorRules;
    return tipBox({
      kind: 'Outside battle',
      title: 'Valor',
      icon: brazierIconUrl(true),
      value: `${o.valor()}/${r.cap}`,
      valueLabel: 'embers',
      lines: [{ text: `Win battles to light more embers (+${r.earn.win}, +${r.earn.elite} elite, +${r.earn.boss} boss).` }, { text: `A revive costs ${r.revive.outsideCost} embers outside battle and ${r.revive.battleCost} in battle.` }, { text: `The fallen hero rises with ${hpPct}% HP.` }],
    });
  };
  const sideBr = (i: number): HTMLElement => {
    const w = el('div', 'vg-br vl-tw');
    w.append(meters[i]!.el);
    return w;
  };
  const left = sideBr(0);
  const right = sideBr(1);
  const hang = el('div', 'vg-hang');
  const wounds = el('div', 'vg-wounds');
  const count = el('div', 'vg-count');
  const msg = el('span', 'vz-msg');
  const close = el('button', 'el-btn primary', 'Close');
  close.type = 'button';
  const foot = el('div', 'vz-foot');
  foot.append(msg, close);
  row.append(left, hang, right);
  panel.append(title, row, wounds, count, foot);
  overlay.append(sparks, panel);

  let cancelHold: (() => void) | null = null;
  const doRevive = (h: ValorReviveHero): void => {
    const why = o.revive(h.id);
    if (why) {
      msg.textContent = why;
      uiSound('error');
      return;
    }
    uiSound('confirm');
    msg.textContent = `${h.name} rises again.`;
    meters.forEach((m) => m.set(o.valor(), true));
    render();
    (hang.querySelector('.vg-bn') as HTMLElement | null)?.focus({ preventScroll: true });
  };

  const doHeal = (h: ValorWoundedHero): void => {
    const why = woundHealOutcome(o.heal, h.id);
    if (why) {
      msg.textContent = why;
      uiSound('error');
      return;
    }
    uiSound('confirm');
    msg.textContent = `A wound of ${h.name} is healed.`;
    meters.forEach((m) => m.set(o.valor(), true));
    render();
  };
  const woundRow = (h: ValorWoundedHero): HTMLElement => {
    const b = woundHealButton(h, valorRules.woundHeal?.outsideCost ?? null);
    const chip = el('div', 'vg-wd');
    if (h.portraitUrl) {
      const img = el('img', 'pt');
      img.src = h.portraitUrl;
      img.alt = '';
      img.draggable = false;
      chip.append(img);
    }
    const who = el('div', 'who');
    who.append(el('div', 'nm', h.name), el('div', 'wn', `${h.wounds} ${h.wounds === 1 ? 'wound' : 'wounds'}`));
    chip.append(who);
    if (b) {
      const btn = el('button', 'el-btn vg-wbtn', b.label);
      btn.type = 'button';
      btn.title = b.tip;
      btn.setAttribute('aria-label', `${b.label}: ${h.name}. ${b.tip}`);
      btn.disabled = b.disabled;
      btn.addEventListener('click', () => doHeal(h));
      chip.append(btn);
    }
    return chip;
  };

  const banner = (h: ValorReviveHero, v: number): HTMLElement => {
    const can = v >= cost;
    const wrap = el('div', 'vg-bnw vl-tw');
    wrap.append(el('span', 'rope'));
    const bn = el('div', `vg-bn${can ? ' can' : ''}`);
    bn.tabIndex = 0;
    bn.setAttribute('role', 'button');
    bn.setAttribute('aria-label', can ? `Revive ${h.name}: hold, or press Enter` : `${h.name}: needs ${cost} embers`);
    bn.style.setProperty('--hold', '0');
    const inner = el('div', 'bn-in');
    const pt = el('div', 'pt');
    if (h.portraitUrl) {
      const img = el('img', '');
      img.src = h.portraitUrl;
      img.alt = '';
      img.draggable = false;
      pt.append(img);
    }
    const cross = el('i', 'cross');
    cross.innerHTML = CROSS_SVG;
    pt.append(cross);
    const pill = el('div', `pill${can ? '' : ' low'}`);
    pill.append(el('i', 'vz-dia'), document.createTextNode(`Revive · ${cost}`));
    const cv = el('canvas', 'fire');
    inner.append(pt, el('div', 'nm', h.name), el('div', 'rl', h.sub ?? 'Fallen'), pill, cv);
    bn.append(inner);
    wrap.append(
      bn,
      tipBox({ kind: 'Revive', title: h.name, icon: h.portraitUrl ?? '', iconShape: 'portrait', value: `${cost}`, valueLabel: 'embers', lines: [{ text: `Rises again with ${hpPct}% HP.` }, { text: can ? 'Hold to revive.' : `Needs ${cost} embers (you have ${v}).` }] }),
    );

    const burn = new BurnEdge(cv, reducedMotion);
    let raf = 0;
    let t0 = 0;
    const stop = (): void => {
      cancelAnimationFrame(raf);
      raf = 0;
      burn.clear();
      bn.style.setProperty('--hold', '0');
      bn.classList.remove('holding');
      if (cancelHold === stop) cancelHold = null;
    };
    const step = (now: number): void => {
      const p = Math.min(1, (now - t0) / HOLD_MS);
      bn.style.setProperty('--hold', String(p));
      burn.draw(p, now);
      if (p >= 1) {
        raf = 0;
        cancelHold = null;
        doRevive(h);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    const needs = (): void => {
      msg.textContent = `${h.name} needs ${cost} embers (you have ${o.valor()}).`;
      uiSound('error');
    };
    bn.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      if (o.valor() < cost) return needs();
      if (raf) return;
      try {
        bn.setPointerCapture(e.pointerId);
      } catch {
        /* yakalama yok: pointerleave yine iptal eder */
      }
      msg.textContent = '';
      bn.classList.add('holding');
      t0 = performance.now();
      cancelHold = stop;
      raf = requestAnimationFrame(step);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) bn.addEventListener(ev, () => raf && stop());
    bn.addEventListener('contextmenu', (e) => e.preventDefault());
    bn.addEventListener('keyactivate', () => (o.valor() >= cost ? doRevive(h) : needs()));
    return wrap;
  };

  const render = (): void => {
    cancelHold?.();
    const v = o.valor();
    const heroes = o.fallen();
    meters.forEach((m) => m.set(v));
    left.replaceChildren(meters[0]!.el, valorTipBox());
    right.replaceChildren(meters[1]!.el, valorTipBox());
    count.replaceChildren(el('b', '', `${v}`), document.createTextNode(` / ${valorRules.cap} `), el('span', '', 'embers'));
    hang.classList.toggle('none', heroes.length === 0);
    const bar = el('div', 'vg-bar');
    bar.append(el('i', ''), el('i', ''));
    if (heroes.length) {
      const banners = el('div', 'vg-banners');
      banners.append(...heroes.map((h) => banner(h, v)));
      hang.replaceChildren(bar, banners);
    } else {
      const empty = el('div', 'vg-empty');
      empty.append(el('div', 't1', 'No hero has fallen.'), el('div', 't2', 'Keep your embers for the battles ahead.'));
      hang.replaceChildren(bar, empty);
    }
    const hurt = o.wounded?.() ?? [];
    wounds.hidden = !o.wounded;
    const list = el('div', 'vg-wl');
    list.append(...hurt.map(woundRow));
    wounds.replaceChildren(el('div', 'vg-wt', 'Wounds'), hurt.length ? list : el('div', 'vg-wnone', 'No wounded heroes.'));
    if (overlay.isConnected) fit();
  };
  meters.forEach((m) => m.set(o.valor()));
  /** Pencere ölçeği (--k): sancak sayısı ve ekran boyuna göre; telefon yatay (844x390) dahil her şey sığar. */
  const fit = (): void => {
    const n = Math.max(0, o.fallen().length);
    const needW = (n ? n * 204 + (n - 1) * 26 + 60 : 520) + 2 * 171 + 40;
    const cs = getComputedStyle(overlay);
    const availH = overlay.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    const availW = overlay.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const hurt = o.wounded ? Math.max(1, o.wounded().length) : 0;
    const extra = hurt ? 56 + 54 * Math.ceil(hurt / 3) : 0; // Wounds bölümü: başlık + üçlü satırlar
    const kh = (availH - 100 - extra) / 500;
    const kw = availW / needW;
    overlay.style.setProperty('--k', Math.max(0.4, Math.min(1, kh, kw)).toFixed(3));
  };
  const onResize = (): void => fit();
  window.addEventListener('resize', onResize);
  render();

  let closing = false;
  const finish = (): void => {
    if (closing) return;
    closing = true;
    cancelHold?.();
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onResize);
    offBackdrop();
    closeDom(overlay, () => {
      meters.forEach((m) => m.destroy());
      overlay.remove();
      openDialog = null;
      unlockInput('valor');
      o.onClose?.();
    });
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === '`' || e.key === 'F2') return;
    const a = document.activeElement as HTMLElement | null;
    if ((e.key === 'Enter' || e.key === ' ') && a?.classList.contains('vg-bn')) {
      // klavye: sancak odaktayken Enter / Boşluk anında diriltir (basılı tutma gerekmez)
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) a.dispatchEvent(new Event('keyactivate'));
      return;
    }
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
  overlay.style.setProperty('--fh', `${overlay.offsetHeight || 700}px`);
  fit();
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
