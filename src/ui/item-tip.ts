/**
 * Ortak item ipucu (Ömer 2026-10-11, g1): torba / yuva / tüccar / ödül hücresinin üstüne gelince FARE İMLECİNİN YANINDA yüzen panel
 * (dokunmatikte TEK DOKUNUŞ: item'in yanına sabitlenir, altta eylem düğmeleri; boşluğa dokununca kapanır, Ömer 2026-10-12). İçerik: ad (nadirlik rengi), nadirlik + yuva + item seviyesi, affix satırları (C / B / A kademe etiketi + ikon +
 * değer + zar aralığı), Legendary etkisi, değer. Gear, tüccar ve ödül torbası aynı bileşeni kullanır. Oyun içi metinler İngilizce.
 */
import { ITEMS, TIER_COLOR, affixCapKeys, affixDef, affixLines, capOf, effectLine, instanceBaseLines, instanceColor, instanceSubtitle, itemDef, itemValue, levelReqMsg, type CapKey, type ItemInstance } from '../progression';
import { tipOn, tipOff } from './tip-vis';
import { clientToLocal } from './formation-board-rules';
import { statIconUrl } from './stat-tips';
import { itemDefIcon } from './item-icon-dom';
import { iconUrl } from './dom-icons';
import { hasUiImage, uiIconName } from './ui-icons';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Dokunmatikte sabitlenen ipucunun eylem düğmesi (Equip / Unequip / Buy / Sell ...). */
export interface ItemTipAction {
  label: string;
  run: () => void;
  disabled?: boolean;
  primary?: boolean;
}

/** Düğümün `anc` içindeki konumu (offset zinciri; döndürülmüş sahnede de doğru, kaydırmalar düşülür). */
export function offsetIn(node: HTMLElement, anc: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = node;
  while (n && n !== anc) {
    x += n.offsetLeft;
    y += n.offsetTop;
    const parent = n.offsetParent as HTMLElement | null;
    for (let q: HTMLElement | null = n.parentElement; q && q !== anc; q = q.parentElement) {
      x -= q.scrollLeft;
      y -= q.scrollTop;
      if (q === parent) break;
    }
    n = parent;
  }
  return { x, y };
}

export interface ItemTipLine {
  text: string;
  dir?: 'up' | 'down' | 'no';
}

/** Kahraman bağlamı (progression > affixContext): etkisiz affix sıraları + tavanı dolu statlar (Ömer 2026-10-13, itemcaps). */
export interface ItemTipState {
  inactive?: Set<number>;
  capped?: Set<CapKey>;
  /** Seçili kahramanın seviyesi: item'in şartı bundan yüksekse "Requires Level X" kırmızı (Item Güçlendirme x6). */
  level?: number;
  /** Tüccar: torba item'inin satış fiyatı (verilirse altta "sells for"; yoksa "value"). */
  sellFor?: number;
}

/** Tavan etiketi: "max 25%" (hız düz: "max 3"). */
export const capLabel = (k: CapKey): string => `max ${capOf(k) ?? ''}${k === 'spd' ? '' : '%'}`;

/** Kahraman satırı (karşılaştırma): `face` portre adresi, `level` kahramanın seviyesi (item şartı yüksekse "Lv" kırmızı). */
export interface ItemTipHero {
  label: string;
  parts: ItemTipLine[];
  face?: string;
  level?: number;
}

const TIER_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };

/** Zar göstergesi için değerin aralıktaki yeri (0-1); aralık ya da sayı yoksa null. */
function rollPos(text: string, range: string): number | null {
  const [lo, hi] = range.split('–').map(Number);
  const m = text.match(/\d+(\.\d+)?/);
  if (!m || lo === undefined || hi === undefined || !(hi > lo)) return null;
  return Math.max(0, Math.min(1, (Number(m[0]) - lo) / (hi - lo)));
}

/** Gövde: (Legendary etkisi) + örtük stat + kademeye göre YÜKSEKTEN düşüğe (A, B, C) sıralı affix satırları. Ortak ipucu ve tüccar karşılama kartı kullanır. */
function bodyNodes(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId: string | undefined, state: ItemTipState | undefined): HTMLElement[] {
  const d = itemDef(inst.id);
  if (!d) return [];
  const out: HTMLElement[] = [];
  const fx = effectLine(d);
  if (fx) {
    const i = fx.indexOf(':');
    const box = el('div', 'it-effect');
    if (i > 0) box.append(el('strong', '', fx.slice(0, i)), el('span', '', fx.slice(i + 1).trim()));
    else box.append(el('span', '', fx));
    out.push(box);
  }
  const base = instanceBaseLines(inst);
  if (base.implicit) {
    const row = el('div', 'it-implicit');
    const url = base.implicit.stat ? statIconUrl(base.implicit.stat) : '';
    if (url) {
      const i = el('img', 'it-ico');
      i.src = url;
      i.alt = '';
      row.append(i);
    }
    row.append(el('span', 'it-text', base.implicit.text));
    out.push(row);
  }
  const lines = el('div', 'it-lines');
  // sıra: kademe yüksekten düşüğe (A, B, C); eşitlikte zar sırası. "Etkisiz" işareti özgün sıra numarasıyla eşlenir.
  const ls = affixLines(inst, classId).map((l, i) => ({ l, i }));
  ls.sort((x, y) => (TIER_ORDER[x.l.tier] ?? 9) - (TIER_ORDER[y.l.tier] ?? 9) || x.i - y.i);
  for (const { l, i } of ls) {
    const off = !!state?.inactive?.has(i);
    const row = el('div', `it-line${off ? ' off' : ''}`);
    const tag = el('span', 'it-tier', l.tier);
    tag.style.setProperty('--tc', TIER_COLOR[l.tier]);
    row.append(tag);
    const url = l.stat ? statIconUrl(l.stat) : l.icon === 'block' ? statIconUrl('block') : '';
    if (url) {
      const im = el('img', 'it-ico');
      im.src = url;
      im.alt = '';
      row.append(im);
    } else row.append(el('i', 'it-dia'));
    row.append(el('span', 'it-text', l.text));
    // tavan dolu (fazlası kaybolur) ya da A affix sınırı (aynı A affix'i en çok 2 item'de sayılır)
    const capKey = off ? undefined : affixCapKeys(affixDef(l.id) ?? { parts: [] }).find((k) => state?.capped?.has(k));
    if (capKey) row.append(el('span', 'it-cap', capLabel(capKey)));
    // zar göstergesi: mücevher rayı (değerin aralıktaki yeri), üstüne gelince aralık
    const pos = l.range ? rollPos(l.text, l.range) : null;
    if (l.range && pos !== null) {
      const g = el('span', 'it-rail');
      g.style.setProperty('--p', String(pos));
      g.title = `Roll range ${l.range}`;
      g.append(el('i'), el('strong'));
      row.append(g);
    } else if (l.range) row.append(el('span', 'it-range', `(${l.range})`));
    lines.append(row);
    if (off) lines.append(el('div', 'it-off-note', `Inactive: only ${ITEMS.caps.aAffixCopies ?? 2} of this affix count`));
  }
  if (lines.childElementCount) out.push(lines);
  return out;
}

/** Büyük taban değeri: silah gücü ya da kalkan blok şansı (büyük sayı + küçük etiket). */
function bigNode(base: ReturnType<typeof instanceBaseLines>): HTMLElement | null {
  if (base.power === undefined && base.block === undefined) return null;
  const box = el('div', 'it-big');
  if (base.power !== undefined) {
    box.append(el('strong', '', String(base.power)), el('span', '', 'Weapon power'));
  } else if (base.block !== undefined) {
    const n = el('span', 'it-big-n');
    const url = statIconUrl('block');
    if (url) {
      const i = el('img', 'it-big-ico');
      i.src = url;
      i.alt = '';
      n.append(i);
    }
    n.append(el('strong', '', `${Math.round(base.block * 10) / 10}%`));
    box.append(n, el('span', '', 'Block chance'));
  }
  return box;
}

/** Tüccar karşılama kartı için: büyük taban değeri, seviye şartı ve gövde (başlık / ad / değer kartın kendi yerinde). */
export function itemTipBody(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }): HTMLElement[] {
  const base = instanceBaseLines(inst);
  const out: HTMLElement[] = [];
  const big = bigNode(base);
  if (big) out.push(big);
  if (base.req > 1) out.push(el('div', 'it-req', levelReqMsg(base.req)));
  out.push(...bodyNodes(inst, undefined, undefined));
  return out;
}

/**
 * İpucunun içeriği (DOM): TEK kart (Ömer 2026-10-18, taslak item-tooltip.html#v3): yuvarlak madalyon + ad + nadirlik kurdelesi + "tutuş · Item level"
 * + büyük silah gücü / blok şansı; gövde (Legendary etkisi üstte, örtük stat, kademe sırası A > B > C stat satırları); "Requires Level" solda +
 * değer sağda; kahraman karşılaştırma satırları. `classId`: takan sınıf ({primary} yazısı); `extra`: kahraman başına fark satırları.
 */
export function itemTipNodes(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId?: string, extra: ItemTipHero[] = [], state?: ItemTipState): HTMLElement[] {
  const d = itemDef(inst.id);
  if (!d) return [];
  const color = instanceColor(inst);
  const card = el('div', 'it-card');
  card.style.setProperty('--rc', color);
  const base = instanceBaseLines(inst);

  // ---- başlık
  const head = el('div', 'it-head');
  const medal = el('span', 'it-medal');
  medal.append(itemDefIcon(d, d.slot, color, 'gr-svg gr-px'));
  const id = el('div', 'it-id');
  id.append(el('strong', 'it-name', d.name));
  const sub = instanceSubtitle(inst).split(' · ');
  const grip = sub.slice(1, -1).join(' · ');
  const ilvl = sub.length > 1 ? (sub[sub.length - 1] ?? '') : '';
  const rib = el('div', 'it-rib');
  rib.append(el('span', '', sub[0] ?? ''));
  id.append(rib);
  const line = [grip, ilvl].filter(Boolean).join(' · ');
  if (line) id.append(el('div', 'it-sub', line));
  const big = bigNode(base);
  if (big) id.append(big);
  head.append(medal, id);
  card.append(head);

  // ---- gövde
  const main = el('div', 'it-main');
  main.append(...bodyNodes(inst, classId, state));
  if (main.childElementCount) card.append(main);

  // ---- şart (solda, karşılanmıyorsa kırmızı) + değer (sağda)
  const unmet = state?.level !== undefined && state.level < base.req;
  const foot = el('div', 'it-reqrow');
  foot.append(el('span', `it-req${unmet ? ' unmet' : ''}`, base.req > 1 || unmet ? levelReqMsg(base.req) : ''));
  const val = el('span', 'it-val');
  if (hasUiImage('gold')) {
    const c = el('img', 'it-coin');
    c.src = iconUrl(uiIconName('gold'));
    c.alt = '';
    val.append(c);
  }
  val.append(el('strong', '', String(state?.sellFor ?? itemValue(inst))), el('em', '', state?.sellFor !== undefined ? 'sells for' : 'value'));
  foot.append(val);
  card.append(foot);

  // ---- kahramanlar: kare portre + ad + seviye + fark (yuvarlak hap YOK; oyunun kare portre + ince altın çizgi dili)
  if (extra.length) {
    const box = el('div', 'it-heroes');
    for (const x of extra) {
      const no = x.parts.some((p) => p.dir === 'no');
      const row = el('div', `it-hero${no ? ' no' : ''}`);
      const face = el('span', 'it-face');
      if (x.face) face.style.backgroundImage = `url("${x.face}")`;
      row.append(face, el('strong', 'it-hero-k', x.label));
      if (x.level !== undefined && !no) row.append(el('span', `it-lv${x.level < base.req ? ' unmet' : ''}`, `Lv ${x.level}`));
      const v = el('span', 'it-hero-v');
      for (const p of x.parts) v.append(el('span', `it-chip${p.dir ? ` it-${p.dir}` : ''}`, p.text));
      row.append(v);
      box.append(row);
    }
    card.append(box);
  }
  return [card];
}

/**
 * Yüzen ipucu denetçisi: `host` içinde konumlanır (döndürülmüş / ölçekli sahnede de: istemci koordinatı host'un ölçeğine bölünür).
 * `showAt` imlecin sağ altına koyar (taşarsa sola / yukarı çevirir); `follow` fare hareketiyle taşır.
 */
export class ItemTip {
  readonly box: HTMLDivElement;
  private key = '';
  private isPinned = false;
  /** Solma bitince kesin gizleme zamanlayıcısı (bkz. hide). */
  constructor(private host: HTMLElement) {
    this.box = el('div', 'el-tip item-tip');
    this.box.setAttribute('role', 'tooltip');
    // sabitlenmiş ipucuna dokunmak pencerenin zemin kapanışına / item denetçisine ulaşmasın (düğmelerin click'i çalışır)
    const stop = (e: Event): void => {
      if (this.isPinned) e.stopPropagation();
    };
    this.box.addEventListener('pointerdown', stop);
    this.box.addEventListener('pointerup', stop);
    host.append(this.box);
  }
  get shownKey(): string {
    return this.key;
  }
  /** Dokunuşla sabitlenmiş mi (fare üstüne gelme ipucu değil). */
  get pinned(): boolean {
    return this.isPinned && !!this.key;
  }
  show(key: string, nodes: HTMLElement[], clientX: number, clientY: number): void {
    if (!nodes.length) return this.hide();
    if (key !== this.key || this.isPinned) this.box.replaceChildren(...nodes);
    this.setPinned(false);
    this.key = key;
    this.reveal();
    this.follow(clientX, clientY);
  }
  /**
   * Dokunmatik: ipucu `anchor` hücresinin yanına sabitlenir (sağında; sığmazsa solunda, o da olmazsa altında / üstünde) ve altta
   * eylem düğmeleri olur. Bir düğmeye basmak ipucunu kapatıp eylemi çalıştırır.
   */
  pin(key: string, nodes: HTMLElement[], anchor: HTMLElement, actions: ItemTipAction[] = []): void {
    if (!nodes.length) return this.hide();
    const acts: HTMLElement[] = [];
    if (actions.length) {
      const row = el('div', 'it-acts');
      for (const a of actions) {
        const b = el('button', `gr-btn sm${a.primary === false ? '' : ' primary'}`, a.label);
        b.type = 'button';
        b.disabled = !!a.disabled;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          this.hide();
          a.run();
        });
        row.append(b);
      }
      acts.push(row);
    }
    const card = nodes[0]?.classList.contains('it-card') ? nodes[0] : null;
    if (card) card.append(...acts);
    this.box.replaceChildren(...(card ? nodes : [...nodes, ...acts]));
    this.key = key;
    this.setPinned(true);
    this.reveal();
    const p = offsetIn(anchor, this.host);
    const aw = anchor.offsetWidth;
    const ah = anchor.offsetHeight;
    const W = this.host.clientWidth;
    const H = this.host.clientHeight;
    const tw = this.box.offsetWidth;
    const th = this.box.offsetHeight;
    const gap = 8;
    let left: number;
    let top: number;
    if (p.x + aw + gap + tw <= W - 6) {
      left = p.x + aw + gap;
      top = p.y + ah / 2 - th / 2;
    } else if (p.x - gap - tw >= 6) {
      left = p.x - gap - tw;
      top = p.y + ah / 2 - th / 2;
    } else {
      left = p.x + aw / 2 - tw / 2;
      top = p.y + ah + gap + th <= H - 6 ? p.y + ah + gap : p.y - gap - th;
    }
    this.box.style.left = `${Math.max(6, Math.min(W - tw - 6, left))}px`;
    this.box.style.top = `${Math.max(6, Math.min(H - th - 6, top))}px`;
  }
  private setPinned(on: boolean): void {
    this.isPinned = on;
    this.box.classList.toggle('pinned', on);
  }
  follow(clientX: number, clientY: number): void {
    if (!this.key || this.isPinned) return;
    // dikey dokunmatikte sahne CSS ile döner: işaretçi yerel koordinata döndürmeye göre çevrilir
    const { x, y } = clientToLocal(clientX, clientY, this.host.getBoundingClientRect(), this.host.offsetWidth, !!document.documentElement?.classList.contains('rotated'));
    const W = this.host.clientWidth;
    const H = this.host.clientHeight;
    const tw = this.box.offsetWidth;
    const th = this.box.offsetHeight;
    const gap = 18;
    let left = x + gap;
    let top = y + gap;
    if (left + tw > W - 6) left = x - gap - tw;
    if (top + th > H - 6) top = y - gap - th;
    this.box.style.left = `${Math.max(6, Math.min(W - tw - 6, left))}px`;
    this.box.style.top = `${Math.max(6, Math.min(H - th - 6, top))}px`;
  }
  private reveal(): void {
    tipOn(this.box);
  }
  /**
   * Gizle: CSS solması (gear.css .item-tip) + solma süresinden sonra satır içi `display: none`. Tarayıcı sekmesi arka plandayken /
   * önizleme paneli gizliyken CSS geçişleri donar ve ipucu yarı saydam "hayalet" olarak kalırdı (2026-10-18); zamanlayıcı bunu kesin kapatır
   * (display: none; donmuş geçiş satır içi visibility'yi de ezerdi).
   */
  hide(): void {
    this.key = '';
    this.setPinned(false);
    tipOff(this.box);
  }
}
