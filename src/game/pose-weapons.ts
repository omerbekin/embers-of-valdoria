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
  /** Tutuş (items.json > grip): poz takımını seçer (tek el / çift el; yay ve tılsım şimdilik tek el takımı). */
  grip?: string;
  /** İkinci el yuvasındaki eşya (kalkan ya da ikinci hançer): ikinci el noktasında çizilir. */
  offhand?: { id: string; family?: string; rarity?: string; shield?: boolean };
}

/** Item örneği -> silah bilgisi (örneğin kendi nadirliği varsa o, yoksa katalog nadirliği); silah değilse null. */
export function weaponItem(inst: ItemInstance | null | undefined): WeaponItem | null {
  if (!inst) return null;
  const d = itemDef(inst.id);
  if (!d || d.slot !== 'weapon') return null;
  const rarity = inst.rolls?.rarity ?? d.rarity;
  return { id: d.id, ...(d.family ? { family: d.family } : {}), ...(rarity ? { rarity } : {}), ...(d.grip ? { grip: d.grip } : {}) };
}

/** İkinci el yuvasındaki item -> çizim bilgisi (kalkan: shield; ikinci hançer: silah ailesi); yoksa null. */
export function offhandItem(inst: ItemInstance | null | undefined): WeaponItem['offhand'] | null {
  if (!inst) return null;
  const d = itemDef(inst.id);
  if (!d) return null;
  const rarity = inst.rolls?.rarity ?? d.rarity;
  return { id: d.id, ...(d.family ? { family: d.family } : {}), ...(rarity ? { rarity } : {}), ...(d.slot === 'offhand' ? { shield: true } : {}) };
}

/** heroOrder (motor sırası) + kahramanın silah yuvası -> { 'party-i': silah }. */
export function partyWeapons(
  heroOrder: readonly string[],
  weaponOf: (heroId: string) => ItemInstance | null | undefined,
  offhandOf?: (heroId: string) => ItemInstance | null | undefined,
): Record<string, WeaponItem> {
  const out: Record<string, WeaponItem> = {};
  heroOrder.forEach((id, i) => {
    if (!id) return;
    const w = weaponItem(weaponOf(id));
    const off = offhandOf ? offhandItem(offhandOf(id)) : null;
    // silahsız ama ikinci elde kalkan: yalnızca ikinci el bilgisi (silah görseli sınıfın varsayılanı)
    if (w || off) out[`party-${i}`] = { ...(w ?? { id: '' }), ...(off ? { offhand: off } : {}) };
  });
  return out;
}

/**
 * Pose test savaşında her Pose Tester'ın sınıf silahı: [ana el item, ikinci el item?] (gerçek item; tutuş ve ikinci el item'den).
 * Warrior çift el balta (çift el takımı görünsün), Anti-Mage tek el kılıç + hançer (tek el + ikinci el).
 */
export const POSE_TESTER_GEAR: Readonly<Record<string, readonly [string, string?]>> = {
  pose_tester_1: ['dane_axe'],
  pose_tester_2: ['flanged_mace', 'oak_shield'],
  pose_tester_3: ['morning_star', 'oathkeepers_bulwark'],
  pose_tester_4: ['hunting_bow'],
  pose_tester_5: ['rondel_dagger', 'misericorde'],
  pose_tester_6: ['rune_staff'],
  pose_tester_7: ['oak_staff'],
  pose_tester_8: ['bone_staff'],
  pose_tester_9: ['arming_sword', 'rondel_dagger'],
  pose_tester_10: ['worn_deck'],
  pose_tester_11: ['hex_doll'],
};
