/**
 * Demirci (Blacksmith) DOM ekranı (Ömer 2026-10-18, ilerleme TUR 1 madde 7): tüccar ekranının kalıbı (src/ui/merchant-screen.ts,
 * docs/design/ui-reference.md): solda DEMİRCİ paneli (başlık + kese, kısa satır, seçili item, Temper ve Reforge), sağda ORTAK ENVANTER (Gear).
 * Seçim dokunarak: torbadaki item'e dokun (ya da sağdaki kahraman panelinde takılı bir item'e tek tıkla), istersen torbadan panele sürükle.
 * Temper: önizleme (önce -> sonra: item seviyesi, seviye şartı, silah gücü, affix değerleri), fiyat; altın yetmezse ya da tavan / seviye şartı
 * engellerse düğme pasif ve neden yazar. Reforge (yalnız Epic): ana affix dışındaki bir affix seçilir, aynı kademeden yeniden zarlanır; fiyat her
 * tekrarda artar. Panel içi = Form 7 seçimi A "Tek kart" (src/ui/blacksmith-panel.ts), eylem animasyonları src/ui/blacksmith-fx.ts (Ömer 2026-11-12).
 * Kurallar saf: src/campaign/smith.ts. Oyun içi metinler İngilizce; italik yok (yalnızca kısa flavor satırı).
 */
import './gear.css';
import './gear-plates.css';
import './blacksmith.css';
import './bottom-warn.css';
import './econ.css';
import {
  COMBINE_COUNT,
  combineItemBlocked,
  combineItems,
  findItem,
  reforgeChoices,
  reforgeItem,
  smithCap,
  temperItem,
  temperStonesOf,
  type CampaignState,
} from '../campaign';
import { affixDef, itemDef, type ItemInstance, type SlotId } from '../progression';
import { campaignGearSource, equippedTipNodes, openGear, type GearApi, type GearExt } from './gear-screen';
import { itemTipNodes } from './item-tip';
import { uiSound, worldSound } from './ui-sound';
import { goldImg } from './ui-icons';
import { attachBandTip, reasonSpec } from './band-tip-attach';
import { COMBINE_ICON, REROLL_ICON, TEMPER_STONE_ICON, iconImg, temperStoneImg } from './temper-stone';
import { reforgeAccepts, reforgePickOnSwitch, reforgeRejectReason } from './blacksmith-rules';
import { renderSmithPanel, type BsCtx, type BsTab } from './blacksmith-panel';
import { captureCombine, captureTemperNums, playCombineFx, playReforgeFx, playTemperFx } from './blacksmith-fx';
import { wantsDebugButton } from './debug-gesture';

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
const goldIcon = goldImg;

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
  /** Temper'in seçimi; Reforge'un ayrı seçimi (yalnız Epic, Ömer 2026-11-12: Epic olmayan Reforge'a alınmaz). */
  let pick = '';
  let rPick = '';
  let lastBag = '';
  let reforgeAt = -1;
  type Tab = BsTab;
  let tab: Tab = 'temper';
  const curPick = (): string => (tab === 'reroll' ? rPick : pick);
  let combine: string[] = [];
  /** Combine'dan yeni çıkan item'in uid'i (yuvalar boşken sonuç kartı yerine onun kartı; yeni seçim / sekme değişimi kaldırır). */
  let reveal = '';
  let line: keyof typeof LINES = 'idle';
  const side = el('div', 'gr-panel gr-gear gr-ledger gr-shop bs-smith bsv-on');
  side.dataset['drop'] = 'smith';

  /**
   * Reforge "Epic only" uyarısı panelin ALTINDA, eylem satırının üstünde kısa bant (Ömer 2026-11-12: "alttan"; tasarım dili 4.4'ün üst orta
   * bildirim kuralına Ömer'in açık istisnası). Düğüm her çizimde panelin sonuna yeniden eklenir (durumu korunur).
   */
  const warnAnchor = el('div', 'bs-warn-anchor');
  const warn = el('div', 'bs-warn');
  warn.setAttribute('role', 'status');
  warnAnchor.append(warn);
  let warnTimer = 0;
  const warnLow = (text: string): void => {
    uiSound('error');
    warn.textContent = text;
    warn.classList.remove('on');
    void warn.offsetWidth;
    warn.classList.add('on');
    window.clearTimeout(warnTimer);
    warnTimer = window.setTimeout(() => warn.classList.remove('on'), 2400);
  };

  /** Seçili item (torbadan seçim Gear'ın kendi seçimi; takılı item paneldeki satırdan). */
  const current = (): ItemInstance | null => {
    const s = get();
    const bagSel = api?.selected() ?? '';
    // torbada yeni bir item seçildiyse (Gear'ın seçimi değişti) demirci onu alır; takılı item seçimi bunu ezmez
    if (bagSel !== lastBag) {
      lastBag = bagSel;
      const inst = bagSel ? s.inventory.find((x) => x.uid === bagSel) : undefined;
      if (inst && tab === 'reroll') {
        // Reforge: Epic olmayan seçim alınmaz (bildirimi take/choose verir), önceki seçim kalır
        if (reforgeAccepts(inst)) {
          rPick = bagSel;
          reforgeAt = -1;
        }
      } else if (inst) pick = bagSel;
    }
    const uid = curPick();
    return uid ? (findItem(s, uid)?.inst ?? null) : null;
  };

  /** Sağ paneldeki seçili kahramanın `slot:<yuva>` anahtarından takılı item'in uid'i. */
  const equippedUid = (key: string): string => api?.hero()?.equipment[key.slice(5) as SlotId]?.uid ?? '';

  const choose = (uid: string): void => {
    if (curPick() === uid) return;
    if (tab === 'reroll') {
      const why = reforgeRejectReason(findItem(get(), uid)?.inst);
      if (why) {
        // torbadaki vurgusu da kalksın: panelde görünmeyen item seçili görünmesin
        if (api?.selected() === uid) {
          api.clearSel();
          lastBag = '';
          api.rerender();
        }
        warnLow(why);
        return;
      }
      rPick = uid;
    } else pick = uid;
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
    const nums = captureTemperNums(side);
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
    playTemperFx(side, nums);
  };

  const doReforge = (): void => {
    if (!rPick || reforgeAt < 0) return;
    const was = findItem(get(), rPick)?.inst;
    const pool = was ? reforgeChoices(was, reforgeAt).map((id) => affixDef(id)?.name ?? id) : [];
    try {
      set(reforgeItem(get(), rPick, reforgeAt));
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
    playReforgeFx(side, pool);
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
    const snap = captureCombine(side);
    const had = new Set(get().inventory.map((x) => x.uid));
    try {
      set(combineItems(get(), combine));
    } catch (err) {
      line = 'poor';
      api?.flash(err instanceof Error ? err.message : String(err));
      api?.rerender();
      return;
    }
    combine = [];
    reveal = get().inventory.find((x) => !had.has(x.uid))?.uid ?? '';
    uiSound('buy');
    line = 'combine';
    api?.flash('Combined', true);
    api?.rerender();
    playCombineFx(side, snap);
  };

  /** Combine yuvasina ekle / cikar. */
  const toggleCombine = (uid: string): void => {
    reveal = '';
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

  /** Seçili item'i demirciden çıkarır (o sekmenin seçimi). */
  const unpick = (): void => {
    if (tab === 'reroll') rPick = '';
    else pick = '';
    reforgeAt = -1;
  };

  /** Sekme değişimi: Temper -> Reforge seçimi yalnız Epic ise taşınır; Reforge -> Temper seçimi taşır. */
  const setTab = (id: Tab): void => {
    if (tab === id) return;
    const s = get();
    if (id === 'reroll') {
      const next = reforgePickOnSwitch(pick ? (findItem(s, pick)?.inst ?? null) : null, rPick);
      if (next !== rPick) reforgeAt = -1;
      rPick = next;
    } else if (tab === 'reroll' && rPick && id === 'temper') pick = rPick;
    tab = id;
    reveal = '';
    uiSound('select');
    renderSide();
  };

  const actRow = (label: string, blocked: string | null, run: () => void, cost: HTMLElement): HTMLElement => {
    const b = btn('el-btn primary', label, run);
    b.disabled = !!blocked;
    if (blocked) attachBandTip(b, reasonSpec(label, blocked));
    const wrap = el('div', 'gr-shopact bs-act');
    wrap.append(cost);
    if (blocked) wrap.append(el('span', 'bs-why', blocked));
    wrap.append(b);
    return wrap;
  };

  /** Taş + altın (çerçevesiz): çanta altındaki Supplies / Purse şeridinde (Ömer 2026-11-11 Form 6; başlıkta değil). */
  function purseParts(): HTMLElement[] {
    const s = get();
    const purse = el('div', 'gr-gold', String(s.gold));
    const gi = goldIcon('gr-ui-ico');
    if (gi) {
      purse.classList.add('gr-has-ico');
      purse.prepend(gi);
    }
    attachBandTip(purse, { title: 'Gold' });
    const stones = el('div', 'bs-stones');
    attachBandTip(stones, { title: 'Temper Stones' });
    stones.append(temperStoneImg(), String(temperStonesOf(s)));
    return [stones, purse];
  }

  function renderSide(): void {
    const s = get();
    const head = el('div', 'gr-head gr-lhead');
    head.append(el('div', 'gr-title', 'Blacksmith'));
    const kids: HTMLElement[] = [head];
    kids.push(el('div', 'gr-shop-sub', `${o.sub ? `${o.sub} · ` : ''}Items can be tempered up to item level ${smithCap(s)} in this chapter`));
    kids.push(el('div', 'gr-odo-line bs-line', LINES[line]));

    const tabs = el('div', 'bs-tabs');
    // Temper / Combine / Reforge tek satır (Ömer 2026-11-12): düğmede tek kelime, ipucu YOK (Ömer 2026-11-12: açıklama panelde yazıyor);
    // Reforge'un Epic şartı sekmenin açıklamasında ve Epic olmayan item bırakılınca çıkan bildirimde. Dördüncü alan = panel açıklaması.
    const defs: Array<[Tab, string, string, string]> = [
      ['temper', 'Temper', TEMPER_STONE_ICON, 'Raise item level by 1'],
      ['combine', 'Combine', COMBINE_ICON, '3 items become 1'],
      ['reroll', 'Reforge', REROLL_ICON, 'Epic items only: reroll one property'],
    ];
    for (const [id, label, icon, sub] of defs) {
      const b = el('button', `bs-tab${tab === id ? ' on' : ''}`);
      b.type = 'button';
      b.append(iconImg(icon, 'bs-tab-ico'), label);
      b.setAttribute('aria-label', `${label}: ${sub}`);
      b.addEventListener('click', () => setTab(id));
      tabs.append(b);
    }
    const inst = current();
    // Panel = Form 7 seçimi A "Tek kart" (Ömer 2026-11-12): src/ui/blacksmith-panel.ts; eylem animasyonları blacksmith-fx.ts
    combine = combine.filter((u) => s.inventory.some((x) => x.uid === u));
    const rev = reveal ? (findItem(s, reveal)?.inst ?? null) : null;
    const ctx: BsCtx = {
      s,
      tab,
      tabs,
      inst,
      heroClass: inst ? findItem(s, inst.uid)?.hero?.class : undefined,
      combine: combine.map((u) => findItem(s, u)?.inst).filter((x): x is ItemInstance => !!x),
      reveal: rev,
      reforgeAt,
      setReforgeAt: (i) => {
        reforgeAt = i;
        uiSound('select');
        renderSide();
      },
      unpick: () => {
        unpick();
        uiSound('select');
        renderSide();
      },
      toggleCombine,
      clearCombine: () => {
        combine = [];
        reveal = '';
        uiSound('select');
        renderSide();
      },
      doTemper,
      doReforge,
      doCombine,
      actRow,
      stoneRow,
    };
    kids.push(...renderSmithPanel(ctx));
    side.replaceChildren(...kids, warnAnchor);
  }

  const ext: GearExt = {
    side,
    purse: purseParts,
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
      return f ? [...itemTipNodes(f.inst, f.hero?.class), ...(api?.hero() ? equippedTipNodes(get().roster, f.inst, api.hero()) : [])] : [];
    },
    tipActions: (key) => {
      if (!key.startsWith('smith:')) return null;
      const uid = key.slice(6);
      return curPick() === uid && tab !== 'combine' ? [] : [{ label: tab === 'combine' ? (combine.includes(uid) ? 'Remove' : 'Add') : 'Choose', primary: true, run: () => take(uid) }];
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
  const close = openGear(root, src, { ext, onClose: () => o.onClose?.() });
  // Debug kancası (yalnız ?debug=1): Lead'in çekimleri için sekme / seçim / Combine doldurma (window.__bsDebug)
  if (typeof window !== 'undefined' && wantsDebugButton(window.location.search)) {
    const w = window as unknown as { __bsDebug?: unknown };
    w.__bsDebug = {
      tab: (t: Tab) => setTab(t),
      pick: (uid: string) => take(uid),
      unpick: () => (unpick(), renderSide()),
      combineFill: () => {
        const s = get();
        combine = s.inventory.filter((x) => !combineItemBlocked(s, x.uid)).slice(0, COMBINE_COUNT).map((x) => x.uid);
        tab = 'combine';
        renderSide();
        return combine.slice();
      },
      reforgeLine: (i: number) => ((reforgeAt = i), renderSide()),
      /** Sekmenin eylemini çalıştırır (Temper / Combine / Reforge; animasyonu tetikler). */
      act: () => (tab === 'temper' ? doTemper() : tab === 'combine' ? doCombine() : doReforge()),
      firstEpic: () => get().inventory.find((x) => reforgeAccepts(x))?.uid ?? '',
      firstNonEpic: () => get().inventory.find((x) => !reforgeAccepts(x))?.uid ?? '',
      state: () => ({ tab, pick, rPick, combine: combine.slice(), reforgeAt }),
    };
  }
  return () => {
    if (typeof window !== 'undefined') delete (window as unknown as { __bsDebug?: unknown }).__bsDebug;
    close();
  };
}
