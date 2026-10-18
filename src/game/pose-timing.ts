import layout from '../../data/battle-layout.json';

/**
 * v2 poz gövdesinde skill pozunun idle'a dönüş zamanları (saf hesap; CombatantView kullanır, testler tests/pose-timing.test.ts).
 * Ömer 2026-10-13: "karakter eliyle skill atıyor ve eli 1-2 sn daha havada kalıyor". Eskiden büyü / atış pozu skill'in tamamı boyunca
 * (efektin kendi idle isteği yok sayılarak) ve vuruş anında çözülen efektte efektin sonuna dek tutuluyordu. Kural artık:
 * - poz, vuruş anından (skill çözüldü) `releaseMs` sonra idle'a döner (son poz isteğinden itibaren en az `castMinMs` görünür);
 * - efektin kendi idle isteği (ör. kazıklar yere çakılınca) dinlenir, en kısa görünme süresi dolunca uygulanır;
 * - büyü / atış skill'inde fırlatış (attack) pozu en çok `throwHoldMs` tutulur (zar / bomba havadayken el iner);
 * - kanallı skill'ler (`holdSkills`: ok şerit boyunca uçar, uzun germe) vuruşa / efektin sonuna dek tutar, sonra `holdReleaseMs`.
 * Tüm süreler ham ms'dir; çağıran `skillSlowdown` çarpanını (`k`) verir.
 */
export interface PoseTiming {
  releaseMs: number;
  castMinMs: number;
  meleeMinMs: number;
  throwHoldMs: number;
  holdSkills: string[];
  holdReleaseMs: number;
  lateWindowMs: number;
  lateHoldMs: number;
  hitHoldMs: number;
}

export const POSE_TIMING: PoseTiming = layout.animation.pose;

/** Pozun tutulduğu skill bağlamı (sahne zamanı, ms). */
export interface PoseHold {
  now: number;
  /** Skill'in hareketi (melee / ranged / cast / sky ...). */
  motion?: string;
  /** Skill id'si (Pose Tester kopyası `pt_` önekiyle de olur). */
  skillId?: string;
  /** Son poz isteğinin (skill başı, attack / cast isteği) anı. */
  lastRequestAt: number;
  /** Şu anki pozun gösterildiği an. */
  shownAt: number;
}

/**
 * Skill'in SUNUM hareketi (yalnızca görünüm; Ömer 2026-10-18): skills.json > `viewMotion` varsa o, yoksa `motion`. Motor ve yapay zeka yalnızca
 * `motion`a bakar (menzil / yakın dövüş kuralı); koşarak vurma, poz tutma süresi gibi görsel kararlar buradan okunur
 * (ör. Mana Steal: motor için `melee`, ekranda yerinden fırlatılan hançer = `ranged`).
 */
export const viewMotion = (s: { motion?: string; viewMotion?: string } | null | undefined): string | undefined => s?.viewMotion ?? s?.motion;

/** Kanallı skill mi (poz vuruşa / efektin sonuna dek tutulur). */
export const isHoldSkill = (t: PoseTiming, id: string | undefined): boolean => !!id && t.holdSkills.includes(id.replace(/^pt_/, ''));

/** Büyü / atış pozunun en kısa görünme süresinden kalan (ms, en az 0). */
const castLeft = (t: PoseTiming, h: PoseHold, k: number): number => Math.max(0, t.castMinMs * k - (h.now - h.lastRequestAt));

/**
 * Skill SÜRERKEN efektin idle isteği: kaç ms sonra idle (0 = hemen), null = yok say (kanallı skill: skill bitince döner).
 */
export function idleRequestDelay(t: PoseTiming, h: PoseHold, k: number): number | null {
  if (h.motion === 'melee') return Math.max(0, t.meleeMinMs * k - (h.now - h.shownAt));
  if (isHoldSkill(t, h.skillId)) return null;
  return castLeft(t, h, k);
}

/** Skill bitti (vuruş anı: efekt çözüldü): kaç ms sonra idle. */
export function endDelay(t: PoseTiming, h: PoseHold, k: number): number {
  if (h.motion === 'melee') return t.releaseMs * k;
  return Math.max(t.releaseMs * k, castLeft(t, h, k));
}

/** Büyü / atış skill'inde fırlatış (attack) isteği: pozun en uzun tutuluşu (ms), null = sınır yok (yakın dövüş / kanallı). */
export function throwHoldDelay(t: PoseTiming, h: Pick<PoseHold, 'motion' | 'skillId'>, k: number): number | null {
  if (h.motion === 'melee' || isHoldSkill(t, h.skillId)) return null;
  return t.throwHoldMs * k;
}

/** Kanallı skill'in efekti bitti: kaç ms sonra idle (en kısa görünme süresi dolmadıysa o kadar). */
export function holdEndDelay(t: PoseTiming, holdUntil: number, now: number, k: number): number {
  return Math.max(t.holdReleaseMs * k, holdUntil - now);
}

/**
 * Bir skill pozunun vuruş anından (skill çözüldü) sonra en çok ne kadar görünebileceği (ms, kanallı skill'in efekt süresi hariç):
 * vuruş anı = son poz isteği (en kötü durum) varsayımıyla. Test bu sınırın ~150-300 ms (x skillSlowdown) kalmasını denetler.
 */
export const maxLingerAfterImpact = (t: PoseTiming, k: number): number => Math.max(t.releaseMs, t.lateHoldMs) * k;
