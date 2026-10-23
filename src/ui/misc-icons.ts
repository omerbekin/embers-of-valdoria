import { miscImage } from '../game/icon-image-files';

/**
 * BOYALI OYUN İKONLARI (Ömer 2026-10-10; 60 ikon, skill ikonları hariç): assets/misc-icons/<grup>/<ad>.png (128) + small/ (64). Asıl sayfalar
 * assets/source/misc-icons (status-sheet, world-sheet, class-node-sheet), kesim + dama silme `node tools/make-misc-icons.mjs`.
 * Ad '<grup>:<ad>' (ör. 'status:slow', 'element:fire', 'class:warrior', 'node:boss'); `ensureIcon` / `iconUrl` art-registry üzerinden boyalı
 * görsele çözer (yumuşak ölçek, DOM `#smooth`). Görsel yoksa çağıran eski kodla çizilen ikonu kullanır: `paintedOr(grup, ad, eski)`.
 */
export const MISC_GROUPS = ['status', 'fx', 'element', 'ground', 'relic', 'emblem', 'class', 'node', 'codex'] as const;
export type MiscGroup = (typeof MISC_GROUPS)[number];

/** Beklenen tüm ikonlar (kesim aracının hücre haritasıyla aynı; test ve Codex listesi). */
export const MISC_ICONS: Record<MiscGroup, readonly string[]> = {
  status: ['slow', 'haste', 'wound', 'stun', 'fortify', 'blessed', 'blinded', 'shrouded', 'dark_bond', 'omen', 'wither', 'jinxed', 'abyssal_fury', 'silence', 'overextended', 'staggered', 'ash_brand', 'anchored', 'doom'],
  fx: ['crit', 'corpse', 'barrier', 'difficulty', 'chapter_strength'],
  element: ['fire', 'ice', 'holy', 'arcane', 'nature', 'dark'],
  ground: ['poison', 'burning', 'holy_fire', 'flooded_planks'],
  relic: ['ember_of_valdren', 'pilgrims_bell', 'whetstone_of_ashford', 'banner_of_the_bridge', 'last_rites', 'iron_oath'],
  emblem: ['heal', 'feast'],
  class: ['warrior', 'defender', 'paladin', 'archer', 'cutthroat', 'antimage', 'mage', 'druid', 'undead', 'hexer', 'gambler'],
  node: ['battle', 'elite', 'boss', 'event', 'town', 'treasure', 'rest', 'merchant', 'start'],
  /** Codex (wiki) sol menüsü, Getting Started / Mechanics / Weakness table ikonları (docs/design/art/codex-icons.md; içe aktarma tools/make-misc-icon.py). */
  codex: ['nav_start', 'nav_lessons', 'nav_classes', 'nav_skills', 'nav_mechanics', 'nav_statuses', 'nav_elements', 'nav_assets', 'nav_sounds', 'nav_animations', 'nav_icons', 'nav_art', 'nav_poses', 'nav_palette', 'nav_versions', 'nav_legacy', 'gs_goal', 'gs_turns', 'gs_screen', 'el_weakness', 'mech_damage', 'mech_ground', 'mech_enemy_passives', 'mech_gamble', 'mech_area', 'mech_half_turn', 'mech_multiplayer', 'mech_campaign', 'mech_legendary', 'mech_affixes', 'mech_levels', 'mech_endless', 'mech_valor'],
};

/** Henüz oyunda yeri olmayan ikonlar (dosyaları üretilir, Codex'te "not used yet"): Valdoria x2 düğümleri. */
export const MISC_UNUSED: readonly string[] = ['node:rest', 'node:merchant', 'node:start'];

export const miscIconName = (group: MiscGroup, name: string): string => `${group}:${name}`;

const PREFIX = new RegExp(`^(${MISC_GROUPS.join('|')}):`);
/** Ad bir oyun ikonu adı mı ('<grup>:<ad>'). */
export const isMiscIconName = (name: string): boolean => PREFIX.test(name);

/** Bu oyun ikonunun boyalı görseli var mı. */
export const hasMiscImage = (group: MiscGroup, name: string): boolean => miscImage(miscIconName(group, name)) !== null;

/** Boyalı görsel varsa onun adı, yoksa eski (kodla çizilen) ikon adı. */
export function paintedOr<T extends string | null | undefined>(group: MiscGroup, name: string | null | undefined, fallback: T): string | T {
  return name && hasMiscImage(group, name) ? miscIconName(group, name) : fallback;
}

/** Sınıf logosu: boyalı sınıf amblemi (assets/misc-icons/class/<id>.png) varsa onun adı, yoksa verideki logo (çağrılar ve görseli olmayanlar). */
export function classLogoName(def: { id: string; logo: string }): string {
  const id = def.id.replace(/^enemy_/, '');
  return hasMiscImage('class', id) ? miscIconName('class', id) : def.logo;
}
