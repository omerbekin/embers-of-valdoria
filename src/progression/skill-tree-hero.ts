// Skill ağacı: kahraman / kayıt tarafı (Faz 1b; plan docs/design/skill-tree-implementation.md 3.3 + 10a). Saf (Phaser/DOM yok); sefer
// (src/campaign/tree.ts) ve Endless (src/endless/run.ts) ince sarmalayıcılarla kullanır. Puan modeli stat puanıyla aynı: `skillPoints` =
// HARCANMAMIŞ puan, harcanan = onaylı ağaçtaki rank toplamı; değişmez kural skillPoints + harcanan = (level - 1) x skillPointsPerLevel.
// Kayıtta ağaç yalnızca puan harcanmışsa durur (alan yok = boş ağaç; göç gerekmez).
import { focusBuild, rankOf, repair, respecCost, spent, treePool, validate, type TreeAlloc } from './skill-tree';
import { TREE_RULES, treeOf, type TreeData, type TreeDir, type TreeRules } from './skill-tree-data';

/** Ağacı olan kahraman (sefer Hero'su ve Endless kahramanı bu şekle uyar). */
export interface TreeHero {
  id: string;
  class: string;
  level?: number;
  skillPoints?: number;
  /** Onaylı ağaç dağılımı (yoksa boş ağaç). */
  tree?: TreeAlloc;
  /** Ağaç verisi (class dosyasının version'ı) değişti: bir kez bedava respec hakkı (kayıtta kalır; respec kullanılınca silinir). */
  freeRespec?: boolean;
  /** Geçersiz dağılım okumada tamamen iade edildi: Gear bir kez TREE_RESET_NOTICE gösterecek (Faz 3b; şimdilik yalnızca bayrak). */
  treeReset?: boolean;
}

/** Faz 3b Gear bildirimi (treeReset bayrağı). */
export const TREE_RESET_NOTICE = 'Your skill tree was reset after an update. Points refunded.';

const heroLevel = (h: Pick<TreeHero, 'level'>): number => Math.max(1, Math.floor(h.level ?? 1));
/** Onaylı ağaçta harcanan puan (ağaç yoksa 0). */
export const treeSpent = (h: Pick<TreeHero, 'tree'>): number => (h.tree ? spent(h.tree) : 0);

/** Dağılımı kahramana yazar: puan harcanmışsa güncel sürümle, değilse alan silinir (tek biçim: kayıt / bellek karşılaştırması tutarlı). */
function writeTree(h: TreeHero, a: TreeAlloc, tree: TreeData): void {
  const r: Record<string, number> = {};
  for (const [k, v] of Object.entries(a.r)) if (v > 0) r[k] = v;
  if (Object.keys(r).length) h.tree = { v: tree.version, r };
  else delete h.tree;
}

/**
 * Kayıttan okunan kahramanın ağacını onarır (YERİNDE; her okumada, idempotent; normalizeLevelFields'ten SONRA çağrılır, level onarılmış olmalı):
 * (1) bilinmeyen / tam sayı olmayan anahtar atılır, rank tavana kırpılır (skill-tree.ts > repair); (2) kalan dağılım geçersizse (level, kilit,
 * ea + eb birlikte, onaysız NEW) ağacın TAMAMI bedava iade edilir + `treeReset`; (3) skillPoints = havuz - harcanan (tutmazsa düzeltilir; geçerli
 * dağılım asla silinmez); (4) kayıttaki `v` class dosyasının version'ından farklıysa ve dağılım geçerliyse ağaç kalır, bir kez bedava respec hakkı
 * (`freeRespec`) verilir ve `v` güncellenir (hak bayrakta saklanır, tekrar verilmez). Ağaç verisi olmayan class: tree alanına ve puanlara dokunulmaz
 * (puanlar birikir).
 */
export function normalizeTree(h: TreeHero, rules: TreeRules = TREE_RULES): void {
  if (h.freeRespec !== true) delete h.freeRespec;
  if (h.treeReset !== true) delete h.treeReset;
  const tree = treeOf(h.class);
  if (!tree) return;
  const level = heroLevel(h);
  if (h.tree !== undefined) {
    const { alloc, reset } = repair(tree, level, h.tree, rules);
    if (reset) h.treeReset = true;
    else if (alloc.v !== tree.version && spent(alloc) > 0) h.freeRespec = true;
    writeTree(h, alloc, tree);
  }
  h.skillPoints = treePool(level) - treeSpent(h);
}

/**
 * Ağaç onayı yapılabilir mi (yoksa null): `alloc` = onaylanacak TAM dağılım (onaylı ağaç + yeni puanlar; Gear'da Confirm'e kadar bekleyen puan
 * bedava geri alınır, onaylı puan yalnızca tam respec ile geri gelir: Ömer 10a). Kurallar: class'ın ağacı var; dağılım level'da geçerli
 * (skill-tree.ts > validate); onaylı hiçbir rank düşmez; en az 1 yeni puan; yeni puanlar harcanmamış puandan fazla değil.
 */
export function treeChangeBlocked(h: TreeHero, alloc: TreeAlloc, rules: TreeRules = TREE_RULES): string | null {
  const tree = treeOf(h.class);
  if (!tree) return 'This class has no skill tree yet';
  if (!alloc || typeof alloc !== 'object' || !alloc.r || typeof alloc.r !== 'object') return 'Invalid skill tree';
  const bad = validate(tree, heroLevel(h), { v: tree.version, r: alloc.r }, rules);
  if (bad) return bad.text;
  const cur = h.tree?.r ?? {};
  for (const k of Object.keys(cur)) if (rankOf(alloc, k) < cur[k]!) return 'Confirmed points can only be refunded by a full reset';
  const add = spent(alloc) - treeSpent(h);
  if (add <= 0) return 'No points to spend';
  if (add > (h.skillPoints ?? 0)) return 'Not enough skill points';
  return null;
}

/** Onaylı dağılımı yazar ve yeni puanları harcanmamıştan düşer (YERİNDE; önce treeChangeBlocked null olmalı). */
export function applyTree(h: TreeHero, alloc: TreeAlloc): void {
  const tree = treeOf(h.class);
  if (!tree) return;
  const add = spent(alloc) - treeSpent(h);
  writeTree(h, alloc, tree);
  h.skillPoints = (h.skillPoints ?? 0) - add;
}

/** Kahramanın şu anki respec bedeli (bedava hakkı varsa 0; skill-tree.ts > respecCost). */
export const heroRespecCost = (h: TreeHero, rules: TreeRules = TREE_RULES): number => (h.freeRespec ? 0 : respecCost(heroLevel(h), rules));

/** Respec yapılabilir mi (yoksa null): ağacı var, onaylı puan var, altın yetiyor (`gold`: sefer altını / Endless koşu altını). */
export function respecBlocked(h: TreeHero, gold: number, rules: TreeRules = TREE_RULES): string | null {
  if (!treeOf(h.class)) return 'This class has no skill tree yet';
  if (!treeSpent(h)) return 'No skill points to reset';
  const cost = heroRespecCost(h, rules);
  if (cost > gold) return `Not enough gold (${cost} needed)`;
  return null;
}

/** Respec (YERİNDE; önce respecBlocked null olmalı): ağacın tamamı geri, puanlar harcanmamışa, bedava hak kullanılır. Dönen: ödenecek altın. */
export function applyRespec(h: TreeHero, rules: TreeRules = TREE_RULES): number {
  const cost = heroRespecCost(h, rules);
  h.skillPoints = (h.skillPoints ?? 0) + treeSpent(h);
  delete h.tree;
  delete h.freeRespec;
  return cost;
}

/** Sim / otomatik oyuncu vekilinin odak planı: _rules.json > debugFocus ön ayarı (yoksa satır 1 + 2), yön a. */
export function autoTreePlan(classId: string, rules: TreeRules = TREE_RULES): { rows: [number, number]; dir: TreeDir; ult?: string } {
  const p = rules.debugFocus?.[classId];
  return { rows: p?.rows ?? [1, 2], dir: 'a', ...(p?.ult ? { ult: p.ult } : {}) };
}

/**
 * Oyuncu vekili (sim / otomatik; YERİNDE): harcanmamış puanlar onaylı ağacın üstüne odaklı kurulumla harcanır (skill-tree.ts > focusBuild,
 * `from` = onaylı ağaç). Ağacı olmayan class / puanı olmayan kahraman değişmez. Dönen: değişti mi.
 */
export function autoTreeHero(h: TreeHero, rules: TreeRules = TREE_RULES): boolean {
  const tree = treeOf(h.class);
  if (!tree || (h.skillPoints ?? 0) <= 0) return false;
  const p = autoTreePlan(h.class, rules);
  const next = focusBuild(tree, p.rows, heroLevel(h), { dir: p.dir, ...(p.ult ? { ult: p.ult } : {}), ...(h.tree ? { from: h.tree } : {}) }, rules);
  if (treeChangeBlocked(h, next, rules)) return false;
  applyTree(h, next);
  return true;
}
