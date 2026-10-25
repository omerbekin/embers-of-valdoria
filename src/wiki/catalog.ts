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
import { maps23On } from '../ui/maps23-flag';
import itemsJson from '../../data/items.json';
import { affixMidText, effectLine } from '../progression/item-text';
import { ITEMS as ITEM_DATA, TIER_IDS, affixDef, gripOf, GRIP_NAME, implicitValues, levelRequirement, weaponPowerOf, type Grip } from '../progression/items';
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
const SMITH_CFG = (campaignConfig as unknown as { blacksmith: { ilvlPerChapter: number; temper: { legendaryMult: number }; reforge: { growth: number } } }).blacksmith;
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
const allSkills = (): SkillDef[] => Object.entries(content.skills).map(([id, s]) => ({ ...s, id: s.id ?? id })).filter((s) => !isTestSkill(s.id));
const unitDefs = (): Record<string, CombatantDef> => ({ ...content.classes, ...content.summons, ...content.bosses, ...content.mobs });
const effectDefs = () => ({ statuses: content.statuses, grounds: content.grounds });

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
 * "Silence and Drain Field" makalesi (madde 260): yüzdeyle mana yakma, mana boşalma zarı (onEmpty) ve Silence durumu (blocksMpSkills). Sayılar veriden;
 * susturan durum yoksa makale yine yazılır (genel kural), skill listesi boş kalır.
 */
function silenceArticle(): WikiArticle {
  const sil = Object.values(content.statuses).find((d) => d.blocksMpSkills);
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
  return article('silence', 'Special rules', 'Silence and Drain Field', sil?.icon ?? 'manaburn', [
    p(`${name}: the unit cannot use any skill that costs MP. Skills that cost nothing (a basic attack), skills paid with Rage or HP, and the actions Rest, Skip Turn and Move still work. A silenced unit with nothing else to do simply attacks for free or uses an action.`),
    p(`It lasts through the unit's next turn: the timer counts down when the silenced unit's turn ENDS (not when it starts), so a 1-turn ${name} covers the whole of its next turn. It is a debuff: a cleanse (such as Mana Barrier) removes it, and Resilience cannot shorten a 1-turn debuff. The badge next to the HP bar shows it.`),
    list(...(lines.length ? lines : ['No skill silences yet.'])),
    p(`The AI values a silence by the move it takes away: the best MP skill the enemy could have paid for on that turn, compared with its best free move, times the chance; the extra damage counts as damage.`),
  ], sil?.color ?? '#9b59d0');
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
    p(`${s.name}: ${s.cost.spendAll ? `spends ALL your Rage (at least ${s.cost.amount}); ` : ''}${e.powerPerRage ? `deals ${pct(e.power)} ${e.scale.toUpperCase()} plus ${pct(e.powerPerRage)} ${e.scale.toUpperCase()} for every Rage spent` : `deals ${pct(e.power)} ${e.scale.toUpperCase()}`}${e.executeBonus ? `, and up to +${pct(e.executeBonus)} more the more HP the target is missing (counted before the hit)` : ''}. Waiting for more Rage, or for a wounded target, makes it hit harder.`)));
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
  const detonators = allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'detonate' }> => e.type === 'detonate' && e.status === omenId).map((e) => `${s.name} (x${num(e.mult)})`));
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
        `Timer runs out: the Omens do not fade quietly. At the start of the cursed unit's turn (after ground and Withering damage, before regeneration) they burst into Doom, one share per Omen${doom.expireMult !== 1 ? ` (x${num(doom.expireMult)})` : ''}, using the curser's Luck and crit chance from when the last Omen was added. If the unit dies earlier that turn, no Doom happens.`,
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
  const wk = Object.entries(f.weaknesses).flatMap(([tag, m]) => Object.entries(m).map(([el, mult]) => `${cap(tag)} units take x${num(mult)} ${el} damage.`));
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
          .map((s) => `${s.name} (${s.armorMult !== undefined ? `Armor x${num(s.armorMult)}` : `damage taken x${num(s.damageTakenMult!)}`})`)
          .join(', ')}. They multiply the target's current armor or the damage it takes; several stack by multiplying.`,
        // Altıncı tur: verilen hasarı azaltan durumlar (statuses.json damageDealtMult / magicDealtMult; Weakened)
        `Damage-dealt effects: ${Object.values(content.statuses)
          .filter((s) => s.damageDealtMult !== undefined || s.magicDealtMult !== undefined)
          .map((s) => `${s.name} (damage dealt x${num(s.damageDealtMult ?? s.magicDealtMult!)} unless its source says otherwise; some sources weaken only magic damage)`)
          .join(', ')}. They multiply the damage the affected unit deals, in the battle preview too.`,
        `Weaknesses: ${wk.join(' ')} See the Elements section.`,
        `Crit: a crit multiplies the final damage by x${num(a.critMult)} (chance ${pct(a.critChanceBase)} + ${pct(a.critChancePerLuck, 1)} per Luck). The multiplier never changes; Luck only adds chance. Crits also apply to healing, never to shields.`,
        `Summoned units take x${num(f.summon.damageTakenMultiplier)} damage.`,
      ),
    ]),
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
      p('Some skills leave an effect on the ground of the target area (see Statuses & Grounds). Enemy units standing there take magic damage at the start of each of their own turns.'),
      p('The damage is fixed when the effect is created, cannot crit and cannot be dodged. The duration counts the caster\'s turns, and the effect ends if the caster falls.'),
      p("Exception: the ember a dying enemy leaves behind (Last Ember) burns under the hero who killed it; its duration counts that hero's turns and it ends if that hero falls."),
      // şifa zemini (grounds.json > heal): yalnızca veride varsa yazılır (Holy Ground: Judgment kendi tarafına, 2026-10-24 open-questions 416/8)
      ...(Object.values(content.grounds).some((g) => g.heal) ? [p(`Healing ground: ${Object.values(content.grounds).filter((g) => g.heal).map((g) => g.name).join(', ')} hurts no one. Instead, allies of the caster standing there heal a fixed amount at the start of each of their own turns (it cannot crit; Wound and other healing cuts still apply). It only lands on your own side.`)] : []),
    ], '#ff7a1a'),
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
      list(...Object.values(content.globalSkills).filter((d) => d.kind !== 'valor').map((d) => {
        const info = describeGlobalSkill(d, f);
        return `${info.name}: ${[info.summary, ...info.lines].map((s) => s.replace(/\.$/, '')).join('. ')}.`;
      })),
      p(`The enemy team uses these actions too: it rests when a strong skill is out of MP, waits when nothing useful can be done, ${f.range?.enabled ? 'moves fragile units out of enemy range, and steps closer when none of its skills can reach an enemy' : 'moves fragile units out of melee reach'}.`),
    ], '#9ec5e8'),
    valorArticle(),
    levelsArticle(),
    article('backstab', 'Special rules', 'Strikes from behind and sure crits', 'backstab', [
      p(`Some assassin skills slip behind the target, stab it in the back and return. ${f.range?.enabled ? 'They still need range like any skill' : 'They ignore the melee row rules (any row can be targeted)'}, but only a target with an empty cell right behind it can be chosen: the next row back, same lane, must hold no living unit. A corpse or a cell kept for a fallen ally does not block it; a target in the back row can never be chosen ("No room behind the target"), and one with a living unit behind it is "shielded from behind". Moving units (or a unit falling) can open the way. The caster is drawn there only for the strike: the formation does not change.`),
      p(`Some hits are always critical: no crit roll is made and the crit multiplier (x${num(a.critMult)}) always applies. The hit roll still happens, so they can still miss or be dodged.`),
      p(`Skills that strike from behind: ${allSkills().filter((s) => s.requiresOpenBehind).map((s) => s.name).join(', ') || 'none yet'}. Always critical: ${allSkills().filter((s) => s.effects.some((e) => e.type === 'damage' && e.guaranteedCrit)).map((s) => s.name).join(', ') || 'none yet'}.`),
      p(`Some skills carry extra crit chance of their own: it is added to the caster's crit chance (statuses included) for that skill's hits only. ${allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'damage' }> => e.type === 'damage' && !!e.critBonus && !e.guaranteedCrit).slice(0, 1).map((e) => `${s.name} +${pct(e.critBonus!)}`)).join(', ') || 'None yet'}.`),
    ], '#c0203a'),
    article('status-bonus', 'Special rules', 'Bonus damage against weakened targets', 'opportunist', [
      p('Some passives deal extra damage to a target that already suffers from certain statuses. The bonus multiplies every hit (a crit multiplies on top of it) and shows in the damage preview.'),
      list(...Object.values(content.classes).filter((c) => c.passive?.effect.type === 'bonusVsStatus').map((c) => `${c.name}, ${c.passive!.name}: ${describePassive(c.passive!, c.stats, f)}`)),
    ], '#c9a227'),
    ...curseArticles(),
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
      p(`Summoned units fight on your side and stand on your own side of the board, but are not part of the chosen team. They take x${num(f.summon.damageTakenMultiplier)} damage, may only exist for a number of turns, and fall as soon as their summoner falls.`),
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
      list(...allSkills().flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'heal' }> => e.type === 'heal' && !!e.missingHpBonus).map((e) => `${s.name}: up to +${pct(e.missingHpBonus!)} healing on a nearly dead ally.`))),
    ], '#fff0a0'),
    article('half-turn', 'Special rules', 'Half-turn skills', cx('mech_half_turn', 'hourglass'), [
      p(`Using a skill normally takes a whole turn: the unit's action counter drops by ${f.turn.threshold}. A half-turn skill only takes half of that, so the unit's next turn comes in half the usual time (Haste, Slow and the Skip Turn boost still change how fast the counter fills). The turn bar shows this as soon as the skill is used.`),
      p('Cooldown and MP work as usual, and a half-turn skill always has a cooldown, so it cannot be chained. In test mode there is no turn order, so this has no effect there.'),
      p(`Half-turn skills: ${allSkills().filter((s) => s.turnCost !== undefined && s.turnCost < 1).map((s) => s.name).join(', ') || 'none yet'}.`),
    ], '#c9a227'),
    article('control', 'Special rules', 'Taunt, guard and mana burn', 'taunt2', [
      p(`Taunt forces enemies to target the taunting unit for some turns (it can end early if the unit loses enough HP, or at once if the unit is hit by a control status: ${Object.values(content.statuses).filter((d) => d.breaksTaunt).map((d) => d.name).join(', ') || 'none'}). Guard makes a protector take a share of the damage dealt to another ally (a unit cannot guard itself); a guard that covers a row (Close Ranks) protects every ally in the chosen ally's row (the user excluded). A unit holds one guard at a time (a new one replaces the old), the share passes on as it is (the protector's armor does not cut it again) and it stops while the protector is down. Mana burn removes MP from a target (and may give some of it to the caster) without hurting its HP.`),
      p(`Taunt: ${skillsWith((e) => e.type === 'taunt').join(', ') || 'none'}. Guard: ${skillsWith((e) => e.type === 'guard').join(', ') || 'none'}. Mana burn: ${skillsWith((e) => e.type === 'manaBurn').join(', ') || 'none'}.`),
      p('Some mana burns take a share of the target\'s maximum MP instead of a fixed amount: a big mana pool loses more. See Silence for what happens when a target runs dry.'),
      p(`A mana burn that is part of an attack only works if the attack hits: on a miss or a dodge no MP is burned or stolen${allSkills().some((s) => s.name === 'Mana Steal') ? ' (Mana Steal gains nothing)' : ''}.`),
    ]),
    silenceArticle(),
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
          // Serbest dolaşım ve devriye (campaign-dev, roadmap 2.1-2.3 A; sayılar data/campaign/campaign.json > replay)
          `Free roaming: after you form your company in the first village, roads no longer close. Walk back along any road, or tap a far stop to travel there in one go through stops you have cleared (nothing happens on the way). A stop you have seen stays on the map. Patrols return to cleared battlefields: a cleared Battle, Elite or Guarded treasure can be fought again (same foes, new dice). Each repeat pays full gold and loot but less XP: ${REPLAY_PCTS.join(', ')} of the first victory's XP, then ${REPLAY_PCTS.at(-1) ?? '100%'} from then on. A patrol never lights Valor: each stop gives Valor only for its first victory. The chest of a Guarded treasure and an Elite's first-victory item come only once. Bosses, events, plain treasures and the tutorial road are not repeated. The Patrol badge on a stop shows the XP its next fight pays. Retreating from a patrol calls it off and you may move on, but what happened in the fight stays: lost health stays lost and heroes who fell rise wounded (see Health and wounds).`,
          `Stops: Battle, Elite (a stronger leader), Boss, Guarded treasure (a battle, then a chest), Event (a short story stop; a guarded one is a battle first), Town (rest, recruits and the Blacksmith), Rest (a free camp: living heroes regain ${Math.round(campaignConfig.rest.heal * 100)}% of their maximum HP) and Merchant (Odo sells gear for the region's item level, buys your spare items and lets you buy them back).`,
          `Your party: you start alone as a Warrior or an Archer, a companion joins in the forest, and at the first village the escort stays behind and you form a new company of three from every class, starting at Level 1. Skip tutorial on the Choose your hero window starts you straight in that village to form your company (the gold and gear of the tutorial road are still in your bag). The tutorial road and the first stops past the village are all Level 1; from there the stops grow in level toward the final castle. The first hero you pick leads; the leader walks in front on the map. Another hero joins when you leave the city.`,
          `Health carries over between battles. After a victory the survivors regain ${pct(r.victoryHeal)} of their maximum HP, ${pct(r.eliteVictoryHeal ?? r.victoryHeal)} after an elite, and a boss victory heals them fully. Mana starts full in every battle. If the whole party falls, the battle is lost and you go back to your last save.`,
          `Wounds: a hero who is still down when a battle is won gets back up with ${pct(r.wounds.riseRatio)} of their HP and one wound. A hero raised during the battle (Valor, a revive skill) takes no wound; a Valor revive also heals ${VCW === 1 ? 'one wound' : `${VCW} wounds`} (revive skills do not). Each wound lowers maximum HP by ${pct(r.wounds.maxHpLoss)} (${r.wounds.lethal} wounds: -${pct(r.wounds.maxHpLoss * r.wounds.lethal)}). A hero with ${r.wounds.lethal} wounds who falls again and is still down at the end of a won battle dies: they enter the next battles as a corpse until Valor raises them${VCW ? ` (healing ${VCW === 1 ? 'one wound' : `${VCW} wounds`})` : ''}. Retreating from a patrol follows the same rule.`,
          `Resting: your first arrival in each town is its free rest: the living are back to full health and their wounds are healed. Coming back heals nothing by itself; resting by the town fire again costs gold (${campaignConfig.rest.price.base + campaignConfig.rest.price.perChapter} in the first chapter) and also heals wounds. A camp (such as Riverside Camp) is free and heals ${pct(campaignConfig.rest.heal)} of maximum HP, but does not heal wounds. Boss healing does not heal wounds either. Resting never raises the dead: only Valor, or a revive skill in battle, brings a dead hero back.`,
          `Blacksmith (in towns, for gold only): Temper raises an item's level by 1, up to the best item level of the current chapter (${SMITH_CFG.ilvlPerChapter} per chapter); its weapon power and every property grow with it, and its level requirement rises too. Any rarity can be tempered; each step costs gold in line with how much a level adds to the item's worth on average, rising gently with item level (a property that does not grow with item level, like a shield's block, adds nothing to the price), and a Legendary costs ${num(SMITH_CFG.temper.legendaryMult)}x. Reforge works on Epic items only: pick a property other than the first (main) one and it is rerolled into a property of the same tier, which can be the same one with a new value. A reforge costs the item's full merchant price, and each reforge of the same item costs ${num(SMITH_CFG.reforge.growth)}x the one before.`,
          `Saving: there are ${r.slots} campaign slots, one journey each, and every journey keeps its own saves. Normal saves after every victory and whenever you press Save on the map (up to ${r.maxSaves.normal} saves per journey; the oldest is replaced). Ironman keeps a single save, written only after a victory. If you are defeated, you go back to your last save.`,
          'Retreat to Map (battle Menu): the battle is paused, not reset, and the game saves (in Ironman too). Your party stays at that stop; moving on, Gear, Formation and Valor revives are locked until you finish it. Tap the stop and choose Resume Battle to continue on the same turn. Winning or losing ends the pause; a defeat works as usual.',
          `Difficulty: Easy, Medium or Hard, chosen when the journey starts; it cannot be changed later. ${difficultyText()}`,
        ),
      ]),
      ...(drownedReachShown() ? [drownedReachArticle(), battleRulesArticle()] : []),
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

/** Harita 2 (maps-2-3.md 3; Adım 1 iskeleti): sayılar harita verisinden. */
export function drownedReachArticle(): WikiArticle {
  const m = drownedReachMap as unknown as { title: string; nodes: Array<{ type: string; optional?: boolean; spoke?: boolean; name: string }>; regions: Array<{ id: string; title: string; tagline?: string }>; stopsPerRun: number };
  const name = m.title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  const first = m.nodes[0]?.name ?? 'the start';
  const boss = m.nodes.find((n) => n.type === 'boss' && /final/i.test((n as { subtitle?: string }).subtitle ?? ''))?.name ?? 'the last throne';
  const towns = m.nodes.filter((n) => n.type === 'town').map((n) => n.name);
  const pockets = m.nodes.filter((n) => n.optional).length;
  const spokes = m.nodes.filter((n) => n.spoke).length;
  return article('drowned-reach', 'Campaign', name, cx('mech_campaign', 'boot'), [
    p(`${name} is the second map of the campaign. When Lord Morvane falls, the company can go on down the Valdren to the sea instead of ending the journey: the heroes, their levels, gear, bag and gold all come along. ${m.nodes.length} stops in ${m.regions.length} regions; a run from ${first} to ${boss} passes about ${m.stopsPerRun} of them.`),
    list(...m.regions.map((r) => `${r.title}${r.tagline ? `: ${r.tagline}` : ''}`)),
    p(`Towns: ${towns.join(', ')}. Saltmere is the hub: ${spokes} side streets branch off it; each is a single stop, and you walk back to the square to go on. ${pockets} dashed roads lead to optional pockets, as on the first map.`),
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
  return article('battle-rules', 'Campaign', 'Battle rules', cx('mech_battle_rules', 'floodedplanks'), [
    p('Some battles on The Drowned Reach have a rule of their own: a condition that changes the field, an objective other than defeating every enemy, or closed cells. The rule line under the Round plate shows it during the battle with a counter; hover it for the full text. A turn here means a full turn of the battle: it passes once every fighter has acted.'),
    list(
      ...(tide ? [`${tide.name}: ${tide.text}${soak ? ` ${soak.name} lasts while you stand in the water and ${tide.flood!.soakTurns} turns after you leave it.` : ''}${flood ? ` ${flood.name} cells deal no damage.` : ''}`] : []),
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
    p(`Valor is your company's courage, kept as embers in two iron braziers of ${V.perBrazier} embers each (${V.cap} at most). It is spent only to bring a fallen hero back.`),
    list(
      `Earning: every battle you win lights ${V.earn.win} ember; an elite battle ${V.earn.elite} and a boss ${V.earn.boss} instead. If no hero fell during the battle, you light ${V.earn.flawless} more (a hero raised again still counts as fallen). In the campaign each stop gives Valor once: a patrol (fighting a cleared stop again) lights none.`,
      `In battle: when a brazier is full (${r.battleCost} embers), any of your heroes can use Revive next to Rest, Skip Turn and Move. Pick a fallen ally whose body lies on your side: they rise with ${pct(r.hpRatio)} of their HP${r.mpRatio > 0 ? ` and ${pct(r.mpRatio)} of their MP` : ''} on the cell where they fell (or the nearest empty cell if someone stands there). It uses that hero's turn. A body consumed by Raise Dead cannot be raised.`,
      `Outside battle a revive is cheaper: ${r.outsideCost} embers. Tap the braziers on the campaign map or between Endless waves and choose a fallen hero; they rise with ${pct(r.hpRatio)} of their HP.`,
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
      `Stops: a battle gives ${num(m.battle)}x, an elite ${num(m.elite)}x and a boss ${num(m.boss)}x XP; an event or treasure without a fight gives a fixed ${num(m.event)}x share.`,
      `Every stop has a level. A hero more than ${L.gap.fullBand} levels above or below it gains less XP, and nothing at ${L.gap.zeroAt} levels apart. A hero who is far behind the rest of a company that fits the stop still gains full XP, and heroes below the company's average gain a catch-up bonus (up to +${pct(L.catchUp.max)}). ${L.joinBelow ? `A new companion joins ${L.joinBelow} levels below the company's average (at least Level 1)` : "A new companion joins at the company's average level"}, with its stat points still to spend.`,
      `Each level gives ${L.statPoints.perLevel} stat point to place yourself, and every ${L.statPoints.atMultiplesOf}th level (${L.statPoints.atMultiplesOf}, ${L.statPoints.atMultiplesOf * 2}, ${L.statPoints.atMultiplesOf * 3}...) gives ${L.statPoints.bonusLevelPoints} (each point adds ${L.statPerPoint} to STR, DEX, INT or LUCK) and ${L.skillPointsPerLevel} skill point saved for the skill trees, and fully heals the hero (a fallen hero stays down). Spend points in Gear > Character: drag the point stone onto a stat or tap +, then Confirm. Points can wait.`,
      `Every level past the first also raises a hero's max HP by ${pct(L.heroGrowth.hpPerLevel)} and max MP by ${pct(L.heroGrowth.mpPerLevel)} of what stats and items give (Level 10: +${pct(L.heroGrowth.hpPerLevel * 9)} HP, +${pct(L.heroGrowth.mpPerLevel * 9)} MP), on top of the stat points.`,
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
      `Rewards: after each wave pick one of three cards: an item card (open it and keep one of ${E.rewards.itemOptions.normal} items; ${E.rewards.itemOptions.elite} after an elite, ${E.rewards.itemOptions.boss} after a boss), gold (${E.rewards.goldBase} + ${E.rewards.goldPerWave} per wave cleared) or healing (${pct(E.rewards.healRatio)} HP to the living). After an elite ${sp.elite.itemCards === 1 ? 'the item card offers a higher item level' : `you get ${sp.elite.itemCards} item cards of a higher item level`}, ${num(sp.elite.goldMult)}x gold and Veteran's Lesson (every standing hero gains ${pct(sp.elite.xpRatio)} of the experience needed for their next level; the fallen get none); after a boss ${sp.boss.itemCards === 1 ? 'an even higher item level' : `${sp.boss.itemCards} item cards`}, ${num(sp.boss.goldMult)}x gold and a Hero's Feast (full HP and +${pct(sp.boss.feastHpMult - 1)} max HP for ${sp.boss.feastWaves} waves). Item rarity uses the same drop table as the campaign.`,
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
    return d ? d.text.replace('{0}', String(implicitValues(d, L)[0] ?? 0)) : '';
  };
  const R = ITEM_DATA.levelReq;
  // Başlangıç ikinci eli (Ömer 2026-10-23; items.json > starterOffhands)
  const offStarters = Object.entries(ITEM_DATA.starterOffhands?.classes ?? {})
    .map(([c, id]) => `${content.classes[c]?.name ?? c}: ${item(id).name}`)
    .join(', ');
  return [
    `Weapon power: every weapon has a base power that grows with its item level (${w.base} + ${w.perIlvl} per item level for a one-handed weapon: ${pw('woodcutters_axe', 1)} at item level 1, ${pw('woodcutters_axe', 10)} at 10, ${pw('woodcutters_axe', 30)} at 30). Skill damage is multiplied by (1 + power / 100), staffs and charms included; healing and shields are not. Two-handed weapons and bows have ${Math.round((w.grip.two - 1) * 100)}% more power than one-handed ones because they block the off-hand; charms ${Math.round((w.grip.charm - 1) * 100)}% more; daggers ${Math.round((1 - (w.family?.['daggers'] ?? 1)) * 100)}% less. A dagger in the off-hand adds ${Math.round(w.offhandShare * 100)}% of its power. Rarity does not change power: it only adds affixes.`,
    `Base stats: daggers also carry ${imp('daggers', 10)}, charms ${imp('charms', 10)} (at item level 10, growing with item level). A shield's base value is its block chance, shown like weapon power (${ITEM_DATA.items.filter((d) => d.slot === 'offhand' && d.implicitBase?.length).map((d) => `${d.name} ${d.implicitBase![0]}%`).join(', ')}; fixed, it does not grow with item level), on top of its affixes (its main affix is Armor). Base stats count toward the gear limits.`,
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
    const over = b.afterResolve ? content.statuses[b.afterResolve.status] : undefined;
    const accCritNames = content.formulas.ccImmunity?.accuracyCrit ? Object.values(content.statuses).filter((d) => !d.cc && isAccuracyCritDebuff(d)).map((d) => d.name) : [];
    out.push({
      ...article(`boss-${def.id}`, 'Bosses', def.name, def.logo, [
        p(`${def.name}${b.where ? ` ${b.where}` : ''}. It has ${def.stats.hp} HP (before difficulty), ${b.anchor ? 'acts more than once each turn' : `acts more than once each turn from phase ${(b.phases ?? []).findIndex((ph) => (ph.actionsPerTurn ?? 1) > 1) + 2}`} and fights in phases.${anchor ? ` Two ${anchor.name}s (${anchor.stats.hp} HP, ${anchor.stats.armor} armor) stand behind it: they never act and cannot be healed.` : ''}`),
        list(
          // boss'a özel uyarılar (data/bosses > boss.notes: telgraflar ve kaçış yolu)
          ...(b.notes ?? []),
          ...(b.phases ?? []).map((ph, i) => `Phase ${i + 2} at ${pctOf(ph.at)} HP: "${ph.banner}"${ph.actionsPerTurn ? `; ${ph.actionsPerTurn} actions per turn` : ''}${ph.powerMult ? `; hits ${pctOf(ph.powerMult - 1)} harder` : ''}${ph.armorMult ? `; armor x${ph.armorMult}` : ''}${ph.breakAnchors ? '; the Moorings snap' : ''}.`),
          'A single attack can cross only one phase threshold; extra damage stops just above the next one.',
          // Madde 271/272: CC + isabet/kritik cezaları (Blinded, Jinxed) + Omen'in Misfortune'u; adlar veriden
          `Bosses are immune to crowd control (Stun, Slow, Silence, Taunt, pulls and pushes)${accCritNames.length ? ` and to accuracy/crit penalties (${accCritNames.join(', ')})` : ''}: the hit still lands, the effect does not ("Immune").${content.formulas.ccImmunity?.omenCrit ? ' Omens still stack and Doom still strikes, but Misfortune does not lower a boss\'s crit chance.' : ''} Damage-over-time and curses (Wound, Omen, Withering, burning ground) still work.`,
          ...(b.anchor ? [`Each standing ${anchor?.name ?? b.anchor.unit} gives +${b.anchor.armorAdd} armor and +${b.anchor.magicArmorAdd} magic armor. Breaking one staggers the Warden (it loses its next action) and cancels a pending Breaking Span.`] : []),
          ...(over ? [`${over.name}: after a collapse the Warden ${over.text.charAt(0).toLowerCase()}${over.text.slice(1)}.`] : []),
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
const MOB_FAMILY: Record<string, string> = { bandits: 'Bandits', branns_order: "Brann's Order", beasts: 'Beasts', ember_cult: 'Ember Cult', guardians: 'Guardians', hexes: 'Hexes', undead: 'Undead', fanatics: 'Fanatics', morvane_army: "Morvane's Army" };

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
  const pct = (m: number | undefined, label: string) => (m && m !== 1 ? `${m > 1 ? '+' : ''}${Math.round((m - 1) * 100)}% ${label}` : '');
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
    const text = heal ? `Leaves ${g.name} on the area. Allies standing there heal at the start of each of their turns; enemies are not affected.` : `Leaves ${g.name} on the area. Enemies standing there take ${g.element} (magic) damage at the start of each of their turns.`;
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
  return { head: ['Target type', ...els.map(cap)], rows: tags.map((t) => [cap(t), ...els.map((e) => `x${num((f.weaknesses[t] as Record<string, number> | undefined)?.[e] ?? 1)}`)]) };
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
