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
