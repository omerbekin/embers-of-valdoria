/**
 * CHARACTER sayfası (Ömer 2026-10-11, g1): kahraman listesi | 7 yuva (Weapon yanında Off-hand) + statlar, altta sol kenardan başlayan skill satırı. Gear'da Inventory'nin
 * yanında, tüccarda "Character" (C) ile malların üstünde açılır. "Usable by" ayrı blok değil: üstüne gelinen / seçili / sürüklenen item varken
 * her kahraman kartının alt satırı o kahramana etkisini gösterir (src/ui/gear-hover.ts); statlar ve skill sayıları seçili kahraman için
 * "önce → sonra" (src/ui/gear-skills.ts, skill-info ile aynı sayılar). Yalnızca çizer; dokunuşlar geri çağrılarla, sürükleme / ipuçları ekranın
 * denetçisinde (`data-drop`, `data-drag`, `data-tip`, `data-stat`, `data-skill`). Görünüm: src/ui/gear.css. Oyun içi metinler İngilizce.
 */
import { content } from '../engine';
import { skillIconName } from './mob-icons';
import type { Stats } from '../engine';
import {
  ITEMS,
  SLOT_IDS,
  classUsesOffhand,
  defaultEquipSlot,
  equipInto,
  gripOf,
  isPlanError,
  offhandBlocker,
  planEquip,
  cappedExtras,
  classWeaponFamilies,
  equipDiff,
  fmtPanel,
  heroPanel,
  heroStats,
  instanceColor,
  itemDef,
  slotDef,
  type ItemInstance,
  type SlotId,
  canAddPoint,
  mergeAlloc,
  PRIMARY_BONUS_NAME,
  xpToNext,
  type StatAlloc,
} from '../progression';
import type { Attribute } from '../engine';
import { wikiFiles } from '../wiki/files';
import { statIconUrl } from './stat-tips';
import { PANEL_GROUPS, VITAL_STATS } from '../game/stat-columns';
import { uiIconName } from './ui-icons';
import { gearSkillRows, type GearSkillRow } from './gear-skills';
import { ELEMENT_COLOR, skillTags } from './skill-tags';
import { ownerOfSkill, ownerOfUnit } from '../game/asset-versions';
import layout from '../../data/battle-layout.json';
import { heroItemLine, type HoverHero } from './gear-hover';
import { itemIcon } from './inventory';
import { slotIconUrl } from './slot-icons';
import { escHtml, passiveCellHtml, skillCellHtml, type SkillCellView, type SkillCostChip } from './skill-bar';
import { tipHtml, type TipContent } from './battle-hud';
import { iconUrl } from './dom-icons';
import { RAGE_COLOR, STAT_COLOR, UI_COLOR, statIconName } from './stat-icons';
import { skillMiniGrid } from './shape-diagram';
import { passiveTip, skillTip } from './gear-skills';
import { skillCostAmount } from '../engine/cost';
import type { SkillDef } from '../engine';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export const avatarUrl = (classId: string): string | undefined => wikiFiles.avatars[`../../assets/avatars/${classId}.png`];
export const className = (id: string): string => content.classes[id]?.name ?? id;

/** Skill sayısı / tooltip satırı rengi: savaş tooltip'iyle aynı (element, kalkan, büyü kalkanı; şifa yeşil). */
const KIND_COLOR: Record<string, string> = { ...ELEMENT_COLOR, shield: layout.colors.shield, magicShield: layout.colors.magicShield, heal: layout.colors.heal };
export const kindColor = (k: string | undefined): string | undefined => (k && k !== 'physical' ? KIND_COLOR[k] : undefined);

export interface CharacterView {
  heroes: HoverHero[];
  heroId: string;
  /** Karşılaştırılan item (üstüne gelinen > sürüklenen > seçili torba item'i); yoksa null. */
  focus: ItemInstance | null;
  /** Item takma tutorial'ı: üstte yönlendirme satırı. */
  hint?: string;
  /** Telefonda kahraman sütunu dar (yalnızca portre). */
  compact?: boolean;
  onHero: (id: string) => void;
  onSlotDouble?: (slot: SlotId) => void;
  /** Level / stat puanı dağıtımı (levels.md; kaynak dağıtımı destekliyorsa). Yoksa yalnızca level ve XP gösterilir. */
  level?: LevelPanel;
}

/** Stat puanı dağıtımı: bekleyen (onaylanmamış) puanlar ekranın elinde; Confirm kaynağa yazar. */
export interface LevelPanel {
  pending: StatAlloc;
  onAdd: (k: Attribute) => void;
  onSub: (k: Attribute) => void;
  onReset: () => void;
  onConfirm: () => void;
}

const ATTR_IDS: Attribute[] = ['str', 'dex', 'int', 'luck'];
const pendingCount = (p: StatAlloc): number => ATTR_IDS.reduce((t, k) => t + (p[k] ?? 0), 0);

/**
 * Level bloğu (Ömer 2026-10-17, levels.md): "Level 5" + XP çubuğu; puan varsa sürüklenebilir puan taşı + Reset / Confirm. Puan taşı bir stat
 * satırına sürüklenince (fare + dokunma) ya da satırdaki + ile o stata bir puan gider (bekleyen; Confirm yazar). Kural (temel stat diğer üçünün
 * toplamını aşamaz) + düğmesini kapatır ve satırı bırakma hedefi yapmaz.
 */
function levelBlock(hero: HoverHero, lv: LevelPanel | undefined, primaryLost: string | null): HTMLElement {
  const box = el('div', 'gr-lvl');
  const level = hero.level ?? 1;
  const need = xpToNext(level);
  const xp = hero.xp ?? 0;
  const head = el('div', 'gr-lvl-head');
  head.append(el('span', 'gr-lvl-n', `Level ${level}`), el('span', 'gr-lvl-xp', need > 0 ? `${xp} / ${need} XP` : 'Max level'));
  const bar = el('div', 'gr-xpbar');
  const fill = el('i');
  fill.style.width = `${need > 0 ? Math.min(100, Math.round((xp / need) * 100)) : 100}%`;
  bar.append(fill);
  box.append(head, bar);
  const pend = lv ? pendingCount(lv.pending) : 0;
  const free = (hero.statPoints ?? 0) - pend;
  // Puan ekranında satır puan yokken de (Confirm sonrası) görünmez olarak yer tutar: altındaki statlar kaymaz (Ömer 2026-10-18)
  if (lv) {
    const idle = free <= 0 && pend <= 0;
    const row = el('div', `gr-pts${idle ? ' gr-pts-idle' : ''}`);
    if (idle) row.setAttribute('aria-hidden', 'true');
    const chip = el('span', `gr-pts-chip${free > 0 ? '' : ' empty'}`, String(free));
    chip.title = 'Drag onto a stat, or tap + next to it';
    if (free > 0) chip.dataset['ptdrag'] = '1';
    row.append(chip, el('span', 'gr-pts-text', free > 0 ? `stat point${free === 1 ? '' : 's'} to spend` : 'All points placed'));
    const acts = el('span', 'gr-pts-acts');
    if (pend > 0) {
      const reset = el('button', 'gr-btn sm', 'Reset');
      reset.type = 'button';
      reset.addEventListener('click', lv.onReset);
      const ok = el('button', 'gr-btn sm primary', 'Confirm');
      ok.type = 'button';
      ok.addEventListener('click', lv.onConfirm);
      acts.append(reset, ok);
    }
    row.append(acts);
    box.append(row);
    if (pend > 0 && primaryLost) box.append(el('div', 'gr-pts-warn', primaryLost));
  }
  if ((hero.skillPoints ?? 0) > 0) box.append(el('div', 'gr-pts-skill', `${hero.skillPoints} skill point${hero.skillPoints === 1 ? '' : 's'} saved for the skill trees`));
  return box;
}

/** Puan taşının sürüklenmesi (fare + dokunma): bırakma hedefi `.gr-stat[data-attr].can-add`; hayalet imleci izler. */
function attachPointDrag(root: HTMLElement, onDrop: (k: Attribute) => void): void {
  root.addEventListener('pointerdown', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-ptdrag]');
    if (!chip) return;
    e.preventDefault();
    e.stopPropagation();
    const ghost = el('div', 'gr-pts-ghost', '+1');
    document.body.append(ghost);
    const targets = [...root.querySelectorAll<HTMLElement>('.gr-stat.can-add')];
    targets.forEach((x) => x.classList.add('drop-ok'));
    const at = (x: number, y: number): HTMLElement | undefined =>
      targets.find((t) => {
        const r = t.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });
    const move = (ev: PointerEvent): void => {
      ghost.style.left = `${ev.clientX}px`;
      ghost.style.top = `${ev.clientY}px`;
      const hit = at(ev.clientX, ev.clientY);
      targets.forEach((t) => t.classList.toggle('drop-on', t === hit));
    };
    const up = (ev: PointerEvent): void => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      ghost.remove();
      targets.forEach((t) => t.classList.remove('drop-ok', 'drop-on'));
      const hit = ev.type === 'pointerup' ? at(ev.clientX, ev.clientY) : undefined;
      const k = hit?.dataset['attr'] as Attribute | undefined;
      if (k) onDrop(k);
    };
    move(e);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
  });
}


export interface CharacterRender {
  el: HTMLElement;
  /** Seçili kahramanın statları ve odak item takılırsa statları (stat / skill ipuçları için). */
  stats: Stats | null;
  after: Stats | null;
}

/** Seçili kahramanın hesapları (bekleyen puanlar dahil): statlar, fark sütunu, odak item takılırsa statlar. */
interface HeroCalc {
  /** Bekleyen puanlar eklenmiş kahraman. */
  hero: HoverHero;
  pending: StatAlloc;
  allocNow: StatAlloc;
  freePts: number;
  stats: Stats | null;
  after: Stats | null;
  diff: Map<string, number>;
  primaryLost: string | null;
}

function calcHero(v: CharacterView, hero0: HoverHero): HeroCalc {
  // Level puanları (bekleyen dahil): statlar ve skill sayıları dağıtım sonrası değerlerle; fark sütunu bekleyen puanların etkisini gösterir
  const pending = v.level?.pending ?? {};
  const pend = pendingCount(pending);
  const committed = hero0;
  const allocNow = mergeAlloc(hero0.alloc, pending);
  const hero = pend ? { ...hero0, alloc: allocNow } : hero0;
  const freePts = (hero.statPoints ?? 0) - pend;
  const stats = heroStats(hero);
  const fd = v.focus ? itemDef(v.focus.id) : undefined;
  const focusSlot = fd ? defaultEquipSlot(hero.equipment, fd) : undefined;
  const usableFocus = v.focus && fd && focusSlot && !isPlanError(planEquip(hero.class, hero.equipment, v.focus, focusSlot)) && hero.equipment[focusSlot]?.uid !== v.focus.uid ? v.focus : null;
  const pendDiff = (): Array<[string, number]> => {
    const a = heroPanel(hero);
    const b = heroPanel(committed);
    return a.map((x, i) => [x.id, Math.round((x.value - (b[i]?.value ?? x.value)) * 10000) / 10000] as [string, number]).filter(([, d]) => d !== 0);
  };
  const diff = new Map(usableFocus && focusSlot ? equipDiff(hero, usableFocus, focusSlot).map((x) => [x.id, x.delta] as [string, number]) : pend ? pendDiff() : []);
  const after = usableFocus && focusSlot ? heroStats({ ...hero, equipment: equipInto(hero.equipment, usableFocus, focusSlot).equipment as typeof hero.equipment }) : null;
  const lostTo = pend && stats && !stats.primaryActive && stats.primary ? stats.primary : null;
  const primaryLost = lostTo ? `${PRIMARY_BONUS_NAME[lostTo]} turns off while another base stat is above ${lostTo.toUpperCase()}.` : null;
  return { hero, pending, allocNow, freePts, stats, after, diff, primaryLost };
}

/** Kahraman kartları (tüccarın Character sekmesi): portre + ad + üstüne gelinen item'in etkisi. */
function heroCards(v: CharacterView, heroId: string | undefined): HTMLElement {
  const list = el('div', 'gr-heroes');
  for (const h of v.heroes) {
    const card = el('button', `gr-hero${h.id === heroId ? ' on' : ''}`);
    card.type = 'button';
    card.dataset['drop'] = `hero:${h.id}`;
    card.addEventListener('click', () => v.onHero(h.id));
    const face = el('div', 'gr-face');
    const url = avatarUrl(h.class);
    if (url) face.style.backgroundImage = `url("${url}")`;
    const meta = el('div', 'gr-hero-meta');
    const line = heroItemLine(h, v.focus);
    const sub = el('div', `gr-hero-sub tone-${line.tone}`);
    line.parts.forEach((p, i) => {
      if (i) sub.append(document.createTextNode(' · '));
      sub.append(el('span', p.dir ? `gr-tip-d ${p.dir}` : '', p.text));
    });
    meta.append(el('div', 'gr-hero-name', className(h.class)), sub);
    card.append(face, meta);
    list.append(card);
  }
  return list;
}

/**
 * Defterin sol kenarındaki kahraman yer imleri (Ömer 2026-10-18, ortak envanter v3 "Ledger"): yalnızca portre; harcanmamış stat puanı rozeti;
 * bırakma hedefi (`data-drop`); üstüne gelince / uzun basınca ipucu: ad + üstüne gelinen item'in o kahramana etkisi (`data-hint`).
 */
export function heroMarks(v: Pick<CharacterView, 'heroes' | 'heroId' | 'focus' | 'onHero'>): HTMLElement {
  const box = el('div', 'gr-marks');
  for (const h of v.heroes) {
    const b = el('button', `gr-mark${h.id === v.heroId ? ' on' : ''}`);
    b.type = 'button';
    b.dataset['hero'] = h.id;
    b.dataset['drop'] = `hero:${h.id}`;
    const line = heroItemLine(h, v.focus);
    b.dataset['hint'] = className(h.class);
    b.dataset['hintSub'] = line.text;
    b.dataset['hintTone'] = line.tone;
    b.setAttribute('aria-label', className(h.class));
    b.addEventListener('click', () => v.onHero(h.id));
    const face = el('div', 'gr-face');
    const url = avatarUrl(h.class);
    if (url) face.style.backgroundImage = `url("${url}")`;
    b.append(face);
    if ((h.statPoints ?? 0) > 0) b.append(el('span', 'gr-pt', String(h.statPoints)));
    box.append(b);
  }
  return box;
}

/** Boş yuvanın simgesi: boyalı simge (assets/ui-icons/slots, ~%36 opak) varsa o, yoksa eski soluk gölge simge. */
function emptySlotIcon(k: SlotId): HTMLImageElement {
  const url = slotIconUrl(k);
  if (!url) return itemIcon(undefined, k, 1.3);
  const img = el('img', 'gr-svg gr-slot-ico');
  img.src = url;
  img.alt = '';
  img.draggable = false;
  img.style.setProperty('--sz', '1.3');
  img.addEventListener('error', () => img.replaceWith(itemIcon(undefined, k, 1.3)), { once: true });
  return img;
}

/** Sınıf başlığı ("WARRIOR · AXES & SWORDS / ...") + 7 yuva. */
function slotsBlock(hero: HoverHero, v: CharacterView): HTMLElement[] {
  const head = el('div', 'gr-sec gr-class-sec', `${className(hero.class)} · ${classWeaponFamilies(hero.class).map((f) => ITEMS.weaponFamilies.find((x) => x.id === f)?.name).join(' / ')}`);
  const slots = el('div', 'gr-slots');
  const blocker = offhandBlocker(hero.equipment);
  for (const k of SLOT_IDS) {
    const inst = hero.equipment[k];
    const d = inst ? itemDef(inst.id) : undefined;
    // İkinci el (2026-10-12): çift el / yay / tılsım takılıyken kapalı görünür (bırakılırsa planEquip açık mesaj verir)
    const blocked = k === 'offhand' && !inst && !!blocker;
    const cell = el('button', `gr-slot${inst ? '' : ' empty'}${blocked ? ' blocked' : ''} gr-slot-${k}`);
    cell.type = 'button';
    cell.style.setProperty('--rc', inst && d ? instanceColor(inst) : '#5b4a33');
    if (blocked) {
      // Çift el / yay / tılsım (Ömer 2026-10-12): ikinci el yuvası tamamen etkisizdir
      // (ipucu yok, tık / çift tık / dokunma yok, bırakma hedefi değil: data-drop / data-tip / data-drag taşımaz -> bırakılan item yerine döner)
      cell.disabled = true;
      cell.tabIndex = -1;
      cell.setAttribute('aria-disabled', 'true');
      // Gölge YALNIZCA çift el silahta; yay / tılsım: düz kapalı boş yuva + "Hands full" (ileride sadak vb. ikinci el eşyası gelecek)
      const two = gripOf(blocker!) === 'two';
      if (two) {
        const ghost = itemIcon(hero.equipment.weapon, 'weapon', 1.3);
        ghost.classList.add('gr-silhouette');
        ghost.style.removeProperty('--glow');
        cell.append(ghost);
      } else cell.append(emptySlotIcon(k));
      const txt = el('div', 'gr-slot-text');
      txt.append(el('div', 'gr-slot-name', slotDef(k).name), el('div', `gr-slot-sub${two ? ' gr-hands-hint' : ''}`, two ? '2H' : 'Hands full'));
      cell.append(txt);
      slots.append(cell);
      continue;
    }
    cell.dataset['drop'] = `slot:${k}`;
    if (inst) {
      cell.dataset['drag'] = `slot:${k}`;
      cell.dataset['tip'] = `slot:${k}`;
      cell.addEventListener('dblclick', () => v.onSlotDouble?.(k));
    }
    cell.append(inst ? itemIcon(inst, k, 1.3) : emptySlotIcon(k));
    const txt = el('div', 'gr-slot-text');
    // kuşanılmış yuva: yalnızca ikon + ad (nadirlik renginde); özellikler üstüne gelince / dokununca ipucunda (Ömer 2026-10-11). Boş: ad + "Empty"
    txt.append(el('div', 'gr-slot-name', d ? d.name : slotDef(k).name));
    if (!(d && inst)) txt.append(el('div', 'gr-slot-sub', k === 'offhand' && !classUsesOffhand(hero.class) ? 'No shield or dagger' : 'Empty'));
    cell.append(txt);
    slots.append(cell);
  }
  return [head, slots];
}

/**
 * Stat grupları (savaş alt barıyla aynı düzen, src/game/stat-columns.ts): can + mana üstte; Ana | Atak | Defans sütunları.
 * Satır: ikon · ad · değer · fark (+1) · [−] [+] (Ömer 2026-10-18: fark değerin yanında, − ve + sağda sabit; + hiçbir durumda kaymaz).
 * `vitals` verilirse HP / MP satırı "93 / 150" + altında savaş HUD'ının çubuğu (can oranı kahramanın şu anki canı; mana dışarıda hep dolu).
 */
function statGroups(c: HeroCalc, v: CharacterView, vitals?: { hpRatio: number }): HTMLElement {
  const { hero, pending, allocNow, freePts, diff } = c;
  const sg = el('div', 'gr-sgroups');
  const rowsById = new Map<string, HTMLElement>();
  for (const p of heroPanel(hero)) {
    const row = el('div', 'gr-stat');
    row.dataset['stat'] = p.id;
    const dv = diff.get(p.id);
    const ico = el('img', 'gr-sico');
    ico.src = statIconUrl(p.id);
    ico.alt = '';
    ico.draggable = false;
    const vital = !!vitals && VITAL_STATS.includes(p.id);
    const ratio = vitals && p.id === 'hp' ? Math.max(0, Math.min(1, vitals.hpRatio)) : 1;
    row.append(ico, el('span', 'gr-stat-k', p.label), el('span', `gr-stat-v${vital ? ' gr-stat-cur' : ''}`, vital ? `${Math.round(p.value * ratio)} / ${fmtPanel(p)}` : fmtPanel(p)));
    // tavan dolu: fazlası kaybolur (Ömer 2026-10-13, itemcaps m1)
    if (p.capped) {
      row.classList.add('capped');
      const cap = el('span', 'gr-stat-cap', 'max');
      cap.title = 'Capped: extra from items is wasted';
      row.append(cap);
    }
    const dText = dv ? `${dv > 0 ? '+' : ''}${fmtPanel({ value: dv, fmt: p.fmt })}` : '';
    row.append(el('span', `gr-stat-d ${dv ? (dv > 0 ? 'up' : 'down') : ''}`, dText));
    if (dv) {
      row.dataset['delta'] = dText;
      row.dataset['dir'] = dv > 0 ? 'up' : 'down';
    }
    // Temel stat satırı: − / + (puan dağıtımı; kural izin vermiyorsa + kapalı). Puan ekranında iki düğme yuvası HER ZAMAN yer kaplar
    // (kullanılamayan düğme görünmez ama yerinde durur): +, −, Reset, Confirm satırları kaydırmaz (Ömer 2026-10-18)
    const attr = ATTR_IDS.find((k) => k === p.id);
    if (attr && v.level) {
      const lv = v.level;
      const active = freePts > 0 || (pending[attr] ?? 0) > 0;
      if (active) row.dataset['attr'] = attr;
      const can = freePts > 0 && canAddPoint(hero.class, allocNow, attr);
      if (can) row.classList.add('can-add');
      const pm = el('span', 'gr-pm');
      const hide = (b: HTMLButtonElement): void => {
        b.disabled = true;
        b.tabIndex = -1;
        b.classList.add('gr-pm-off');
        b.setAttribute('aria-hidden', 'true');
      };
      const sub = el('button', 'gr-pm-b', '−');
      sub.type = 'button';
      if ((pending[attr] ?? 0) > 0) {
        sub.title = `Take back a point from ${p.label}`;
        sub.addEventListener('click', (e) => {
          e.stopPropagation();
          lv.onSub(attr);
        });
      } else hide(sub);
      const add = el('button', 'gr-pm-b', '+');
      add.type = 'button';
      if (freePts > 0) {
        add.disabled = !can;
        add.title = can ? `Add a point to ${p.label}` : 'A base stat can never exceed the sum of the other three';
        add.addEventListener('click', (e) => {
          e.stopPropagation();
          if (can) lv.onAdd(attr);
        });
      } else hide(add);
      pm.append(sub, add);
      row.append(pm);
    }
    if (vital) {
      const wrap = el('div', 'gr-vital');
      const bar = el('div', `bh-bar ${p.id} gr-vbar`);
      const fill = el('i');
      fill.style.width = `${Math.round(ratio * 100)}%`;
      bar.append(fill);
      wrap.append(row, bar);
      rowsById.set(p.id, wrap);
    } else rowsById.set(p.id, row);
  }
  const addGroup = (cls: string, ids: string[]): void => {
    const g = el('div', `gr-sgrp ${cls}`);
    for (const id of ids) {
      const r = rowsById.get(id);
      if (r) g.append(r);
    }
    sg.append(g);
  };
  addGroup('vitals', VITAL_STATS);
  PANEL_GROUPS.forEach((ids, i) => addGroup(['base', 'attack', 'defense'][i] ?? '', ids));
  return sg;
}

/** Level bloğu + "Stats" + stat grupları + tavan notu; puan taşı sürüklemesi `host` üstünde. */
function sheetNodes(c: HeroCalc, v: CharacterView, host: HTMLElement, vitals?: { hpRatio: number }): HTMLElement[] {
  const out: HTMLElement[] = [levelBlock(c.hero, v.level, c.primaryLost), el('div', 'gr-sec', 'Stats'), statGroups(c, v, vitals)];
  if (v.level) {
    const lv = v.level;
    const h = c.hero;
    attachPointDrag(host, (k) => {
      if (c.freePts > 0 && canAddPoint(h.class, c.allocNow, k)) lv.onAdd(k);
    });
  }
  const extraCaps = cappedExtras(c.hero);
  if (extraCaps.length) out.push(el('div', 'gr-cap-note', `At max: ${extraCaps.join(' · ')}. Extra from items is wasted.`));
  return out;
}

/** Skill satırı (savaş HUD'ının skill çubuğuyla aynı bileşen; pasif ilk sırada). */
function skillsNode(hero: HoverHero, stats: Stats, after: Stats | null): HTMLElement {
  const sk = el('div', 'gr-skills');
  sk.append(el('div', 'gr-sec', 'Skills'));
  sk.append(skillBar(hero.class, stats, after));
  return sk;
}

/** Character sayfasının DOM'u (tüccarın Character sekmesi: kahraman kartları | yuvalar + statlar, altta skill'ler). */
export function renderCharacter(v: CharacterView): CharacterRender {
  const root = el('div', `gr-char${v.compact ? ' compact' : ''}`);
  const hero0 = v.heroes.find((h) => h.id === v.heroId) ?? v.heroes[0];
  root.append(heroCards(v, hero0?.id));
  if (!hero0) return { el: root, stats: null, after: null };
  const mid = el('div', 'gr-mid');
  if (v.hint) mid.append(el('div', 'gr-hint', v.hint));
  mid.append(...slotsBlock(hero0, v));
  const c = calcHero(v, hero0);
  mid.append(...sheetNodes(c, v, mid));
  root.append(mid);
  if (c.stats) root.append(skillsNode(c.hero, c.stats, c.after));
  return { el: root, stats: c.stats, after: c.after };
}

/**
 * Gear'ın sol sayfası (Ömer 2026-10-18, ortak envanter v3 "Ledger"): `hero` = sınıf başlığı + 7 yuva + skill satırı (pasif önce); `sheet` = level +
 * statlar (HP / MP çubuklu "93 / 150", stat satırı "36 +1 [−] [+]"). `el` sayfa içeriğinin kabıdır (puan taşı sürüklemesi burada dinlenir);
 * ekran bunu KALICI sayfa kabının içine koyar (kaydırma kabı yeniden kurulmaz).
 */
export function renderLedgerPage(v: CharacterView & { tab: 'hero' | 'sheet'; hpRatio?: number }): CharacterRender {
  const box = el('div', `gr-leaf gr-leaf-${v.tab}`);
  const hero0 = v.heroes.find((h) => h.id === v.heroId) ?? v.heroes[0];
  if (!hero0) return { el: box, stats: null, after: null };
  const c = calcHero(v, hero0);
  if (v.tab === 'hero') {
    if (v.hint) box.append(el('div', 'gr-hint', v.hint));
    box.append(...slotsBlock(hero0, v));
    if (c.stats) box.append(skillsNode(c.hero, c.stats, c.after));
  } else box.append(...sheetNodes(c, v, box, { hpRatio: v.hpRatio ?? 1 }));
  return { el: box, stats: c.stats, after: c.after };
}

/** Savaş HUD'ının ölçeği (1 oyun birimi kaç CSS pikseli: src/ui/viewport.ts > --gu): Gear'daki skill çubuğu savaştakiyle aynı boyda görünür. */
function hudScale(): number {
  if (typeof document === 'undefined') return 1;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gu'));
  return v > 0 ? v : 1;
}

const COLORS = layout.colors as unknown as { element: Record<string, string>; shield: string; magicShield: string; muted: string; text: string };
/** Tooltip satırı rengi: savaş skill tooltip'iyle aynı (element, kalkan, büyü kalkanı). */
const tipKindColor = (k: string | undefined): string | undefined => (k === 'shield' ? COLORS.shield : k === 'magicShield' ? COLORS.magicShield : k ? COLORS.element[k] : undefined);
/** Fark parantezleri ("(+6)" / "(-2)") yeşil / kırmızı (stat açıklamalarıyla aynı). */
const colorDiffs = (html: string): string => html.replace(/\(([+-])(\d+(?:\.\d+)?%?)\)/g, (_, sgn: string, n: string) => `<span class="gr-tip-d ${sgn === '+' ? 'up' : 'down'}">(${sgn}${n})</span>`);

/** Skill'in bedel / cooldown çipleri (savaş HUD'ının skillCostChips'iyle aynı; savaş durumu yok: hep hazır). */
function costChips(skill: SkillDef, stats: Stats): SkillCostChip[] {
  const out: SkillCostChip[] = [];
  const amount = skillCostAmount(skill.cost, { hp: stats.hp, mp: stats.mp, rage: 0 } as never);
  if (amount > 0 && skill.cost.resource === 'rage') out.push({ iconUrl: iconUrl(uiIconName('rage'), RAGE_COLOR), text: `RAGE ${amount}`, color: RAGE_COLOR });
  else if (amount > 0) {
    const kind = skill.cost.resource === 'mp' ? 'mp' : 'hp';
    out.push({ iconUrl: iconUrl(statIconName(kind), STAT_COLOR[kind]), text: String(amount) });
  }
  if ((skill.cooldown ?? 0) > 0) out.push({ iconUrl: iconUrl(uiIconName('cooldown'), UI_COLOR), text: String(skill.cooldown), color: COLORS.muted });
  return out;
}

/** Savaş skill tooltip'inin içeriği (aynı düzen: ikon + ad, bedel / bekleme, etiketler, alan şekli, satırlar) + Gear farkları "a → b (+d)". */
function skillTipContent(skill: SkillDef, stats: Stats, after: Stats | null): TipContent {
  const t = skillTip(skill, stats, after);
  // meta satırı savaşla aynı: bedel (Rage / MP / HP ikonuyla ya da "Free"), cooldown (kum saati)
  const meta: NonNullable<TipContent['meta']> = [];
  const amount = skillCostAmount(skill.cost, { hp: stats.hp, mp: stats.mp, rage: 0 } as never);
  if (amount > 0 && skill.cost.resource === 'rage') meta.push({ iconUrl: iconUrl(uiIconName('rage'), RAGE_COLOR), text: `RAGE ${amount}`, color: RAGE_COLOR });
  else if (amount > 0) {
    const kind = skill.cost.resource === 'mp' ? 'mp' : 'hp';
    meta.push({ iconUrl: iconUrl(statIconName(kind), STAT_COLOR[kind]), text: t.meta[0] ?? String(amount), color: COLORS.text });
  } else meta.push({ text: t.meta[0] ?? 'Free', color: COLORS.muted });
  if ((skill.cooldown ?? 0) > 0) meta.push({ iconUrl: iconUrl(uiIconName('cooldown'), UI_COLOR), text: `${skill.cooldown} turns`, color: COLORS.muted });
  const shape = skillMiniGrid(skill, content.formulas.formation);
  return {
    title: t.title,
    titleColor: COLORS.text,
    iconUrl: iconUrl(skillIconName(skill), skill.fx, ownerOfSkill(skill.id)),
    meta,
    tags: skillTags(skill).map((g) => ({ text: g.text, ...(g.color ? { color: g.color } : {}), ...(g.icon ? { iconUrl: iconUrl(g.icon, g.color ?? '#e8e2d0') } : {}) })),
    rows: t.rows.map((r) => ({ text: r.text, ...(tipKindColor(r.kind) ? { color: tipKindColor(r.kind)! } : {}) })),
    ...(shape ? { shape } : {}),
  };
}

/** Anahtar sayılar (hücrenin altında): "Damage 7 → 8 (+1)"; fark yeşil / kırmızı, sıfırsa gizli. */
function numsHtml(r: GearSkillRow): string {
  if (!r.numbers.length) return '';
  return `<div class="gr-sk-nums">${r.numbers
    .map((n) => {
      const c = kindColor(n.kind);
      const v = `<b${c ? ` style="color:${c}"` : ''}>${escHtml(n.text)}${n.times ? ` x${n.times}` : ''}</b>`;
      const d = n.after && n.diff ? ` <b class="${n.dir ?? ''}">→ ${escHtml(n.after)}</b> <span class="${n.dir ?? ''}">(${escHtml(n.diff)})</span>` : '';
      return `<div><i>${escHtml(n.label)}</i> ${v}${d}</div>`;
    })
    .join('')}</div>`;
}

/** Gear / Character sayfasının skill çubuğu: savaştaki hücreler (seçim / kısayol / devre dışı yok) + pasif madalyonu; tooltip hücrenin üstünde. */
export function skillBar(classId: string, stats: Stats, after: Stats | null): HTMLElement {
  const bar = el('div', 'bh-kit gr-skillbar');
  (bar.style as CSSStyleDeclaration & { zoom: string }).zoom = String(hudScale());
  const def = content.classes[classId];
  const rows = gearSkillRows(classId, stats, after);
  const skillRows = rows.filter((r) => !r.passive);
  const html = rows.map((r) => {
    if (r.passive && def?.passive) {
      const p = def.passive;
      const tip: TipContent = { title: p.name, titleColor: '#f3d999', iconUrl: iconUrl(p.icon || uiIconName('passive'), def.color, ownerOfUnit(classId)), badge: 'Passive', rows: passiveTip(p, stats, after).rows.map((x) => ({ text: x.text, color: COLORS.text })) };
      return passiveCellHtml(p.name, iconUrl(p.icon || uiIconName('passive'), def.color, ownerOfUnit(classId)), colorDiffs(tipHtml(tip)), numsHtml(r));
    }
    const skill = r.skill!;
    const view: SkillCellView = { id: skill.id, name: skill.name, iconUrl: iconUrl(skillIconName(skill), skill.fx, ownerOfSkill(skill.id)), cost: costChips(skill, stats), wait: 0, enabled: true, selected: false, ult: skillRows.indexOf(r) === 3 };
    return skillCellHtml(view, colorDiffs(tipHtml(skillTipContent(skill, stats, after))), numsHtml(r));
  });
  bar.innerHTML = html.join('');
  // Dokunmatik: dokunuş tooltip'i açar / kapatır (savaştaki uzun basmanın yerine; Gear'da skill seçilmez)
  bar.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.bh-sk');
    bar.querySelectorAll('.bh-sk.tip').forEach((x) => x !== cell && x.classList.remove('tip'));
    cell?.classList.toggle('tip');
  });
  return bar;
}
