import { mobImage } from '../game/icon-image-files';

/**
 * SEFER MOBU İKONLARI (Bölge II, ChatGPT 2026-10-16): mob skill'leri ve pasifleri verideki `icon` alanında hâlâ ödünç piksel ikonun adını
 * taşır (artOf kuralı; yedek). Boyalı görsel (assets/mob-icons/<skill ya da pasif id>.png) varsa ikon çizen her yer bu adı kullanır:
 * 'mob:<id>' -> art-registry yumuşak ölçekli görsele çözer (DOM `#smooth`). İçe aktarma: `node tools/import-mob-art.mjs icons`.
 */
export const MOB_ICON_PREFIX = 'mob:';

export const isMobIconName = (name: string): boolean => name.startsWith(MOB_ICON_PREFIX);

/**
 * Skill'in çizilecek ikon adı: boyalı mob ikonu varsa 'mob:<skill id>'; yoksa sanatını ödünç aldığı skill'in (artOf; Bölge III yer tutucuları bir
 * Bölge I-II mob skill'ine bağlı) boyalı ikonu; o da yoksa verideki ikon. Kendi dosyası gelince kendiliğinden öne geçer.
 */
export const skillIconName = (skill: { id: string; icon: string; artOf?: string }): string => {
  if (HERO_SKILL_IDS.has(skill.id)) return skill.icon;
  if (mobImage(skill.id)) return `${MOB_ICON_PREFIX}${skill.id}`;
  if (skill.artOf && mobImage(skill.artOf)) return `${MOB_ICON_PREFIX}${skill.artOf}`;
  return skill.icon;
};

/** Kahraman skill'i olup bir mob pasifiyle aynı id'yi taşıyanlar (Defender Close Ranks = halberdier/sworn guard pasifi): mob ikonu değil kendi ikonu. */
const HERO_SKILL_IDS: ReadonlySet<string> = new Set(['close_ranks']);

/**
 * YER TUTUCU pasif ikonları (Bölge III, campaign-dev 2026-10-17; mob-plan.md 10.6): ChatGPT ikonu gelene kadar yeni pasif, temaca yakın bir
 * Bölge I-II pasifinin BOYALI ikonunu gösterir. Kendi dosyası (assets/mob-icons/<pasif id>.png) gelince kendiliğinden öne geçer; satır sonra silinebilir.
 */
export const PASSIVE_ICON_STANDIN: Readonly<Record<string, string>> = {
  close_ranks: 'martyrs_vow',
  blood_scent: 'pack_tactics',
  searing_rebuke: 'rebuke',
  molten_shed: 'last_ember',
  crown_of_ash: 'shares_of_the_dead',
};

/** Pasifin çizilecek ikon adı: boyalı mob ikonu varsa 'mob:<pasif id>', yoksa verideki ikon (o da yoksa `fallback`). */
export function passiveIconName(passive: { id?: string; icon?: string } | null | undefined, fallback = ''): string {
  if (passive?.id && mobImage(passive.id)) return `${MOB_ICON_PREFIX}${passive.id}`;
  const standIn = passive?.id ? PASSIVE_ICON_STANDIN[passive.id] : undefined;
  if (standIn && mobImage(standIn)) return `${MOB_ICON_PREFIX}${standIn}`;
  return passive?.icon || fallback;
}
