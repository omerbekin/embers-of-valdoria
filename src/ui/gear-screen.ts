/**
 * Sefer kuşanma ekranı (Gear) + "Spoils" (loot) kartı + Ashford teslim kartı (madde 280; items.md 5.4). DOM katmanı, ana menünün zarif stili
 * (Cinzel başlık, EB Garamond metin, kor/altın renkler; src/ui/gear.css). Açıkken Phaser girişi kilitli (input-lock).
 * Kurallar saf modüllerde: kuşanma `src/campaign/gear.ts`, karşılaştırma/metin `src/progression/item-text.ts`, primary uyarısı `primaryCheck`.
 * Ekran bir KAYNAK (GearSource) ile çalışır: sefer (`openGearScreen`, CampaignState) ve endless (`openGear` + src/game/endless-gear.ts) aynı ekranı besler.
 * Oyun içi metinler İngilizce.
 */
import { closeDom } from './motion';
import { itemSoundKind, uiSound, WORLD_AUDIO, worldSound } from './ui-sound';
import './gear.css';
import { activeHeroes, discardItem, discardNeedsConfirm, equipBest, equipItem, takeLeftover, unequipItem, type CampaignState, type Hero } from '../campaign';
import {
  fitsSlot,
  isPlanError,
  offhandBlocker,
  planEquip,
  BAG_SIZE,
  PRIMARY_BONUS_NAME,
  SLOT_IDS,
  TIER_COLOR,
  affixContext,
  affixLines,
  canEquip,
  itemDef,
  instanceColor,
  instanceSubtitle,
  effectLine,
  ITEMS,
  primaryCheck,
  type AffixLine,
  type Equipment,
  type ItemDef,
  type ItemInstance,
  type SlotId,
} from '../progression';
import { lockInput, unlockInput } from './input-lock';
import { itemDefIcon } from './item-icon-dom';
import { statIconUrl } from './stat-tips';
import { dismissOnBackdrop } from './backdrop';
import { iconUrl } from './dom-icons';
import { hasUiImage, uiIconName, type UiIconKind } from './ui-icons';
import type { Stats } from '../engine';
import { avatarUrl, className, renderCharacter } from './character-panel';
import { renderInventory, snapBagRows } from './inventory';
import { itemTipNodes, type ItemTipLine } from './item-tip';
import { attachItemInteractions } from './item-drag';
import { heroItemLine } from './gear-hover';

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

/**
 * Item / yuva ikonu: piksel art (tek ortak kaynak src/game/item-icons.ts; Endless kartları ve Codex de aynısını çizer). Nadirlik rengi yalnızca
 * taş / kenar ayrıntısını boyar ve hafif bir parıltı verir; boş yuvada yuvanın ikonu soluk durur.
 */
function slotIcon(d: ItemDef | undefined, slot: SlotId, color: string | null, size = 1, dim = !d): HTMLImageElement {
  const img = itemDefIcon(d, slot, color ?? undefined, `gr-svg gr-px${dim ? ' dim' : ''}`);
  img.style.setProperty('--sz', String(size));
  if (!dim && color) img.style.setProperty('--glow', color);
  return img;
}


export interface GearOptions {
  get: () => CampaignState;
  set: (s: CampaignState) => void;
  /** Açılınca seçili kahraman (yoksa aktif takımın ilki). */
  hero?: string;
  /** Item takma tutorial'ı (Ashford teslimi): üstte yönlendirme satırı. */
  tutorial?: boolean;
  onClose?: () => void;
}

/** Gear ekranının gördüğü kahraman (sefer Hero'su ve endless kahramanı bu şekle uyar; ekipman 6 yuvalı, boş = null). */
export interface GearHero {
  id: string;
  class: string;
  level: number;
  equipment: Equipment;
}

/**
 * Gear ekranının veri kaynağı (adaptör). İşlemler hata durumunda Error fırlatır (ekran mesajı gösterir); her işlemden sonra ekran
 * kaynaktan yeniden okur. Sefer: `campaignGearSource`; endless: src/game/endless-gear.ts.
 */
export interface GearSource {
  /** Kahramanlar (ekrandaki sırayla). */
  heroes(): GearHero[];
  bag(): ItemInstance[];
  bagSize: number;
  gold(): number;
  /** `slot`: hedef yuva (sürükle-bırak; yoksa varsayılan yuva: progression > defaultEquipSlot). */
  equip(heroId: string, uid: string, slot?: SlotId): void;
  unequip(heroId: string, slot: SlotId): void;
  discard(uid: string): void;
  /** "Equip best": verilen kahramanlar (yoksa tüm takım). */
  equipBest(heroIds?: string[]): void;
  /** Torba boşken kartta görünen yazı. */
  emptyText?: string;
}

/** Seferin kaynağı: CampaignState üzerinden (davranış eskisiyle birebir). */
export function campaignGearSource(get: () => CampaignState, set: (s: CampaignState) => void): GearSource {
  const apply = (fn: (s: CampaignState) => CampaignState): void => set(fn(get()));
  return {
    heroes: () => {
      const s = get();
      return [...activeHeroes(s), ...s.roster.filter((h) => !s.active.includes(h.id))];
    },
    bag: () => get().inventory,
    bagSize: BAG_SIZE,
    gold: () => get().gold,
    equip: (heroId, uid, slot) => apply((x) => equipItem(x, heroId, uid, slot)),
    unequip: (heroId, slot) => apply((x) => unequipItem(x, heroId, slot)),
    discard: (uid) => apply((x) => discardItem(x, uid)),
    equipBest: (ids) => apply((x) => equipBest(x, ids)),
    emptyText: 'The bag is empty. Victories and chests bring new gear.',
  };
}

/** Boyalı arayüz ikonu (assets/ui-icons) varsa yazının önüne küçük resim koyar (yoksa yazı aynen kalır). */
function withUiIcon(e: HTMLElement, k: UiIconKind): void {
  if (!hasUiImage(k)) return;
  const img = document.createElement('img');
  img.className = 'gr-ui-ico';
  img.alt = '';
  img.draggable = false;
  img.src = iconUrl(uiIconName(k));
  e.classList.add('gr-has-ico');
  e.prepend(img);
}

/** Sefer Gear ekranı (eski giriş; kaynak CampaignState). */
export function openGearScreen(root: HTMLElement, o: GearOptions): () => void {
  const s0 = o.get();
  return openGear(root, campaignGearSource(o.get, o.set), { hero: o.hero ?? activeHeroes(s0)[0]?.id ?? s0.roster[0]?.id ?? '', tutorial: o.tutorial, onClose: o.onClose });
}

/** Telefon mu (kısa sahne; src/ui/viewport.ts html.short): Character ve Inventory ayrı tam ekran + geçiş düğmesi. */
export const phoneLayout = (): boolean => document.documentElement.classList.contains('short');

/** Item ipucunun telefondaki ek satırları: her kahramana etkisi (masaüstünde kahraman kartlarında görünür). */
export function heroTipExtra(heroes: GearHero[], inst: ItemInstance, always = false): Array<{ label: string; parts: ItemTipLine[] }> {
  if (!always && !phoneLayout()) return [];
  return heroes.map((h) => {
    const l = heroItemLine(h, inst);
    return { label: className(h.class), parts: l.parts.map((p) => ({ text: p.text, ...(p.dir ? { dir: p.dir } : l.tone === 'no' ? { dir: 'no' as const } : {}) })) };
  });
}

/** Onay kutusu (Rare+ atma, primary bonusu kaybı): pencerenin içinde; Cancel / zemin = iptal. Dönen: kapat. */
export function confirmIn(host: HTMLElement, text: string, ok: string, run: () => void, danger = false): () => void {
  const box = el('div', 'gr-confirm');
  const card = el('div', 'gr-confirm-card');
  const close = (): void => box.remove();
  card.append(el('div', 'gr-confirm-text', text));
  const row = el('div', 'gr-confirm-row');
  row.append(
    btn('gr-btn', 'Cancel', close),
    btn(`gr-btn primary${danger ? ' danger' : ''}`, ok, () => {
      close();
      run();
    }),
  );
  card.append(row);
  box.append(card);
  box.addEventListener('pointerdown', (e) => {
    if (e.target === box) close();
  });
  host.append(box);
  return close;
}

/**
 * Gear ekranı (Ömer 2026-10-11, g1): solda CHARACTER sayfası (kahramanlar | yuvalar + statlar, altta skill'ler), sağda yalnızca INVENTORY
 * (torba). Item kartı / "Usable by" bloğu yok: torba item'inin üstüne gelince imlecin yanında item ipucu (dokunmatikte uzun basış) ve
 * kahraman kartlarının alt satırı o item'in her kahramana etkisi. Kuşanma: yuvaya / kahramana sürükle-bırak ya da çift tıklama (seçili
 * kahramana); çıkarma: yuvayı torbaya sürükle ya da yuvaya çift tıkla; atma: sürüklerken sağ altta beliren çöp kutusu (Rare+ onaylı).
 * Telefonda Character ve Inventory ayrı tam ekran (üstte geçiş; C tuşu). Kaynaktan beslenir (sefer / endless).
 */
export function openGear(root: HTMLElement, src: GearSource, o: { hero?: string; tutorial?: boolean; onClose?: () => void } = {}): () => void {
  const overlay = el('div', 'gr-overlay el-modal'); // ortak pencere hareketi (elegant.css > .el-modal, src/ui/motion.ts)
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Gear');
  const panel = el('div', 'gr-panel gr-gear el-modal-panel');
  overlay.append(panel);
  root.append(overlay);
  uiSound('open');
  lockInput('gear');
  let heroId = o.hero ?? src.heroes()[0]?.id ?? '';
  /** Seçili torba item'i (tek kor elmas; karşılaştırma odağı). */
  let sel = '';
  /** Fareyle üstüne gelinen torba item'i (karşılaştırma odağı, seçimden önce gelir). */
  let hoverUid = '';
  /** Sürüklenen torba item'i (en öncelikli odak). */
  let dragUid = '';
  let usableOnly = false;
  let view: 'char' | 'inv' = 'inv';
  let shakeUid = '';
  let flashText = '';
  let curStats: Stats | null = null;
  let afterStats: Stats | null = null;
  let closeAsk: (() => void) | null = null;
  const heroOf = (id: string) => src.heroes().find((h) => h.id === id);
  const curHero = () => heroOf(heroId) ?? src.heroes()[0];
  const bagInst = (uid: string) => src.bag().find((i) => i.uid === uid);
  // Malzeme sesi (2026-10-13): kumaş / deri / çelik / ahşap / takı (data/audio-world.json); kaldırma kısık, kuşanma / çıkarma tam
  const itemSound = (id: string | undefined, gain = 1): void => worldSound(itemSoundKind(itemDef(id ?? '')), gain);
  const heroSlotItem = (heroId: string, slot: SlotId): string | undefined => src.heroes().find((x) => x.id === heroId)?.equipment[slot]?.id;
  const ask = (text: string, ok: string, run: () => void, danger = false): void => {
    closeAsk?.();
    closeAsk = confirmIn(overlay, text, ok, () => {
      closeAsk = null;
      run();
    }, danger);
  };

  const ix = attachItemInteractions({
    overlay,
    panel,
    trash: true,
    sourceOf: (v, t) => (v.startsWith('bag:') ? { kind: 'bag', uid: v.slice(4), itemId: t.dataset['item'] ?? '' } : v.startsWith('slot:') ? { kind: 'slot', heroId, slot: v.slice(5) as SlotId } : null),
    targetOf: (v) => (v === 'bag' ? { kind: 'bag' } : v === 'trash' ? { kind: 'trash' } : v.startsWith('slot:') ? { kind: 'slot', heroId, slot: v.slice(5) as SlotId } : v.startsWith('hero:') ? { kind: 'hero', heroId: v.slice(5) } : null),
    classOf: (id) => heroOf(id)?.class,
    tipNodes: (key) => {
      const hero = curHero();
      const i = key.indexOf(':');
      const kind = key.slice(0, i);
      const id = key.slice(i + 1);
      const inst = kind === 'bag' ? bagInst(id) : kind === 'slot' && hero ? hero.equipment[id as SlotId] : undefined;
      if (!inst) return [];
      // seçili kahramana göre: etkisiz A affix'leri soluk, tavanı dolu statlar "max" (Ömer 2026-10-13, itemcaps)
      const state = hero ? (affixContext(hero, inst, kind === 'slot' ? (id as SlotId) : undefined) ?? undefined) : undefined;
      return itemTipNodes(inst, hero?.class, kind === 'bag' ? heroTipExtra(src.heroes(), inst) : [], state);
    },
    // dokunmatik: ipucundaki eylem (tek dokunuş ipucunu açar; kuşanma / çıkarma buradan ya da sürükle-bırakla)
    tipActions: (key) => {
      const hero = curHero();
      if (!hero) return [];
      if (key.startsWith('bag:')) {
        const uid = key.slice(4);
        const d = itemDef(bagInst(uid)?.id ?? '');
        const ok = !!d && canEquip(hero.class, d);
        const acts = [{ label: ok ? `Equip · ${className(hero.class)}` : `${className(hero.class)} can't use`, disabled: !ok, run: () => tryEquip(hero.id, uid, d ? (fitsSlot(d, 'offhand') && d.slot === 'weapon' ? 'weapon' : undefined) : undefined) }];
        // Tek el hançer: ikinci ele de (ana elde tek el silah varken)
        if (ok && d && d.slot === 'weapon' && fitsSlot(d, 'offhand')) acts.push({ label: 'Off-hand', disabled: !!offhandBlocker(hero.equipment), run: () => tryEquip(hero.id, uid, 'offhand') });
        return acts;
      }
      if (key.startsWith('slot:')) {
        const slot = key.slice(5) as SlotId;
        return hero.equipment[slot] ? [{ label: 'Unequip', run: () => {
          itemSound(hero.equipment[slot]?.id);
          apply(() => src.unequip(hero.id, slot));
        } }] : [];
      }
      return [];
    },
    // Odak değişince yalnızca Character sayfası yeniden çizilir (torba DOM'u yerinde kalır: üstüne gelme bozulmaz)
    onHover: (key) => {
      const uid = key.startsWith('bag:') ? key.slice(4) : '';
      if (uid === hoverUid) return;
      hoverUid = uid;
      renderChar();
    },
    onDragStart: (s) => {
      itemSound(s.kind === 'slot' ? heroSlotItem(s.heroId, s.slot) : s.itemId, WORLD_AUDIO.itemPickupGain);
      dragUid = s.kind === 'bag' ? s.uid : '';
      if (dragUid) renderChar(); // sürüklenen item'e göre farklar ve kahraman satırları
    },
    onDrop: (s, tg, act) => {
      const hadFocus = !!dragUid;
      dragUid = '';
      if (act?.kind === 'equip') tryEquip(act.heroId, act.uid, act.slot);
      else if (act?.kind === 'unequip') {
        itemSound(heroSlotItem(act.heroId, act.slot));
        apply(() => src.unequip(act.heroId, act.slot));
      } else if (act?.kind === 'discard') tryDiscard(act.uid);
      else if (act?.kind === 'none' && act.reason === 'Cannot use' && s.kind === 'bag' && tg && (tg.kind === 'slot' || tg.kind === 'hero')) tryEquip(tg.heroId, s.uid);
      else if (hadFocus) renderChar();
    },
    stats: () => ({ stats: curStats, after: afterStats, ...(curHero() ? { classId: curHero()!.class } : {}) }),
  });

  let closing = false;
  const close = (): void => {
    if (closing) return;
    closing = true;
    closeDom(overlay, () => overlay.remove());
    document.removeEventListener('keydown', onKey, true);
    ix.destroy();
    unlockInput('gear');
    o.onClose?.();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      if (closeAsk && overlay.querySelector('.gr-confirm')) {
        closeAsk();
        closeAsk = null;
      } else if (sel) {
        sel = '';
        renderAll();
      } else close();
    } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && phoneLayout()) {
      e.stopPropagation();
      view = view === 'char' ? 'inv' : 'char';
      renderAll();
    }
  };
  document.addEventListener('keydown', onKey, true);
  // Panelin dışına (kararan zemine) dokunmak Gear'ı kapatır (Done ile aynı; src/ui/backdrop.ts)
  dismissOnBackdrop(overlay, panel, () => close());

  const apply = (fn: () => void): void => {
    try {
      fn();
    } catch (err) {
      flashText = err instanceof Error ? err.message : String(err);
      uiSound('error');
    }
    renderAll();
  };

  /** Kuşanma (sürükle-bırak / çift tıklama): silah ailesi uymuyorsa uyarı + sallanma; primary bonusu düşecekse onay ("Equip anyway"). */
  const tryEquip = (targetHero: string, uid: string, slot?: SlotId): void => {
    const h = heroOf(targetHero);
    const inst = bagInst(uid);
    const d = inst ? itemDef(inst.id) : undefined;
    if (!h || !inst || !d) return;
    heroId = targetHero;
    if (!canEquip(h.class, d)) {
      const fam = ITEMS.weaponFamilies.find((f) => f.id === d.family);
      shakeUid = uid;
      uiSound('error');
      flashText = `${className(h.class)} cannot use ${fam?.name ?? 'this weapon'}.`;
      renderAll();
      return;
    }
    // İkinci el kapalı (çift el silah) / Legendary sınırı: açık mesaj + sallanma (torba dolu ise işlem hatası mesajı)
    const plan = planEquip(h.class, h.equipment, inst, slot);
    if (isPlanError(plan)) {
      shakeUid = uid;
      uiSound('error');
      flashText = plan.error;
      renderAll();
      return;
    }
    const doEquip = (): void => {
      if (sel === uid) sel = '';
      if (hoverUid === uid) hoverUid = '';
      itemSound(inst.id);
      apply(() => src.equip(targetHero, uid, plan.slot));
    };
    const pc = primaryCheck(h, { equip: inst, slot: plan.slot });
    if (pc.lost && pc.primary) {
      const over = pc.overtakenBy.map((k) => k.toUpperCase()).join(' and ');
      ask(`${over} would exceed ${pc.primary.toUpperCase()} on the ${className(h.class)}. ${PRIMARY_BONUS_NAME[pc.primary]} will be disabled.`, 'Equip anyway', doEquip);
      return;
    }
    doEquip();
  };
  /** Atma (çöp kutusuna bırakma): Rare ve üstü onay ister (madde 280). */
  const tryDiscard = (uid: string): void => {
    const inst = bagInst(uid);
    const d = inst ? itemDef(inst.id) : undefined;
    if (!inst || !d) return;
    const run = (): void => {
      if (sel === uid) sel = '';
      hoverUid = '';
      uiSound('confirm');
      apply(() => src.discard(uid));
    };
    if (discardNeedsConfirm(inst)) ask(`Discard ${d.name}? It is gone for good.`, 'Discard', run, true);
    else run();
  };

  // --- çizim: başlık, gövde (Character | Inventory), alt satır
  const head = el('div', 'gr-head');
  const body = el('div', 'gr-body');
  const charWrap = el('div', 'gr-charwrap');
  const invWrap = el('div', 'gr-right');
  const foot = el('div', 'gr-foot');
  body.append(charWrap, invWrap);
  panel.append(head, body, foot);
  const focusInst = (): ItemInstance | null => {
    const uid = dragUid || hoverUid || sel;
    return uid ? (bagInst(uid) ?? null) : null;
  };
  const bestButtons = (short: boolean): HTMLElement[] => {
    const hero = curHero();
    const out: HTMLElement[] = [];
    if (hero)
      out.push(
        btn(`gr-btn${short ? ' sm' : ''}`, `${short ? 'Best' : 'Equip best'}: ${className(hero.class)}`, () => {
          sel = '';
          apply(() => src.equipBest([hero.id]));
        }),
      );
    const all = btn(`gr-btn${short ? ' sm' : ''}`, `${short ? 'Best' : 'Equip best'}: all`, () => {
      sel = '';
      apply(() => src.equipBest());
    });
    all.dataset['tut'] = 'best'; // mentor dersi vurgusu (data/tutorial.json > gear)
    out.push(
      all,
      btn(`gr-btn${short ? ' sm' : ''} primary`, 'Done', close),
    );
    return out;
  };
  function renderHead(): void {
    const left = el('div', 'gr-head-l');
    left.append(el('div', 'gr-title', 'Gear'));
    if (phoneLayout()) {
      // telefonda iki ayrı tam ekran: Character / Inventory (C tuşu da geçirir); alt satır yok, düğmeler başlığın sağında
      left.append(viewTabs(view, (k) => {
        view = k;
        renderAll();
      }));
      const acts = el('div', 'gr-head-acts');
      acts.append(...bestButtons(true));
      head.replaceChildren(left, acts);
      return;
    }
    const gold = el('div', 'gr-gold', `${src.gold()} gold`);
    withUiIcon(gold, 'gold');
    head.replaceChildren(left, gold);
  }
  function renderChar(): void {
    const scroll = ['.gr-heroes', '.gr-mid'].map((q) => [q, charWrap.querySelector<HTMLElement>(q)?.scrollTop ?? 0] as const);
    const r = renderCharacter({
      heroes: src.heroes(),
      heroId,
      focus: focusInst(),
      ...(o.tutorial ? { hint: 'Your escort left their gear for the new company. Drag an item from the bag onto a hero or a slot, or let Equip best choose.' } : {}),
      compact: phoneLayout(),
      onHero: (id) => {
        heroId = id;
        renderAll();
      },
      onSlotDouble: (slot) => {
        const h = curHero();
        if (!h) return;
        itemSound(h.equipment[slot]?.id);
        apply(() => src.unequip(h.id, slot));
      },
    });
    curStats = r.stats;
    afterStats = r.after;
    charWrap.replaceChildren(r.el);
    for (const [q, top] of scroll) {
      const e = charWrap.querySelector<HTMLElement>(q);
      if (e) e.scrollTop = top;
    }
    if (ix.dragging()) ix.remark();
  }
  function renderInv(): void {
    const hero = curHero();
    const bag = src.bag();
    if (sel && !bag.some((i) => i.uid === sel)) sel = '';
    const scroll = invWrap.querySelector<HTMLElement>('.gr-bag')?.scrollTop ?? 0;
    const inv = renderInventory({
      items: bag,
      size: src.bagSize,
      ...(hero ? { usableClass: hero.class } : {}),
      filter: {
        on: usableOnly,
        label: usableOnly && hero ? `Usable by ${className(hero.class)}` : 'All items',
        toggle: () => {
          usableOnly = !usableOnly;
          renderInv();
        },
      },
      selected: sel,
      shake: shakeUid,
      onTap: (uid) => {
        sel = sel === uid ? '' : uid;
        renderAll();
      },
      onDouble: (uid) => {
        const h = curHero();
        if (h) tryEquip(h.id, uid);
      },
    });
    shakeUid = '';
    if (!bag.length) inv.append(el('div', 'gr-card-empty', src.emptyText ?? 'The bag is empty.'));
    invWrap.replaceChildren(...(phoneLayout() ? [heroRail(src.heroes(), heroId, (id) => {
      heroId = id;
      renderAll();
    }), inv] : [inv]));
    const g = invWrap.querySelector<HTMLElement>('.gr-bag');
    if (g) {
      snapBagRows(g);
      g.scrollTop = scroll;
    }
  }
  function renderFoot(): void {
    const hint = el('div', `gr-foot-hint${flashText ? ' warn' : ''}`, flashText);
    flashText = '';
    foot.replaceChildren(hint, ...bestButtons(false));
  }
  let shownView = '';
  function renderAll(): void {
    ix.hideTips();
    const phone = phoneLayout();
    const vk = phone ? view : 'desk';
    if (shownView && vk !== shownView) swapIn(body);
    shownView = vk;
    panel.classList.toggle('gr-phone', phone);
    panel.classList.toggle('show-char', phone && view === 'char');
    panel.classList.toggle('show-inv', phone && view === 'inv');
    renderHead();
    renderChar();
    renderInv();
    if (phone && flashText) ix.tip.hide();
    renderFoot();
  }
  renderAll();
  return close;
}

/** Telefonda Character / Inventory geçişi (C tuşu da geçirir). */
export function viewTabs(view: 'char' | 'inv', set: (v: 'char' | 'inv') => void, labels: [string, string] = ['Character', 'Inventory']): HTMLElement {
  return tabSwitch(view, [['char', labels[0]], ['inv', labels[1]]], set);
}

/**
 * ORTAK iki (ya da daha çok) yönlü görünüm anahtarı (Ömer 2026-10-11): [ Wares | Character (C) ], telefonda [ Character | Inventory ].
 * Etkin sekme altın yazı + ince altın alt çizgi + tek kor elması; tüm oyunda sekme geçişleri aynı görünür (gear.css .gr-tabs).
 */
export function tabSwitch<K extends string>(cur: K, items: Array<[K, string]>, set: (k: K) => void): HTMLElement {
  const tabs = el('div', 'gr-tabs');
  tabs.setAttribute('role', 'tablist');
  for (const [k, label] of items) {
    const b = btn(`gr-tab${cur === k ? ' on' : ''}`, label, () => {
      if (k !== cur) set(k);
    });
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(cur === k));
    tabs.append(b);
  }
  return tabs;
}

/** Görünüm değişince değişen içeriğe ortak panel geçişi (kısa kayma + belirme; azaltılmış harekette yok). */
export function swapIn(node: HTMLElement | null | undefined): void {
  if (!node) return;
  node.classList.remove('gr-swap-in');
  void node.offsetWidth;
  node.classList.add('gr-swap-in');
}

/** Telefonda Inventory ekranının solunda dar kahraman şeridi (bırakma hedefi + seçili kahraman; ayrıntı ipucunda). */
export function heroRail(heroes: GearHero[], heroId: string, pick: (id: string) => void): HTMLElement {
  const rail = el('div', 'gr-rail');
  for (const h of heroes) {
    const b = btn(`gr-hero${h.id === heroId ? ' on' : ''}`, '', () => pick(h.id));
    b.dataset['drop'] = `hero:${h.id}`;
    b.setAttribute('aria-label', className(h.class));
    const face = el('div', 'gr-face');
    const url = avatarUrl(h.class);
    if (url) face.style.backgroundImage = `url("${url}")`;
    b.append(face);
    rail.append(b);
  }
  return rail;
}

/** Ortak küçük kart (Spoils / teslim). */
function smallCard(root: HTMLElement, title: string, subtitle: string, items: string[], extra: string[], buttons: Array<{ label: string; primary?: boolean; run: () => void }>): () => void {
  const overlay = el('div', 'gr-overlay gr-small el-modal');
  const panel = el('div', 'gr-panel gr-mini el-modal-panel');
  overlay.append(panel);
  root.append(overlay);
  lockInput('gear-card');
  const close = (): void => {
    closeDom(overlay, () => overlay.remove());
    unlockInput('gear-card');
  };
  panel.append(el('div', 'gr-title', title));
  if (subtitle) panel.append(el('div', 'gr-mini-sub', subtitle));
  const list = el('div', 'gr-mini-list');
  for (const id of items) if (itemDef(id)) list.append(itemRow({ id }));
  if (items.length) panel.append(list);
  for (const x of extra) panel.append(el('div', 'gr-mini-extra', x));
  const foot = el('div', 'gr-foot');
  for (const b of buttons)
    foot.append(
      btn(`gr-btn${b.primary ? ' primary' : ''}`, b.label, () => {
        close();
        b.run();
      }),
    );
  panel.append(foot);
  return close;
}

/**
 * Item stat satırı: stat ikonu + "+2 Magic Armor" (Gear kartı, Spoils / teslim kartları; ikon kaynağı savaş HUD'ıyla aynı:
 * src/ui/stat-tips.ts > statIconUrl). Phaser ekranları (Endless ödül / tüccar) `statIcon(id)` ile aynı ikonu çizer.
 */
export function affixLineEl(l: AffixLine, cls = 'gr-line', withRange = true): HTMLDivElement {
  const row = el('div', cls);
  const tag = el('span', 'gr-tier', l.tier);
  tag.style.color = TIER_COLOR[l.tier];
  row.append(tag);
  const url = l.stat ? statIconUrl(l.stat) : '';
  if (url) {
    const i = el('img', 'gr-sico');
    i.src = url;
    i.alt = '';
    i.draggable = false;
    row.append(i);
  }
  row.append(el('span', '', `${l.text}${withRange && l.range ? ` (${l.range})` : ''}`));
  // İpucu: stat kimliği olan affix stat açıklamasını, diğerleri affix açıklamasını gösterir
  if (l.stat) row.dataset['stat'] = l.stat;
  else {
    row.dataset['affix'] = l.name;
    row.dataset['desc'] = l.desc ?? '';
    row.dataset['tier'] = l.tier;
    row.dataset['text'] = l.text;
    row.dataset['range'] = l.range;
  }
  return row;
}

/** Tek item satırı (Spoils / teslim kartları). `gone`: geride kalan (soluk). */
function itemRow(src: Pick<ItemInstance, 'id' | 'rolls'> & { uid?: string }, gone = false): HTMLDivElement {
  const d = itemDef(src.id)!;
  const color = instanceColor(src);
  const row = el('div', `gr-mini-row${gone ? ' gone' : ''}`);
  row.append(slotIcon(d, d.slot, color, 0.9, gone));
  const t = el('div', 'gr-mini-text');
  const n = el('div', 'gr-mini-name', d.name);
  if (!gone) n.style.color = color;
  const lines = el('div', 'gr-mini-lines');
  lines.append(el('span', 'gr-mini-subt', instanceSubtitle(src)));
  for (const l of affixLines(src)) lines.append(affixLineEl(l, 'gr-line inline', false));
  const fx = effectLine(d);
  if (fx) lines.append(el('div', 'gr-line inline gr-effect', fx));
  t.append(n, lines);
  row.append(t);
  return row;
}

export interface SpoilsHooks {
  get: () => CampaignState;
  set: (s: CampaignState) => void;
  /** Gear ekranını aç (kart kapanır; çağıran kart dönüşünü yönetir). */
  gear: () => void;
  /** Kart kapandı (geride kalanlar kaybolur; çağıran acknowledgeLoot yapar). */
  done: () => void;
}

/**
 * Zafer / sandık sonrası "Spoils" kartı (pendingLoot). Torba doluysa sığmayan item'ler soluk listelenir ("Bag full: N items left behind");
 * kart açıkken oyuncu torbadan item atıp (Rare+ onaylı) yer açabilir ve "Take" ile alabilir. Kart kapanınca geride kalanlar kaybolur (madde 280).
 */
export function showSpoils(root: HTMLElement, on: SpoilsHooks): () => void {
  const overlay = el('div', 'gr-overlay gr-small el-modal');
  const panel = el('div', 'gr-panel gr-mini el-modal-panel');
  overlay.append(panel);
  root.append(overlay);
  worldSound('loot_reveal'); // ganimet / hazine: sandık kapağı gıcırdar, içinde sikkeler kayar
  lockInput('gear-card');
  let pick = '';
  let confirm = '';
  const close = (): void => {
    closeDom(overlay, () => overlay.remove());
    unlockInput('gear-card');
  };
  const render = (): void => {
    const s = on.get();
    const drop = s.pendingLoot;
    panel.replaceChildren();
    if (!drop) return;
    const insts = drop.items.map((u) => s.inventory.find((i) => i.uid === u)).filter((x): x is ItemInstance => !!x);
    const ids = insts.map((i) => i.id);
    const left = (drop.left ?? []).filter((id) => itemDef(id));
    panel.append(el('div', 'gr-title', drop.gift ? 'Gift' : drop.kind === 'treasure' ? 'Treasure' : 'Spoils'));
    if (ids.length) panel.append(el('div', 'gr-mini-sub', `${ids.length} new item${ids.length > 1 ? 's' : ''} in the bag`));
    const list = el('div', 'gr-mini-list');
    // Nadir düşüş (madde 297): altın-turuncu parıltılı satır + "Rare drop" etiketi
    const rareLeft = [...(drop.rare ?? [])];
    for (const inst of insts) {
      const id = inst.id;
      const row = itemRow(inst);
      const ri = rareLeft.indexOf(id);
      if (ri >= 0) {
        rareLeft.splice(ri, 1);
        row.classList.add('gr-rare-drop');
        row.append(el('span', 'gr-rare-tag', 'Rare drop'));
      }
      list.append(row);
    }
    if (ids.length) panel.append(list);
    // Altın 0 ise (ör. hediye) altın satırı yok
    const goldTxt = drop.gold ? `+${drop.gold} gold` : '';
    if (ids.length || left.length) {
      if (goldTxt) panel.append(el('div', 'gr-mini-extra', goldTxt));
    } else panel.append(el('div', 'gr-mini-extra', `No gear this time.${goldTxt ? ` ${goldTxt}` : ''}`));
    if (left.length) {
      const room = s.inventory.length < BAG_SIZE;
      panel.append(el('div', 'gr-card-warn', `Bag full: ${left.length} item${left.length > 1 ? 's' : ''} left behind. Make room to take ${left.length > 1 ? 'them' : 'it'}, or ${left.length > 1 ? 'they are' : 'it is'} lost when you continue.`));
      const lost = el('div', 'gr-mini-list');
      left.forEach((id, i) => {
        const rolls = drop.leftRolls?.[i];
        const row = itemRow({ id, ...(rolls ? { rolls } : {}) }, true);
        const take = btn('gr-btn', 'Take', () => {
          on.set(takeLeftover(on.get(), i));
          render();
        });
        take.disabled = !room;
        row.append(take);
        lost.append(row);
      });
      panel.append(lost);
      // Yer aç: ortak Inventory bileşeni (Gear / tüccar / ödül torbasıyla aynı ızgara ve hücre); seç + at (Rare ve üstü onaylı)
      const inv = renderInventory({
        items: s.inventory,
        size: BAG_SIZE,
        title: 'Make room · Bag',
        selected: pick,
        onTap: (uid) => {
          pick = pick === uid ? '' : uid;
          confirm = '';
          render();
        },
      });
      inv.classList.add('gr-inv-mini');
      panel.append(inv);
      const picked = s.inventory.find((i) => i.uid === pick);
      if (picked) {
        const row = itemRow(picked);
        row.append(discardButton(picked, confirm === picked.uid, () => {
          confirm = picked.uid;
          render();
        }, () => {
          on.set(discardItem(on.get(), picked.uid));
          pick = '';
          confirm = '';
          render();
        }));
        panel.append(row);
      }
    }
    const foot = el('div', 'gr-foot');
    foot.append(
      btn('gr-btn', 'Gear', () => {
        close();
        on.gear();
      }),
      btn('gr-btn primary', left.length ? `Continue (leave ${left.length})` : 'Continue', () => {
        close();
        on.done();
      }),
    );
    panel.append(foot);
  };
  render();
  return close;
}

/** "Discard" düğmesi: Rare ve üstü önce "Confirm discard" ister (madde 280). */
function discardButton(inst: ItemInstance, confirming: boolean, ask: () => void, run: () => void): HTMLButtonElement {
  if (!discardNeedsConfirm(inst)) return btn('gr-btn', 'Discard', run);
  return confirming ? btn('gr-btn danger', 'Confirm discard', run) : btn('gr-btn', 'Discard', ask);
}

/** Ashford teslim kartı (pendingHandover): eski takım item'lerini yeni bölüğe bırakır. */
export function showHandover(root: HTMLElement, s: CampaignState, on: { equip: () => void; later: () => void }): () => void {
  const ho = s.pendingHandover;
  const ids = (ho?.items ?? []).map((u) => s.inventory.find((i) => i.uid === u)?.id ?? findEquipped(s, u)).filter((x): x is string => !!x);
  const from = (ho?.from ?? []).map((f) => className(f.class)).join(', ');
  return smallCard(root, 'Left for the Company', from ? `${from} leave${ho!.from.length > 1 ? '' : 's'} their gear for you` : '', ids, ['Equip it on your new heroes before the road north.'], [
    { label: 'Later', run: on.later },
    { label: 'Equip now', primary: true, run: on.equip },
  ]);
}

function findEquipped(s: CampaignState, uid: string): string | undefined {
  for (const h of s.roster as Hero[]) for (const k of SLOT_IDS) if (h.equipment[k]?.uid === uid) return h.equipment[k]!.id;
  return undefined;
}
