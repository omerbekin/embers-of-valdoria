/**
 * Poz kütüphanesi (src/game/poses.ts) için savaşa giden TAKILI SİLAHLAR (yalnızca sunum; motor okumaz): sefer ve Endless kahramanlarının
 * gerçek donanımından birim uid'i ('party-i', i = planın heroOrder dizini) -> silah item'i { id, family, rarity }. BattleScene silah
 * görselini bundan seçer (`weaponFor`); boş yuvalı kahraman sınıfın varsayılan silahını taşır. Saf (Phaser yok).
 */
import { itemDef, type ItemInstance } from '../progression/items';

export interface WeaponItem {
  id: string;
  family?: string;
  rarity?: string;
}

/** Item örneği -> silah bilgisi (örneğin kendi nadirliği varsa o, yoksa katalog nadirliği); silah değilse null. */
export function weaponItem(inst: ItemInstance | null | undefined): WeaponItem | null {
  if (!inst) return null;
  const d = itemDef(inst.id);
  if (!d || d.slot !== 'weapon') return null;
  const rarity = inst.rolls?.rarity ?? d.rarity;
  return { id: d.id, ...(d.family ? { family: d.family } : {}), ...(rarity ? { rarity } : {}) };
}

/** heroOrder (motor sırası) + kahramanın silah yuvası -> { 'party-i': silah }. */
export function partyWeapons(heroOrder: readonly string[], weaponOf: (heroId: string) => ItemInstance | null | undefined): Record<string, WeaponItem> {
  const out: Record<string, WeaponItem> = {};
  heroOrder.forEach((id, i) => {
    const w = id ? weaponItem(weaponOf(id)) : null;
    if (w) out[`party-${i}`] = w;
  });
  return out;
}
