import type { Combatant, SkillDef } from './types';
import { effNum } from './tree-hooks';

/**
 * "Karakter bir kaynağı kullanmıyorsa o onda olmasın" (Ömer 2026-10-31): savaşta manayı HİÇBİR yolla kullanamayan birim savaşa MP havuzsuz girer
 * (maxMp 0, mp 0, stats.mp 0, stats.mpRegen 0). Kural yalnızca birim kurulumunda çalışır (Battle: createSetupCombatant + çağrı); veri dosyasına dokunulmaz.
 * MP havuzu olmayan birim için motorun eski kuralları geçerlidir: mpRoom 0 (MP kazanamaz), mana yakma 0, "manası bitti" kuralları `maxMp > 0` ister,
 * Ley Brand ona tainted mana havuzu açar (open-questions 444).
 */

/** Skill MP harcıyor ya da MP'ye bağlı mı: MP bedeli (sabit, koşullu, spendAll, ofCurrent, can yedekli), MP bahsi, kalan MP'ye göre kalkan. Saf. */
export function skillUsesMana(skill: SkillDef): boolean {
  const c = skill.cost;
  if (c?.resource === 'mp' && (c.amount > 0 || c.spendAll || (c.ofCurrent ?? 0) > 0 || (c.hpFallback ?? 0) > 0 || (c.cond?.length ?? 0) > 0)) return true;
  return skill.effects.some((e) => (e.type === 'damage' && e.bet?.resource === 'mp') || (e.type === 'shield' && !!e.bonusPerMana));
}

/**
 * Birim savaşta manayı kullanabilir mi. Birimin kurulumu BİTTİKTEN sonra sorulur (ağaç yamaları, biçimler, kancalar, item etkileri yerleşmiş olmalı):
 * kitindeki her skill'in birime özel (ağaç yamalı) tanımı + seçilebilir biçimleri, MP'den beslenen pasif, Mana kalkanı (item / ağaç), Empty Grave ek MP bedeli.
 * Tanımı bulunmayan skill "kullanıyor" sayılır (şüphede MP kalır: en kötü hata birimin skill'ini kullanamamasıdır).
 */
export function usesMana(c: Combatant, skills: Record<string, SkillDef>): boolean {
  for (const id of c.skills) {
    const def = c.skillDefs?.[id] ?? skills[id];
    if (!def || skillUsesMana(def)) return true;
    if (c.skillDefs?.[id] && skills[id] && skillUsesMana(skills[id])) return true; // yamalı tanım bedeli koşula bağlamış olabilir: taban da sayılır
    if (c.skillModes?.[id]?.list.some((m) => skillUsesMana(m.skill))) return true;
  }
  const passive = c.passive?.effect.type;
  if (passive === 'deepHoard' || passive === 'choirVessel') return true;
  if (effNum(c, 'manaShield') > 0) return true;
  return !!c.treeHooks?.some((h) => h.h === 'rule' && h.rule === 'fedNoCorpse' && (h.cost ?? 0) > 0);
}

/** Manayı kullanmayan birimin MP havuzunu kaldırır (bkz. dosya başı). MP kullanan birime dokunmaz. Rastgelelik kullanmaz. */
export function dropUnusedMana(c: Combatant, skills: Record<string, SkillDef>): void {
  if (usesMana(c, skills)) return;
  c.mp = 0;
  c.maxMp = 0;
  c.stats = { ...c.stats, mp: 0, mpRegen: 0 };
}
