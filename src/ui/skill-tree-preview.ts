/**
 * Skill ipucunda "sonraki ağaç puanı" önizlemesi (Ömer 2026-11-07; saf, DOM yok, testli: tests/skill-tree-preview.test.ts).
 * Puan varsa ve bir düğümün sonraki rank'ı alınabiliyorsa, o düğümün bu skill'e yaptığı değişikliği yeşil satır olarak verir ("Damage 120 -> 126").
 * Yeni kural YOK: sonraki rank dağılımı mevcut ağaç motoruyla derlenir (compileTree), gerçek dağılım / durum hiç değişmez.
 * Karşılaştırma: şu anki dağılımın yamalı skill'i -> rank+1 yamalı skill'i; sayılar skill ipucuyla aynı kaynaktan (skillNumbers / describeSkill).
 */
import { content } from '../engine';
import { describeSkill, skillNumbers } from '../engine/skill-info';
import type { SkillDef, Stats } from '../engine';
import { check, free, rankOf, treeNodes, validate, type TreeAlloc } from '../progression/skill-tree';
import { compileTree } from '../progression/skill-tree-compile';
import { TREE_RULES, treeOf, type TreeData, type TreeRules } from '../progression/skill-tree-data';
import { treeTabEnabled } from './tree-tab-model';

/** Ipucundaki bölüm başlığı ve yeşil satır rengi. */
export const NEXT_POINT_SECTION = 'Next skill point';
export const NEXT_POINT_COLOR = '#8fe39a';

export interface NextChange {
  label: string;
  now: string;
  after: string;
}
export interface NextLine {
  /** Düğüm anahtarı ve adı; `rank` = alınacak rank (max > 1 ise yazılır). */
  key: string;
  name: string;
  rank: number;
  max: number;
  changes: NextChange[];
}

interface Pair {
  key: string;
  name: string;
  rank: number;
  max: number;
  before: SkillDef;
  after: SkillDef;
}

const effectDefs = () => ({ statuses: content.statuses, grounds: content.grounds, skills: content.skills });
const allocKey = (cls: string, level: number, a: TreeAlloc): string =>
  `${cls}|${level}|${Object.keys(a.r).filter((k) => (a.r[k] ?? 0) > 0).sort().map((k) => `${k}=${a.r[k]}`).join(',')}`;

/** Derleme yaması: dağılımın o skill için yamalı tanımı (yama yoksa taban skill; derleme hatasında taban). */
function skillAt(tree: TreeData, a: TreeAlloc, skillId: string, base: SkillDef, rules: TreeRules): SkillDef {
  try {
    return compileTree(tree, a, rules)?.skills?.[skillId] ?? base;
  } catch {
    return base;
  }
}

const pairCache = new Map<string, Pair[]>();

/** Alınabilir her düğüm için (rank+1) önce / sonra skill tanımı; yalnızca skill'i gerçekten değiştirenler. */
function pairsFor(tree: TreeData, level: number, a: TreeAlloc, skillId: string, rules: TreeRules): Pair[] {
  const ck = `${allocKey(tree.class, level, a)}#${skillId}`;
  const hit = pairCache.get(ck);
  if (hit) return hit;
  const base = content.skills[skillId];
  const out: Pair[] = [];
  if (base && free(level, a) > 0) {
    const before = skillAt(tree, a, skillId, base, rules);
    const beforeJson = JSON.stringify(before);
    for (const nd of treeNodes(rules).list) {
      if (check(tree, level, a, nd.key, {}, rules)) continue; // alınamıyor (kilit, yön, maks, puan...)
      const next: TreeAlloc = { v: a.v, r: { ...a.r, [nd.key]: rankOf(a, nd.key) + 1 } };
      const after = skillAt(tree, next, skillId, base, rules);
      if (JSON.stringify(after) === beforeJson) continue;
      out.push({ key: nd.key, name: tree.nodes[nd.key]?.name ?? nd.key, rank: rankOf(a, nd.key) + 1, max: nd.max, before, after });
    }
  }
  if (pairCache.size > 200) pairCache.clear();
  pairCache.set(ck, out);
  return out;
}

/** Değişen sayılar: aynı etiketin n'inci geçişi eşlenir; bedel / bekleme de dahil. */
function diffChanges(p: Pair, stats: Stats): NextChange[] {
  const f = content.formulas;
  const a = skillNumbers(p.before, stats, f, effectDefs(), content.summons);
  const b = skillNumbers(p.after, stats, f, effectDefs(), content.summons);
  const seen = new Map<string, number>();
  const used = new Set<number>();
  const out: NextChange[] = [];
  const fmt = (n: { text: string; times?: number }): string => `${n.text}${n.times ? ` x${n.times}` : ''}`;
  for (const n of b) {
    const nth = seen.get(n.label) ?? 0;
    seen.set(n.label, nth + 1);
    let k = -1;
    let c = 0;
    a.forEach((m, i) => {
      if (m.label === n.label && c++ === nth) k = i;
    });
    if (k >= 0) used.add(k);
    const old = k >= 0 ? a[k]! : null;
    if (!old) out.push({ label: n.label, now: '', after: fmt(n) });
    else if (fmt(old) !== fmt(n)) out.push({ label: n.label, now: fmt(old), after: fmt(n) });
  }
  const ia = describeSkill(p.before, stats, f, content.summons, effectDefs(), content.ownerRangeOf(p.before.id));
  const ib = describeSkill(p.after, stats, f, content.summons, effectDefs(), content.ownerRangeOf(p.after.id));
  if (ia.cost !== ib.cost) out.push({ label: 'Cost', now: ia.cost, after: ib.cost });
  if ((p.before.cooldown ?? 0) !== (p.after.cooldown ?? 0)) out.push({ label: 'Cooldown', now: ia.cooldown, after: ib.cooldown });
  return out;
}

/** Saf çekirdek: ağaç + level + dağılım (tree-tab'de bekleyen puanlar dahil etkin dağılım). Puan yok / değişen yoksa []. */
export function nextPointLines(tree: TreeData | undefined, level: number, alloc: TreeAlloc, skillId: string, stats: Stats, rules: TreeRules = TREE_RULES): NextLine[] {
  if (!tree || !treeTabEnabled(rules)) return [];
  const out: NextLine[] = [];
  for (const p of pairsFor(tree, level, alloc, skillId, rules)) {
    const changes = diffChanges(p, stats);
    if (changes.length) out.push({ key: p.key, name: p.name, rank: p.rank, max: p.max, changes });
  }
  return out;
}

/** Kahramandan (Gear / Hero ekranı / dizilim kartı): onaylı dağılımla. Ağacı olmayan class -> []. */
export function nextPointLinesFor(src: { class: string; level?: number | undefined; tree?: TreeAlloc | undefined } | undefined, skillId: string, stats: Stats, rules: TreeRules = TREE_RULES): NextLine[] {
  if (!src) return [];
  const tree = treeOf(src.class);
  if (!tree) return [];
  return nextPointLines(tree, Math.max(1, Math.floor(src.level ?? 1)), src.tree ?? { v: tree.version, r: {} }, skillId, stats, rules);
}

/** İpucu satırları: bölüm başlığı + düğüm başına bir yeşil satır ("Name (rank 2): Damage 120 -> 126 · Cooldown 3 turns -> 2 turns"); boşsa []. */
export function nextPointRows(lines: NextLine[]): Array<{ text: string; section?: boolean; color?: string }> {
  if (!lines.length) return [];
  return [
    { text: NEXT_POINT_SECTION, section: true },
    ...lines.map((l) => ({
      text: `${l.name}${l.max > 1 ? ` (rank ${l.rank})` : ''}: ${l.changes.map((c) => (c.now ? `${c.label} ${c.now} → ${c.after}` : `${c.label} ${c.after} (new)`)).join(' · ')}`,
      color: NEXT_POINT_COLOR,
    })),
  ];
}

/** Kahramanın ağaç yamalı skill'i (savaştakiyle aynı derleme; geçersiz / boş dağılım, kapalı sekme ya da yama yoksa taban skill). */
export function treePatchedSkill(src: { class: string; level?: number | undefined; tree?: TreeAlloc | undefined } | undefined, skill: SkillDef, rules: TreeRules = TREE_RULES): SkillDef {
  if (!src?.tree || !treeTabEnabled(rules)) return skill;
  const tree = treeOf(src.class);
  if (!tree) return skill;
  const level = Math.max(1, Math.floor(src.level ?? 1));
  if (validate(tree, level, src.tree, rules)) return skill;
  return skillAt(tree, src.tree, skill.id, skill, rules);
}
