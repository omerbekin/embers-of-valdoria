/**
 * Ödül ekranının torbası (Ömer 2026-10-11, g1; 2026-10-18: YENİ ORTAK ENVANTER): ödül kartları aynen kalır; "View bag" ile kartlar küçülüp
 * söner ve ortak envanter (Gear, "Ledger" defteri) açılır; ödüllerin küçük ikonları ganimet ekranındaki gibi solda ek panel olarak durur
 * (Gear'ın `GearExt` eki, loot-screen.ts / merchant-screen.ts ile aynı bileşen). İkona dokunmak = o ödülü al (kartla aynı); ipucunda ne
 * verdiği ve item'in her kahramana etkisi. Yer açmak için torba item'i çöp kutusuna sürüklenir (Rare+ onaylı; Gear'ın kuralı).
 * "Close bag" / Esc / zemine dokunma kartlara geri döner. Phaser kart animasyonu EndlessScene'de. Ödül akışı ve kuralları DEĞİŞMEZ.
 * Oyun içi metinler İngilizce.
 */
import './gear.css';
import { instanceColor, itemDef, type ItemInstance } from '../progression';
import { iconUrl } from './dom-icons';
import { itemIcon } from './inventory';
import { itemTipNodes } from './item-tip';
import { heroTipExtra, openGear, type GearApi, type GearExt, type GearSource } from './gear-screen';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Küçük ödül ikonu: item ödülünde item örneği; diğerlerinde amblem (ikon adı) + başlık + açıklama. */
export interface RewardTile {
  inst?: ItemInstance;
  /** Amblem ikonu adı (dom-icons > iconUrl) ve rengi. */
  icon?: string;
  accent?: string;
  title: string;
  text: string;
  /** Kısa etiket (ikonun altında): "+60 gold", "Heal 30%", item adı. */
  label: string;
  /** Alınamıyorsa nedeni (torba dolu) ya da null. */
  blocked?: string | null;
}

export interface RewardBagHooks {
  /** Ödülü al (sahne kapatır ve kartla aynı yolu izler). */
  take(index: number): void;
  /** Torba kapandı (sahne kartları geri getirir). */
  onClose(): void;
  /** Ödül listesi her çizimde yeniden okunur (yer açılınca engel kalkar). */
  tiles(): RewardTile[];
}

export function openRewardBag(root: HTMLElement, src: GearSource, h: RewardBagHooks): () => void {
  let api: GearApi | null = null;
  /** true = ödül alındı ya da sahne kapattı: `h.onClose` çağrılmaz. */
  let silent = false;
  const side = el('div', 'gr-panel gr-gear gr-ledger gr-loot');

  const takeTile = (i: number): void => {
    const t = h.tiles()[i];
    if (!t) return;
    if (t.blocked) {
      api?.flash(t.blocked);
      return;
    }
    silent = true;
    closeGear();
    h.take(i);
  };

  const renderSide = (): void => {
    const tiles = h.tiles();
    side.replaceChildren();
    const head = el('div', 'gr-head gr-lhead');
    head.append(el('div', 'gr-title', 'Rewards'));
    side.append(head);
    const list = el('div', 'gr-loot-list');
    tiles.forEach((t, i) => {
      const tile = el('button', `rb-tile gr-loot-tile${t.blocked ? ' blocked' : ''}`);
      tile.type = 'button';
      tile.dataset['tip'] = `rw:${i}`;
      tile.style.setProperty('--i', String(i));
      const medal = el('span', 'rb-medal');
      if (t.inst) {
        medal.style.setProperty('--rc', instanceColor(t.inst));
        const d = itemDef(t.inst.id);
        if (d) medal.append(itemIcon(t.inst, d.slot));
      } else if (t.icon) {
        medal.style.setProperty('--rc', t.accent ?? '#e8c47e');
        const im = el('img', 'rb-emblem');
        im.src = iconUrl(t.icon, t.accent ?? '#e8c47e');
        im.alt = '';
        im.draggable = false;
        medal.append(im);
      }
      const lab = el('span', 'rb-label', t.label);
      if (t.inst) lab.style.color = instanceColor(t.inst);
      tile.append(medal, lab);
      tile.addEventListener('click', () => takeTile(i));
      list.append(tile);
    });
    side.append(list);
    const foot = el('div', 'gr-foot');
    const close = el('button', 'gr-btn primary', 'Close bag');
    close.type = 'button';
    close.addEventListener('click', () => api?.close());
    foot.append(close);
    side.append(foot);
  };

  const ext: GearExt = {
    side,
    bagOnly: true, // yalnızca ödüller + ortak torba (kahraman sayfası yok)
    hideGold: false,
    attach: (_overlay, a) => {
      api = a;
    },
    render: renderSide,
    tipNodes: (key) => {
      if (!key.startsWith('rw:')) return null;
      const t = h.tiles()[Number(key.slice(3))];
      if (!t) return [];
      if (t.inst) return itemTipNodes(t.inst, undefined, heroTipExtra(src.heroes(), t.inst, true));
      const out: HTMLElement[] = [el('b', 'it-name', t.title), el('div', 'it-sub', t.text)];
      if (t.blocked) out.push(el('div', 'it-no', t.blocked));
      return out;
    },
    // dokunmatik: tek dokunuş ipucunu açar; ödül ipucundaki "Take" ile alınır
    tipActions: (key) => {
      if (!key.startsWith('rw:')) return null;
      const i = Number(key.slice(3));
      const t = h.tiles()[i];
      if (!t) return [];
      return [{ label: 'Take', disabled: !!t.blocked, run: () => takeTile(i) }];
    },
    onDoubleTap: (key) => (key.startsWith('rw:') ? (takeTile(Number(key.slice(3))), true) : undefined),
  };
  const closeGear = openGear(root, src, {
    ext,
    onClose: () => {
      if (!silent) h.onClose();
    },
  });
  return () => {
    silent = true;
    closeGear();
  };
}
