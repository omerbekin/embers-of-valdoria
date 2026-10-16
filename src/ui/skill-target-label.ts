// Birim kartındaki skill satırı için tek kelimelik hedef / şekil etiketi (Ömer 2026-10-16): "single", "row", "2x2", "plus", "ally", "self", "summon"...
// Ayrıntı (tam rozet, şekil açıklaması) skill tooltip'inde (src/engine/skill-info.ts > targetBadge / describeSkill); bu yalnızca kısa özet.
import type { SkillDef } from '../engine';

type SkillLike = Pick<SkillDef, 'target' | 'area' | 'effects' | 'count'>;

/** Kısa hedef etiketi (küçük harf). Çağıran skill'de 'summon'; alan skill'inde şekil (rect = "SATIRxSÜTUN"). */
export function skillTargetLabel(skill: SkillLike): string {
  if (skill.effects?.some((e) => e.type === 'summon')) return 'summon';
  switch (skill.target) {
    case 'single_enemy':
      return 'single';
    case 'all_enemies':
      return 'all foes';
    case 'everyone':
      return 'everyone';
    case 'random_enemies':
      return `random ×${skill.count ?? 3}`;
    case 'single_ally':
      return 'ally';
    case 'dead_ally':
      return 'revive';
    case 'all_allies':
      return 'all allies';
    case 'self':
      return 'self';
    case 'empty_tile':
      return 'cell';
    case 'area_enemies':
    case 'area_any': {
      const a = skill.area;
      if (!a) return 'area';
      if (a.shape === 'rect') return `${a.rows ?? 1}x${a.cols ?? 1}`;
      return a.shape;
    }
    default:
      return '';
  }
}
