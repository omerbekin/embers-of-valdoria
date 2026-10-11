// Affix'in sınıfa uyumu (saf): sınıfın skill elementleri ve özellikleri (MP, kalkan, şifa, DoT, debuff, çağrı). Equip best puanı ve örnek
// oluştururken rastgele C affix'inin hafif ağırlığı (Ömer 2026-10-11) aynı kuralı kullanır.
import { classes, skills as skillDefs, statuses as statusDefs } from '../engine/content';
import type { Element } from '../engine/types';
import type { AffixDef } from './items';

const classElementCache = new Map<string, Set<Element>>();

/** Sınıfın skill'lerinin hasar elementleri (data/classes + skills.json). */
export function classElements(classId: string): Set<Element> {
  let set = classElementCache.get(classId);
  if (set) return set;
  set = new Set<Element>();
  for (const sid of classes[classId]?.skills ?? []) {
    for (const e of skillDefs[sid]?.effects ?? []) if (e.type === 'damage') set.add(e.element ?? 'physical');
  }
  classElementCache.set(classId, set);
  return set;
}

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
export function affixFit(classId: string, a: { id: string; def: Pick<AffixDef, 'needs'> }): number {
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

