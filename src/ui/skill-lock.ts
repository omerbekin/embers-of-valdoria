// Kilitli skill'in oyuncuya gösterilen metni ve simgesi (savaş HUD'ı skill çubuğu + ipucu). Saf; sayılar ve adlar veriden gelir.
import { uiImage } from '../game/icon-image-files';

/** Metin kaynağı yoksa gösterilen kısa metin (koşul veride bulunamadığında gerçek olmayan bir şart yazılmaz). */
export const LOCKED_FALLBACK = 'Locked for now';

/**
 * Kilitli skill'in açılış metni. Önce motorun kendi dalga kilidi (unlockOnWave: dalga 0 tabanlı, oyuncuya 1 tabanlı), sonra sefer verisinden
 * gelen ipucu (soloUnlockHints: "Unlocks at <düğüm>"), ikisi de yoksa "Locked for now".
 */
export function lockedSkillText(actor: { unlockOnWave?: { wave: number; skills: string[] } }, skillId: string, hint?: Record<string, string>): string {
  const w = actor.unlockOnWave;
  if (w && w.skills.includes(skillId)) return `Unlocks in wave ${w.wave + 1}`;
  return hint?.[skillId] ?? LOCKED_FALLBACK;
}

/** Skill plakası ikonunun üstündeki kilit simgesi: boyalı görsel (assets/ui-icons/lock); dosya yoksa sade CSS asması (oyun çökmez). */
export function lockBadgeHtml(): string {
  const f = uiImage('lock');
  return f ? `<img class="bp-lock" src="${f.url}" alt="Locked" draggable="false">` : '<span class="bp-lock ph" aria-label="Locked"></span>';
}
