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
  instanceBaseLines,
  instanceIlvl,
  affixLines,
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
import { FALLEN_GEAR_TEXT, FALLEN_MARK, heroFallen, heroItemCount, heroItemLine, type HoverHero } from './gear-hover';
import { itemIcon } from './inventory';
import { slotIconUrl } from './slot-icons';
import { escHtml, type SkillCostChip } from './skill-bar';
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
  /** Düşmüş kahramanın kilitli yuvasına dokunuldu (açıklama toast'ı). */
  onLocked?: () => void;
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

/** Sheet'te tam stat adları (Ömer 2026-10-18, stats-panels A · Band): kısaltma yok; ipuçları `data-stat` kimliğiyle aynı kalır. */
const FULL_NAME: Record<string, string> = {
  hp: 'HP', mp: 'MP', str: 'Strength', dex: 'Dexterity', int: 'Intelligence', luck: 'Luck', damage: 'Damage', crit: 'Crit chance', critMult: 'Crit damage',
  accuracy: 'Accuracy', spd: 'Speed', armor: 'Armor', magicArmor: 'Magic armor', evasion: 'Evasion', hpRegen: 'HP regen', mpRegen: 'MP regen', block: 'Block',
};

/**
 * Level bloğu (Ömer 2026-10-18, Sheet A · Band): "LEVEL 3" altın başlık + XP değeri sağda, ince altın çerçeveli XP çubuğu; altında yeşil
 * "N skill points saved" çipi ve (puan ekranında) elmas madalyonlu stat puanı satırı + Reset / Confirm. Madalyon sürüklenebilir (fare + dokunma):
 * bir stat satırına bırakılınca ya da satırdaki + ile o stata bir puan gider (bekleyen; Confirm yazar). Kural (temel stat diğer üçünün toplamını
 * aşamaz) + düğmesini kapatır ve satırı bırakma hedefi yapmaz. Puan satırı puan yokken de görünmez olarak yer tutar (altı kaymaz).
 */
function levelBlock(hero: HoverHero, lv: LevelPanel | undefined, primaryLost: string | null): HTMLElement[] {
  const level = hero.level ?? 1;
  const need = xpToNext(level);
  const xp = hero.xp ?? 0;
  const head = el('div', 'sh-head');
  const lt = el('span', 'sh-lt', 'Level ');
  lt.append(el('b', '', String(level)));
  const xpv = el('span', 'sh-xpv', need > 0 ? `${xp} ` : 'Max level');
  if (need > 0) xpv.append(el('s', '', `/ ${need} XP`));
  head.append(lt, xpv);
  const bar = el('div', 'sh-bar sh-xp');
  const fill = el('i');
  fill.style.width = `${need > 0 ? Math.min(100, Math.round((xp / need) * 100)) : 100}%`;
  bar.append(fill);
  const out: HTMLElement[] = [head, bar];
  const pend = lv ? pendingCount(lv.pending) : 0;
  const free = (hero.statPoints ?? 0) - pend;
  const sp = hero.skillPoints ?? 0;
  if (sp > 0 || lv) {
    const under = el('div', 'sh-under');
    if (lv) {
      const idle = free <= 0 && pend <= 0;
      const row = el('span', `sh-ptr${idle ? ' idle' : ''}`);
      if (idle) row.setAttribute('aria-hidden', 'true');
      const medal = el('span', `sh-medal${free > 0 ? '' : ' empty'}`);
      medal.append(el('span', '', String(free)));
      medal.title = 'Drag onto a stat, or tap + next to it';
      if (free > 0) medal.dataset['ptdrag'] = '1';
      row.append(medal, el('span', 'sh-tx', free > 0 ? `stat point${free === 1 ? '' : 's'} to spend` : 'All points placed'));
      if (pend > 0) {
        const acts = el('span', 'sh-acts');
        const reset = el('button', 'sh-btn', 'Reset');
        reset.type = 'button';
        reset.addEventListener('click', lv.onReset);
        const ok = el('button', 'sh-btn primary', 'Confirm');
        ok.type = 'button';
        ok.addEventListener('click', lv.onConfirm);
        acts.append(reset, ok);
        row.append(acts);
      }
      under.append(row);
    }
    // skill puanı çipi sağda / arkada (Ömer 2026-10-18: stat puanı satırı ile yer değişti)
    if (sp > 0) {
      const chip = el('span', 'sh-chip');
      chip.append(el('b', '', String(sp)), document.createTextNode(` skill point${sp === 1 ? '' : 's'} saved for the skill trees`));
      under.append(chip);
    }
    out.push(under);
  }
  if (lv && pend > 0 && primaryLost) out.push(el('div', 'sh-warn', primaryLost));
  return out;
}

/** Puan taşının sürüklenmesi (fare + dokunma): bırakma hedefi `.sh-row[data-attr].can-add`; hayalet imleci izler. */
function attachPointDrag(root: HTMLElement, onDrop: (k: Attribute) => void): void {
  root.addEventListener('pointerdown', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-ptdrag]');
    if (!chip) return;
    e.preventDefault();
    e.stopPropagation();
    const ghost = el('div', 'gr-pts-ghost', '+1');
    document.body.append(ghost);
    const targets = [...root.querySelectorAll<HTMLElement>('.sh-row.can-add')];
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
  /** Gear defteri: skill bloğu sayfanın içinde DEĞİL ayrı döner; ekran onu yer imi sütununun altına da uzayan tam genişlikte bir alana koyar. */
  skills?: HTMLElement;
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
    const card = el('button', `gr-hero${h.id === heroId ? ' on' : ''}${heroFallen(h) ? ' fallen' : ''}`);
    card.type = 'button';
    card.dataset['drop'] = `hero:${h.id}`;
    card.addEventListener('click', () => v.onHero(h.id));
    const face = el('div', 'gr-face');
    const url = avatarUrl(h.class);
    if (url) face.style.backgroundImage = `url("${url}")`;
    const meta = el('div', 'gr-hero-meta');
    const line = heroItemLine(h, v.focus);
    const sub = el('div', `gr-hero-sub tone-${line.tone}`);
    if (heroFallen(h)) sub.append(el('span', 'gr-fallen-txt', FALLEN_MARK));
    else
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
    const dead = heroFallen(h);
    const b = el('button', `gr-mark${h.id === v.heroId ? ' on' : ''}${dead ? ' fallen' : ''}`);
    b.type = 'button';
    b.dataset['hero'] = h.id;
    b.dataset['drop'] = `hero:${h.id}`;
    const line = heroItemLine(h, v.focus);
    b.dataset['hint'] = className(h.class);
    b.dataset['hintSub'] = dead ? FALLEN_MARK : line.text;
    b.dataset['hintTone'] = dead ? 'no' : line.tone;
    // Hero band ipucu (Ömer 2026-10-18): portre madalyonu, Lv büyük değer, Items k/7 elmas sırası
    b.dataset['hintKind'] = 'Hero';
    b.dataset['hintLv'] = String(h.level);
    const cnt = heroItemCount(h);
    b.dataset['hintItems'] = `${cnt.filled}/${cnt.total}`;
    const portrait = avatarUrl(h.class);
    if (portrait) b.dataset['hintImg'] = portrait;
    b.setAttribute('aria-label', className(h.class));
    b.addEventListener('click', () => v.onHero(h.id));
    const face = el('div', 'gr-face');
    const url = avatarUrl(h.class);
    if (url) face.style.backgroundImage = `url("${url}")`;
    b.append(face);
    if (dead) b.append(el('span', 'gr-fallen-x', '✝'));
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

/** Kilit simgesi (düşmüş kahramanın yuvalarında). */
function lockIcon(): HTMLElement {
  const s = el('span', 'gr-lock');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1.5" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  return s;
}

/** "Fallen" şeridi + tek kural metni (Hero ve Sheet sayfalarının başında; düşmüş kahramanda). */
function fallenBanner(hero: HoverHero): HTMLElement | null {
  if (!heroFallen(hero)) return null;
  const b = el('div', 'gr-fallen-banner');
  b.append(el('span', 'gr-fallen-x in', '✝'), el('span', 'gr-fallen-b-t', FALLEN_MARK), el('span', 'gr-fallen-b-s', FALLEN_GEAR_TEXT));
  return b;
}

/** Yuva plakası etiketleri (Ömer 2026-10-18, Gear > Hero "A · iki sütun satır plakaları"). */
const PLATE_LABEL: Record<string, string> = { weapon: 'Weapon', offhand: 'Offhand', helm: 'Head', armor: 'Chest', gloves: 'Hands', boots: 'Feet', trinket: 'Ring' };

const fmtNum = (n: number): string => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

/** "+4 Armor" -> sayı altın: "<b>+4</b> Armor" (ilk sayı kümesi). */
function goldNumber(parent: HTMLElement, text: string): void {
  const m = /^(.*?)([+-]?\d[\d.,]*%?)(.*)$/.exec(text);
  if (!m) {
    parent.append(text);
    return;
  }
  parent.append(m[1] ?? '', el('b', '', m[2]), m[3] ?? '');
}

/** Plakanın ana stat satırı: silah gücü / blok / örtük stat (armor...). Gerçek veri: progression/item-text.ts > instanceBaseLines. */
function plateMain(inst: ItemInstance): HTMLElement | null {
  const b = instanceBaseLines(inst);
  const row = el('span', 'gp-main');
  if (b.power !== undefined) row.append('Power ', el('b', '', fmtNum(b.power)));
  else if (b.block !== undefined) row.append('Block ', el('b', '', `${fmtNum(b.block)}%`));
  else if (b.implicit) goldNumber(row, b.implicit.text);
  else return null;
  return row;
}

/** Plakanın üst etiketi: yuva ikonu + yuva adı. */
function plateLabel(k: SlotId): HTMLElement {
  const lbl = el('div', 'gp-lbl');
  const lurl = slotIconUrl(k);
  if (lurl) {
    const li = el('img');
    li.src = lurl;
    li.alt = '';
    li.draggable = false;
    lbl.append(li);
  }
  lbl.append(PLATE_LABEL[k] ?? slotDef(k).name);
  return lbl;
}

/** Plakanın ikinci satırı: ana stat + iL + en çok 2 affix. */
function plateL2(inst: ItemInstance, heroClass: string | undefined): HTMLElement {
  const l2 = el('div', 'gp-l2');
  const main = plateMain(inst);
  if (main) l2.append(main);
  const il = el('span', 'gp-il', 'iL ');
  il.append(el('b', '', String(instanceIlvl(inst))));
  l2.append(il);
  for (const a of affixLines(inst, heroClass).slice(0, 2)) l2.append(el('span', 'gp-aff', a.text));
  return l2;
}

/**
 * Gear > Hero item plakası, yuva dışında kullanım için (tüccar malları / geri alım): AYNI DOM ve sınıflar (gear-plates.css).
 * Sürükle / ipucu / seçim bağları çağırana aittir (data-tip, data-drag); `extra` plakanın sağ kenarına eklenir (ör. fiyat).
 */
export function itemPlate(inst: ItemInstance, heroClass: string | undefined, extra?: HTMLElement): HTMLButtonElement {
  const d = itemDef(inst.id);
  const k = (d?.slot ?? 'weapon') as SlotId;
  const cell = el('button', `gr-slot gr-plate gr-slot-${k}`);
  cell.type = 'button';
  cell.style.setProperty('--rc', instanceColor(inst));
  cell.dataset['item'] = inst.id;
  const ico = el('span', 'gp-ico');
  ico.append(itemIcon(inst, k, 1.3));
  const txt = el('div', 'gr-slot-text gp-tx');
  txt.append(plateLabel(k), el('div', 'gr-slot-name', d ? d.name : inst.id), plateL2(inst, heroClass));
  cell.append(ico, txt);
  if (extra) cell.append(extra);
  return cell;
}

/** Sınıf başlığı (sınıf çipi + kullanılabilir silah ailesi çipleri) + 7 yuva plakası. */
function slotsBlock(hero: HoverHero, v: CharacterView): HTMLElement[] {
  const head = el('div', 'gr-sec gr-class-sec');
  head.append(el('span', 'gp-chip cls', className(hero.class)));
  for (const fid of classWeaponFamilies(hero.class)) {
    const f = ITEMS.weaponFamilies.find((x) => x.id === fid);
    if (!f) continue;
    const chip = el('span', 'gp-chip');
    const url = slotIconUrl(/shield/i.test(f.name) ? 'offhand' : 'weapon');
    if (url) {
      const i = el('img');
      i.src = url;
      i.alt = '';
      i.draggable = false;
      chip.append(i);
    }
    chip.append(f.name);
    head.append(chip);
  }
  const slots = el('div', 'gr-slots');
  const dead = heroFallen(hero);
  if (dead) slots.classList.add('gr-slots-locked');
  const blocker = offhandBlocker(hero.equipment);
  for (const k of SLOT_IDS) {
    const inst = hero.equipment[k];
    const d = inst ? itemDef(inst.id) : undefined;
    // İkinci el (2026-10-12): çift el / yay / tılsım takılıyken kapalı görünür (bırakılırsa planEquip açık mesaj verir)
    const blocked = k === 'offhand' && !inst && !!blocker;
    const cell = el('button', `gr-slot gr-plate${inst ? '' : ' empty'}${blocked ? ' blocked' : ''} gr-slot-${k}`);
    cell.type = 'button';
    cell.style.setProperty('--rc', inst && d ? instanceColor(inst) : '#5b4a33');
    const lbl = plateLabel(k);
    const txt = el('div', 'gr-slot-text gp-tx');
    const ico = el('span', 'gp-ico');
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
        ico.append(ghost);
      } else ico.append(emptySlotIcon(k));
      txt.append(lbl, el('div', 'gr-slot-name', 'Empty'), el('div', `gr-slot-sub${two ? ' gr-hands-hint' : ''}`, two ? '2H' : 'Hands full'));
      cell.append(ico, txt);
      slots.append(cell);
      continue;
    }
    if (dead) {
      // Düşmüş: yuva kilitli (sürüklenmez, bırakma hedefi değil, çift tık çıkarmaz); item ipucu yine açılır
      cell.classList.add('locked');
      if (inst) cell.dataset['tip'] = `slot:${k}`;
      cell.addEventListener('click', () => v.onLocked?.());
    } else {
      cell.dataset['drop'] = `slot:${k}`;
      cell.append(el('span', 'gp-hint'));
      if (inst) {
        cell.dataset['drag'] = `slot:${k}`;
        cell.dataset['tip'] = `slot:${k}`;
        cell.addEventListener('dblclick', () => v.onSlotDouble?.(k));
      }
    }
    ico.append(inst ? itemIcon(inst, k, 1.3) : emptySlotIcon(k));
    txt.append(lbl, el('div', 'gr-slot-name', d ? d.name : 'Empty'));
    if (d && inst) {
      txt.append(plateL2(inst, hero.class));
    } else if (k === 'offhand' && !classUsesOffhand(hero.class)) txt.append(el('div', 'gr-slot-sub', 'No shield or dagger'));
    cell.append(ico);
    if (dead) cell.append(lockIcon());
    cell.append(txt);
    slots.append(cell);
  }
  return [head, slots];
}

/**
 * Stat grupları (Ömer 2026-10-18, Sheet A · Band): can + mana çubukları (ince altın çerçeve, değer sağda); altın elmas ayırıcı; MAIN | ATTACK | DEFENSE
 * sütunları (savaş alt barıyla aynı sıra, src/game/stat-columns.ts). Satır: ikon · tam ad · altın rakam · fark (+1) · [+] [−]; primary stat turuncu.
 * `vitals` verilirse HP / MP değeri "93 / 150" (can oranı kahramanın şu anki canı; mana hep dolu).
 */
function statGroups(c: HeroCalc, v: CharacterView, vitals?: { hpRatio: number }): HTMLElement[] {
  const { hero, pending, allocNow, freePts, diff } = c;
  const primary = c.stats?.primary;
  const rowsById = new Map<string, HTMLElement>();
  for (const p of heroPanel(hero)) {
    // Blok satırı yalnızca kalkanı olan (ya da kalkan takmayı deneyen) kahramanda (Ömer 2026-10-18)
    if (p.id === 'block' && !p.value && !diff.get(p.id)) continue;
    const name = FULL_NAME[p.id] ?? p.label;
    const dv = diff.get(p.id);
    const dText = dv ? `${dv > 0 ? '+' : ''}${fmtPanel({ value: dv, fmt: p.fmt })}` : '';
    const dEl = el('span', `sh-d ${dv ? (dv > 0 ? 'up' : 'down') : ''}`, dText);
    const ico = el('img', 'sh-ico');
    ico.src = statIconUrl(p.id);
    ico.alt = '';
    ico.draggable = false;
    if (VITAL_STATS.includes(p.id)) {
      const ratio = p.id === 'hp' ? Math.max(0, Math.min(1, vitals?.hpRatio ?? 1)) : 1;
      const box = el('div', `sh-bh ${p.id}`);
      box.dataset['stat'] = p.id;
      const top = el('div', 'sh-bh-top');
      const val = el('span', 'sh-bv', `${Math.round(p.value * ratio)} `);
      val.append(el('s', '', `/ ${fmtPanel(p)}`));
      top.append(ico, el('span', 'sh-bn', name), val, dEl);
      if (dv) {
        box.dataset['delta'] = dText;
        box.dataset['dir'] = dv > 0 ? 'up' : 'down';
      }
      const bar = el('div', 'sh-bar');
      const fill = el('i', p.id === 'hp' ? 'fhp' : 'fmp');
      fill.style.width = `${Math.round(ratio * 100)}%`;
      bar.append(fill);
      box.append(top, bar);
      rowsById.set(p.id, box);
      continue;
    }
    const row = el('div', `sh-row${p.id === primary ? (c.stats?.primaryActive ? ' p' : ' p off') : ''}`);
    row.dataset['stat'] = p.id;
    row.append(ico, el('span', 'sh-k', name), el('span', 'sh-n', fmtPanel(p)));
    // tavan dolu: fazlası kaybolur (Ömer 2026-10-13, itemcaps m1)
    if (p.capped) {
      row.classList.add('capped');
      const cap = el('span', 'sh-cap', 'max');
      cap.title = 'Capped: extra from items is wasted';
      row.append(cap);
    }
    row.append(dEl);
    if (dv) {
      row.dataset['delta'] = dText;
      row.dataset['dir'] = dv > 0 ? 'up' : 'down';
    }
    // Temel stat satırı: + / − (puan dağıtımı; kural izin vermiyorsa + kapalı). Puan ekranında iki düğme yuvası HER ZAMAN yer kaplar
    // (kullanılamayan düğme görünmez ama yerinde durur): +, −, Reset, Confirm satırları kaydırmaz (Ömer 2026-10-18)
    const attr = ATTR_IDS.find((k) => k === p.id);
    if (attr && v.level) {
      const lv = v.level;
      const active = freePts > 0 || (pending[attr] ?? 0) > 0;
      if (active) row.dataset['attr'] = attr;
      const can = freePts > 0 && canAddPoint(hero.class, allocNow, attr);
      if (can) row.classList.add('can-add');
      const pm = el('span', 'sh-pm');
      const hide = (b: HTMLButtonElement): void => {
        b.disabled = true;
        b.tabIndex = -1;
        b.classList.add('off');
        b.setAttribute('aria-hidden', 'true');
      };
      const sub = el('button', 'sh-pmb', '−');
      sub.type = 'button';
      if ((pending[attr] ?? 0) > 0) {
        sub.title = `Take back a point from ${name}`;
        sub.addEventListener('click', (e) => {
          e.stopPropagation();
          lv.onSub(attr);
        });
      } else hide(sub);
      const add = el('button', 'sh-pmb', '+');
      add.type = 'button';
      if (freePts > 0) {
        add.disabled = !can;
        add.title = can ? `Add a point to ${name}` : 'A base stat can never exceed the sum of the other three';
        add.addEventListener('click', (e) => {
          e.stopPropagation();
          if (can) lv.onAdd(attr);
        });
      } else hide(add);
      pm.append(add, sub); // + solda ve sabit, − sağında (Ömer 2026-10-18)
      row.append(pm);
    }
    rowsById.set(p.id, row);
  }
  const out: HTMLElement[] = [];
  const vit = el('div', 'sh-vit');
  for (const id of VITAL_STATS) {
    const r = rowsById.get(id);
    if (r) vit.append(r);
  }
  out.push(vit, el('div', 'sh-dv'));
  const cols = el('div', 'sh-cols');
  PANEL_GROUPS.forEach((ids, i) => {
    const g = el('div', `sh-col ${['base', 'attack', 'defense'][i] ?? ''}`);
    g.append(el('div', 'sh-sl', ['Main', 'Attack', 'Defense'][i] ?? ''));
    for (const id of ids) {
      const r = rowsById.get(id);
      if (r) g.append(r);
    }
    cols.append(g);
  });
  out.push(cols);
  return out;
}

/** Sheet: level bloğu + ayırıcı + çubuklar + MAIN / ATTACK / DEFENSE + tavan notu; puan taşı sürüklemesi `host` üstünde. Tek kap (`.sh`). */
function sheetNodes(c: HeroCalc, v: CharacterView, host: HTMLElement, vitals?: { hpRatio: number }): HTMLElement[] {
  const sh = el('div', 'sh');
  sh.append(...levelBlock(c.hero, v.level, c.primaryLost), el('div', 'sh-dv'), ...statGroups(c, v, vitals));
  if (v.level) {
    const lv = v.level;
    const h = c.hero;
    attachPointDrag(host, (k) => {
      if (c.freePts > 0 && canAddPoint(h.class, c.allocNow, k)) lv.onAdd(k);
    });
  }
  const extraCaps = cappedExtras(c.hero);
  if (extraCaps.length) sh.append(el('div', 'sh-capnote', `At max: ${extraCaps.join(' · ')}. Extra from items is wasted.`));
  return [sh];
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
  const fb = fallenBanner(hero0);
  if (fb) mid.append(fb);
  mid.append(...slotsBlock(hero0, v));
  const c = calcHero(v, hero0);
  mid.append(...sheetNodes(c, v, mid));
  root.append(mid);
  if (c.stats) root.append(skillsNode(c.hero, c.stats, c.after));
  return { el: root, stats: c.stats, after: c.after };
}

/**
 * Gear'ın sol sayfası (Ömer 2026-10-18, ortak envanter v3 "Ledger"): `hero` = sınıf başlığı + 7 yuva + skill satırı (pasif önce); `sheet` = level +
 * statlar (HP / MP çubuklu "93 / 150", stat satırı "36 +1 [+] [−]"). `el` sayfa içeriğinin kabıdır (puan taşı sürüklemesi burada dinlenir);
 * ekran bunu KALICI sayfa kabının içine koyar (kaydırma kabı yeniden kurulmaz).
 */
export function renderLedgerPage(v: CharacterView & { tab: 'hero' | 'sheet'; hpRatio?: number }): CharacterRender {
  const box = el('div', `gr-leaf gr-leaf-${v.tab}`);
  const hero0 = v.heroes.find((h) => h.id === v.heroId) ?? v.heroes[0];
  if (!hero0) return { el: box, stats: null, after: null };
  const c = calcHero(v, hero0);
  let skills: HTMLElement | undefined;
  const fb = fallenBanner(hero0);
  if (fb) box.append(fb);
  if (v.tab === 'hero') {
    if (v.hint) box.append(el('div', 'gr-hint', v.hint));
    box.append(...slotsBlock(hero0, v));
  } else box.append(...sheetNodes(c, v, box, { hpRatio: v.hpRatio ?? 1 }));
  // Skill bloğu Hero ve Sheet sekmelerinde aynı yerde (sayfanın altı, tam genişlik; Ömer 2026-10-18)
  if (c.stats) skills = skillsNode(c.hero, c.stats, c.after);
  return { el: box, stats: c.stats, after: c.after, ...(skills ? { skills } : {}) };
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
    kind: 'Skill',
    iconUrl: iconUrl(skillIconName(skill), skill.fx, ownerOfSkill(skill.id)),
    meta,
    tags: skillTags(skill).map((g) => ({ text: g.text, ...(g.color ? { color: g.color } : {}), ...(g.icon ? { iconUrl: iconUrl(g.icon, g.color ?? '#e8e2d0') } : {}) })),
    rows: t.rows.map((r) => ({ text: r.text, ...(tipKindColor(r.kind) ? { color: tipKindColor(r.kind)! } : {}) })),
    ...(shape ? { shape } : {}),
  };
}

/** Plakadaki değer satırları (A Plates): soluk etiket + altın rakam; item takılırsa "→ yeni (fark)" yeşil / kırmızı. */
function numsHtml(r: GearSkillRow): string {
  if (!r.numbers.length) return '';
  return `<div class="pl-sls">${r.numbers
    .map((n) => {
      const times = n.times ? ` x${n.times}` : '';
      // önizleme: ESKİ değer yerine YENİ değer vurgulu + küçük (fark); satır uzamaz, plaka yüksekliği değişmez (Ömer 2026-10-18)
      const body = n.after && n.diff
        ? `<span class="${n.dir ?? ''}">${escHtml(n.after)}${times}</span> <small class="${n.dir ?? ''}">(${escHtml(n.diff)})</small>`
        : `${escHtml(n.text)}${times}`;
      return `<div class="pl-sl"><span class="k" title="${escHtml(n.label)}">${escHtml(n.label)}</span><span class="n">${body}</span></div>`;
    })
    .join('')}</div>`;
}

/** Plakanın çipleri: bedel (MP / HP / Rage ikonlu) ya da Free + bekleme. */
function plateChips(cost: SkillCostChip[]): string {
  if (!cost.length) return '<span class="pl-chip free">Free</span>';
  return cost
    .map((c) => `<span class="pl-chip${c.text.startsWith('RAGE') ? ' rage' : ''}">${c.iconUrl ? `<img class="bh-ico" src="${escHtml(c.iconUrl)}" alt="" draggable="false">` : ''}${escHtml(c.text)}</span>`)
    .join('');
}

/** Bir skill / pasif plakası (A Plates). kind: '' | 'pas' | 'ult'. Gizli `.bh-sktip` kopyası üstüne gelince yüzen katmana konur. */
function plateHtml(kind: '' | 'pas' | 'ult', id: string, name: string, icon: string, chips: string, nums: string, tip: string): string {
  const tag = kind ? `<span class="pl-tag">${kind === 'pas' ? 'Passive' : 'Ultimate'}</span>` : '';
  return `<div class="gr-pl ${kind}" data-skill="${escHtml(id)}">${tag}<div class="pl-ico">${icon ? `<img class="bh-ico" src="${escHtml(icon)}" alt="" draggable="false">` : ''}</div>
    <div class="pl-nm">${escHtml(name)}</div><div class="pl-dv"></div><div class="pl-chips">${chips}</div>${nums || '<div class="pl-sls"></div>'}
    <div class="bh-sktip bh-panel bh-corners">${tip}</div></div>`;
}

let floatTip: HTMLElement | null = null;
let floatTipFor: HTMLElement | null = null;
function hideFloatTip(): void {
  floatTip?.remove();
  floatTip = null;
  floatTipFor = null;
}
/** Skill / pasif açıklamasını Gear örtüsünün üst katmanına koyar (hücrenin üstünde; sığmazsa altında; ekran kenarından taşmaz). */
function showFloatTip(bar: HTMLElement, cell: HTMLElement): void {
  const src = cell.querySelector<HTMLElement>('.bh-sktip');
  const host = bar.closest<HTMLElement>('.gr-overlay') ?? document.getElementById('ui-root');
  if (!src || !host) return;
  hideFloatTip();
  const wrap = el('div', 'bh-kit gr-sktip-fl');
  const tip = src.cloneNode(true) as HTMLElement;
  (tip.style as CSSStyleDeclaration & { zoom: string }).zoom = String(hudScale());
  wrap.append(tip);
  host.append(wrap);
  const hr = host.getBoundingClientRect();
  const cr = cell.getBoundingClientRect();
  const tr = wrap.getBoundingClientRect();
  const M = 6;
  let x = cr.left + cr.width / 2 - tr.width / 2 - hr.left;
  let y = cr.top - tr.height - 14 - hr.top;
  if (y < M) y = cr.bottom + 14 - hr.top;
  x = Math.max(M, Math.min(hr.width - tr.width - M, x));
  y = Math.max(M, Math.min(hr.height - tr.height - M, y));
  wrap.style.left = `${Math.round(x)}px`;
  wrap.style.top = `${Math.round(y)}px`;
  floatTip = wrap;
  floatTipFor = cell;
}

/** Gear / Character sayfasının skill çubuğu: savaştaki hücreler (seçim / kısayol / devre dışı yok) + pasif madalyonu; tooltip hücrenin üstünde. */
export function skillBar(classId: string, stats: Stats, after: Stats | null): HTMLElement {
  const bar = el('div', 'gr-skillbar');
  const def = content.classes[classId];
  const rows = gearSkillRows(classId, stats, after);
  const skillRows = rows.filter((r) => !r.passive);
  // Ulti: veride ayrı bir işaret yok; savaş HUD'ıyla aynı kural: 4. skill yuvası (battle-hud / SkillCellView.ult).
  const html = rows.map((r) => {
    if (r.passive && def?.passive) {
      const p = def.passive;
      const ico = iconUrl(p.icon || uiIconName('passive'), def.color, ownerOfUnit(classId));
      const tip: TipContent = { title: p.name, titleColor: '#f3d999', iconUrl: ico, badge: 'Passive', rows: passiveTip(p, stats, after).rows.map((x) => ({ text: x.text, color: COLORS.text })) };
      return plateHtml('pas', 'passive', p.name, ico, '', numsHtml(r), colorDiffs(tipHtml(tip)));
    }
    const skill = r.skill!;
    return plateHtml(skillRows.indexOf(r) === 3 ? 'ult' : '', skill.id, skill.name, iconUrl(skillIconName(skill), skill.fx, ownerOfSkill(skill.id)), plateChips(costChips(skill, stats)), numsHtml(r), colorDiffs(tipHtml(skillTipContent(skill, stats, after))));
  });
  bar.innerHTML = html.join('');
  // Açıklama kabın (kaydırmalı sayfa) içinde değil, ekranın en üst katmanında (Gear örtüsü) açılır: hiçbir kap kırpamaz, ekran içinde kalır.
  // Hücrenin kendi `.bh-sktip` kopyası gizlidir (gear.css); üstüne gelince / dokununca kopya yüzen katmana konur.
  bar.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.gr-pl');
    if (cell) showFloatTip(bar, cell);
  });
  bar.addEventListener('pointerout', (e) => {
    if (e.pointerType === 'touch') return;
    const into = e.relatedTarget instanceof Element ? e.relatedTarget : null;
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.gr-pl');
    if (cell && !(into && cell.contains(into))) hideFloatTip();
  });
  // Dokunmatik: dokunuş açıklamayı açar / kapatır (savaştaki uzun basmanın yerine; Gear'da skill seçilmez)
  bar.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.gr-pl');
    const open = floatTipFor === cell;
    hideFloatTip();
    if (cell && !open) showFloatTip(bar, cell);
  });
  hideFloatTip(); // yeniden çizimde eski açıklama asılı kalmasın
  return bar;
}
