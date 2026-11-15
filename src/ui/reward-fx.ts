/**
 * Ödül anı efektleri (Ömer 2026-11-12, Tur 8: "seviye, ağaç düğümü, item giyme, ganimet, stat puanı"). Demirci animasyonlarıyla (blacksmith-fx.ts)
 * aynı his: kor ışığı + kıvılcım + sayaç, 0,6-1,1 sn, yalnız görünüm; kural eylemden ÖNCE işlenir, efekt yeni çizimin üstünde oynar.
 * Girişi kilitlemez (kıvılcımlar pointer-events: none, ışık Web Animations ile öğenin kendi üstünde). "Reduced motion" (motion-pref.ts) açıkken
 * yalnız ses (seviye atlamada) kalır. Yeni ses dosyası YOK: mevcut WebAudio kimlikleri (ui-sound.ts).
 * Kullanım yerleri: seviye = gear-screen.ts (kahraman seviyesi arttıysa) + loot-screen.ts (XP satırı) + level-banner.ts; ağaç düğümü = tree-tab.ts;
 * item giyme = gear-screen.ts > tryEquip; ganimet = loot-screen.ts > reveal; stat puanı = character-panel.ts. Debug: debug-tools.ts "Reward FX".
 */
import './reward-fx.css';
import { reducedMotion } from './motion-pref';
import { motion } from './motion';
import { worldSound } from './ui-sound';

const NUM = /-?\d+(?:\.\d+)?/;

/** Sayıyı `from` değerinden kendi değerine sayar (ondalık hane yeni değerinkini izler). Demirci ile ortak. */
export function countUp(e: HTMLElement, from: string, dur: number): void {
  const to = e.textContent ?? '';
  const a = Number(from.match(NUM)?.[0]);
  const bm = to.match(NUM);
  const b = Number(bm?.[0]);
  if (!bm || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return;
  const dec = (bm[0].split('.')[1] ?? '').length;
  const t0 = performance.now();
  e.classList.add('bsfx-tick');
  const step = (now: number): void => {
    const k = Math.min(1, (now - t0) / dur);
    const v = a + (b - a) * (1 - Math.pow(1 - k, 3));
    e.textContent = to.replace(NUM, v.toFixed(dec));
    if (k < 1 && e.isConnected) requestAnimationFrame(step);
    else e.textContent = to;
  };
  requestAnimationFrame(step);
}

/** Sınıfı bir kez oynatır ve süre sonunda kaldırır. Demirci ile ortak. */
export function once(e: Element | null, cls: string, ms: number): void {
  if (!e) return;
  e.classList.remove(cls);
  void (e as HTMLElement).offsetWidth;
  e.classList.add(cls);
  window.setTimeout(() => e.classList.remove(cls), ms);
}

/** Kıvılcım demeti: `host` içinde (x, y) noktasından saçılan kor parçaları. `r` = saçılma yarıçapı (px; yoksa CSS varsayılanı). Demirci ile ortak. */
export function sparks(host: HTMLElement, x: number, y: number, n = 14, r?: number): void {
  const box = document.createElement('div');
  box.className = 'rfx-sparks';
  box.style.left = `${x}px`;
  box.style.top = `${y}px`;
  if (r) box.style.setProperty('--r', `${r}px`);
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    const ang = (i / n) * Math.PI * 2 + (i % 2 ? 0.3 : -0.2);
    const d = 0.9 + ((i * 37) % 10) / 10;
    s.style.setProperty('--dx', `${Math.cos(ang) * d}`);
    s.style.setProperty('--dy', `${Math.sin(ang) * d - 0.35}`);
    s.style.animationDelay = `${(i % 4) * 30}ms`;
    box.append(s);
  }
  host.append(box);
  window.setTimeout(() => box.remove(), 1100);
}

/** Öğenin üstünde kor ışığı (parlaklık + sıcak gölge), kendi CSS animasyonlarını ezmez (Web Animations). */
export function glow(e: HTMLElement, ms = 900, strength = 1): void {
  if (!e.animate) return;
  e.animate(
    [
      { filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(255,170,60,0)' },
      { filter: `brightness(${1 + 0.45 * strength}) saturate(1.2)`, boxShadow: `0 0 ${18 * strength}px 2px rgba(255,170,60,0.7)`, offset: 0.16 },
      { filter: 'brightness(1)', boxShadow: '0 0 0 0 rgba(255,170,60,0)' },
    ],
    { duration: ms, easing: 'ease-out' },
  );
}

/** Kıvılcımlar için öğeyi konumlu yapar (zaten absolute/fixed/sticky ise dokunmaz). */
function asHost(e: HTMLElement): void {
  if (getComputedStyle(e).position === 'static') e.style.position = 'relative';
}

/** Öğenin ortasından kıvılcım. */
function burst(e: HTMLElement, n: number, r?: number): void {
  asHost(e);
  sparks(e, e.offsetWidth / 2, e.offsetHeight / 2, n, r);
}

/** Seviye atlama: seviye yazısı kor ışığıyla parlar, kıvılcım saçar; ses her zaman (hareket azaltılmışsa yalnız ses). */
export function playLevelUpFx(target: HTMLElement | null | undefined): void {
  worldSound('ember_ignite');
  if (reducedMotion() || !target) return;
  glow(target, 1100, 1.2);
  burst(target, 18, 70);
}

/** Skill ağacı düğümüne puan / açılma: düğüm parlar, küçük kıvılcım (ses mevcut 'select' sesidir, burada çalmaz). */
export function playNodeFx(node: HTMLElement | null | undefined): void {
  if (reducedMotion() || !node) return;
  glow(node, 800, 1);
  burst(node, 10, 46);
}

/** Item giyme: yuva plakası kor ışığıyla parlar (ses zaten item sesi / 'snap'). */
export function playEquipFx(slot: HTMLElement | null | undefined): void {
  if (reducedMotion() || !slot) return;
  glow(slot, 800, 0.9);
  const m = slot.querySelector<HTMLElement>('.gr-slot-ico, .it-medal, img');
  if (m) {
    asHost(slot);
    const sr = slot.getBoundingClientRect();
    const mr = m.getBoundingClientRect();
    // getBoundingClientRect döndürülmüş sahnede ölçekli olabilir; oran yeterince doğru, kıvılcım küçük
    const k = slot.offsetWidth / (sr.width || 1);
    sparks(slot, (mr.left - sr.left + mr.width / 2) * k, (mr.top - sr.top + mr.height / 2) * k, 10, 40);
  } else burst(slot, 10, 40);
}

/** Ganimet açma / yeni item belirişi: kartlar sırayla (60 ms arayla) kor ışığıyla belirir. */
export function playRevealFx(cells: HTMLElement[]): void {
  if (reducedMotion()) return;
  cells.slice(0, 8).forEach((c, i) =>
    window.setTimeout(() => {
      if (!c.isConnected) return;
      glow(c, 900, 1.1);
      burst(c, 8, 38);
    }, i * 60),
  );
}

/** Stat puanı harcandı: değer kutusu ışıldar, sayı eski değerden yeniye sayar, "+1" noktasından kıvılcım. `from` = eski değer metni. */
export function playStatFx(row: HTMLElement | null | undefined, from?: string): void {
  if (reducedMotion() || !row) return;
  glow(row, 800, 0.8);
  const val = row.querySelector<HTMLElement>('.sh-n');
  if (val && from) countUp(val, from, 600);
  burst(row, 8, 34);
}

// ---- Altın sayacı ve uçuş (Ömer 2026-11-15, Tur 20: a05 / a06 / a13) ----

/** Son gösterilen altın (anahtar = kese yeri: 'gear-purse', 'merchant-purse'); kese yeniden çizilince eski değerden yeniye sayılır. */
const lastGold = new Map<string, number>();
/** Kesenin "şu an gösterilen" değerini önceden ayarlar (ör. ganimet: altın zaten kesede, ekran eski değerden saymaya başlasın). */
export function seedGold(key: string, value: number): void {
  lastGold.set(key, value);
}
/** Anahtarı unutur (yeni oturumda eski değerden saymasın). */
export function forgetGold(key: string): void {
  lastGold.delete(key);
}

/** Altın kutusundaki sayı 500 ms sayaç gibi döner: artışta kısa altın parıltısı, azalışta hafif sönük. Kutu "...sayı" yazan son metin düğümünü kullanır (ikon korunur). */
export function goldCount(chip: HTMLElement, value: number, key: string): void {
  const prev = lastGold.get(key);
  lastGold.set(key, value);
  if (prev === undefined || prev === value || reducedMotion()) return;
  let node: Text | null = null;
  for (const n of Array.from(chip.childNodes)) if (n.nodeType === 3) node = n as Text;
  if (!node) return;
  const t = node;
  const up = value > prev;
  const t0 = performance.now();
  const dur = 500;
  chip.classList.add(up ? 'rfx-gold-up' : 'rfx-gold-down');
  const step = (now: number): void => {
    const k = Math.min(1, (now - t0) / dur);
    const v = Math.round(prev + (value - prev) * (1 - Math.pow(1 - k, 3)));
    if (k < 1 && chip.isConnected) {
      t.nodeValue = (t.nodeValue ?? '').replace(/\d+/, String(v));
      requestAnimationFrame(step);
    } else {
      t.nodeValue = (t.nodeValue ?? '').replace(/\d+/, String(value));
      chip.classList.remove('rfx-gold-up', 'rfx-gold-down');
    }
  };
  requestAnimationFrame(step);
}

export interface FlyOpts {
  ms?: number;
  delay?: number;
  /** Varınca (ya da hareket azaltılmışsa hemen) çağrılır. */
  onLand?: () => void;
}

/**
 * Bir simgeyi (`icon`'un kopyası) `from` dikdörtgeninden `to` öğesine yumuşak yayla uçurur. `host` konumlu olmalı (ekran kaplaması).
 * Reduced motion: uçuş yok, `onLand` hemen. Girişi kilitlemez.
 */
export function flyIcon(host: HTMLElement, from: DOMRect, icon: Element | null, to: HTMLElement | null, o: FlyOpts = {}): void {
  const land = o.onLand ?? ((): void => undefined);
  if (reducedMotion() || !icon || !to || !host.animate) return land();
  const hr = host.getBoundingClientRect();
  const k = host.offsetWidth / (hr.width || 1);
  const tr = to.getBoundingClientRect();
  const clone = icon.cloneNode(true) as HTMLElement;
  clone.classList.add('rfx-fly');
  const w = from.width * k;
  const h = from.height * k;
  clone.style.left = `${(from.left - hr.left) * k}px`;
  clone.style.top = `${(from.top - hr.top) * k}px`;
  clone.style.width = `${w}px`;
  clone.style.height = `${h}px`;
  const dx = (tr.left + tr.width / 2 - (from.left + from.width / 2)) * k;
  const dy = (tr.top + tr.height / 2 - (from.top + from.height / 2)) * k;
  const sc = Math.min(1, Math.max(0.3, (tr.width * k) / (w || 1)));
  host.append(clone);
  const a = clone.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 26 * k}px) scale(${(1 + sc) / 2 + 0.1})`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${sc})`, opacity: 0.9 },
    ],
    { duration: o.ms ?? 320, delay: o.delay ?? 0, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'both' },
  );
  let done = false;
  const end = (): void => {
    if (done) return;
    done = true;
    clone.remove();
    land();
  };
  a.onfinish = end;
  a.oncancel = end;
  window.setTimeout(end, (o.ms ?? 320) + (o.delay ?? 0) + 1200); // gizli sekmede zaman çizelgesi durursa simge takılı kalmasın
}

/** Altın satırından keseye küçük sikke uçurur (300 ms). */
export function coinFly(host: HTMLElement, fromEl: HTMLElement | null, purse: HTMLElement | null, delay = 0): void {
  if (!fromEl || !purse) return;
  const ico = document.createElement('span');
  ico.className = 'rfx-coin';
  const r = fromEl.getBoundingClientRect();
  const s = Math.min(r.height || 18, 22);
  const rect = new DOMRect(r.left + 4, r.top + (r.height - s) / 2, s, s);
  flyIcon(host, rect, ico, purse, { ms: 300, delay, onLand: () => glow(purse, 500, 0.6) });
}

/** Satış: çantadaki öğenin kopyası satıcı listesine doğru söner, sonra kese sikke parıltısı verir. */
export function fadeToward(host: HTMLElement, from: DOMRect | null, icon: Element | null, to: HTMLElement | null, purse: HTMLElement | null): void {
  if (!from) return;
  flyIcon(host, from, icon, to, { ms: 280, onLand: () => purse && glow(purse, 500, 0.7) });
}

/** Kese yetersiz altında 2 kez hafif kızarır (titreme yok). */
export function purseBlush(purse: HTMLElement | null): void {
  if (!purse || reducedMotion() || !purse.animate) return;
  purse.animate(
    [{ color: 'inherit' }, { color: '#ff7a6a', textShadow: '0 0 8px rgba(255,90,70,0.7)' }, { color: 'inherit' }, { color: '#ff7a6a', textShadow: '0 0 8px rgba(255,90,70,0.7)' }, { color: 'inherit' }],
    { duration: 720, easing: 'ease-in-out' },
  );
}

/** Gövde geçişi (Ömer 2026-11-15, a08/a14/a20): yeni içerik 'swap' ön ayarıyla (150 ms, 6 px) yükselerek gelir. Azaltılmış harekette yok. */
export function bodyIn(node: HTMLElement | null | undefined): void {
  if (!node) return;
  node.classList.remove('gr-body-in');
  void node.offsetWidth;
  node.classList.add('gr-body-in');
}

/** Sayfanın şimdiki içeriğinin kopyasını üstüne bırakır; dönen işlev (yeniden çizimden SONRA çağrılır) kopyayı ekleyip söndürür ve kaldırır. */
export function ghostOf(page: HTMLElement | null | undefined): (() => void) | null {
  if (!page || reducedMotion() || !page.firstElementChild || !page.animate) return null;
  const old = page.firstElementChild;
  const g = old.cloneNode(true) as HTMLElement;
  const top = page.scrollTop;
  const w = (old as HTMLElement).offsetWidth;
  return () => {
    if (!page.isConnected) return;
    g.classList.add('gr-ghost');
    g.style.top = `${top}px`;
    g.style.width = `${w}px`;
    if (getComputedStyle(page).position === 'static') page.style.position = 'relative';
    page.append(g);
    const a = g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: motion('swap').ms, easing: 'ease-out', fill: 'forwards' });
    a.onfinish = () => g.remove();
    a.oncancel = () => g.remove();
    window.setTimeout(() => g.remove(), motion('swap').ms + 1200);
  };
}
