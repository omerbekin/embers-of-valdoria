/**
 * LOOT ekranı (Ömer 2026-10-18): kazanılan savaştan (ve sandık / hediyeden) sonra açılır; eski "Spoils" kartının yerini alır. Soluna ganimet alanı, sağına YALNIZCA ortak torba
 * (Gear'ın torba bileşeni; kahraman sayfası yok, Ömer 2026-10-18: "çanta açtıran görüntü") konur (taslak public/mockups/unified-inventory.html#v3&enc=reward): düşen item'ler orada durur;
 * oyuncu onları torbaya ya da bir kahraman yuvasına sürükler / dokunur, ya da bırakır. Altın ve XP burada gösterilir. Kapatınca alınmayanlar
 * geride kalır. Düşüş miktarı ve kuralları DEĞİŞMEZ; torba doluysa önce yer açılır (Gear'ın torbası, çöp kutusu).
 * Durum: mevcut `pendingLoot.left / leftRolls` alanları (kayıt şeması aynı): açılırken düşüş `stashLoot` ile ganimet alanına alınır.
 * Oyun içi metinler İngilizce.
 */
import './gear.css';
import { acknowledgeLoot, stashLoot, takeLeftover, type CampaignState } from '../campaign';
import { BAG_SIZE, instanceColor, itemDef, xpToNext, type ItemInstance } from '../progression';
import { avatarUrl } from './character-panel';
import { motion, ms } from './motion';
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

/** Bir kahramanın savaştan kazandığı XP (yalnızca gösterim; hesap src/campaign/xp.ts'te). `from` / `to` = savaş öncesi / sonrası level ve o leveldeki XP. */
export interface LootXp {
  name: string;
  gain: number;
  heroId?: string;
  cls?: string;
  from?: { level: number; xp: number };
  to?: { level: number; xp: number };
  /** Düşmüş kahraman (gri satır). */
  fallen?: boolean;
}

/** Bar dolum parçaları: her parça bir leveldeki 0..1 aralığı; level atlanınca bar dolup taşar, sıfırdan yeni leveldan devam eder. */
export function xpSegments(from: { level: number; xp: number }, to: { level: number; xp: number }): Array<{ from: number; to: number; levelAfter: number }> {
  const frac = (level: number, xp: number): number => {
    const need = xpToNext(level);
    return need > 0 ? Math.max(0, Math.min(1, xp / need)) : 1;
  };
  const out: Array<{ from: number; to: number; levelAfter: number }> = [];
  let l = from.level;
  let start = frac(from.level, from.xp);
  while (l < to.level) {
    out.push({ from: start, to: 1, levelAfter: l + 1 });
    l++;
    start = 0;
  }
  out.push({ from: start, to: frac(to.level, to.xp), levelAfter: l });
  return out;
}

/** Debug örneği: aktif takım için uydurma XP (ilki level atlar, sonuncu XP almaz); yalnızca ekranı denemek içindir, kayda yazılmaz. */
export function sampleLootXp(heroes: Array<{ id: string; class: string; level: number; xp: number; fallen?: boolean }>, name: (cls: string) => string): LootXp[] {
  return heroes.map((h, i) => {
    const need = xpToNext(h.level);
    const gain = i === heroes.length - 1 && heroes.length > 2 ? 0 : i === 0 ? need + Math.round(need * 0.4) : 20 + i * 17;
    let level = h.level;
    let xp = h.xp + gain;
    while (xpToNext(level) > 0 && xp >= xpToNext(level)) {
      xp -= xpToNext(level);
      level++;
    }
    return { name: name(h.class), gain, heroId: h.id, cls: h.class, from: { level: h.level, xp: h.xp }, to: { level, xp }, ...(h.fallen ? { fallen: true } : {}) };
  });
}

export interface LootHooks {
  get: () => CampaignState;
  set: (s: CampaignState) => void;
  /** Gear kaynağı (sefer: campaignGearSource). */
  gear: GearSource;
  /** Savaştan kazanılan XP (yalnızca gösterim; yoksa bölüm çıkmaz). Kahraman başına satır: portre, level, "+N XP" ve dolan bar. */
  xp?: LootXp[];
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

  // ---- XP satırları ----
  let dead = false;
  const timers: number[] = [];
  const later = (fn: () => void, t: number): void => {
    timers.push(window.setTimeout(() => !dead && fn(), t));
  };
  let child: (() => void) | null = null;
  /** Satıra dokunma: o kahramanın karakter (Gear) ekranı üstte açılır; kapanınca ganimet ekranı olduğu gibi kalır. */
  const openHero = (heroId: string): void => {
    if (child || !root) return;
    uiSound('open');
    child = openGear(root, o.gear, {
      hero: heroId,
      onClose: () => {
        child = null;
        api?.rerender();
      },
    });
  };
  const buildXp = (): HTMLElement | null => {
    const rows = o.xp ?? [];
    if (!rows.length) return null;
    const mo = motion('lootXp');
    const box = el('div', 'gr-lx');
    box.append(el('div', 'gr-sec', 'Experience'));
    rows.forEach((x, i) => {
      const from = x.from ?? { level: 1, xp: 0 };
      const to = x.to ?? from;
      const none = x.gain <= 0;
      const row = el('button', `gr-lx-row${x.fallen ? ' fallen' : ''}${none ? ' none' : ''}`);
      row.type = 'button';
      row.setAttribute('aria-label', `${x.name}: open character`);
      const face = el('span', 'gr-lx-face');
      const url = x.cls ? avatarUrl(x.cls) : undefined;
      if (url) {
        const im = el('img');
        im.src = url;
        im.alt = '';
        im.draggable = false;
        face.append(im);
      } else face.textContent = x.name.slice(0, 1);
      const body = el('span', 'gr-lx-body');
      const top = el('span', 'gr-lx-top');
      const gainEl = el('span', 'gr-lx-gain', none ? (x.fallen ? 'Fallen' : 'No XP') : `+${x.gain} XP`);
      top.append(el('span', 'gr-lx-name', x.name), gainEl);
      const mid = el('span', 'gr-lx-mid');
      const lv = el('span', 'gr-lx-lv', `Lv ${from.level}`);
      const bar = el('span', 'gr-xpbar gr-lx-bar');
      const fill = el('i');
      const segs = xpSegments(from, to);
      fill.style.width = `${Math.round(segs[0]!.from * 100)}%`;
      bar.append(fill);
      const tag = el('span', 'gr-lx-up', 'Level up');
      mid.append(lv, bar, tag);
      body.append(top, mid);
      row.append(face, body);
      row.addEventListener('click', () => x.heroId && openHero(x.heroId));
      box.append(row);
      // Animasyon: kahramanlar arası hafif sırayla; level atlayınca bar dolup taşar, sıfırdan yeni leveldan sürer
      const finish = (): void => {
        lv.textContent = `Lv ${to.level}`;
        fill.style.width = `${Math.round(segs[segs.length - 1]!.to * 100)}%`;
        if (to.level > from.level) tag.classList.add('on');
      };
      if (none || ms(mo.fillMs) <= 0 || !fill.animate) return finish();
      let at = ms(mo.startDelayMs) + i * ms(mo.staggerMs);
      segs.forEach((sg, k) => {
        const dur = Math.max(ms(mo.segMinMs), ms(mo.fillMs) * (sg.to - sg.from));
        later(() => {
          fill.style.width = `${Math.round(sg.to * 100)}%`;
          fill.animate([{ width: `${Math.round(sg.from * 100)}%` }, { width: `${Math.round(sg.to * 100)}%` }], { duration: dur, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' });
          if (k < segs.length - 1 || sg.levelAfter > from.level) {
            later(() => {
              lv.textContent = `Lv ${sg.levelAfter}`;
              if (sg.levelAfter > from.level) {
                row.classList.add('lvup');
                tag.classList.add('on');
                uiSound('confirm');
                later(() => row.classList.remove('lvup'), ms(mo.levelUpMs));
              }
              if (k < segs.length - 1) fill.style.width = '0%';
            }, dur);
          }
        }, at);
        at += dur + (k < segs.length - 1 ? ms(mo.levelUpMs) * 0.35 : 0);
      });
    });
    return box;
  };
  const xpBox = buildXp();

  const renderSide = (): void => {
    const s = o.get();
    const drop = s.pendingLoot;
    const items = lootItems(s);
    const rare = [...(drop?.rare ?? [])];
    side.replaceChildren();
    const head = el('div', 'gr-head gr-lhead');
    head.append(el('div', 'gr-title', 'Loot'));
    side.append(head);
    // altın (yalnızca gösterim: altın zaten kesede) + kahraman başına XP satırı (kalıcı kap: ekran yenilenince animasyon baştan başlamaz)
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
      const gain = el('div', 'gr-loot-gain');
      gain.append(g);
      side.append(gain);
    }
    if (xpBox) side.append(xpBox);
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
    if (!items.length) list.append(el('div', 'gr-card-empty', drop?.gold || xpBox ? 'No gear this time.' : 'Nothing here.'));
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
    bagOnly: true, // yalnızca ganimet + ortak torba (kahraman sayfası yok; kuşanma sonra Gear'da)
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
      return [{ label: 'Take', primary: true, disabled: bagFull(), run: () => void take(i) }];
    },
    onDoubleTap: (key) => (key.startsWith('loot:') ? (take(idxOf(key)), true) : undefined),
    onKey: () => !!child, // karakter ekranı açıkken Esc yalnızca onu kapatır (kendi dinleyicisi)
    destroy: () => {
      dead = true;
      for (const t of timers) window.clearTimeout(t);
    },
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
