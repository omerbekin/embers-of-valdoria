// "Unblockable" etiketi (Ömer 2026-10-18): kalkanla BLOKLANAMAYAN skill'ler. Tek kural, tek ad:
// - hasar etkisinde `unblockable: true` bayrağı (Backstab), ya da
// - skill'in telgrafı var (bossun önceden uyarılan skill'leri: Breaking Span, Fall of the Bridge, Ash Brand...).
// Motor (blockChance), önizleme, tooltip etiketi, savaş telgraf göstergesi ve Codex aynı yardımcıyı kullanır.
import type { SkillDef, SkillEffect } from './types';

type DamageEffect = Extract<SkillEffect, { type: 'damage' }>;

/** Oyun içi etiket adı: tek yerden değişir (tooltip etiketi, telgraf göstergesi, Codex, birim kartı ipucu). */
export const UNBLOCKABLE_LABEL = 'Unblockable';

/** Bu skill'in bu hasar etkisi bloklanamaz mı? (etki bayrağı ya da telgraflı skill) Saf. */
export function isUnblockableHit(skill: Pick<SkillDef, 'telegraph'> | null | undefined, effect: Pick<DamageEffect, 'unblockable'>): boolean {
  return !!effect.unblockable || !!skill?.telegraph;
}

/** Skill "Unblockable" etiketini taşır mı: hasar veren ve hasarı bloklanamayan (telgraflı ya da bayraklı) skill. Saf. */
export function isUnblockableSkill(skill: Pick<SkillDef, 'telegraph' | 'effects'> | null | undefined): boolean {
  if (!skill) return false;
  const dmg = skill.effects.filter((e): e is DamageEffect => e.type === 'damage');
  return dmg.length > 0 && dmg.every((e) => isUnblockableHit(skill, e));
}
