/**
 * CHARACTER sayfası (Ömer 2026-10-11, g1): kahraman listesi | 6 yuva + statlar, altta sol kenardan başlayan skill satırı. Gear'da Inventory'nin
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
  canEquip,
  classWeaponFamilies,
  equipDiff,
  fmtPanel,
  heroPanel,
  heroStats,
  instanceColor,
  instanceSummary,
  itemDef,
  slotDef,
  type ItemInstance,
  type SlotId,
} from '../progression';
import { wikiFiles } from '../wiki/files';
import { statIconUrl } from './stat-tips';
import { bindIcon } from './dom-icons';
import { uiIconName } from './ui-icons';
import { gearSkillRows, type GearSkillRow, type GearSkillTip } from './gear-skills';
import { ELEMENT_COLOR, skillTags } from './skill-tags';
import { ownerOfSkill, ownerOfUnit } from '../game/asset-versions';
import layout from '../../data/battle-layout.json';
import { heroItemLine, type HoverHero } from './gear-hover';
import { itemIcon } from './inventory';

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

/** Skill / pasif ikonu (savaş HUD'ı ve Codex'le aynı kaynak; sürüme canlı bağlı: dom-icons > bindIcon). */
function skillIcon(r: { skill?: { id: string; icon: string; fx: string }; passive?: boolean }, classId: string, cls: string): HTMLImageElement {
  const img = el('img', cls);
  img.alt = '';
  img.draggable = false;
  const p = content.classes[classId]?.passive;
  if (r.skill) bindIcon(img, r.skill.icon, r.skill.fx, ownerOfSkill(r.skill.id));
  else bindIcon(img, p?.icon || uiIconName('passive'), content.classes[classId]?.color ?? '#e8c47e', ownerOfUnit(classId));
  return img;
}

/** Skill kartı: ikon + ad + bedel / bekleme, altında anahtar sayılar ("Damage 24"; karşılaştırmada "24 → 30 (+6)"). Satırlar sarılmaz (kayma yok). */
function skillCard(r: GearSkillRow, classId: string): HTMLElement {
  const card = el('div', `gr-skill${r.passive ? ' passive' : ''}`);
  card.dataset['skill'] = r.id;
  const head = el('div', 'gr-skill-head');
  const title = el('div', 'gr-skill-title');
  title.append(el('div', 'gr-skill-name', r.name), el('div', 'gr-skill-meta', r.passive ? 'Passive' : [r.cost, r.cooldown ? `CD ${r.cooldown.replace(' turns', '')}` : ''].filter(Boolean).join(' · ')));
  head.append(skillIcon(r, classId, 'gr-skill-ico'), title);
  card.append(head);
  const nums = el('div', 'gr-skill-nums');
  for (const n of r.numbers) {
    const line = el('div', 'gr-skill-num');
    const v = el('span', 'gr-skill-v', n.text);
    const c = kindColor(n.kind);
    if (c) v.style.color = c;
    line.append(el('span', 'gr-skill-k', n.label), v);
    if (n.after && n.diff) line.append(el('span', `gr-skill-a ${n.dir ?? ''}`, `→ ${n.after}`), el('span', `gr-skill-d ${n.dir ?? ''}`, `(${n.diff})`));
    if (n.times) line.append(el('span', 'gr-skill-x', `x${n.times}`));
    nums.append(line);
  }
  if (!r.numbers.length) nums.append(el('div', 'gr-skill-num none', 'No stat scaling'));
  card.append(nums);
  return card;
}

/** Skill tooltip'inin içeriği (savaştaki kit tooltip'iyle aynı düzen: ikon + ad (+ rozet), bedel / bekleme, etiketler, etki satırları). */
export function skillTipNodes(t: GearSkillTip, skill: { id: string; icon: string; fx: string } | undefined, classId: string, line: (l: string, color?: string) => HTMLElement): HTMLElement[] {
  const head = el('div', 'gr-stip-head');
  head.append(skillIcon({ ...(skill ? { skill } : { passive: true }) }, classId, 'gr-stip-ico'), el('b', '', t.title));
  if (!skill) head.append(el('span', 'gr-stip-badge', t.badge));
  const out: HTMLElement[] = [head];
  if (t.meta.length) out.push(el('div', 'gr-stip-meta', t.meta.join(' · ')));
  const def = skill ? content.skills[skill.id] : undefined;
  if (def) {
    const tags = el('div', 'gr-stip-tags');
    skillTags(def).forEach((g, i) => {
      if (i) tags.append(document.createTextNode(' · '));
      const s = el('span', '', g.text);
      if (g.color) s.style.color = g.color;
      tags.append(s);
    });
    out.push(tags);
  }
  out.push(...t.rows.map((r) => line(r.text, kindColor(r.kind))));
  return out;
}

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
  for (const k of SLOT_IDS) {
    const inst = hero.equipment[k];
    const d = inst ? itemDef(inst.id) : undefined;
    const cell = el('button', `gr-slot${inst ? '' : ' empty'}`);
    cell.type = 'button';
    cell.style.setProperty('--rc', inst && d ? instanceColor(inst) : '#5b4a33');
    cell.dataset['drop'] = `slot:${k}`;
    if (inst) {
      cell.dataset['drag'] = `slot:${k}`;
      cell.dataset['tip'] = `slot:${k}`;
      cell.addEventListener('dblclick', () => v.onSlotDouble?.(k));
    }
    cell.append(itemIcon(inst, k, 1.3));
    const txt = el('div', 'gr-slot-text');
    txt.append(el('div', 'gr-slot-name', d ? d.name : slotDef(k).name), el('div', 'gr-slot-sub', d && inst ? instanceSummary(inst, hero.class) : 'Empty'));
    cell.append(txt);
    slots.append(cell);
  }
  mid.append(slots);
  const stats = heroStats(hero);
  const fd = v.focus ? itemDef(v.focus.id) : undefined;
  const usableFocus = v.focus && fd && canEquip(hero.class, fd) && hero.equipment[fd.slot]?.uid !== v.focus.uid ? v.focus : null;
  const diff = new Map((usableFocus ? equipDiff(hero, usableFocus) : []).map((x) => [x.id, x.delta]));
  const after = usableFocus && fd ? heroStats({ ...hero, equipment: { ...hero.equipment, [fd.slot]: usableFocus } }) : null;
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
    const dText = dv ? `${dv > 0 ? '+' : ''}${fmtPanel({ value: dv, fmt: p.fmt })}` : '';
    row.append(el('span', `gr-stat-d ${dv ? (dv > 0 ? 'up' : 'down') : ''}`, dText));
    if (dv) {
      row.dataset['delta'] = dText;
      row.dataset['dir'] = dv > 0 ? 'up' : 'down';
    }
    sg.append(row);
  }
  mid.append(el('div', 'gr-sec', 'Stats'), sg);
  root.append(mid);
  // --- skill'ler: kahraman sütununun altından, sol kenardan başlar
  if (stats) {
    const sk = el('div', 'gr-skills');
    sk.append(el('div', 'gr-sec', 'Skills'));
    const grid = el('div', 'gr-skill-grid');
    for (const r of gearSkillRows(hero.class, stats, after)) grid.append(skillCard(r, hero.class));
    sk.append(grid);
    root.append(sk);
  }
  return { el: root, stats, after };
}
