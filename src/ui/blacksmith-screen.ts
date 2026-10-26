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
import './econ.css';
import {
  COMBINE_COUNT,
  combineItemBlocked,
  combineItems,
  combinePreview,
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
  temperStonesOf,
  type CampaignState,
} from '../campaign';
import { affixDef, affixLines, instanceColor, instanceSubtitle, itemDef, type ItemInstance, type SlotId } from '../progression';
import { campaignGearSource, openGear, type GearApi, type GearExt } from './gear-screen';
import { itemCell } from './inventory';
import { itemTipNodes } from './item-tip';
import { uiSound, worldSound } from './ui-sound';
import { hasUiImage, uiIconName } from './ui-icons';
import { iconUrl } from './dom-icons';
import { oddsSlices } from './econ-model';
import { COMBINE_ICON, REROLL_ICON, TEMPER_STONE_ICON, iconImg, temperStoneImg } from './temper-stone';

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
  combine: 'Three become one. Let us see what the fire made of them.',
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
  type Tab = 'temper' | 'combine' | 'reroll';
  let tab: Tab = 'temper';
  let combine: string[] = [];
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
    api?.flash('Affix rerolled', true);
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

  const stoneRow = (stones: number, have: number, gold: number): HTMLElement => {
    const row = el('div', 'bs-cost');
    if (stones > 0) {
      const st = el('span', `st${have < stones ? ' short' : ''}`);
      st.append(temperStoneImg(), `${stones} stone${stones === 1 ? '' : 's'}`);
      row.append(st);
    }
    const g = el('span', 'st');
    const gi = goldIcon();
    if (gi) g.append(gi);
    g.append(String(gold));
    row.append(g);
    return row;
  };

  const doCombine = (): void => {
    try {
      set(combineItems(get(), combine));
    } catch (err) {
      line = 'poor';
      api?.flash(err instanceof Error ? err.message : String(err));
      api?.rerender();
      return;
    }
    combine = [];
    uiSound('buy');
    line = 'combine';
    api?.flash('Combined', true);
    api?.rerender();
  };

  /** Combine yuvasina ekle / cikar. */
  const toggleCombine = (uid: string): void => {
    if (combine.includes(uid)) combine = combine.filter((x) => x !== uid);
    else {
      const why = combineItemBlocked(get(), uid) ?? (combine.length >= COMBINE_COUNT ? 'All three slots are full' : null);
      if (why) {
        uiSound('error');
        api?.flash(why);
        return;
      }
      combine = [...combine, uid];
    }
    uiSound('select');
    api?.rerender();
  };

  /** Torbadaki / takili item'e dokunus: Combine sekmesinde yuvaya, digerlerinde demirciye alir. */
  const take = (uid: string): void => (tab === 'combine' ? toggleCombine(uid) : choose(uid));

  const selectedBlock = (inst: ItemInstance): HTMLElement => {
    const sel = el('div', 'bs-sel');
    sel.append(itemCell(inst, { tip: `smith:${inst.uid}` }));
    const t = el('div', 'bs-sel-t');
    const n = el('div', 'bs-name', itemDef(inst.id)?.name ?? '');
    n.style.color = instanceColor(inst);
    t.append(n, el('div', 'bs-subt', instanceSubtitle(inst)));
    sel.append(t);
    return sel;
  };

  const actRow = (label: string, blocked: string | null, run: () => void, cost: HTMLElement): HTMLElement => {
    const b = btn('gr-btn primary', label, run);
    b.disabled = !!blocked;
    if (blocked) b.title = blocked;
    const wrap = el('div', 'gr-shopact bs-act');
    wrap.append(cost);
    if (blocked) wrap.append(el('span', 'bs-why', blocked));
    wrap.append(b);
    return wrap;
  };

  function pickBox(): HTMLElement {
    const box = el('div', 'gr-sellbox bs-pickbox');
    box.dataset['drop'] = 'smith';
    box.append(el('div', 'gr-sellbox-t', 'Tap an item in the bag or an equipped item, or drag one here.'));
    return box;
  }

  function temperPane(pane: HTMLElement, s: CampaignState, inst: ItemInstance | null): void {
    if (!inst || !itemDef(inst.id)) return void pane.append(pickBox());
    pane.append(selectedBlock(inst));
    const tp = temperPreview(s, inst.uid);
    pane.append(el('div', 'bs-note', 'Raises the item level by 1. Weapon power and every property grow with it; the level needed to wear it rises too.'));
    if (tp?.after) pane.append(diffRows(temperLines(inst, tp.after)));
    if (tp) pane.append(actRow('Temper', tp.blocked, doTemper, stoneRow(tp.stones, tp.stonesHave, tp.price)));
  }

  function combinePane(pane: HTMLElement, s: CampaignState): void {
    pane.append(el('div', 'bs-note', `Choose ${COMBINE_COUNT} items from the bag. They become one random item of about their average rarity and level.`));
    combine = combine.filter((u) => s.inventory.some((x) => x.uid === u));
    const row = el('div', 'bs-comb');
    for (let i = 0; i < COMBINE_COUNT; i++) {
      const inst = combine[i] ? findItem(s, combine[i]!)?.inst : undefined;
      if (i) row.append(el('span', 'op', '+'));
      if (inst) {
        const c = itemCell(inst, { tip: `smith:${inst.uid}` });
        c.addEventListener('click', () => toggleCombine(inst.uid));
        row.append(c);
      } else row.append(el('div', 'bs-slot', String(i + 1)));
    }
    row.append(el('span', 'op', '='), el('div', 'bs-slot void', '?'));
    pane.append(row);
    const pv = combinePreview(s, combine);
    if (pv.items.length === COMBINE_COUNT) {
      const odds = el('div', 'bs-odds');
      const bar = el('div', 'bs-bar');
      const leg = el('div', 'bs-leg');
      for (const sl of oddsSlices(pv.rarityLow, pv.rarityHigh, pv.upChance)) {
        const seg = el('i', '', `${sl.pct}%`);
        seg.style.width = `${sl.pct}%`;
        seg.style.background = sl.color;
        bar.append(seg);
        const l = el('span');
        const nm = el('b', '', sl.name);
        nm.style.color = sl.color;
        l.append(nm, ` ${sl.pct}%`);
        leg.append(l);
      }
      odds.append(bar, leg);
      pane.append(odds);
      pane.append(el('div', 'bs-note', `${pv.sameBase ? 'Three of the same base item give that kind of item with new properties.' : 'Mixed items give a random item.'} Item level ${pv.ilvl}.`));
    }
    const wrap = actRow('Combine', pv.blocked, doCombine, stoneRow(0, 0, pv.price));
    const clear = btn('gr-btn', 'Clear', () => {
      combine = [];
      uiSound('select');
      renderSide();
    });
    wrap.insertBefore(clear, wrap.lastElementChild);
    pane.append(wrap);
  }

  function rerollPane(pane: HTMLElement, s: CampaignState, inst: ItemInstance | null): void {
    if (!inst || !itemDef(inst.id)) return void pane.append(pickBox());
    pane.append(selectedBlock(inst));
    const slots = reforgeSlots(inst);
    if (!slots.length) return void pane.append(el('div', 'bs-note', 'Only Epic items can have an affix rerolled.'));
    pane.append(el('div', 'bs-note', 'Pick a property (not the first one). It is rerolled into a property of the same tier, which may be the same one with a new value. Each reroll of this item costs more.'));
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
    pane.append(actRow('Reroll affix', why, doReforge, stoneRow(0, 0, reforgePrice(inst))));
  }

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
    const stones = el('div', 'bs-stones');
    stones.title = 'Temper Stones';
    stones.append(temperStoneImg(), String(temperStonesOf(s)));
    const pr = el('span', 'bs-purse');
    pr.append(stones, purse);
    head.append(el('span', 'gr-grow'), pr);
    const kids: HTMLElement[] = [head];
    kids.push(el('div', 'gr-shop-sub', `${o.sub ? `${o.sub} · ` : ''}Items can be tempered up to item level ${smithCap(s)} in this chapter`));
    kids.push(el('div', 'gr-odo-line bs-line', LINES[line]));

    const tabs = el('div', 'bs-tabs');
    const defs: Array<[Tab, string, string, string]> = [
      ['temper', 'Temper', TEMPER_STONE_ICON, ''],
      ['combine', 'Combine', COMBINE_ICON, ''],
      ['reroll', 'Reroll affix', REROLL_ICON, 'Epic'],
    ];
    for (const [id, label, icon, tag] of defs) {
      const b = el('button', `bs-tab${tab === id ? ' on' : ''}`);
      b.type = 'button';
      b.append(iconImg(icon, 'bs-tab-ico'), label);
      if (tag) b.append(el('i', '', tag));
      b.addEventListener('click', () => {
        if (tab === id) return;
        tab = id;
        uiSound('select');
        renderSide();
      });
      tabs.append(b);
    }
    kids.push(tabs);

    const pane = el('div', 'gr-shoppane bs-pane');
    const inst = current();
    if (tab === 'temper') temperPane(pane, s, inst);
    else if (tab === 'combine') combinePane(pane, s);
    else rerollPane(pane, s, inst);
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
        if (uid && findItem(get(), uid)) take(uid);
      });
      overlay.classList.add('gr-shop-overlay');
      overlay.setAttribute('aria-label', 'Blacksmith');
    },
    render: renderSide,
    targetOf: (v) => (v === 'smith' ? { kind: 'smith' } : null),
    onDrop: (s, tg) => {
      // torbadan bırakılan item seçilir (satış yok); kuşanılmış yuvadan panele bırakılan item de seçilir (çıkarılmaz; playtest 2026-10-23 U10)
      if (s.kind === 'bag') {
        take(s.uid);
        return true;
      }
      if (s.kind === 'slot' && tg?.kind === 'smith') {
        const uid = get().roster.find((h) => h.id === s.heroId)?.equipment[s.slot]?.uid ?? '';
        if (uid) take(uid);
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
      return pick === uid && tab !== 'combine' ? [] : [{ label: tab === 'combine' ? (combine.includes(uid) ? 'Remove' : 'Add') : 'Choose', primary: true, run: () => take(uid) }];
    },
    onTap: (key) => {
      // dokunmatik: takılı item'e ilk dokunuş hemen demirciye alır (ipucu ve Unequip normal kalır)
      if (!key.startsWith('slot:')) return;
      const uid = equippedUid(key);
      if (uid) take(uid);
    },
    bagActions: (uid) => [{ label: tab === 'combine' ? 'Add to Combine' : 'Choose for the smith', primary: false, run: () => take(uid) }],
    onDoubleTap: (key) => {
      if (key.startsWith('bag:')) return (take(key.slice(4)), true);
      if (key.startsWith('smith:')) return (take(key.slice(6)), true);
      return undefined;
    },
  };
  return openGear(root, src, { ext, onClose: () => o.onClose?.() });
}
