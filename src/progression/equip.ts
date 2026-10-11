// "Equip best" (saf): bir kahraman için torbadan en iyi item'leri seçer. Kuşanma ekranındaki düğme ve sefer sim'inin `best` politikası
// aynı fonksiyonu kullanır (items.md 4.4, 5.4). Puan = affix IP'lerinin toplamı, sınıfa uymayan affix'ler (başka element, Rage'li sınıfta MP,
// çağrısı olmayan sınıfta Summon mastery...) düşük ağırlıklı; primary bonusunu kapatacak item seçilmez.
import { classes, skills as skillDefs, statuses as statusDefs } from '../engine/content';
import { affixIP, canEquip, classElements, effectIP, itemDef, itemIP, legendaryConflict, rolledAffixes, SLOT_IDS, type Equipment, type ItemDef, type ItemInstance, type RolledAffix, type SlotId } from './items';
import { primaryCheck } from './primary';

/** Sınıfın skill'lerinden çıkan özellikler (affix uyumu için): MP kullanır mı, kalkan / şifa / DoT / debuff / çağrı var mı. */
export interface ClassTraits {
  mp: boolean;
  shield: boolean;
  heal: boolean;
  dot: boolean;
  debuff: boolean;
  summon: boolean;
  rage: boolean;
}

const traitCache = new Map<string, ClassTraits>();

export function classTraits(classId: string): ClassTraits {
  const hit = traitCache.get(classId);
  if (hit) return hit;
  const c = classes[classId];
  const t: ClassTraits = { mp: false, shield: false, heal: false, dot: false, debuff: false, summon: false, rage: c?.maxRage !== undefined };
  for (const sid of c?.skills ?? []) {
    const sk = skillDefs[sid];
    if (!sk) continue;
    if (sk.cost.resource === 'mp' && sk.cost.amount > 0) t.mp = true;
    for (const e of sk.effects) {
      if (e.type === 'shield') t.shield = true;
      if (e.type === 'heal' || e.type === 'hot' || e.type === 'revive') t.heal = true;
      if (e.type === 'dot') t.dot = true;
      if (e.type === 'summon') t.summon = true;
      if (e.type === 'status' && statusDefs[e.status]?.type === 'debuff') t.debuff = true;
      if (e.type === 'dot' || e.type === 'omen' || e.type === 'randomStatus') t.debuff = true;
    }
  }
  traitCache.set(classId, t);
  return t;
}

/** Affix'in bu sınıfa uyum ağırlığı (1 = tam, küçük = işe yaramaz ya da az yarar). */
export function affixFit(classId: string, a: Pick<RolledAffix, 'id' | 'def'>): number {
  const need = a.def.needs;
  if (!need) return 1;
  const t = classTraits(classId);
  if (need.startsWith('element:')) {
    const el = need.slice(8);
    const els = classElements(classId);
    if (el === 'magic') return [...els].some((e) => e !== 'physical') ? 1 : 0.1;
    return els.has(el as never) ? 1 : 0.1;
  }
  switch (need) {
    case 'mp':
      return t.mp ? 1 : 0.3;
    case 'shield':
      return t.shield ? 1 : 0.1;
    case 'dot':
      return t.dot ? 1 : 0.1;
    case 'debuff':
      return t.debuff || t.dot ? 1 : 0.2;
    case 'support':
      return t.heal || t.shield ? 1 : 0.1;
    case 'summon':
      return t.summon ? 1 : 0.1;
    default:
      return 1;
  }
}

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
