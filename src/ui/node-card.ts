/**
 * Düğüm kartının içi (Ömer 2026-11-14 Tur 14 kararı: Herald H2 Banner + düz Lv + H1 defne elit / yalnız kızıl defne boss; diğer tasarımlar silindi).
 * Kart konumu / ok ucu / X / düğme davranışı src/ui/start-battle.ts'te; burada yalnız kartın içi ve çerçevesi. Yalnız GÖSTERİM: kural yok.
 *
 * Ömer'in kuralları (2026-11-14, Tur 13 + Tur 14 notları):
 * - Kartta loot / ödül yok. Normal savaşta düşmanlar GİZLİ; düğüm bir kez yapıldıysa (kayıtta `cleared` = known) görünür.
 * - Elit / boss düğümünde yalnız elit ve boss figürleri görünür (ortada büyük madalyon); diğer moblar yalnız known iken, altta küçük hizalı sıra.
 * - Düşmanlar görünürken güçlüler başta: boss, elit, sonra diğerleri. Known düğümde moba hover / dokunuş = A Band kısa bilgi.
 * - Blessing sürprizdir: kartta yalnız `blessing:hidden` ikonu, ad / etki yazmaz.
 * - Lv: madalyonun solunda "Lv N", sağında "Company X.X"; eski kartın düz yazısı (çerçeve / levha yok). Takıma göre zorluk yalnız eski kartta
 *   olduğu gibi "Company" yazısının renginde (level farkı bandı, src/campaign/level-gap.ts); "Dangerous" / "Deadly" yazısı yok.
 * - Elit çerçevesi = madalyonu saran defne (H1); boss = yalnız kızıl defne (madalyona yakın, tepesine dek uzanır; alt
 *   bağda kıvrımlı kurdele, ışıltı yok). Taç yok, köşeli şekil yok.
 * - Madalyondaki ikon gövdede ikinci kez kullanılmaz; kamp eylemleri / yerler / düşman madalyonları tek yatay hizada (eşit boy, sabit ad satırı);
 *   alt başlık gövdede zaten görünen bilgiyi tekrar etmez.
 */
import './node-card.css';
import type { FoeGroup } from '../campaign/encounters';
import type { BandTipSpec } from './band-tip';
import { miscImage, uiImage } from '../game/icon-image-files';
import { miscIconName } from './misc-icons';
import { eventMedalIcon, eventPiece, type EventKit } from './node-card-events';

/** İki satıra kırılan başlıkta kutu metnin gerçek genişliğine daralır; süs çizgileri başlığa yaklaşır (Ömer 2026-11-21). */
function hugTitle(hd: HTMLElement): void {
  const t = hd.querySelector<HTMLElement>('.sbc-t');
  if (!t || typeof ResizeObserver === 'undefined') return;
  const fit = (): void => {
    t.style.width = '';
    if (!t.isConnected) return;
    const r = document.createRange();
    r.selectNodeContents(t);
    const w = Math.ceil(Math.max(...[...r.getClientRects()].map((x) => x.width), 0));
    // getClientRects ölçüsü dönmüş sahnede (CSS rotate) da yerel birimde değil; offsetWidth ile oran alınır
    const k = t.getBoundingClientRect().width / (t.offsetWidth || 1) || 1;
    if (w > 0) t.style.width = `${Math.ceil(w / k) + 1}px`;
  };
  new ResizeObserver(fit).observe(hd);
}

/** Kart türü (oyundaki düğüm türlerinden; src/game/scenes/CampaignMapScene.ts > designFacts). */
export type NodeCardKind = 'battle' | 'elite' | 'boss' | 'town' | 'rest' | 'merchant' | 'treasure' | 'treasure-open' | 'shrine' | 'dive' | 'event' | 'ahead';

/** Sahnenin verdiği türetilmiş bilgi (yalnız var olan veriden; kayıt alanı eklenmez). */
export interface NodeCardFacts {
  kind: NodeCardKind;
  /** Düğüm bir kez yapıldı (kayıtta `cleared`): normal savaşta da düşmanlar görünür. */
  known: boolean;
  /** Düğümün asıl türünün gücü (çerçeve): ulaşılamayan elit / boss düğümü de çerçevesini taşır. */
  tier: '' | 'elite' | 'boss';
  /** Boyalı sahne: assets/backgrounds/<bg>.webp ya da assets/campaign/windows/<win>.webp (pos = odak 0..1). */
  art?: { bg?: string; win?: string; pos?: [number, number] };
  /** Wayshrine sınavı (kural, ödül değil) ve blessing'in daha önce alınıp alınmadığı. */
  trial?: { name: string; text: string };
  earned?: boolean;
  /** Salvage Dive derinliği. */
  depth?: { cur: number; max: number };
  /** Olay düğümünün olay kimliği (olay kartı: aile + olay resmi + tür rozeti, node-card-events.ts). */
  eventId?: string;
  /** Ulaşılamayan düğümde kilit sebebi (gemi / Caravel); yoksa yalnız not. */
  lock?: string;
}

export interface NodeCardCtx {
  name: string;
  subtitle: string;
  badge: string | undefined;
  /** Savaşlı düğümde Lv bilgisi: `color` = takıma göre zorluk rengi (level farkı bandı; normalde boş). Savaşsız düğümde null. */
  lv: { level: number; company: string; color: string } | null;
  foes: FoeGroup[];
  lore: string;
  side: string;
  chain: string;
  first: string[];
  flags: string[];
  /** Devriye etiketleri (Patrol · No Valor; loot yazmaz, Ömer 2026-11-14): tek düz satır. */
  tags: string[];
  /** Rakip bölük (Silver Stag): ad + tek satır. */
  company: { name: string; line: string } | null;
  services: Array<{ name: string; icon?: string; tip?: BandTipSpec }>;
  /** Fight / eylem düğmesi ya da not (önizlemede yok). */
  act: HTMLElement | null;
  face: (f: FoeGroup) => HTMLElement;
  tip: (f: FoeGroup) => string;
  /** Known düğümde düşmanın kısa bilgisi (A Band): rol + tek satır (pasifin açıklaması). */
  foeInfo: (f: FoeGroup) => BandTipSpec;
  /** A Band ipucunu öğeye bağlar (kart kapanınca start-battle söker). */
  bandTip: (el: HTMLElement, spec: BandTipSpec) => void;
  /** Avatar portresi (assets/avatars/<id>.webp); yoksa undefined. */
  portrait: (id: string) => string | undefined;
  facts: NodeCardFacts;
}

const bgFiles = import.meta.glob('../../assets/backgrounds/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const winFiles = import.meta.glob('../../assets/campaign/windows/*.webp', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>;

const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const img = (url: string | undefined | null): string => (url ? `<img src="${esc(url)}" alt="" draggable="false">` : '');

const rank = (f: FoeGroup): number => (f.tier === 'boss' ? 0 : f.tier === 'elite' ? 1 : 2);
/** Güçlüler başta: boss, elit, diğerleri (Ömer 2026-11-14). Sıralama kararlı: aynı güçtekiler veri sırasında. */
export const strongFirst = (xs: FoeGroup[]): FoeGroup[] => [...xs].sort((a, b) => rank(a) - rank(b));

/** Düşmanlar görünür mü: elit / boss düğümü ya da bir kez yapılmış düğüm. */
export const foesShown = (f: Pick<NodeCardFacts, 'tier' | 'known'>): boolean => f.tier !== '' || f.known;

/**
 * Kartta görünen düşmanlar (Tur 14): normal düğüm known değilse hiçbiri; elit / boss düğümü known değilse yalnız rütbeliler (elit / boss;
 * rütbeli yoksa hepsi); known ise hepsi. Güçlüler başta.
 */
export function visibleFoes(foes: FoeGroup[], f: Pick<NodeCardFacts, 'tier' | 'known'>): FoeGroup[] {
  if (!foesShown(f)) return [];
  const all = strongFirst(foes);
  if (f.known) return all;
  const ranked = all.filter((x) => x.tier);
  return ranked.length ? ranked : all;
}

/**
 * Alt başlıktan gövdede zaten görünen parçaları atar (Tur 14, Ömer: "City · Inn, Blacksmith, ..." altında yer listesi varken tekrar).
 * Parçalar " · " ile ayrılır; virgüllü liste (yer listesi) kartta yerler görünüyorsa düşer; gövdedeki bir etiketle aynı ya da bir düşman adının
 * içinde geçen parça düşer ("Rest" kamp eylemi, "The Bridge Warden" boss). Kalan yoksa boş döner (satır hiç çizilmez).
 */
export function dedupSubtitle(sub: string, o: { labels: string[]; foeNames: string[]; places: boolean }): string {
  const norm = (t: string): string => t.toLowerCase().replace(/^the\s+/, '').trim();
  const labels = new Set(o.labels.map(norm));
  const foes = o.foeNames.map((n) => n.toLowerCase());
  return sub
    .split(' · ')
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      if (s.includes(',') && o.places) return false;
      const n = norm(s);
      if (labels.has(n)) return false;
      return !foes.some((f) => n.length > 3 && f.includes(n));
    })
    .join(' · ');
}

/** Boyalı sahneyi bir öğenin arka planına koyar (pencere görselleri tembel; yoksa düz zemin). */
function paintArt(node: HTMLElement, art: NodeCardFacts['art'] | undefined): boolean {
  if (!art) return false;
  const pos = art.pos ?? [0.5, 0.5];
  node.style.backgroundPosition = `${Math.round(pos[0] * 100)}% ${Math.round(pos[1] * 100)}%`;
  if (art.win) {
    const load = winFiles[`../../assets/campaign/windows/${art.win}.webp`];
    if (load) {
      void load()
        .then((u) => (node.style.backgroundImage = `url(${u})`))
        .catch(() => undefined);
      return true;
    }
  }
  const u = art.bg ? bgFiles[`../../assets/backgrounds/${art.bg}.webp`] : undefined;
  if (u) node.style.backgroundImage = `url(${u})`;
  return !!u;
}

const put = (parent: HTMLElement, ...xs: Array<HTMLElement | null | undefined | HTMLElement[]>): void => {
  for (const x of xs) {
    if (Array.isArray(x)) parent.append(...x);
    else if (x) parent.append(x);
  }
};

/** Lv: madalyonun solunda "Lv N", sağında "Company X.X" (eski kartın düz yazısı; zorluk rengi yalnız Company'de, eski kart gibi). */
function lvEl(c: NodeCardCtx): HTMLElement | null {
  const lv = c.lv;
  if (!lv) return null;
  const st = lv.color ? ` style="color:${esc(lv.color)}"` : '';
  const co = lv.company ? `<small class="r" title="Your company's average level: ${esc(lv.company)}"${st}>Company ${esc(lv.company)}</small>` : '';
  return h('div', 'nc-lv', `<b class="l">Lv ${lv.level}</b>${co}`);
}

/** Tek düşman hücresi: eşit madalyon + sabit yükseklikte ad satırı; known düğümde A Band kısa bilgi, değilse kısa ad ipucu. */
function foeCell(c: NodeCardCtx, f: FoeGroup, cls = ''): HTMLElement {
  const fig = h('div', `nc-cell nc-foe ${f.tier ?? ''} ${cls}`.replace(/\s+/g, ' ').trim());
  fig.tabIndex = 0;
  if (c.facts.known) c.bandTip(fig, c.foeInfo(f));
  else fig.dataset['tip'] = c.tip(f);
  fig.append(c.face(f), h('span', 'nm', `${esc(f.name)}${f.n > 1 ? ` <em>×${f.n}</em>` : ''}`));
  return fig;
}

/** Eşit hücreli yatay sıra (düşmanlar, kamp eylemleri, kasaba yerleri): ikonlar tek hizada. */
function cellRow(cls: string, cells: HTMLElement[]): HTMLElement {
  const row = h('div', `nc-cells ${cls}`.trim());
  row.style.setProperty('--n', String(cells.length));
  row.append(...cells);
  return row;
}
const iconCell = (url: string | undefined, label: string): HTMLElement => h('div', 'nc-cell', `<span class="ic">${img(url)}</span><span class="nm">${esc(label)}</span>`);

/** Boyalı sahne penceresi (olay / hazine): madalyondaki ikonun yerine sahnenin kendisi. */
function vista(c: NodeCardCtx, inner = ''): HTMLElement {
  const v = h('div', 'nc-vista', inner);
  if (!paintArt(v, c.facts.art)) v.classList.add('plain');
  return v;
}

const EVENT_KIT: EventKit = { paint: paintArt, h: (tag, cls, html) => h(tag, cls, html) };

/** Kamp eylemleri (madalyondaki kamp ateşi tekrar edilmez: "Rest" = han yatağı). */
const CAMP_ACTS = (): Array<[string | undefined, string]> => [
  [miscImage(miscIconName('town', 'inn'))?.url ?? uiImage('rest')?.url, 'Rest'],
  [miscImage('emblem:heal')?.url, 'Tend a wound'],
  [miscImage(miscIconName('smith', 'temper_stone'))?.url, 'Sharpen a blade'],
  [miscImage('codex:mech_levels')?.url, 'Train'],
];

function shrinePiece(c: NodeCardCtx): HTMLElement {
  const f = c.facts;
  const w = h('div', `nc-kind nc-shrine${f.earned ? ' earned' : ''}`);
  w.append(h('div', 'nc-sigil', `<i class="halo" aria-hidden="true"></i>${img(miscImage(miscIconName('blessing', 'hidden'))?.url)}`));
  const t = f.trial;
  w.append(h('p', 'nc-trial', `${t ? `<b>${esc(t.name)}</b> ${esc(t.text)}` : ''}${f.earned ? `${t ? ' ' : ''}<span class="dim">You have knelt here.</span>` : ''}`));
  return w;
}

function divePiece(c: NodeCardCtx): HTMLElement {
  const dp = c.facts.depth ?? { cur: 1, max: 2 };
  const w = h('div', 'nc-kind nc-dive');
  const steps = Array.from({ length: dp.max }, (_, i) => `<i class="dp ${i + 1 < dp.cur ? 'done' : i + 1 === dp.cur ? 'now' : 'next'}" style="--i:${i}"></i>`).join('');
  w.append(h('div', 'nc-descent', steps));
  w.append(h('p', 'nc-rule', `Depth ${dp.cur} of ${dp.max}. ${dp.cur >= 2 ? 'If you fall here, the last chest you found sinks.' : 'Each depth is one more fight, with no healing between.'}`));
  return w;
}

/**
 * Tür parçası. Madalyondaki ikon (c.badge) gövdede hiç tekrar edilmez: tüccar = tüccarın portresi, olay ve hazine = düğümün boyalı sahnesi,
 * kamp = ateşsiz eylem ikonları, kasaba = madalyonla aynı dosyayı kullanan yer ikonu atlanır.
 */
function kindPiece(c: NodeCardCtx): HTMLElement | null {
  const f = c.facts;
  const notBadge = (u: string | undefined): string | undefined => (u && u === c.badge ? undefined : u);
  switch (f.kind) {
    case 'town': {
      const w = h('div', 'nc-kind nc-town');
      if (c.services.length)
        w.append(
          cellRow(
            'places',
            c.services.map((s) => {
              const cell = iconCell(notBadge(s.icon), s.name);
              if (s.tip) {
                cell.tabIndex = 0;
                c.bandTip(cell, s.tip);
              }
              return cell;
            }),
          ),
        );
      for (const fl of c.flags) w.append(h('p', 'nc-news', esc(fl)));
      return w;
    }
    case 'rest': {
      const w = h('div', 'nc-kind nc-camp');
      w.append(cellRow('acts', CAMP_ACTS().map(([u, t]) => iconCell(notBadge(u), t))));
      w.append(h('p', 'nc-rule', 'Make camp once. Choose one.'));
      return w;
    }
    case 'merchant': {
      const por = c.portrait('merchant');
      return h('div', 'nc-kind nc-merchant', `${por ? `<span class="nc-por">${img(por)}</span>` : ''}<p>Odo the Peddler sells gear and buys yours.</p>`);
    }
    case 'treasure':
    case 'treasure-open': {
      const open = f.kind === 'treasure-open';
      const w = h('div', `nc-kind nc-chest${open ? ' open' : ''}`);
      w.append(vista(c), h('p', '', open ? 'No one guards it.' : 'Its keepers still stand guard.'));
      return w;
    }
    case 'shrine':
      return shrinePiece(c);
    case 'dive':
      return divePiece(c);
    case 'event': {
      const ev = f.eventId ? eventPiece(EVENT_KIT, f.eventId, f.art) : null;
      if (ev) return ev;
      const w = h('div', 'nc-kind nc-omen');
      w.append(vista(c, '<i class="q" aria-hidden="true">?</i>'), h('p', '', 'What waits here is told when you arrive.'));
      return w;
    }
    case 'ahead':
      return f.lock ? h('p', 'nc-kind nc-lock', esc(f.lock)) : null;
    default:
      return null;
  }
}

/* ---- Elit / boss çerçevesi: madalyonu saran defne / başak (yalnız kavis ve yaprak; sivri / dişli / taç yok) ---- */

/** Bir yaprak: yumuşak kıvrımlı badem (iki kübik eğri). */
const leaf = (x: number, y: number, a: number, s = 1): string =>
  `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(1)}) scale(${s.toFixed(2)})" d="M0 0 C3 -4 9 -5 13 -1 C9 2 3 3 0 0 Z"/>`;
const rad = (d: number): number => (d * Math.PI) / 180;

/**
 * Bir yandaki dal: merkez (cx, cy), yarıçap r; açı a0'dan (altta) a1'e (yukarıda) n yaprak çifti. Yapraklar yay boyunca yukarı bakar;
 * `spread` = çiftin dala göre açısı, s0 -> s1 = yaprak boyu (uca doğru küçülür).
 */
function branch(cx: number, cy: number, r: number, a0: number, a1: number, n: number, side: 1 | -1, o: { s0: number; s1: number; spread: number }): { stem: string; leaves: string } {
  let leaves = '';
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1);
    const t = rad(a0 + (a1 - a0) * k);
    const x = cx + side * Math.cos(t) * r;
    const y = cy + Math.sin(t) * r;
    const dir = (Math.atan2(-Math.cos(t), side * Math.sin(t)) * 180) / Math.PI;
    const s = o.s0 + (o.s1 - o.s0) * k;
    leaves += leaf(x, y, dir - side * o.spread, s) + leaf(x, y, dir + side * o.spread, s * 0.82);
  }
  const p = (a: number): string => `${(cx + side * Math.cos(rad(a)) * r).toFixed(1)} ${(cy + Math.sin(rad(a)) * r).toFixed(1)}`;
  const stem = `<path d="M${p(a0)} A${r} ${r} 0 0 ${side === 1 ? 0 : 1} ${p(a1)}" fill="none"/>`;
  return { stem, leaves };
}

/** Elit: H1 defnesi (madalyonu saran ince iki dal; ember çizgi, koyu kahve yaprak). */
const ELITE_WREATH = (): string => {
  const L = branch(100, 100, 74, 75, -37, 9, 1, { s0: 1.15, s1: 1.15, spread: 38 });
  const R = branch(100, 100, 74, 75, -37, 9, -1, { s0: 1.15, s1: 1.15, spread: 38 });
  return (
    `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet"><g stroke="#ffb35a" stroke-width="1.6" stroke-linecap="round">${L.stem}${R.stem}</g>` +
    `<g fill="#5a3014" stroke="#ffb35a" stroke-width="1.1" stroke-linejoin="round">${L.leaves}${R.leaves}</g></svg>`
  );
};

/**
 * Boss (Ömer 2026-11-14 düzeltmesi): yalnız kızıl defne. İçteki altın dal ve aradaki tohumlar kalktı; kızıl dal altının yerine (madalyona
 * yakın) indi ve yukarı doğru madalyonun tepesine dek uzanır. Dal uçlarında altın tomurcuk, altta kızıl kurdele bağı. Kor ışıltısı yok (Ömer 2026-11-14: fazla parlıyordu).
 * Taç yok. viewBox 240x240, merkez (120,120) = madalyonun merkezi.
 */
const BOSS_WREATH = (): string => {
  const C = 120;
  const R = 76;
  const A1 = -80; // dal ucu: madalyonun neredeyse tepesi
  const red = [branch(C, C, R, 78, A1, 15, 1, { s0: 1.95, s1: 1.15, spread: 34 }), branch(C, C, R, 78, A1, 15, -1, { s0: 1.95, s1: 1.15, spread: 34 })] as const;
  const tip = (side: 1 | -1): string => `<circle cx="${(C + side * Math.cos(rad(A1 - 4)) * R).toFixed(1)}" cy="${(C + Math.sin(rad(A1 - 4)) * R).toFixed(1)}" r="3.2"/>`;
  const by = C + R + 1; // alt bağ (dalların buluştuğu yer)
  const tail = (s: 1 | -1): string =>
    `<path d="M${C + s * 3} ${by} C${C + s * 22} ${by + 10} ${C + s * 36} ${by + 18} ${C + s * 46} ${by + 26} C${C + s * 38} ${by + 28} ${C + s * 32} ${by + 26} ${C + s * 28} ${by + 32} C${C + s * 20} ${by + 20} ${C + s * 10} ${by + 10} ${C + s * 1} ${by + 4} Z" fill="#5a120c"/>`;
  const loop = (s: 1 | -1): string =>
    `<path d="M${C} ${by + 1} C${C + s * 10} ${by - 13} ${C + s * 30} ${by - 11} ${C + s * 27} ${by + 1} C${C + s * 24} ${by + 10} ${C + s * 10} ${by + 7} ${C} ${by + 1} Z" fill="#8a2418"/>`;
  const bow = `<g stroke="#f3d999" stroke-width="1.4" stroke-linejoin="round">${tail(-1)}${tail(1)}${loop(-1)}${loop(1)}<ellipse cx="${C}" cy="${by + 1}" rx="5" ry="4.6" fill="#b8322a"/></g>`;
  return (
    `<svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMid meet" overflow="visible">` +
    `<g stroke="#e6c27a" stroke-width="2.2" stroke-linecap="round">${red[0].stem}${red[1].stem}</g>` +
    `<g fill="#7a1c12" stroke="#e6c27a" stroke-width="1" stroke-linejoin="round">${red[0].leaves}${red[1].leaves}</g>` +
    `<g fill="#f3d999">${tip(1)}${tip(-1)}</g>${bow}</svg>`
  );
};

/**
 * Kartın içini kurar (start-battle.ts çağırır; konum, kapatma, düğme davranışı orada). Düzen: üst kenarı kıran madalyon, iki yanında düz Lv /
 * Company, ad (iki yanı çizgili), alt başlık, lore, tür parçası, düşmanlar (elit / boss önderi ortada büyük; known iken diğerleri altta küçük
 * sıra), ek satırlar, düğme. Döner: kartın üstüne taşan çerçeve süsü (yerleşimde pay bırakılır) ya da null.
 */
export function buildNodeCard(card: HTMLElement, c: NodeCardCtx): HTMLElement | null {
  const f = c.facts;
  const tier = f.tier;
  card.classList.add('nc', `k-${f.kind}`);
  if (tier) card.classList.add(`t-${tier}`);
  if (f.kind === 'ahead') card.classList.add('veil');
  const fights = c.foes.length > 0;
  const vis = fights ? visibleFoes(c.foes, f) : [];
  const hidden = fights && !vis.length ? h('p', 'nc-hidden', 'Their colors are not yet known.') : null;
  const known = fights && f.known && !tier ? h('p', 'nc-known', 'You have fought here before.') : null;
  const piece = kindPiece(c);

  // alt başlık: gövdede görünen bilgi tekrar edilmez
  const labels = [...c.services.map((s) => s.name), ...(f.kind === 'event' && f.eventId && eventMedalIcon(f.eventId) ? ['Event'] : []), ...(f.kind === 'rest' ? CAMP_ACTS().map(([, t]) => t) : [])];
  const sub = dedupSubtitle(c.subtitle, { labels, foeNames: vis.map((x) => x.name), places: f.kind === 'town' && c.services.length > 0 });

  let crest: HTMLElement | null = null;
  if (tier) {
    crest = h('i', `nc-crest ${tier}`, tier === 'boss' ? BOSS_WREATH() : ELITE_WREATH());
    card.append(crest);
  }
  const medal = h('div', 'nc-medal', img((f.kind === 'event' ? eventMedalIcon(f.eventId) : undefined) ?? c.badge));
  const hd = h('div', 'nc-head', `<span class="rl" aria-hidden="true"></span><h2 class="sbc-t">${esc(c.name)}</h2><span class="rl r" aria-hidden="true"></span>`);
  hugTitle(hd);
  const subEl = sub ? h('p', 'nc-sub', esc(sub)) : null;
  const lv = lvEl(c);

  // düşmanlar: önder (elit / boss) tek büyük madalyon ortada; known ise diğerleri altında küçük, hizalı sıra
  let foesEl: HTMLElement | null = null;
  const lead = vis[0];
  if (lead) {
    if (lead.tier) {
      const w = h('div', 'nc-foes-lead');
      w.append(cellRow('lead', [foeCell(c, lead, 'big')]));
      const rest = vis.slice(1);
      if (rest.length) w.append(cellRow('small', rest.map((x) => foeCell(c, x))));
      foesEl = w;
    } else foesEl = cellRow('foes', vis.map((x) => foeCell(c, x)));
  }

  const lore = c.lore ? h('p', 'nc-lore', esc(c.lore)) : null;
  const coEl = c.company ? h('p', 'nc-company', `<b>${esc(c.company.name)}</b> ${esc(c.company.line)}`) : null;
  const tagsEl = c.tags.length ? h('p', 'nc-tags', c.tags.map(esc).join(' · ')) : null;
  const extras = [
    ...(c.side ? [h('p', 'nc-side', esc(c.side))] : []),
    ...(c.chain ? [h('p', 'nc-chain', esc(c.chain))] : []),
    ...(c.first.length ? [h('p', 'nc-first', c.first.map(esc).join(' '))] : []),
  ];
  const foot = c.act ? h('div', 'nc-foot') : null;
  if (foot && c.act) foot.append(c.act);
  put(card, lv, medal, hd, subEl, coEl, lore, tagsEl, piece, foesEl ?? hidden, known, extras, foot);
  if (lv) card.classList.add('has-lv');
  return crest;
}
