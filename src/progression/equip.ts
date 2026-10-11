// "Equip best" (saf): bir kahraman için torbadan en iyi item'leri seçer. Kuşanma ekranındaki düğme ve sefer sim'inin `best` politikası
// aynı fonksiyonu kullanır (items.md 4.4, 5.4). Puan = affix IP'lerinin toplamı, sınıfa uymayan affix'ler (başka element, Rage'li sınıfta MP,
// çağrısı olmayan sınıfta Summon mastery...) düşük ağırlıklı; primary bonusunu kapatacak item seçilmez.
import { affixFit } from './affix-fit';
import { affixIP, canEquip, effectIP, itemDef, itemIP, legendaryConflict, rolledAffixes, SLOT_IDS, type Equipment, type ItemDef, type ItemInstance, type SlotId } from './items';
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

export interface EquipMove {
  slot: SlotId;
  uid: string;
}

/**
 * Bir kahramanın torbadan yapacağı en iyi değişimler (yuva başına en yüksek puanlı, kullanılabilir, primary'yi bozmayan ve takılıdan
 * iyi item). `taken`: başka kahramanlara ayrılmış uid'ler (takım için sırayla çağrılır).
 */
export function bestMoves(hero: { class: string; equipment: Equipment }, bag: ItemInstance[], taken: Set<string> = new Set()): EquipMove[] {
  const moves: EquipMove[] = [];
  let equipment = { ...hero.equipment };
  for (const slot of SLOT_IDS) {
    const cur = equipment[slot];
    const curDef = cur ? itemDef(cur.id) : undefined;
    let best: { inst: ItemInstance; score: number } | undefined;
    for (const inst of bag) {
      if (taken.has(inst.uid)) continue;
      const d = itemDef(inst.id);
      if (!d || d.slot !== slot || !canEquip(hero.class, d) || legendaryConflict(equipment, d)) continue;
      const score = instanceScore(hero.class, inst);
      if (best && score <= best.score) continue;
      if (primaryCheck({ class: hero.class, equipment }, { equip: inst }).lost) continue;
      best = { inst, score };
    }
    if (best && best.score > (cur && curDef ? instanceScore(hero.class, cur) : 0)) {
      moves.push({ slot, uid: best.inst.uid });
      taken.add(best.inst.uid);
      equipment = { ...equipment, [slot]: best.inst };
    }
  }
  return moves;
}
