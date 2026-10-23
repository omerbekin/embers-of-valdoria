// Seferde skill ağacı (saf; Faz 1b, plan docs/design/skill-tree-implementation.md 3.3 + 10a). Kurallar src/progression/skill-tree-hero.ts;
// burası sefer durumuna yazar (xp.ts > allocateStats kalıbı: yeni durum döner, girdi değişmez). Geçersiz işlem durumu DEĞİŞTİRMEZ (aynı nesne
// döner); nedeni `...Blocked` fonksiyonları verir (Gear kaynağı onu Error olarak gösterir). Duraklatılmış savaş varken kilitli (PAUSED_LOCK;
// Ömer 10a: respec savaş dışında).
import { applyRespec, applyTree, autoTreeHero, normalizeTree, respecBlocked, treeChangeBlocked } from '../progression/skill-tree-hero';
import { focusBuild, rankOf, type TreeAlloc } from '../progression/skill-tree';
import { treeOf } from '../progression/skill-tree-data';
import { evolveKeys } from '../progression/skill-tree-evolve';
import { campaignMaxLevel } from '../progression/levels';
import { debugSetLevel } from './xp';
import { PAUSED_LOCK, pausedLock } from './state';
import type { CampaignState, Hero } from './types';

const clone = (s: CampaignState): CampaignState => JSON.parse(JSON.stringify(s)) as CampaignState;
const heroIn = (s: CampaignState, id: string): Hero | undefined => s.roster.find((h) => h.id === id);

/** Ağaç onayı yapılamıyorsa nedeni (yoksa null). `alloc` = onaylanacak TAM dağılım (onaylı ağaç + yeni puanlar). */
export function heroTreeBlocked(s: CampaignState, heroId: string, alloc: TreeAlloc): string | null {
  if (pausedLock(s)) return PAUSED_LOCK;
  const h = heroIn(s, heroId);
  if (!h) return 'Unknown hero';
  return treeChangeBlocked(h, alloc);
}

/** Ağaç onayı (Gear > Confirm; Faz 3b): doğrulanır, yeni puanlar harcanmamıştan düşer. Geçersizse durum aynen döner. Düşmüş kahraman da harcayabilir. */
export function setHeroTree(s: CampaignState, heroId: string, alloc: TreeAlloc): CampaignState {
  if (heroTreeBlocked(s, heroId, alloc)) return s;
  const t = clone(s);
  applyTree(heroIn(t, heroId)!, alloc);
  return t;
}

/** Respec yapılamıyorsa nedeni (yoksa null): duraklatılmış savaş, ağaç / onaylı puan yok, altın yetmiyor. */
export function respecTreeBlocked(s: CampaignState, heroId: string): string | null {
  if (pausedLock(s)) return PAUSED_LOCK;
  const h = heroIn(s, heroId);
  if (!h) return 'Unknown hero';
  return respecBlocked(h, s.gold);
}

/**
 * Respec (Ömer 10a): onaylı ağacın TAMAMI sıfırlanır, puanlar harcanmamışa döner, bedel sefer altınından düşer (progression > heroRespecCost;
 * `freeRespec` varsa bir kez bedava). Geçersizse durum aynen döner.
 */
export function respecHeroTree(s: CampaignState, heroId: string): CampaignState {
  if (respecTreeBlocked(s, heroId)) return s;
  const t = clone(s);
  t.gold -= applyRespec(heroIn(t, heroId)!);
  return t;
}

/** Oyuncu vekili (sim / otomatik; autoAllocateAll gibi): ağacı olan herkesin harcanmamış puanları odaklı kurulumla harcanır. */
export function autoTreeAll(s: CampaignState): CampaignState {
  if (!s.roster.some((h) => (h.skillPoints ?? 0) > 0 && treeOf(h.class))) return s;
  const t = clone(s);
  for (const h of t.roster) autoTreeHero(h);
  return t;
}

/**
 * DEBUG (evolve ikonu denemesi): o class'ın ilk kahramanına, verilen skill'in evolve'una ulaşan geçerli bir ağaç yazar (onaylı: Gear > Tree'de dolu
 * görünür, evolve ikonu animasyonlanır). Gerekli en küçük level'a çıkarır (sefer tavanına kadar; stat puanları dağıtılmamış kalır, setLevel gibi),
 * ağaç odaklı kurulumla (satır = o skill, öbür satır 1; yön a) kurulur, kalan puan harcanmamış kalır. Class / skill / kahraman yoksa durum aynen döner.
 */
export function debugGrantEvolve(s: CampaignState, classId: string, skillId: string): CampaignState {
  const tree = treeOf(classId);
  const hero = s.roster.find((h) => h.class === classId);
  const row = tree?.rows.findIndex((r) => r.skill === skillId) ?? -1;
  if (!tree || !hero || row < 0) return s;
  const key = evolveKeys().get(row);
  if (!key) return s;
  for (let lv = 2; lv <= campaignMaxLevel(); lv++) {
    const alloc = focusBuild(tree, [row, row === 1 ? 2 : 1], lv, { dir: 'a' });
    if (rankOf(alloc, key) < 1) continue;
    const t = debugSetLevel(s, Math.max(lv, hero.level ?? 1), hero.id);
    const h = heroIn(t, hero.id)!;
    h.tree = alloc;
    normalizeTree(h);
    return t;
  }
  return s;
}
