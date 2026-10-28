// Skill ağacı (Moments) verisi (docs/design/skill-tree-implementation.md 2.1; saf, Phaser/DOM yok): kurallar (data/skill-trees/_rules.json) +
// class dosyaları STATİK import (npx tsx sim'i import.meta.glob desteklemez; content.ts ile aynı). Yeni class = 1 JSON (tools/tree-import.mjs)
// + aşağıdaki TREE_FILES listesine 1 satır. validateTreeData = yapı doğrulayıcı (testler); fx'in skill tanımına karşı denetimi derleyicide
// (src/progression/skill-tree-compile.ts > checkTreeFx).
import rulesJson from '../../data/skill-trees/_rules.json';
import warriorTree from '../../data/skill-trees/warrior.json';
import defenderTree from '../../data/skill-trees/defender.json';
import paladinTree from '../../data/skill-trees/paladin.json';
import archerTree from '../../data/skill-trees/archer.json';
import cutthroatTree from '../../data/skill-trees/cutthroat.json';
import mageTree from '../../data/skill-trees/mage.json';
import druidTree from '../../data/skill-trees/druid.json';
import undeadTree from '../../data/skill-trees/undead.json';
import hexerTree from '../../data/skill-trees/hexer.json';
import antimageTree from '../../data/skill-trees/antimage.json';
import gamblerTree from '../../data/skill-trees/gambler.json';
import vesperTree from '../../data/skill-trees/vesper.json';
import { classes } from '../engine/content';
import type { AreaDef, CondMod, CondScale, CondWhen, HealHook, HookAt, ItemEffects, RuleHook, SkillEffect, TriggerHook } from '../engine';

/** Ağacın açık olabileceği modlar (_rules.json > modes). */
export type TreeMode = 'campaign' | 'endless' | 'quick' | 'multiplayer';
export type TreeNodeKind = 'filler' | 'notable' | 'edge' | 'blood' | 'evolve';
export type TreeTier = 'I' | 'II' | 'III' | 'IV' | 'E';
export type TreeDir = 'a' | 'b';

/** Satır şeklinin bir sütunu (core.js ROW_DEF karşılığı). `req`: önceki düğüm id'si ('ma|mb' = biri yeter; boş = gereksiz). */
export interface RowShapeDef {
  id: string;
  kind: TreeNodeKind;
  max: number;
  tier: TreeTier;
  col: number;
  lane: number;
  req: string;
  dir?: TreeDir;
}

export interface TreeRules {
  /** Ana şalter: false = hiçbir modda ağaç savaşa girmez. */
  enabled: boolean;
  modes: Record<TreeMode, boolean>;
  /** '+X% power' (fx op 'pct') anlamı: 'mul' = oransal, 'add' = düz ek (plan sorusu 10.1; TEK yer). */
  percentRule: 'mul' | 'add';
  rowShape: RowShapeDef[];
  /** Satır sayısı (pasif + 3 aktif = 4); ult satırının indeksi de budur. */
  rows: number;
  tierNeed: Record<string, number>;
  evolveNeed: number[];
  evolveMax: number;
  /** singleArm (Ömer 2026-10-22): ult'ta tek kol; bir kolda puan varsa öbür kollar alınamaz (blok ultArm). */
  ult: { arms: string[]; levels: number[]; max: number; singleArm?: boolean };
  barAt: number[];
  exclusiveEdges: boolean;
  /** Respec bedeli (altın): base + perLevel x level (plan 10a; provizyon). Yoksa bedava. */
  respec?: { base: number; perLevel: number };
  /** Debug odaklı kurulum + sim vekili ön ayarı (class -> satırlar + ult kolu). */
  debugFocus?: Record<string, { rows: [number, number]; ult?: string }>;
}

/**
 * Op: add = düz ek, mul = x (1 + v), pct = '+X% power' (percentRule'a göre mul ya da add), set = ezer (kendinden öncekileri siler),
 * base = skill'in TEMEL değerini değiştirir (diğer tüm yamalardan önce uygulanır; ekler üstüne biner: Hollow Roar 0,15 + Bellow 3 rank = 0,24,
 * Ömer 2026-10-22 plan 10a). `rank: true` = v x rank. Faz 2c: `on` = bayrak alanını açar (Crimson Covenant: bond permanent); pasifte `remove`
 * yalnızca izinli alanı siler (Black Mold: Nature's Grudge status).
 */
export type TreeFxOp = 'add' | 'mul' | 'pct' | 'set' | 'base' | 'remove' | 'on';

/**
 * (a) düz sayı yaması: skill tanımında `sel` seçicisinin `f` alanı. `skill` verilirse satırın skill'i yerine o skill (sinerji; class'ın skill'i olmalı).
 * Seçiciler ve alanlar: skill-tree-compile.ts > FX_FIELDS.
 */
export interface SkillFx {
  k: 'skill';
  sel: string;
  f: string;
  op: TreeFxOp;
  v: number;
  rank?: boolean;
  skill?: string;
}

/** (a) pasif yaması: sınıf pasifinin etki alanı (`f`, nokta yolu: 'rageOnHurt.perHitCap'). */
export interface PassiveFx {
  k: 'passive';
  f: string;
  op: TreeFxOp;
  v: number;
  rank?: boolean;
}

/**
 * (b) etki ekleme (Faz 2a): satırın skill'ine (ya da `skill`) VAR OLAN türde bir SkillEffect ekler (status, randomStatus, dispel, shield, taunt...).
 * Yer: `after` / `before` etki seçicisi ('damage', 'damage:0', 'status:stun', ya da etki türü: 'taunt', 'guard'...); yoksa sona.
 * `effect` ya da `byRank` (rank başına ayrı etki, sıra rank - 1; eksikse sonuncusu: Knee Cutter şansı, Deep Stomp ağırlıkları).
 */
export interface AddEffectFx {
  k: 'addEffect';
  effect?: SkillEffect;
  byRank?: SkillEffect[];
  after?: string;
  before?: string;
  /** Faz 2c: etkiyi BAŞA ekler (Spellsplitter: silme hasardan önce). */
  first?: boolean;
  skill?: string;
}

/** (b) etki kaldırma (Faz 2a+): `sel` seçicisinin uyduğu etkiler silinir; hasar kalmazsa skill yine isabet zarı atar (treeHitRoll). */
export interface RemoveEffectFx {
  k: 'removeEffect';
  sel: string;
  skill?: string;
}

/** (b) etki değiştirme: `sel` seçicisinin uyduğu etkilerin her biri bu etkiyle değişir (`effect` / `byRank` addEffect gibi). */
export interface ReplaceEffectFx {
  k: 'replaceEffect';
  sel: string;
  effect?: SkillEffect;
  byRank?: SkillEffect[];
  /** Faz 2c (Desperate Sap): 'hot' etkisi tek seferlik şifaya döner, güç = HoT gücü x süre x collapse (effect / byRank yok). */
  collapse?: number;
  skill?: string;
}

/** Faz 4c: skill'in `ground` zeminine tur başı durumu ekler (içinde tur başlatan düşmana; `mpZero` = yalnızca MP'si 0 olana). */
export interface GroundStatusFx {
  k: 'groundStatus';
  ground: string;
  status: string;
  turns?: number;
  mpZero?: boolean;
  skill?: string;
}

/** Faz 2c: birim stat çarpanı (yalnızca `f: 'hpMult'`, `op: 'mul'`: maks can x (1 + v); Gaunt Frame). */
export interface StatFx {
  k: 'stat';
  f: 'hpMult' | 'armorAdd';
  op: TreeFxOp;
  v: number;
  rank?: boolean;
}

/**
 * (b) birim etkisi: ItemEffects biçimi (src/engine/types.ts), item'lerden AYRI kanal (UnitSetup.tree.fx). `rank: true` = sayısal alanlar x rank
 * (eşik / süre alanları below, above, cap, turns, every, max, turnCost hariç). Anahtar beyaz listesi: src/engine/tree-hooks.ts > UNIT_FX_KEYS.
 */
export interface UnitFxFx {
  k: 'unitFx';
  fx: Partial<ItemEffects>;
  rank?: boolean;
}

/**
 * (c) C1 koşullu değiştirici. `when` koşul nesnesi (anahtarlar VE; `not`, `any`), `scale` TEK anahtarlı ölçek (sözlük: tree-hooks.ts > COND / SCALE),
 * `sel` etki seçicisi (damage / damage:N / status / status:<durum>), `mod` değişiklikler (CondMod + `cost`: bedele düz ek, yalnızca kendi
 * canı / Rage'i koşullarıyla). `skill`: varsayılan satırın skill'i (pasif satırı ve bar: her skill); '*' = her skill. `rank: true` = sayılar x rank.
 */
export interface CondFx {
  k: 'hook';
  h: 'cond';
  when?: CondWhen;
  scale?: CondScale;
  sel?: string;
  mod: CondMod & { cost?: number; costMul?: number };
  /** Bağlantı yeri (Faz 2a+): 'hit' (varsayılan) | 'doom' | 'dot' | 'ground' | 'passiveHeal' | 'smite'. */
  at?: HookAt;
  /** Kancanın tetiklenme şansı (0-1]; yalnızca gerçek uygulamada zarlanır, önizleme saymaz. */
  procChance?: number;
  /** true = sayılar ve procChance x rank; 'chance' (Faz 2c) = yalnızca procChance x rank ("%10 per rank to last 1 turn longer"). */
  rank?: boolean | 'chance';
  skill?: string;
  /** Faz 2c: bu düğümün daha önce eklenmiş kancaları kaldırılır (Blind Zeal, Rising Fervor'un yerine geçer). */
  drop?: string;
}

/**
 * Faz 2c: kural kancası. Faz 5a: C6 tam sözlüğü (motorun RuleHook'u; src/engine/tree-hooks.ts > RULE_KINDS, belge "Faz 5a notları"). `do` eylemleri
 * C3 eylem sözlüğüyle aynı (cheatDeath sonrası). `rank: true` = add / share / hpRatio / mult x rank.
 */
export interface RuleFx extends Omit<RuleHook, 'h' | 'node'> {
  k: 'hook';
  h: 'rule';
  rank?: boolean;
  drop?: string;
}

/**
 * Faz 5a: C5 hedef / alan / aura kancası: DERLEME anında birimin skill / pasif kopyasını yamalar (önizleme, YZ ve gerçek kullanım aynı tanımı okur).
 *  - area: alan alanları (shape / rows / cols / hitsAtCenter / arm / also / maxTargets / stages; null = alanı sil).
 *  - target + count: hedef türü (random_enemies / all_enemies / all_allies / self / single_enemy / single_ally); alan ve sıçrama kalkar.
 *  - splash: sıçrama kalıbı (perpendicular = "beside" / chain / row / behind; mult, jumps; null = sil).
 *  - range: sayı ya da 'global'.  - open: false (requiresOpenBehind kalkar) / 'thrown' (kalkar + koşul thrown).
 *  - priority: rastgele hedef önceliği (hitMe / armor / hurtMe).  - gather: kullanım başı yığın çekme ({ status, from }).
 *  - guard: skill'in Guard etkisine armorPct (x rank) / ownRow.
 *  - aura (armorAura pasifi): square, magicPct (x rank), pct (dost payı set).  - smite / noSelf (divineLight pasifi).
 */
export interface TargetFx {
  k: 'hook';
  h: 'target';
  skill?: string;
  area?: Partial<AreaDef> | null;
  target?: 'random_enemies' | 'all_enemies' | 'all_allies' | 'self' | 'single_enemy' | 'single_ally';
  count?: number;
  splash?: { pattern: 'perpendicular' | 'chain' | 'row' | 'behind'; mult?: number; jumps?: number } | null;
  range?: number | 'global';
  open?: false | 'thrown';
  priority?: 'hitMe' | 'armor' | 'hurtMe';
  gather?: { status: string; from?: number };
  guard?: { armorPct?: number; ownRow?: true };
  aura?: { square?: true; magicPct?: number; pct?: number };
  smite?: { power?: number; idle?: number; mirror?: number; mul?: number; dual?: number };
  noSelf?: true;
  /** Faz 5a: skill'in zeminleri alanın değdiği hücrelere de (Sea of Fire). */
  groundWide?: 'touch';
  /** Faz 5a: manaOverflow pasifi (Conduit / Lifeline Pact / Martyr's Overflow / Spillover / Endless Spring). */
  overflow?: { to?: 'lowestMp'; mult?: number; noSelf?: true; spill?: true; allies?: true };
  rank?: boolean;
  drop?: string;
}

/**
 * (c) C2 Rage kancası: `on` 'hit' (isabet eden her vuruş) | 'cast' (kullanım sonu, varsayılan); `gain` düz Rage (x ölçek), `floor` taban,
 * `once` savaşta bir kez, `rule: 'tallyAll'` tüm hedeflerden Rage; `cost` = `skill`in Rage / MP bedeline düz ek, `after` verilirse yalnızca o skill
 * kullanıldıktan sonraki ilk ödemede (Into the Fire). `rank: true` = gain / cost x rank.
 */
export interface RageFx {
  k: 'hook';
  h: 'rage';
  on?: 'hit' | 'cast';
  gain?: number;
  floor?: number;
  once?: boolean;
  when?: CondWhen;
  scale?: CondScale;
  rule?: 'tallyAll';
  cost?: number;
  after?: string;
  rank?: boolean;
  skill?: string;
  drop?: string;
}

/**
 * Faz 4a: C3 tetik kancası (olay -> eylem). Alanlar motorun TriggerHook'uyla aynı (src/engine/tree-hooks.ts; tam sözlük belgede "Faz 4a notları");
 * `skill` yoksa satırın skill'i (pasif satırı ve bar: her skill; '*' = her skill). `rank: true` = eylem sayıları ve procChance x rank.
 */
export interface TriggerFx extends Omit<TriggerHook, 'h' | 'node'> {
  k: 'hook';
  h: 'trigger';
  rank?: boolean;
  drop?: string;
}

/** Faz 4a: C4 şifa / kalkan / alınan hasar kancası (motorun HealHook'u). `rank: true` = mul / ratio x rank. */
export interface HealFx extends Omit<HealHook, 'h' | 'node'> {
  k: 'hook';
  h: 'heal';
  rank?: boolean;
  drop?: string;
}

/** Faz 1a: (a) skill / passive. Faz 2a: (b) addEffect / replaceEffect / unitFx, (c) hook cond / rage. Faz 4a: (c) trigger (C3) / heal (C4). Kalan aileler (C5-C6) sonraki fazlarda. */
/**
 * Faz 2c: her fx `needs: '<düğüm anahtarı>'` taşıyabilir: o düğümün eklediği etkiye bakar (derleme o düğümün yamalarından SONRA uygular; checkTreeFx
 * önce onun fx'ini uygular). Düğüm alınmadıysa seçici uymaz ve yama sessizce atlanır.
 */
/**
 * Faz 8: skill BİÇİM seçimi (oyuncu kullanmadan önce seçer; eylem `mode` taşır). Biçimler derlemenin SONUNDA satır skill'inin son (yamalı) hâlinden
 * kurulur, yani diğer düğümlerin yamaları biçimlere de geçer. İki aile:
 * - Adlı biçim (Paladin Focused Beam): `mode` + `name` biçimi kurar (`target`, `removeEffects` etki türleri, `powerMul` hasar gücü çarpanı); aynı `mode`
 *   ile gelen sonraki fx'ler ona ekler (`addEffect`, `splash`). Skill'in kendi biçimi de seçenek kalır (keepBase).
 * - Durum seçimi (Gambler Stacked Deck): `statusPick` skill'in randomStatus seçeneklerinin her biri için bir biçim kurar (zar yerine o durum;
 *   `firstOnly` listesindeki durumlar yalnızca ilk hedefe). `secondStatus` (Double Deal) her biçime kalan seçeneklerden rastgele ikinci durum ekler.
 *   Her kullanım bir biçim ister (keepBase yok).
 * `text` kartın açıklamasına eklenir, `baseText` skill'in kendi kartı, `title` kartların üstündeki satır.
 */
export interface ModeFx {
  k: 'mode';
  skill?: string;
  mode?: string;
  name?: string;
  text?: string;
  baseText?: string;
  title?: string;
  target?: 'single_enemy';
  removeEffects?: string[];
  powerMul?: number;
  addEffect?: SkillEffect;
  splash?: { pattern: 'lane' | 'behind'; mult?: number };
  statusPick?: boolean;
  firstOnly?: string[];
  secondStatus?: boolean;
}

export type TreeFx = (SkillFx | PassiveFx | StatFx | AddEffectFx | ReplaceEffectFx | RemoveEffectFx | UnitFxFx | GroundStatusFx | CondFx | RageFx | RuleFx | TargetFx | TriggerFx | HealFx | ModeFx) & {
  needs?: string;
  /** Faz 4c: yalnızca bu düğümlerin HEPSİ alınmışsa uygulanır. */
  onlyWith?: string[];
  /** Faz 4c: bu düğümlerden biri alınmışsa uygulanmaz. */
  unless?: string[];
  /** Faz 4c: fx çağrıya geçer (çağrının skill'leri / kancaları / stat'ı; sınıfın çağırdığı birim). */
  summon?: string;
  /** Faz 4c: yalnızca beslenmiş (ceset tüketmiş) çağrıya. */
  fed?: true;
};

export interface TreeNodeData {
  name: string;
  text: string;
  /** Kaynak: '<karma>:<varyant>:<düğüm>' (ör. 'A:V1:2.f1'; sonda * = metni düzeltilmiş). Öneri satırı (alts.js c / d / e): 'D:new row proposal'. */
  src: string;
  /** Sinerji rozeti: bağlı skill adı (yalnızca arayüz). */
  syn?: string;
  /** NEW mekanik (Ömer onayı gerekir); approved: false iken alınamaz ("Awaiting approval"). */
  new?: boolean;
  approved?: boolean;
  /** null = etkisi henüz yazılmadı (puan alınabilir, motor yok sayar; "Not active yet"). */
  fx: TreeFx[] | null;
}

export interface TreeBarData {
  at: number;
  name: string;
  text: string;
  src: string;
  fx: TreeFx[] | null;
}

export interface TreeData {
  class: string;
  /** İçerik sürümü: değişince kahramana bir kez bedava sıfırlama (Faz 1b). */
  version: number;
  picked: { rows: string[]; at: string };
  rows: Array<{ skill: string; name: string; passive?: boolean; karma: string }>;
  ult: { skill: string; name: string; karma: string };
  mastery: { name: string; karma: string; bar: TreeBarData[] };
  /** Anahtar '<satır>.<id>' (satır 0 = pasif, 1-3 = aktif, 4 = ult: '4.u1' ... '4.l3'). */
  nodes: Record<string, TreeNodeData>;
}

export const TREE_RULES: TreeRules = rulesJson as unknown as TreeRules;

/** Class dosyaları (statik import). Yeni class = buraya 1 satır. */
const TREE_FILES: unknown[] = [warriorTree, defenderTree, paladinTree, archerTree, cutthroatTree, mageTree, druidTree, undeadTree, hexerTree, antimageTree, gamblerTree, vesperTree];

export const TREES: Record<string, TreeData> = Object.fromEntries(TREE_FILES.map((t) => [(t as TreeData).class, t as TreeData]));

/** Class'ın ağacı (yoksa undefined: ağacı olmayan class'ta puanlar birikir, savaş aynı). */
export const treeOf = (classId: string): TreeData | undefined => TREES[classId];

/** Ult satırının indeksi (satır anahtarı öneki). */
export const ultRow = (rules: TreeRules = TREE_RULES): number => rules.rows;

/** Tüm düğüm anahtarları: satırlar (rowShape sırası = uygulama sırası) + ult (kol sırası x adım). */
export function treeKeys(rules: TreeRules = TREE_RULES): string[] {
  const out: string[] = [];
  for (let i = 0; i < rules.rows; i++) for (const d of rules.rowShape) out.push(`${i}.${d.id}`);
  for (const arm of rules.ult.arms) for (let s = 1; s <= rules.ult.levels.length; s++) out.push(`${rules.rows}.${arm}${s}`);
  return out;
}

/** Ad / metin sınırları (arayüz). */
export const TREE_TEXT_LIMITS = { name: 24, text: 150 } as const;

/**
 * Class dosyasının yapı denetimi (boş liste = sağlam): sınıf var; satır 0 sınıfın pasifi, satır 1-3 ve ult sınıfın `skills` sırası; her anahtar
 * (satırlar + ult) tam bir kez; ad / metin dolu ve sınırda; NEW düğüm `approved` taşır; fx null ya da dizi; Mastery bar eşikleri _rules.json ile aynı.
 */
export function validateTreeData(tree: TreeData, rules: TreeRules = TREE_RULES): string[] {
  const out: string[] = [];
  const cls = classes[tree.class];
  const id = tree.class;
  if (!cls) return [`${id}: unknown class`];
  if (!Number.isInteger(tree.version) || tree.version < 1) out.push(`${id}: version must be a positive integer`);
  if (!Array.isArray(tree.rows) || tree.rows.length !== rules.rows) out.push(`${id}: needs ${rules.rows} rows`);
  else {
    if (!tree.rows[0]!.passive || tree.rows[0]!.skill !== cls.passive?.id) out.push(`${id}: row 0 must be the class passive (${cls.passive?.id})`);
    for (let i = 1; i < rules.rows; i++) {
      if (tree.rows[i]!.passive) out.push(`${id}: row ${i} cannot be a passive`);
      if (tree.rows[i]!.skill !== cls.skills[i - 1]) out.push(`${id}: row ${i} skill ${tree.rows[i]!.skill} != class skill ${cls.skills[i - 1]}`);
    }
  }
  if (tree.ult?.skill !== cls.skills[rules.rows - 1]) out.push(`${id}: ult ${tree.ult?.skill} != class skill ${cls.skills[rules.rows - 1]}`);
  const keys = treeKeys(rules);
  const have = Object.keys(tree.nodes ?? {});
  for (const k of keys) if (!tree.nodes?.[k]) out.push(`${id}: missing node ${k}`);
  for (const k of have) if (!keys.includes(k)) out.push(`${id}: unknown node key ${k}`);
  const entry = (label: string, n: { name?: unknown; text?: unknown; src?: unknown; fx?: unknown }) => {
    if (typeof n.name !== 'string' || !n.name.trim()) out.push(`${id}: ${label} has no name`);
    else if (n.name.length > TREE_TEXT_LIMITS.name) out.push(`${id}: ${label} name longer than ${TREE_TEXT_LIMITS.name}`);
    if (typeof n.text !== 'string' || !n.text.trim()) out.push(`${id}: ${label} has no text`);
    else if (n.text.length > TREE_TEXT_LIMITS.text) out.push(`${id}: ${label} text longer than ${TREE_TEXT_LIMITS.text}`);
    if (typeof n.src !== 'string') out.push(`${id}: ${label} has no src`);
    if (n.fx !== null && !Array.isArray(n.fx)) out.push(`${id}: ${label} fx must be null or an array`);
    if (Array.isArray(n.fx) && !n.fx.length) out.push(`${id}: ${label} fx is empty (use null)`);
  };
  for (const k of keys) {
    const n = tree.nodes?.[k];
    if (!n) continue;
    entry(k, n);
    if (n.new && typeof n.approved !== 'boolean') out.push(`${id}: NEW node ${k} needs approved: true | false`);
    if (!n.new && n.approved !== undefined) out.push(`${id}: ${k} is not NEW but has approved`);
  }
  if (typeof tree.mastery?.name !== 'string' || !tree.mastery.name) out.push(`${id}: mastery has no name`);
  const bar = tree.mastery?.bar ?? [];
  if (bar.length !== rules.barAt.length) out.push(`${id}: Mastery bar needs ${rules.barAt.length} bonuses`);
  bar.forEach((b, i) => {
    if (b.at !== rules.barAt[i]) out.push(`${id}: bar[${i}].at ${b.at} != ${rules.barAt[i]}`);
    entry(`bar[${i}]`, b);
  });
  return out;
}
