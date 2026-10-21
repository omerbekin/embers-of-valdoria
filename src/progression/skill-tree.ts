// Skill ağacı (Moments) KURAL modülü (saf; Phaser/DOM yok). Tasarım: docs/design/skill-tree-moments.md (bölüm 8 = ea/eb tek yön),
// plan docs/design/skill-tree-implementation.md bölüm 1 ve 3.1. Mockup karşılığı public/mockups/skill-tree-moments/core.js.
// Sayılar TEK yerde: data/skill-trees/_rules.json (TREE_RULES). Durum `TreeAlloc` değişmez nesne gibi kullanılır: take / untake yeni nesne döndürür.
// Kararlar (Ömer 2026-10-21/22): kademe kilidi GLOBAL sayaç (pasif + 3 aktif satır, ult hariç; Mastery bar aynı sayı); ek "o satırda N puan"
// evolve odak şartı YOK; ea / eb birbirini dışlar; ult toplamı en çok 3 puan, L5 / L10 / L15 kilitli; karakter başına en çok 2 evolve;
// ult'ta TEK kol (Ömer 2026-10-22, _rules.json > ult.singleArm): bir kolda puan varsa öbür üç kol alınamaz.
import { LEVELS } from './levels';
import { TREE_RULES, treeKeys, type TreeData, type TreeDir, type TreeNodeKind, type TreeRules, type TreeTier } from './skill-tree-data';

/** Kahramanın ağaç dağılımı: v = class dosyasının sürümü (dağıtıldığı an), r = '<satır>.<id>' -> rank (mockup S.r ile aynı). */
export interface TreeAlloc {
  v: number;
  r: Record<string, number>;
}

/** Kurallardan türetilen düğüm (satır düğümü ya da ult düğümü). */
export interface TreeNode {
  key: string;
  row: number;
  id: string;
  kind: TreeNodeKind;
  max: number;
  /** Satır düğümü: I-IV / E (evolve); ult düğümü: undefined (level kilidi `ultLevel`). */
  tier?: TreeTier;
  col: number;
  lane: number;
  dir?: TreeDir;
  /** Gerek: VE'lenen terimler, her terim VEYA'lanan anahtarlar (core.js req ile aynı). */
  req: string[][];
  arm?: string;
  step?: number;
  ultLevel?: number;
}

export type TreeBlockCode = 'unknown' | 'unapproved' | 'max' | 'direction' | 'needs' | 'tier' | 'evo' | 'evoCap' | 'ultArm' | 'ultCap' | 'ultLevel' | 'points';

/** Neden alınamaz (arayüz metni İngilizce, aynen gösterilir). */
export interface TreeBlock {
  code: TreeBlockCode;
  text: string;
  need?: number;
  have?: number;
}

const ROMAN = ['I', 'II', 'III', 'IV'];

interface NodeTable {
  list: TreeNode[];
  by: Map<string, TreeNode>;
}
const tables = new WeakMap<TreeRules, NodeTable>();

/** Kurallardan düğüm tablosu (kural nesnesi başına bir kez). Sıra = uygulama sırası (satırlar rowShape sırasıyla, sonra ult kol x adım). */
export function treeNodes(rules: TreeRules = TREE_RULES): NodeTable {
  const hit = tables.get(rules);
  if (hit) return hit;
  const list: TreeNode[] = [];
  for (let i = 0; i < rules.rows; i++)
    for (const d of rules.rowShape)
      list.push({
        key: `${i}.${d.id}`,
        row: i,
        id: d.id,
        kind: d.kind,
        max: d.max,
        tier: d.tier,
        col: d.col,
        lane: d.lane,
        ...(d.dir ? { dir: d.dir } : {}),
        req: d.req ? d.req.split(',').map((t) => t.split('|').map((x) => `${i}.${x.trim()}`)) : [],
      });
  const u = rules.rows;
  for (const arm of rules.ult.arms)
    rules.ult.levels.forEach((lv, s) => {
      const step = s + 1;
      list.push({
        key: `${u}.${arm}${step}`,
        row: u,
        id: `${arm}${step}`,
        kind: step === rules.ult.levels.length ? 'notable' : 'edge',
        max: 1,
        col: 0,
        lane: 0,
        req: step > 1 ? [[`${u}.${arm}${step - 1}`]] : [],
        arm,
        step,
        ultLevel: lv,
      });
    });
  const t = { list, by: new Map(list.map((n) => [n.key, n])) };
  if (list.length !== treeKeys(rules).length) throw new Error('skill tree: node table out of sync with treeKeys');
  tables.set(rules, t);
  return t;
}

export const emptyAlloc = (tree: TreeData): TreeAlloc => ({ v: tree.version, r: {} });

/** Level'daki toplam ağaç puanı: (level - 1) x skillPointsPerLevel. */
export const treePool = (level: number): number => Math.max(0, Math.floor(level) - 1) * LEVELS.skillPointsPerLevel;

export const rankOf = (a: TreeAlloc, key: string): number => a.r[key] ?? 0;
export function spent(a: TreeAlloc): number {
  let t = 0;
  for (const k in a.r) t += a.r[k]!;
  return t;
}
export function rowSpent(a: TreeAlloc, row: number): number {
  let t = 0;
  const p = `${row}.`;
  for (const k in a.r) if (k.startsWith(p)) t += a.r[k]!;
  return t;
}
export const ultSpent = (a: TreeAlloc, rules: TreeRules = TREE_RULES): number => rowSpent(a, rules.rows);
/** Kilit sayacı + Mastery bar: pasif + 3 aktif satıra harcanan TOPLAM (ult hariç; evolve puanları dahil, core.js ile aynı). */
export const counter = (a: TreeAlloc, rules: TreeRules = TREE_RULES): number => spent(a) - ultSpent(a, rules);
export const free = (level: number, a: TreeAlloc): number => treePool(level) - spent(a);
/** Puan verilmiş ult kolları (rules.ult.arms sırasıyla; geçerli dağılımda singleArm açıkken en çok bir tane). */
export function ultArmsUsed(a: TreeAlloc, rules: TreeRules = TREE_RULES): string[] {
  const u = rules.rows;
  return rules.ult.arms.filter((arm) => rules.ult.levels.some((_, s) => rankOf(a, `${u}.${arm}${s + 1}`) > 0));
}
/** Seçilmiş ult kolu (ilk puanlı kol) ya da null. */
export const ultArm = (a: TreeAlloc, rules: TreeRules = TREE_RULES): string | null => ultArmsUsed(a, rules)[0] ?? null;

const evoCount = (a: TreeAlloc, rules: TreeRules): number => treeNodes(rules).list.filter((n) => n.kind === 'evolve' && rankOf(a, n.key) > 0).length;
const termMet = (a: TreeAlloc, term: string[]): boolean => term.some((k) => rankOf(a, k) > 0);
const unmetTerm = (a: TreeAlloc, nd: TreeNode): string[] | null => nd.req.find((t) => !termMet(a, t)) ?? null;
const nameOf = (tree: TreeData, key: string): string => tree.nodes[key]?.name ?? key;

/** NEW düğüm onay bekliyor mu (alınamaz). */
export const isUnapproved = (tree: TreeData, key: string): boolean => !!tree.nodes[key]?.new && !tree.nodes[key]?.approved;
/** Etkisi yazılmamış düğüm (fx null): puan alınabilir, motor yok sayar ("Not active yet"). */
export const isInert = (tree: TreeData, key: string): boolean => !tree.nodes[key]?.fx;

/**
 * Düğüme +1 rank konabilir mi? null = evet; değilse neden. `noPoints`: puan sınırına bakma (doğrulama). Sıra: bilinmeyen -> onay -> tavan ->
 * yön (ea / eb) -> tür kuralı (evolve: tavan, gerek, sayaç; ult: tek kol, ult tavanı, level, gerek; diğer: kademe, gerek) -> puan.
 * Ult'ta tek kol tavandan önce bakılır: kol doluyken öbür kollar "tavan" değil "başka kol seçildi" der (bugünkü kurallarla ultCap yalnızca
 * kol 3'ten uzun / max 3'ten küçük veride görülür).
 */
export function check(tree: TreeData, level: number, a: TreeAlloc, key: string, opts: { noPoints?: boolean } = {}, rules: TreeRules = TREE_RULES): TreeBlock | null {
  const nd = treeNodes(rules).by.get(key);
  if (!nd || !tree.nodes[key]) return { code: 'unknown', text: 'Unknown node' };
  if (isUnapproved(tree, key)) return { code: 'unapproved', text: 'Awaiting approval' };
  if (rankOf(a, key) >= nd.max) return { code: 'max', text: 'Max rank' };
  if (rules.exclusiveEdges && nd.dir) {
    const other = nd.dir === 'a' ? 'b' : 'a';
    if (rankOf(a, `${nd.row}.e${other}`) > 0) return { code: 'direction', text: 'Other direction chosen' };
  }
  if (nd.kind === 'evolve') {
    const n = evoCount(a, rules);
    if (n >= rules.evolveMax) return { code: 'evoCap', text: `Only ${rules.evolveMax} Evolves per hero` };
    const um = unmetTerm(a, nd);
    if (um) return { code: 'needs', text: `Needs ${um.map((k) => nameOf(tree, k)).join(' or ')}` };
    const need = rules.evolveNeed[n]!;
    const have = counter(a, rules);
    if (have < need) return { code: 'evo', text: `Evolve ${ROMAN[n]} needs ${need} tree points (have ${have})`, need, have };
  } else if (nd.arm) {
    if (rules.ult.singleArm) {
      const other = ultArmsUsed(a, rules).find((arm) => arm !== nd.arm);
      if (other) return { code: 'ultArm', text: `One ult path only: the ${nameOf(tree, `${nd.row}.${other}1`)} path is already chosen` };
    }
    if (ultSpent(a, rules) >= rules.ult.max) return { code: 'ultCap', text: `Ult takes ${rules.ult.max} points at most` };
    const need = nd.ultLevel!;
    if (level < need) return { code: 'ultLevel', text: `Ult node needs Lv ${need} (you are Lv ${Math.floor(level)})`, need, have: Math.floor(level) };
    const um = unmetTerm(a, nd);
    if (um) return { code: 'needs', text: `Needs ${um.map((k) => nameOf(tree, k)).join(' or ')}` };
  } else {
    const need = rules.tierNeed[nd.tier!] ?? 0;
    const have = counter(a, rules);
    if (have < need) return { code: 'tier', text: `Tier ${nd.tier} needs ${need} tree points (have ${have})`, need, have };
    const um = unmetTerm(a, nd);
    if (um) return { code: 'needs', text: `Needs ${um.map((k) => nameOf(tree, k)).join(' or ')}` };
  }
  if (!opts.noPoints && free(level, a) <= 0) return { code: 'points', text: 'No points left' };
  return null;
}

const withRank = (a: TreeAlloc, key: string, delta: number): TreeAlloc => {
  const r = { ...a.r };
  const n = (r[key] ?? 0) + delta;
  if (n > 0) r[key] = n;
  else delete r[key];
  return { v: a.v, r };
};

/** +1 rank (yeni dağılım) ya da neden. */
export function take(tree: TreeData, level: number, a: TreeAlloc, key: string, rules: TreeRules = TREE_RULES): { ok: true; alloc: TreeAlloc } | { ok: false; block: TreeBlock } {
  const b = check(tree, level, a, key, {}, rules);
  return b ? { ok: false, block: b } : { ok: true, alloc: withRank(a, key, 1) };
}

/**
 * Dağılım geçerli mi: tüm harcama boş ağaçtan yasal bir sırayla kurulabilir mi (core.js açgözlü kurulum) + bilinmeyen anahtar, tam sayı olmayan /
 * tavanı aşan rank, level havuzunu aşan toplam, ea + eb birlikte, iki ult kolunda puan (singleArm) ve onaysız NEW geçersiz. null = geçerli;
 * değilse ilk sorunlu anahtar + neden.
 */
export function validate(tree: TreeData, level: number, a: TreeAlloc, rules: TreeRules = TREE_RULES): (TreeBlock & { key: string | null }) | null {
  const { by } = treeNodes(rules);
  const keys = Object.keys(a.r);
  for (const k of keys) {
    const nd = by.get(k);
    const v = a.r[k]!;
    if (!nd || !tree.nodes[k]) return { key: k, code: 'unknown', text: 'Unknown node' };
    if (!Number.isInteger(v) || v < 0 || v > nd.max) return { key: k, code: 'max', text: `Invalid rank ${v}` };
    if (v > 0 && isUnapproved(tree, k)) return { key: k, code: 'unapproved', text: 'Awaiting approval' };
  }
  if (spent(a) > treePool(level)) return { key: keys[0] ?? null, code: 'points', text: 'Too many points for this level' };
  let t: TreeAlloc = { v: a.v, r: {} };
  const rem: Record<string, number> = {};
  for (const k of keys) if (a.r[k]! > 0) rem[k] = a.r[k]!;
  let progress = true;
  while (progress) {
    progress = false;
    for (const k of keys)
      while ((rem[k] ?? 0) > 0) {
        if (check(tree, level, t, k, { noPoints: true }, rules)) break;
        t = withRank(t, k, 1);
        rem[k] = rem[k]! - 1;
        progress = true;
      }
  }
  for (const k of keys)
    if ((rem[k] ?? 0) > 0) {
      const b = check(tree, level, t, k, { noPoints: true }, rules);
      return { key: k, ...(b ?? { code: 'needs' as const, text: 'Invalid' }) };
    }
  return null;
}

/** -1 rank (yeni dağılım) ya da neden ("Needed by X": bağımlıyı bozuyorsa; kademe / evolve sayacını düşürüyorsa). */
export function untake(tree: TreeData, level: number, a: TreeAlloc, key: string, rules: TreeRules = TREE_RULES): { ok: true; alloc: TreeAlloc } | { ok: false; reason: string; by?: string } {
  if (!(rankOf(a, key) > 0)) return { ok: false, reason: 'Nothing to remove' };
  const next = withRank(a, key, -1);
  const v = validate(tree, level, next, rules);
  if (!v) return { ok: true, alloc: next };
  const { list, by } = treeNodes(rules);
  const dep = rankOf(next, key) === 0 ? list.find((d) => rankOf(next, d.key) > 0 && d.req.some((term) => term.includes(key) && !termMet(next, term))) : undefined;
  let reason: string;
  if (dep) reason = `Needed by ${nameOf(tree, dep.key)}`;
  else if (v.key && v.code === 'tier') reason = `Tier ${by.get(v.key)?.tier} (${rules.tierNeed[by.get(v.key)?.tier ?? 'I']} pts) still needed by ${nameOf(tree, v.key)}`;
  else if (v.key && v.code === 'evo') reason = `Counter ${v.need} still needed by ${nameOf(tree, v.key)}`;
  else reason = `Needed by ${v.key ? nameOf(tree, v.key) : key}`;
  return { ok: false, reason, ...(v.key ? { by: v.key } : {}) };
}

/**
 * Arayüz durumu: max / part / av (alınabilir) / tlk (kademe-level kilidi) / rq (gerek eksik) / xl (evolve ya da ult tavanı) / dir (karşı yön:
 * ea / eb ya da başka ult kolu seçildi; ikisi de "o yolu seçtin, bu kapandı" demek) / new (onay bekliyor).
 */
export type TreeNodeState = 'max' | 'part' | 'av' | 'tlk' | 'rq' | 'xl' | 'dir' | 'new';

export function status(tree: TreeData, level: number, a: TreeAlloc, key: string, rules: TreeRules = TREE_RULES): { rank: number; max: number; st: TreeNodeState; block: TreeBlock | null; inert: boolean } {
  const nd = treeNodes(rules).by.get(key);
  const r = rankOf(a, key);
  const block = check(tree, level, a, key, {}, rules);
  const max = nd?.max ?? 0;
  let st: TreeNodeState;
  if (block?.code === 'unapproved') st = 'new';
  else if (r >= max) st = 'max';
  else if (r > 0) st = 'part';
  else if (!block || block.code === 'points') st = 'av';
  else if (block.code === 'direction' || block.code === 'ultArm') st = 'dir';
  else if (block.code === 'tier' || block.code === 'evo' || block.code === 'ultLevel') st = 'tlk';
  else if (block.code === 'evoCap' || block.code === 'ultCap') st = 'xl';
  else st = 'rq';
  return { rank: r, max, st, block, inert: isInert(tree, key) };
}

/** Şu an alınabilecek en az bir düğüm var mı (puan dahil). */
export const anyOpen = (tree: TreeData, level: number, a: TreeAlloc, rules: TreeRules = TREE_RULES): boolean =>
  treeNodes(rules).list.some((n) => !check(tree, level, a, n.key, {}, rules));

/** Mastery bar: barAt eşiklerinin her biri sayaçla açık mı (seçim yok; respec sayacı düşürürse kapanır). */
export const barReached = (a: TreeAlloc, rules: TreeRules = TREE_RULES): boolean[] => rules.barAt.map((t) => counter(a, rules) >= t);

/** Evolve durumu: kaç evolve alındı, sıradaki kaç sayaç ister, şimdi açık mı. */
export function evoState(a: TreeAlloc, rules: TreeRules = TREE_RULES): { n: number; capped: boolean; need: number | null; open: boolean; have: number; label: string } {
  const n = evoCount(a, rules);
  const have = counter(a, rules);
  if (n >= rules.evolveMax) return { n, capped: true, need: null, open: false, have, label: 'Evolve' };
  const need = rules.evolveNeed[n]!;
  return { n, capped: false, need, open: have >= need, have, label: `Evolve ${ROMAN[n]}` };
}

/**
 * Kayıttan okunan dağılımın onarımı (idempotent; Faz 1b normalizeTree bunu çağırır): bilinmeyen / tam sayı olmayan anahtar atılır (`dropped`),
 * rank tavana kırpılır, 0 rank silinir; kalan dağılım geçersizse (level, kilit, ea + eb, iki ult kolu, onaysız NEW) ağacın TAMAMI iade edilir
 * (`reset`).
 * Geçerli dağılım aynen kalır (sürümü `v` dahil; sürüm farkı Faz 1b'nin işi: bir kez bedava sıfırlama hakkı).
 */
export function repair(tree: TreeData, level: number, raw: unknown, rules: TreeRules = TREE_RULES): { alloc: TreeAlloc; reset: boolean; dropped: string[] } {
  const { by } = treeNodes(rules);
  const src = raw && typeof raw === 'object' ? (raw as { v?: unknown; r?: unknown }) : {};
  const ranks = src.r && typeof src.r === 'object' ? (src.r as Record<string, unknown>) : {};
  const dropped: string[] = [];
  const r: Record<string, number> = {};
  for (const [k, v] of Object.entries(ranks)) {
    const nd = by.get(k);
    if (!nd || !tree.nodes[k] || typeof v !== 'number' || !Number.isInteger(v)) {
      dropped.push(k);
      continue;
    }
    if (v > 0) r[k] = Math.min(v, nd.max);
  }
  const a: TreeAlloc = { v: typeof src.v === 'number' && Number.isFinite(src.v) ? src.v : tree.version, r };
  if (validate(tree, level, a, rules)) return { alloc: emptyAlloc(tree), reset: true, dropped };
  return { alloc: a, reset: false, dropped };
}

/** Respec: ağacın tamamı geri alınır (Ömer 10a: tek düğüm geri alma yok; altın bedeli `respecCost`, kahraman / kayıt tarafı skill-tree-hero.ts). */
export const respec = (tree: TreeData): TreeAlloc => emptyAlloc(tree);

/** Respec altın bedeli: _rules.json > respec (base + perLevel x level; provizyon, open-questions 379). Kural yoksa 0. */
export function respecCost(level: number, rules: TreeRules = TREE_RULES): number {
  const r = rules.respec;
  if (!r) return 0;
  return Math.max(0, Math.round(r.base + r.perLevel * Math.max(1, Math.floor(level))));
}

/**
 * Odaklı kurulum seçenekleri: yön (ea/eb; iki satırda aynı, varsayılan a), ult kolu (verilirse her ult kilidi açılınca puan önce oraya; tek kol
 * kuralı: başlangıç dağılımında başka bir kol zaten seçiliyse o kol sürdürülür; verilmezse ult puanı yalnızca son "açık düğüm" adımında, ilk açılan
 * kola gider ve check o kolda tutar: ult puanı hiçbir durumda iki kola dağılmaz),
 * `from` = başlangıç dağılımı (verilmezse boş ağaç; sim vekili kahramanın onaylı ağacından sürdürür: focusBuild(L) dağılımından başlanınca sonuç
 * focusBuild(L + 1) ile aynı).
 */
export interface FocusOptions {
  dir?: TreeDir;
  ult?: string;
  from?: TreeAlloc;
}

function nextFocusKey(tree: TreeData, level: number, a: TreeAlloc, A: number, B: number, o: FocusOptions, rules: TreeRules): string | null {
  const open = (k: string) => !check(tree, level, a, k, {}, rules);
  const d = o.dir ?? 'a';
  // Tek kol: dağılımda seçilmiş kol varsa ön ayardaki kolun yerine o doldurulur (öbür kollar check'te kapalı)
  const arm = o.ult ? ((rules.ult.singleArm ? ultArm(a, rules) : null) ?? o.ult) : null;
  if (arm) for (let s = 1; s <= rules.ult.levels.length; s++) {
    const k = `${rules.rows}.${arm}${s}`;
    if (rankOf(a, k) < 1 && open(k)) return k;
  }
  for (const R of [A, B]) if (open(`${R}.v`)) return `${R}.v`;
  for (const id of ['n0', `m${d}`, `f${d}`, `e${d}`, 'r', 'f3', 'f2', 'f1']) if (open(`${A}.${id}`)) return `${A}.${id}`;
  for (const id of ['f1', 'f2', 'f3', 'n0', 'r', `e${d}`, `m${d}`]) if (rankOf(a, `${B}.${id}`) < 1 && open(`${B}.${id}`)) return `${B}.${id}`;
  for (const id of ['f3', 'f2', 'f1', 'r', `f${d}`, `e${d}`, `m${d}`]) if (open(`${B}.${id}`)) return `${B}.${id}`;
  // İki satır doldu: kalan puan sıradaki açık düğüme (satır sırası, sonra ult); yön kuralı check içinde
  for (const n of treeNodes(rules).list) if (open(n.key)) return n.key;
  return null;
}

/**
 * Odaklı kurulum (sim vekili / debug; core.js focusPlan + moments.md bölüm 8): L2'den `level`'a her level'ın puanı sırayla harcanır. A satırı tek
 * yönle doldurulur (20 puan), sonra B satırının Tier I'i (sayaç 23 -> A evolve L25), sonra B'nin yolu (evolve II L40); iki satır dolunca kalan puan
 * açık düğümlere. Hiçbir level'da puan boşta kalmaz.
 */
export function focusBuild(tree: TreeData, rows: [number, number], level: number, o: FocusOptions = {}, rules: TreeRules = TREE_RULES): TreeAlloc {
  let a: TreeAlloc = o.from ? { v: tree.version, r: { ...o.from.r } } : emptyAlloc(tree);
  const top = Math.floor(level);
  for (let lv = 2; lv <= top; lv++)
    while (free(lv, a) > 0) {
      const k = nextFocusKey(tree, lv, a, rows[0], rows[1], o, rules);
      if (!k) break;
      a = withRank(a, k, 1);
    }
  return a;
}
