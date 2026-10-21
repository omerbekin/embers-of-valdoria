// Skill ağacı (Moments) verisi (docs/design/skill-tree-implementation.md 2.1; saf, Phaser/DOM yok): kurallar (data/skill-trees/_rules.json) +
// class dosyaları STATİK import (npx tsx sim'i import.meta.glob desteklemez; content.ts ile aynı). Yeni class = 1 JSON (tools/tree-import.mjs)
// + aşağıdaki TREE_FILES listesine 1 satır. validateTreeData = yapı doğrulayıcı (testler); fx'in skill tanımına karşı denetimi derleyicide
// (src/progression/skill-tree-compile.ts > checkTreeFx).
import rulesJson from '../../data/skill-trees/_rules.json';
import warriorTree from '../../data/skill-trees/warrior.json';
import defenderTree from '../../data/skill-trees/defender.json';
import paladinTree from '../../data/skill-trees/paladin.json';
import cutthroatTree from '../../data/skill-trees/cutthroat.json';
import mageTree from '../../data/skill-trees/mage.json';
import druidTree from '../../data/skill-trees/druid.json';
import undeadTree from '../../data/skill-trees/undead.json';
import hexerTree from '../../data/skill-trees/hexer.json';
import antimageTree from '../../data/skill-trees/antimage.json';
import { classes } from '../engine/content';

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
 * Ömer 2026-10-22 plan 10a). `rank: true` = v x rank.
 */
export type TreeFxOp = 'add' | 'mul' | 'pct' | 'set' | 'base';

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

/** Faz 1a: yalnızca (a) türleri. (b)/(c) (addEffect, unitFx, hook) sonraki fazlarda eklenir. */
export type TreeFx = SkillFx | PassiveFx;

export interface TreeNodeData {
  name: string;
  text: string;
  /** Kaynak: '<karma>:<varyant>:<düğüm>' (ör. 'A:V1:2.f1'; sonda * = metni düzeltilmiş). */
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
const TREE_FILES: unknown[] = [warriorTree, defenderTree, paladinTree, cutthroatTree, mageTree, druidTree, undeadTree, hexerTree, antimageTree];

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
