import { mobImage } from '../game/icon-image-files';

/**
 * SEFER MOBU İKONLARI (Bölge II, ChatGPT 2026-10-16): mob skill'leri ve pasifleri verideki `icon` alanında hâlâ ödünç piksel ikonun adını
 * taşır (artOf kuralı; yedek). Boyalı görsel (assets/mob-icons/<skill ya da pasif id>.png) varsa ikon çizen her yer bu adı kullanır:
 * 'mob:<id>' -> art-registry yumuşak ölçekli görsele çözer (DOM `#smooth`). İçe aktarma: `node tools/import-mob-art.mjs icons`.
 */
export const MOB_ICON_PREFIX = 'mob:';

export const isMobIconName = (name: string): boolean => name.startsWith(MOB_ICON_PREFIX);

/** Skill'in çizilecek ikon adı: boyalı mob ikonu varsa 'mob:<skill id>', yoksa verideki ikon. */
export const skillIconName = (skill: { id: string; icon: string }): string => (mobImage(skill.id) ? `${MOB_ICON_PREFIX}${skill.id}` : skill.icon);

/** Pasifin çizilecek ikon adı: boyalı mob ikonu varsa 'mob:<pasif id>', yoksa verideki ikon (o da yoksa `fallback`). */
export function passiveIconName(passive: { id?: string; icon?: string } | null | undefined, fallback = ''): string {
  if (passive?.id && mobImage(passive.id)) return `${MOB_ICON_PREFIX}${passive.id}`;
  return passive?.icon || fallback;
}
