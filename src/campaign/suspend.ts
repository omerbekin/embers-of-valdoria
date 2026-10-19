import { Battle, content } from '../engine';
import { battleHash, planKey, restoreBattle, validReplayActions } from '../endless/replay';
import { battlePlan, type BattlePlan } from './encounters';
import { nextStep } from './state';
import type { CampaignState, CampaignSuspended } from './types';

/**
 * Duraklatılmış sefer savaşı (Ömer 2026-10-14; Endless 0.7.8.1 "Retreat to Camp" ile aynı kural, src/endless/replay.ts yardımcıları).
 * Savaş menüsü > Retreat to Map savaşı sıfırlamaz: eylem günlüğü durumun `suspended` alanına yazılır (geri çekilmede otomatik kayıt alınır,
 * sekme kapansa da kalır), düğüme yeniden girilince savaş baştan kurulur, günlük oynatılır ve durum özeti doğrulanırsa aynı turdan sürer.
 * Kayıt varken parti düğümde kalır: yola çıkmak, Gear / Formation, Valor diriltmesi kilitli (PAUSED_LOCK). Zafer / yenilgi kaydı siler.
 * Saf: yalnızca motor (Node'da test edilir).
 */

export const PAUSED_NOTICE = 'The battle is paused. It resumes where you left it.';
export const PAUSED_CONFIRM = 'Retreat to map? The battle stays paused and resumes where you left it.';
export const PAUSED_BROKEN = 'The paused battle could not be restored. The battle starts over.';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Kayıttaki duraklatılmış savaş biçimce geçerli mi (bozuk kayıt oyunu çökertmez). */
export function validCampaignSuspended(v: unknown): v is CampaignSuspended {
  const s = v as CampaignSuspended;
  if (!s || typeof s !== 'object' || typeof s.node !== 'string' || !Number.isFinite(s.seed) || !Number.isFinite(s.turn) || typeof s.hash !== 'string' || typeof s.setup !== 'string') return false;
  return validReplayActions(s.actions);
}

/** Bulunulan düğümün duraklatılmış savaşı (yoksa, başka düğümünse ya da düğümde savaş beklemiyorsa null). */
export function suspendedOf(s: CampaignState | null): CampaignSuspended | null {
  const x = s?.suspended;
  if (!s || !x || !validCampaignSuspended(x) || x.node !== s.at || nextStep(s).kind !== 'battle') return null;
  return x;
}

/** Duraklatılmış savaşı yaz / sil (yeni durum döner). */
export function withSuspended(s: CampaignState, x: CampaignSuspended | undefined): CampaignState {
  const t = clone(s);
  if (x) t.suspended = clone(x);
  else delete t.suspended;
  return t;
}

/** Savaş kurulumunun parmak izi: seed + takımlar + birim kurulumları (ekipman, can, ceset) + Valor. */
// Dalgalı savaşta sonraki dalgalar da girer (planKey; dalgasız planın anahtarı eskisiyle aynı). Dalgalar açılmadan önce duraklatılmış bir savaşın
// düğümü artık dalgalıysa anahtar tutmaz ve savaş baştan başlar (PAUSED_BROKEN).
export const resumeKey = (plan: Pick<BattlePlan, 'seed' | 'party' | 'enemies' | 'units' | 'valor' | 'waves'>): string =>
  planKey({ seed: plan.seed, party: plan.party, enemies: plan.enemies, units: [plan.units, plan.valor ?? null], ...(plan.waves?.length ? { waves: plan.waves } : {}) });

/** Planın dalgalı savaş girişi (motor teams.waves; docs/design/waves.md). Dalgasız planda boş. */
export const campaignWaveTeams = (plan: Pick<BattlePlan, 'waves'>) => (plan.waves?.length ? { waves: plan.waves.map((w) => ({ enemies: w.enemies, units: w.units })) } : {});

/** Planın savaşı (BattleScene'in kurduğuyla aynı giriş: hücre listeleri, arrange=false, Valor). */
export const battleForPlan = (plan: BattlePlan): Battle =>
  new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...campaignWaveTeams(plan), ...(plan.valor !== undefined ? { valor: { party: plan.valor } } : {}) }, false));

/** Duraklatılmış savaşın planı: düğümün planı, seed kayıttaki (deneme sayacı bellekte; yüklemede sıfırlanır). */
export const resumePlan = (s: CampaignState, x: CampaignSuspended): BattlePlan => ({ ...battlePlan(s, 0), seed: x.seed });

/**
 * Duraklatılmış savaş sürdürülebilir mi: kurulum aynı, günlük başsız bir savaşta sorunsuz oynuyor, tur ve durum özeti tutuyor.
 * Tutmazsa (veri değişti, kayıt bozuk) savaş baştan başlar.
 */
export function canResume(s: CampaignState): boolean {
  const x = suspendedOf(s);
  if (!x) return false;
  try {
    const plan = resumePlan(s, x);
    return x.setup === resumeKey(plan) && restoreBattle(battleForPlan(plan), x);
  } catch {
    return false;
  }
}

/** Savaşın şu anki halinden duraklatma kaydı (geri çekilme anı). */
export function pauseRecord(plan: BattlePlan, battle: Battle, actions: CampaignSuspended['actions']): CampaignSuspended {
  return { node: plan.nodeId, seed: plan.seed, actions: [...actions], turn: battle.turnsTaken, hash: battleHash(battle), setup: resumeKey(plan) };
}
