/**
 * Sefer kuşanma ekranı (Gear) + Ashford teslim kartı (madde 280; items.md 5.4). DOM katmanı, ana menünün zarif stili
 * (Cinzel başlık, EB Garamond metin, kor/altın renkler; src/ui/gear.css). Açıkken Phaser girişi kilitli (input-lock).
 * Kurallar saf modüllerde: kuşanma `src/campaign/gear.ts`, karşılaştırma/metin `src/progression/item-text.ts`, primary uyarısı `primaryCheck`.
 * Ekran bir KAYNAK (GearSource) ile çalışır: sefer (`openGearScreen`, CampaignState) ve endless (`openGear` + src/game/endless-gear.ts) aynı ekranı besler.
 * Oyun içi metinler İngilizce.
 */
import { closeDom } from './motion';
import { itemSoundKind, uiSound, WORLD_AUDIO, worldSound } from './ui-sound';
import './gear.css';
import './gear-plates.css';
import { allocateStats, activeHeroes, heroWoundsLine, discardItem, discardNeedsConfirm, equipBest, equipItem, unequipItem, type CampaignState, type Hero } from '../campaign';
import { woundCount } from '../progression/wounds';
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
  canEquip,
  itemDef,
  ITEMS,
  primaryCheck,
  type AffixLine,
  type Equipment,
  type ItemInstance,
  type SlotId,
  meetsLevel,
  levelReqMsg,
  instanceLevelReq,
  type StatAlloc,
} from '../progression';
import type { Attribute } from '../engine';
import { lockInput, unlockInput } from './input-lock';
import { statIconUrl } from './stat-tips';
import { dismissOnBackdrop } from './backdrop';
import { iconUrl } from './dom-icons';
import { hasUiImage, uiIconName, type UiIconKind } from './ui-icons';
import type { Stats } from '../engine';
import { avatarUrl, className, heroMarks, renderLedgerPage } from './character-panel';
import { mountCloseButton } from './nav-close';
import { showHandoverToast } from './handover-toast';
import { renderInventory, snapBagRows } from './inventory';
import { itemTipNodes, type ItemTipAction, type ItemTipHero } from './item-tip';
import type { DragSource, DropAction, DropTarget } from './gear-drop';
import { attachItemInteractions } from './item-drag';
import { FALLEN_GEAR_SHORT_TEXT, FALLEN_GEAR_TEXT, heroFallen, heroItemLine } from './gear-hover';

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

export interface GearOptions {
  get: () => CampaignState;
  set: (s: CampaignState) => void;
  /** Açılınca seçili kahraman (yoksa aktif takımın ilki). */
  hero?: string;
  /** Item takma tutorial'ı (Ashford teslimi): üstte yönlendirme satırı. */
  tutorial?: boolean;
  onClose?: () => void;
  /** Telefonda açılış görünümü ('char' = Character; stat puanı dağıtımı / Level Up kartı). */
  view?: 'char' | 'inv';
}

/** Gear ekranının gördüğü kahraman (sefer Hero'su ve endless kahramanı bu şekle uyar; ekipman 6 yuvalı, boş = null). */
export interface GearHero {
  id: string;
  class: string;
  level: number;
  equipment: Equipment;
  /** Level sistemi (levels.md): XP, dağıtılmamış stat / skill puanları, dağıtılmış puanlar. */
  xp?: number;
  statPoints?: number;
  skillPoints?: number;
  alloc?: StatAlloc;
  /** Şu anki can oranı (Sheet'te "93 / 150" + çubuk; yoksa dolu). */
  hpRatio?: number;
  /** Yara satırı (hero ipucunda; Ömer 2026-10-19): "Wounds: 2 (-40% max HP)". */
  woundsNote?: string;
  /** Düşmüş kahraman (can 0 gösterilir). */
  alive?: boolean;
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
  /** Stat puanı dağıt (levels.md; Character sayfasındaki Confirm). Yoksa puan dağıtımı gösterilmez. */
  allocate?(heroId: string, add: StatAlloc): void;
}

/** Seferin kaynağı: CampaignState üzerinden (davranış eskisiyle birebir). */
export function campaignGearSource(get: () => CampaignState, set: (s: CampaignState) => void): GearSource {
  const apply = (fn: (s: CampaignState) => CampaignState): void => set(fn(get()));
  return {
    heroes: () => {
      const s = get();
      // Yara satırı (Ömer 2026-10-19): kahraman yer iminin ipucunda (en küçük gösterim; arayüzü mockup'tan seçilecek)
      return [...activeHeroes(s), ...s.roster.filter((h) => !s.active.includes(h.id))].map((h) => (woundCount(h) > 0 ? { ...h, woundsNote: heroWoundsLine(h) } : h));
    },
    bag: () => get().inventory,
    bagSize: BAG_SIZE,
    gold: () => get().gold,
    equip: (heroId, uid, slot) => apply((x) => equipItem(x, heroId, uid, slot)),
    unequip: (heroId, slot) => apply((x) => unequipItem(x, heroId, slot)),
    discard: (uid) => apply((x) => discardItem(x, uid)),
    equipBest: (ids) => apply((x) => equipBest(x, ids)),
    emptyText: 'The bag is empty. Victories and chests bring new gear.',
    allocate: (heroId, add) => apply((x) => allocateStats(x, heroId, add)),
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
  return openGear(root, campaignGearSource(o.get, o.set), { hero: o.hero ?? activeHeroes(s0)[0]?.id ?? s0.roster[0]?.id ?? '', tutorial: o.tutorial, onClose: o.onClose, ...(o.view ? { view: o.view } : {}) });
}

/** Gear'ın dışarıya açtığı işlevler (tüccar / ganimet eki bunlarla Gear'ı sürer). */
export interface GearApi {
  rerender(): void;
  /** Üstte kısa yazı (ok = bilgi, değilse hata sesi + kırmızı). */
  flash(text: string, ok?: boolean): void;
  hero(): GearHero | undefined;
  /** Kuşanma (kurallar ve onaylar Gear'ın kendisi: aile / yuva / primary uyarısı). */
  equip(heroId: string, uid: string, slot?: SlotId): void;
  /** Seçili torba item'i (yoksa ''). */
  selected(): string;
  clearSel(): void;
  close(): void;
}

/**
 * Gear'ın yanına açılan sol panel (Ömer 2026-10-18, taslak enc=merchant / reward): tüccar tezgâhı ve ganimet alanı. Gear ekranı aynı kalır; ek
 * yalnızca kendi sürükleme kaynaklarını / hedeflerini, ipucunu ve torba fiyatını ekler. İki panel tek çift kapta (.gr-pair) yan yana durur.
 */
export interface GearExt {
  side: HTMLElement;
  attach(overlay: HTMLElement, api: GearApi): void;
  /** Gear her çizildiğinde (yan panel yenilenir). */
  render(): void;
  sourceOf?(value: string, el: HTMLElement): DragSource | null;
  targetOf?(value: string): DropTarget | null;
  /** true = bırakma ek tarafından işlendi. */
  onDrop?(src: DragSource, target: DropTarget | null, action: DropAction | null): boolean;
  tipNodes?(key: string): HTMLElement[] | null;
  tipActions?(key: string): ItemTipAction[] | null;
  /** Torba item'inin ipucu eylemlerine eklenenler (ör. Sell). */
  bagActions?(uid: string): ItemTipAction[];
  onDoubleTap?(key: string): boolean | undefined;
  onHover?(key: string): void;
  /** Torba hücresinin altında fiyat (tüccar satış fiyatı). */
  price?(inst: ItemInstance): number;
  hideGold?: boolean;
  noTrash?: boolean;
  /**
   * Yalnızca TORBA görünümü (Ömer 2026-10-18: ganimet ve ödül "View bag" ekranları): kahraman sayfası, yuvalar, skill'ler, Hero / Sheet
   * sekmeleri YOK; yan panelin yanında yalnızca ortak torba (aynı hücre, filtre, çöp, ipucu, sürükle-bırak). Kuşanma sonra Gear'da yapılır.
   */
  bagOnly?: boolean;
  /** Kapanmadan önce onay gerekiyorsa onayı açar ve true döner (onaylanınca `proceed` çağrılır). */
  beforeClose?(proceed: () => void): boolean;
  /** Klavye (Gear'dan önce; true = işlendi). */
  onKey?(e: KeyboardEvent): boolean;
  destroy?(): void;
}

/** Telefon mu (kısa sahne; src/ui/viewport.ts html.short): Character ve Inventory ayrı tam ekran + geçiş düğmesi. */
export const phoneLayout = (): boolean => document.documentElement.classList.contains('short');

/** Item ipucunun telefondaki ek satırları: her kahramana etkisi (masaüstünde kahraman kartlarında görünür). */
export function heroTipExtra(heroes: GearHero[], inst: ItemInstance, always = false): ItemTipHero[] {
  if (!always && !phoneLayout()) return [];
  return heroes.map((h) => {
    const l = heroItemLine(h, inst);
    const face = avatarUrl(h.class);
    return { label: className(h.class), ...(face ? { face } : {}), level: h.level, parts: l.parts.map((p) => ({ text: p.text, ...(p.dir ? { dir: p.dir } : l.tone === 'no' ? { dir: 'no' as const } : {}) })) };
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

/** Açık Gear / Demirci / Tüccar / Loot ekranını yeniden çizdiren belge olayı (debug araçları gönderir). */
export const GEAR_REFRESH_EVENT = 'gear:refresh';

/**
 * Gear ekranı = ORTAK ENVANTER (Ömer 2026-10-18, taslak v3 "Ledger"; public/mockups/unified-inventory.html#v3). Yalnızca karakterle ilgilidir:
 * iki sayfalık defter, sol kenarda kahraman yer imleri (portre, stat puanı rozeti, bırakma hedefi), iki sekme:
 *  - Hero: sol sayfa sınıf başlığı + 7 yuva + skill satırı (pasif önce), sağ sayfa torba;
 *  - Sheet: sol sayfa level + statlar (HP / MP çubuklu, "36 +1 [+] [−]"), sağ sayfa skill ağacı kabı ("Coming soon").
 * Başlık satırı (Gear, sekmeler, altın) ekranın üst şeridinde, sağ üst Menu / tam ekranla aynı hizada; kapatma sağ üstte X (Esc, zemine dokunma).
 * Kuşanma: yuvaya / yer imine sürükle-bırak ya da çift tıklama (seçili kahramana); çıkarma: yuvayı torbaya sürükle ya da yuvaya çift tıkla;
 * atma: sürüklerken beliren çöp kutusu (Rare+ onaylı). İpucu: item'in özellikleri + her kahramana etkisi. Kaynaktan beslenir (sefer / endless).
 * Sayfa kapları kalıcıdır: odak (üstüne gelinen item) değişince yalnızca içerik yenilenir, kaydırma kabı yerinde kalır (dokunmatikte kaydırma takılmaz).
 */
export function openGear(root: HTMLElement, src: GearSource, o: { hero?: string; tutorial?: boolean; onClose?: () => void; view?: 'char' | 'inv'; ext?: GearExt } = {}): () => void {
  const ext = o.ext;
  const overlay = el('div', 'gr-overlay el-modal gr-ledger-ov'); // ortak pencere hareketi (elegant.css > .el-modal, src/ui/motion.ts)
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', ext?.bagOnly ? 'Bag' : 'Gear');
  const panel = el('div', `gr-panel gr-gear gr-ledger el-modal-panel${ext?.bagOnly ? ' gr-bagonly' : ''}`);
  const bagOnly = !!ext?.bagOnly;
  const pair = ext ? el('div', 'gr-pair') : null;
  if (pair && ext) {
    pair.append(ext.side, panel);
    overlay.append(pair);
    overlay.classList.add('gr-pair-ov');
  } else {
    panel.classList.add('gr-solo');
    overlay.append(panel);
  }
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
  /** Sekme: Hero (yuvalar + torba) / Sheet (statlar + skill ağacı). Level Up "Spend points" Sheet ile açar. */
  let tab: 'hero' | 'sheet' = o.view === 'char' ? 'sheet' : 'hero';
  /** Bekleyen stat puanları (Sheet; Confirm kaynağa yazar, kahraman değişince silinir). */
  let pending: StatAlloc = {};
  let shakeUid = '';
  let flashText = '';
  let curStats: Stats | null = null;
  let afterStats: Stats | null = null;
  let closeAsk: (() => void) | null = null;
  const heroOf = (id: string) => src.heroes().find((h) => h.id === id);
  /** Düşmüş kahramanın ekipmanı değişmez (Ömer 2026-10-18); metin sefer ve Endless'te aynı (FALLEN_GEAR_TEXT). Stat puanı harcanabilir. */
  const fallenId = (id: string): boolean => heroFallen(heroOf(id));
  const fallenMsg = (): string => FALLEN_GEAR_TEXT;
  const fallenWarn = (): void => {
    uiSound('error');
    showToast(fallenMsg());
  };
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

  // Dokunmatikte parmak ekrandayken odak değişirse (sabit ipucu kapanınca) sayfa içeriği parmak kalkınca yenilenir: kaydırma yarıda kesilmez
  let touching = 0;
  let focusDirty = false;
  const onTouchStart = (e: TouchEvent): void => {
    touching = e.touches.length;
  };
  const onTouchEnd = (e: TouchEvent): void => {
    touching = e.touches.length;
    if (!touching && focusDirty) {
      focusDirty = false;
      renderFocus();
    }
  };
  overlay.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', onTouchEnd, { passive: true });
  const focusChanged = (): void => {
    if (touching && !ix.dragging()) focusDirty = true;
    else renderFocus();
  };

  const ix = attachItemInteractions({
    overlay,
    panel: pair ?? panel,
    trash: !ext?.noTrash,
    sourceOf: (v, t) => ext?.sourceOf?.(v, t) ?? (v.startsWith('bag:') ? { kind: 'bag', uid: v.slice(4), itemId: t.dataset['item'] ?? '' } : v.startsWith('slot:') ? { kind: 'slot', heroId, slot: v.slice(5) as SlotId } : null),
    targetOf: (v) => ext?.targetOf?.(v) ?? (v === 'bag' ? { kind: 'bag' } : v === 'trash' ? { kind: 'trash' } : v.startsWith('slot:') ? { kind: 'slot', heroId, slot: v.slice(5) as SlotId } : v.startsWith('hero:') ? { kind: 'hero', heroId: v.slice(5) } : null),
    // düşmüş kahraman: hedef olarak "kullanamaz" (yuva / yer imi sönük kalır); bırakınca onDrop açıklama toast'ı verir
    classOf: (id) => (fallenId(id) ? undefined : heroOf(id)?.class),
    tipNodes: (key) => {
      const hero = curHero();
      const extra = ext?.tipNodes?.(key);
      if (extra) return extra;
      const i = key.indexOf(':');
      const kind = key.slice(0, i);
      const id = key.slice(i + 1);
      const inst = kind === 'bag' ? bagInst(id) : kind === 'slot' && hero ? hero.equipment[id as SlotId] : undefined;
      if (!inst) return [];
      // seçili kahramana göre: etkisiz A affix'leri soluk, tavanı dolu statlar "max" (Ömer 2026-10-13, itemcaps)
      const base = hero ? { ...(affixContext(hero, inst, kind === 'slot' ? (id as SlotId) : undefined) ?? {}), level: hero.level } : undefined;
      // tüccar torbasında satış fiyatı ("sells for")
      const state = kind === 'bag' && ext?.price ? { ...(base ?? {}), sellFor: ext.price(inst) } : base;
      // yer imleri yalnızca portre: her kahramana etkisi ipucunda (karşılaştırma)
      return itemTipNodes(inst, hero?.class, kind === 'bag' ? heroTipExtra(src.heroes(), inst, true) : [], state);
    },
    // dokunmatik: ipucundaki eylem (tek dokunuş ipucunu açar; kuşanma / çıkarma buradan ya da sürükle-bırakla)
    tipActions: (key) => {
      const hero = curHero();
      const extra = ext?.tipActions?.(key);
      if (extra) return extra;
      if (bagOnly) return key.startsWith('bag:') ? (ext?.bagActions?.(key.slice(4)) ?? []) : [];
      if (!hero) return [];
      if (heroFallen(hero)) return key.startsWith('bag:') ? [{ label: FALLEN_GEAR_SHORT_TEXT, disabled: true, run: () => fallenWarn() }, ...(ext?.bagActions?.(key.slice(4)) ?? [])] : [];
      if (key.startsWith('bag:')) {
        const uid = key.slice(4);
        const d = itemDef(bagInst(uid)?.id ?? '');
        const inst = bagInst(uid);
        const fam = !!d && canEquip(hero.class, d);
        const lvl = !!inst && meetsLevel(hero.level, inst);
        const ok = fam && lvl;
        const acts: ItemTipAction[] = [{ label: ok ? `Equip · ${className(hero.class)}` : fam && inst ? levelReqMsg(instanceLevelReq(inst)) : `${className(hero.class)} can't use`, disabled: !ok, run: () => tryEquip(hero.id, uid, d ? (fitsSlot(d, 'offhand') && d.slot === 'weapon' ? 'weapon' : undefined) : undefined) }];
        // Tek el hançer: ikinci ele de (ana elde tek el silah varken)
        // ana el boşken "Off-hand" yok (hançer zaten ana ele gider, Ömer 2026-10-14)
        if (ok && d && d.slot === 'weapon' && fitsSlot(d, 'offhand') && hero.equipment.weapon) acts.push({ label: 'Off-hand', disabled: !!offhandBlocker(hero.equipment), run: () => tryEquip(hero.id, uid, 'offhand') });
        acts.push(...(ext?.bagActions?.(uid) ?? []));
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
    // Odak değişince yalnızca yer imleri + sol sayfa yenilenir (torba DOM'u yerinde kalır: üstüne gelme bozulmaz)
    onHover: (key) => {
      ext?.onHover?.(key);
      const uid = key.startsWith('bag:') ? key.slice(4) : '';
      if (uid === hoverUid) return;
      hoverUid = uid;
      focusChanged();
    },
    onDragStart: (s) => {
      itemSound(s.kind === 'slot' ? heroSlotItem(s.heroId, s.slot) : s.itemId, WORLD_AUDIO.itemPickupGain);
      dragUid = s.kind === 'bag' ? s.uid : '';
      if (dragUid) renderFocus(); // sürüklenen item'e göre farklar ve yer imi ipuçları
    },
    onDrop: (s, tg, act) => {
      const hadFocus = !!dragUid;
      dragUid = '';
      if ((tg && (tg.kind === 'slot' || tg.kind === 'hero') && fallenId(tg.heroId) && s.kind !== 'slot') || (s.kind === 'slot' && fallenId(s.heroId))) {
        fallenWarn();
        renderAll();
        return;
      }
      if (ext?.onDrop?.(s, tg, act)) return;
      if (act?.kind === 'equip') tryEquip(act.heroId, act.uid, act.slot);
      else if (act?.kind === 'unequip') {
        itemSound(heroSlotItem(act.heroId, act.slot));
        apply(() => src.unequip(act.heroId, act.slot));
      } else if (act?.kind === 'discard') tryDiscard(act.uid);
      else if (act?.kind === 'none' && act.reason === 'Cannot use' && s.kind === 'bag' && tg && (tg.kind === 'slot' || tg.kind === 'hero')) tryEquip(tg.heroId, s.uid);
      else if (hadFocus) renderFocus();
    },
    stats: () => ({ stats: curStats, after: afterStats, ...(curHero() ? { classId: curHero()!.class } : {}) }),
    // dokunmatik çift dokunuş (masaüstü çift tıkla aynı): torba item'i kuşanır, kuşanılmış item çıkar; kısa 'snap' sesi
    onDoubleTap: (key) => {
      const hero = curHero();
      const extra = ext?.onDoubleTap?.(key);
      if (extra !== undefined) return extra;
      if (bagOnly) return key.startsWith('bag:'); // yalnızca torba: çift dokunuş kuşandırmaz
      if (!hero) return false;
      if (heroFallen(hero) && (key.startsWith('bag:') || key.startsWith('slot:'))) {
        fallenWarn();
        return true;
      }
      if (key.startsWith('bag:')) {
        tryEquip(hero.id, key.slice(4), undefined, true);
        return true;
      }
      if (key.startsWith('slot:') && hero.equipment[key.slice(5) as SlotId]) {
        quickUnequip(hero.id, key.slice(5) as SlotId);
        return true;
      }
      return false;
    },
  });

  let closing = false;
  /** Kapatma isteği: ek (ganimet) onay isteyebilir; onaylanınca `finalClose`. */
  const close = (): void => {
    if (closing) return;
    if (ext?.beforeClose?.(finalClose)) return;
    finalClose();
  };
  const finalClose = (): void => {
    if (closing) return;
    closing = true;
    window.clearTimeout(toastTimer);
    unmountX();
    ext?.destroy?.();
    closeDom(overlay, () => overlay.remove());
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener(GEAR_REFRESH_EVENT, onRefresh);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('touchcancel', onTouchEnd);
    ix.destroy();
    unlockInput('gear');
    o.onClose?.();
  };
  const setTab = (k: 'hero' | 'sheet'): void => {
    if (k === tab) return;
    tab = k;
    renderAll();
    swapIn(pageL);
    swapIn(pageR);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (ext?.onKey?.(e)) return;
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
    } else if (!bagOnly && e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Tab: Hero / Sheet sekmeleri arasında geçer (Ömer 2026-10-19; Shift+Tab de aynı, iki sekme var). Odak halkası pencerenin dışına kaçmaz.
      e.stopPropagation();
      e.preventDefault();
      if (closeAsk && overlay.querySelector('.gr-confirm')) return;
      setTab(tab === 'hero' ? 'sheet' : 'hero');
    } else if (!bagOnly && (e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat) {
      // C: Gear'ı kapatır (Ömer 2026-10-18: oyun geneli C = aç / kapat; Hero / Sheet geçişi yalnızca tıklamayla)
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.stopPropagation();
      e.preventDefault();
      if (closeAsk && overlay.querySelector('.gr-confirm')) return; // onay açıkken çalışmaz
      close();
    }
  };
  document.addEventListener('keydown', onKey, true);
  // Panelin dışına (kararan zemine) dokunmak Gear'ı kapatır (X ile aynı; src/ui/backdrop.ts)
  // İÇERİ sayılanlar: tüm çift pencere (ganimet / tüccar paneli dahil) ve pencere içi onay kutusu (Ömer 2026-10-18: ganimetteki her tık "Leave?" açıyordu)
  const inPair = pair ?? panel;
  dismissOnBackdrop(overlay, (t) => inPair.contains(t) || !!(t instanceof Element && t.closest('.gr-confirm, .mw-welcome')), () => close());

  /** İşlem + yeniden çizim; `okSound` yalnızca işlem başarılıysa çalar (hata: uyarı + hata sesi, ikisi birden değil). */
  const apply = (fn: () => void, okSound?: () => void): void => {
    try {
      fn();
      okSound?.();
    } catch (err) {
      flashText = err instanceof Error ? err.message : String(err);
      uiSound('error');
    }
    renderAll();
  };
  /** Çift tık / çift dokunuşla çıkarma: kısa toka şakırtısı ('snap'), malzeme sesi yerine (Ömer 2026-10-16). */
  const quickUnequip = (hid: string, slot: SlotId): void => {
    if (fallenId(hid)) return fallenWarn();
    if (!heroSlotItem(hid, slot)) return;
    apply(() => src.unequip(hid, slot), () => uiSound('snap'));
  };

  /**
   * Kuşanma (sürükle-bırak / çift tıklama): silah ailesi uymuyorsa uyarı + sallanma; primary bonusu düşecekse onay ("Equip anyway").
   * `quick` = çift tık / çift dokunuş: malzeme sesi yerine TEK kısa toka şakırtısı ('snap', ~70 ms; Ömer 2026-10-16).
   */
  const tryEquip = (targetHero: string, uid: string, slot?: SlotId, quick = false): void => {
    const h = heroOf(targetHero);
    const inst = bagInst(uid);
    const d = inst ? itemDef(inst.id) : undefined;
    if (!h || !inst || !d) return;
    if (heroFallen(h)) return fallenWarn();
    if (targetHero !== heroId) pending = {};
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
    const plan = planEquip(h.class, h.equipment, inst, slot, { level: h.level });
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
      if (quick) apply(() => src.equip(targetHero, uid, plan.slot), () => uiSound('snap'));
      else {
        itemSound(inst.id);
        apply(() => src.equip(targetHero, uid, plan.slot));
      }
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

  // --- yerleşim: üst şerit (Gear, Hero / Sheet, altın) | gövde: yer imleri · sol sayfa · sırt · sağ sayfa. Kaplar kalıcıdır (yalnızca içerik yenilenir).
  const head = el('div', 'gr-head gr-lhead');
  const title = el('div', 'gr-title', bagOnly ? 'Bag' : 'Gear');
  const tabsBox = el('div', 'gr-tabs gr-headtabs');
  tabsBox.setAttribute('role', 'tablist');
  const tabBtns = (['hero', 'sheet'] as const).map((k) => {
    const b = btn('gr-tab', k === 'hero' ? 'Hero' : 'Sheet', () => setTab(k));
    b.setAttribute('role', 'tab');
    // sekme ikonu (mevcut set): Hero = Gear ikonu, Sheet = Strength (nitelik) statı ikonu; sekme olduğu anlaşılsın
    const ico = document.createElement('img');
    ico.className = 'gr-tab-ico';
    ico.alt = '';
    ico.draggable = false;
    ico.src = k === 'hero' ? iconUrl(uiIconName('gear')) : statIconUrl('str');
    if (ico.src) b.prepend(ico);
    b.title = k === 'hero' ? 'Hero (Tab)' : 'Sheet (Tab)';
    tabsBox.append(b);
    return b;
  });
  const gold = el('div', 'gr-gold');
  if (bagOnly) tabsBox.hidden = true;
  head.append(title, tabsBox, el('span', 'gr-grow'), gold);
  const body = el('div', 'gr-body gr-lbody');
  const marksBox = el('div', 'gr-marks-col');
  const pageL = el('div', 'gr-page');
  const pageR = el('div', 'gr-page r');
  const leafL = el('div', 'gr-page-in');
  const leafR = el('div', 'gr-page-in');
  const folioL = el('div', 'gr-folio');
  const folioR = el('div', 'gr-folio');
  pageL.append(leafL, folioL);
  pageR.append(leafR, folioR);
  // skill'ler yer imi sütununun altına da uzanır (portrelerin altından sol sayfanın sonuna): sütunlar geniş kalır, adlar bölünmez
  const skillsBox = el('div', 'gr-lskills');
  body.append(marksBox, pageL, el('div', 'gr-spine'), pageR, skillsBox);
  panel.append(head, body);
  // sağ üst X: Menu düğmesinin yerinde (açıkken Menu gizli; src/ui/nav-close.ts)
  const unmountX = mountCloseButton(overlay, () => close());
  // hata / uyarı yazısı (eski alt çubuğun yerine kısa toast)
  const toast = el('div', 'gr-toast');
  toast.setAttribute('role', 'status');
  overlay.append(toast);
  let toastTimer = 0;
  const showToast = (text: string, ok = false): void => {
    toast.textContent = text;
    toast.classList.toggle('ok', ok);
    toast.classList.add('on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('on'), 2600);
  };

  const focusInst = (): ItemInstance | null => {
    const uid = dragUid || hoverUid || sel;
    return uid ? (bagInst(uid) ?? null) : null;
  };
  const badge = (n: number, cls: string, tip: string): HTMLElement => {
    const b = el('span', `gr-pt ${cls}`, String(n));
    b.title = tip;
    return b;
  };
  function renderHead(): void {
    const hero = curHero();
    tabBtns.forEach((b, i) => {
      const on = (i === 0 ? 'hero' : 'sheet') === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    const sheetBtn = tabBtns[1]!;
    sheetBtn.querySelector('.gr-pt')?.remove();
    if ((hero?.skillPoints ?? 0) > 0) sheetBtn.append(badge(hero!.skillPoints!, 'sk', 'Skill points'));
    gold.replaceChildren();
    gold.hidden = !!ext?.hideGold;
    if (!ext?.hideGold) {
      gold.append(document.createTextNode(String(src.gold())));
      withUiIcon(gold, 'gold');
      gold.title = 'Gold';
    }
  }
  function renderMarks(): void {
    if (bagOnly) return;
    marksBox.replaceChildren(
      heroMarks({
        heroes: src.heroes(),
        heroId,
        focus: focusInst(),
        onHero: (id) => {
          if (id !== heroId) pending = {};
          heroId = id;
          renderAll();
        },
      }),
    );
  }
  function renderLeft(): void {
    if (bagOnly) return;
    const top = pageL.scrollTop;
    const hero = curHero();
    const r = renderLedgerPage({
      tab,
      heroes: src.heroes(),
      heroId,
      focus: focusInst(),
      ...(hero && (hero.hpRatio !== undefined || hero.alive === false) ? { hpRatio: hero.alive === false ? 0 : (hero.hpRatio ?? 1) } : {}),
      ...(o.tutorial ? { hint: 'Your escort left their gear for the new company. Drag an item from the bag onto a hero or a slot, or let Equip best choose.' } : {}),
      onHero: (id) => {
        heroId = id;
        renderAll();
      },
      ...(src.allocate
        ? {
            level: {
              pending,
              onAdd: (k: Attribute) => {
                pending = { ...pending, [k]: (pending[k] ?? 0) + 1 };
                uiSound('select');
                renderAll();
              },
              onSub: (k: Attribute) => {
                const n = (pending[k] ?? 0) - 1;
                pending = { ...pending };
                if (n > 0) pending[k] = n;
                else delete pending[k];
                renderAll();
              },
              onReset: () => {
                pending = {};
                renderAll();
              },
              onConfirm: () => {
                const h = curHero();
                if (!h) return;
                const add = pending;
                pending = {};
                apply(() => src.allocate!(h.id, add), () => uiSound('confirm'));
              },
            },
          }
        : {}),
      onLocked: () => fallenWarn(),
      onSlotDouble: (slot) => {
        const h = curHero();
        if (h) quickUnequip(h.id, slot);
      },
    });
    curStats = r.stats;
    afterStats = r.after;
    leafL.replaceChildren(r.el);
    if (r.skills) skillsBox.replaceChildren(r.skills);
    else skillsBox.replaceChildren();
    folioL.textContent = `· ${tab === 'hero' ? 1 : 3} ·`;
    pageL.scrollTop = top;
    if (ix.dragging()) ix.remark();
  }
  /** Odak (üstüne gelinen / sürüklenen / seçili item) değişti: farklar ve yer imi ipuçları. */
  function renderFocus(): void {
    renderMarks();
    renderLeft();
  }
  const bestButtons = (): HTMLElement[] => {
    const hero = curHero();
    const out: HTMLElement[] = [];
    if (bagOnly) return out;
    if (hero)
      out.push(
        (() => {
          const b = btn('gr-btn sm gr-best', `Best: ${className(hero.class)}`, () => {
            sel = '';
            if (heroFallen(hero)) return fallenWarn();
            apply(() => src.equipBest([hero.id]));
          });
          if (heroFallen(hero)) {
            b.classList.add('off');
            b.title = fallenMsg();
          }
          return b;
        })(),
      );
    const all = btn('gr-btn sm gr-best', 'Best: all', () => {
      sel = '';
      const ids = src.heroes().filter((h) => !heroFallen(h)).map((h) => h.id);
      if (!ids.length) return fallenWarn();
      apply(() => src.equipBest(ids));
    });
    all.title = 'Equip best for the whole company';
    all.dataset['tut'] = 'best'; // mentor dersi vurgusu (data/tutorial.json > gear)
    out.push(all);
    return out;
  };
  function renderRight(): void {
    folioR.textContent = `· ${tab === 'hero' ? 2 : 4} ·`;
    if (tab === 'sheet' && !bagOnly) {
      // skill ağacı (Ömer 2026-10-18): kap aynı, içerik yok
      const hero = curHero();
      const hd = el('div', 'gr-sec gr-tree-head', 'Skill tree');
      if ((hero?.skillPoints ?? 0) > 0) hd.append(badge(hero!.skillPoints!, 'sk', 'Skill points'));
      const tree = el('div', 'gr-tree gr-soon');
      tree.append(el('span', '', 'Coming soon'));
      leafR.replaceChildren(hd, tree);
      return;
    }
    const hero = curHero();
    const bag = src.bag();
    if (sel && !bag.some((i) => i.uid === sel)) sel = '';
    const scroll = leafR.querySelector<HTMLElement>('.gr-bag')?.scrollTop ?? 0;
    const inv = renderInventory({
      items: bag,
      size: src.bagSize,
      ...(bagOnly ? { usableClasses: src.heroes().map((h) => h.class) } : hero ? { usableClass: hero.class } : {}),
      filter: {
        on: usableOnly,
        // telefonda kısa (torba başlığına Best düğmeleriyle sığsın)
        label: usableOnly && (hero || bagOnly) ? (phoneLayout() ? 'Usable' : bagOnly ? 'Usable by party' : `Usable by ${className(hero!.class)}`) : phoneLayout() ? 'All' : 'All items',
        toggle: () => {
          usableOnly = !usableOnly;
          renderRight();
        },
      },
      headExtra: bestButtons(),
      ...(ext?.price ? { price: ext.price } : {}),
      selected: sel,
      shake: shakeUid,
      onTap: (uid) => {
        sel = sel === uid ? '' : uid;
        renderAll();
      },
      onDouble: (uid) => {
        if (ext?.onDoubleTap?.(`bag:${uid}`) !== undefined) return;
        if (bagOnly) return;
        const h = curHero();
        if (h) tryEquip(h.id, uid, undefined, true);
      },
    });
    shakeUid = '';
    if (!bag.length) inv.append(el('div', 'gr-card-empty', src.emptyText ?? 'The bag is empty.'));
    leafR.replaceChildren(inv);
    const g = leafR.querySelector<HTMLElement>('.gr-bag');
    if (g) {
      snapBagRows(g);
      g.scrollTop = scroll;
    }
  }
  function renderAll(): void {
    ix.hideTips();
    panel.classList.toggle('tab-hero', tab === 'hero');
    panel.classList.toggle('tab-sheet', tab === 'sheet');
    renderHead();
    renderMarks();
    renderLeft();
    renderRight();
    ext?.render();
    if (flashText) {
      showToast(flashText);
      flashText = '';
    }
  }
  const api: GearApi = {
    rerender: () => renderAll(),
    flash: (t, ok = false) => {
      if (!ok) uiSound('error');
      showToast(t, ok);
    },
    hero: () => curHero(),
    equip: (h, u, sl) => tryEquip(h, u, sl),
    selected: () => sel,
    clearSel: () => {
      sel = '';
    },
    close: () => close(),
  };
  // debug araçları (altın / item ver) açık ekranı yeniden çizdirir
  function onRefresh(): void {
    if (!closing) renderAll();
  }
  document.addEventListener(GEAR_REFRESH_EVENT, onRefresh);
  ext?.attach(overlay, api);
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
    const b = btn(`gr-hero${h.id === heroId ? ' on' : ''}${heroFallen(h) ? ' fallen' : ''}`, '', () => pick(h.id));
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

/** Ashford teslim kartı (pendingHandover): eski takım item'lerini yeni bölüğe bırakır. Alt kart (Toast): src/ui/handover-toast.ts. */
export function showHandover(root: HTMLElement, s: CampaignState, on: { equip: () => void; later: () => void }): () => void {
  const ho = s.pendingHandover;
  const items = (ho?.items ?? []).map((u) => s.inventory.find((i) => i.uid === u) ?? findEquippedInst(s, u)).filter((x): x is ItemInstance => !!x);
  return showHandoverToast(root, { classes: (ho?.from ?? []).map((f) => f.class), items }, on);
}

function findEquippedInst(s: CampaignState, uid: string): ItemInstance | undefined {
  for (const h of s.roster as Hero[]) for (const k of SLOT_IDS) if (h.equipment[k]?.uid === uid) return h.equipment[k]!;
  return undefined;
}
