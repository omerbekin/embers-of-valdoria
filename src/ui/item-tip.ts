/**
 * Ortak item ipucu (Ömer 2026-10-11, g1): torba / yuva / tüccar / ödül hücresinin üstüne gelince FARE İMLECİNİN YANINDA yüzen panel
 * (dokunmatikte TEK DOKUNUŞ: item'in yanına sabitlenir, altta eylem düğmeleri; boşluğa dokununca kapanır, Ömer 2026-10-12). İçerik: ad (nadirlik rengi), nadirlik + yuva + item seviyesi, affix satırları (C / B / A kademe etiketi + ikon +
 * değer + zar aralığı), Legendary etkisi, değer. Gear, tüccar ve ödül torbası aynı bileşeni kullanır. Oyun içi metinler İngilizce.
 */
import { TIER_COLOR, affixLines, effectLine, instanceColor, instanceSubtitle, itemDef, itemValue, type ItemInstance } from '../progression';
import { statIconUrl } from './stat-tips';

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

/** İpucunun içeriği (DOM). `classId`: takan sınıf ({primary} yazısı); `extra`: alttaki ek satırlar (telefonda kahraman başına özet). */
export function itemTipNodes(inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, classId?: string, extra: Array<{ label: string; parts: ItemTipLine[] }> = []): HTMLElement[] {
  const d = itemDef(inst.id);
  if (!d) return [];
  const name = el('b', 'it-name', d.name);
  name.style.color = instanceColor(inst);
  const out: HTMLElement[] = [name, el('div', 'it-sub', instanceSubtitle(inst))];
  const lines = el('div', 'it-lines');
  for (const l of affixLines(inst, classId)) {
    const row = el('div', 'it-line');
    const tag = el('span', 'it-tier', l.tier);
    tag.style.color = TIER_COLOR[l.tier];
    tag.style.borderColor = TIER_COLOR[l.tier];
    row.append(tag);
    const url = l.stat ? statIconUrl(l.stat) : '';
    if (url) {
      const i = el('img', 'it-ico');
      i.src = url;
      i.alt = '';
      row.append(i);
    }
    row.append(el('span', 'it-text', l.text));
    if (l.range) row.append(el('span', 'it-range', `(${l.range})`));
    lines.append(row);
  }
  out.push(lines);
  const fx = effectLine(d);
  if (fx) out.push(el('div', 'it-effect', fx));
  out.push(el('div', 'it-value', `Value ${itemValue(inst)} gold`));
  if (extra.length) {
    const box = el('div', 'it-heroes');
    for (const x of extra) {
      const row = el('div', 'it-hero');
      row.append(el('span', 'it-hero-k', x.label));
      const v = el('span', 'it-hero-v');
      x.parts.forEach((p, i) => {
        if (i) v.append(document.createTextNode(' · '));
        v.append(el('span', p.dir ? `it-${p.dir}` : '', p.text));
      });
      row.append(v);
      box.append(row);
    }
    out.push(box);
  }
  return out;
}

/**
 * Yüzen ipucu denetçisi: `host` içinde konumlanır (döndürülmüş / ölçekli sahnede de: istemci koordinatı host'un ölçeğine bölünür).
 * `showAt` imlecin sağ altına koyar (taşarsa sola / yukarı çevirir); `follow` fare hareketiyle taşır.
 */
export class ItemTip {
  readonly box: HTMLDivElement;
  private key = '';
  private isPinned = false;
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
    this.box.classList.add('on');
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
    this.box.replaceChildren(...nodes, ...acts);
    this.key = key;
    this.setPinned(true);
    this.box.classList.add('on');
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
    const r = this.host.getBoundingClientRect();
    const s = r.width / Math.max(1, this.host.offsetWidth) || 1;
    const x = (clientX - r.left) / s;
    const y = (clientY - r.top) / s;
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
  hide(): void {
    this.key = '';
    this.setPinned(false);
    this.box.classList.remove('on');
  }
}
