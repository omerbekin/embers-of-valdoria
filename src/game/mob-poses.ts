/**
 * SEFER MOBU / BOSS POZ SAYFALARI (Ömer 2026-10-16): tek görselli birim (sınıf poz kütüphanesi olmayan: moblar, bosslar) için isteğe bağlı
 * tam boy poz kareleri. Dosya assets/sprites/<id>/poses.png (ızgara; `node tools/import-mob-art.mjs poses`), hangi anda hangi kare
 * data/mob-poses.json. Kayıt ya da dosya yoksa null: birim bugünkü gibi idle.png ile çizilir. Seçim kuralı saf (`mobPoseFrame`, testli);
 * Phaser tarafı yalnızca dokuyu karelere böler ve boşta döngüsünü kaydeder. Oynatma src/game/combatant-view.ts > play / useSkill.
 */
import type Phaser from 'phaser';
import data from '../../data/mob-poses.json';

export interface MobPoseDef {
  cols: number;
  rows: number;
  /** Sayfanın idle.png'ye göre piksel yoğunluğu (0,5 = yarı çözünürlük). */
  density: number;
  idle: number[];
  idleMs: number;
  windup: number;
  release: number;
  channel: number;
  bless: number;
  strike: number;
  move: number;
  hit: number;
  defend: number;
  dying: number;
  dead: number;
  /** Skill'e özel kareler (skill id -> hazırlık + vuruş; Bandit Chief'in Toll Sweep'i gibi genel türün karesine uymayanlar). */
  skills?: Readonly<Record<string, { windup?: number; act: number }>>;
}

export const MOB_POSES: Readonly<Record<string, MobPoseDef>> = Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_'))) as Record<string, MobPoseDef>;

export type MobPoseState = 'idle' | 'attack' | 'cast' | 'hit' | 'death' | 'defend';

/** Skill'in poz için gereken özeti. */
export interface MobPoseSkill {
  id?: string;
  motion?: string;
  target?: string;
}

const ALLY_TARGETS = new Set(['single_ally', 'dead_ally', 'all_allies', 'self']);
const AREA_TARGETS = new Set(['area_enemies', 'area_any', 'all_enemies', 'everyone', 'random_enemies']);

/**
 * Durum + oynanan skill -> kare. cast = hazırlık (dosta büyü: bless, alan: channel, yoksa windup); attack = vuruş (yakın dövüş strike, dosta bless,
 * alan channel, yoksa release); boşta skill sürüyorsa skill'in vuruş karesi tutulur (büyü pozu hemen sönmesin). Kayıtta skill'e özel kare
 * (`skills[id]`) varsa o kazanır.
 */
export function mobPoseFrame(def: MobPoseDef, state: MobPoseState, skill: MobPoseSkill | null): number {
  const target = skill?.target ?? '';
  const ally = ALLY_TARGETS.has(target);
  const area = AREA_TARGETS.has(target);
  const own = skill?.id ? def.skills?.[skill.id] : undefined;
  const act = (): number => (own ? own.act : skill?.motion === 'melee' ? def.strike : ally ? def.bless : area ? def.channel : def.release);
  switch (state) {
    case 'cast':
      return own ? (own.windup ?? own.act) : ally ? def.bless : area ? def.channel : def.windup;
    case 'attack':
      return act();
    case 'idle':
      return skill ? act() : (def.idle[0] ?? 0);
    case 'hit':
      return def.hit;
    case 'defend':
      return def.defend;
    case 'death':
      return def.dying;
  }
}

export const mobPoseKey = (spriteId: string): string => `sprite:${spriteId}:poses`;
export const mobPoseIdleAnim = (spriteId: string): string => `mobpose:${spriteId}:idle`;

/** Birimin poz sayfası hazırsa (kayıt + yüklü doku) tanımı; kareler ve boşta döngüsü ilk çağrıda kaydedilir. */
export function setupMobPose(scene: Phaser.Scene, spriteId: string): MobPoseDef | null {
  const def = MOB_POSES[spriteId];
  const key = mobPoseKey(spriteId);
  if (!def || !scene.textures.exists(key)) return null;
  const tex = scene.textures.get(key);
  if (!tex.has('0')) {
    const src = tex.getSourceImage();
    const fw = Math.floor(src.width / def.cols);
    const fh = Math.floor(src.height / def.rows);
    for (let i = 0; i < def.cols * def.rows; i++) tex.add(i, 0, (i % def.cols) * fw, Math.floor(i / def.cols) * fh, fw, fh);
  }
  const anim = mobPoseIdleAnim(spriteId);
  if (!scene.anims.exists(anim)) scene.anims.create({ key: anim, frames: def.idle.map((frame) => ({ key, frame })), frameRate: 1000 / Math.max(100, def.idleMs), repeat: -1 });
  return def;
}
