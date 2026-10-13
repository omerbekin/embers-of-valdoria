/**
 * WIKI kataloğu (oyun içi sağ üst kitap simgesi): class'lar, çağrılar, skill'ler, stat/mekanik metinleri, durumlar, zeminler ve
 * elementler. Saf TypeScript: Phaser'a ve DOM'a bağımlı DEĞİL (testlenebilir). Her şey veriden / motordan türetilir
 * (data/*.json, formulas.json, skill-info.ts, stat-info.ts); sayılar elle yazılmaz. Yeni class/skill/durum/zemin eklenince wiki kendiliğinden güncellenir.
 * Elle yazılan tek şey, mekanik açıklamalarının CÜMLELERİdir (şablon): yeni mekanik/özel kural/pasif eklenince
 * Mechanics bölümündeki ilgili metin güncel mi kontrol edilmelidir (CLAUDE.md kuralı).
 */
import { statName } from '../ui/stat-name';
import { sortByPrimary } from '../game/class-order';
import campaignConfig from '../../data/campaign/campaign.json';
import campaignMap from '../../data/campaign/valdoria.json';
import itemsJson from '../../data/items.json';
import { affixMidText, effectLine } from '../progression/item-text';
import { ITEMS as ITEM_DATA, TIER_IDS, affixDef, gripOf, GRIP_NAME, type Grip } from '../progression/items';
import { dropChances } from '../progression/drop';
import { RARE } from '../progression/rare';
import endlessJson from '../../data/endless.json';
import { BATTLE_SPEEDS } from '../ui/battle-speed';
import layout from '../../data/battle-layout.json';
import { applySummonVariant, content, describeGlobalSkill, describePassive, describeRage, describeSkill, describeStat, TARGET_TEXT } from '../engine';
import { TARGET_BADGE } from '../engine/skill-info';
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

const f: Formulas = content.formulas;
const pct = (v: number, digits = 0): string => `${(v * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
const num = (v: number): string => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));

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
import { elementIcon, skillElements, skillRange, type SkillRange } from '../ui/skill-tags';
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
  const info = describeSkill(skill, statsFor(skill), f, unitDefs(), effectDefs());
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
  const passive = def.passive ? { name: def.passive.name, icon: def.passive.icon, text: describePassive(def.passive, st, f) } : null;
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

function article(id: string, group: string, title: string, icon: string, blocks: WikiBlock[], accent = GOLD, shapes?: WikiArticle['shapes']): WikiArticle {
  const text = blocks.flatMap((b) => (b.kind === 'p' ? [b.text] : b.kind === 'list' ? b.items : [...b.head, ...b.rows.flat()]));
  return { id, group, title, icon, accent, blocks, ...(shapes?.length ? { shapes } : {}), search: searchText(title, group, ...text) };
}

/** Veride kullanılan her şekil için bir örnek şema (aynı rozetli skill'ler tek kez): etiket = rozet (Row, Column, Block 2x3, Cross). */
/** Area shapes makalesi: hangi skill hangi şekli kullanıyor (veriden; test class'ları hariç). */
/** Wiki şeması: alan skill'leri (area_enemies ve iki tahtaya atılabilen area_any / Smoke Bomb) şekil şeması taşır. */
function wikiMiniGrid(skill: SkillDef): MiniShape | null {
  return skillMiniGrid(skill, f.formation); // area_enemies and area_any (either side note)
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
    article('goal', 'Basics', 'The goal', 'sword', [
      p(`Pick a team of ${teamSize()} different classes (${pool} classes to choose from) and fight an enemy team that is picked the same way. Teams do not have to be this size: a side can field anywhere from 1 to ${f.formation.rows * f.formation.lanes} units. Defeat every enemy unit to win; if your whole team falls, you lose.`),
      p('You control your own team; the enemy team is played by the computer. Pick a skill, then pick its target (hover a target to preview the expected result).'),
    ]),
    article('turns', 'Basics', 'Turn order and the SPD counter', 'hourglass', [
      p(`Every unit has a SPD (speed) stat: ${num(a.spdBase)} + ${num(a.spdPerDex)} per point of Dexterity. Each tick, every unit's action counter fills by its SPD; the first one to reach ${f.turn.threshold} acts, then its counter restarts.`),
      p(`Faster units therefore act more often, not just first. The bar at the top shows the next ${f.turn.queueLength} units in order, and it updates live when speed changes (for example Haste or Slow).`),
      p('A stunned unit skips its next turn. Status durations count down on the turns of the unit that carries them.'),
      p(debuffStackingText()),
      p(turnTimingText()),
    ]),
    article('formation', 'Basics', 'Formation and rows', 'team', [
      p(`Each side stands on a ${rows} x ${lanes} grid: ${rows} rows deep and ${lanes} lanes wide (${rows * lanes} cells). A normal team of ${teamSize()} leaves cells empty; a side of ${rows * lanes} fills the whole grid. Empty cells matter: a unit can step onto one with the Move action (see Actions in the Mechanics section).`),
      p(`Melee skills can only reach the first ${f.formation.meleeRows === 1 ? 'occupied row' : `${f.formation.meleeRows} occupied rows`} of the enemy team, so the units in front shield the ones behind them. Ranged and magic skills reach anyone. Some melee skills say they charge or reach further; their description tells you.`),
      ...Object.values(content.statuses).filter((d) => d.reachBonus).map((d) => p(`${d.name} adds ${d.reachBonus} row${(d.reachBonus ?? 0) > 1 ? 's' : ''} to melee reach while it lasts: melee skills also hit the row behind the front row, and the unit can strike from one row further back. Skills that say reach bonuses do not extend them (Whirlwind) keep their normal reach.${d.attackCharges ? ` It lasts for ${d.attackCharges} attacks, not turns: every damaging skill the unit uses spends one charge (a multi-hit or area skill counts as one attack).` : ''}`)),
      p('Melee classes are placed in front. A melee unit only stands in a back row once the rows before it are full, so fighters in front, archers and mages behind is the normal picture.'),
      p('Area skills hit a group of cells around the cell you pick, in a fixed shape (a whole row, a whole column, a block or a cross; see Area shapes in the Mechanics section). You can pick an empty cell too, as long as the shape still covers an enemy.'),
    ]),
    article('mana', 'Basics', 'MP and cooldowns', statIconName('mp'), [
      p(`Skills cost MP. Every unit has ${a.mpBase} base MP (the same for all classes) plus ${a.mpPerInt} per point of Intelligence. At the start of its own turn, every unit regains MP equal to Intelligence x ${num(a.mpRegenPerInt)} (rounded; 0 Intelligence regains nothing) and HP equal to Strength x ${num(a.hpRegenPerStr)}. The Rest action restores extra MP on demand.`),
      p('This regeneration shows on the bars, not as floating numbers: the HP or MP bar flashes briefly and a small faint "+1" or "+2 MP" appears next to it. The combat log lists it on its own line.'),
      p('Strong skills also have a cooldown: after you use one, you cannot use it again for that many of your own turns. The skill button shows the turns left.'),
      p(`Some powerful skills (usually the fourth one) start the battle on cooldown: they are not ready until the unit has taken up to ${f.cooldown.maxInitial} turns. The skill description says "Opens on cooldown" for these. Summoned units do not have this delay.`),
    ]),
    article('screen', 'Basics', 'Reading the screen', 'info', [
      list(
        'Hover a unit to see its stats; hover a skill to see its description and cost.',
        'Keys 1-4 pick the acting unit\'s skills.',
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
        return `${s.name}: burns ${burn}. Every enemy left with 0 MP (or already at 0) rolls on its own: ${pct(em.chance)} chance to be ${st} for ${em.turns} turn${em.turns > 1 ? 's' : ''} and take ${pct(em.damage.power)} ${em.damage.scale.toUpperCase()} ${em.damage.element ?? 'physical'} damage (it cannot miss, but it can crit).`;
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
  return article('multiplayer', 'Basics', 'Multiplayer', 'team', [
    p('Main Menu > Multiplayer plays a Quick Battle against a friend online. One player presses Host lobby and gets a 6-letter lobby code; the friend opens the game, presses Join lobby and types the code, or simply opens the invite link (Copy invite link).'),
    p('When both players press Ready, each picks a team of 4 for their own side: the host plays the left side, the guest the right side. The other team stays hidden until both are ready, then the battle starts the same way on both screens.'),
    p("In battle you only control your own units, on their turns; during the other player's turns the panel says Opponent's turn. Both games check every move, so a move that breaks the rules is refused."),
    p('If the connection drops, the battle pauses and a countdown runs. A player who comes back within 60 seconds (even after reloading the page) continues where the battle stopped; otherwise the player who stayed wins. Leaving the battle on purpose gives the win to the other player.'),
    p('After the battle: Rematch (both must agree; you pick teams again) or Back to lobby.'),
    p('You can set a short name in the lobby (Change name); only your opponent sees it. The random seed of each battle is made from a secret number of each player, so neither player can pick it. If a direct link between the two browsers is not possible, the game connects through the server instead.'),
  ]);
}

/** Debuff'ların yığılmaması (Ömer 2026-10-10): kural statuses.json > stack'ten; yığılan istisnalar (Omen) adıyla sayılır. */
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
    article('damage-formula', 'Damage', 'Damage formula', 'sword', [
      p('Damage = skill power x attribute x scaling, plus any extra the skill adds, then reduced by armor, then multiplied by weakness, then by the crit.'),
      list(
        `Power and attribute: every skill names the attribute it scales with (STR, INT, DEX or LUCK). A power of 60% with 40 INT is 24 base damage. Scaling per attribute: ${(['str', 'int', 'dex', 'luck'] as const).map((s) => `${STAT_LABEL[s]} x${num(f.scaling[s])}`).join(', ')}.`,
        `Variance: every hit rolls within plus or minus ${pct(f.damage.variance)}; damage is never below ${f.damage.minDamage}.`,
        `Armor: physical damage is reduced by Armor, every other element by Magic armor. Reduction = armor / (armor + ${k}), so ${k} armor blocks 50% and more armor gives less and less. Some skills ignore a share of armor (the description says so).`,
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
        'Heals, shields, buffs, effects on yourself and ground effects (poison, fire on the ground) never miss.',
        ...Object.values(content.statuses).filter((d) => d.accuracyDelta || d.evasionDelta).map((d) => `${d.name} (${d.type}): ${d.accuracyDelta ? `accuracy ${d.accuracyDelta > 0 ? '+' : '-'}${pct(Math.abs(d.accuracyDelta))}` : `evasion ${d.evasionDelta! > 0 ? '+' : '-'}${pct(Math.abs(d.evasionDelta!))}`} while it lasts. The hit chance still stays between 0% and ${pct(f.hit.max)}.`),
      ),
    ]),
    article('ground', 'Damage', 'Ground effects', 'flame', [
      p('Some skills leave an effect on the ground of the target area (see Statuses & Grounds). Enemy units standing there take magic damage at the start of each of their own turns.'),
      p('The damage is fixed when the effect is created, cannot crit and cannot be dodged. The duration counts the caster\'s turns, and the effect ends if the caster falls.'),
    ], '#ff7a1a'),
  );
  // Özel mekanikler
  const bets = betLines();
  out.push(
    article('gamble', 'Special rules', 'Bets (Gambler)', 'dice', [
      p('A bet skill puts part of the caster\'s HP or MP at stake before the hit, then rolls a die. On a win the hit is multiplied (and may grow with the stake); on a loss the hit is weaker or misses, and the stake is lost. A won bet keeps the stake.'),
      list(...bets.map((b) => b.text)),
    ], '#b8892e'),
    article('rage', 'Special rules', 'Rage', 'rage', [
      p(`Some classes have a Rage bar next to their HP and MP: ${Object.values(content.classes).filter((c) => c.maxRage !== undefined).map((c) => c.name).join(', ') || 'none yet'}.`),
      list(...describeRage(f)),
      p(`Skills that cost Rage: ${allSkills().filter((s) => s.cost.resource === 'rage').map((s) => `${s.name} (${s.cost.amount})`).join(', ') || 'none yet'}.`),
    ], '#c0392b'),
    article('area-shapes', 'Special rules', 'Area shapes', 'blast', [
      p('Some skills hit a shape made of cells instead of one target. You pick an anchor cell (it may be empty); every living enemy standing inside the shape is hit. Row means the same depth (all lanes of one row); column means one lane across all rows.'),
      list(
        'Row: the whole row of the anchor cell.',
        'Column: the whole lane of the anchor cell, across every row.',
        `Block RxC (from 1x1 up to ${f.formation.rows}x${f.formation.lanes}, for example 2x3): R rows deep by C lanes wide.`,
        'On screen a block is drawn sideways: its rows run left to right and its lanes top to bottom. Each direction is placed on its own. In a direction where the block is 3 or more cells long, your cursor cell is its middle (for 4 cells: the second cell from the left); if the block cannot be centered there because of the edge, it starts at your cursor cell instead. In a direction where the block is only 1 or 2 cells long, your cursor cell is its bottom-left corner, so the block extends to the right and upwards. If it would still stick out of the grid it slides back inside (its size never shrinks), so every cell is a valid anchor. Your side and the enemy side are mirrored, so "left" is the front row on the enemy side and the back row on your side.',
        'Cross: the anchor cell and the 4 cells next to it (one row in front or behind, one lane above or below). Cells outside the grid are skipped.',
        'X: the anchor cell and the 4 diagonal cells around it (one row in front or behind AND one lane above or below). Cells outside the grid are skipped, so a corner keeps only one diagonal. Some X skills cross the center twice: the unit on the anchor cell is then hit twice, each hit rolling its own hit, damage and crit.',
        `Either side: a few area skills (${allSkills().filter((s) => s.target === 'area_any').map((s) => s.name).join(', ') || 'none yet'}) can be thrown on the enemy side or on your own side. Each of their effects names who it touches: on the enemy side only enemies are affected, on your side only allies.`,
      ),
      p('Some area skills strike in waves: the shape is split into stages that land one after another. Row by row starts at the front row (closest to the attacker) and moves back; lane by lane starts at the top lane; outward waves start at the anchor cell and spread to its neighbours. Waves change only the order, never the damage: every enemy in the shape is still hit once.'),
      p('Melee skills with a shape only hit enemies that melee can reach (the front rows); enemies in the shape but out of reach are not hit. A shape is valid only if it covers at least one enemy that can be hit. Shape skills ignore taunt. Test classes such as the Geometer carry one skill per shape; they never appear in random teams.'),
      { kind: 'table', ...areaSkillTable() },
    ], '#c9a0ff', shapeExamples()),
    article('actions', 'Special rules', 'Actions: Rest, Skip Turn and Move', 'boot', [
      p('Besides its four skills, every unit can use three global actions. They cost nothing and each ends the turn. In the campaign and in Endless your heroes have a fourth, Revive, paid with Valor (see Valor).'),
      list(...Object.values(content.globalSkills).filter((d) => d.kind !== 'valor').map((d) => {
        const info = describeGlobalSkill(d, f);
        return `${info.name}: ${[info.summary, ...info.lines].map((s) => s.replace(/\.$/, '')).join('. ')}.`;
      })),
      p('The enemy team uses these actions too: it rests when a strong skill is out of MP, waits when nothing useful can be done, and moves fragile units out of melee reach.'),
    ], '#9ec5e8'),
    valorArticle(),
    article('backstab', 'Special rules', 'Strikes from behind and sure crits', 'backstab', [
      p('Some assassin skills slip behind the target, stab it in the back and return. They ignore the melee row rules (any row can be targeted), but only a target with an empty cell right behind it can be chosen: the next row back, same lane, must hold no living unit. A corpse or a cell kept for a fallen ally does not block it; a target in the back row can never be chosen ("No room behind the target"), and one with a living unit behind it is "shielded from behind". Moving units (or a unit falling) can open the way. The caster is drawn there only for the strike: the formation does not change.'),
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
    article('corpses', 'Special rules', 'Corpses', 'skull', [
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
    ]),
    article('revive', 'Special rules', 'Resurrection', 'ankh', [
      p('A revive skill is aimed in two steps: first choose the fallen ally, then choose an empty cell on your own side where it rises, with a share of its max HP and MP. It does not matter whether something now stands on its corpse (for example a summon): any empty cell will do. With no empty cell on your side the skill cannot be used. It cannot target living units, and it cannot target an ally whose corpse was consumed (see Corpses). The revived ally starts with an empty turn bar.'),
      p('The AI weighs a resurrection like any other move: what the revived ally will do over the next turns (its first turn comes later because its turn bar starts empty), against healing a living ally whose turn is close or hitting the foe who is about to strike. It picks the cell where the ally is most useful and safest (a melee fighter in front, a caster or archer at the back). When the fight is already decided, it does not waste a turn on a resurrection: if the remaining foes are expected to fall within the next few turns anyway, or if the battle is lost and the revived ally would not change that, the resurrection is worth nothing to it.'),
      list(...Object.values(content.skills).flatMap((s) => s.effects.filter((e): e is Extract<typeof e, { type: 'revive' }> => e.type === 'revive').map((e) => `${s.name}: revives at ${pct(e.hpRatio)} HP and ${pct(e.mpRatio)} MP${e.regen ? `; then regenerates ${pct(e.regen.ratio)} of its max HP at the start of each of its next ${e.regen.turns} turns` : ''}.`))),
      p(`Skills that revive: ${skillsWith((e) => e.type === 'revive').join(', ') || 'none yet'}.`),
    ]),
    article('shields', 'Special rules', 'Shields', 'shield', [
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
    article('half-turn', 'Special rules', 'Half-turn skills', 'hourglass', [
      p(`Using a skill normally takes a whole turn: the unit's action counter drops by ${f.turn.threshold}. A half-turn skill only takes half of that, so the unit's next turn comes in half the usual time (Haste, Slow and the Skip Turn boost still change how fast the counter fills). The turn bar shows this as soon as the skill is used.`),
      p('Cooldown and MP work as usual, and a half-turn skill always has a cooldown, so it cannot be chained. In test mode there is no turn order, so this has no effect there.'),
      p(`Half-turn skills: ${allSkills().filter((s) => s.turnCost !== undefined && s.turnCost < 1).map((s) => s.name).join(', ') || 'none yet'}.`),
    ], '#c9a227'),
    article('control', 'Special rules', 'Taunt, guard and mana burn', 'guardian', [
      p(`Taunt forces enemies to target the taunting unit for some turns (it can end early if the unit loses enough HP, or at once if the unit is hit by a control status: ${Object.values(content.statuses).filter((d) => d.breaksTaunt).map((d) => d.name).join(', ') || 'none'}). Guard makes a protector take a share of the damage dealt to another ally (a unit cannot guard itself). Mana burn removes MP from a target (and may give some of it to the caster) without hurting its HP.`),
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
      article('campaign', 'Campaign', 'Campaign', 'boot', [
        p(`The campaign is a journey across ${m.title.charAt(0)}${m.title.slice(1).toLowerCase()}: ${m.nodes.length} stops on the map, but each run visits ${m.stopsPerRun}. Start it from the main menu (New Campaign). Quick Battle is the old single-battle mode.`),
        list(
          'Roads: a solid line is the only way on; a dashed line is a branching route. At a choice point (gold ring) you pick one road and the others close for this journey. Roads meet again further on.',
          `Fog: you see the next stop in full (name, type, enemies) and the stop after it by type and name only; anything further is under fog. The final castle is always visible as your goal.`,
          `Stops: Battle, Elite (a stronger leader), Boss, Guarded treasure (a battle, then a chest), Event (a short story stop; a guarded one is a battle first), Town (rest and recruits), Rest (a free camp: living heroes regain ${Math.round(campaignConfig.rest.heal * 100)}% of their maximum HP; a fallen hero can be revived there for gold: it rises with ${Math.round(campaignConfig.rest.reviveRatio * 100)}% HP, and the price is ${campaignConfig.rest.reviveCost.base} gold plus ${campaignConfig.rest.reviveCost.perIlvl} per item level of the region) and Merchant (Odo sells gear for the region's item level, buys your spare items and lets you buy them back).`,
          'Your party: you start alone, a companion joins in the forest, and at the first village the escort stays behind and you form a new company of three from every class. The first hero you pick leads; the leader walks in front on the map. Another hero joins when you leave the city.',
          `Health carries over between battles. After a victory survivors regain ${Math.round(r.victoryHeal * 100)}% of their maximum HP; after a boss the survivors are fully healed; towns heal everyone for free and raise the fallen. A fallen hero does not get up on their own: they stay down and enter the next battles as a corpse until revived by Resurrection in battle, at a town, or for gold at a Rest camp (they rise with ${Math.round(campaignConfig.rest.reviveRatio * 100)}% HP). If the whole party falls, the battle is lost. Mana starts full in every battle.`,
          `Saving: there are ${r.slots} campaign slots, one journey each, and every journey keeps its own saves. Normal saves after every victory and whenever you press Save on the map (up to ${r.maxSaves.normal} saves per journey; the oldest is replaced). Ironman keeps a single save, written only after a victory. If you are defeated, you go back to your last save.`,
          `Difficulty: Easy, Medium or Hard, chosen when the journey starts; it cannot be changed later. ${difficultyText()}`,
        ),
      ]),
      itemsArticle(),
      affixArticle(),
      legendaryArticle(),
      endlessArticle(),
    );
  }
  out.push(...bossArticles(), ...mobArticles());
  return out;
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
  const art = article('legendary-items', 'Campaign', 'Legendary items', 'burst', [
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
  return article('item-affixes', 'Campaign', 'Item affixes', 'rune', [
    p('Every item carries affixes in three tiers. A Common item has one C affix, Uncommon two C, Rare adds a B, Epic adds an A; a Legendary has C, C, B, A and its own effect. The same affix never appears twice on one item.'),
    list(
      ...TIER_IDS.map((t) => `${tierName[t]}: ${Object.values(ITEM_DATA.affixDefs).filter((a) => a.tier === t).length} affixes.`),
      'An affix\'s range grows with item level only (the table shows the middle of the range at item level 10); a higher rarity rolls in the upper part of that range (see Items and gear). Every slot has its own identity (see the Slots column): weapons roll elemental and physical damage, crit damage, penetration and damage to elites; shields roll armor, shield power and magic armor; helms roll HP, MP and debuff resistance; body armor rolls armor, HP, magic armor and auras; gloves roll accuracy, crit chance and life leech; boots roll speed, evasion and quick start; trinkets roll HP and MP regeneration, healing and shield power, damage over time and summon power. Some general affixes (primary attribute, all attributes, recovery, swift ultimate, immunity, endurance) can appear anywhere. The first affix of an item comes from its base and can be outside the pool of its slot (Studded Gauntlets carry Armor).',
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
  return article('valor', 'Special rules', 'Valor', 'ankh', [
    p(`Valor is your company's courage, kept as embers in two iron braziers of ${V.perBrazier} embers each (${V.cap} at most). It is spent only to bring a fallen hero back.`),
    list(
      `Earning: every battle you win lights ${V.earn.win} ember; an elite battle ${V.earn.elite} and a boss ${V.earn.boss} instead. If no hero fell during the battle, you light ${V.earn.flawless} more (a hero raised again still counts as fallen).`,
      `In battle: when a brazier is full (${r.battleCost} embers), any of your heroes can use Revive next to Rest, Skip Turn and Move. Pick a fallen ally whose body lies on your side: they rise with ${pct(r.hpRatio)} of their HP${r.mpRatio > 0 ? ` and ${pct(r.mpRatio)} of their MP` : ''} on the cell where they fell (or the nearest empty cell if someone stands there). It uses that hero's turn. A body consumed by Raise Dead cannot be raised.`,
      `Outside battle a revive is cheaper: ${r.outsideCost} embers. Tap the braziers on the campaign map or between Endless waves and choose a fallen hero; they rise with ${pct(r.hpRatio)} of their HP.`,
      `Campaign: Valor is unknown until ${intro}, where the commander explains it and gives you a first full brazier (${V.campaign.gift} embers). It is saved with your journey.`,
      `Endless: Valor is there from the first wave (you start with ${V.endless.start}). The Revive reward card still works as before and costs nothing.`,
      'Only your side has Valor: enemies never use it.',
    ),
  ], '#ffb35a');
}

/** Endless makalesi (data/endless.json; sürekli akış, ödül kartları, ceset + Revive kartı, tüccar, torba). Sayılar veriden. */
function endlessArticle(): WikiArticle {
  const E = endlessJson;
  const c = E.carry;
  const counts = E.enemyCount.map((x, i) => (i === 0 ? `${x.count} enemies` : `${x.count} from wave ${x.fromWave}`)).join(', ');
  const sp = E.special;
  const relics = E.relics.list.map((r) => r.name).join(', ');
  return article('endless', 'Endless', 'Endless', 'skull', [
    p(`Endless is a run of waves with a party of ${E.partySize}: fight wave after wave until your party falls. Your score is the wave you reached; the best ${E.highScores} runs are kept. A normal wave has ${counts}; every ${E.eliteEvery}th wave is an elite and every ${E.bossEvery}th a boss, and enemies grow a little stronger with every wave.`),
    list(
      `One long fight: what you have carries into the next wave. After a victory every survivor regains ${pct(c.victoryHeal)} of their maximum HP and the same share of their MP${c.bossVictoryHeal >= 1 ? '; a boss victory fully heals the survivors' : ''}. Buffs, Rage, shields, summons and positions carry over; every debuff is removed. Cooldowns ${c.cooldowns === 'carry' ? 'keep running from where they were (they do not reset, and skills do not start on cooldown again)' : 'reset between waves'}. Once-per-battle effects (such as Lucky Escape) are ready again.`,
      `A fallen hero stays on the field as a corpse in the next wave: a revive skill can bring it back as usual (not if its corpse was consumed). Between waves a Revive card lets it rise with ${pct(E.rewards.reviveRatio)} of its HP and MP; healing cards and the boss heal never raise the dead.`,
      `Rewards: after each wave pick one of three cards: an item (the card says who it suits), gold (${E.rewards.goldBase} + ${E.rewards.goldPerWave} per wave cleared) or healing (${pct(E.rewards.healRatio)} HP to the living). After an elite you get ${sp.elite.itemCards} item cards of a higher item level, ${num(sp.elite.goldMult)}x gold and ${pct(sp.elite.healRatio)} healing; after a boss ${sp.boss.itemCards} item cards, ${num(sp.boss.goldMult)}x gold and a Hero's Feast (full HP and +${pct(sp.boss.feastHpMult - 1)} max HP for ${sp.boss.feastWaves} waves). Item rarity uses the same drop table as the campaign.`,
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

function itemsArticleBody(): WikiArticle {
  const L = itemsJson.loot;
  const fams = itemsJson.weaponFamilies.map((x) => `${x.name} (${x.classes.map((c) => content.classes[c]?.name ?? c).join(', ')})`).join('; ');
  return article('items', 'Campaign', 'Items and gear', 'helm', [
    p(`Heroes in the campaign and in Endless wear gear in ${itemsJson.slots.length} slots: ${itemsJson.slots.map((x) => x.name).join(', ')}. Items carry affixes: stats, damage bonuses and small rules (see Item affixes). They never add flat damage. Quick Battle and multiplayer do not use items.`),
    list(
      `Rarity sets how many affixes an item has, one more per step: ${itemsJson.rarities.map((x) => `${x.name} ${x.tiers.join(', ')}${x.id === 'legendary' ? ' + its unique effect' : ''}`).join('; ')}. The first affix is the item's main one (a weapon's is its damage type).`,
      `Each affix value is rolled within a small range when the item drops (shown as e.g. "+4 Max HP (3–5)"); the roll is kept for good. The range itself grows only with item level, but rarity decides how high the roll lands: ${rollFloorText()}. An item's gold value follows its power (${itemsJson.budget.goldPerIP} gold per power point).`,
      `Limits: all of a hero's gear together adds at most +${itemsJson.caps.crit}% crit chance, +${itemsJson.caps.accuracy}% accuracy, +${itemsJson.caps.evasion}% evasion and +${itemsJson.caps.spd} SPD${itemsJson.caps.mpCost !== undefined ? `, at most -${itemsJson.caps.mpCost}% MP cost` : ''}${itemsJson.caps.resist !== undefined ? ` and at most ${itemsJson.caps.resist}% debuff resistance` : ''}; anything above that is lost.`,
      (() => {
        const lo = dropChances(0);
        const hi = dropChances(999, 'boss');
        const f = (c: Record<string, number>) => `${Math.round(c.common!)}% Common, ${Math.round(c.uncommon!)}% Uncommon, ${Math.round(c.rare!)}% Rare, ${Math.round(c.epic! * 10) / 10}% Epic`;
        return `Drop rarity uses one table for campaign loot and Endless rewards and wares: at the start about ${f(lo)}. Higher item levels and elite or boss fights shift it slightly, never past about ${f(hi)}. Legendaries are never in this table: they come only from rare drops.`;
      })(),
      rareDropText(),
      `Weapons come in families and each class uses only its own: ${fams}. Every other slot fits everyone.`,
      gripText(),
      `Loot: a victory drops about ${L.perPartyMember.battle} items per hero in the fight (elites ${L.perPartyMember.elite}, bosses ${L.perPartyMember.boss}), chests at least one item; their rarity comes from the drop table only. Drops are the same on every difficulty. Winning the same battle again gives less (${L.repeat.map((x) => `${Math.round(x.items * 100)}%`).join(' / ')}).`,
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
      const info = describeSkill(sk, def.stats, f, unitDefs(), effectDefs());
      const when = sk.minPhase && sk.minPhase > 1 ? ` (from phase ${sk.minPhase})` : '';
      return [`${def.skills.indexOf(id) + 1}. ${sk.name} [${skillRange(sk)}]${when}:${info.lines.join('; ')}${sk.cooldown ? `; cooldown ${sk.cooldown}` : ''}`];
    });
    const over = b.afterResolve ? content.statuses[b.afterResolve.status] : undefined;
    const accCritNames = content.formulas.ccImmunity?.accuracyCrit ? Object.values(content.statuses).filter((d) => !d.cc && isAccuracyCritDebuff(d)).map((d) => d.name) : [];
    out.push(
      article(`boss-${def.id}`, 'Bosses', def.name, def.logo, [
        p(`${def.name} guards King's Bridge. It has ${def.stats.hp} HP (before difficulty), acts more than once each turn and fights in phases.${anchor ? ` Two ${anchor.name}s (${anchor.stats.hp} HP, ${anchor.stats.armor} armor) stand behind it: they never act and cannot be healed.` : ''}`),
        list(
          'Warnings: Breaking Span, Ash Brand and the Fall of King\'s Bridge do not hit at once. The marked cells crack (or a unit is branded) and the attack lands at the start of the Warden\'s next turn, before it acts. Every hero gets at least one turn in between: move out of the marked cells (Move) or take the hit. These hits cannot miss.',
          'Ash Brand follows the branded unit: it bursts on the unit and everyone right next to it, wherever it stands. A dispel (Mana Barrier) removes it; if the branded unit falls, the brand fades.',
          `Fall of King's Bridge cracks the whole board except one Keystone per lane (gold arch stone): stand on a Keystone.`,
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
    );
  }
  return out;
}

/** Mob ailesi görünen adları (docs/design/campaign/fill-plan.md 2.2). */
const MOB_FAMILY: Record<string, string> = { bandits: 'Bandits', beasts: 'Beasts', ember_cult: 'Ember Cult', guardians: 'Guardians', hexes: 'Hexes', undead: 'Undead', fanatics: 'Fanatics', morvane_army: "Morvane's Army" };

/** Sefer mobları (data/mobs; N1): aile başına bir makale (Enemies). Sayılar veriden (zorluk öncesi can; skill açıklamaları skill-info'dan). */
function mobArticles(): WikiArticle[] {
  const byFamily = new Map<string, CombatantDef[]>();
  for (const def of Object.values(content.mobs)) {
    const fam = def.family ?? 'other';
    byFamily.set(fam, [...(byFamily.get(fam) ?? []), def]);
  }
  return [...byFamily].map(([fam, defs]) => {
    const famName = MOB_FAMILY[fam] ?? fam;
    return article(`enemies-${fam}`, 'Enemies', famName, defs[0]!.logo, [
      p(`Campaign enemies of the ${famName} family. HP is before campaign and difficulty scaling.`),
      ...defs.map((def) =>
        list(
          `${def.name} (${def.role ?? 'Enemy'}): ${def.stats.hp} HP, ${def.stats.armor} armor, speed ${def.stats.spd}.`,
          ...def.skills.flatMap((id) => {
            const sk = content.skills[id];
            if (!sk) return [];
            const info = describeSkill(sk, def.stats, f, unitDefs(), effectDefs());
            return [`${sk.name} [${skillRange(sk)}]:${info.lines.join('; ')}${sk.cooldown ? `; cooldown ${sk.cooldown}` : ''}`];
          }),
          ...(def.passive ? [`${def.passive.name} (passive)${def.passive.text ? `: ${def.passive.text}` : ''}`] : []),
        ),
      ),
    ]);
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
    const text = `Leaves ${g.name} on the area. Enemies standing there take ${g.element} (magic) damage at the start of each of their turns.`;
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
      icon: 'book',
      accent: '#d9b26a',
      blocks: paras.map((text) => ({ kind: 'p' as const, text })),
      search: `${l.title} ${l.group} ${paras.join(' ')} lesson tutorial`.toLowerCase(),
    };
  });
}

export function buildWiki(files: WikiFiles): WikiCatalog {
  return {
    gettingStarted: buildGettingStarted(),
    lessons: buildLessons(),
    classes: buildClasses(files),
    summons: buildSummons(files),
    skills: buildSkills(),
    mechanics: buildMechanics(),
    statuses: buildWikiStatuses(),
    grounds: buildWikiGrounds(),
    elements: buildElements(),
    elementTable: buildElementTable(),
  };
}
