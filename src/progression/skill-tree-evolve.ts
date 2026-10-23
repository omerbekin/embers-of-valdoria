// Skill ağacı: EVOLVE çözücüsü (saf; Phaser/DOM yok). Ömer 2026-10-23: bir skill'in evolve düğümü ONAYLIYSA o skill'in ikonu o kayıtta
// her yerde döngülü animasyonla gösterilir; evolve sanatı varsa ikon onunla değişir (yoksa normal ikon animasyonlanır).
// Kural burada TEK yerde: hangi satır hangi skill, evolve düğümü hangisi (rowShape'ten türetilir), onaylı mı (rank >= 1), mod açık mı.
// Arayüz (src/ui/evolve-icon.ts) ve BattleScene bunu çağırır; kuralı kendisi yazmaz. Bekleyen (onaylanmamış) puan hiç sayılmaz:
// yalnızca kahramanın KAYITLI (onaylı) `tree` alanı okunur.
import { rankOf, treeNodes, type TreeAlloc } from './skill-tree';
import { treeEnabled } from './skill-tree-compile';
import { TREE_RULES, treeOf, type TreeMode, type TreeRules } from './skill-tree-data';

/** Ağacı olan kahramanın bu işte gereken kısmı (sefer Hero'su / Endless kahramanı bu şekle uyar). */
export interface EvolveSource {
  class: string;
  tree?: TreeAlloc | undefined;
}

/** Evolve düğümlerinin satır anahtarları: satır indeksi -> düğüm anahtarı (ör. 3 -> '3.v'). Kurallardan türetilir (rowShape > kind 'evolve'). */
export function evolveKeys(rules: TreeRules = TREE_RULES): Map<number, string> {
  const out = new Map<number, string>();
  for (const n of treeNodes(rules).list) if (n.kind === 'evolve') out.set(n.row, n.key);
  return out;
}

/** Aktif (onaylı) evolve'ların satır indeksleri; mod kapalı / ağaçsız class / ağaç yok -> boş. `mode` verilmezse (Quick Battle vb.) boş. */
export function evolvedRows(h: EvolveSource, mode: TreeMode | undefined, rules: TreeRules = TREE_RULES): number[] {
  if (!h.tree || !treeOf(h.class) || !treeEnabled(mode, rules)) return [];
  const rows: number[] = [];
  for (const [row, key] of evolveKeys(rules)) if (rankOf(h.tree, key) >= 1) rows.push(row);
  return rows.sort((a, b) => a - b);
}

/** Evolve'u aktif skill id'leri (pasif satırı 0 = pasifin id'si `rows[0].skill`; ult'ta evolve yok). */
export function evolvedSkillIds(h: EvolveSource, mode: TreeMode | undefined, rules: TreeRules = TREE_RULES): string[] {
  const tree = treeOf(h.class);
  if (!tree) return [];
  return evolvedRows(h, mode, rules).flatMap((r) => (tree.rows[r]?.skill ? [tree.rows[r]!.skill] : []));
}

/** Evolve sanatının kimliği: '<sınıf>/<satır>_<düğüm id>' (dosya assets/tree-icons/<sınıf>/<satır>_v.png). */
export const evolveArtId = (classId: string, nodeKey: string): string => `${classId}/${nodeKey.replace('.', '_')}`;

export interface EvolveIcon {
  /** Skill'in evolve'u aktif: ikon animasyonlanır. */
  evolved: boolean;
  /** Evolve sanatı varsa kimliği ('warrior/3_v'), yoksa null (normal skill ikonu animasyonlanır). */
  art: string | null;
}

/** Skill'in evolve düğümünün sanatı (onaydan BAĞIMSIZ; Tree ekranında evolve düğümü kendi sanatını gösterir). Skill'in evolve satırı / dosyası yoksa null. */
export function evolveArtFor(classId: string, skillId: string, hasArt: (artId: string) => boolean, rules: TreeRules = TREE_RULES): string | null {
  const tree = treeOf(classId);
  if (!tree) return null;
  const keys = evolveKeys(rules);
  for (const [row, key] of keys) {
    if (tree.rows[row]?.skill !== skillId) continue;
    const id = evolveArtId(classId, key);
    return hasArt(id) ? id : null;
  }
  return null;
}

/**
 * Tek skill için ikon kararı. `hasArt`: sanat dosyası var mı (arayüz verir; testte sahte). Evolve aktif değilse { evolved: false, art: null }.
 * `evolvedIds` verilirse (savaş birimi: UnitSetup.evolved) kahramanın dağılımı yerine o liste kullanılır (mod kararı kurulumda verilmişti).
 */
export function resolveEvolveIcon(h: EvolveSource, skillId: string, mode: TreeMode | undefined, hasArt: (artId: string) => boolean, rules: TreeRules = TREE_RULES, evolvedIds?: readonly string[]): EvolveIcon {
  const on = evolvedIds ? evolvedIds.includes(skillId) : evolvedSkillIds(h, mode, rules).includes(skillId);
  return on ? { evolved: true, art: evolveArtFor(h.class, skillId, hasArt, rules) } : { evolved: false, art: null };
}
