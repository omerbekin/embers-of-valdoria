/**
 * SEFER DÜŞMANI SKILL SESLERİ (Ömer 2026-10-16): her mob skill'inin KENDİ sesi (data/audio-mobs.json). Mob skill'leri efektlerini hâlâ
 * bir class skill'inden ödünç alabilir (`artOf`) ya da kendi sheet'ini oynatır (src/game/mob-vfx.ts); efekt `c.sfx(id)` ile ödünç
 * sesin adını ister. Burada o ad bir ROLE çevrilir (cast = hazırlık / savurma / atış, travel = uçuş, hit = vuruş, none = sessiz;
 * skill bazında `roles` ezer) ve skill'in o roldeki kendi sesi seçilir. Skill bu tabloda yoksa `undefined` döner: çağıran eski ödünç
 * sesi çalar (yedek). Phaser'sız (testlenebilir).
 */
import mobAudio from '../../data/audio-mobs.json';
import type { SfxDef } from './audio';

export type MobSfxRole = 'cast' | 'travel' | 'hit' | 'none';

export interface MobSkillSounds {
  cast?: string;
  travel?: string;
  hit?: string;
  /** Bu skill'e özel ad -> rol eşlemesi (genel `roles` tablosunu ezer). */
  roles?: Record<string, MobSfxRole>;
}

export interface MobSfxDef extends SfxDef {
  label: string;
  desc: string;
}

const data = mobAudio as unknown as { roles: Record<string, MobSfxRole>; skills: Record<string, MobSkillSounds>; sfx: Record<string, MobSfxDef> };

export const MOB_SFX: Readonly<Record<string, MobSfxDef>> = data.sfx;
export const MOB_SKILL_SOUNDS: Readonly<Record<string, MobSkillSounds>> = data.skills;
export const MOB_SFX_ROLES: Readonly<Record<string, MobSfxRole>> = data.roles;

/** Aynı kendi ses bir döküm içinde bundan sık çalmaz (ms; örn. hücre başına gelen vuruş istekleri tek sese iner). */
export const MOB_SFX_MIN_GAP_MS = 90;

/** Ödünç ses adının bu skill'deki rolü (bilinmeyen ad: sessiz). */
export function mobSfxRole(skillId: string, requested: string): MobSfxRole {
  return MOB_SKILL_SOUNDS[skillId]?.roles?.[requested] ?? MOB_SFX_ROLES[requested] ?? 'none';
}

/**
 * Mob skill'inin istenen ödünç ses yerine çalacağı KENDİ sesi: ses adı, `null` (bu istek sessiz) ya da `undefined` (skill'in kendi sesi
 * yok: ödünç ses çalsın). Kendi sesin tarifi eksikse de `undefined` (yedek).
 */
export function mobSfxFor(skillId: string, requested: string): string | null | undefined {
  const own = MOB_SKILL_SOUNDS[skillId];
  if (!own) return undefined;
  const role = mobSfxRole(skillId, requested);
  if (role === 'none') return null;
  const id = own[role];
  if (!id) return null;
  return MOB_SFX[id] ? id : undefined;
}

/** Skill'in kendi sesleri (rol sırasıyla: cast, travel, hit). */
export const mobSoundsOf = (skillId: string): string[] => {
  const own = MOB_SKILL_SOUNDS[skillId];
  return own ? (['cast', 'travel', 'hit'] as const).flatMap((r) => (own[r] ? [own[r]!] : [])) : [];
};

/**
 * Bir döküm için ses çevirici: `(id, nowMs)` -> çalınacak kendi ses (aynı ses MOB_SFX_MIN_GAP_MS içinde ikinci kez gelirse null),
 * `null` (sessiz) ya da `undefined` (ödünç ses). Skill mob tablosunda yoksa fonksiyon yerine null döner.
 */
export function mobSfxSession(skillId: string): ((requested: string, nowMs: number) => string | null | undefined) | null {
  if (!MOB_SKILL_SOUNDS[skillId]) return null;
  const last = new Map<string, number>();
  return (requested, nowMs) => {
    const id = mobSfxFor(skillId, requested);
    if (!id) return id;
    const prev = last.get(id);
    if (prev !== undefined && nowMs - prev < MOB_SFX_MIN_GAP_MS) return null;
    last.set(id, nowMs);
    return id;
  };
}
