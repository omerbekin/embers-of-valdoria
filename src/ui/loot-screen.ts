/**
 * LOOT ekranı (Ömer 2026-10-18): kazanılan savaştan (ve sandık / hediyeden) sonra açılır; eski "Spoils" kartının yerini alır. Ortak envanterin
 * (Gear, v3 "Ledger") soluna ganimet alanı eklenir (taslak public/mockups/unified-inventory.html#v3&enc=reward): düşen item'ler orada durur;
 * oyuncu onları torbaya ya da bir kahraman yuvasına sürükler / dokunur, ya da bırakır. Altın ve XP burada gösterilir. Kapatınca alınmayanlar
 * geride kalır. Düşüş miktarı ve kuralları DEĞİŞMEZ; torba doluysa önce yer açılır (Gear'ın torbası, çöp kutusu).
 * Durum: mevcut `pendingLoot.left / leftRolls` alanları (kayıt şeması aynı): açılırken düşüş `stashLoot` ile ganimet alanına alınır.
 * Oyun içi metinler İngilizce.
 */
import './gear.css';
import { acknowledgeLoot, stashLoot, takeLeftover, type CampaignState } from '../campaign';
import { BAG_SIZE, instanceColor, itemDef, type ItemInstance } from '../progression';
import { iconUrl } from './dom-icons';
import { hasUiImage, uiIconName } from './ui-icons';
import { itemIcon } from './inventory';
import { itemTipNodes } from './item-tip';
import { confirmIn, heroTipExtra, openGear, type GearApi, type GearExt, type GearSource } from './gear-screen';
import { uiSound, worldSound } from './ui-sound';

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

export interface LootHooks {
  get: () => CampaignState;
  set: (s: CampaignState) => void;
  /** Gear kaynağı (sefer: campaignGearSource). */
  gear: GearSource;
  /** Savaştan kazanılan XP (yalnızca gösterim; yoksa satır çıkmaz). */
  xp?: Array<{ name: string; gain: number }>;
  /** Ekran kapandı (alınmayanlar bırakıldı): çağıran devam eder. */
  onDone: () => void;
}

/** Ganimet alanındaki item'ler: `pendingLoot.left` (id + zarlar) item örnekleri olarak, "loot<i>" kimlikleriyle. */
export function lootItems(s: CampaignState): ItemInstance[] {
  const pl = s.pendingLoot;
  return (pl?.left ?? [])
    .map((id, i): ItemInstance | null => (itemDef(id) ? { uid: `loot${i}`, id, ...(pl?.leftRolls?.[i] ? { rolls: pl.leftRolls[i] } : {}) } : null))
    .filter((x): x is ItemInstance => !!x);
}

export interface LootHandle {
  /** Kapat (alınmayanlar kalır; ganimet kaydı silinir, `onDone` çağrılır). */
  close(): void;
  /** Sahne kapanırken: kaydı SİLMEDEN ve `onDone` çağırmadan kapat (ganimet kayıtta bekler). */
  abort(): void;
}

/** Ganimet ekranını açar. */
export function openLootScreen(root: HTMLElement, o: LootHooks): LootHandle {
  o.set(stashLoot(o.get()));
  let aborted = false;
  worldSound('loot_reveal'); // sandık kapağı gıcırdar, içinde sikkeler kayar
  let api: GearApi | null = null;
  let overlayEl: HTMLElement | null = null;
  const side = el('div', 'gr-panel gr-gear gr-ledger gr-loot');
  const idxOf = (key: string): number => Number(key.replace('loot:', ''));
  const instAt = (i: number): ItemInstance | undefined => lootItems(o.get())[i];
  const bagFull = (): boolean => o.get().inventory.length >= BAG_SIZE;

  /** Bir item'i torbaya alır; (isteğe bağlı) kahramana kuşandırır. Hata: kısa uyarı. */
  const take = (index: number, equip?: { heroId: string; slot?: Parameters<GearApi['equip']>[2] }): boolean => {
    const left = o.get().pendingLoot?.left?.length ?? 0;
    if (index < 0 || index >= left) return false;
    if (bagFull()) {
      api?.flash('The bag is full. Make room first: drag an item to the trash.');
      return false;
    }
    const before = new Set(o.get().inventory.map((i) => i.uid));
    o.set(takeLeftover(o.get(), index));
    uiSound('confirm');
    if (equip) {
      const added = o.get().inventory.find((i) => !before.has(i.uid));
      if (added) api?.equip(equip.heroId, added.uid, equip.slot);
    }
    api?.rerender();
    return true;
  };
  const takeAll = (): void => {
    let n = 0;
    while ((o.get().pendingLoot?.left?.length ?? 0) > 0 && !bagFull()) {
      o.set(takeLeftover(o.get(), 0));
      n++;
    }
    if (n) uiSound('confirm');
    if ((o.get().pendingLoot?.left?.length ?? 0) > 0) api?.flash('The bag is full. Make room first: drag an item to the trash.');
    api?.rerender();
  };

  const renderSide = (): void => {
    const s = o.get();
    const drop = s.pendingLoot;
    const items = lootItems(s);
    const rare = [...(drop?.rare ?? [])];
    side.replaceChildren();
    const head = el('div', 'gr-head gr-lhead');
    head.append(el('div', 'gr-title', 'Loot'));
    side.append(head);
    // altın + XP (yalnızca gösterim: altın zaten kesede)
    const gain = el('div', 'gr-loot-gain');
    if (drop?.gold) {
      const g = el('div', 'gr-loot-gold');
      if (hasUiImage('gold')) {
        const im = el('img', 'gr-price-ico');
        im.src = iconUrl(uiIconName('gold'));
        im.alt = '';
        im.draggable = false;
        g.append(im);
      }
      g.append(document.createTextNode(`+${drop.gold} gold`));
      gain.append(g);
    }
    for (const x of o.xp ?? []) if (x.gain > 0) gain.append(el('div', 'gr-loot-xp', `${x.name} +${x.gain} XP`));
    if (gain.childElementCount) side.append(gain);
    const sec = el('div', 'gr-sec', `Items ${items.length}`);
    side.append(sec);
    const list = el('div', 'gr-loot-list');
    items.forEach((inst, i) => {
      const d = itemDef(inst.id);
      if (!d) return;
      const tile = el('button', 'rb-tile gr-loot-tile');
      tile.type = 'button';
      tile.dataset['drag'] = `loot:${i}`;
      tile.dataset['tip'] = `loot:${i}`;
      tile.dataset['item'] = inst.id;
      tile.style.setProperty('--rc', instanceColor(inst));
      const medal = el('span', 'rb-medal');
      medal.style.setProperty('--rc', instanceColor(inst));
      medal.append(itemIcon(inst, d.slot));
      const lab = el('span', 'rb-label', d.name);
      lab.style.color = instanceColor(inst);
      tile.append(medal, lab);
      const ri = rare.indexOf(inst.id);
      if (ri >= 0) {
        rare.splice(ri, 1);
        tile.classList.add('gr-rare-drop');
        tile.append(el('span', 'gr-rare-tag', 'Rare drop'));
      }
      // fare: dokununca torbaya alır; dokunmatik: ipucundaki eylemler (denetçi click'i yutar)
      tile.addEventListener('click', () => take(i));
      list.append(tile);
    });
    if (!items.length) list.append(el('div', 'gr-card-empty', drop?.gold || (o.xp ?? []).length ? 'No gear this time.' : 'Nothing here.'));
    side.append(list);
    if (items.length && bagFull()) side.append(el('div', 'gr-card-warn', 'Bag full. Make room first: drag a bag item to the trash.'));
    const foot = el('div', 'gr-foot');
    const all = btn('gr-btn', 'Take all', takeAll);
    all.disabled = !items.length;
    foot.append(all, btn('gr-btn primary', 'Done', () => api?.close()));
    side.append(foot);
  };

  const ext: GearExt = {
    side,
    hideGold: false,
    attach: (overlay, a) => {
      overlayEl = overlay;
      api = a;
    },
    render: renderSide,
    sourceOf: (v, t) => (v.startsWith('loot:') ? { kind: 'loot', index: idxOf(v), itemId: t.dataset['item'] ?? '' } : null),
    onDrop: (src, _tg, act) => {
      if (src.kind !== 'loot') return false;
      if (act?.kind === 'take') take(act.index, act.heroId ? { heroId: act.heroId, ...(act.slot ? { slot: act.slot } : {}) } : undefined);
      else if (act?.kind === 'none' && act.reason) api?.flash(act.reason === 'Cannot use' ? 'That hero cannot use this item.' : act.reason);
      return true;
    },
    tipNodes: (key) => {
      if (!key.startsWith('loot:')) return null;
      const inst = instAt(idxOf(key));
      return inst ? itemTipNodes(inst, undefined, heroTipExtra(o.gear.heroes(), inst, true)) : [];
    },
    tipActions: (key) => {
      if (!key.startsWith('loot:')) return null;
      const i = idxOf(key);
      const h = api?.hero();
      const acts = [{ label: 'Take', primary: !h, disabled: bagFull(), run: () => void take(i) }];
      if (h) acts.push({ label: 'Take & equip', primary: true, disabled: bagFull(), run: () => void take(i, { heroId: h.id }) });
      return acts;
    },
    onDoubleTap: (key) => (key.startsWith('loot:') ? (take(idxOf(key)), true) : undefined),
    beforeClose: (proceed) => {
      const left = o.get().pendingLoot?.left?.length ?? 0;
      if (!left || !overlayEl) return false;
      confirmIn(overlayEl, `Leave ${left} item${left > 1 ? 's' : ''} behind? ${left > 1 ? 'They are' : 'It is'} lost when you continue.`, 'Leave', proceed, true);
      return true;
    },
  };
  const close = openGear(root, o.gear, {
    ext,
    onClose: () => {
      if (aborted) return;
      o.set(acknowledgeLoot(o.get()));
      o.onDone();
    },
  });
  return {
    close: () => api?.close(),
    abort: () => {
      aborted = true;
      close();
    },
  };
}
