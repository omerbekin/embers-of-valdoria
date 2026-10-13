import layout from '../../data/battle-layout.json';

/**
 * Darbe tepkisi kademesi (saf hesap; Phaser'sız, testler tests/hit-reaction.test.ts). Ömer 2026-10-14: "1 hasar ile 50 hasar aynı
 * animasyonu oynuyor". Yalnızca sunum: motor aynı. Sayılar data/battle-layout.json > animation.hitReaction.
 * - light: hasar maks canın küçük bir payı ya da kalkan hepsini emdi -> poz değişmez, 2-4 px geri tepme + kısa parlama;
 * - medium: bugünkü darbe pozu + normal geri tepme;
 * - heavy: büyük pay ya da kritik -> güçlü savrulma, eğilme, uzun poz, toz; en ağırında (minRatio) küçük ekran sarsıntısı.
 * Kritik bir kademe yükseltir; çok vuruşlu skill'de son darbe dışındakiler ve durum / zemin tikleri tavanla sınırlanır.
 */
export type HitTier = 'light' | 'medium' | 'heavy';
export const HIT_TIERS: readonly HitTier[] = ['light', 'medium', 'heavy'];

export interface HitTierLook {
  pose: boolean;
  poseMs: number;
  flash: string;
  flashMs: number;
  tint: string | null;
  tintMs: number;
  recoilPx: number;
  recoilMs: number;
  knockPx: number;
  knockMs: number;
  leanMult: number;
  crouchMult: number;
  dust: boolean;
}

export interface HitReactionCfg {
  lightBelow: number;
  heavyAbove: number;
  critBump: number;
  multiHitCap: string;
  tickCap: string;
  singleLeanDeg: number;
  light: HitTierLook;
  medium: HitTierLook;
  heavy: HitTierLook;
  shake: { minRatio: number; ms: number; intensity: number };
}

export const HIT_REACTION = layout.animation.hitReaction as HitReactionCfg;

export interface HitInput {
  /** Cana geçen hasar (kalkanın emdiği hariç). */
  amount: number;
  /** Kalkanın emdiği. */
  absorbed?: number;
  maxHp: number;
  crit?: boolean;
  /** Aynı skill kullanımında bu hedefe gelen darbelerden kaçıncısı (0'dan) ve toplam sayı. */
  hitIndex?: number;
  hitCount?: number;
  /** Durum / zemin tiki (Wither, zemin hasarı): tickCap ile sınırlı. */
  tick?: boolean;
  /** Bu kullanımda sarsıntı zaten oldu. */
  shakeUsed?: boolean;
  /** Reduced motion ya da Performance mode: sarsıntı ve toz yok. */
  calm?: boolean;
}

export interface HitReaction extends HitTierLook {
  tier: HitTier;
  /** Hasar / maks can (0-1+). */
  ratio: number;
  /** Ekran sarsıntısı (null = yok). */
  shake: { ms: number; intensity: number } | null;
}

const rank = (t: string): number => Math.max(0, HIT_TIERS.indexOf(t as HitTier));

/** Kademe: oran + kritik + çok vuruş / tik tavanı. */
export function hitTier(cfg: HitReactionCfg, h: HitInput): HitTier {
  const ratio = h.maxHp > 0 ? Math.max(0, h.amount) / h.maxHp : 0;
  if (h.amount <= 0) return 'light'; // kalkan emdi (ya da 0 hasar)
  let r = ratio < cfg.lightBelow ? 0 : ratio > cfg.heavyAbove ? 2 : 1;
  if (h.crit) r += cfg.critBump;
  const count = h.hitCount ?? 1;
  const notLast = count > 1 && (h.hitIndex ?? count - 1) < count - 1;
  if (notLast) r = Math.min(r, rank(cfg.multiHitCap));
  if (h.tick) r = Math.min(r, rank(cfg.tickCap));
  return HIT_TIERS[Math.min(2, Math.max(0, r))] as HitTier;
}

/** Tam tepki: kademenin görünümü + sarsıntı kararı. */
export function hitReaction(cfg: HitReactionCfg, h: HitInput): HitReaction {
  const tier = hitTier(cfg, h);
  const ratio = h.maxHp > 0 ? Math.max(0, h.amount) / h.maxHp : 0;
  const look = cfg[tier];
  const shake = tier === 'heavy' && !h.calm && !h.shakeUsed && ratio >= cfg.shake.minRatio ? { ms: cfg.shake.ms, intensity: cfg.shake.intensity } : null;
  return { ...look, dust: look.dust && !h.calm, tier, ratio, shake };
}

/**
 * Aynı skill kullanımında bu darbenin hedefe gelen kaçıncı darbe olduğu (`events` kullanımın olayları, `e` bu darbe). Bulunamazsa tek darbe.
 */
export function hitOrder<E extends { type: string; target?: string }>(events: readonly E[], e: E): { hitIndex: number; hitCount: number } {
  const same = events.filter((x) => x.type === 'damage' && x.target === e.target);
  const i = same.indexOf(e);
  return i < 0 ? { hitIndex: 0, hitCount: 1 } : { hitIndex: i, hitCount: same.length };
}
