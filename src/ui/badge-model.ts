/**
 * Rozet zinciri modeli (DOM / Phaser yok, test edilir). Tek kural: bir şey ŞİMDİ yapılabiliyorsa (harcanmamış stat /
 * ağaç puanı, torbada görülmemiş item, kasabada alınabilecek hizmet) yol boyunca her kap işaret taşır: harita Gear düğmesi -> kahraman yer imi
 * -> Gear sekmesi -> hedef satır / yuva. Oyun kuralı yok: yalnızca kayıttaki sayılar okunur.
 */
export interface BadgeHeroIn {
  id: string;
  alive: boolean;
  hpRatio: number;
  statPoints?: number;
  skillPoints?: number;
  wounds?: number;
}

export interface BadgeStateIn {
  roster: BadgeHeroIn[];
  active?: Array<string | null>;
  inventory: Array<{ uid: string }>;
  temperStones?: number;
}

export interface HeroBadge {
  stat: number;
  tree: number;
}

export interface BadgeModel {
  heroes: Record<string, HeroBadge>;
  /** Torbada görülmemiş item'ler. */
  newUids: string[];
  /** Harita Gear düğmesindeki toplam (puanlar + yeni item'ler). */
  total: number;
}

const fallen = (h: BadgeHeroIn): boolean => !h.alive || h.hpRatio <= 0;

export function badgeModel(s: BadgeStateIn, seen: ReadonlySet<string>): BadgeModel {
  const heroes: Record<string, HeroBadge> = {};
  let total = 0;
  for (const h of s.roster) {
    // düşmüş kahramanın stat puanı yine harcanabilir (Gear kuralı), ağaç puanı da: ikisi de sayılır
    const b = { stat: Math.max(0, h.statPoints ?? 0), tree: Math.max(0, h.skillPoints ?? 0) };
    heroes[h.id] = b;
    total += b.stat + b.tree;
  }
  const newUids = s.inventory.map((i) => i.uid).filter((u) => !seen.has(u));
  total += newUids.length;
  return { heroes, newUids, total };
}

/** Kasaba yeri rozeti: aday bekliyor (alınabilir), Inn (yaralı / canı eksik kahraman var), demirci (Temper Stone var). */
export function townSpotBadge(action: string, s: BadgeStateIn, recruitWaiting: boolean): boolean {
  if (action === 'recruit') return recruitWaiting;
  if (action === 'inn') return s.roster.some((h) => !fallen(h) && ((h.wounds ?? 0) > 0 || h.hpRatio < 1));
  if (action === 'smith' || action === 'blacksmith') return (s.temperStones ?? 0) > 0;
  return false;
}
