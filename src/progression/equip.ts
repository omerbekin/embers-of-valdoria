// "Equip best" (saf): bir kahraman için torbadan en iyi item'leri seçer. Kuşanma ekranındaki düğme ve sefer sim'inin `best` politikası
// aynı fonksiyonu kullanır (items.md 4.4, 5.4). Puan = affix IP'lerinin toplamı, sınıfa uymayan affix'ler (başka element, Rage'li sınıfta MP,
// çağrısı olmayan sınıfta Summon mastery...) düşük ağırlıklı; primary bonusunu kapatacak item seçilmez.
import { affixFit } from './affix-fit';
import { ITEMS, affixIP, baseIP, canEquip, canEquipIn, effectIP, equipInto, fitsSlot, instanceIlvl, itemDef, itemIP, legendaryConflict, meetsLevel, offhandCompatible, offhandOnlyFor, rolledAffixes, SLOT_IDS, type Equipment, type ItemDef, type ItemInstance, type RolledAffix, type SlotId, type SlotLocks } from './items';
import { inactivePenalty } from './loadout';
import { SETS, setBonusScore } from './sets';
import { primaryCheck } from './primary';

/**
 * Düşmüş kahraman item takamaz / çıkaramaz (Ömer 2026-10-18): sefer ve Endless (motor/run katmanı), arayüz (toast, şerit notu, düğme ipucu) TEK metin.
 * Diriltme yolu söylenmez (sefer / Endless farklı); stat puanı düşmüşken de harcanabilir.
 */
export const FALLEN_GEAR_MSG = "Fallen heroes can't equip items.";
/** Aynı kuralın kısa hali (Equip düğmesi / menü satırı). */
export const FALLEN_GEAR_SHORT = "Fallen: can't equip";

/**
 * Örneğin (zarlarıyla) sınıfa değeri: affix IP'si x uyum + Legendary etkisi + taban değeri (silah gücü, örtük stat; Item Güçlendirme 2026-10-17).
 * `slot` ikinci else silah gücünün yalnızca `offhandShare` kadarı sayılır.
 */
export function instanceScore(classId: string, inst: Pick<ItemInstance, 'id'> & { uid?: string; rolls?: unknown }, slot?: SlotId): number {
  const d = itemDef(inst.id);
  if (!d) return 0;
  let score = effectIP(d) + baseIP(d, instanceIlvl(inst), slot === 'offhand' && d.slot === 'weapon' ? (ITEMS.weaponPower?.offhandShare ?? 0) : 1);
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
  return Math.round((instanceScore(classId, inst, slot) - inactivePenalty(classId, equipment, inst as ItemInstance, slot, fitIP)) * 1000) / 1000;
}

export interface EquipMove {
  slot: SlotId;
  uid: string;
}

/** Açgözlü yuva yuva seçim (bestMoves'un eski gövdesi); `fixed` yuvalara dokunmaz. */
function greedyMoves(hero: { class: string; equipment: Equipment; level?: number }, bag: ItemInstance[], start: Equipment, taken: Set<string>, locks: SlotLocks | undefined, fixed: ReadonlySet<SlotId>): { moves: EquipMove[]; equipment: Equipment } {
  const moves: EquipMove[] = [];
  let equipment = { ...start };
  const score = (inst: ItemInstance | null | undefined, slot: SlotId = 'weapon', eq: Equipment = equipment) => slotScore(hero.class, eq, inst, slot);
  /** İkinci el için ulaşılabilir en iyi puan (eldeki ya da torbadaki; `skip` uid'i hariç); `w` ana el silahı (yay: yalnızca Sadak, çift el: hiçbiri, tek el: hepsi). */
  const bestOffhand = (eq: Equipment, skip: string | undefined, w: ItemDef | undefined): number => {
    const curOff = eq.offhand ? itemDef(eq.offhand.id) : undefined;
    let best = curOff && offhandCompatible(w, curOff) ? score(eq.offhand, 'offhand', eq) : 0;
    for (const inst of bag) {
      if (taken.has(inst.uid) || inst.uid === skip) continue;
      const d = itemDef(inst.id);
      if (d && fitsSlot(d, 'offhand') && offhandCompatible(w, d) && canEquipIn(hero.class, d, 'offhand') && (hero.level === undefined || meetsLevel(hero.level, inst))) best = Math.max(best, score(inst, 'offhand', eq));
    }
    return best;
  };
  const curWeapon = () => (equipment.weapon ? itemDef(equipment.weapon.id) : undefined);
  for (const slot of SLOT_IDS) {
    if (locks?.[slot] || fixed.has(slot)) continue; // kilitli yuva (seferde Reedgate'ten önce Trinket) ya da set planının sabitlediği yuva
    const cur = equipment[slot];
    /** Yuvanın değeri: ana elde, silah + açık kalan ikinci elin ulaşılabilir değeri. */
    const value = (inst: ItemInstance | null | undefined): number => {
      const d = inst ? itemDef(inst.id) : undefined;
      return score(inst, slot) + (slot === 'weapon' ? bestOffhand(equipment, inst?.uid, d) : 0);
    };
    let best: { inst: ItemInstance; score: number } | undefined;
    for (const inst of bag) {
      if (taken.has(inst.uid)) continue;
      const d = itemDef(inst.id);
      if (!d || !fitsSlot(d, slot) || !canEquipIn(hero.class, d, slot) || (slot === 'offhand' && !offhandCompatible(curWeapon(), d)) || (slot === 'offhand' && !curWeapon() && offhandOnlyFor(hero.class, d)) || (hero.level !== undefined && !meetsLevel(hero.level, inst)) || legendaryConflict(equipment, d, slot)) continue;
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
  return { moves, equipment };
}

/** Torba ya da takılı ekipmanda set parçası var mı (yoksa set planlaması atlanır: bayrak kapalıyken sim ve kayıtlar bire bir aynı). */
const hasSetGear = (equipment: Equipment, bag: ItemInstance[], taken: Set<string>): boolean =>
  SLOT_IDS.some((k) => !!equipment[k] && !!itemDef(equipment[k]!.id)?.set) || bag.some((i) => !taken.has(i.uid) && !!itemDef(i.id)?.set);

/**
 * Bir kahramanın torbadan yapacağı en iyi değişimler (yuva başına en yüksek puanlı, kullanılabilir, seviye şartını karşılayan (`hero.level`;
 * verilmezse denetlenmez), primary'yi bozmayan ve takılıdan iyi item). `taken`: başka kahramanlara ayrılmış uid'ler (takım için sırayla çağrılır).
 * İkinci el (2026-10-12): ana el adayının değeri = silah + eşleşen eldeki ya da torbadaki en iyi ikinci el (çift el hiçbirini, yay yalnızca Sadak,
 * tılsım yalnızca Focus Orb kabul eder); silah değişimi uymayan ikinci eli torbaya çıkarır. İkinci el yuvası ana elden sonra, uyuyorsa doldurulur.
 * Set bonusu (Lead 2026-11-07): torba ya da ekipmanda set parçası varsa her set için "o setin en iyi parçalarını tak, kalanı açgözlü doldur"
 * planı da denenir; toplam puan (yuva puanları + setBonusScore) açgözlü plandan yüksekse o plan seçilir.
 */
export function bestMoves(hero: { class: string; equipment: Equipment; level?: number }, bag: ItemInstance[], taken: Set<string> = new Set(), locks?: SlotLocks): EquipMove[] {
  let best = greedyMoves(hero, bag, hero.equipment, new Set(taken), locks, new Set());
  if (hasSetGear(hero.equipment, bag, taken)) {
    const total = (eq: Equipment): number => SLOT_IDS.reduce((n, k) => n + slotScore(hero.class, eq, eq[k], k), 0) + setBonusScore(eq, hero.class);
    let bestTotal = total(best.equipment);
    for (const set of SETS) {
      let eq: Equipment = { ...hero.equipment };
      const tk = new Set(taken);
      const forced: EquipMove[] = [];
      const fixed = new Set<SlotId>();
      let pieces = 0;
      for (const slot of set.slots as SlotId[]) {
        if (locks?.[slot]) continue;
        const cur = eq[slot];
        let pick: ItemInstance | undefined = cur && itemDef(cur.id)?.set === set.id ? cur : undefined;
        let pickScore = pick ? slotScore(hero.class, eq, pick, slot) : -Infinity;
        for (const inst of bag) {
          const d = itemDef(inst.id);
          if (!d || d.set !== set.id || d.slot !== slot || tk.has(inst.uid) || !canEquip(hero.class, d) || (hero.level !== undefined && !meetsLevel(hero.level, inst)) || legendaryConflict(eq, d, slot)) continue;
          const sc = slotScore(hero.class, eq, inst, slot);
          if (sc > pickScore && !primaryCheck({ class: hero.class, equipment: eq }, { equip: inst, slot }).lost) {
            pick = inst;
            pickScore = sc;
          }
        }
        if (!pick) continue;
        pieces++;
        fixed.add(slot);
        if (pick.uid !== cur?.uid) {
          forced.push({ slot, uid: pick.uid });
          tk.add(pick.uid);
          eq = equipInto(eq, pick, slot).equipment as Equipment;
        }
      }
      if (pieces < Math.min(...set.thresholds)) continue;
      const rest = greedyMoves(hero, bag, eq, tk, locks, fixed);
      const t = total(rest.equipment);
      if (t > bestTotal + 1e-9) {
        bestTotal = t;
        best = { moves: [...forced, ...rest.moves], equipment: rest.equipment };
      }
    }
  }
  for (const m of best.moves) taken.add(m.uid);
  return best.moves;
}
