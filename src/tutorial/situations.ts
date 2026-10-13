/**
 * Durum dersleri için saf durum tespiti (Ömer 2026-10-14; docs/design/tutorial.md > Durum dersleri). Motorun okuma API'lerini kullanır
 * (canUse, canUseGlobal, validTargets, ground, telegraphs, log); DOM / Phaser yok, testlenebilir (tests/tutorial-situations.test.ts).
 * Her durum SIRASI GELEN oyuncu kahramanı için hesaplanır: ders o an işe yarayan düğmeyi gösterir.
 */
import type { Battle } from '../engine';
import type { Situation } from './lessons';

const ENEMY_TARGETS = new Set(['single_enemy', 'area_enemies', 'random_enemies', 'all_enemies']);
const REACH_REASONS = new Set(['Melee: front row only', 'No target in reach']);
const GLOBAL = { rest: 'rest', skip: 'skip_turn', move: 'move_tile' } as const;

/** Bu savaşta birimin kullandığı class skill'leri (savaş kaydından). */
function usedSkills(b: Battle, uid: string): Set<string> {
  const out = new Set<string>();
  for (const e of b.log) if (e.type === 'skillUsed' && e.actor === uid) out.add(e.skill);
  return out;
}

/** Karar başındaki durumlar (oyuncu kahramanının sırası; veri sırası dersin önceliğini belirler, burada sıra önemsiz). */
export function turnSituations(b: Battle, uid: string): Situation[] {
  const actor = b.get(uid);
  if (!actor || actor.hp <= 0 || actor.side !== 'party' || actor.summoned) return [];
  const out: Situation[] = [];
  const skills = actor.skills.filter((id) => !actor.lockedSkills?.includes(id));
  const why = new Map(skills.map((id) => [id, b.canUse(uid, id)] as const));
  const ok = (id: string) => why.get(id)?.ok === true;
  const reason = (id: string) => {
    const c = why.get(id);
    return c && !c.ok ? c.reason : undefined;
  };
  const glob = (id: string) => !!b.globalDef(id) && b.canUseGlobal(uid, id).ok;

  // Rest: hazır (beklemede / kilitli değil) bir MP skill'i yalnızca MP yetmediği için kullanılamıyor ve MP en fazla en ucuz skill'e yetiyor
  // (Mage: 4 MP'lik temel büyü kalır, güçlü büyüler yetmez). Rest yalnızca MP verir; Rage eksikliği bu dersi açmaz.
  const mpSkills = skills.filter((id) => b.skill(id)?.cost.resource === 'mp');
  const mpShort = mpSkills.find((id) => reason(id) === 'Not enough MP');
  const cost = (id: string) => b.skill(id)?.cost.amount ?? 0;
  const cheapest = Math.min(...mpSkills.map(cost));
  const restCase = !!mpShort && mpSkills.filter(ok).every((id) => cost(id) <= cheapest) && glob(GLOBAL.rest);
  if (restCase) out.push({ when: 'rest', skill: mpShort });

  // Move: düşmana giden hiçbir skill kullanılamıyor ve en az bir yakın dövüş skill'i menzil yüzünden (ön sıra değil / ulaşamıyor)
  const enemySkills = skills.filter((id) => ENEMY_TARGETS.has(b.skill(id)?.target ?? ''));
  const blocked = enemySkills.find((id) => b.isMelee(id) && REACH_REASONS.has(reason(id) ?? ''));
  const moveCase = !!blocked && !enemySkills.some(ok) && glob(GLOBAL.move);
  if (moveCase) out.push({ when: 'move', skill: blocked });

  // Skip: hiçbir skill kullanılamıyor (bekleme / bedel / hedef) ve Rest ya da Move çözüm değil
  if (!skills.some(ok) && !restCase && !moveCase && glob(GLOBAL.skip)) out.push({ when: 'skip' });

  // Ultimate (4. yuva) hazır
  const ult = actor.skills[3];
  if (ult && ok(ult)) out.push({ when: 'ultimate', skill: ult });

  // Harcandı: bu savaşta kullanılan bir skill beklemede ya da MP harcandı (MP'li skill kullanıldı ve MP dolu değil)
  const used = usedSkills(b, uid);
  const cooling = actor.skills.find((id) => used.has(id) && (actor.cooldowns[id] ?? 0) > 0);
  const mpUsed = actor.maxMp > 0 && actor.mp < actor.maxMp ? [...used].find((id) => b.skill(id)?.cost.resource === 'mp') : undefined;
  const spent = cooling ?? mpUsed;
  if (spent) out.push({ when: 'spent', skill: spent });

  // Durum: bir kahramanın üstünde durum var
  if (b.combatants.some((c) => c.side === 'party' && !c.summoned && c.hp > 0 && c.statuses.length > 0)) out.push({ when: 'status' });

  // Zemin: kahramanın hücresinde ya da bitişiğinde ona zarar veren zemin etkisi
  const near = (slot: number) => slot === actor.slot || (b.rowOf(slot) === b.rowOf(actor.slot) && Math.abs(b.laneOf(slot) - b.laneOf(actor.slot)) === 1) || (b.laneOf(slot) === b.laneOf(actor.slot) && Math.abs(b.rowOf(slot) - b.rowOf(actor.slot)) === 1);
  if (actor.board === actor.side && b.ground.some((g) => g.board === actor.side && g.sourceSide !== actor.side && g.slots.some(near))) out.push({ when: 'ground' });

  // Telgraf: düşman (boss) bir sonraki vuruşunun hücrelerini işaretledi
  if (b.telegraphs.some((t) => b.get(t.source)?.side !== actor.side)) out.push({ when: 'telegraph' });
  return out;
}

/** Skill seçilince oluşan durumlar: yakın dövüş arka sıradaki bir düşmana ulaşamıyor (reach), alan skill'i (area). */
export function selectSituations(b: Battle, uid: string, skillId: string): Situation[] {
  const actor = b.get(uid);
  if (!actor || actor.side !== 'party') return [];
  const out: Situation[] = [];
  if (b.isMelee(skillId) && ENEMY_TARGETS.has(b.skill(skillId)?.target ?? '')) {
    const valid = b.validTargets(uid, skillId);
    const deepest = Math.max(-1, ...valid.map((c) => b.rowOf(c.slot)));
    const foes = b.living(actor.side === 'party' ? 'enemy' : 'party').filter((c) => c.board === c.side);
    if (foes.some((c) => b.rowOf(c.slot) > deepest)) out.push({ when: 'reach', skill: skillId });
  }
  if (b.isAreaSkill(skillId) || b.isShapeSkill(skillId)) out.push({ when: 'area', skill: skillId });
  return out;
}
