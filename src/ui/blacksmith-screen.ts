/**
 * Demirci (Blacksmith) DOM ekranı (Ömer 2026-10-18, ilerleme TUR 1 madde 7): tüccar ekranının kalıbı (src/ui/merchant-screen.ts,
 * docs/design/ui-reference.md): solda DEMİRCİ paneli (başlık + kese, kısa satır, seçili item, Temper ve Reforge), sağda ORTAK ENVANTER (Gear).
 * Seçim dokunarak: torbadaki item'e dokun (ya da sağdaki kahraman panelinde takılı bir item'e tek tıkla), istersen torbadan panele sürükle.
 * Temper: önizleme (önce -> sonra: item seviyesi, seviye şartı, silah gücü, affix değerleri), fiyat; altın yetmezse ya da tavan / seviye şartı
 * engellerse düğme pasif ve neden yazar. Reforge (yalnız Epic): ana affix dışındaki bir affix seçilir, aynı kademeden yeniden zarlanır; fiyat her
 * tekrarda artar. Kurallar saf: src/campaign/smith.ts. Oyun içi metinler İngilizce; italik yok (yalnızca kısa flavor satırı).
 */
import './gear.css';
import './gear-plates.css';
import './blacksmith.css';
import {
  findItem,
  reforgeBlocked,
  reforgeChoices,
  reforgeItem,
  reforgePrice,
  reforgeSlots,
  smithCap,
  temperItem,
  temperLines,
  temperPreview,
  type CampaignState,
} from '../campaign';
import { affixDef, affixLines, instanceColor, instanceSubtitle, itemDef, type ItemInstance, type SlotId } from '../progression';
import { campaignGearSource, openGear, type GearApi, type GearExt } from './gear-screen';
import { itemCell } from './inventory';
import { itemTipNodes } from './item-tip';
import { uiSound, worldSound } from './ui-sound';
import { hasUiImage, uiIconName } from './ui-icons';
import { iconUrl } from './dom-icons';

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
const goldIcon = (cls = 'gr-price-ico'): HTMLImageElement | null => {
  if (!hasUiImage('gold')) return null;
  const i = el('img', cls);
  i.src = iconUrl(uiIconName('gold'));
  i.alt = '';
  i.draggable = false;
  return i;
};

/** Demircinin kısa satırları (flavor). */
const LINES = {
  idle: 'Bring me steel, leather or a charm. I can make it stronger, for a price.',
  temper: 'There. Harder, keener, better than it was.',
  reforge: 'The old work is gone. See what the fire gave you.',
  poor: 'Coin first. The forge does not burn for free.',
};

/**
 * Demirci ekranını açar (kasaba ekranındaki "Blacksmith" yeri ya da debug). `sub` = alt başlık (kasabanın adı). Kapatma (X / Esc / zemin) = onClose.
 * Dönen: kapat.
 */
export function openBlacksmith(root: HTMLElement, get: () => CampaignState, set: (s: CampaignState) => void, o: { sub?: string; onClose?: () => void } = {}): () => void {
  worldSound('door');
  const src = campaignGearSource(get, set);
  let api: GearApi | null = null;
  let pick = '';
  let lastBag = '';
  let reforgeAt = -1;
  let line: keyof typeof LINES = 'idle';
  const side = el('div', 'gr-panel gr-gear gr-ledger gr-shop bs-smith');
  side.dataset['drop'] = 'smith';

  /** Seçili item (torbadan seçim Gear'ın kendi seçimi; takılı item paneldeki satırdan). */
  const current = (): ItemInstance | null => {
    const s = get();
    const bagSel = api?.selected() ?? '';
    // torbada yeni bir item seçildiyse (Gear'ın seçimi değişti) demirci onu alır; takılı item seçimi bunu ezmez
    if (bagSel !== lastBag) {
      lastBag = bagSel;
      if (bagSel && s.inventory.some((x) => x.uid === bagSel)) {
        pick = bagSel;
        reforgeAt = -1;
      }
    }
    return pick ? (findItem(s, pick)?.inst ?? null) : null;
  };

  /** Sağ paneldeki seçili kahramanın `slot:<yuva>` anahtarından takılı item'in uid'i. */
  const equippedUid = (key: string): string => api?.hero()?.equipment[key.slice(5) as SlotId]?.uid ?? '';

  const choose = (uid: string): void => {
    if (pick === uid) return;
    pick = uid;
    // takılı item seçilince torbadaki seçim vurgusu kalkar (iki item birden seçili görünmesin)
    if (!get().inventory.some((x) => x.uid === uid)) {
      api?.clearSel();
      lastBag = '';
    }
    reforgeAt = -1;
    uiSound('select');
    api?.rerender();
  };

  const doTemper = (): void => {
    if (!pick) return;
    try {
      set(temperItem(get(), pick));
    } catch (err) {
      line = 'poor';
      api?.flash(err instanceof Error ? err.message : String(err));
      api?.rerender();
      return;
    }
    uiSound('buy');
    line = 'temper';
    api?.flash(`${itemDef(findItem(get(), pick)?.inst.id ?? '')?.name ?? 'Item'} tempered`, true);
    api?.rerender();
  };

  const doReforge = (): void => {
    if (!pick || reforgeAt < 0) return;
    try {
      set(reforgeItem(get(), pick, reforgeAt));
    } catch (err) {
      line = 'poor';
      api?.flash(err instanceof Error ? err.message : String(err));
      api?.rerender();
      return;
    }
    uiSound('buy');
    line = 'reforge';
    api?.flash('Reforged', true);
    api?.rerender();
  };

  /** Önce -> sonra satırları. */
  const diffRows = (rows: Array<{ label: string; from: string; to: string }>): HTMLElement => {
    const box = el('div', 'bs-diff');
    for (const r of rows) {
      const row = el('div', `bs-row${r.from !== r.to ? ' up' : ''}`);
      if (r.label) row.append(el('span', 'bs-k', r.label));
      row.append(el('span', 'bs-from', r.from));
      if (r.from !== r.to) row.append(el('span', 'bs-arrow', '→'), el('span', 'bs-to', r.to));
      box.append(row);
    }
    return box;
  };

  const priceButton = (label: string, price: number, blocked: string | null, run: () => void): HTMLElement => {
    const b = btn('gr-btn primary', `${label} · ${price}`, run);
    const gi = goldIcon();
    if (gi) b.append(gi);
    b.disabled = !!blocked;
    const wrap = el('div', 'gr-shopact bs-act');
    if (blocked) wrap.append(el('span', 'bs-why', blocked));
    wrap.append(b);
    return wrap;
  };

  function renderSide(): void {
    const s = get();
    const head = el('div', 'gr-head gr-lhead');
    head.append(el('div', 'gr-title', 'Blacksmith'));
    const purse = el('div', 'gr-gold', String(s.gold));
    const gi = goldIcon('gr-ui-ico');
    if (gi) {
      purse.classList.add('gr-has-ico');
      purse.prepend(gi);
    }
    purse.title = 'Gold';
    head.append(el('span', 'gr-grow'), purse);
    const kids: HTMLElement[] = [head];
    kids.push(el('div', 'gr-shop-sub', `${o.sub ? `${o.sub} · ` : ''}Items can be tempered up to item level ${smithCap(s)} in this chapter`));
    kids.push(el('div', 'gr-odo-line bs-line', LINES[line]));

    const inst = current();
    const pane = el('div', 'gr-shoppane bs-pane');
    if (!inst || !itemDef(inst.id)) {
      const box = el('div', 'gr-sellbox bs-pickbox');
      box.dataset['drop'] = 'smith';
      box.append(el('div', 'gr-sellbox-t', 'Tap an item in the bag or an equipped item, or drag one here.'));
      pane.append(box);
    } else {
      // seçili item: hücre + ad + alt başlık
      const sel = el('div', 'bs-sel');
      sel.append(itemCell(inst, { tip: `smith:${inst.uid}` }));
      const t = el('div', 'bs-sel-t');
      const n = el('div', 'bs-name', itemDef(inst.id)?.name ?? '');
      n.style.color = instanceColor(inst);
      t.append(n, el('div', 'bs-subt', instanceSubtitle(inst)));
      sel.append(t);
      pane.append(sel);
      // Temper
      const tp = temperPreview(s, inst.uid);
      pane.append(el('div', 'gr-sec', 'Temper'));
      pane.append(el('div', 'bs-note', 'Raises the item level by 1. Weapon power and every property grow with it; the level needed to wear it rises too.'));
      if (tp?.after) pane.append(diffRows(temperLines(inst, tp.after)));
      if (tp) pane.append(priceButton('Temper', tp.price, tp.blocked, doTemper));
      // Reforge (yalnız Epic)
      pane.append(el('div', 'gr-sec', 'Reforge'));
      const slots = reforgeSlots(inst);
      if (!slots.length) pane.append(el('div', 'bs-note', 'Only Epic items can be reforged.'));
      else {
        pane.append(el('div', 'bs-note', 'Pick a property (not the first one). It is rerolled into a property of the same tier, which may be the same one with a new value. Each reforge of this item costs more.'));
        const lines = affixLines(inst);
        const list = el('div', 'bs-affixes');
        lines.forEach((l, i) => {
          const can = slots.includes(i);
          const b = btn(`bs-affix${reforgeAt === i ? ' on' : ''}${can ? '' : ' main'}`, `[${l.tier}] ${l.text}`, () => {
            if (!can) return;
            reforgeAt = reforgeAt === i ? -1 : i;
            uiSound('select');
            renderSide();
          });
          b.disabled = !can;
          if (!can) b.title = 'The main property stays';
          list.append(b);
        });
        pane.append(list);
        if (reforgeAt >= 0) {
          const pool = reforgeChoices(inst, reforgeAt).map((id) => affixDef(id)?.name ?? id);
          pane.append(el('div', 'bs-note', `Can become: ${pool.join(', ')}`));
        }
        const why = reforgeAt < 0 ? 'Pick a property first' : reforgeBlocked(s, inst.uid, reforgeAt);
        pane.append(priceButton('Reforge', reforgePrice(inst), why, doReforge));
      }
    }
    kids.push(pane);
    side.replaceChildren(...kids);
  }

  const ext: GearExt = {
    side,
    hideGold: true,
    noTrash: true,
    attach: (overlay, a) => {
      api = a;
      // sağdaki kahraman panelinde takılı item'e tek tıkla -> demirciye alınır (dokunmatikte ipucundaki "Choose for the smith")
      // torbadaki item'e tık da her zaman demirciye alır (Gear'ın kendi seçimi aynı item'e ikinci tıkta kalkıyordu: takılı item seçiliyken torbadaki o item'e dönülemiyordu)
      overlay.addEventListener('click', (e) => {
        const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tip^="slot:"], [data-tip^="bag:"]');
        const key = t?.dataset['tip'] ?? '';
        const uid = key.startsWith('slot:') ? equippedUid(key) : key.startsWith('bag:') ? key.slice(4) : '';
        if (uid && findItem(get(), uid)) choose(uid);
      });
      overlay.classList.add('gr-shop-overlay');
      overlay.setAttribute('aria-label', 'Blacksmith');
    },
    render: renderSide,
    targetOf: (v) => (v === 'smith' ? { kind: 'smith' } : null),
    onDrop: (s, tg) => {
      // torbadan bırakılan item seçilir (satış yok); kuşanılmış yuvadan panele bırakılan item de seçilir (çıkarılmaz; playtest 2026-10-23 U10)
      if (s.kind === 'bag') {
        choose(s.uid);
        return true;
      }
      if (s.kind === 'slot' && tg?.kind === 'smith') {
        const uid = get().roster.find((h) => h.id === s.heroId)?.equipment[s.slot]?.uid ?? '';
        if (uid) choose(uid);
        return true;
      }
      return false;
    },
    tipNodes: (key) => {
      if (!key.startsWith('smith:')) return null;
      const f = findItem(get(), key.slice(6));
      return f ? itemTipNodes(f.inst, f.hero?.class) : [];
    },
    tipActions: (key) => {
      if (!key.startsWith('smith:')) return null;
      const uid = key.slice(6);
      return pick === uid ? [] : [{ label: 'Choose', primary: true, run: () => choose(uid) }];
    },
    onTap: (key) => {
      // dokunmatik: takılı item'e ilk dokunuş hemen demirciye alır (ipucu ve Unequip normal kalır)
      if (!key.startsWith('slot:')) return;
      const uid = equippedUid(key);
      if (uid) choose(uid);
    },
    bagActions: (uid) => [{ label: 'Choose for the smith', primary: false, run: () => choose(uid) }],
    onDoubleTap: (key) => {
      if (key.startsWith('bag:')) return (choose(key.slice(4)), true);
      if (key.startsWith('smith:')) return (choose(key.slice(6)), true);
      return undefined;
    },
  };
  return openGear(root, src, { ext, onClose: () => o.onClose?.() });
}
