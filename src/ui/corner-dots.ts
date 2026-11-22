import './corner-dots.css';
import { CD_BASE, cdCentred, cdTier, cdTierText, type CdPos } from './corner-dots-rule';

/**
 * Köşe süsü işaretleyici (Ömer 2026-11-21, üç nokta). Bugün köşe karosu olan her DOM çerçevesi buradaki listede; kural `corner-dots-rule.ts`,
 * çizim `corner-dots.css`. Yeni karolu çerçeve eklemek yerine yeni çerçeveyi bu listeye yaz (karo çizme).
 * Çalışma: host DOM'a girince ya da boyu değişince kutu ölçülür (offsetWidth / offsetHeight = ölçek öncesi yerleşim birimi; / --cd-u = masaüstü px),
 * data-cd ("k" köşe / "c" ortalı) + --cd-sk (kademe) yazılır. Boyu 0 olan (gizli) host boy gelene kadar işaretsiz kalır.
 * pos 'tr': bugün üst iki köşede karo var (sağ üst); np: telefonda (html.short) bugün karo yok.
 */
export interface CdHost {
  sel: string;
  pos?: CdPos;
  np?: boolean;
}
export const CD_HOSTS: CdHost[] = [
  { sel: '.bp-ico' }, // savaş skill plakası ikonu
  { sel: '.bh-wave' }, // Round etiketi
  { sel: '.bh-gcol', np: true }, // Rest / Skip / Move kutusu (telefonda ikon düğmeleri)
  { sel: '.bh-valor .vl-meter', np: true }, // Valor plakası
  { sel: '.bh-corners:not(:has(> .bt))', pos: 'tr' }, // savaş log paneli (ipucu içerenlerin karosu zaten yoktu)
  { sel: '.bt' }, // Band ipucu (skill / item / birim ipucu)
  { sel: '.el-panel.corners', pos: 'tr' }, // kit paneli (tutorial kutusu, diyaloglar)
  { sel: '.gr-pl .pl-ico' }, // skill plakası ikonu (Gear / Tree)
  { sel: '.hsk:not(.pas) .ic' }, // kahraman kartı skill ikonu
  { sel: '.mw.hp .hp-sk .ic' }, // kahraman seçici skill ikonu
  { sel: '.mw-panel:has(> .mw-corner)' }, // harita / olay / ödül penceresi
  { sel: '.cw-win' }, // Form your company
  { sel: '.fbw-win' }, // formasyon penceresi
  { sel: '.fb-panel' }, // formasyon bilgi paneli
  { sel: '.fb-ico' }, // formasyon skill ikonu
];

const ALL = CD_HOSTS.map((h) => h.sel).join(',');
const seen = new WeakSet<Element>();
let ro: ResizeObserver | null = null;

const unitPx = (el: HTMLElement): number => {
  const v = parseFloat(getComputedStyle(el).getPropertyValue('--cd-u'));
  return v > 0 ? v : 1;
};

function apply(el: HTMLElement): void {
  if (!el.isConnected) {
    ro?.unobserve(el);
    return;
  }
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  if (w < 1 || h < 1) return;
  // data-cd önce yoksa varsayılan değişkenlerle ölçüm için işaretle (--cd-u [data-cd] altında tanımlı)
  if (!el.hasAttribute('data-cd')) el.setAttribute('data-cd', 'k');
  const u = unitPx(el);
  const wd = w / u;
  const hd = h / u;
  const short = Math.min(wd, hd);
  const mode = cdCentred(wd, hd) ? 'c' : 'k';
  const sk = String(cdTier(short));
  if (el.getAttribute('data-cd') !== mode) el.setAttribute('data-cd', mode);
  if (el.style.getPropertyValue('--cd-sk') !== sk) el.style.setProperty('--cd-sk', sk);
}

function mark(el: HTMLElement): void {
  if (seen.has(el)) return;
  seen.add(el);
  const host = CD_HOSTS.find((c) => el.matches(c.sel));
  if (host?.pos === 'tr') el.setAttribute('data-cd-pos', 'tr');
  if (host?.np) el.setAttribute('data-cd-np', '');
  ro?.observe(el);
  apply(el);
}

function scan(root: ParentNode): void {
  if (root instanceof HTMLElement && root.matches(ALL)) mark(root);
  root.querySelectorAll<HTMLElement>(ALL).forEach(mark);
}

/** Bir kez çağrılır (main.ts). Var olan ve sonradan eklenen tüm hostları işaretler. */
export function installCornerDots(): void {
  if (ro || typeof document === 'undefined') return;
  ro = new ResizeObserver((es) => es.forEach((e) => apply(e.target as HTMLElement)));
  const mo = new MutationObserver((ms) => {
    for (const m of ms) {
      m.addedNodes.forEach((n) => {
        if (n instanceof HTMLElement) scan(n);
      });
      // sınıf değişince (ör. .corners eklendi / .pas çıktı) host listesi yeniden değerlendirilir
      if (m.type === 'attributes' && m.target instanceof HTMLElement) scan(m.target);
    }
  });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  scan(document.body);
  if (location.search.includes('debug')) (window as unknown as { __cdProbe: () => unknown }).__cdProbe = cornerDotsProbe;
}

/** Geliştirme ölçümü (ui-shot senaryoları): her görünen hostun kutusu, kademe, nokta çapı, nokta / kısa kenar oranı ve yazı / ikona değme denetimi. */
export function cornerDotsProbe(): unknown[] {
  const out: unknown[] = [];
  document.querySelectorAll<HTMLElement>('[data-cd]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const u = unitPx(el);
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:1px;left:0;top:0';
    el.appendChild(probe);
    const cs = getComputedStyle(el);
    const px = (v: string): number => {
      probe.style.width = v;
      return probe.getBoundingClientRect().width;
    };
    const dd = px(cs.getPropertyValue('--cd-d').trim());
    const pt = px(cs.getPropertyValue('--cd-pt').trim());
    probe.remove();
    // probe.getBoundingClientRect zaten ekran pikseli (HUD ölçek dönüşümü dahil)
    const mode = el.getAttribute('data-cd');
    const hidden = (ps: '::before' | '::after') => getComputedStyle(el, ps).display === 'none';
    const dots: Array<[number, number]> = [];
    const L = r.left;
    const T = r.top;
    const R = r.right;
    const B = r.bottom;
    const dotR = dd / 2;
    const ptS = pt;
    const tr = el.getAttribute('data-cd-pos') === 'tr';
    if (mode === 'c') {
      for (const i of [-1, 0, 1]) {
        if (!hidden('::before')) dots.push([L + r.width / 2 + i * ptS, T]);
        if (!hidden('::after')) dots.push([L + r.width / 2 + i * ptS, B]);
      }
    } else {
      for (const i of [1, 2, 3]) {
        if (!hidden('::before')) dots.push([L + i * ptS + dotR, T]);
        if (!hidden('::after')) dots.push([R - i * ptS - dotR, tr ? T : B]);
      }
    }
    const boxes: Array<[string, DOMRect]> = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let tn: Node | null;
    while ((tn = tw.nextNode())) {
      if (!tn.nodeValue?.trim()) continue;
      const rg = document.createRange();
      rg.selectNodeContents(tn);
      for (const q of rg.getClientRects()) boxes.push([`text "${tn.nodeValue.trim().slice(0, 14)}"`, q]);
    }
    el.querySelectorAll('img').forEach((i) => boxes.push([`img.${(i as HTMLElement).className}`, i.getBoundingClientRect()]));
    const hits: string[] = [];
    for (const [dx, dy] of dots)
      for (const [nm, q] of boxes) {
        const nx = Math.max(q.left, Math.min(dx, q.right));
        const ny = Math.max(q.top, Math.min(dy, q.bottom));
        if ((dx - nx) ** 2 + (dy - ny) ** 2 < dotR * dotR - 0.01) hits.push(`${nm} @${dx.toFixed(0)},${dy.toFixed(0)}`);
      }
    const short = Math.min(el.offsetWidth, el.offsetHeight) / u;
    out.push({
      host: `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 2).join('.')}`,
      mode,
      boxDesk: `${(el.offsetWidth / u).toFixed(0)}x${(el.offsetHeight / u).toFixed(0)}`,
      short: +short.toFixed(1),
      tier: cdTierText(short),
      dotDeskPx: +(CD_BASE * cdTier(short)).toFixed(2),
      dotScreenPx: +dd.toFixed(2),
      ratio: +(dd / Math.min(r.width, r.height)).toFixed(4),
      hits,
    });
  });
  return out;
}
