/**
 * CHARACTER sayfası (Ömer 2026-10-11, g1): kahraman listesi | 7 yuva (Weapon yanında Off-hand) + statlar, altta sol kenardan başlayan skill satırı. Gear'da Inventory'nin
 * yanında, tüccarda "Character" (C) ile malların üstünde açılır. "Usable by" ayrı blok değil: üstüne gelinen / seçili / sürüklenen item varken
 * her kahraman kartının alt satırı o kahramana etkisini gösterir (src/ui/gear-hover.ts); statlar ve skill sayıları seçili kahraman için
 * "önce → sonra" (src/ui/gear-skills.ts, skill-info ile aynı sayılar). Yalnızca çizer; dokunuşlar geri çağrılarla, sürükleme / ipuçları ekranın
 * denetçisinde (`data-drop`, `data-drag`, `data-tip`, `data-stat`, `data-skill`). Görünüm: src/ui/gear.css. Oyun içi metinler İngilizce.
 */
import { content } from '../engine';
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
} from '../progression';
import { wikiFiles } from '../wiki/files';
import { statIconUrl } from './stat-tips';
import { uiIconName } from './ui-icons';
import { gearSkillRows, type GearSkillRow } from './gear-skills';
import { ELEMENT_COLOR, skillTags } from './skill-tags';
import { ownerOfSkill, ownerOfUnit } from '../game/asset-versions';
import layout from '../../data/battle-layout.json';
import { heroItemLine, type HoverHero } from './gear-hover';
import { itemIcon } from './inventory';
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
}

export interface CharacterRender {
  el: HTMLElement;
  /** Seçili kahramanın statları ve odak item takılırsa statları (stat / skill ipuçları için). */
  stats: Stats | null;
  after: Stats | null;
}

/** Character sayfasının DOM'u. */
export function renderCharacter(v: CharacterView): CharacterRender {
  const root = el('div', `gr-char${v.compact ? ' compact' : ''}`);
  const hero = v.heroes.find((h) => h.id === v.heroId) ?? v.heroes[0];
  // --- kahramanlar (sığmazsa kayar; skill satırının üstüne kadar uzanır)
  const list = el('div', 'gr-heroes');
  for (const h of v.heroes) {
    const card = el('button', `gr-hero${hero && h.id === hero.id ? ' on' : ''}`);
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
  root.append(list);
  if (!hero) return { el: root, stats: null, after: null };
  // --- yuvalar + statlar
  const mid = el('div', 'gr-mid');
  if (v.hint) mid.append(el('div', 'gr-hint', v.hint));
  mid.append(el('div', 'gr-sec', `${className(hero.class)} · ${classWeaponFamilies(hero.class).map((f) => ITEMS.weaponFamilies.find((x) => x.id === f)?.name).join(' / ')}`));
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
      } else cell.append(itemIcon(undefined, k, 1.3));
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
    cell.append(itemIcon(inst, k, 1.3));
    const txt = el('div', 'gr-slot-text');
    // kuşanılmış yuva: yalnızca ikon + ad (nadirlik renginde); özellikler üstüne gelince / dokununca ipucunda (Ömer 2026-10-11). Boş: ad + "Empty"
    txt.append(el('div', 'gr-slot-name', d ? d.name : slotDef(k).name));
    if (!(d && inst)) txt.append(el('div', 'gr-slot-sub', k === 'offhand' && !classUsesOffhand(hero.class) ? 'No shield or dagger' : 'Empty'));
    cell.append(txt);
    slots.append(cell);
  }
  mid.append(slots);
  const stats = heroStats(hero);
  const fd = v.focus ? itemDef(v.focus.id) : undefined;
  const focusSlot = fd ? defaultEquipSlot(hero.equipment, fd) : undefined;
  const usableFocus = v.focus && fd && focusSlot && !isPlanError(planEquip(hero.class, hero.equipment, v.focus, focusSlot)) && hero.equipment[focusSlot]?.uid !== v.focus.uid ? v.focus : null;
  const diff = new Map((usableFocus ? equipDiff(hero, usableFocus, focusSlot) : []).map((x) => [x.id, x.delta]));
  const after = usableFocus && focusSlot ? heroStats({ ...hero, equipment: equipInto(hero.equipment, usableFocus, focusSlot).equipment as typeof hero.equipment }) : null;
  const sg = el('div', 'gr-stats');
  for (const p of heroPanel(hero)) {
    const row = el('div', 'gr-stat');
    row.dataset['stat'] = p.id;
    const dv = diff.get(p.id);
    const ico = el('img', 'gr-sico');
    ico.src = statIconUrl(p.id);
    ico.alt = '';
    ico.draggable = false;
    row.append(ico, el('span', 'gr-stat-k', p.label), el('span', 'gr-stat-v', fmtPanel(p)));
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
    sg.append(row);
  }
  mid.append(el('div', 'gr-sec', 'Stats'), sg);
  const extraCaps = cappedExtras(hero);
  if (extraCaps.length) mid.append(el('div', 'gr-cap-note', `At max: ${extraCaps.join(' · ')}. Extra from items is wasted.`));
  root.append(mid);
  // --- skill'ler: savaş HUD'ının skill çubuğuyla AYNI bileşen (src/ui/skill-bar.ts; Ömer 2026-10-11 "evrensel"); sol kenardan başlar
  if (stats) {
    const sk = el('div', 'gr-skills');
    sk.append(el('div', 'gr-sec', 'Skills'));
    sk.append(skillBar(hero.class, stats, after));
    root.append(sk);
  }
  return { el: root, stats, after };
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
    iconUrl: iconUrl(skill.icon, skill.fx, ownerOfSkill(skill.id)),
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
  const html = rows.map((r, i) => {
    if (r.passive && def?.passive) {
      const p = def.passive;
      const tip: TipContent = { title: p.name, titleColor: '#f3d999', iconUrl: iconUrl(p.icon || uiIconName('passive'), def.color, ownerOfUnit(classId)), badge: 'Passive', rows: passiveTip(p, stats, after).rows.map((x) => ({ text: x.text, color: COLORS.text })) };
      return passiveCellHtml(p.name, iconUrl(p.icon || uiIconName('passive'), def.color, ownerOfUnit(classId)), colorDiffs(tipHtml(tip)), numsHtml(r));
    }
    const skill = r.skill!;
    const view: SkillCellView = { id: skill.id, name: skill.name, iconUrl: iconUrl(skill.icon, skill.fx, ownerOfSkill(skill.id)), cost: costChips(skill, stats), wait: 0, enabled: true, selected: false, ult: i === 3 };
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
