/**
 * WIKI kataloğu (oyun içi sağ üst kitap simgesi): class'lar, çağrılar, skill'ler, stat/mekanik metinleri, durumlar, zeminler ve
 * elementler. Saf TypeScript: Phaser'a ve DOM'a bağımlı DEĞİL (testlenebilir). Her şey veriden / motordan türetilir
 * (data/*.json, formulas.json, skill-info.ts, stat-info.ts); sayılar elle yazılmaz. Yeni class/skill/durum/zemin eklenince wiki kendiliğinden güncellenir.
 * Elle yazılan tek şey, mekanik açıklamalarının CÜMLELERİdir (şablon): yeni mekanik/özel kural/pasif eklenince
 * Mechanics bölümündeki ilgili metin güncel mi kontrol edilmelidir (CLAUDE.md kuralı).
 */
import { valorClearWounds } from '../progression/wounds';
import { statName } from '../ui/stat-name';
import { paintedOr } from '../ui/misc-icons';
import { sortByPrimary } from '../game/class-order';
import campaignConfig from '../../data/campaign/campaign.json';
import campaignMap from '../../data/campaign/valdoria.json';
import drownedReachMap from '../../data/campaign/drowned-reach.json';
import hollowCrownMap from '../../data/campaign/hollow-crown.json';
import { ENCOUNTERS, EVENTS, SALVAGE_DIVE, WAYSHRINES } from '../campaign/data';
import { QUEST_LIST, questBonusLine } from '../campaign/quests';
import { maps23On } from '../ui/maps23-flag';
import { PITS } from '../campaign/pit';
import { OATHS, OATH_DATA, oathMinusText, oathPlusText } from '../campaign/oath';
import { SURGE, surgeResetPrice, taintHpLossPct } from '../campaign/surge';
import itemsJson from '../../data/items.json';
import { affixMidText, effectLine, fillValues } from '../progression/item-text';
import { ITEMS as ITEM_DATA, TIER_IDS, partBonusForm, type BonusForm, affixDef, gripOf, GRIP_NAME, implicitValues, isTwoHandMelee, levelRequirement, weaponPowerOf, WEAPON_TYPES, type Grip } from '../progression/items';
import { dropChances } from '../progression/drop';
import { RARE } from '../progression/rare';
import endlessJson from '../../data/endless.json';
import levelsJson from '../../data/levels.json';
import { BATTLE_SPEEDS } from '../ui/battle-speed';
import layout from '../../data/battle-layout.json';
import { applySummonVariant, content, describeGlobalSkill, describePassive, describeRage, describeSkill, describeStat, skillCostLabel, TARGET_TEXT } from '../engine';
import { TARGET_BADGE } from '../engine/skill-info';
import { isUnblockableSkill, UNBLOCKABLE_LABEL } from '../engine/unblockable';
import { isAccuracyCritDebuff } from '../engine/cc-immunity';
import { statusStackMode } from '../engine/status-stack';
import type { Attribute, CombatantDef, Element, Formulas, SkillDef, StatKind, Stats } from '../engine';
import { primaryBonusInfo, primaryBonusLines } from '../engine/stat-info';
import { ADDITIVE_LABEL, MULT_PASSIVES, moreText, multText } from '../engine/bonus-text';
import { ADDITIVE, AFFIX_ADD } from '../engine/stats';
import { buildGrounds, buildStatuses, isTestSkill, skillOwner, searchText, avatarMap, groupByDir } from '../gallery/catalog';
import type { GroundEntry, Owner, StatusEntry } from '../gallery/catalog';
import { STAT_COLOR, STAT_LABEL, statIconName } from '../ui/stat-icons';
import { shapeMiniGrid, skillMiniGrid } from '../ui/shape-diagram';
import { LESSONS, lessonCodexText } from '../tutorial/lessons';
import type { MiniShape } from '../ui/shape-diagram';

/** Valor diriltmesinin sildiği yara (data/valor.json > revive.clearWounds; Ömer 2026-10-20). */
const VCW = valorClearWounds();
const f: Formulas = content.formulas;
const pct = (v: number, digits = 0): string => `${(v * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
const num = (v: number): string => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));
/** Demirci ayarları (campaign.json > blacksmith; TUR 1 madde 7). */
const SMITH_CFG = (campaignConfig as unknown as { blacksmith: { ilvlPerChapter: number; temper: { legendaryMult: number; stones?: number; highStones?: number; highAbove?: number }; reforge: { growth: number } } }).blacksmith;
/** Devriye ödül yüzdeleri (yeniden oynama 1, 2, 3...; campaign.json > replay.xp; serbest dolaşım, campaign-dev): "60%", "40%", "25%". */
const REPLAY_PCTS = ((campaignConfig as unknown as { replay?: { xp: number[] } }).replay?.xp ?? [1]).slice(1).map((x) => pct(x));

// ---------------------------------------------------------------- tipler

export type WikiBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] };

/** Sabit şablonlu ama sayıları veriden gelen metin makalesi (Getting Started, Mechanics, Elements). */
export interface WikiArticle {
  id: string;
  title: string;
  /** Alt başlık grubu (Mechanics bölümünde). */
  group: string;
  icon: string;
  /** İkon bir sınıfın skill ikonuysa o sınıf (boyalı sürümü oradan gelir). */
  owner?: string;
  /** Boss / düşman ailesi makalesi: portre kimliği (spriteId) ve çözülmüş avatar adresi; yoksa `icon`. */
  avatarId?: string;
  avatarUrl?: string | null;
  accent: string;
  blocks: WikiBlock[];
  /** Küçük şekil şemaları (Area shapes makalesi): etiket + mini ızgara. */
  shapes?: Array<{ label: string; shape: MiniShape }>;
  /** Items and gear makalesi: yuvalar (Codex yuva siluetleri) ve nadirlik renkleri (data/items.json). */
  gear?: { slots: Array<{ id: string; name: string }>; rarities: Array<{ id: string; name: string; color: string }>; families?: Array<{ id: string; name: string }> };
  /** Legendary items makalesi: boyalı ikon ızgarası (assets/items/<id>.webp; Ömer 2026-10-11). */
  legendaries?: Array<{ id: string; name: string; slot: string; color: string }>;
  search: string;
}

/** Codex çapraz bağlantısı için kısa skill kaydı (ikon + sahibi). */
export interface WikiSkillRef {
  id: string;
  name: string;
  icon: string;
  ownerId: string;
}

export interface WikiSkill {
  id: string;
  name: string;
  icon: string;
  accent: string;
  owner: Owner;
  target: string;
  targetBadge: string;
  targetText: string;
  /** Skill'in vurduğu/etkilediği elementler (hasar ya da yer etkisi); hiçbiri yoksa boş. */
  elements: Element[];
  cost: string;
  /** Menzil etiketi ('Range 6' / 'Global'; menzil sistemi kapalı ya da hedef seçimi yoksa boş; savaş ipucuyla aynı: skill-tags.ts). */
  rangeLabel: string;
  cooldown: string;
  initialCooldown: string;
  /** Sahibinin `skills` dizisindeki yuva (1-4, düğme/tuş sırası); sahibi yoksa null. */
  slot: number | null;
  /** Melee (motion melee) | Ranged | Support (dost hedefli) | Self (yalnızca kendine). */
  range: SkillRange;
  lines: string[];
  kinds: Array<string | undefined>;
  /** AOE şekil skill'inde küçük şekil şeması (kapsanan hücreler + anchor); diğerlerinde yok. */
  shape?: MiniShape;
  /** Skill'in uyguladığı durumlar (statuses.json id; Codex durum çipleri) ve bıraktığı zeminler (grounds.json id). */
  statuses: string[];
  grounds: string[];
  search: string;
}

// Menzil / element etiketleri savaş HUD'ı ve takım seçimiyle ortak (src/ui/skill-tags.ts): Codex de aynı kuralı gösterir
import { elementIcon, skillElements, skillRange, skillTags, type SkillRange } from '../ui/skill-tags';
import { passiveIconName } from '../ui/mob-icons';
export { elementIcon, skillElements, skillRange, type SkillRange };

export interface WikiStatRow {
  key: string;
  label: string;
  icon: string;
  color: string;
  value: string;
  /** Çok hâlli değerin açıklaması (ceset tüketen çağrı: 'fed / unfed'); değerin altında küçük yazılır. */
  sub?: string;
}

export interface WikiUnit {
  id: string;
  kind: 'class' | 'summon';
  /** Test class'ı (ör. Geometer): rastgele takımlara girmez; wiki 'TEST' etiketi gösterir. */
  testOnly: boolean;
  name: string;
  role: string;
  color: string;
  logo: string;
  spriteUrl: string | null;
  avatarUrl: string | null;
  melee: boolean;
  primary: Attribute | null;
  primaryBonus: { name: string; detail: string; text: string } | null;
  attributes: Array<{ key: Attribute; label: string; value: number; primary: boolean; icon: string; color: string }>;
  derived: WikiStatRow[];
  passive: { name: string; icon: string; text: string } | null;
  skills: WikiSkill[];
  search: string;
}

export interface WikiElement {
  id: string;
  name: string;
  color: string;
  /** Bu elementi kullanan skill adları. */
  skills: string[];
  /** Aynı skill'ler, ikon ve sahibiyle (Codex bağlantıları). */
  skillRefs: WikiSkillRef[];
  /** Element ikonu (yüzen hasar yazısındaki ikonla aynı: float-text.ts > ELEMENT_ICON; fiziksel: kılıç). */
  icon: string;
  /** "Undead takes x1.5 damage" gibi satırlar. */
  weakTo: Array<{ tag: string; mult: number; units: string[] }>;
  search: string;
}

export interface WikiStatus {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  icon: string;
  color: string;
  text: string;
  usedBy: string[];
  /** Bu durumu uygulayan skill'ler (ikon + sahibi; skill tarafındaki `statuses` ile aynı kural: skillStatusIds). */
  usedBySkills: WikiSkillRef[];
  /** Bu durumu uygulayan item'ler (Legendary etkileri; ör. Burning, Fleet). */
  usedByItems: string[];
  search: string;
}

export interface WikiGround extends Omit<GroundEntry, 'usedBy'> {
  usedBy: string[];
  usedBySkills: WikiSkillRef[];
  text: string;
  search: string;
}

export interface WikiCatalog {
  gettingStarted: WikiArticle[];
  /** Mentor dersleri (sefer tutorial'ı; TÜMÜ: Codex yalnızca görülenleri gösterir, src/wiki/view.ts). */
  lessons: WikiArticle[];
  classes: WikiUnit[];
  summons: WikiUnit[];
  skills: WikiSkill[];
  mechanics: WikiArticle[];
  statuses: WikiStatus[];
  grounds: WikiGround[];
  elements: WikiElement[];
  elementTable: { head: string[]; rows: string[][] };
}

/** Wiki'nin kullandığı görsel dosyaları (id -> url); sayfada `import.meta.glob`, testte fs. */
export interface WikiFiles {
  sprites: Record<string, string>;
  avatars: Record<string, string>;
}

// ---------------------------------------------------------------- skill'ler

// test skill'leri (Geometer shape_*, Pose Tester pt_*) Codex'te yok: yalnızca debug menüsünde (src/gallery/catalog.ts > isTestSkill)
const allSkills = (): SkillDef[] => Object.entries(content.skills).map(([id, s]) => ({ ...s, id: s.id ?? id })).filter((s) => !isTestSkill(s.id) && !s.retired); // emekli skill (Mana Barrier, 2026-10-29) Codex'te yok
const unitDefs = (): Record<string, CombatantDef> => ({ ...content.classes, ...content.summons, ...content.bosses, ...content.mobs });
const effectDefs = () => ({ statuses: content.statuses, grounds: content.grounds, skills: content.skills });

/** Skill'in sahibine ait stat (açıklamadaki "(123)" gibi hesaplanmış sayılar için); sahibi yoksa ilk class. */
function statsFor(skill: SkillDef): Stats {
  const owner = skillOwner(skill.id);
  const def = unitDefs()[owner.id] ?? Object.values(content.classes)[0]!;
  return def.stats;
}

/** Skill'in uyguladığı durum id'leri (status, dot, omen, randomStatus, detonate; Dark Bond -> dark_bond); yalnızca statuses.json'da olanlar. */
export function skillStatusIds(skill: SkillDef): string[] {
  const out: string[] = [];
  for (const e of skill.effects) {
    if (e.type === 'status' || e.type === 'dot' || e.type === 'detonate') out.push(e.status);
    else if (e.type === 'omen') out.push(e.status ?? 'omen');
    else if (e.type === 'randomStatus') out.push(...e.options.map((o) => o.status));
    else if (e.type === 'bond') out.push('dark_bond');
  }
  return [...new Set(out)].filter((id) => !!content.statuses[id]);
}

/** Skill'in bıraktığı zemin id'leri. */
export function skillGroundIds(skill: SkillDef): string[] {
  return [...new Set(skill.effects.flatMap((e) => (e.type === 'ground' ? [e.ground] : [])))].filter((id) => !!content.grounds[id]);
}

const skillRefOf = (s: SkillDef): WikiSkillRef => ({ id: s.id, name: s.name, icon: s.icon, ownerId: skillOwner(s.id).id });




function slotOf(skillId: string, owner: Owner): number | null {
  const def = unitDefs()[owner.id];
  const i = def ? def.skills.indexOf(skillId) : -1;
  return i >= 0 ? i + 1 : null;
}

export function buildSkill(skill: SkillDef): WikiSkill {
  const owner = skillOwner(skill.id);
  const def = unitDefs()[owner.id];
  const info = describeSkill(skill, statsFor(skill), f, unitDefs(), effectDefs(), def?.range);
  const elements = skillElements(skill);
  return {
    id: skill.id,
    name: skill.name,
    icon: skill.icon,
    accent: skill.fx || def?.color || '#e8c47e',
    owner,
    target: skill.target,
    targetBadge: info.targetBadge,
    targetText: info.target,
    elements,
    cost: info.cost,
    rangeLabel: skillTags(skill, def?.range).find((t) => t.kind === 'range')?.text ?? '',
    cooldown: info.cooldown,
    initialCooldown: info.initialCooldown,
    slot: slotOf(skill.id, owner),
    range: skillRange(skill),
    lines: info.lines,
    kinds: info.kinds,
    ...(wikiMiniGrid(skill) ? { shape: wikiMiniGrid(skill)! } : {}),
    statuses: skillStatusIds(skill),
    grounds: skillGroundIds(skill),
    search: searchText(skill.name, owner.name, skillRange(skill), info.targetBadge, info.target, info.cost, ...info.lines, ...elements, TARGET_BADGE[skill.target], TARGET_TEXT[skill.target]),
  };
}

export function buildSkills(): WikiSkill[] {
  // Sahibe göre grupla; sahibin içinde 1-2-3-4 yuva sırası
  const list = allSkills().map(buildSkill);
  const ownerOrder = new Map<string, number>();
  list.forEach((s) => { if (!ownerOrder.has(s.owner.id)) ownerOrder.set(s.owner.id, ownerOrder.size); });
  return list.sort((a, b) => ownerOrder.get(a.owner.id)! - ownerOrder.get(b.owner.id)! || (a.slot ?? 99) - (b.slot ?? 99));
}

// ---------------------------------------------------------------- birimler (class + çağrı)

const ATTRS: Attribute[] = ['str', 'int', 'dex', 'luck'];

function buildUnit(kind: WikiUnit['kind'], def: CombatantDef, files: WikiFiles): WikiUnit {
  const st = def.stats;
  const sprite = groupByDir(files.sprites)[def.spriteId]?.find((s) => s.anim === 'idle')?.url ?? null;
  const avatar = avatarMap(files.avatars)[def.spriteId] ?? null;
  const row = (key: StatKind | 'mpRegen' | 'hpRegen', label: string, value: string, sub?: string): WikiStatRow => ({
    key,
    label,
    icon: statIconName(key),
    color: key === 'mpRegen' ? STAT_COLOR.mp : key === 'hpRegen' ? STAT_COLOR.hp : STAT_COLOR[key],
    value,
    ...(sub ? { sub } : {}),
  });
  // Ceset tüketen çağrının iki hâli (Skeleton): beslenmiş (taban) ve beslenmemiş can/STR (stats.ts > applySummonVariant)
  const unfed = def.variants ? applySummonVariant(def, 'unfed', content.formulas).stats : null;
  const fed = def.variants ? applySummonVariant(def, 'fed', content.formulas).stats : null;
  const derived: WikiStatRow[] = [
    // Çok hâlli değer kısa yazılır (105 / 70), hâllerin adı altında küçük satırda: satır taşmaz, yan sütunla çakışmaz
    row('hp', 'HP', fed && unfed ? `${fed.hp} / ${unfed.hp}` : String(st.hp), fed && unfed ? 'empowered / unfed' : undefined),
    ...(fed && unfed ? [row('str', 'STR', `${num(fed.str)} / ${num(unfed.str)}`, 'empowered / unfed')] : []),
    row('mp', 'MP', String(st.mp)),
    row('spd', 'SPD', String(st.spd)),
    row('evasion', 'Evasion', pct(st.evasion)),
    row('accuracy', 'Accuracy', pct(st.accuracy)),
    row('critChance', 'Crit', pct(st.critChance, 1)),
    row('armor', 'Armor', num(st.armor)),
    row('magicArmor', 'Magic armor', num(st.magicArmor)),
    row('hpRegen', 'HP regen / turn', String(Math.round(st.hpRegen))),
    row('mpRegen', 'MP regen / turn', String(st.mpRegen)),
  ];
  const primary = def.primary ?? null;
  const bonus = primary ? primaryBonusInfo(primary, f, !!st.primaryActive) : null;
  const passive = def.passive ? { name: def.passive.name, icon: passiveIconName(def.passive), text: describePassive(def.passive, st, f) } : null;
  const skills = def.skills.flatMap((id) => (content.skills[id] ? [buildSkill({ ...content.skills[id]!, id })] : []));
  const bonusText = primary ? primaryBonusLines(primary, f).join(' ') : '';
  return {
    id: def.id,
    kind,
    testOnly: !!def.testOnly,
    name: def.name,
    role: def.role ?? (kind === 'summon' ? 'Summon' : ''),
    color: def.color,
    logo: def.logo,
    spriteUrl: sprite,
    avatarUrl: avatar,
    melee: content.skills[def.skills[0] ?? '']?.motion === 'melee',
    primary,
    primaryBonus: primary && bonus ? { name: bonus.name, detail: bonus.detail, text: bonusText } : null,
    attributes: ATTRS.map((a) => ({ key: a, label: STAT_LABEL[a], value: def.attributes[a] ?? 0, primary: a === primary, icon: statIconName(a), color: STAT_COLOR[a] })),
    derived,
    passive,
    skills,
    search: searchText(def.name, def.role, kind, bonus?.name, bonusText, passive?.name, passive?.text, ...skills.map((s) => `${s.name} ${s.search}`), ...(def.tags ?? [])),
  };
}

export function buildClasses(files: WikiFiles): WikiUnit[] {
  // Order: primary stat STR - DEX - INT - LUCK, alphabetical inside a group, test classes last (same rule as the team select shelf)
  return sortByPrimary(Object.values(content.classes).filter((d) => !d.hidden)).map((d) => buildUnit('class', d, files));
}

export function buildSummons(files: WikiFiles): WikiUnit[] {
  return Object.values(content.summons).map((d) => buildUnit('summon', d, files));
}

// ---------------------------------------------------------------- makaleler

const GOLD = '#e8c47e';
const ELEMENT_COLOR = layout.colors.element as Record<string, string>;
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Codex'e özel boyalı ikon (assets/misc-icons/codex); dosya yoksa eski kodla çizilen ikon. */
const cx = (id: string, fallback: string): string => paintedOr('codex', id, fallback);
/** Makale ikonu bir sınıfın skill ikonuysa onun boyalı sürümü o sınıftan gelir (Shared'de bu adın boyalısı yok). */
export const ARTICLE_ICON_OWNER: Readonly<Record<string, string>> = { backstab: 'cutthroat', opportunist: 'cutthroat', eye: 'hexer', echo: 'mage', treant: 'druid', ankh: 'paladin', manabarrier: 'mage', darkbond: 'undead', tremor2: 'defender', radiance: 'paladin', taunt2: 'defender', manaburn: 'antimage' };

function article(id: string, group: string, title: string, icon: string, blocks: WikiBlock[], accent = GOLD, shapes?: WikiArticle['shapes']): WikiArticle {
  const text = blocks.flatMap((b) => (b.kind === 'p' ? [b.text] : b.kind === 'list' ? b.items : [...b.head, ...b.rows.flat()]));
  const owner = ARTICLE_ICON_OWNER[icon];
  return { id, group, title, icon, accent, blocks, ...(owner ? { owner } : {}), ...(shapes?.length ? { shapes } : {}), search: searchText(title, group, ...text) };
}

/** Veride kullanılan her şekil için bir örnek şema (aynı rozetli skill'ler tek kez): etiket = rozet (Row, Column, Block 2x3, Cross). */
/** Area shapes makalesi: hangi skill hangi şekli kullanıyor (veriden; test class'ları hariç). */
/** Wiki şeması: alan skill'leri (area_enemies ve iki tahtaya atılabilen area_any / Smoke Bomb) şekil şeması taşır. */
function wikiMiniGrid(skill: SkillDef): MiniShape | null {
  return skillMiniGrid(skill, f.formation); // area_enemies and area_any (either side note)
}

/** Menzil makalesi (range.md, Ömer 2026-10-17): kural metni + sınıf menzilleri ve menzilsiz (Global) skill'ler veriden. */
function rangeArticle(): WikiArticle {
  const rows = f.formation.rows;
  const classes = Object.values(content.classes).filter((d) => !d.testOnly && !d.hidden);
  const globals = allSkills().filter((s) => s.global && skillOwner(s.id).kind !== 'mob').map((s) => s.name);
  const own = allSkills().filter((s) => s.range !== undefined && skillOwner(s.id).kind === 'class' && !content.classes[skillOwner(s.id).id]?.testOnly).map((s) => `${s.name} ${s.range}`);
  // dost skill'leri yalnızca kendi range'i varsa kısıtlanır (range.md: Guard 2); veriden
  const allyRanged = allSkills().filter((s) => s.range !== undefined && (s.target === 'single_ally' || s.target === 'dead_ally') && skillOwner(s.id).kind === 'class' && !content.classes[skillOwner(s.id).id]?.testOnly).map((s) => `${s.name} reaches allies up to ${s.range} rows away`);
  return article('range', 'Basics', 'Range', 'ui:range', [
    p(`Every skill has a range. The distance to a target is: how many rows deep you stand on your own side (front row 0, back row ${rows - 1}), plus how deep the target stands behind the first row of its own side that still has someone in it, plus 1. Front row to front row is 1; back row to back row is ${2 * (rows - 1) + 1}.`),
    p('Empty rows on your own side count: standing further back costs range. Empty rows in front of the enemy do not count: an enemy cannot escape melee by leaving its front row empty, the next filled row becomes its front.'),
    p('A skill shows its range on its card ("Range 4"). Skills of the same class share the class range unless the card says otherwise; skills that fall from the sky or hit everyone have no range ("Global").'),
    p(allyRanged.length ? `Healing and support skills reach any ally, except: ${allyRanged.join(', ')} (counted in rows between you and the ally).` : 'Healing and support skills reach any ally.'),
    p('Area skills only need the cell you aim at to be in range; the area itself may reach further. A taunting enemy only forces your attack if it is in range; otherwise you may hit anyone else you can reach. When no target is in range the skill is greyed out: Move closer or pick another skill. The enemy does the same: it steps into range and keeps fragile units out of yours.'),
    list(...classes.map((d) => `${d.name}: range ${d.range ?? f.range?.default ?? 1}`)),
    ...(own.length ? [p(`Skills with their own range: ${own.join(', ')}.`)] : []),
    ...(globals.length ? [p(`Global skills (no range): ${globals.join(', ')}.`)] : []),
  ], '#e8c47e');
}

function areaSkillTable(): { head: string[]; rows: string[][] } {
  const waves: Record<string, string> = { row: 'row by row', column: 'lane by lane', distance: 'outward from the anchor' };
  const rows = allSkills()
    .filter((s) => (s.target === 'area_enemies' || s.target === 'area_any') && s.area && !content.classes[skillOwner(s.id).id]?.testOnly && skillOwner(s.id).kind !== 'mob') // mob skill'leri Enemies makalelerinde
    .map((s) => {
      const info = describeSkill(s, statsFor(s), f, unitDefs(), effectDefs());
      const w = s.area!.stages ? `${waves[s.area!.stages]}${s.area!.reverse ? ' (reversed)' : ''}` : '-';
      return [s.name, skillOwner(s.id).name, info.targetBadge, w];
    })
    .sort((a, b) => a[1]!.localeCompare(b[1]!) || a[0]!.localeCompare(b[0]!));
  return { head: ['Skill', 'Class', 'Shape', 'Waves'], rows };
}

function shapeExamples(): NonNullable<WikiArticle['shapes']> {
  const seen = new Map<string, MiniShape>();
  for (const s of allSkills()) {
    const shape = shapeMiniGrid(s.area, f.formation);
    const badge = shape ? describeSkill(s, statsFor(s), f, unitDefs(), effectDefs()).targetBadge : '';
    if (shape && !seen.has(badge)) seen.set(badge, shape);
  }
  return [...seen].map(([label, shape]) => ({ label, shape }));
}
const p = (text: string): WikiBlock => ({ kind: 'p', text });
const list = (...items: string[]): WikiBlock => ({ kind: 'list', items });

const teamSize = (): number => content.battles[content.DEFAULT_BATTLE]?.random?.size ?? 5;

export function buildGettingStarted(): WikiArticle[] {
  const a = f.attributes;
  const rows = f.formation.rows;
  const lanes = f.formation.lanes;
  const pool = content.battles[content.DEFAULT_BATTLE]?.random?.pool.length ?? Object.keys(content.classes).length;
  return [
    article('goal', 'Basics', 'The goal', cx('gs_goal', 'sword'), [
      p(`Pick a team of ${teamSize()} different classes (${pool} classes to choose from) and fight an enemy team that is picked the same way. Teams do not have to be this size: a side can field anywhere from 1 to ${f.formation.rows * f.formation.lanes} units. Defeat every enemy unit to win; if your whole team falls, you lose.`),
      p('You control your own team; the enemy team is played by the computer. Pick a skill, then pick its target (hover a target to preview the expected result).'),
    ]),
    article('turns', 'Basics', 'Turn order and the SPD counter', cx('gs_turns', 'hourglass'), [
      p(`Every unit has a SPD (speed) stat: ${num(a.spdBase)} + ${num(a.spdPerDex)} per point of Dexterity. On top of that, every unit has its own natural pace: its final speed is up to ${num(Math.round((a.spdVariance ?? 0) * 100))}% faster or slower (a hero keeps the same pace for good; the Speed tooltip shows it). Each tick, every unit's action counter fills by its SPD; the first one to reach ${f.turn.threshold} acts, then its counter restarts.`),
      p(`Faster units therefore act more often, not just first. The bar at the top shows the next ${f.turn.queueLength} units in order, and it updates live when speed changes (for example Haste or Slow).`),
      p('A stunned unit skips its next turn. Status durations count down on the turns of the unit that carries them.'),
      p(debuffStackingText()),
      p(turnTimingText()),
    ]),
    article('formation', 'Basics', 'Formation and rows', 'ui:formation', [
      p(`Each side stands on a ${rows} x ${lanes} grid: ${rows} rows deep and ${lanes} lanes wide (${rows * lanes} cells). A normal team of ${teamSize()} leaves cells empty; a side of ${rows * lanes} fills the whole grid. Empty cells matter: a unit can step onto one with the Move action (see Actions in the Mechanics section).`),
      ...(f.range?.enabled
        ? [p('Every skill has a range (see Range in the Basics section): melee skills reach only the front, bows and spells reach deeper. Standing further back keeps you safer but costs you range.')]
        : [p(`Melee skills can only reach the first ${f.formation.meleeRows === 1 ? 'occupied row' : `${f.formation.meleeRows} occupied rows`} of the enemy team, so the units in front shield the ones behind them. Ranged and magic skills reach anyone. Some melee skills say they charge or reach further; their description tells you.`)]),
      p(
        f.range?.enabled
          ? 'Automatic formations (Randomize, Auto arrange, random enemy waves) follow range: every unit starts where its main attack reaches the enemy front from the first turn. Melee fighters and taunting tanks stand in front, spearmen (range 2) just behind them, casters and Anti-Mage in the middle rows, the Mage behind them and the Archer at the very back. Fragile units keep behind sturdier ones, a Guard user stays close to the allies it can protect, and when the enemy has area skills the fragile units spread out instead of crowding one row or lane. Hand-placed campaign and boss formations never change.'
          : 'Melee classes are placed in front. A melee unit only stands in a back row once the rows before it are full, so fighters in front, archers and mages behind is the normal picture.',
      ),
      p('Area skills hit a group of cells around the cell you pick, in a fixed shape (a whole row, a whole column, a block or a cross; see Area shapes in the Mechanics section). You can pick an empty cell too, as long as the shape still covers an enemy.'),
    ]),
    ...(f.range?.enabled ? [rangeArticle()] : []),
    article('mana', 'Basics', 'MP and cooldowns', statIconName('mp'), [
      p(`Skills cost MP. Every unit has ${a.mpBase} base MP (the same for all classes) plus ${a.mpPerInt} per point of Intelligence. At the start of its own turn, every unit regains MP equal to Intelligence x ${num(a.mpRegenPerInt)} (rounded; 0 Intelligence regains nothing) and HP equal to Strength x ${num(a.hpRegenPerStr)}. The Rest action restores extra MP on demand.`),
      p('This regeneration shows on the bars, not as floating numbers: the HP or MP bar flashes briefly and a small faint "+1" or "+2 MP" appears next to it. The combat log lists it on its own line.'),
      p('Strong skills also have a cooldown: after you use one, you cannot use it again for that many of your own turns. The skill button shows the turns left.'),
      p(`Some powerful skills (usually the fourth one) start the battle on cooldown: they are not ready until the unit has taken up to ${f.cooldown.maxInitial} turns. The skill description says "Opens on cooldown" for these. Summoned units do not have this delay.`),
    ]),
    article('screen', 'Basics', 'Reading the screen', cx('gs_screen', 'info'), [
      list(
        'Hover a unit to see its stats; hover a skill to see its description and cost.',
        'Keys 1-4 pick the acting unit\'s skills.',
        'Right-click (mouse): on a unit, pins its info card; on empty space, cancels the selected skill, or closes pinned cards if nothing is selected. On an item in Gear, equips or unequips it, like a double-click.',
        'Menu (top right, or Esc) opens the Codex and Settings; the battle pauses while the Codex is open. On a phone, the corner-arrows button switches to full screen (on iPhone use Add to Home Screen); held upright, the game turns sideways to fill the screen.',
      ),
    ]),
  ];
}

/** stat-info.ts metnini "şu anki değer" kısımlarından arındırır (wiki genel kural anlatır, belirli bir birimi değil). */
export function stripNow(line: string): string {
  return line
    .replace(/\s*\(now [^)]*\)/g, '')
    .replace(/,\s*now [^)]*\)/g, ')')
    .replace(/\s*\((?:base [^)]*)\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const statTitle = (title: string): string => statName(title);

/** Genel stat açıklaması: motorun stat-info metinleri, ilk class'ın statlarıyla üretilir ve sayı içeren "şimdi" kısımları atılır. */
function statArticle(kind: StatKind, group: string, only?: number[]): WikiArticle {
  const sample = Object.values(content.classes)[0]!.stats;
  const info = describeStat(kind, { ...sample, primary: undefined, primaryActive: false }, f);
  const lines = info.lines.filter((_, i) => !only || only.includes(i)).map(stripNow);
  return article(`stat-${kind}`, group, statTitle(info.title), statIconName(kind), [list(...lines)], STAT_COLOR[kind]);
}

function bonusArticle(kind: Attribute): WikiArticle {
  const b = primaryBonusInfo(kind, f, true);
  const names: Record<Attribute, string> = { str: 'Strength', int: 'Intelligence', dex: 'Dexterity', luck: 'Luck' };
  const holders = Object.values(content.classes)
    .filter((c) => c.primary === kind)
    .map((c) => c.name);
  return article(`bonus-${kind}`, 'Primary bonuses', b.name, statIconName(kind), [
    p(`Primary stat: ${names[kind]}. ${b.detail}.`),
    ...primaryBonusLines(kind, f).map(p),
    p(`The bonus only works while the primary stat is also the unit's highest stat (a tie counts).${holders.length ? ` Primary ${STAT_LABEL[kind]} classes: ${holders.join(', ')}.` : ''}`),
  ], STAT_COLOR[kind]);
}

function betLines(): Array<{ skill: WikiSkill; text: string }> {
  const out: Array<{ skill: WikiSkill; text: string }> = [];
  for (const s of allSkills()) {
    if (!s.effects.some((e) => e.type === 'damage' && e.bet)) continue;
    const ws = buildSkill(s);
    for (const line of ws.lines) if (line.startsWith('Bet ')) out.push({ skill: ws, text: `${ws.name}: ${line}` });
  }
  return out;
}

function skillsWith(pred: (e: SkillDef['effects'][number]) => boolean): string[] {
  return [...new Set(allSkills().filter((s) => s.effects.some(pred)).map((s) => s.name))];
}

/**
 * "Silence" makalesi (madde 260; 2026-10-27 Ley Brand ile Drain Field'ın susturması ağaca taşındı): Silence durumu (blocksMpSkills) ve onu veren
 * skill'ler (durum etkisi + eski tür onEmpty zarı, hâlâ veride varsa). Sayılar veriden.
 */
function silenceArticle(): WikiArticle {
  const sil = Object.values(content.statuses).find((d) => d.blocksMpSkills);
  const silId = Object.keys(content.statuses).find((k) => content.statuses[k]?.blocksMpSkills) ?? 'silence';
  const name = sil?.name ?? 'Silenced';
  const lines = allSkills().flatMap((s) =>
    s.effects
      .filter((e): e is Extract<typeof e, { type: 'manaBurn' }> => e.type === 'manaBurn' && !!e.onEmpty)
      .map((e) => {
        const em = e.onEmpty!;
        const st = content.statuses[em.status]?.name ?? em.status;
        const burn = e.pctMax !== undefined ? `${pct(e.pctMax)} of each enemy's max MP` : `${e.amount ?? 0} MP`;
        return `${s.name}: burns ${burn}. Every enemy left with 0 MP (or already at 0) rolls on its own: ${pct(em.chance)} chance to be ${st} for ${em.turns} turn${em.turns > 1 ? 's' : ''}${em.damage ? ` and take ${pct(em.damage.power)} ${em.damage.scale.toUpperCase()} ${em.damage.element ?? 'physical'} damage (it cannot miss, but it can crit)` : ''}.`;
      }),
  );
  const direct = skillsWith((e) => e.type === 'status' && e.status === silId);
  if (direct.length) lines.push(`${name} straight from a skill: ${direct.join(', ')}.`);
  const brand = allSkills().find((s) => s.effects.some((e) => e.type === 'brand'));
  if (brand) lines.push(`${brand.name} itself no longer silences; an Anti-Mage skill tree node can make a Branded enemy whose mana reaches 0 ${name} (see Ley Brand).`);
  return article('silence', 'Special rules', 'Silence', sil?.icon ?? 'manaburn', [
    p(`${name}: the unit cannot use any skill that costs MP. Skills that cost nothing (a basic attack), skills paid with Rage or HP, and the actions Rest, Skip Turn and Move still work. A silenced unit with nothing else to do simply attacks for free or uses an action.`),
    p(`It lasts through the unit's next turn: the timer counts down when the silenced unit's turn ENDS (not when it starts), so a 1-turn ${name} covers the whole of its next turn. It is a debuff: a cleanse removes it, and Resilience cannot shorten a 1-turn debuff. The badge next to the HP bar shows it.`),
    list(...(lines.length ? lines : ['No skill silences yet.'])),
    p(`The AI values a silence by the move it takes away: the best MP skill the enemy could have paid for on that turn, compared with its best free move, times the chance; the extra damage counts as damage.`),
  ], sil?.color ?? '#9b59d0');
}

/** Ley Thread (Ömer 2026-10-29) satırı: Mana Steal'in bıraktığı iplik bir sonraki Ley Brand'i o birimde uzatır ve bedel yakımını katlar. Sayılar veriden. */
function threadLines(e: Extract<SkillDef['effects'][number], { type: 'brand' }>, name: string): string[] {
  if (!e.threadTurns && !(e.threadBurnMult && e.threadBurnMult !== 1)) return [];
  const steal = allSkills().find((s) => s.effects.some((x) => x.type === 'status' && x.status === 'ley_thread'));
  const st = steal?.effects.find((x) => x.type === 'status' && x.status === 'ley_thread');
  const th = content.statuses.ley_thread?.name ?? 'Ley Thread';
  const parts = [...(e.threadTurns ? [`lasts ${num(e.threadTurns)} turn${e.threadTurns > 1 ? 's' : ''} longer on it`] : []), ...(e.castBurnPct && e.threadBurnMult && e.threadBurnMult !== 1 ? [`its extra MP burn per cast is ${e.threadBurnMult === 2 ? 'doubled' : `x${num(e.threadBurnMult)}`}`] : [])];
  const from = steal && st && st.type === 'status' ? `${steal.name} leaves ${th} on the enemy it hits for ${num(st.turns)} turn${st.turns > 1 ? 's' : ''}. ` : '';
  return [`${from}If the next Brand lands on an enemy with ${th}, the ${name} Brand ${parts.join(' and ')}; the ${th} is used up. A Brand that leaps from it starts fresh.`];
}

/** "Ley Brand" makalesi (Anti-Mage, Ömer 2026-10-27, open-questions 444): tainted mana, bedel artışı, yakım hasarı, patlama. Sayılar veriden. */
function brandArticle(): WikiArticle | null {
  const sk = allSkills().find((s) => s.effects.some((e) => e.type === 'brand'));
  const e = sk?.effects.find((x) => x.type === 'brand');
  if (!sk || !e || e.type !== 'brand') return null;
  const st = content.statuses.branded;
  const name = st?.name ?? 'Branded';
  const el = e.element ?? 'arcane';
  return article('ley_brand', 'Special rules', 'Ley Brand and tainted mana', st?.icon ?? 'manaburn', [
    p(`${sk.name} (Anti-Mage) marks every enemy in its area as ${name} for ${e.turns} turns. It cannot miss, and bosses are Branded too: it is not a control effect.`),
    list(
      `An enemy with no mana of its own gains tainted mana equal to ${pct(e.taintPct)} of its max HP, starting full. It cannot spend it and gains no MP while it lasts; the pool vanishes when the Brand ends, is cleansed, or the unit dies. Its MP bar shows the pool in a faded purple.`,
      `An enemy that has mana pays ${pct(e.costMult - 1)} more MP for its skills while Branded (rounded up). It gets no tainted mana, even at 0 MP.`,
      `Mana burned or stolen from a ${name} enemy (Mana Steal, Spell Ward, other burns) also deals ${el} damage equal to ${pct(e.burnDamagePct)} of the mana lost. It cannot miss or crit; magic armor applies.`,
      ...(e.castBurnPct ? [`When a ${name} enemy uses a skill that costs MP, it loses extra MP equal to ${pct(e.castBurnPct)} of the (already higher) MP it paid, or all it has left. That mana counts as burned, so it also deals ${el} damage equal to ${pct(e.burnDamagePct)} of it, from the Anti-Mage who branded it.`] : []),
      ...(e.markDamagePct && e.markSkills?.length ? [`${e.markSkills.map((id) => content.skills[id]?.name ?? id).join(' and ')} deal ${pct(e.markDamagePct)} more damage to ${name} enemies.`] : []),
      // Ley Thread (Ömer 2026-10-29): Mana Steal'in ipliği; sayılar veriden
      ...threadLines(e, name),
      `When the Brand runs out on its own, leftover tainted mana bursts: ${el} damage equal to ${pct(e.explodePct)} of it, from the Anti-Mage who branded it (even if that Anti-Mage has fallen). A cleansed Brand does not burst.`,
      `Casting it again on a ${name} enemy refreshes the Brand but does not refill tainted mana. Void Strike counts missing tainted mana like missing mana.`,
    ),
  ], st?.color ?? '#7a3fb8');
}

/** "Bells" makalesi (Vesper, 2026-10-28; docs/design/classes/vesper.md): çan sayacı, Pealing Bells, Great Bell. Sayılar veriden. */
function bellsArticle(): WikiArticle | null {
  const owner = Object.values(content.classes).find((c) => !c.testOnly && c.passive?.effect.type === 'pealingBells');
  const pe = owner?.passive?.effect;
  if (!owner || pe?.type !== 'pealingBells') return null;
  const ringers = owner.skills.map((id) => content.skills[id]).filter((s): s is SkillDef => !!s?.ringsBell).map((s) => s.name);
  const bells = owner.skills.map((id) => content.skills[id]).filter((s): s is SkillDef => !!s?.effects.some((e) => e.type === 'damage' && e.bell)).map((s) => s.name);
  const great = owner.skills.map((id) => content.skills[id]).filter((s): s is SkillDef => !!s).flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'damage' }> => e.type === 'damage' && !!e.powerPerBell).map((e) => `${s.name}: ${pct(e.power)} ${e.scale.toUpperCase()} ${e.element ?? 'physical'} plus ${pct(e.powerPerBell!)} ${e.scale.toUpperCase()} for every bell rung this battle.`));
  return article('bells', 'Special rules', 'Bells', 'divine', [
    p(`${owner.name}: ${owner.passive!.name}. Every time the ${owner.name} uses ${ringers.join(' or ')}, a bell rings and the count goes up by one for the rest of the battle (waves included). There is no limit.`),
    list(
      `Each bell rung makes the ${owner.name}'s bells (${bells.join(', ')}) deal ${moreText(pe.perBell)} damage: ${moreText(pe.perBell * 5)} after 5 bells, ${moreText(pe.perBell * 10)} after 10.`,
      'The bell that rings counts only for the next ones: its own hit uses the count from before.',
      ...great,
    ),
  ], owner.color);
}

/** "Multiplayer" makalesi (multiplayer-dev; docs/design/multiplayer.md): lobi, takım seçimi, sıra, kopma kuralı (60 sn). */
function multiplayerArticle(): WikiArticle {
  return article('multiplayer', 'Basics', 'Multiplayer', cx('mech_multiplayer', 'team'), [
    p('Main Menu > Multiplayer plays a Quick Battle against a friend online. One player presses Host lobby and gets a 6-letter lobby code; the friend opens the game, presses Join lobby and types the code, or simply opens the invite link (Copy invite link).'),
    p('When both players press Ready, each picks a team of 4 for their own side: the host plays the left side, the guest the right side. The other team stays hidden until both are ready, then the battle starts the same way on both screens.'),
    p("In battle you only control your own units, on their turns; during the other player's turns the panel says Opponent's turn. Both games check every move, so a move that breaks the rules is refused."),
    p('If the connection drops, the battle pauses and a countdown runs. A player who comes back within 60 seconds (even after reloading the page) continues where the battle stopped; otherwise the player who stayed wins. Leaving the battle on purpose gives the win to the other player.'),
    p('After the battle: Rematch (both must agree; you pick teams again) or Back to lobby.'),
    p('You can set a short name in the lobby (Change name); only your opponent sees it. The random seed of each battle is made from a secret number of each player, so neither player can pick it. If a direct link between the two browsers is not possible, the game connects through the server instead.'),
  ]);
}

/** Debuff'ların yığılmaması (Ömer 2026-10-10): kural statuses.json > stack'ten; yığılan istisnalar (Omen) adıyla sayılır. */
/** Rage makalesi: hasar alınca Rage veren pasifler (Berserker rageOnHurt; veriden). */
function rageHurtLines(): WikiBlock[] {
  return Object.values(content.classes).filter((c) => !c.testOnly && c.passive?.effect.type === 'rage' && c.passive.effect.rageOnHurt).map((c) => {
    const r = (c.passive!.effect as Extract<NonNullable<CombatantDef['passive']>['effect'], { type: 'rage' }>).rageOnHurt!;
    return p(`${c.passive!.name} (${c.name}): losing HP gives Rage, ${num(r.perHpPercent)} per 1% of max HP lost${r.perHitCap !== undefined ? ` (at most ${r.perHitCap} per hit)` : ''}. Damage a shield absorbs, a hit Lucky Escape ignores and a killing blow give none.`);
  });
}

/** Rage makalesi: Rage'in tamamını harcayan, harcanan Rage ve hedefin eksik canıyla büyüyen skill'ler (Headsman's Blow; veriden). */
function rageSpendLines(): WikiBlock[] {
  return allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'damage' }> => e.type === 'damage' && (!!e.powerPerRage || !!e.executeBonus)).map((e) =>
    p(`${s.name}: ${s.cost.spendAll ? `spends ALL your Rage (at least ${s.cost.amount}); ` : ''}${e.powerPerRage ? `deals ${pct(e.power)} ${e.scale.toUpperCase()} plus ${pct(e.powerPerRage)} ${e.scale.toUpperCase()} for every Rage spent` : `deals ${pct(e.power)} ${e.scale.toUpperCase()}`}${e.executeBonus ? `, and up to ${moreText(e.executeBonus)} damage the more HP the target is missing (counted before the hit)` : ''}. Waiting for more Rage, or for a wounded target, makes it hit harder.`)));
}

function debuffStackingText(): string {
  const debuffs = Object.values(content.statuses).filter((d) => d.type === 'debuff');
  const stacking = debuffs.filter((d) => statusStackMode(d) === 'stack').map((d) => d.name);
  const replacing = debuffs.filter((d) => statusStackMode(d) === 'replace').map((d) => d.name);
  return `The same debuff never stacks: a unit carries at most one of each. Applying it again sets its duration to the longer of what is left and the new duration, and keeps only the strongest one (for damage over time, the bigger amount).${stacking.length ? ` Exception: ${stacking.join(', ')} stacks on purpose (see Curses).` : ''}${replacing.length ? ` ${replacing.join(', ')} is simply replaced by the new one.` : ''}`;
}

/** Turlar arası görsel bekleme ve Battle speed ayarı (battle-layout.json > animation.turnWait, src/ui/battle-speed.ts). */
function turnTimingText(): string {
  const w = layout.animation.turnWait;
  const lo = BATTLE_SPEEDS[0], hi = BATTLE_SPEEDS[BATTLE_SPEEDS.length - 1];
  return `Between turns the game shows time passing: every unit's speed bar fills at its own pace until the next one is full (a unit with ${w.refSpd} SPD fills from empty in ${num(w.fullMs / 1000)} seconds; one wait never takes longer than ${num(w.maxMs / 1000)} seconds). The unit whose turn it is glows and steps forward. Tap to skip the wait. Time never passes while you are choosing a move. Settings > Gameplay > Battle speed (${lo}x to ${hi}x) makes these waits shorter or longer; it changes only how fast the battle is shown, never the turn order.`;
}

/**
 * "Curses" makalesi (Hexer; docs/design/classes/hexer.md 8.7): Omen yığını, Doom, süre bitimi, Misfortune, Withering, Jinxed ve Ill Omen. Sayılar
 * data/statuses.json ve skill/pasif verisinden. Yığılan durum (maxStacks + doom) yoksa makale yok.
 */
function curseArticles(): WikiArticle[] {
  const entry = Object.entries(content.statuses).find(([, d]) => d.maxStacks && d.doom);
  if (!entry) return [];
  const [omenId, om] = entry;
  const doom = om.doom!;
  const max = om.maxStacks!;
  const dur = om.duration ?? 3;
  const crit = allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'omen' }> => e.type === 'omen' && (e.status ?? 'omen') === omenId)).find((e) => e.critStacks !== undefined && e.critStacks > e.stacks);
  const detonators = allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'detonate' }> => e.type === 'detonate' && e.status === omenId).map((e) => `${s.name} (${multText(e.mult)} power)`));
  const noTransfer = allSkills().filter((s) => s.effects.some((e) => e.type === 'detonate' && e.status === omenId && e.noTransferOnKill)).map((s) => s.name);
  const critDoomers = allSkills().filter((s) => s.effects.some((e) => e.type === 'omen' && (e.status ?? 'omen') === omenId && e.critDoomOnCrit)).map((s) => s.name);
  // Yalnızca skill'lerin uyguladığı lanet DoT'ları (Withering); item kaynaklı Burning bu makaleye girmez
  const dots = Object.entries(content.statuses).filter(([id, d]) => d.dot && allSkills().some((s) => s.effects.some((e) => e.type === 'dot' && e.status === id))).map(([, d]) => d);
  const jinx = Object.values(content.statuses).filter((d) => d.endsOnOwnAttack);
  const passives = Object.values(content.classes).filter((c) => c.passive?.effect.type === 'omenTransfer');
  const cursers = allSkills().filter((s) => s.effects.some((e) => e.type === 'omen')).map((s) => s.name);
  return [
    article('curses', 'Special rules', 'Curses: Omen, Doom, Withering', om.icon, [
      p(`Some attacks leave a ${om.name} on their target (${cursers.join(', ') || 'none yet'}). Omens stack up to ${max}${crit ? `; a critical curse leaves ${crit.critStacks}` : ''}. A curse that misses leaves nothing.`),
      list(...[
        om.refreshOnStack
          ? `Timer: the first Omen starts a ${dur}-turn timer (counted on the cursed unit's own turns). Every new Omen from a curse resets it to ${dur} turns; Omens passed on by Ill Omen do not.`
          : `Timer: the first Omen starts a ${dur}-turn timer (counted on the cursed unit's own turns). New Omens never renew or extend it.`,
        `Doom: when the ${max === 3 ? 'third' : `${max}th`} Omen lands, Doom strikes at once: ${pct(doom.powerPerStack)} of the curser's ${STAT_LABEL[doom.scale]} as ${doom.element} ${doom.damageType} damage for every Omen, then the Omens are spent. Doom cannot miss or be dodged, but it can crit (the curser's crit chance); armor of its kind, shields and Lucky Escape work as usual.`,
        `Timer runs out: the Omens do not fade quietly. At the start of the cursed unit's turn (after ground and Withering damage, before regeneration) they burst into Doom, one share per Omen${doom.expireMult !== 1 ? ` (with ${multText(doom.expireMult)} power)` : ''}, using the curser's Luck and crit chance from when the last Omen was added. If the unit dies earlier that turn, no Doom happens.`,
        'Guard: a Doom set off by a skill is part of that hit, so a guarding ally shares it. A Doom from a timer running out is a curse, not a skill hit: guard never takes any of it.',
        critDoomers.length > 0 ? `Critical Doom: a critical ${critDoomers.join(' or ')} that completes ${max} Omens makes the Doom a critical hit (no separate roll). Other curses roll Doom's crit as usual.` : '',
        `Misfortune: each Omen lowers the cursed unit's crit chance by ${pct(Math.abs(om.critDeltaPerStack ?? 0))} (never below 0%).${content.formulas.ccImmunity?.omenCrit ? ' Bosses ignore Misfortune (Omens and Doom still work on them).' : ''}`,
        detonators.length > 0 ? `Detonate: ${detonators.join(', ')} sets off Doom at once with every Omen on the target, however many there are, multiplied as shown; it does not also trigger a second Doom.` : '',
        noTransfer.length > 0 ? `${noTransfer.join(', ')} spends every Omen on the target, its own new Omen included. If its hit or its Doom kills the target, the Omens are gone: nothing passes on (Ill Omen does not trigger).` : '',
        'A curse outlives its caster: Omens and Withering keep running after the curser falls, and the timer Doom still bursts.',
        'Two cursers on the same side fill the same Omen stack.',
      ].filter((x) => x !== '')),
      ...(dots.length > 0
        ? [p(`${dots.map((d) => d.name).join(', ')}: the cursed unit takes ${dots.map((d) => d.dot!.element).join('/')} damage at the start of each of its own turns, right after ground effects. The amount is fixed when the curse lands; it cannot miss or crit, armor of its kind reduces it, and guard never takes it. Casting it again does not add a second curse: the duration becomes the longer of what is left and the new duration, and the stronger amount stays.`)]
        : []),
      ...(jinx.length > 0 ? [p(`${jinx.map((d) => `${d.name}: ${d.text}`).join('. ')}. It ends after the unit's next damaging skill (every hit of that skill is affected) or when its time runs out. Hits that are always critical stay critical.`)] : []),
      ...(passives.length > 0 ? [list(...passives.map((c) => `${c.name}, ${c.passive!.name}: ${describePassive(c.passive!, c.stats, f)}`))] : []),
    ], om.color),
  ];
}

/** Şifa zemini olan ve skill'le bırakılan zeminler (tepkimenin doğurduğu Holy Water hariç; o kendi makalesinde). */
function skillHealGrounds(): Array<{ name: string }> {
  const born = new Set(Object.values(content.groundReactions).map((r) => r.becomes?.ground));
  return Object.entries(content.grounds).filter(([id, g]) => g.heal && !born.has(id)).map(([, g]) => g);
}

/** Ground reactions tablosu: kurulum, tetik, sonuç, açıklama (either: iki sıra da yazılır). */
function groundReactionRows(): string[][] {
  const name = (ids: string[]) => ids.map((g) => content.grounds[g]?.name ?? g).join(' or ');
  return Object.values(content.groundReactions).map((r) => [r.either ? `${name(r.setup)} (or the other way round)` : name(r.setup), name(r.trigger), r.label, r.text]);
}

export function buildMechanics(): WikiArticle[] {
  const a = f.attributes;
  const k = f.armor.k;
  const out: WikiArticle[] = [];
  // Özellikler
  for (const kind of ['str', 'int', 'dex', 'luck'] as const) out.push(statArticle(kind, 'Attributes'));
  // Türetilmiş stat'lar
  out.push(statArticle('hp', 'Derived stats', [0]));
  out.push(statArticle('mp', 'Derived stats', [0]));
  out.push(statArticle('spd', 'Derived stats'));
  out.push(statArticle('critChance', 'Derived stats'));
  out.push(statArticle('critMult', 'Derived stats'));
  out.push(statArticle('accuracy', 'Derived stats'));
  out.push(statArticle('evasion', 'Derived stats'));
  out.push(statArticle('armor', 'Derived stats', [1]));
  out.push(statArticle('magicArmor', 'Derived stats', [1]));
  out.push(statArticle('hpRegen', 'Derived stats', [0, 1]));
  out.push(statArticle('mpRegen', 'Derived stats', [0, 1]));
  // Primary bonuslar
  for (const kind of ['str', 'dex', 'int', 'luck'] as const) out.push(bonusArticle(kind));
  // Hasar ve isabet
  const wk = Object.entries(f.weaknesses).flatMap(([tag, m]) => Object.entries(m).map(([el, mult]) => `${cap(tag)} units take ${multText(mult)} ${el} damage.`));
  out.push(
    article('damage-formula', 'Damage', 'Damage formula', cx('mech_damage', 'sword'), [
      p('Damage = skill power x attribute x scaling, plus any extra the skill adds, then reduced by armor, then multiplied by weakness, then by the crit.'),
      list(
        `Power and attribute: every skill names the attribute it scales with (STR, INT, DEX or LUCK). A power of 60% with 40 INT is 24 base damage. Scaling per attribute: ${(['str', 'int', 'dex', 'luck'] as const).map((s) => `${STAT_LABEL[s]} x${num(f.scaling[s])}`).join(', ')}.`,
        `Variance: every hit rolls within plus or minus ${pct(f.damage.variance)}; damage is never below ${f.damage.minDamage}.`,
        `Armor: physical damage is reduced by Armor, every other element by Magic armor. Reduction = armor / (armor + ${k}), so ${k} armor blocks 50% and more armor gives less and less. Some skills ignore a share of armor (the description says so).`,
        // Faz 2c: zırhı düşüren / alınan hasarı artıran durumlar (statuses.json armorMult / damageTakenMult; Sunder, Exposed...)
        `Armor and damage-taken effects: ${Object.values(content.statuses)
          .filter((s) => s.armorMult !== undefined || s.damageTakenMult !== undefined)
          .map((s) => `${s.name} (${s.armorMult !== undefined ? `${multText(s.armorMult)} Armor` : `takes ${multText(s.damageTakenMult!)} damage`})`)
          .join(', ')}. They multiply the target's current armor or the damage it takes; several stack by multiplying.`,
        // Altıncı tur: verilen hasarı azaltan durumlar (statuses.json damageDealtMult / magicDealtMult; Weakened)
        `Damage-dealt effects: ${Object.values(content.statuses)
          .filter((s) => s.damageDealtMult !== undefined || s.magicDealtMult !== undefined)
          .map((s) => `${s.name} (deals ${multText(s.damageDealtMult ?? s.magicDealtMult!)} damage unless its source says otherwise; some sources weaken only magic damage)`)
          .join(', ')}. They multiply the damage the affected unit deals, in the battle preview too.`,
        `Weaknesses: ${wk.join(' ')} See the Elements section.`,
        `Crit: a crit deals ${multText(a.critMult)} damage (chance ${pct(a.critChanceBase)} + ${pct(a.critChancePerLuck, 1)} per Luck). This bonus never changes; Luck only adds chance. Crits also apply to healing, never to shields.`,
        `Summoned units take ${multText(f.summon.damageTakenMultiplier)} damage.`,
      ),
    ]),
    bonusRulesArticle(),
    article('hit-chance', 'Damage', 'Accuracy, evasion and hit chance', statIconName('accuracy'), [
      p(`Every damaging hit (physical and magic) first rolls to hit: hit chance = attacker accuracy - target evasion, never above ${pct(f.hit.max)}. It can drop to 0%. One roll decides the outcome: a hit, a Dodge or a Miss.`),
      list(
        `Accuracy = ${pct(a.accuracyBase)} + ${pct(a.accuracyPerLuck, 1)} per Luck.`,
        `Evasion = ${pct(a.evasionPerStep)} for every ${a.dexPerEvasionStep} Dexterity, in whole steps only (maximum ${pct(a.evasionMax)}).`,
        'Dodge: the attacker\'s accuracy was good enough but the target\'s evasion made the hit fail. "Dodge" shows above the target.',
        'Miss: the attacker\'s own accuracy was not enough, no matter the evasion. "MISS" shows above the attacker.',
        'A dodged or missed hit deals no damage and applies none of the skill\'s effects.',
        blockText(),
        unblockableText(),
        'Heals, shields, buffs, effects on yourself and ground effects (poison, fire on the ground) never miss.',
        ...Object.values(content.statuses).filter((d) => d.accuracyDelta || d.evasionDelta).map((d) => `${d.name} (${d.type}): ${d.accuracyDelta ? `accuracy ${d.accuracyDelta > 0 ? '+' : '-'}${pct(Math.abs(d.accuracyDelta))}` : `evasion ${d.evasionDelta! > 0 ? '+' : '-'}${pct(Math.abs(d.evasionDelta!))}`} while it lasts. The hit chance still stays between 0% and ${pct(f.hit.max)}.`),
      ),
    ]),
    article('ground', 'Damage', 'Ground effects', cx('mech_ground', 'flame'), [
      p('Some skills leave an effect on the ground of the target area (see Statuses & Grounds). Each ground gives its own status to the units it affects while they stand in it: Burning Ground gives Burning, Poison gives Poisoned, Chill Ground gives Chilled and so on. A unit that steps, is moved, pushed or pulled into the ground gets the status at once; it lasts as long as the unit stays inside and ends the moment it leaves or the ground runs out.'),
      p('The damage comes from the status, not the ground: the status deals its damage once at the start of the unit\'s own turn, with the strength of the ground (magic damage of the ground\'s element, fixed when the effect is created, it cannot crit or be dodged). Getting the status again does not add a tick: walking from one Burning Ground into another still burns once per turn. If the unit already has the same status from a skill, the stronger one counts; leaving the ground, the skill\'s status goes on for the turns it has left.'),
      p('The duration counts the caster\'s turns, and the effect ends if the caster falls.'),
      p("Exception: the ember a dying enemy leaves behind (Last Ember) burns under the hero who killed it; its duration counts that hero's turns and it ends if that hero falls."),
      // şifa zemini (grounds.json > heal): yalnızca veride varsa yazılır (Holy Ground: Judgment kendi tarafına, 2026-10-24 open-questions 416/8)
      ...(skillHealGrounds().length ? [p(`Healing ground: ${skillHealGrounds().map((g) => g.name).join(', ')} hurts no one. Instead, allies of the caster standing there are ${content.statuses['hallowed']?.name ?? 'Hallowed'} and heal a fixed amount at the start of each of their own turns (it cannot crit; Wound and other healing cuts still apply). It only lands on your own side.`)] : []),
    ], '#ff7a1a'),
    // Zemin tepkimeleri (Ömer 2026-10-27, open-questions 445): tablo veriden (grounds.json > reactions)
    article('ground-reactions', 'Damage', 'Ground reactions', cx('mech_ground', 'flame'), [
      p("When a skill leaves a ground effect on a cell that already holds a different one, the two react once on that cell and leave a single result. Order matters: the ground already there is the setup, the new one is the trigger. Grounds from both sides react. The reaction belongs to whoever cast the new ground: its damage and statuses hit only that caster's enemies, its healing only that caster's allies. The same ground twice does not react."),
      p('While you aim a skill that leaves a ground, cells where a reaction would happen show its name under the plate.'),
      { kind: 'table', head: ['Already there', 'Cast on it', 'Result', 'What happens'], rows: groundReactionRows() },
      p(`Water means Flooded (tide, urn and skill water alike). Explosion: the cell takes ${pct(content.groundReactions.explosion?.damage?.mult ?? 1)} of both grounds' damage per tick at once, each cell around it (four directions) ${pct((content.groundReactions.explosion?.damage?.mult ?? 1) * (content.groundReactions.explosion?.damage?.adjacent ?? 0))}.`),
    ], '#ffb347'),
  );
  // Özel mekanikler
  const bets = betLines();
  out.push(
    article('enemy-passives', 'Special rules', 'Enemy passives', cx('mech_enemy_passives', 'skull'), [
      p('Campaign enemies have passives of their own: each reacts to something in the fight (a hit, a death, low HP, a summon, MP, its lane or its neighbours, its pack or its cover, the start of battle). Hover an enemy in battle to read its passive; the Enemies articles list them by family.'),
      list(...mobPassiveLines()),
    ], '#8a6a4a'),
    article('gamble', 'Special rules', 'Bets (Gambler)', cx('mech_gamble', 'dice'), [
      p('A bet skill puts part of the caster\'s HP or MP at stake before the hit, then rolls a die. On a win the hit is multiplied (and may grow with the stake); on a loss the hit is weaker or misses, and the stake is lost. A won bet keeps the stake.'),
      list(...bets.map((b) => b.text)),
    ], '#b8892e'),
    article('rage', 'Special rules', 'Rage', 'ui:rage', [
      p(`Some classes have a Rage bar next to their HP and MP: ${Object.values(content.classes).filter((c) => c.maxRage !== undefined).map((c) => c.name).join(', ') || 'none yet'}.`),
      list(...describeRage(f)),
      p(`Skills that cost Rage: ${allSkills().filter((s) => s.cost.resource === 'rage').map((s) => `${s.name} (${skillCostLabel(s.cost)})`).join(', ') || 'none yet'}.`),
      ...rageHurtLines(),
      ...rageSpendLines(),
    ], '#c0392b'),
    article('area-shapes', 'Special rules', 'Area shapes', cx('mech_area', 'blast'), [
      p('Some skills hit a shape made of cells instead of one target. You pick an anchor cell (it may be empty); every living enemy standing inside the shape is hit. Row means the same depth (all lanes of one row); column means one lane across all rows.'),
      list(
        'Row: the whole row of the anchor cell.',
        'Column: the whole lane of the anchor cell, across every row.',
        `Block RxC (from 1x1 up to ${f.formation.rows}x${f.formation.lanes}, for example 2x3): R rows deep by C lanes wide.`,
        'On screen a block is drawn sideways: its rows run left to right and its lanes top to bottom. Each direction is placed on its own. In a direction where the block is 3 or more cells long, your cursor cell is its middle (for 4 cells: the second cell from the left); if the block cannot be centered there because of the edge, it starts at your cursor cell instead. In a direction where the block is only 1 or 2 cells long, your cursor cell is its bottom-left corner on screen, so the block extends to the right and upwards. Both sides cover the same cells: a 2-row block always covers a row and the row behind it, and its front row is the one that must be in range (on the enemy side that is your cursor row; on your own side, where the back is on the left, it is the row to the right of your cursor). If it would still stick out of the grid it slides back inside (its size never shrinks), so every cell is a valid anchor.',
        'Cross: the anchor cell and the 4 cells next to it (one row in front or behind, one lane above or below). Cells outside the grid are skipped.',
        'X: the anchor cell and the 4 diagonal cells around it (one row in front or behind AND one lane above or below). Cells outside the grid are skipped, so a corner keeps only one diagonal. Some X skills cross the center twice: the unit on the anchor cell is then hit twice, each hit rolling its own hit, damage and crit.',
        `Either side: a few area skills (${allSkills().filter((s) => s.target === 'area_any').map((s) => s.name).join(', ') || 'none yet'}) can be thrown on the enemy side or on your own side. Each of their effects names who it touches: on the enemy side only enemies are affected, on your side only allies.`,
      ),
      p('Some area skills strike in waves: the shape is split into stages that land one after another. Row by row starts at the front row (closest to the attacker) and moves back; lane by lane starts at the top lane; outward waves start at the anchor cell and spread to its neighbours. Waves change only the order, never the damage: every enemy in the shape is still hit once.'),
      p((f.range?.enabled ? 'Range counts to the cell you aim at: that cell must be in range, but the shape may spill past it and hits every enemy inside. A shape is valid only if it covers at least one enemy.' : 'Melee skills with a shape only hit enemies that melee can reach (the front rows); enemies in the shape but out of reach are not hit. A shape is valid only if it covers at least one enemy that can be hit.') + ' Taunt does not force shape skills, but the enemy AI still prefers to aim them at a taunting unit in reach. Test classes such as the Geometer carry one skill per shape; they never appear in random teams.'),
      { kind: 'table', ...areaSkillTable() },
    ], '#c9a0ff', shapeExamples()),
    article('actions', 'Special rules', 'Actions: Rest, Skip Turn and Move', 'ui:move', [
      p('Besides its four skills, every unit can use three global actions. They cost nothing and each ends the turn. In the campaign and in Endless your heroes have a fourth, Revive, paid with Valor (see Valor).'),
      list(...Object.values(content.globalSkills).filter((d) => d.kind !== 'valor' && d.kind !== 'urn' && d.kind !== 'surge').map((d) => {
        const info = describeGlobalSkill(d, f);
        return `${info.name}: ${[info.summary, ...info.lines].map((s) => s.replace(/\.$/, '')).join('. ')}.`;
      })),
      p(`The enemy team uses these actions too: it rests when a strong skill is out of MP, waits when nothing useful can be done, ${f.range?.enabled ? 'moves fragile units out of enemy range, and steps closer when none of its skills can reach an enemy' : 'moves fragile units out of melee reach'}.`),
    ], '#9ec5e8'),
    valorArticle(),
    levelsArticle(),
    article('backstab', 'Special rules', 'Strikes from behind and sure crits', 'backstab', [
      p(`Some assassin skills slip behind the target, stab it in the back and return. ${f.range?.enabled ? 'They still need range like any skill' : 'They ignore the melee row rules (any row can be targeted)'}, but only a target with an empty cell right behind it can be chosen: the next row back, same lane, must hold no living unit. A corpse or a cell kept for a fallen ally does not block it; a target in the back row can never be chosen ("No room behind the target"), and one with a living unit behind it is "shielded from behind". Moving units (or a unit falling) can open the way. The caster is drawn there only for the strike: the formation does not change.`),
      p(`Some hits are always critical: no crit roll is made and the crit bonus (${multText(a.critMult)} damage) always applies. The hit roll still happens, so they can still miss or be dodged.`),
      p(`Skills that strike from behind: ${allSkills().filter((s) => s.requiresOpenBehind).map((s) => s.name).join(', ') || 'none yet'}. Always critical: ${allSkills().filter((s) => s.effects.some((e) => e.type === 'damage' && e.guaranteedCrit)).map((s) => s.name).join(', ') || 'none yet'}.`),
      p(`Some skills carry extra crit chance of their own: it is added to the caster's crit chance (statuses included) for that skill's hits only. ${allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'damage' }> => e.type === 'damage' && !!e.critBonus && !e.guaranteedCrit).slice(0, 1).map((e) => `${s.name} +${pct(e.critBonus!)}`)).join(', ') || 'None yet'}.`),
    ], '#c0203a'),
    article('status-bonus', 'Special rules', 'Bonus damage against weakened targets', 'opportunist', [
      p('Some passives deal extra damage to a target that already suffers from certain statuses. The bonus multiplies every hit (a crit multiplies on top of it) and shows in the damage preview.'),
      list(...Object.values(content.classes).filter((c) => c.passive?.effect.type === 'bonusVsStatus').map((c) => `${c.name}, ${c.passive!.name}: ${describePassive(c.passive!, c.stats, f)}`)),
    ], '#c9a227'),
    article('push', 'Special rules', 'Pushes and crashes', 'blizzard', [
      p('Some skills push the enemy they hit one cell in a direction you choose: forward, back or along the row (never diagonally). After picking the target, pick the direction on the arrows around it.'),
      p('If that cell is free, the target moves there (it may land in ground effects). If the cell is off the board or taken, there is no push: the target crashes and takes a little extra damage of the same element, and a unit standing in that cell takes the same. The preview marks a crash direction in red.'),
      p(`Units that cannot be moved (bosses, steadfast units) are never pushed and never crash: they only take the hit and its status. Skills that push: ${allSkills().filter((s) => s.effects.some((e) => e.type === 'push')).map((s) => s.name).join(', ') || 'none yet'}.`),
    ], '#8fd8ff'),
    ...curseArticles(),
    affixRulesArticle(),
    article('echo', 'Special rules', 'Ready again immediately', 'echo', [
      p('Some passives let a damaging skill with a cooldown be ready again right after it is cast, with a set chance. Classes with such a passive: ' + Object.values(content.classes).filter((c) => c.passive?.effect.type === 'spellEcho').map((c) => `${c.name} (${c.passive!.name})`).join(', ') + '.'),
    ]),
    article('corpses', 'Special rules', 'Corpses', 'fx:corpse', [
      p('When a unit of a team falls, it leaves a corpse on its cell. Summoned units leave no corpse, not even when they fall together with their summoner.'),
      list(
        'Revivable: the corpse can be brought back with a revive skill. Its cell counts as empty: allies can move onto it and a summon (a Skeleton, a Treant) can appear on it. The corpse stays where it is and can still be revived, onto another empty cell.',
        'Consumed: the corpse was devoured and can never be revived. Its cell is free again for moving and summoning.',
      ),
      p(`Skills that consume corpses: ${skillsWith((e) => e.type === 'summon' && !!e.consumeCorpse).join(', ') || 'none yet'}. Choose a fallen foe to consume, then choose where the summon rises on your own side: the consumed corpse can never be revived and the summon comes empowered. While a fallen foe lies on the field you must consume one (you decide which); with no fallen foe you only choose the cell and the summon comes weaker (unfed). The AI consumes the most dangerous foe: the one worth the most to its team if revived (its threat and best skill, its max HP, more if it can revive others itself or if a living reviver could bring it back).`),
      p(`A revive skill (${skillsWith((e) => e.type === 'revive').join(', ') || 'none yet'}) cannot target a consumed corpse.`),
      p('On the battlefield a revivable corpse shows as a small ankh and skull on its cell (hover it to read who fell). When the corpse is consumed the mark fades and the cell looks empty again.'),
    ], '#b36bff'),
    article('summons', 'Special rules', 'Summons', 'treant', [
      p(`Summoned units fight on your side and stand on your own side of the board, but are not part of the chosen team. They take ${multText(f.summon.damageTakenMultiplier)} damage, may only exist for a number of turns, and fall as soon as their summoner falls.`),
      p(`Skills that summon: ${skillsWith((e) => e.type === 'summon').join(', ') || 'none yet'}. Damage dealt by a summon still counts for its owner's passives.`),
      p(`Summons grow with their summoner: they have the summoner's level, and their power and HP come from one of the summoner's attributes (${Object.values(content.summons).filter((d) => d.summonerScale).map((d) => `${d.name}: ${d.summonerScale!.from.toUpperCase()}`).join(', ')}). Only the summoner's own attributes count (class base and level points): attributes from items do not pass to the summon. The numbers in a summon's article are what a level 1 summoner calls.`),
    ]),
    article('revive', 'Special rules', 'Resurrection', 'ankh', [
      p('A revive skill is aimed in two steps: first choose the fallen ally, then choose an empty cell on your own side where it rises, with a share of its max HP and MP. It does not matter whether something now stands on its corpse (for example a summon): any empty cell will do. With no empty cell on your side the skill cannot be used. It cannot target living units, and it cannot target an ally whose corpse was consumed (see Corpses). The revived ally starts with an empty turn bar.'),
      p('The AI weighs a resurrection like any other move: what the revived ally will do over the next turns (its first turn comes later because its turn bar starts empty), against healing a living ally whose turn is close or hitting the foe who is about to strike. It picks the cell where the ally is most useful and safest (a melee fighter in front, a caster or archer at the back). When the fight is already decided, it does not waste a turn on a resurrection: if the remaining foes are expected to fall within the next few turns anyway, or if the battle is lost and the revived ally would not change that, the resurrection is worth nothing to it.'),
      list(...Object.values(content.skills).flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'revive' }> => e.type === 'revive').map((e) => `${s.name}: revives at ${pct(e.hpRatio)} HP and ${pct(e.mpRatio)} MP${e.regen ? `; then regenerates ${pct(e.regen.ratio)} of its max HP at the start of each of its next ${e.regen.turns} turns` : ''}.`))),
      p(`Skills that revive: ${skillsWith((e) => e.type === 'revive').join(', ') || 'none yet'}.`),
    ]),
    article('shields', 'Special rules', 'Shields', 'fx:barrier', [
      p('A shield soaks damage before HP. A normal shield absorbs any damage; a magic shield only absorbs magic damage. Shield amounts are fixed (no variance, no crit).'),
      p(`Skills that shield: ${skillsWith((e) => e.type === 'shield').join(', ') || 'none yet'}.`),
      p('Some shields do something extra whenever they absorb a hit (only direct hits from an enemy skill; damage from ground effects never triggers them). Their extra part soaks damage before any plain shield on the same unit. Every absorbed hit triggers them again: an attack that hits several times triggers them on every hit.'),
      list(
        ...allSkills().flatMap((s) =>
          s.effects
            .filter((e): e is Extract<typeof e, { type: 'shield' }> => e.type === 'shield' && !!e.onAbsorb)
            .map((e) => {
              const h = e.onAbsorb!;
              const parts = [
                h.burnMana ? `burns ${h.burnMana} MP from the attacker` : '',
                h.dispelChance ? `${pct(h.dispelChance)} chance to remove a random buff from the attacker` : '',
                h.giveMana ? `gives the shielded unit ${h.giveMana} MP (never above its maximum)` : '',
              ].filter(Boolean);
              return `${s.name} (${e.shieldType === 'magic' ? 'magic shield' : 'shield'}): when it absorbs a hit, it ${parts.join('; ')}.`;
            }),
        ),
      ),
    ]),
    article('dispel', 'Special rules', 'Removing buffs and debuffs', 'manabarrier', [
      p('Some skills remove statuses: a cleanse wipes the debuffs from an ally (Slow, Wound, Stun, Blinded...), a dispel strips a buff from an enemy. A shield that strips a buff from an attacker picks a random one; a skill that removes only some debuffs removes the longest-lasting first. A few special statuses (such as Dark Bond) can never be removed.'),
      p(`Remove debuffs: ${skillsWith((e) => e.type === 'dispel' && e.status === 'debuff').join(', ') || 'none'}. Remove an attacker's buff: ${skillsWith((e) => e.type === 'shield' && !!e.onAbsorb?.dispelChance).join(', ') || 'none'}.`),
      p('Removing a Stun from a taunting unit does not bring its taunt back: a Stun ends the taunt the moment it lands.'),
    ], '#6ec1ff'),
    article('dark-bond', 'Special rules', 'Dark Bond and life steal', 'darkbond', [
      p('Life steal heals the attacker for part of the damage it deals (a passive such as Vampiric Bite, or a skill that says so). Damage dealt by a summon counts for its owner.'),
      p('A dark bond links the caster to one other ally for a number of the caster\'s own turns. While it lasts, every time the caster heals from life steal, the bonded ally is healed too (a share of that heal, listed below; it can be more than 100%); the caster\'s own healing is not reduced. Only what the caster really heals is shared: at full HP the caster steals no life, so the ally gets nothing; the ally is never healed above its maximum.'),
      list(
        'Only one bond at a time: a new bond breaks the old one.',
        'The bond ends when its time runs out (counted on the caster\'s turns; both badges show the same number), or at once if either unit falls.',
        'The bond cannot be removed by dispels or cleanses.',
      ),
      list(...allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'bond' }> => e.type === 'bond').map((e) => `${s.name}: bond for ${e.turns} turns; the ally heals ${e.ratio === 1 ? 'the same amount' : pct(e.ratio)} of every life steal heal.`))),
      p(`Life steal passives: ${Object.values(content.classes).filter((c) => c.passive?.effect.type === 'soulDrain').map((c) => `${c.name} (${c.passive!.name}, ${pct((c.passive!.effect as { ratio: number }).ratio)})`).join(', ') || 'none'}.`),
    ], '#b0304f'),
    article('hybrid-scaling', 'Special rules', 'Skills that scale with two stats', 'tremor2', [
      p('Most damage is a share of one stat. A few skills add a share of a second value on top, such as the attacker\'s armor. The bonus uses the attacker\'s current value, so armor from auras and items counts. It is added before the target\'s armor and grows with the same bonuses as the main part.'),
      list(...allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'damage' }> => e.type === 'damage' && !!e.bonusScale?.length).map((e) => `${s.name}: ${pct(e.power)} ${e.scale.toUpperCase()} + ${e.bonusScale!.map((b) => `${pct(b.pct)} ${b.stat === 'armor' ? 'Armor' : b.stat === 'magicArmor' ? 'Magic armor' : b.stat.toUpperCase()}`).join(' + ')}.`))),
    ], '#b9c8dc'),
    article('low-hp-heal', 'Special rules', 'Heals that favour the wounded', 'radiance', [
      p('Some heals grow with how much health the ally is missing. The bonus is worked out for each ally on its own, just before the heal lands: an ally at full health gets no bonus, an ally with half its health gets half of the bonus, and an ally close to death gets nearly all of it. The heal is rolled and can crit as usual; the bonus is applied on top.'),
      list(...allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'heal' }> => e.type === 'heal' && !!e.missingHpBonus).map((e) => `${s.name}: up to ${moreText(e.missingHpBonus!)} healing on a nearly dead ally.`))),
    ], '#fff0a0'),
    article('half-turn', 'Special rules', 'Half-turn skills', cx('mech_half_turn', 'hourglass'), [
      p(`Using a skill normally takes a whole turn: the unit's action counter drops by ${f.turn.threshold}. A half-turn skill only takes half of that, so the unit's next turn comes in half the usual time (Haste, Slow and the Skip Turn boost still change how fast the counter fills). The turn bar shows this as soon as the skill is used.`),
      p('Cooldown and MP work as usual, and a half-turn skill always has a cooldown, so it cannot be chained. In test mode there is no turn order, so this has no effect there.'),
      p(`Half-turn skills: ${allSkills().filter((s) => s.turnCost !== undefined && s.turnCost < 1).map((s) => s.name).join(', ') || 'none yet'}.`),
    ], '#c9a227'),
    // Daze (Ömer 2026-10-27, open-questions 443): çekiç örtüğü; sayılar formulas.json > daze + items.json > implicits.hammer
    article('daze', 'Special rules', 'Daze (hammers)', cx('mech_half_turn', 'hourglass'), [
      p(`Hammers carry Daze: every damaging hit a hammer wielder lands on an enemy has a chance (${ITEM_DATA.implicits?.hammer?.parts[0]?.base ?? 15}% on a one-handed hammer, more on a two-handed one) to push the target's turn back by ${pct(f.daze?.push ?? 0.25)} of a turn (the action counter loses ${Math.round(f.turn.threshold * (f.daze?.push ?? 0.25))}). Bosses are pushed only ${pct((f.daze?.push ?? 0.25) * (f.daze?.bossMult ?? 0.5))} of a turn.`),
      p('Daze is not a control effect: it cannot be resisted and does not stop the target from acting, it only makes its next turn come later. The battle shows "Dazed" over the target. In test mode there is no turn order, so Daze does nothing there.'),
    ], '#c9a227'),
    article('control', 'Special rules', 'Taunt, guard and mana burn', 'taunt2', [
      p(`Taunt forces enemies to target the taunting unit for some turns (it can end early if the unit loses enough HP, or at once if the unit is hit by a control status: ${Object.values(content.statuses).filter((d) => d.breaksTaunt).map((d) => d.name).join(', ') || 'none'}). Guard makes a protector take a share of the damage dealt to another ally (a unit cannot guard itself); a guard that covers a row (Close Ranks) protects every ally in the chosen ally's row (the user excluded). A unit holds one guard at a time (a new one replaces the old), the share passes on as it is (the protector's armor does not cut it again) and it stops while the protector is down. Mana burn removes MP from a target (and may give some of it to the caster) without hurting its HP.`),
      p(`Taunt: ${skillsWith((e) => e.type === 'taunt').join(', ') || 'none'}. Guard: ${skillsWith((e) => e.type === 'guard').join(', ') || 'none'}. Mana burn: ${skillsWith((e) => e.type === 'manaBurn').join(', ') || 'none'}.`),
      p('Some mana burns take a share of the target\'s maximum MP instead of a fixed amount: a big mana pool loses more. See Silence for what happens when a target runs dry.'),
      p(`A mana burn that is part of an attack only works if the attack hits: on a miss or a dodge no MP is burned or stolen${allSkills().some((s) => s.name === 'Mana Steal') ? ' (Mana Steal gains nothing)' : ''}.`),
    ]),
    silenceArticle(),
    ...[brandArticle()].filter((a): a is WikiArticle => a !== null),
    ...[bellsArticle()].filter((a): a is WikiArticle => a !== null),
    multiplayerArticle(),
  );
  // Sefer (campaign-dev): sayılar data/campaign/campaign.json ve harita verisinden
  {
    const r = campaignConfig.rules;
    const m = campaignMap;
    out.push(
      article('campaign', 'Campaign', 'Campaign', cx('mech_campaign', 'boot'), [
        p(`The campaign is a journey across ${m.title.charAt(0)}${m.title.slice(1).toLowerCase()}: ${m.nodes.length} stops on the map, and any road from the start to the final castle passes ${m.stopsPerRun} of them. The map counts your progress as cleared stops (Cleared x/${m.nodes.length}). Start it from the main menu (New Campaign). Quick Battle is the old single-battle mode.`),
        list(
          'Roads: every road is a solid line, crossroads included. A choice point is a crossroads: the roads you did not take stay open, and you can come back for them later. Roads meet again further on. A dashed road leads to an optional pocket: a dead end with an Elite or a Guarded treasure off the main road. No route needs it; walk in for the reward and back out the same way.',
          'Regions: the map opens on the region your party is in. Stops of a neighbouring region that a road leads to show faded (hover to see the road); tap one to look at that region. Regions you have not seen yet stay hidden. Tap the region name at the top, tap an empty spot of the map, or zoom out past the furthest step, for the whole map: it shows only the region names and the road between them; a region you have not discovered yet shows only a lock and cannot be entered. Tap a region (or zoom in) to go back to its stops. Fog stays where it is in every view; only exploring clears it.',
          `Fog: you see the next stop in full (name, type, enemies) and the stop after it by type and name only; anything further is under fog. The final castle is always visible as your goal.`,
          // Yan karşılaşma uyarısı (Ömer 2026-10-27; src/campaign/side-danger.ts, eşikler campaign.json > sideDanger)
          `Hard fights off the road: a side stop (an optional pocket, a Guarded treasure, a guarded event or a quest) whose foes are clearly stronger than the main-road battles around it says so on its card: "Stronger than the road ahead" or "Far stronger than the road ahead", with a Hard fight tag. It is only a warning; the fight and its reward are the same.`,
          `Back-to-back fights: the Fighting Pit and a deep Salvage Dive give no healing between fights. Their windows and cards say so in one quiet line, such as "5 fights in a row · no rest between" or "Depth 3 · no rest since the surface". Information only; nothing changes.`,
          // Serbest dolaşım ve devriye (campaign-dev, roadmap 2.1-2.3 A; sayılar data/campaign/campaign.json > replay)
          `Free roaming: after you form your company in the first village, roads no longer close. Walk back along any road, or tap a far stop to travel there in one go through stops you have cleared (nothing happens on the way). A stop you have seen stays on the map. Patrols return to cleared battlefields: a cleared Battle, Elite or Guarded treasure can be fought again (same foes, new dice). Each repeat pays full gold and loot but less XP: ${REPLAY_PCTS.join(', ')} of the first victory's XP, then ${REPLAY_PCTS.at(-1) ?? '100%'} from then on. A patrol never lights Valor: each stop gives Valor only for its first victory. The chest of a Guarded treasure and an Elite's first-victory item come only once. Bosses, events, plain treasures and the tutorial road are not repeated. The Patrol badge on a stop shows the XP its next fight pays. Retreating from a patrol calls it off and you may move on, but what happened in the fight stays: lost health stays lost and heroes who fell rise wounded (see Health and wounds).`,
          `Stops: Battle, Elite (a stronger leader), Boss, Guarded treasure (a battle, then a chest), Event (a short story stop; a guarded one is a battle first), Town (the Inn, recruits and, from Valdren Keep on, the Blacksmith), Rest (a camp you can use once: rest, tend a wound, sharpen an item or train) and Merchant (Odo sells gear for the region's item level, with new wares every day; the price depends on rarity and item level; he buys your spare items for half that price and lets you buy them back).`,
          `Your party: you start alone as a Warrior or an Archer, a companion joins in the forest, and at the first village the escort stays behind and you form a new company of three from every class, starting at Level 1. Skip tutorial on the Choose your hero window starts you straight in that village to form your company (the gold and gear of the tutorial road are still in your bag). The tutorial road and the first stops past the village are all Level 1; from there the stops grow in level toward the final castle. The first hero you pick leads; the leader walks in front on the map. Another hero joins when you leave the city.`,
          `Health carries over between battles. After a victory the survivors regain ${pct(r.victoryHeal)} of their maximum HP, ${pct(r.eliteVictoryHeal ?? r.victoryHeal)} after an elite, and a boss victory heals them fully. Mana starts full in every battle. If the whole party falls, the battle is lost and you go back to your last save.`,
          `Wounds: a hero who is still down when a battle is won gets back up with ${pct(r.wounds.riseRatio)} of their HP and one wound. A hero raised during the battle (Valor, a revive skill) takes no wound; a Valor revive also heals ${VCW === 1 ? 'one wound' : `${VCW} wounds`} (revive skills do not). Each wound lowers maximum HP by ${pct(r.wounds.maxHpLoss)} (${r.wounds.lethal} wounds: -${pct(r.wounds.maxHpLoss * r.wounds.lethal)}). A hero with ${r.wounds.lethal} wounds who falls again and is still down at the end of a won battle dies: they enter the next battles as a corpse until Valor raises them${VCW ? ` (healing ${VCW === 1 ? 'one wound' : `${VCW} wounds`})` : ''}. Retreating from a patrol follows the same rule.`,
          // Gün, Inn, kamp (Ömer 2026-10-26, form econ/main; sayılar campaign.json > days / inn / camp / rest)
          `Days: the journey counts days, starting on Day 1. Every ${campaignConfig.days.completionsPerDay} battles you win make a day: a stop's first victory or a patrol victory. Walking, towns, events and camps take no time. Enemies do not grow stronger with the days. The day carries over to a new map.`,
          `Inn: towns do not heal you by themselves. In a town you can leave one or more living heroes at the Inn: they leave your company (it goes on short-handed, or a recruit fills the gap), gain no experience, and every day recover ${pct(campaignConfig.inn.healPerDay)} of their maximum HP and ${campaignConfig.inn.woundsPerDay === 1 ? 'one wound' : `${campaignConfig.inn.woundsPerDay} wounds`}. Pick them up only at the same town's Inn, if your company has room. When you continue to a new map, heroes at an Inn rejoin you as healed as they are. The dead cannot rest at the Inn: only Valor, or a revive skill in battle, brings a dead hero back.${content.valorRules.woundHeal ? ` On the map, Valor can also heal one wound of a living hero for ${content.valorRules.woundHeal.outsideCost} embers.` : ''}`,
          `Camp: a camp (such as Riverside Camp, or the rest after some events) can be used once, for one choice, and takes no time. Rest: the living regain ${pct(campaignConfig.rest.heal)} of their maximum HP. Tend wounds: one hero heals ${campaignConfig.camp.tendWounds === 1 ? 'one wound' : `${campaignConfig.camp.tendWounds} wounds`}. Sharpen: one item is tempered by one level for free (the Blacksmith's limits apply). Train: one hero gains ${pct(campaignConfig.camp.trainShare)} of the experience a normal battle there would give them. Coming back to a used camp does nothing. Boss healing does not heal wounds; continuing to a new map heals the wounds of the living.`,
          `Blacksmith (in every town from Valdren Keep on): Temper raises an item's level by 1, up to the best item level of the current chapter (${SMITH_CFG.ilvlPerChapter} per chapter); its weapon power and every property grow with it, and its level requirement rises too. Any rarity can be tempered. Each step costs ${SMITH_CFG.temper.stones ?? 1} Temper Stone (${SMITH_CFG.temper.highStones ?? 2} to go above item level ${SMITH_CFG.temper.highAbove ?? 15}) and a little gold, in line with how much a level adds to the item's worth; a Legendary costs ${num(SMITH_CFG.temper.legendaryMult)}x the gold. Temper Stones drop only from a boss (1 to 3) or an elite (1 stone half the time), on the first victory there. Combine: put in 3 items from your bag (not worn, not Legendary) and get 1 new item. Its rarity is the average of the three (a fraction is the chance of one rarity higher, at most Epic) and its item level is their average, rounded down. Three of the same item give that item again with new properties; otherwise it can be any item. The three items are gone. Reroll affix works on Epic items only: pick a property other than the first (main) one and it is rerolled into a property of the same tier, which can be the same one with a new value. Each reroll of the same item costs ${num(SMITH_CFG.reforge.growth)}x the one before.`,
          `Saving: there are ${r.slots} campaign slots, one journey each, and every journey keeps its own saves. Normal saves after every victory and whenever you press Save on the map (up to ${r.maxSaves.normal} saves per journey; the oldest is replaced). Ironman keeps a single save, written only after a victory. If you are defeated, you go back to your last save.`,
          'Retreat to Map (battle Menu): the battle is paused, not reset, and the game saves (in Ironman too). Your party stays at that stop; moving on, Gear, Formation and Valor revives are locked until you finish it. Tap the stop and choose Resume Battle to continue on the same turn. Winning or losing ends the pause; a defeat works as usual.',
          `Difficulty: Easy, Medium or Hard, chosen when the journey starts; it cannot be changed later. ${difficultyText()}`,
        ),
      ]),
      ...(drownedReachShown() ? [drownedReachArticle(), battleRulesArticle(), fightingPitArticle(), heroOathArticle(), wayshrinesArticle(), salvageDiveArticle(), personalQuestsArticle(), crownSurgeArticle(), seaAndFactionsArticle()] : []),
      ...(hollowCrownShown() ? [hollowCrownArticle()] : []),
      itemsArticle(),
      affixArticle(),
      legendaryArticle(),
      endlessArticle(),
    );
  }
  out.push(...bossArticles(), ...mobArticles());
  return out;
}

/** Harita 2 bayrağı (campaign.json > mapFlags; debug anahtarı / ?maps=1): kapalıyken Codex'te Drowned Reach sayfası yok. */
export function drownedReachShown(): boolean {
  const flags = (campaignConfig as unknown as { mapFlags?: Record<string, { enabled: boolean }> }).mapFlags;
  return flags?.['drowned-reach']?.enabled !== false || maps23On();
}

/** Harita 3 bayrağı (campaign.json > mapFlags['hollow-crown']; debug anahtarı / ?maps=1): kapalıyken Codex'te Hollow Crown sayfası yok. */
export function hollowCrownShown(): boolean {
  const flags = (campaignConfig as unknown as { mapFlags?: Record<string, { enabled: boolean }> }).mapFlags;
  return flags?.['hollow-crown']?.enabled !== false || maps23On();
}

/** Harita 3 (maps-2-3.md 4; iskelet): sayılar harita verisinden. */
export function hollowCrownArticle(): WikiArticle {
  const m = hollowCrownMap as unknown as { title: string; nodes: Array<{ type: string; optional?: boolean; spoke?: boolean; name: string }>; regions: Array<{ id: string; title: string; tagline?: string }>; stopsPerRun: number };
  const name = m.title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const towns = m.nodes.filter((n) => n.type === 'town').map((n) => n.name);
  const bosses = m.nodes.filter((n) => n.type === 'boss').length;
  return article('hollow-crown', 'Campaign', name, cx('mech_campaign', 'boot'), [
    p(`${name} is the third map of the campaign. When the Drowned Queen falls, the company carries both halves of the crown north, up the Frostpeak and down into the mountain: the heroes, their levels, gear, bag and gold all come along. ${m.nodes.length} stops in ${m.regions.length} regions and ${bosses} bosses; the last two are fought one after the other, with no rest between them. A run passes about ${m.stopsPerRun} stops.`),
    list(...m.regions.map((r) => `${r.title}${r.tagline ? `: ${r.tagline}` : ''}`)),
    p(`Towns: ${towns.join(', ')}. Kharduin is the hub: ${m.nodes.filter((n) => n.spoke).length} side halls branch off it; each is a single stop, and you walk back to the hall to go on. ${m.nodes.filter((n) => n.optional).length} dashed roads lead to optional pockets.`),
  ]);
}

/** Harita 2 (maps-2-3.md 3; Adım 1 iskeleti): sayılar harita verisinden. */
export function drownedReachArticle(): WikiArticle {
  const m = drownedReachMap as unknown as { title: string; nodes: Array<{ type: string; optional?: boolean; spoke?: boolean; name: string; quest?: string }>; regions: Array<{ id: string; title: string; tagline?: string }>; stopsPerRun: number };
  const name = m.title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const first = m.nodes[0]?.name ?? 'the start';
  const boss = m.nodes.find((n) => n.type === 'boss' && /final/i.test((n as { subtitle?: string }).subtitle ?? ''))?.name ?? 'the last throne';
  const towns = m.nodes.filter((n) => n.type === 'town').map((n) => n.name);
  const pockets = m.nodes.filter((n) => n.optional && !n.quest).length;
  const spokes = m.nodes.filter((n) => n.spoke).length;
  return article('drowned-reach', 'Campaign', name, cx('mech_campaign', 'boot'), [
    p(`${name} is the second map of the campaign. When Lord Morvane falls, the company can go on down the Valdren to the sea instead of ending the journey: the heroes, their levels, gear, bag and gold all come along. ${m.nodes.filter((n) => !(n.optional && n.quest)).length} stops in ${m.regions.length} regions (plus the personal quests of some heroes); a run from ${first} to ${boss} passes about ${m.stopsPerRun} of them.`),
    list(...m.regions.map((r) => `${r.title}${r.tagline ? `: ${r.tagline}` : ''}`)),
    p(`Towns: ${towns.join(', ')}. Saltmere is the hub: ${spokes} side streets branch off it; each is a single stop, and you walk back to the square to go on. ${pockets} dashed roads lead to optional pockets, as on the first map.`),
  ]);
}

/** B5 The Fighting Pit (maps-2-3.md 9; open-questions 429): sayılar data/campaign/pits.json'dan. */
export function fightingPitArticle(): WikiArticle {
  const pit = PITS['saltmere_pit'];
  const tiers = pit?.tiers ?? [];
  return article('fighting-pit', 'Campaign', 'The Fighting Pit', cx('mech_fighting_pit', 'burst'), [
    p(`Saltmere has a fighting pit in the town square. Enter it and fight ${tiers.length} bouts in a row, each harder than the last. No one heals you between bouts: health lost stays lost, and a hero who falls rises wounded after a won bout, as after any campaign battle.`),
    p('After every won bout you choose: leave with what you have won, or fight the next bout. Lose a bout and the run ends; that bout pays nothing, but earlier purses are yours. Retreating from a bout counts as losing it. You can enter the pit again whenever you are in Saltmere, but only a bout above your record pays (gold, a chest on some bouts, and the battle\'s experience). The pit gives no Valor.'),
    list(...tiers.map((t, i) => `Bout ${i + 1}: ${t.gold} gold${t.chest ? ' and a chest' : ''}`)),
  ]);
}

/** A4 Hero Oath (maps-2-3.md 9; open-questions 429): yeminler data/campaign/oaths.json'dan. */
export function heroOathArticle(): WikiArticle {
  return article('hero-oath', 'Campaign', 'Hero oaths', cx('mech_hero_oath', 'rune'), [
    p(`At the Saltspray Shrine on the Wrecking Coast one hero may swear an oath to the Tide: a lasting gift and a lasting price. Only one hero in the company can be sworn at a time. The oath stays with the hero on later maps, and Gear shows it as a small Oath chip. It can be broken only at the shrine, for ${OATH_DATA.breakCost} gold.`),
    list(...OATHS.map((o) => `${o.name}: ${oathPlusText(o)}; ${oathMinusText(o)}.`)),
  ]);
}

/** A1 Wayshrines (maps-2-3.md 9; open-questions 428): sunaklar haritadan, sınav ve nimetler data/campaign/side-content.json'dan. */
export function wayshrinesArticle(): WikiArticle {
  const m = drownedReachMap as unknown as { nodes: Array<{ name: string; region: string; shrine?: string }> };
  const shrines = m.nodes.filter((n) => n.shrine && WAYSHRINES[n.shrine]);
  return article('wayshrines', 'Campaign', 'Wayshrines', cx('mech_wayshrines', 'radiance'), [
    p(`Each region of The Drowned Reach hides one Wayshrine at the end of a dashed road (${shrines.length} in all). Each shrine holds a short trial: a battle with a rule of its own, shown on the battle card before you start. Trials have no reinforcement waves and cannot be replayed. Win the trial and the shrine gives your company a small blessing: it works in every battle for every hero, for the rest of the campaign, and carries over to the next map. Your blessings are listed in Gear, next to your gold.`),
    list(...shrines.map((n) => { const w = WAYSHRINES[n.shrine!]!; return `${n.name} (region ${n.region}): ${w.trial} Blessing: ${w.name}, ${w.effect}.`; })),
    p('"Standing furthest forward" means by formation cell, front row first: arrange your formation before the battle to choose who goes in. Fallen heroes cannot enter a trial; the others wait at the shrine and are not touched.'),
  ]);
}

/** A5 Personal Quests (map2-quests-surge.md 1; open-questions 431): görevler data/campaign/quests.json'dan, yerler haritadan. */
export function personalQuestsArticle(): WikiArticle {
  const m = drownedReachMap as unknown as { nodes: Array<{ id: string; name: string; region: string }> };
  const cls = (id: string): string => content.classes[id]?.name ?? id;
  return article('personal-quests', 'Campaign', 'Personal quests', cx('mech_personal_quests', 'rune'), [
    p(`Some heroes have unfinished business in The Drowned Reach. A personal quest appears only while a hero of its class is in your company (the reserve counts too): most wait at the end of a dashed road, and the Paladin's is an extra choice at Monk's Isle. Finish it and that hero earns a title and a small, lasting boost to their class passive for the rest of the campaign; it carries over to the next map. Titles show under the hero's class in Gear (hover for the boost). A quest boost and a Hero Oath can be on the same hero.`),
    list(...QUEST_LIST.map((q) => { const n = m.nodes.find((x) => x.id === q.node); return `${cls(q.class)}: ${q.name}${n ? ` (${n.name}, region ${n.region})` : ''}. Title: ${q.title}. ${questBonusLine(q)}.`; })),
    p('Some quests can end without a fight. The Cutthroat can pay the old debt in gold and still earn the full reward. The Undead can let the name drown, which ends the quest with no reward. The Gambler can walk away from the table and come back later.'),
  ]);
}

/** B1 Salvage Dive (maps-2-3.md 9; open-questions 428): düğümler haritadan, derinlik ve sandıklar side-content.json'dan. */
export function salvageDiveArticle(): WikiArticle {
  const m = drownedReachMap as unknown as { nodes: Array<{ name: string; dive?: string[] }> };
  const sites = m.nodes.filter((n) => n.dive?.length).map((n) => n.name);
  const rarity = (r: string): string => `${r[0]!.toUpperCase()}${r.slice(1)}`;
  return article('salvage-dive', 'Campaign', 'Salvage Dive', cx('mech_salvage_dive', 'floodedplanks'), [
    p(`Some guarded treasures lie in sunken wrecks (${sites.join(', ')}). After you win the guard battle you may dive deeper, up to depth ${SALVAGE_DIVE.maxDepth}. Every depth is one more battle, a single wave, with no healing in between: your heroes keep the health they ended the last fight with. Every depth you clear adds its own, better chest.`),
    list(
      'Depth 1: the treasure\'s own chest.',
      ...SALVAGE_DIVE.chests.map((c, i) => `Depth ${i + 2}: ${c.gifts.map((r) => `a ${rarity(r)} item`).join(' and ')}, ${c.gold} gold.`),
    ),
    p('Surface at any time between depths to take every chest you found. If you fall in a deeper battle, you swim back up: what happened in the fight stays (lost health stays lost, fallen heroes rise wounded), the last chest you found sinks and the earlier ones come up with you. Leaving the wreck without surfacing loses the extra chests. Deeper battles give experience but no battle spoils of their own.'),
  ]);
}

/** Crown Surge + Ashen Taint (map2-quests-surge.md bölüm 2): sayılar data/campaign/crown-surge.json, global-skills.json ve statuses.json'dan. */
export function crownSurgeArticle(): WikiArticle {
  const ash = content.globalSkills[SURGE.ash];
  const salt = content.globalSkills[SURGE.salt.id];
  const st = ash?.status ? content.statuses[ash.status] : undefined;
  const mult = st?.damageDealtMult ?? 1;
  const t = SURGE.taint;
  const nodes = (drownedReachMap as unknown as { nodes: Array<{ id: string; name: string }> }).nodes;
  const chapels = (SURGE.chapels['drowned-reach'] ?? []).map((id) => nodes.find((n) => n.id === id)?.name ?? id);
  const boss = nodes.find((n) => n.id === SURGE.salt.unlock.node)?.name ?? 'the Drowned Queen';
  const price = surgeResetPrice('drowned-reach');
  return article('crown-surge', 'Campaign', 'Crown Surge and Ashen Taint', cx('mech_crown_surge', 'flame'), [
    p(`On The Drowned Reach the Crown answers your call. In a campaign battle the crown plate sits next to your other actions: the hero whose turn it is can call it, and that uses the hero's turn. Summons cannot call it. You can call the Crown once per battle, and each region gives one charge of each Surge: a charge you do not use stays in that region. A charge is spent when the battle you called it in ends, unless you lose: after a defeat the charge stays and no Taint is taken, so you can call it again on your next try.`),
    list(
      `${ash?.name ?? 'Ash Surge'}: your whole party deals ${multText(Number(mult))} damage for each hero's own next ${ash?.turns ?? 3} turns.`,
      `${salt?.name ?? 'Salt Surge'}: every ally gets a shield of ${Math.round((salt?.shieldRatio ?? 0) * 100)}% of their max HP for ${salt?.shieldTurns ?? 3} turns. It opens after you defeat ${boss}, with its own charge in each region.`,
    ),
    p(`The price is Ashen Taint. The hero who calls the Crown takes Taint, and every call costs more than the last: the first call gives ${t.firstGain}, the next ${t.firstGain + t.gainStep}, then ${t.firstGain + 2 * t.gainStep}, and so on. Each Taint lowers that hero's max HP by ${taintHpLossPct(1)}%. Taint stays with the hero, also on later maps, until the company arrives at a Chapel${chapels.length ? ` (${chapels.join(', ')})` : ''}: there all Taint is cleansed for free. The party row on the map shows a hero's Taint.`),
    ...(price
      ? [p(`Cleansing does not make the next call cheaper. For that, a Chapel's priest can ease the Crown for ${price} gold: the count of your calls starts over, so the next call gives ${t.firstGain} Taint again. This does not use the camp, and it does nothing if you have not called the Crown since the last time.`)]
      : []),
  ]);
}

/** M-J / M-K / M-L / M-M (maps-2-3.md 5; open-questions 433): sayılar data/campaign/drowned-reach.json > reach ve drowned-reach-events.json'dan. */
export function seaAndFactionsArticle(): WikiArticle {
  const m = drownedReachMap as unknown as {
    nodes: Array<{ id: string; name: string; crossing?: boolean }>;
    reach?: { caravel?: { name: string; route: string[]; gate: string }; lighthouse?: { visibility: number } };
  };
  const name = (id: string): string => m.nodes.find((n) => n.id === id)?.name ?? id;
  const crossings = m.nodes.filter((n) => n.crossing).map((n) => n.name);
  const cv = m.reach?.caravel;
  const ferry = (EVENTS['dr_ferry_office']?.choices ?? []).find((c) => c.charter && c.cost);
  const sight = m.reach?.lighthouse?.visibility ?? 0;
  return article('sea-and-factions', 'Campaign', 'Sea lanes and factions', cx('mech_sea_lanes', 'floodedplanks'), [
    p(`The isles of The Drowned Reach lie across the water. Sea lanes are drawn as dashed blue roads, and an isle you cannot reach yet says "Needs a ship". Charter a ship at the Ferry Office in Saltmere${ferry?.cost ? ` (${ferry.cost} gold, or free as a friend of the Guild)` : ''} and the sea lanes stay open for the rest of the map. The crossings (${crossings.join(', ')}) are fights on a ship's deck: some cells are closed, and patrols come back to them like any cleared battlefield.`),
    ...(cv
      ? [p(`${cv.name} sails the sea lanes as soon as they open: ${cv.route.map(name).join(', then ')}, and round again. Each time you move, it moves one stop; the sail on the map shows where it is. Sail into its stop and you must fight it, an elite battle on its deck. ${name(cv.gate)} stays closed until it is sunk.`)]
      : []),
    p("In Saltmere, the Guild and the Order of St. Brann both ask whom you serve. The choice is final. Stand with the Order: the Guild's enforcer holds Harbor Fort, the monks of Monk's Isle give you rest and a relic, merchants stock more armour and relics, and a ship costs gold. Stand with the Guild: the Inquisitor-Captain holds Harbor Fort, the wardens of Monk's Isle fight you for their storehouse, merchants stock more weapons and trinkets, and the Ferry Office charters you a ship as a favour. You may also put the choice off and come back to the square later."),
    ...(sight ? [p(`Light the lamp at Lantern Rock and you see ${sight} stop${sight === 1 ? '' : 's'} further along every road for the rest of the map.`)] : []),

  ]);
}

/** Harita 2-3 savaş kuralları (maps-2-3.md M-A / B3 / M-B / M-I / M-J): metin ve sayılar data/battle-rules.json, statuses.json, grounds.json'dan. */
export function battleRulesArticle(): WikiArticle {
  const d = content.battleRulesData;
  const tide = d.conditions['tide'];
  const soak = tide?.flood ? content.statuses[tide.flood.soak] : undefined;
  const flood = tide?.flood ? content.grounds[tide.flood.ground] : undefined;
  const o = d.objectives;
  const fill = (s: string, n: number | string) => s.replace(/\{n\}/g, String(n)).replace(/\{every\}/g, String(n));
  const deck = d.layouts['deck'];
  const storm = d.conditions['storm'];
  const urn = d.devices['tidewater_urn'];
  const stormSky = storm?.rangedAccuracy?.shots ? [...new Set(allSkills().filter((s) => s.shot && !storm.rangedAccuracy!.motions.includes(s.motion)).map((s) => s.name))] : [];
  return article('battle-rules', 'Campaign', 'Battle rules', cx('mech_battle_rules', 'floodedplanks'), [
    p('Some battles on The Drowned Reach have a rule of their own: a condition that changes the field, an objective other than defeating every enemy, closed cells, or an object your heroes can use. The rule line under the Round plate shows it during the battle with a counter; hover it for the full text. A turn here means a full turn of the battle: it passes once every fighter has acted.'),
    list(
      ...(tide ? [`${tide.name}: ${tide.text}${soak ? ` ${soak.name} lasts while you stand in the water and ends the moment you leave it.` : ''}${flood ? ` ${flood.name} cells deal no damage.` : ''}`] : []),
      // Skill'in bıraktığı su (Ömer 2026-10-27): Tide suyuyla aynı davranış; süre bırakanın turlarıyla
      ...(flood?.soak && content.statuses[flood.soak] ? [`${flood.name} water left by an enemy skill (Call the Tide, Surge, Deluge, High Tide and the like) works the same way in every battle, tide or not: anyone standing in it is ${content.statuses[flood.soak]!.name} while they stay in the water, Burning is put out and Burning Ground there goes out. It lasts for the turns the skill says.`] : []),
      ...(storm?.rangedAccuracy ? [`${storm.name}:${storm.text} It counts for shots and throws (arrows, bolts, sling stones, thrown blades and the like)${stormSky.length ? `, and for volleys of arrows falling from the sky (${stormSky.join(', ')})` : ''}, not for melee strikes or spells (a spell falling from the sky is not slowed by the wind). Hit chance is lowered by ${Math.round(-storm.rangedAccuracy.delta * 100)} points, the same way Blinded lowers it.`] : []),
      ...(urn ? [`${urn.name}: ${urn.text} It stands on a cell of your side (row ${Math.floor(urn.slot / 3) + 1}, middle lane) that no one can enter, and it cannot be attacked. Only a hero in a cell right next to it (in front, behind, above or below) can use it, as an action like Move; it holds ${urn.uses} uses. The water is the same as the tide's: ${urn.rounds} turns, and it does not wash away the tide's water or the other way round.`] : []),
      `${o.survive.name}: ${fill(o.survive.text, o.survive.rounds)}`,
      `${o.totem.name}: ${fill(o.totem.text, o.totem.every)} At most ${o.totem.maxEnemies} enemies fight at once; the totem itself does not act.`,
      `${o.hold.name}: ${o.hold.text}`,
      ...(deck ? [`${deck.name} (crossings): ${deck.text} Anyone placed on a closed cell moves to the nearest open one when the battle starts.`] : []),
    ),
  ]);
}

/** Item'ler (madde 280; sayılar data/items.json'dan): yuvalar, nadirlik, silah aileleri, loot, primary uyarısı. */
function itemsArticle(): WikiArticle {
  const gear = { slots: itemsJson.slots.map((x) => ({ id: x.id, name: x.name })), rarities: itemsJson.rarities.map((x) => ({ id: x.id, name: x.name, color: x.color })), families: itemsJson.weaponFamilies.map((x) => ({ id: x.id, name: x.name })) };
  return { ...itemsArticleBody(), gear };
}

/** Legendary item'ler (madde 296; veriden): her biri adı, yuvası, kimin taşıyabileceği ve benzersiz etkisi. */
function legendaryArticle(): WikiArticle {
  const leg = (itemsJson.items as Array<{ id: string; name: string; slot: string; rarity: string; effect?: string; usableBy?: string[]; family?: string; minChapter?: number }>).filter((d) => d.rarity === 'legendary');
  const who = (d: (typeof leg)[number]): string => {
    const cls = d.usableBy ?? (d.family ? itemsJson.weaponFamilies.find((f) => f.id === d.family)?.classes : undefined);
    return cls ? cls.map((c) => content.classes[c]?.name ?? c).join(', ') : 'everyone';
  };
  const slotName = (id: string) => itemsJson.slots.find((x) => x.id === id)?.name ?? id;
  const legColor = itemsJson.rarities.find((r) => r.id === 'legendary')?.color ?? GOLD;
  const art = article('legendary-items', 'Campaign', 'Legendary items', cx('mech_legendary', 'burst'), [
    p('Legendaries are unique, hand-made items: four fixed affixes (C, C, B, A; their values still roll) and one effect no other item has. A hero can wear only one Legendary at a time. They never come from normal loot: only from the rare-drop roll after a won battle (see Items and gear) and, in Endless, sometimes from Odo\'s cart. Their effects work the same in the campaign and in Endless, and the same effect never adds up from two items.'),
    list(
      ...leg.map((d) => {
        const aff = ((d as { affixes?: string[] }).affixes ?? []).map((id) => `${affixDef(id)?.tier ?? ''} ${affixDef(id)?.name ?? id}`).join(', ');
        const g = gripOf(d as never);
        return `${d.name} (${slotName(d.slot)}${g ? `, ${GRIP_NAME[g].toLowerCase()}` : ''}; usable by ${who(d)}${d.minChapter && d.minChapter > 1 ? `; from chapter ${d.minChapter}` : ''}): ${effectLine(d as never)?.replace(/^[^:]*: /, '') ?? ''}${aff ? ` Affixes: ${aff}.` : ''}`;
      }),
    ),
  ]);
  return { ...art, legendaries: leg.map((d) => ({ id: d.id, name: d.name, slot: d.slot, color: legColor })) };
}

/**
 * Bonus yazım kuralı (Ömer 2026-10-27): "How bonuses combine". Listeler koddan / veriden türer: toplamsal havuzlar stats.ts > ADDITIVE / AFFIX_ADD,
 * item affix'leri items.ts > partBonusForm, durumlar statuses.json *Mult alanları, pasifler bonus-text.ts > MULT_PASSIVES, yemin ve nimet verisi.
 */
function bonusRulesArticle(): WikiArticle {
  const pools = [...ADDITIVE, ...AFFIX_ADD].map((k) => ADDITIVE_LABEL[k]);
  const affixBy = (form: BonusForm) =>
    [...new Set(Object.values(ITEM_DATA.affixDefs).filter((a) => a.parts?.some((x) => !x.fixed && partBonusForm(x.to) === form && (form !== 'add' || x.to.startsWith('mod:')))).map((a) => a.name))];
  const oathAdd = OATHS.filter((o) => [o.plus, o.minus].some((e) => e.damageAdd || e.critAdd)).map((o) => o.name);
  const oathMult = OATHS.filter((o) => [o.plus, o.minus].some((e) => (e.hpMult ?? 1) !== 1 || (e.restHealMult ?? 1) !== 1 || (e.victoryHealMult ?? 1) !== 1)).map((o) => o.name);
  const shrineBy = (mult: boolean) => Object.values(WAYSHRINES).filter((w) => Object.keys(w.mods ?? {}).some((k) => k.endsWith('Mult') === mult)).map((w) => `${w.name} (${w.effect})`);
  const MULT_KEYS = ['speedMult', 'damageTakenMult', 'healTakenMult', 'armorMult', 'damageDealtMult', 'magicDealtMult', 'healDealtMult'] as const;
  const statusMults = Object.values(content.statuses)
    .filter((s) => MULT_KEYS.some((k) => s[k] !== undefined) || s.elementTakenMult)
    .map((s) => s.name);
  const multPassive = new Set<string>(MULT_PASSIVES);
  const passiveNames = [...new Set([...Object.values(content.classes).filter((c) => !c.testOnly), ...Object.values(content.mobs), ...Object.values(content.bosses)].flatMap((u) => (u.passive && multPassive.has(u.passive.effect.type) ? [u.passive.name] : [])))].sort();
  const a = content.formulas.attributes;
  const pool = 0.12 + 0.03 + 0.1;
  return article('bonus-rules', 'Damage', 'How bonuses combine', cx('mech_damage', 'sword'), [
    p('Bonuses are written in two ways, and the way they are written tells you how they combine.'),
    list(
      `"+12% damage" (a plus and a percent): an additive bonus. Every source of the same kind goes into one pool and the pool is added up first, then applied once.`,
      `"20% more damage" (more or less): a separate multiplier. It multiplies the result of everything else. "Takes 20% less damage" lowers the value the same way.`,
    ),
    p(`Additive pools (items, Hero oaths, Wayshrine blessings and levels all add into the same pool): ${pools.join(', ')}.`),
    list(
      `Item affixes: ${affixBy('add').join(', ')}.`,
      ...(oathAdd.length ? [`Hero oaths: the damage and crit chance parts of ${oathAdd.join(', ')}.`] : []),
      ...(shrineBy(false).length ? [`Wayshrine blessings: ${shrineBy(false).join(', ')}.`] : []),
    ),
    p('Separate multipliers (each one multiplies on its own):'),
    list(
      `Critical hits: ${multText(a.critMult)} damage (Crit damage affixes raise this bonus itself).`,
      "Weapon power: power% more damage (power 30 = 30% more), against your class's starter weapon.",
      `Item affixes: ${affixBy('more').concat(affixBy('less')).join(', ')}.`,
      `Statuses: ${statusMults.join(', ')}.`,
      `Passives: ${passiveNames.join(', ')}, and the Hunter's Mark primary bonus.`,
      ...(oathMult.length ? [`Hero oaths: the max health and healing parts of ${oathMult.join(', ')}.`] : []),
      ...(shrineBy(true).length ? [`Wayshrine blessings: ${shrineBy(true).join(', ')}.`] : []),
      'Element weaknesses, damage taken by summons, hero level growth of max HP and MP, and skill tree nodes written with more or less.',
    ),
    p(`Example: +12% damage from an oath, +3% from a blessing and +10% from an item add up to +25%, which is ${multText(1 + pool)} damage. A critical hit (${multText(a.critMult)}) then multiplies that: ${1 + pool} × ${a.critMult} = ${Math.round((1 + pool) * a.critMult * 1000) / 1000}, so ${multText((1 + pool) * a.critMult)} damage in total.`),
    p(`A skill tree node's ranks add up into one multiplier: a node with 6% more per rank gives ${multText(1 + 0.06 * 3)} at rank 3 and ${multText(1 + 0.06 * 5)} at rank 5 (raising the rank replaces the old bonus). Separate more/less sources multiply each other: two items with 10% more Fire damage give ${multText(1.1 * 1.1)}, and an item with 10% more plus a node at ${multText(1.18)} give ${multText(1.1 * 1.18)}. Bonuses written with + add up.`),
  ]);
}

/** Yeni affix turu 2 (Ömer 2026-10-24; item-effects.md): wiki'de yuvalarıyla anılır. */
const ROUND2_AFFIXES = ['c_healrecv', 'b_execute', 'b_startshield', 'b_killmp', 'b_killheal', 'b_shred', 'a_manashield', 'a_cdchance', 'a_overkill'];

/** Savaşta işleyen affix kuralları (Ömer 2026-10-24, yeni affix turu 2): Shredded, Mana shield, Overflow ve öldürme / şifa / cooldown affix'leri. Sayılar veriden. */
function affixRulesArticle(): WikiArticle {
  const sh = content.statuses.shredded;
  const name = (id: string, fb: string) => ITEM_DATA.affixDefs[id]?.name ?? fb;
  const below = ITEM_DATA.affixDefs.b_execute?.parts[0]?.below ?? 0.3;
  return article('item-affix-rules', 'Special rules', 'Item effects in battle', sh?.icon ?? 'guardian', [
    p('Some item affixes change how a battle plays out, not just your numbers.'),
    list(
      `${sh?.name ?? 'Shredded'} (${name('b_shred', 'Armor shred')}): each damaging skill hit lowers the enemy's Armor by the affix's amount, for ${sh?.duration ?? 2} turns. Every hit counts, so a two-hit attack adds two stacks at once. It stacks up to ${sh?.stackLimit ?? 3} times; every new stack refreshes the ${sh?.duration ?? 2} turns. Armor never goes below 0. It is a debuff: debuff resistance and immunities stop it, and cleansing removes it.`,
      `${name('a_manashield', 'Mana shield')}: a share of the damage you take is paid with MP instead of HP. It is taken after armor and shields; when your MP runs out, the rest hits your HP. The damage preview and enemy kill estimates count it too.`,
      `${name('a_overkill', 'Overflow')}: when one of your skill hits kills an enemy, a share of the damage beyond that enemy's remaining HP hits the nearest living enemy on the same side. Armor does not reduce it, it never chains, and it does not trigger life leech or other on-hit effects.`,
      `${name('b_execute', 'Executioner')}: more damage to an enemy below ${Math.round(below * 100)}% HP; the HP is checked before your hit lands.`,
      `${name('b_killmp', 'Soul harvest')} and ${name('b_killheal', "Victor's breath")}: when one of your skill hits kills an enemy you gain MP (never above your Max MP) or heal a share of your Max HP.`,
      `${name('c_healrecv', 'Healing received')}: every heal on you is stronger, life leech included; your HP per turn is not. ${name('b_startshield', 'Ready shield')}: you start each battle with a shield of a share of your Max HP (Shield power does not change it).`,
      `${name('a_cdchance', 'Fluid')}: when you use a skill with a cooldown, there is a chance the cooldown starts 1 turn shorter (never below 0). Ultimates are not affected.`,
    ),
  ]);
}

/** Affix havuzları (Ömer onayı 2026-10-11; veriden): kademe, ad, item seviyesi 10'daki orta değer, yuva sınırı. */
function affixArticle(): WikiArticle {
  const tierName: Record<string, string> = { C: 'C (every item)', B: 'B (Rare and better)', A: 'A (Epic and better)' };
  const rows = TIER_IDS.flatMap((t) =>
    Object.keys(ITEM_DATA.affixDefs)
      .filter((id) => ITEM_DATA.affixDefs[id]!.tier === t)
      .map((id) => {
        const a = ITEM_DATA.affixDefs[id]!;
        const where = a.slots ? a.slots.map((x) => itemsJson.slots.find((sl) => sl.id === x)?.name ?? x).join(', ') : 'Any slot';
        return [t, a.name, affixMidText(id, 10), where];
      }),
  );
  return article('item-affixes', 'Campaign', 'Item affixes', cx('mech_affixes', 'rune'), [
    p('Every item carries affixes in three tiers. A Common item has one C affix, Uncommon two C, Rare adds a B, Epic adds an A; a Legendary has C, C, B, A and its own effect. The same affix never appears twice on one item.'),
    list(
      ...TIER_IDS.map((t) => `${tierName[t]}: ${Object.values(ITEM_DATA.affixDefs).filter((a) => a.tier === t).length} affixes.`),
      'An affix\'s range grows with item level only (the table shows the middle of the range at item level 10); a higher rarity rolls in the upper part of that range (see Items and gear). Every slot has its own identity (see the Slots column): weapons roll elemental and physical damage, crit damage, penetration and damage to elites; shields roll armor, shield power and magic armor; helms roll HP, MP and debuff resistance; body armor rolls armor, HP, magic armor and auras; gloves roll accuracy, crit chance, life leech and mana leech; boots roll speed, evasion and quick start; trinkets roll HP and MP regeneration, healing and shield power, damage over time and summon power. Some general affixes (primary attribute, all attributes, recovery, swift ultimate, immunity, endurance) can appear anywhere. The first affix of an item comes from its base and can be outside the pool of its slot (Studded Gauntlets carry Armor).',
      'Debuff resistance is a small chance that a debuff does not land at all. Immunity names one debuff that cannot land in your first turns of each battle (resistance is not rolled then).',
      'Elemental resistance lowers the damage you take from that element: hits, damage over time and burning ground alike. Gold find adds to the gold of every battle you win (each hero who fought adds their bonus; chests are not changed). Experience only helps the hero who wears it.',
      'The front row is the foremost row that still has a living enemy; every enemy behind it is in the back row. Your column is the line of cells in front of and behind you. Your basic attack is your first skill. Thorns hurts an enemy who hits you with a melee skill.',
      `More slot affixes: ${ROUND2_AFFIXES.filter((id) => ITEM_DATA.affixDefs[id]).map((id) => `${ITEM_DATA.affixDefs[id]!.name.toLowerCase()} (${(ITEM_DATA.affixDefs[id]!.slots ?? []).map((x) => itemsJson.slots.find((sl) => sl.id === x)?.name ?? x).join(', ')})`).join(', ')}. Armor shred, Mana shield and Overflow are explained under Item effects in battle.`,
    ),
    { kind: 'table', head: ['Tier', 'Affix', 'At item level 10', 'Slots'], rows },
  ]);
}

/** Valor makalesi (data/valor.json; Ömer 2026-10-13): kazanç, iki mangal, savaşta / savaş dışında diriltme, sefer kilidi. Sayılar veriden. */
function valorArticle(): WikiArticle {
  const V = content.valorRules;
  const r = V.revive;
  const intro = (campaignMap.nodes as Array<{ id: string; name: string }>).find((n) => n.id === V.campaign.introNode)?.name ?? 'a town';
  return article('valor', 'Special rules', 'Valor', cx('mech_valor', 'ankh'), [
    p(`Valor is your company's courage, kept as embers in two iron braziers of ${V.perBrazier} embers each (${V.cap} at most). It is spent to bring a fallen hero back${V.woundHeal ? ', and on the campaign map also to heal wounds' : ''}.`),
    list(
      `Earning: every battle you win lights ${V.earn.win} ember; an elite battle ${V.earn.elite} and a boss ${V.earn.boss} instead. If no hero fell during the battle, you light ${V.earn.flawless} more (a hero raised again still counts as fallen). In the campaign each stop gives Valor once: a patrol (fighting a cleared stop again) lights none.`,
      `In battle: when a brazier is full (${r.battleCost} embers), any of your heroes can use Revive next to Rest, Skip Turn and Move. Pick a fallen ally whose body lies on your side: they rise with ${pct(r.hpRatio)} of their HP${r.mpRatio > 0 ? ` and ${pct(r.mpRatio)} of their MP` : ''} on the cell where they fell (or the nearest empty cell if someone stands there). It uses that hero's turn. A body consumed by Raise Dead cannot be raised.`,
      `Outside battle a revive is cheaper: ${r.outsideCost} embers. Tap the braziers on the campaign map or between Endless waves and choose a fallen hero; they rise with ${pct(r.hpRatio)} of their HP.`,
      ...(V.woundHeal ? [`Healing wounds (campaign map, between battles): ${V.woundHeal.outsideCost} embers heal one wound of a living hero. Their health stays at the same share of their now higher maximum. A dead hero cannot be healed this way: raise them first. Not in Endless.`] : []),
      ...(VCW ? [`Every Valor revive, in battle or outside it, also heals ${VCW === 1 ? 'one wound' : `${VCW} wounds`} of that hero (not all of them). Revive skills such as Resurrection or Raise Dead heal no wounds.`] : []),
      `Campaign: Valor is unknown until ${intro}, where the commander explains it and gives you a first full brazier (${V.campaign.gift} embers). It is saved with your journey.`,
      `Endless: Valor is there from the first wave (you start with ${V.endless.start}). The Revive reward card still works as before and costs nothing.`,
      'Only your side has Valor: enemies never use it.',
    ),
  ], '#ffb35a');
}

/** Level / XP makalesi (data/levels.json; Ömer 2026-10-17, levels.md). Sayılar veriden. */
function levelsArticle(): WikiArticle {
  const L = levelsJson;
  const m = L.nodeMult;
  const req = (ITEM_DATA.levelReq?.offset ?? 3);
  return article('levels', 'Special rules', 'Levels and XP', cx('mech_levels', 'muscle'), [
    p(`Heroes grow from Level 1 to Level ${L.campaignMaxLevel} in the campaign and up to Level ${L.maxLevel} in Endless. Each chapter of the campaign spans about ${L.levelsPerChapter} levels; a hero who plays every stop once ends a chapter a level or two below its cap, and the cap is reached by fighting again or in Endless.`),
    list(
      `XP comes from every enemy you defeat and is shared by every hero who entered the battle (a hero who falls still counts). Kills made after a hero has fallen give that hero ${pct(L.fallenShare)} of their share.`,
      `Stops: a battle gives ${pct(m.battle)}, an elite ${pct(m.elite)} and a boss ${pct(m.boss)} of the base XP; an event or treasure without a fight gives a fixed ${pct(m.event)} share.`,
      `Every stop has a level. A hero more than ${L.gap.fullBand} levels above or below it gains less XP, and nothing at ${L.gap.zeroAt} levels apart. A hero who is far behind the rest of a company that fits the stop still gains full XP, and heroes below the company's average gain a catch-up bonus (up to +${pct(L.catchUp.max)}). ${L.joinBelow ? `A new companion joins ${L.joinBelow} levels below the company's average (at least Level 1)` : "A new companion joins at the company's average level"}, with its stat points still to spend.`,
      `Each level gives ${L.statPoints.perLevel} stat point to place yourself, and every ${L.statPoints.atMultiplesOf}th level (${L.statPoints.atMultiplesOf}, ${L.statPoints.atMultiplesOf * 2}, ${L.statPoints.atMultiplesOf * 3}...) gives ${L.statPoints.bonusLevelPoints} (each point adds ${L.statPerPoint} to STR, DEX, INT or LUCK) and ${L.skillPointsPerLevel} skill point saved for the skill trees, and fully heals the hero (a fallen hero stays down). Spend points in Gear > Character: drag the point stone onto a stat or tap +, then Confirm. Points can wait.`,
      `Every level past the first also raises a hero's max HP by ${pct(L.heroGrowth.hpPerLevel)} and max MP by ${pct(L.heroGrowth.mpPerLevel)} of what stats and items give: a separate multiplier (Level 10: ${moreText(L.heroGrowth.hpPerLevel * 9)} HP, ${moreText(L.heroGrowth.mpPerLevel * 9)} MP), on top of the stat points.`,
      'A base stat can never be higher than the other three base stats together. Bonuses from items do not count for this rule.',
      `Items need a level: an item of item level N needs Level N - ${req} or higher.`,
      `Enemies have levels too: every enemy is the level of its stop (in Endless, of its wave; shown as "Lv N" above its name) and grows like a hero, with the same stat points a hero of its level has, spread to match its own build, under the same base stat rule, but without the hero's extra HP and MP. Its HP and other stats follow from its stats.`,
      `Endless: every run starts at Level 1 and heroes level up with the waves. Quick Battle and online battles are always Level 1, for heroes and enemies alike.`,
    ),
  ], '#f3d999');
}

/** Endless makalesi (data/endless.json; sürekli akış, ödül kartları, ceset + Revive kartı, tüccar, torba). Sayılar veriden. */
function endlessArticle(): WikiArticle {
  const E = endlessJson;
  const c = E.carry;
  const counts = E.enemyCount.map((x, i) => (i === 0 ? `${x.count} enemies` : `${x.count} from wave ${x.fromWave}`)).join(', ');
  const sp = E.special;
  const relics = E.relics.list.map((r) => r.name).join(', ');
  return article('endless', 'Endless', 'Endless', cx('mech_endless', 'skull'), [
    p(`Endless is a run of waves with a party of ${E.partySize}: fight wave after wave until your party falls. Your score is the wave you reached; the best ${E.highScores} runs are kept. A normal wave has ${counts}; every ${E.eliteEvery}th wave is an elite and every ${E.bossEvery}th a boss, and enemies grow a little stronger with every wave.`),
    list(
      `One long fight: what you have carries into the next wave. After a victory every survivor regains ${pct(c.victoryHeal)} of their maximum HP (${pct(c.eliteHeal ?? c.victoryHeal)} after an elite wave; a boss victory heals them ${c.bossHeal >= 1 ? 'fully' : `for ${pct(c.bossHeal)}`}). ${c.mp === 'full' ? 'Mana starts full in every wave.' : 'Mana carries over by the same share.'} Buffs, Rage, shields, summons and positions carry over; every debuff is removed. Cooldowns ${c.cooldowns === 'carry' ? 'keep running from where they were (they do not reset, and skills do not start on cooldown again)' : 'reset between waves'}. Once-per-battle effects (such as Lucky Escape) are ready again.`,
      `Wounds work as in the campaign: a hero still down when a wave is won gets back up with ${pct(c.wounds.riseRatio)} of their HP and one wound (each wound: -${pct(c.wounds.maxHpLoss)} maximum HP). With ${c.wounds.lethal} wounds a hero who falls again dies and stays on the field as a corpse in the next wave: Valor or a revive skill can bring it back as usual (not if its corpse was consumed). ${c.clearWounds.includes('feast') ? "Hero's Feast, the boss reward, heals wounds; " : ''}${c.clearWounds.includes('heal') ? 'healing cards heal wounds; ' : 'healing cards do not heal wounds; '}healing never raises the dead.`,
      `Rewards: after each wave pick one of three cards: an item card (open it and keep one of ${E.rewards.itemOptions.normal} items; ${E.rewards.itemOptions.elite} after an elite, ${E.rewards.itemOptions.boss} after a boss), gold (${E.rewards.goldBase} + ${E.rewards.goldPerWave} per wave cleared) or healing (${pct(E.rewards.healRatio)} HP to the living). After an elite ${sp.elite.itemCards === 1 ? 'the item card offers a higher item level' : `you get ${sp.elite.itemCards} item cards of a higher item level`}, ${multText(sp.elite.goldMult)} gold and Veteran's Lesson (every standing hero gains ${pct(sp.elite.xpRatio)} of the experience needed for their next level; the fallen get none); after a boss ${sp.boss.itemCards === 1 ? 'an even higher item level' : `${sp.boss.itemCards} item cards`}, ${multText(sp.boss.goldMult)} gold and a Hero's Feast (full HP and ${multText(sp.boss.feastHpMult)} max HP for ${sp.boss.feastWaves} waves). Item rarity uses the same drop table as the campaign.`,
      `Relics: after every boss, choose one of ${E.relics.offer} relics; it helps the whole party for the rest of the run (${relics}).`,
      `Merchant: every ${E.shop.every} waves Odo the Peddler sets up his cart after the reward. He offers ${E.shop.size} wares for your party, buys items from your bag for half their value and lets you buy back the last ${E.shop.buybackSize} items you sold on this visit at the same price (the list is gone once you leave). Reroll wares costs ${E.shop.rerollCost} gold and brings a new set.`,
      `Bag: items you win or buy go to a bag of ${E.bagSize}; equip them between waves in Gear. With a full bag you cannot take an item card or buy until you discard or sell something; a rare drop waits on its card until you make room, or is left behind.`,
    ),
  ], '#c9a0ff');
}

/** Nadirliğe göre zar tabanı (items.json > affixRules.rollFloorByRarity): "Common anywhere in the range, Uncommon in its top 75%..." */
function rollFloorText(): string {
  const floors = (itemsJson.affixRules as { rollFloorByRarity?: Record<string, number> }).rollFloorByRarity ?? {};
  return itemsJson.rarities
    .map((r) => {
      const fl = floors[r.id] ?? 0;
      return fl > 0 ? `${r.name} in its top ${num(Math.round((1 - fl) * 1000) / 10)}%` : `${r.name} anywhere in the range`;
    })
    .join(', ');
}

/** Ortak nadir düşüş zarı (items.json > rareDrop; madde 297): taban şans, kötü şans koruması, Endless dalga eki, Legendary payı. */
function rareDropText(): string {
  const c = RARE.chance;
  const leg = RARE.split.legendary;
  const ch1 = RARE.chapterLegendaryMult['1'] ?? 1;
  const e = RARE.endless;
  return `Rare drops: every won battle, in the campaign and in Endless, rolls once more for a rare find: ${pct(c.battle, 1)} after a normal fight, ${pct(c.elite, 1)} after an elite and ${pct(c.boss, 1)} after a boss. Every win without one adds ${pct(RARE.pityPerMiss, 1)} (bad-luck protection; it resets when a rare item drops), and in Endless every wave${e.perWaveFrom ? ` after wave ${e.perWaveFrom}` : ''} adds ${pct(e.perWave, 1)}. For now ${pct(leg)} of rare finds are Legendaries${ch1 !== 1 ? ` (${pct(leg * ch1, 1)} in ${campaignMap.title.charAt(0)}${campaignMap.title.slice(1).toLowerCase()})` : ''}; the rest is kept for set items, which are not in the game yet. In Endless, Legendaries can drop from wave ${e.legendaryFromWave}, and from then on Odo has a ${pct(e.merchant.chance)} chance per visit to offer one at ${num(e.merchant.priceMult)}x its value.`;
}

/** Tutuş ve ikinci el (Ömer 2026-10-12; veriden): hangi silah tek el / çift el / yay / tılsım, ikinci ele ne takılır. */
function gripText(): string {
  const names = (g: Grip) => ITEM_DATA.items.filter((d) => d.slot === 'weapon' && gripOf(d) === g).map((d) => d.name).join(', ');
  const shields = ITEM_DATA.items.filter((d) => d.slot === 'offhand');
  const who = (fam: string | undefined) => (ITEM_DATA.weaponFamilies.find((f) => f.id === fam)?.classes ?? []).map((c) => content.classes[c]?.name ?? c).join(', ');
  const offFams = ITEM_DATA.weaponFamilies.filter((f) => f.offhand);
  return `Grip and the Off-hand slot: every weapon is one-handed, two-handed, a bow or a charm. A hero with a one-handed weapon (or no weapon) can also fill the Off-hand slot with a shield (${shields.map((d) => d.name).join(', ')}; ${who(shields[0]?.family)}) or a second ${offFams.map((f) => f.name.toLowerCase().replace(/s$/, '')).join(' / ')} (${offFams.map((f) => who(f.id)).join(', ')}). Two-handed weapons, bows and charms need both hands: equipping one sends the off-hand item back to the bag (if the bag is full, make room first). An off-hand item adds its affixes like any other slot. Two-handed: ${names('two')}. Bows: ${names('bow')}. Charms: ${names('charm')}. Everything else is one-handed.`;
}

/** Kalkan bloğu (Ömer 2026-10-18): kural metni, sayılar veriden (kalkan tabanları, c_block, tavan). */
function blockText(): string {
  const shields = ITEM_DATA.items.filter((d) => d.slot === 'offhand' && d.implicitBase?.length);
  const vals = shields.map((d) => d.implicitBase![0]!);
  const cap = (ITEM_DATA.caps as Record<string, number | undefined>)['block'];
  return `Block: a hero with a shield can block an enemy's physical hit (melee or ranged) after it lands: ${Math.min(...vals)}-${Math.max(...vals)}% from the shield itself (fixed per shield, it does not grow with item level) plus the shield-only Block affix${cap !== undefined ? `, at most ${cap}% in total` : ''}. A blocked hit deals no damage and applies none of the skill's effects; "Block" shows above the target. Spells, damage over time, burning ground, Doom and ${UNBLOCKABLE_LABEL} skills cannot be blocked. When a guardian takes part of a hit (Guard), the guardian's own shield can block that share.`;
}

/** "Unblockable" etiketi (Ömer 2026-10-18): Block maddesinin altındaki kural; skill adları veriden (src/engine/unblockable.ts). */
function unblockableText(): string {
  const tagged = allSkills().filter((s) => isUnblockableSkill(s));
  const boss = tagged.filter((s) => s.telegraph).map((s) => s.name);
  const other = tagged.filter((s) => !s.telegraph).map((s) => s.name);
  return `${UNBLOCKABLE_LABEL}: a skill with the ${UNBLOCKABLE_LABEL} tag (shown in its tooltip) can never be blocked by a shield. Every boss warning (a strike marked on the board a turn in advance) is ${UNBLOCKABLE_LABEL}: the marked cells show a broken shield and "${UNBLOCKABLE_LABEL}", so stepping out of the area is the only way to avoid it.${boss.length ? ` Boss warnings: ${boss.join(', ')}.` : ''}${other.length ? ` Other ${UNBLOCKABLE_LABEL} skills: ${other.join(', ')}.` : ''}`;
}

/** Silah tiplerinin güç / hız profili (Ömer 2026-10-27; sayılar veriden). */
function typeProfileText(): string {
  const parts = WEAPON_TYPES.flatMap((t) => {
    const d = ITEM_DATA.weaponTypes[t];
    if (!d || (d.power === undefined && d.spdLess === undefined)) return [];
    const p = d.power !== undefined && d.power !== 1 ? `${Math.round(Math.abs(d.power - 1) * 100)}% ${d.power > 1 ? 'more' : 'less'} power` : '';
    const sp = d.spdLess ? `${d.spdLess}% less Speed` : '';
    return [`${d.name.toLowerCase()}s ${[p, sp].filter(Boolean).join(' and ')}`];
  });
  const plain = WEAPON_TYPES.filter((t) => !ITEM_DATA.weaponTypes[t]?.power && !ITEM_DATA.weaponTypes[t]?.spdLess).map((t) => `${ITEM_DATA.weaponTypes[t]?.name.toLowerCase()}s`);
  return `Weapon types change power and speed: ${parts.join(', ')}; ${plain.join(', ')} are plain. Speed penalties multiply with other speed bonuses and apply before a hero's natural pace.`;
}

/** Çift el yakın dövüş kuralı (Ömer 2026-10-27; sayılar veriden). */
function twoHandMeleeText(): string {
  const m = ITEM_DATA.twoHandMelee;
  if (!m) return '';
  const gm = ITEM_DATA.weaponPower.grip.two * m.power;
  const names = ITEM_DATA.items.filter((d) => isTwoHandMelee(d)).map((d) => d.name);
  return `Two-handed melee weapons (${names.join(', ')}; not staves or bows) hit ${Math.round((m.power - 1) * 100)}% harder on top of the two-handed bonus, carry ${Math.round((gm - 1) * 100)}% more of their type's base stat than a one-handed weapon of the same item level, and have ${m.name}: ${m.spdLess}% less Speed (on top of their type's speed penalty).`;
}

/** Silah gücü, örtük statlar, başlangıç silahı ve seviye şartı (Item Güçlendirme, Ömer 2026-10-17; sayılar veriden). */
function weaponPowerText(): string[] {
  const w = ITEM_DATA.weaponPower;
  const item = (id: string) => ITEM_DATA.items.find((d) => d.id === id)!;
  const pw = (id: string, L: number) => weaponPowerOf(item(id), L);
  const st = ITEM_DATA.starterWeapons;
  const starters = Object.entries(st.classes)
    .map(([c, id]) => `${content.classes[c]?.name ?? c}: ${item(id).name}`)
    .join(', ');
  const imp = (k: string, L: number) => {
    const d = ITEM_DATA.implicits[k];
    return d ? fillValues(d.text, implicitValues(d, L)) : '';
  };
  const R = ITEM_DATA.levelReq;
  // Başlangıç ikinci eli (Ömer 2026-10-23; items.json > starterOffhands)
  const offStarters = Object.entries(ITEM_DATA.starterOffhands?.classes ?? {})
    .map(([c, id]) => `${content.classes[c]?.name ?? c}: ${item(id).name}`)
    .join(', ');
  return [
    `Weapon power: every weapon has a base power that grows with its item level (${w.base} + ${w.perIlvl} per item level for a one-handed sword: ${pw('arming_sword', 1)} at item level 1, ${pw('arming_sword', 10)} at 10, ${pw('arming_sword', 30)} at 30). Skill damage is multiplied by (1 + power / 100), staffs and charms included; healing and shields are not. Two-handed weapons and bows have ${Math.round((w.grip.two - 1) * 100)}% more power than one-handed ones because they block the off-hand; charms ${Math.round((w.grip.charm - 1) * 100)}% more. ${typeProfileText()} A dagger in the off-hand adds ${Math.round(w.offhandShare * 100)}% of its power. Rarity does not change power: it only adds affixes.`,
    `Base stats by weapon type (at item level 10; values with a per-level part grow with item level): ${WEAPON_TYPES.map((t) => `${ITEM_DATA.weaponTypes[t]?.name ?? t}: ${ITEM_DATA.implicits[t]?.name ?? ''}, ${imp(t, 10)}`).join('; ')}. ${twoHandMeleeText()} A shield's base value is its block chance, shown like weapon power (${ITEM_DATA.items.filter((d) => d.slot === 'offhand' && d.implicitBase?.length).map((d) => `${d.name} ${d.implicitBase![0]}%`).join(', ')}; fixed, it does not grow with item level), on top of its affixes (its main affix is Armor). Base stats count toward the gear limits.`,
    `Starter weapons: every hero starts with a Common item level ${st.ilvl} weapon of their class (${starters}). Damage is measured against it: with the starter weapon a hero deals exactly the damage of Quick Battle, a stronger weapon deals more, and a hero with no weapon deals less. Starter weapons are normal items: you can sell or replace them.`,
    ...(offStarters ? [`Starter off-hands: heroes whose class fights with a one-handed weapon and an off-hand also start with a Common off-hand (${offStarters}). A second dagger adds its off-hand share of power; a shield adds its block chance.`] : []),
    `Level requirement: an item needs hero level item level - ${R.offset} (at least ${R.min}; item level 12 needs level ${levelRequirement(12)}). Below that it cannot be equipped: its card shows "Requires Level X" in red, the comparison is still shown, and Equip best skips it.`,
  ];
}

function itemsArticleBody(): WikiArticle {
  const L = itemsJson.loot;
  const fams = itemsJson.weaponFamilies.map((x) => `${x.name} (${x.classes.map((c) => content.classes[c]?.name ?? c).join(', ')})`).join('; ');
  return article('items', 'Campaign', 'Items and gear', 'ui:gear', [
    p(`Heroes in the campaign and in Endless wear gear in ${itemsJson.slots.length} slots: ${itemsJson.slots.map((x) => x.name).join(', ')}. Items carry affixes: stats, damage bonuses and small rules (see Item affixes). They never add flat damage: weapons multiply it through their power. Quick Battle and multiplayer do not use items (every hero counts as holding their class's starter weapon).`),
    list(
      `Rarity sets how many affixes an item has, one more per step: ${itemsJson.rarities.map((x) => `${x.name} ${x.tiers.join(', ')}${x.id === 'legendary' ? ' + its unique effect' : ''}`).join('; ')}. The first affix is the item's main one (a weapon's is its damage type).`,
      `Each affix value is rolled within a small range when the item drops (shown as e.g. "+4 Max HP (3–5)"); the roll is kept for good. The range itself grows only with item level, but rarity decides how high the roll lands: ${rollFloorText()}. An item's gold value follows its power (${itemsJson.budget.goldPerIP} gold per power point).`,
      `Limits: all of a hero's gear together adds at most +${itemsJson.caps.crit}% crit chance, +${itemsJson.caps.accuracy}% accuracy, +${itemsJson.caps.evasion}% evasion and +${itemsJson.caps.spd} SPD${(itemsJson.caps as Record<string, number | undefined>)['block'] !== undefined ? `, +${(itemsJson.caps as Record<string, number | undefined>)['block']}% block chance (shields)` : ''}${itemsJson.caps.mpCost !== undefined ? `, at most -${itemsJson.caps.mpCost}% MP cost` : ''}${itemsJson.caps.resist !== undefined ? ` and at most ${itemsJson.caps.resist}% debuff resistance` : ''}; anything above that is lost.`,
      (() => {
        const lo = dropChances(0);
        const hi = dropChances(999, 'boss');
        const f = (c: Record<string, number>) => `${Math.round(c.common!)}% Common, ${Math.round(c.uncommon!)}% Uncommon, ${Math.round(c.rare!)}% Rare, ${Math.round(c.epic! * 10) / 10}% Epic`;
        return `Drop rarity uses one table for campaign loot and Endless rewards and wares: at the start about ${f(lo)}. Higher item levels and elite or boss fights shift it slightly, never past about ${f(hi)}. Legendaries are never in this table: they come only from rare drops.`;
      })(),
      rareDropText(),
      `Weapons come in families and each class uses only its own: ${fams}. Every other slot fits everyone.`,
      gripText(),
      ...weaponPowerText(),
      `Loot: a campaign victory drops about ${num(L.perPartyMember.battle * (L.dropMult ?? 1))} items per hero in the fight (elites ${num(L.perPartyMember.elite * (L.dropMult ?? 1))}, bosses ${num(L.perPartyMember.boss * (L.dropMult ?? 1))}), chests at least one item; their rarity comes from the drop table, but an elite's items are at least Uncommon and a boss's at least Rare. Odo the merchant fills the gaps. Drops are the same on every difficulty. Winning the same battle again gives less (${L.repeat.map((x) => `${Math.round(x.items * 100)}%`).join(' / ')}).`,
      `The bag holds ${itemsJson.bag} items. When it is full, loot that does not fit waits on the Spoils card: discard something to make room and take it, or it is left behind when you continue. You can discard items in the Gear screen too (Rare and better ask first). Open Gear from the Party window or in a town; Equip best picks the strongest usable items for you.`,
      "Primary bonus: if an item would raise another stat above a hero's primary stat, the primary bonus (Resilience, Hunter's Mark, Mana Echo or Lucky Escape) switches off. The Gear screen warns you before you equip it.",
      'Enemies grow a little stronger the further you travel, to match the gear you are expected to have found.',
    ),
  ]);
}

/**
 * Boss makaleleri (data/bosses; The Bridge Warden): sayılar veriden (can, faz eşikleri, skill açıklamaları skill-info'dan, Mooring canı/zırhı).
 * Mekanikler: telgraf (gecikmeli saldırı), fazlar, bağlı yardımcı (Iron Mooring), Stagger, Overextended.
 */
function bossArticles(): WikiArticle[] {
  const out: WikiArticle[] = [];
  for (const def of Object.values(content.bosses)) {
    const b = def.boss;
    if (!b) continue;
    const anchor = b.anchor ? content.bosses[b.anchor.unit] : undefined;
    const pctOf = (x: number) => `${Math.round(x * 100)}%`;
    const skillLines = def.skills.flatMap((id) => {
      const sk = content.skills[id];
      if (!sk) return [];
      const info = describeSkill(sk, def.stats, f, unitDefs(), effectDefs(), def.range);
      const when = sk.minPhase && sk.minPhase > 1 ? ` (from phase ${sk.minPhase})` : '';
      return [`${def.skills.indexOf(id) + 1}. ${sk.name} [${skillRange(sk)}]${when}:${info.lines.join('; ')}${sk.cooldown ? `; cooldown ${sk.cooldown}` : ''}`];
    });
    // Kendi atan bağlı nesne (boss.anchor.strike; Harpoon Ballista): nesnenin skill satırı, nesnenin statlarıyla
    const strike = b.anchor?.strike ? content.skills[b.anchor.strike] : undefined;
    if (strike && anchor) {
      const info = describeSkill(strike, anchor.stats, f, unitDefs(), effectDefs(), anchor.range);
      skillLines.push(`${anchor.name}: ${strike.name} [${skillRange(strike)}] (fires on its own at the start of each of ${def.name}'s turns, at the cell of your weakest hero):${info.lines.join('; ')}`);
    }
    const anchorCount = Math.max(1, ...Object.values(ENCOUNTERS).filter((e) => e.units.some((u) => u.class === def.id)).map((e) => e.units.filter((u) => u.class === b.anchor?.unit).length));
    const anchorText = !anchor
      ? ''
      : strike
        ? ` ${anchorCount > 1 ? `${anchorCount} ${anchor.name}s` : `A ${anchor.name}`} (${anchor.stats.hp} HP, ${anchor.stats.armor} armor) ${anchorCount > 1 ? 'stand' : 'stands'} behind it: ${anchorCount > 1 ? 'they' : 'it'} cannot be healed, and every turn ${anchorCount > 1 ? 'each' : 'it'} marks a hero's cell and fires into it a turn later.`
        : ` ${anchorCount > 1 ? `${['Two', 'Three', 'Four'][anchorCount - 2] ?? anchorCount} ${anchor.name}s` : `A ${anchor.name}`} (${anchor.stats.hp} HP, ${anchor.stats.armor} armor) ${anchorCount > 1 ? 'stand' : 'stands'} behind it: ${anchorCount > 1 ? 'they never act' : 'it never acts'} and cannot be healed.`;
    const over = b.afterResolve ? content.statuses[b.afterResolve.status] : undefined;
    const accCritNames = content.formulas.ccImmunity?.accuracyCrit ? Object.values(content.statuses).filter((d) => !d.cc && isAccuracyCritDebuff(d)).map((d) => d.name) : [];
    out.push({
      ...article(`boss-${def.id}`, 'Bosses', def.name, def.logo, [
        p(`${def.name}${b.where ? ` ${b.where}` : ''}. It has ${def.stats.hp} HP (before difficulty), ${b.anchor ? 'acts more than once each turn' : `acts more than once each turn from phase ${(b.phases ?? []).findIndex((ph) => (ph.actionsPerTurn ?? 1) > 1) + 2}`} and fights in phases.${anchorText}`),
        list(
          // boss'a özel uyarılar (data/bosses > boss.notes: telgraflar ve kaçış yolu)
          ...(b.notes ?? []),
          ...(b.phases ?? []).map((ph, i) => `Phase ${i + 2} at ${pctOf(ph.at)} HP: "${ph.banner}"${ph.actionsPerTurn ? `; ${ph.actionsPerTurn} actions per turn` : ''}${ph.powerMult ? `; hits ${pctOf(ph.powerMult - 1)} harder` : ''}${ph.armorMult ? `; ${multText(ph.armorMult)} armor` : ''}${ph.breakAnchors ? `; the ${anchor?.name ?? 'Mooring'}${anchorCount > 1 ? 's snap' : ' snaps'}` : ''}${Object.entries(ph.cooldowns ?? {}).map(([id, n]) => `; ${content.skills[id]?.name ?? id} ${(ph.cadence ?? []).includes(id) ? `every ${n} turns` : `cooldown ${n}`}`).join('')}${ph.riseAllies ? `; a fallen ${content.mobs[ph.riseAllies.unit]?.name ?? ph.riseAllies.unit} rises again with ${pctOf(ph.riseAllies.hpRatio)} HP` : ''}.`),
          'A single attack can cross only one phase threshold; extra damage stops just above the next one.',
          // Madde 271/272: CC + isabet/kritik cezaları (Blinded, Jinxed) + Omen'in Misfortune'u; adlar veriden
          `Bosses are immune to crowd control (Stun, Slow, Chilled, Silence, Taunt, pulls and pushes)${accCritNames.length ? ` and to accuracy/crit penalties (${accCritNames.join(', ')})` : ''}: the hit still lands, the effect does not ("Immune").${content.formulas.ccImmunity?.omenCrit ? ' Omens still stack and Doom still strikes, but Misfortune does not lower a boss\'s crit chance.' : ''} Damage-over-time and curses (Wound, Omen, Withering, burning ground) still work.`,
          ...(b.anchor ? [`Each standing ${anchor?.name ?? b.anchor.unit} gives +${b.anchor.armorAdd} armor and +${b.anchor.magicArmorAdd} magic armor.${b.anchor.stagger ? ` Breaking one staggers ${def.name} (it loses its next action)` : ''}${b.anchor.cancel.length ? `${b.anchor.stagger ? ' and' : ' Breaking one'} cancels a pending ${b.anchor.cancel.map((s) => content.skills[s]?.name ?? s).join(' / ')}` : ''}${b.anchor.stagger || b.anchor.cancel.length ? '.' : ''}`] : []),
          ...(over ? [`${over.name}: after a collapse ${def.name} ${over.text.charAt(0).toLowerCase()}${over.text.slice(1)}.`] : []),
          ...(b.passives ?? []).map((x) => `${x.name}: ${x.text}`),
        ),
        list(...skillLines),
      ]),
      avatarId: def.spriteId,
    });
  }
  return out;
}

/** Mob pasiflerinin Mechanics satırları (her pasif bir kez; sahipleri adlarıyla). Metin describePassive'ten (sayılar veriden). */
function mobPassiveLines(): string[] {
  const byId = new Map<string, { text: string; owners: string[] }>();
  for (const m of Object.values(content.mobs)) {
    if (!m.passive) continue;
    const row = byId.get(m.passive.id) ?? { text: `${m.passive.name}: ${describePassive(m.passive, m.stats, f)}`, owners: [] };
    row.owners.push(m.name);
    byId.set(m.passive.id, row);
  }
  return [...byId.values()].map((r) => `${r.text} (${r.owners.join(', ')})`);
}

/** Mob ailesi görünen adları (docs/design/campaign/fill-plan.md 2.2). */
const MOB_FAMILY: Record<string, string> = { bandits: 'Bandits', branns_order: "Brann's Order", beasts: 'Beasts', ember_cult: 'Ember Cult', guardians: 'Guardians', hexes: 'Hexes', undead: 'Undead', fanatics: 'Fanatics', morvane_army: "Morvane's Army", corsairs: 'Corsairs', sunken_court: 'Sunken Court' };

/** Sefer mobları (data/mobs; N1): aile başına bir makale (Enemies). Sayılar veriden (zorluk öncesi can; skill açıklamaları skill-info'dan). */
function mobArticles(): WikiArticle[] {
  const byFamily = new Map<string, CombatantDef[]>();
  for (const def of Object.values(content.mobs)) {
    const fam = def.family ?? 'other';
    byFamily.set(fam, [...(byFamily.get(fam) ?? []), def]);
  }
  return [...byFamily].map(([fam, defs]) => {
    const famName = MOB_FAMILY[fam] ?? fam;
    const art = article(`enemies-${fam}`, 'Enemies', famName, defs[0]!.logo, [
      p(`Campaign enemies of the ${famName} family. HP is before campaign and difficulty scaling.`),
      ...defs.map((def) =>
        list(
          `${def.name} (${def.role ?? 'Enemy'}): ${def.stats.hp} HP, ${def.stats.armor} armor, speed ${def.stats.spd}.`,
          ...def.skills.flatMap((id) => {
            const sk = content.skills[id];
            if (!sk) return [];
            const info = describeSkill(sk, def.stats, f, unitDefs(), effectDefs(), def.range);
            return [`${sk.name} [${skillRange(sk)}]:${info.lines.join('; ')}${sk.cooldown ? `; cooldown ${sk.cooldown}` : ''}`];
          }),
          ...(def.passive ? [`${def.passive.name} (passive)${def.passive.text ? `: ${def.passive.text}` : ''}`] : []),
        ),
      ),
    ]);
    return { ...art, avatarId: defs[0]!.spriteId };
  });
}

/** Sefer zorluk satırı (campaign.json > difficulties): her zorluğun metni + düşman güçlendirmesi yüzde olarak. */
function difficultyText(): string {
  type Mods = { hpMult?: number; powerMult?: number; statMult?: number };
  const pct = (m: number | undefined, label: string) => (m && m !== 1 ? `${multText(m)} ${label}` : '');
  const mods = (m?: Mods) => [pct(m?.hpMult, 'HP'), pct(m?.statMult, 'stats'), pct(m?.powerMult, 'power')].filter(Boolean).join(', ');
  return Object.values(campaignConfig.difficulties as Record<string, { name: string; text: string; enemy?: Mods; enemyTier?: Record<string, Mods> }>)
    .map((d) => {
      const extra = [mods(d.enemy) && `enemies ${mods(d.enemy)}`, ...Object.entries(d.enemyTier ?? {}).map(([t, m]) => mods(m) && `${t === 'boss' ? 'bosses' : `${t}s`} another ${mods(m)}`)].filter(Boolean).join('; ');
      return `${d.name}: ${d.text.replace(/\.$/, '')}${extra ? ` (${extra})` : ''}.`;
    })
    .join(' ');
}

// ---------------------------------------------------------------- durumlar, zeminler, elementler

/** Durumu uygulayan item etkileri (items.json > effects[].value.status ya da dizi) -> o etkiyi taşıyan item'lerin adları ("Emberbrand (Legendary)"). */
export function statusItemSources(statusId: string): string[] {
  const effects = itemsJson.effects as Record<string, { name: string; value?: unknown }>;
  const hits = Object.entries(effects).filter(([, e]) => {
    const vals = Array.isArray(e.value) ? e.value : [e.value];
    return vals.some((v) => !!v && typeof v === 'object' && (v as { status?: string }).status === statusId);
  }).map(([id]) => id);
  const items = (itemsJson.items as Array<{ name: string; rarity: string; effect?: string }>).filter((d) => d.effect && hits.includes(d.effect));
  return items.map((d) => `${d.name} (${cap(d.rarity)} item)`);
}

export function buildWikiStatuses(): WikiStatus[] {
  const skills = allSkills();
  return buildStatuses().map((s: StatusEntry) => {
    const usedBySkills = skills.filter((k) => skillStatusIds(k).includes(s.id)).map(skillRefOf);
    const usedByItems = statusItemSources(s.id);
    return { id: s.id, name: s.name, type: s.type, icon: s.icon, color: s.color, text: s.text, usedBy: s.usedBy.map((u) => u.name), usedBySkills, usedByItems, search: searchText(s.name, s.type, s.text, ...s.usedBy.map((u) => u.name), ...usedBySkills.map((u) => u.name), ...usedByItems) };
  });
}

export function buildWikiGrounds(): WikiGround[] {
  const skills = allSkills();
  return buildGrounds().map((g) => {
    const heal = content.grounds[g.id]?.heal === true; // D11: şifa zemini (Holy Ground)
    // Genel zemin kuralı (Ömer 2026-10-29): zemin kendi durumunu içindekine verir; hasar / şifa o durumdan (tur başında bir tik)
    const def = content.grounds[g.id];
    const stId = def?.status ?? def?.soak;
    const st = stId ? content.statuses[stId] : undefined;
    const water = !!def?.soak;
    const who = heal ? 'Allies' : water ? 'Everyone' : 'Enemies';
    const what = heal ? 'heal at the start of each of their turns' : st?.dot || (!water && !def?.directTick && !st) ? `take ${g.element} (magic) damage at the start of each of their turns` : '';
    const text = st
      ? `Leaves ${g.name} on the area. ${who} standing there are ${st.name} while they stay inside (${st.text.charAt(0).toLowerCase()}${st.text.slice(1)})${what && !st.dot && !heal ? `; ${what}` : ''}${def?.directTick ? `; the ground itself also deals ${g.element} damage at the start of each of their turns` : ''}.${heal ? '' : ' A damaging ground deals its damage through the status, once per turn.'}`
      : `Leaves ${g.name} on the area. Enemies standing there take ${g.element} (magic) damage at the start of each of their turns.`;
    const usedBySkills = skills.filter((k) => skillGroundIds(k).includes(g.id)).map(skillRefOf);
    return { ...g, usedBy: g.usedBy.map((u) => u.name), usedBySkills, text, search: searchText(g.name, g.element, text, ...g.usedBy.map((u) => u.name)) };
  });
}

export function buildElements(): WikiElement[] {
  const users = new Map<string, SkillDef[]>();
  for (const s of allSkills()) for (const el of skillElements(s)) users.set(el, [...(users.get(el) ?? []), s]);
  return Object.keys(ELEMENT_COLOR).map((id) => {
    const weakTo = Object.entries(f.weaknesses).flatMap(([tag, m]) => {
      const mult = (m as Record<string, number>)[id];
      return mult === undefined ? [] : [{ tag, mult, units: Object.values(unitDefs()).filter((d) => d.tags?.includes(tag)).map((d) => d.name) }];
    });
    const defs = users.get(id) ?? [];
    const skills = defs.map((s) => s.name);
    return { id, name: cap(id), color: ELEMENT_COLOR[id]!, icon: elementIcon(id), skills, skillRefs: defs.map(skillRefOf), weakTo, search: searchText(id, ...skills, ...weakTo.map((w) => w.tag)) };
  });
}

export function buildElementTable(): { head: string[]; rows: string[][] } {
  const tags = Object.keys(f.weaknesses);
  const els = Object.keys(ELEMENT_COLOR);
  return { head: ['Target type', ...els.map(cap)], rows: tags.map((t) => [cap(t), ...els.map((e) => { const m = (f.weaknesses[t] as Record<string, number> | undefined)?.[e] ?? 1; return m === 1 ? '—' : multText(m); })]) };
}

// ---------------------------------------------------------------- hepsi

/** Codex > Lessons maddesinin kimliği (makale kimlikleriyle çakışmasın). */
export const lessonEntryId = (id: string): string => `lesson:${id}`;

/** Mentor dersleri (data/tutorial.json): her ders bir makale; Codex yalnızca görülenleri listeler. */
export function buildLessons(): WikiArticle[] {
  return LESSONS.map((l) => {
    const paras = lessonCodexText(l);
    return {
      id: lessonEntryId(l.id),
      title: l.title,
      group: l.group,
      icon: cx('nav_lessons', 'book'),
      accent: '#d9b26a',
      blocks: paras.map((text) => ({ kind: 'p' as const, text })),
      search: `${l.title} ${l.group} ${paras.join(' ')} lesson tutorial`.toLowerCase(),
    };
  });
}

export function buildWiki(files: WikiFiles): WikiCatalog {
  const avatars = avatarMap(files.avatars);
  return {
    gettingStarted: buildGettingStarted(),
    lessons: buildLessons(),
    classes: buildClasses(files),
    summons: buildSummons(files),
    skills: buildSkills(),
    mechanics: buildMechanics().map((a) => (a.avatarId ? { ...a, avatarUrl: avatars[a.avatarId] ?? null } : a)),
    statuses: buildWikiStatuses(),
    grounds: buildWikiGrounds(),
    elements: buildElements(),
    elementTable: buildElementTable(),
  };
}
