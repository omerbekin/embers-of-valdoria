// "Equip best" (saf): bir kahraman için torbadan en iyi item'leri seçer. Kuşanma ekranındaki düğme ve sefer sim'inin `best` politikası
// aynı fonksiyonu kullanır (items.md 4.4, 5.4). Puan = affix IP'lerinin toplamı, sınıfa uymayan affix'ler (başka element, Rage'li sınıfta MP,
// çağrısı olmayan sınıfta Summon mastery...) düşük ağırlıklı; primary bonusunu kapatacak item seçilmez.
import { affixFit } from './affix-fit';
import { affixIP, blocksOffhand, canEquip, effectIP, equipInto, fitsSlot, itemDef, itemIP, legendaryConflict, offhandBlocker, rolledAffixes, SLOT_IDS, type Equipment, type ItemDef, type ItemInstance, type RolledAffix, type SlotId } from './items';
import { inactivePenalty } from './loadout';
import { primaryCheck } from './primary';

/** Örneğin (zarlarıyla) sınıfa değeri: affix IP'si x uyum + Legendary etkisi. */
export function instanceScore(classId: string, inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }): number {
  const d = itemDef(inst.id);
  if (!d) return 0;
  let score = effectIP(d);
  for (const a of rolledAffixes(inst, classId)) score += affixIP(a.id, a.values) * affixFit(classId, a);
  return Math.round(score * 1000) / 1000;
}

/** Taban item'in sınıfa beklenen değeri (zarsız; Endless önerisi). Şimdilik beklenen IP (sınıf uyumu örnekte ölçülür). */
export const itemScore = (_classId: string, d: ItemDef): number => itemIP(d);

/**
 * Örneğin kahramanın `slot`undaki değeri: instanceScore, eksi aynı A affix'i 2'den fazla item'deyse etkisiz kalan örneklerin değeri
 * (Ömer 2026-10-13, itemcaps m2; Equip best ve Endless tüccar kazancı). Boş / bilinmeyen: 0.
 */
export function slotScore(classId: string, equipment: Partial<Equipment>, inst: (Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }) | null | undefined, slot: SlotId): number {
  if (!inst || !itemDef(inst.id)) return 0;
  const fitIP = (a: RolledAffix) => affixIP(a.id, a.values) * affixFit(classId, a);
  return Math.round((instanceScore(classId, inst) - inactivePenalty(classId, equipment, inst as ItemInstance, slot, fitIP)) * 1000) / 1000;
}

export interface EquipMove {
  slot: SlotId;
  uid: string;
}

/**
 * Bir kahramanın torbadan yapacağı en iyi değişimler (yuva başına en yüksek puanlı, kullanılabilir, primary'yi bozmayan ve takılıdan
 * iyi item). `taken`: başka kahramanlara ayrılmış uid'ler (takım için sırayla çağrılır).
 * İkinci el (2026-10-12): ana el adayının değeri = silah + (ikinci eli kapatmıyorsa) eldeki ya da torbadaki en iyi ikinci el; çift el silah
 * ikinci eldeki item'i torbaya çıkarır. İkinci el yuvası ana elden sonra, ana el kapatmıyorsa doldurulur; ana el boşsa önce o dolar.
 */
export function bestMoves(hero: { class: string; equipment: Equipment }, bag: ItemInstance[], taken: Set<string> = new Set()): EquipMove[] {
  const moves: EquipMove[] = [];
  let equipment = { ...hero.equipment };
  const score = (inst: ItemInstance | null | undefined, slot: SlotId = 'weapon', eq: Equipment = equipment) => slotScore(hero.class, eq, inst, slot);
  /** İkinci el için ulaşılabilir en iyi puan (eldeki ya da torbadaki; `skip` uid'i hariç). */
  const bestOffhand = (eq: Equipment, skip?: string): number => {
    let best = score(eq.offhand, 'offhand', eq);
    for (const inst of bag) {
      if (taken.has(inst.uid) || inst.uid === skip) continue;
      const d = itemDef(inst.id);
      if (d && fitsSlot(d, 'offhand') && canEquip(hero.class, d)) best = Math.max(best, score(inst, 'offhand', eq));
    }
    return best;
  };
  for (const slot of SLOT_IDS) {
    if (slot === 'offhand' && offhandBlocker(equipment)) continue;
    const cur = equipment[slot];
    /** Yuvanın değeri: ana elde, silah + açık kalan ikinci elin ulaşılabilir değeri. */
    const value = (inst: ItemInstance | null | undefined): number => {
      const d = inst ? itemDef(inst.id) : undefined;
      return score(inst, slot) + (slot === 'weapon' && !(d && blocksOffhand(d)) ? bestOffhand(equipment, inst?.uid) : 0);
    };
    let best: { inst: ItemInstance; score: number } | undefined;
    for (const inst of bag) {
      if (taken.has(inst.uid)) continue;
      const d = itemDef(inst.id);
      if (!d || !fitsSlot(d, slot) || !canEquip(hero.class, d) || legendaryConflict(equipment, d, slot)) continue;
      const v = value(inst);
      if (best && v <= best.score) continue;
      if (primaryCheck({ class: hero.class, equipment }, { equip: inst, slot }).lost) continue;
      best = { inst, score: v };
    }
    // Boş ana el her zaman doldurulur (Ömer 2026-10-14): tek hançer ikinci ele değil ana ele (boş elin "değeri" o hançeri ikinci elde sayıyordu)
    if (best && (best.score > value(cur) || (slot === 'weapon' && !cur))) {
      moves.push({ slot, uid: best.inst.uid });
      taken.add(best.inst.uid);
      equipment = equipInto(equipment, best.inst, slot).equipment as Equipment;
    }
  }
  return moves;
}
