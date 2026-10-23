// Silah gücü ve başlangıç silahı (Item Güçlendirme, Ömer onayı 2026-10-17; items.md 1.12). Saf: Phaser/DOM yok, Math.random yok.
// Hasar = stat x skill gücü x (1 + silah gücü / 100). Her sınıfın başlangıç silahı (Common, ilvl 1) o sınıfın SIFIR NOKTASIDIR: motora giden çarpan
// başlangıç silahının gücüne bölünür (katlama), böylece başlangıç silahıyla savaş bugünküyle aynı kalır ve Quick Battle / MP hiç değişmez.
import { ITEMS, affixDef, emptyEquipment, instanceWeaponPower, itemDef, mainCandidates, offhandWeapon, weaponPowerOf, type Equipment, type ItemInstance, type ItemRoll } from './items';
import { classElements } from './affix-fit';
import type { Element } from '../engine/types';

/** Sınıfın başlangıç silahının katalog id'si (items.json > starterWeapons.classes); yoksa undefined (test sınıfları). */
export const starterWeaponId = (classId: string): string | undefined => {
  const id = ITEMS.starterWeapons?.classes?.[classId];
  return id && itemDef(id) ? id : undefined;
};

/** Başlangıç silahının örnek seviyesi (items.json > starterWeapons.ilvl). */
export const starterIlvl = (): number => ITEMS.starterWeapons?.ilvl ?? 1;

/** Sınıfın sıfır noktası: başlangıç silahının gücü (yoksa 0 = katlama yok). */
export function starterPower(classId: string): number {
  const id = starterWeaponId(classId);
  const d = id ? itemDef(id) : undefined;
  return d ? weaponPowerOf(d, starterIlvl()) : 0;
}

/**
 * Başlangıç silahı örneği (x5): Common, ilvl = starterWeapons.ilvl, tek ana affix (sınıfın elementine uyan ilk aday, zar ortası). Zar yok, seed
 * gerekmez: aynı sınıf + uid = birebir aynı örnek. Sınıfın başlangıç silahı yoksa null.
 */
export function starterWeapon(classId: string, uid: string): ItemInstance | null {
  const id = starterWeaponId(classId);
  return id ? starterInstance(classId, id, uid) : null;
}

/** Sınıfın başlangıç ikinci el item'inin katalog id'si (items.json > starterOffhands.classes; Ömer 2026-10-23); yoksa undefined. */
export const starterOffhandId = (classId: string): string | undefined => {
  const id = ITEMS.starterOffhands?.classes?.[classId];
  return id && itemDef(id) ? id : undefined;
};

/** Başlangıç ikinci el örneği (kalkan / ikinci hançer): başlangıç silahıyla aynı kural (Common, starterWeapons.ilvl, tek ana affix, zar ortası). */
export function starterOffhand(classId: string, uid: string): ItemInstance | null {
  const id = starterOffhandId(classId);
  return id ? starterInstance(classId, id, uid) : null;
}

/** Başlangıç ikinci el item'inin uid'i (kahraman id'sinden; başlangıç silahının uid'inden ayrı). */
export const starterOffhandUid = (heroId: string): string => `start-off-${heroId}`;

function starterInstance(classId: string, id: string, uid: string): ItemInstance | null {
  const d = itemDef(id);
  if (!d) return null;
  let mains = mainCandidates(d).filter((m) => affixDef(m));
  const els = classElements(classId);
  const fit = mains.filter((m) => {
    const to = affixDef(m)?.parts[0]?.to ?? '';
    return to.startsWith('elem:') && els.has(to.slice(5) as Element);
  });
  if (fit.length) mains = fit;
  const ilvl = starterIlvl();
  const rolls: ItemRoll = { rarity: 'common', ...(ilvl !== d.ilvl ? { ilvl } : {}), affixes: mains[0] ? [{ id: mains[0], q: 0.5 }] : [] };
  return { uid, id, rolls };
}

/** Başlangıç silahının uid'i (kahraman id'sinden; sefer ve Endless'ta tekil, sayaçları kaydırmaz). */
export const starterUid = (heroId: string): string => `start-${heroId}`;

/**
 * Kahramanın silah güç toplamı: ana eldeki silah + ikinci eldeki silahın (hançer) `offhandShare` kadarı. Kalkan güç vermez (x4: tabanı zırh).
 */
export function equippedWeaponPower(equipment: Partial<Equipment> | undefined): number {
  const w = equipment?.weapon;
  const o = equipment?.offhand;
  let p = w && itemDef(w.id) ? instanceWeaponPower(w) : 0;
  const od = o ? itemDef(o.id) : undefined;
  if (o && od && offhandWeapon(od)) p += instanceWeaponPower(o) * (ITEMS.weaponPower?.offhandShare ?? 0);
  return Math.round(p * 1000) / 1000;
}

/**
 * Motora giden silah çarpanı (UnitModifiers.weaponMult): (1 + güç/100) / (1 + başlangıç gücü/100). Başlangıç silahıyla 1, daha güçlü silahla > 1,
 * silahsız < 1. Başlangıç silahı olmayan sınıfta katlama yok (silahsız = 1).
 */
export function weaponMultFor(classId: string, equipment: Partial<Equipment> | undefined): number {
  const fold = 1 + starterPower(classId) / 100;
  const m = (1 + equippedWeaponPower(equipment) / 100) / fold;
  return Math.round(m * 10000) / 10000;
}

/** Başlangıç silahı (+ varsa başlangıç ikinci eli) takılı yeni ekipman (sefer kahramanı, Endless koşusu). Sınıfın başlangıç silahı yoksa boş ekipman. */
export function starterEquipment(classId: string, heroId: string): Equipment {
  const eq = emptyEquipment();
  eq.weapon = starterWeapon(classId, starterUid(heroId));
  // Başlangıç ikinci eli (Ömer 2026-10-23): ana el tek el silah olan sınıflarda (kalkan / ikinci hançer)
  if (eq.weapon) eq.offhand = starterOffhand(classId, starterOffhandUid(heroId));
  return eq;
}

/**
 * Kayıt göçü (x5): silah yuvası boşsa (ve ikinci elde de silah yoksa) sınıfın başlangıç silahı takılır. Yerinde değiştirir; takıldıysa true.
 * Var olan item'lere dokunmaz (idempotent: ikinci okumada silah yuvası dolu).
 */
export function giveStarterIfUnarmed(hero: { id: string; class: string; equipment?: Partial<Equipment> | null }): boolean {
  if (!hero || typeof hero !== 'object' || !hero.equipment || typeof hero.equipment !== 'object') return false;
  if (hero.equipment.weapon) return false;
  // İkinci elde silah (hançer) varsa o ana ele geçecek (promoteOffhand): başlangıç silahı verilmez
  const off = hero.equipment.offhand;
  if (off && typeof off === 'object' && typeof off.id === 'string' && itemDef(off.id)?.slot === 'weapon') return false;
  const inst = starterWeapon(hero.class, starterUid(hero.id));
  if (!inst) return false;
  hero.equipment.weapon = inst;
  return true;
}
