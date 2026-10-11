/**
 * Ödül ekranının torbası (Ömer 2026-10-11, g1): bugünkü ödül kartları değişmez; "View bag" ile kartlar küçülüp SOLA, yukarıdan aşağı dizilir
 * (küçük ikonlar), ORTAK INVENTORY sağda açılır. Küçük ikonun üstüne gelince / uzun basınca ne verdiği; torbadaki item'lerin ve item ödülünün
 * ipucunda her kahramana etkisi (karşılaştırma). Yer açmak için item çöp kutusuna sürüklenir (Rare+ onaylı). İkona dokunmak = o ödülü al
 * (kartla aynı). "Close bag" / Esc kartlara geri döner. Phaser kart animasyonu EndlessScene'de; bu DOM katmanı ikonlar + torba.
 * Oyun içi metinler İngilizce.
 */
import { closeDom } from './motion';
import { uiSound } from './ui-sound';
import './gear.css';
import { discardNeedsConfirm } from '../campaign';
import { itemDef, instanceColor, type ItemInstance } from '../progression';
import { lockInput, unlockInput } from './input-lock';
import { iconUrl } from './dom-icons';
import { itemIcon, renderInventory } from './inventory';
import { itemTipNodes } from './item-tip';
import { attachItemInteractions } from './item-drag';
import { confirmIn, heroTipExtra, type GearSource } from './gear-screen';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const btn = (cls: string, text: string, run: () => void): HTMLButtonElement => {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', run);
  return b;
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
  const overlay = el('div', 'gr-overlay rb-overlay');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Bag');
  const panel = el('div', 'gr-panel gr-gear rb-panel');
  overlay.append(panel);
  root.append(overlay);
  lockInput('reward-bag');
  uiSound('open');
  let sel = '';
  let flashText = '';
  let closeAsk: (() => void) | null = null;
  const bagInst = (uid: string) => src.bag().find((i) => i.uid === uid);
  const ix = attachItemInteractions({
    overlay,
    panel,
    trash: true,
    sourceOf: (v, t) => (v.startsWith('bag:') ? { kind: 'bag', uid: v.slice(4), itemId: t.dataset['item'] ?? '' } : null),
    targetOf: (v) => (v === 'bag' ? { kind: 'bag' } : v === 'trash' ? { kind: 'trash' } : null),
    classOf: (id) => src.heroes().find((x) => x.id === id)?.class,
    tipNodes: (key) => {
      if (key.startsWith('rw:')) {
        const t = h.tiles()[Number(key.slice(3))];
        if (!t) return [];
        if (t.inst) return itemTipNodes(t.inst, undefined, heroTipExtra(src.heroes(), t.inst, true));
        const out: HTMLElement[] = [el('b', 'it-name', t.title), el('div', 'it-sub', t.text)];
        if (t.blocked) out.push(el('div', 'it-no', t.blocked));
        return out;
      }
      const inst = key.startsWith('bag:') ? bagInst(key.slice(4)) : undefined;
      return inst ? itemTipNodes(inst, undefined, heroTipExtra(src.heroes(), inst, true)) : [];
    },
    onDrop: (_s, _tg, act) => {
      if (act?.kind === 'discard') tryDiscard(act.uid);
    },
  });

  let closed = false;
  const finish = (): void => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    ix.destroy();
    unlockInput('reward-bag');
  };
  /** Kartlara dön: ikonlar ve torba kayarak söner (Reduced motion: anında). */
  const close = (): void => {
    if (closed) return;
    uiSound('close');
    overlay.classList.add('out');
    finish();
    closeDom(overlay, () => overlay.remove());
    h.onClose();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    if (closeAsk && overlay.querySelector('.gr-confirm')) {
      closeAsk();
      closeAsk = null;
    } else close();
  };
  document.addEventListener('keydown', onKey, true);

  const tryDiscard = (uid: string): void => {
    const inst = bagInst(uid);
    const d = inst ? itemDef(inst.id) : undefined;
    if (!inst || !d) return;
    const go = (): void => {
      try {
        src.discard(uid);
        uiSound('confirm');
      } catch (err) {
        flashText = err instanceof Error ? err.message : String(err);
        uiSound('error');
      }
      if (sel === uid) sel = '';
      render();
    };
    if (discardNeedsConfirm(inst)) closeAsk = confirmIn(overlay, `Discard ${d.name}? It is gone for good.`, 'Discard', go, true);
    else go();
  };

  const head = el('div', 'gr-head');
  const body = el('div', 'gr-body rb-body');
  const left = el('div', 'rb-tiles');
  const right = el('div', 'gr-right');
  const foot = el('div', 'gr-foot');
  body.append(left, right);
  panel.append(head, body, foot);
  function render(): void {
    if (closed) return;
    ix.hideTips();
    const gold = el('div', 'gr-gold', `${src.gold()} gold`);
    head.replaceChildren(el('div', 'gr-title', 'Bag'), gold);
    // küçük ödül ikonları (yukarıdan aşağı); dokunmak = al
    left.replaceChildren(el('div', 'gr-sec', 'Rewards'));
    h.tiles().forEach((t, i) => {
      const tile = el('button', `rb-tile${t.blocked ? ' blocked' : ''}`);
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
        medal.append(im);
      }
      const lab = el('span', 'rb-label', t.label);
      if (t.inst) lab.style.color = instanceColor(t.inst);
      tile.append(medal, lab);
      tile.addEventListener('click', () => {
        if (ix.justEnded()) return;
        if (t.blocked) {
          flashText = t.blocked;
          uiSound('error');
          render();
          return;
        }
        finish();
        overlay.remove();
        h.take(i);
      });
      left.append(tile);
    });
    const inv = renderInventory({
      items: src.bag(),
      size: src.bagSize,
      selected: sel,
      onTap: (uid) => {
        sel = sel === uid ? '' : uid;
        render();
      },
    });
    right.replaceChildren(inv);
    const hint = el('div', `gr-foot-hint${flashText ? ' warn' : ''}`, flashText || 'Tap a reward to take it. Drag an item to the trash to make room.');
    flashText = '';
    foot.replaceChildren(hint, btn('gr-btn primary', 'Close bag', close));
  }
  render();
  return () => {
    if (closed) return;
    finish();
    overlay.remove();
  };
}
