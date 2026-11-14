/**
 * Demirci paneli (Ömer 2026-11-12, UI Seçim Formu 7: A "Tek kart" seçildi; eski varyant dosyaları silindi). Ekran: src/ui/blacksmith-screen.ts.
 * Ortada seçili item'in OYUNDAKİ item kartı (item-tip.ts v3, demirci seçenekleri `compare` / `lineSel`): Temper'de değişen sayılar satır içinde
 * "13 → 16", Reforge'da kartın satırı seçilir; Combine'da 3 Gear Hero plakası + "?" sonuç kartı (birleşince yeni item'in kartı). Altta eylem çubuğu
 * (bedel solda, düğme sağda); içerik kendi içinde kayar. Boş hâl: kesik çizgili yuva + siluet + tek satır. Eylem animasyonları: blacksmith-fx.ts.
 * Oyun kuralı yok: önizleme ve bedel src/campaign/smith.ts'ten; eylemler blacksmith-screen.ts'ten (BsCtx).
 */
import { COMBINE_COUNT, combinePreview, reforgeChoices, reforgePrice, reforgeSlots, reforgeBlocked, temperPreview, type CampaignState } from '../campaign';
import { affixDef, itemDef, rarityDef, type ItemInstance, type SlotId } from '../progression';
import { reforgeAccepts } from './blacksmith-rules';
import { itemTipNodes } from './item-tip';
import { emptySlotIcon, itemPlate } from './character-panel';
import { oddsSlices } from './econ-model';
import { navSvg } from './nav-icons';

export type BsTab = 'temper' | 'combine' | 'reroll';

/** Ekranın panele verdiği veri ve eylemler (blacksmith-screen.ts > renderSide). */
export interface BsCtx {
  s: CampaignState;
  tab: BsTab;
  /** Sekme satırı (blacksmith-screen.ts kurar). */
  tabs: HTMLElement;
  inst: ItemInstance | null;
  heroClass: string | undefined;
  combine: ItemInstance[];
  /** Combine'dan yeni çıkan item (yuvalar boşken "?" kartı yerine onun kartı görünür; yeni seçimle kalkar). */
  reveal: ItemInstance | null;
  reforgeAt: number;
  setReforgeAt(i: number): void;
  unpick(): void;
  toggleCombine(uid: string): void;
  clearCombine(): void;
  doTemper(): void;
  doReforge(): void;
  doCombine(): void;
  actRow(label: string, blocked: string | null, run: () => void, cost: HTMLElement): HTMLElement;
  stoneRow(stones: number, have: number, gold: number): HTMLElement;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Sekmenin kısa açıklaması (panelde yazar; sekme düğmesinde ipucu yok, Ömer 2026-11-12). */
const NOTE: Record<BsTab, string> = {
  temper: 'Raises the item level by 1. Weapon power and every property grow with it; the level needed to wear it rises too.',
  combine: `Choose ${COMBINE_COUNT} items from the bag. They become one random item of about their average rarity and level.`,
  reroll: 'Reforge works on Epic items only. Pick a property (not the first one): it is rerolled into one of the same tier. Each reroll costs more.',
};
const EMPTY: Record<BsTab, { title: string; sub: string; slot: SlotId }> = {
  temper: { title: 'Choose an item from your bag', sub: 'Tap it, or drag it here. Equipped items work too.', slot: 'weapon' },
  combine: { title: 'Add an item', sub: 'Tap an item in the bag', slot: 'armor' },
  reroll: { title: 'Choose an Epic item', sub: 'Only Epic items can be reforged. Tap one, or drag it here.', slot: 'ring' },
};

/** Seçili item'i demirciden çıkaran küçük X (44 px dokunma alanı; sağ tık da çıkarır). */
function removeBtn(run: () => void, label = 'Remove'): HTMLButtonElement {
  const b = el('button', 'bsv-x');
  b.type = 'button';
  b.innerHTML = navSvg('close');
  b.setAttribute('aria-label', label);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    run();
  });
  return b;
}

/** Sekmeye uygun hiçbir item yokken (çanta boş / Epic yok) boş yuvanın yazısı; yoksa undefined (normal yönerge). Yalnız yazı, kural değişmez. */
function nothingEligible(ctx: BsCtx): { title: string; sub: string } | undefined {
  const worn = ctx.s.roster.flatMap((h) => Object.values(h.equipment).filter((x): x is ItemInstance => !!x));
  const all = [...ctx.s.inventory, ...worn];
  if (ctx.tab === 'temper' && !all.length) return { title: 'Nothing to temper', sub: 'Your bag is empty and no hero wears gear yet.' };
  if (ctx.tab === 'reroll' && !all.some((x) => reforgeAccepts(x))) return { title: 'No Epic items', sub: 'Nothing you own can be reforged right now.' };
  return undefined;
}

/** Boş yuva: kesik çizgili çerçeve + yuva silueti + ne yapılacağı (bırakma hedefi). */
function emptySlot(tab: BsTab, cls: string, why?: { title: string; sub: string }): HTMLElement {
  const e = { ...EMPTY[tab], ...why };
  const box = el('div', `bsv-empty ${cls}${tab === 'reroll' ? ' epic' : ''}`);
  box.dataset['drop'] = 'smith';
  const ico = el('span', 'bsv-empty-ico');
  ico.append(emptySlotIcon(e.slot));
  box.append(ico, el('div', 'bsv-empty-t', e.title), el('div', 'bsv-empty-s', e.sub));
  if (tab === 'reroll') box.style.setProperty('--rc', rarityDef('epic').color);
  return box;
}

/** Item ipucu kartı v3 (oyunun kendi kartı), panel içinde sabit; sağ tık = çıkar. */
function card(inst: ItemInstance, ctx: BsCtx, state: Parameters<typeof itemTipNodes>[3] = {}, remove = true): HTMLElement {
  const wrap = el('div', 'bsv-cardw');
  wrap.append(...itemTipNodes(inst, ctx.heroClass, [], state));
  if (remove) {
    wrap.append(removeBtn(ctx.unpick));
    wrap.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      ctx.unpick();
    });
  }
  return wrap;
}

/** Reforge havuzu: seçili satırın olabileceği özellikler. */
const poolNote = (inst: ItemInstance, at: number): string => {
  const pool = reforgeChoices(inst, at).map((id) => affixDef(id)?.name ?? id);
  return pool.length ? `Can become: ${pool.join(', ')}` : 'No property of this tier fits';
};

/** Reforge satır seçimi (kartın kendi satırlarında). */
const reforgeSel = (ctx: BsCtx, inst: ItemInstance) => ({
  can: reforgeSlots(inst),
  on: ctx.reforgeAt,
  pick: (i: number) => ctx.setReforgeAt(ctx.reforgeAt === i ? -1 : i),
  ...(ctx.reforgeAt >= 0 ? { note: poolNote(inst, ctx.reforgeAt) } : {}),
});

function temperBar(ctx: BsCtx, inst: ItemInstance): HTMLElement | null {
  const tp = temperPreview(ctx.s, inst.uid);
  return tp ? ctx.actRow('Temper', tp.blocked, ctx.doTemper, ctx.stoneRow(tp.stones, tp.stonesHave, tp.price)) : null;
}
function reforgeBar(ctx: BsCtx, inst: ItemInstance): HTMLElement {
  const why = ctx.reforgeAt < 0 ? 'Pick a property first' : reforgeBlocked(ctx.s, inst.uid, ctx.reforgeAt);
  return ctx.actRow('Reforge', why, ctx.doReforge, ctx.stoneRow(0, 0, reforgePrice(inst)));
}
function combineBar(ctx: BsCtx): HTMLElement {
  const pv = combinePreview(ctx.s, ctx.combine.map((x) => x.uid));
  const wrap = ctx.actRow('Combine', pv.blocked, ctx.doCombine, ctx.stoneRow(0, 0, pv.price));
  // yuvalar boşken (ilk açılış / başarılı Combine sonrası) neden yazısı yok; düğme yine pasif. Yazı yalnız 1-2 item ya da kural dışı seçimde.
  if (!ctx.combine.length) wrap.querySelector('.bs-why')?.remove();
  if (ctx.combine.length) {
    const clear = el('button', 'el-btn', 'Clear');
    clear.type = 'button';
    clear.addEventListener('click', ctx.clearCombine);
    wrap.insertBefore(clear, wrap.lastElementChild);
  }
  return wrap;
}

/** Combine yuvası plakası: dolu = Gear Hero item plakası (ipucu hover'da), boş = boş plaka. */
function combinePlate(ctx: BsCtx, i: number): HTMLElement {
  const inst = ctx.combine[i];
  if (inst) {
    // plakanın kendisi düğme: sağdaki X yalnız işaret (iç içe düğme olmaz), dokunuş / sağ tık yuvadan çıkarır
    const x = el('span', 'bsv-x mark');
    x.innerHTML = navSvg('close');
    const p = itemPlate(inst, undefined, x, true);
    p.setAttribute('aria-label', `Remove ${itemDef(inst.id)?.name ?? 'item'}`);
    p.dataset['tip'] = `smith:${inst.uid}`;
    p.addEventListener('click', () => ctx.toggleCombine(inst.uid));
    p.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      ctx.toggleCombine(inst.uid);
    });
    return p;
  }
  const b = el('button', 'gr-slot gr-plate empty bsv-eplate');
  b.type = 'button';
  b.dataset['drop'] = 'smith';
  b.style.setProperty('--rc', '#5b4a33');
  const ico = el('span', 'gp-ico');
  ico.append(emptySlotIcon(EMPTY.combine.slot));
  const tx = el('div', 'gr-slot-text gp-tx');
  tx.append(el('div', 'gp-lbl', `Slot ${i + 1}`), el('div', 'gr-slot-name', i === ctx.combine.length ? EMPTY.combine.title : 'Empty'));
  b.append(ico, tx);
  return b;
}

/** Combine sonucu "?" kartı: item kartının çerçevesi; olası nadirlik ve item seviyesi (3 yuva dolunca), oran çubuğu. */
function resultCard(ctx: BsCtx): HTMLElement {
  const full = ctx.combine.length === COMBINE_COUNT;
  const pv = combinePreview(ctx.s, ctx.combine.map((x) => x.uid));
  const c = el('div', `it-card bsv-result${full ? '' : ' wait'}`);
  c.style.setProperty('--rc', full ? rarityDef(pv.rarityHigh).color : '#8a7a5a');
  const head = el('div', 'it-head');
  head.append(el('span', 'it-medal bsv-q', '?'));
  const id = el('div', 'it-id');
  id.append(el('strong', 'it-name', 'Combined item'), el('div', 'it-rule'));
  const kind = full ? (pv.rarityLow === pv.rarityHigh ? rarityDef(pv.rarityLow).name : `${rarityDef(pv.rarityLow).name} or ${rarityDef(pv.rarityHigh).name}`) : 'Unknown';
  id.append(el('div', 'it-kind', kind), el('div', 'it-sub', full ? `Item level ${pv.ilvl}` : `Add ${COMBINE_COUNT - ctx.combine.length} more`));
  head.append(id);
  c.append(head);
  const main = el('div', 'it-main');
  if (full) {
    const bar = el('div', 'bs-bar');
    for (const sl of oddsSlices(pv.rarityLow, pv.rarityHigh, pv.upChance)) {
      const seg = el('i', '', `${sl.pct}%`);
      seg.style.width = `${sl.pct}%`;
      seg.style.background = sl.color;
      bar.append(seg);
    }
    main.append(bar, el('div', 'bsv-rnote', pv.sameBase ? `Same base: a new ${itemDef(pv.sameBase)?.name ?? 'item'} with new properties.` : 'Mixed items: a random item.'));
  } else main.append(el('div', 'bsv-rnote', 'Rarity is about the average of the three. Item level is their average.'));
  c.append(main);
  return c;
}

/** Paneli kurar: başlık / alt yazı / demirci satırından SONRA gelen her şey (sekmeler, açıklama, kayan içerik, eylem çubuğu). */
export function renderSmithPanel(ctx: BsCtx): HTMLElement[] {
  const body = el('div', 'bsv-body');
  let bar: HTMLElement | null = null;
  const { inst } = ctx;
  if (ctx.tab === 'combine') {
    const plates = el('div', 'gr-wplates bsv-plates');
    for (let i = 0; i < COMBINE_COUNT; i++) plates.append(combinePlate(ctx, i));
    const rev = !ctx.combine.length && ctx.reveal ? ctx.reveal : null;
    if (ctx.s.inventory.length < COMBINE_COUNT) plates.append(el('div', 'bsv-empty-s', `Combine needs ${COMBINE_COUNT} items in the bag. You have ${ctx.s.inventory.length}.`));
    body.append(plates, el('div', 'bsv-down', '↓'), rev ? revealCard(rev, ctx) : resultCard(ctx));
    bar = combineBar(ctx);
  } else if (!inst || !itemDef(inst.id)) body.append(emptySlot(ctx.tab, 'card', nothingEligible(ctx)));
  else if (ctx.tab === 'temper') {
    const tp = temperPreview(ctx.s, inst.uid);
    body.append(card(inst, ctx, tp?.after ? { compare: { other: tp.after, mode: 'arrow' } } : {}));
    bar = temperBar(ctx, inst);
  } else {
    body.append(card(inst, ctx, { lineSel: reforgeSel(ctx, inst) }));
    if (ctx.reforgeAt < 0) body.append(el('div', 'bsv-hint', 'Tap a property on the card to reforge it.'));
    bar = reforgeBar(ctx, inst);
  }
  body.classList.add('bsv-scroll');
  const out: HTMLElement[] = [ctx.tabs, el('div', 'bs-note bsv-note', NOTE[ctx.tab]), body];
  if (bar) {
    bar.classList.add('bsv-bar');
    out.push(bar);
  }
  const root = el('div', 'bsv bsv-a');
  root.append(...out);
  return [root];
}

/** Combine sonucu: yeni item'in kartı (köşede "New"), çıkarma X'i yok. */
function revealCard(inst: ItemInstance, ctx: BsCtx): HTMLElement {
  const wrap = el('div', 'bsv-cardw bsv-reveal');
  wrap.append(...itemTipNodes(inst, ctx.heroClass), el('span', 'bsv-newtag', 'New'));
  return wrap;
}
