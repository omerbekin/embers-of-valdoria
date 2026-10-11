/**
 * Ortak INVENTORY bileşeni (Ömer 2026-10-11, g1): torba ızgarası. Gear (Character sayfasının yanında), Endless tüccarı (malların sağında),
 * ödül ekranının torbası ve sefer Spoils "yer aç" akışı aynı hücreyi ve ızgarayı kullanır. Bileşen yalnızca çizer ve dokunuşları bildirir;
 * sürükle-bırak kuralları `gear-drop.ts`, sürükleme ve ipucu ekranın denetçisinde (hücreler `data-drag` / `data-tip` taşır).
 * Görünüm: src/ui/gear.css (gr-inv*, gr-item). Oyun içi metinler İngilizce.
 */
import { RARITY_IDS, SLOT_IDS, canEquip, instanceColor, instanceRarity, itemDef, rarityIndex, type ItemInstance, type SlotId } from '../progression';
import { itemDefIcon } from './item-icon-dom';
import { isDoubleTap } from './gear-drop';
import { iconUrl } from './dom-icons';
import { hasUiImage, uiIconName } from './ui-icons';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Torba sırası: yuva, sonra nadirlik (yüksek önce), sonra item seviyesi (yüksek önce). */
export function sortBag(items: readonly ItemInstance[]): ItemInstance[] {
  return [...items].sort((a, b) => {
    const da = itemDef(a.id);
    const db = itemDef(b.id);
    if (!da || !db) return 0;
    return SLOT_IDS.indexOf(da.slot) - SLOT_IDS.indexOf(db.slot) || RARITY_IDS.indexOf(instanceRarity(b)) - RARITY_IDS.indexOf(instanceRarity(a)) || db.ilvl - da.ilvl;
  });
}

/** Item ikonu (piksel art / boyalı görsel; nadirlik rengi parıltı). Boş yuvada yuvanın soluk ikonu. */
export function itemIcon(inst: Pick<ItemInstance, 'id'> & { rolls?: unknown } | null | undefined, slot: SlotId, size = 1): HTMLImageElement {
  const d = inst ? itemDef(inst.id) : undefined;
  const color = inst && d ? instanceColor(inst) : undefined;
  const img = itemDefIcon(d, slot, color, `gr-svg gr-px${d ? '' : ' dim'}`);
  img.style.setProperty('--sz', String(size));
  if (d && color) img.style.setProperty('--glow', color);
  return img;
}

export interface CellOptions {
  /** Seçili: nadirlik renginde çerçeve + ekrandaki TEK kor elmas. */
  selected?: boolean;
  /** Bu kahraman kullanamaz (soluk). */
  unusable?: boolean;
  /** "Usable" filtresi açıkken kullanılamayan (daha soluk, yerinde). */
  filtered?: boolean;
  shake?: boolean;
  /** Sürükleme / ipucu anahtarları (ör. "bag:<uid>"). */
  drag?: string;
  tip?: string;
  /** Altta fiyat etiketi (tüccar satış fiyatı); null = gizli. */
  price?: number | null;
  priceBad?: boolean;
}

/** Tek item hücresi (torba, tüccar malı, geri alım, ödül torbası). Nadirlik sırası büyüdükçe çerçeve kalınlaşır, köşebentler belirginleşir. */
export function itemCell(inst: ItemInstance, o: CellOptions = {}): HTMLElement {
  const d = itemDef(inst.id);
  const rank = d ? rarityIndex(instanceRarity(inst)) : 0;
  const cell = el('button', `gr-item k${rank}${o.selected ? ' on' : ''}${o.unusable ? ' no' : ''}${o.filtered ? ' filtered' : ''}${o.shake ? ' shake' : ''}`);
  cell.type = 'button';
  cell.style.setProperty('--rc', instanceColor(inst));
  if (o.drag) cell.dataset['drag'] = o.drag;
  if (o.tip) cell.dataset['tip'] = o.tip;
  cell.dataset['item'] = inst.id;
  cell.setAttribute('aria-label', d?.name ?? inst.id);
  if (d) cell.append(itemIcon(inst, d.slot));
  if (rank >= 3) cell.append(el('i', 'gr-c2'), el('i', 'gr-c3'));
  if (o.selected) cell.append(el('i', 'gr-dia'));
  if (o.price === undefined) return cell;
  const wrap = el('div', 'gr-cellw');
  wrap.append(cell);
  const p = el('div', `gr-price${o.priceBad ? ' bad' : ''}`, o.price === null ? '' : String(o.price));
  if (o.price !== null && hasUiImage('gold')) {
    const i = el('img', 'gr-price-ico');
    i.src = iconUrl(uiIconName('gold'));
    i.alt = '';
    p.prepend(i);
  }
  wrap.append(p);
  return wrap;
}

/** Son dokunuş (çift dokunma algısı yeniden çizimden sonra da sürsün diye modül düzeyinde: tek dokunuş seçimi değiştirip yeniden çizer). */
let lastTap: { key: string; at: number } | null = null;

export interface InventoryView {
  items: readonly ItemInstance[];
  size: number;
  /** Başlık ("Bag", "Your bag"). */
  title?: string;
  /** Kullanılabilirlik bu sınıfa göre (soluk hücre); yoksa hepsi olağan. */
  usableClass?: string;
  /** "Usable" filtresi: verilirse başlıkta düğme görünür. */
  filter?: { on: boolean; label: string; toggle: () => void };
  selected?: string;
  shake?: string;
  /** Satış fiyatı etiketi (tüccar). */
  price?: (inst: ItemInstance) => number;
  /** Başlığın sağına ek öğe (ör. ödül ekranında "Close bag"). */
  headExtra?: HTMLElement[];
  onTap?: (uid: string) => void;
  onDouble?: (uid: string) => void;
}

/** Inventory'nin DOM'u: başlık (torba ikonu + "Bag 12 / 30" + filtre) ve sabit boyutlu ızgara (`data-drop="bag"`, boş yuvalar dahil). */
export function renderInventory(v: InventoryView): HTMLElement {
  const root = el('div', 'gr-inv');
  const head = el('div', 'gr-bag-head');
  const sec = el('div', 'gr-sec', `${v.title ?? 'Bag'} ${v.items.length} / ${v.size}`);
  if (hasUiImage('bag')) {
    const i = el('img', 'gr-ui-ico');
    i.src = iconUrl(uiIconName('bag'));
    i.alt = '';
    i.draggable = false;
    sec.classList.add('gr-has-ico');
    sec.prepend(i);
  }
  head.append(sec);
  if (v.filter) {
    const f = v.filter;
    const chip = el('button', `gr-chip${f.on ? ' on' : ''}`, f.label);
    chip.type = 'button';
    chip.addEventListener('click', () => f.toggle());
    head.append(chip);
  }
  if (v.headExtra) head.append(...v.headExtra);
  root.append(head);
  const grid = el('div', `gr-bag${v.price ? ' priced' : ''}`);
  grid.dataset['drop'] = 'bag';
  for (const inst of sortBag(v.items)) {
    const d = itemDef(inst.id);
    if (!d) continue;
    const usable = v.usableClass ? canEquip(v.usableClass, d) : true;
    const cell = itemCell(inst, {
      selected: v.selected === inst.uid,
      unusable: !usable,
      filtered: !!v.filter?.on && !usable,
      shake: v.shake === inst.uid,
      drag: `bag:${inst.uid}`,
      tip: `bag:${inst.uid}`,
      ...(v.price ? { price: v.price(inst) } : {}),
    });
    const btnEl = cell.matches('button') ? cell : cell.querySelector('button')!;
    btnEl.addEventListener('click', () => {
      const now = performance.now();
      if (isDoubleTap(lastTap, inst.uid, now)) {
        lastTap = null;
        v.onDouble?.(inst.uid);
        return;
      }
      lastTap = { key: inst.uid, at: now };
      v.onTap?.(inst.uid);
    });
    grid.append(cell);
  }
  for (let i = v.items.length; i < v.size; i++) {
    const empty = el('div', 'gr-item empty');
    if (v.price) {
      const w = el('div', 'gr-cellw');
      w.append(empty, el('div', 'gr-price'));
      grid.append(w);
    } else grid.append(empty);
  }
  root.append(grid);
  return root;
}
