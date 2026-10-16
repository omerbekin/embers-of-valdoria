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
  // doku bırakılıp yeniden yüklendiyse (releaseTextures) eski döngü ölü karelere bakar: yeniden kur
  const old = scene.anims.get(anim);
  if (old && old.frames.some((f) => f.frame?.texture !== tex)) scene.anims.remove(anim);
  if (!scene.anims.exists(anim)) scene.anims.create({ key: anim, frames: def.idle.map((frame) => ({ key, frame })), frameRate: 1000 / Math.max(100, def.idleMs), repeat: -1 });
  return def;
}

/** MobPosePlayer'ın dış dünyası: Phaser sprite'ı ve sahne saati (testte sahte). */
export interface MobPoseOutput {
  /** Boşta döngüsünü başlat (zaten oynuyorsa dokunma). */
  loop(): void;
  /** Döngüyü durdurup tek kare göster. */
  frame(n: number): void;
  /** Birim ayakta mı (ölü / yere düşmüş değil). */
  alive(): boolean;
  now(): number;
  after(ms: number, fn: () => void): void;
}

/** Ham ms süreleri (çağıran skillSlowdown ile çarpılmış verir). */
export interface MobPoseTimes {
  /** Darbe karesi varsayılan süresi (hit-reaction süresi verilmezse). */
  hitMs: number;
  /** Skill dışındaki attack / cast / defend karesinin tutuluşu (geç istek, olay efekti). */
  lateMs: number;
  /** Skill bittikten (useSkill(null)) sonra boşta döngüsüne dönüş. */
  endMs: number;
  /** Yığılma karesinden yerdeki kareye geçiş. */
  dyingMs: number;
}

/**
 * Poz sayfalı mob / boss'un kare durum makinesi (saf; tests/mob-pose-player.test.ts). 0.8.2.3 hatası (Bandit Chief alan skill'inden sonra
 * vuruş karesinde donuyordu): eskiden skill bitişi ile kare değişimleri aynı jetonu paylaşıyordu; skill bittikten sonra gelen herhangi bir kare
 * isteği (efekt kuyruğunun idle'ı, darbe, geç attack) skill temizliğini iptal ediyor, `skill` sonsuza dek dolu kalıyordu. Kural: skill
 * bitişinin kendi jetonu var; skill sürerken tutulmayan her kare kendiliğinden döner; skill bitince (darbe karesi sürmüyorsa) boşta döngüsü.
 */
export class MobPosePlayer {
  skill: MobPoseSkill | null = null;
  private frameToken = 0;
  private skillToken = 0;
  /** Darbe karesinin bitiş anı (o sürerken skill bitişi darbeyi kesmez; darbe kendi dönüşünde boşta döngüsüne geçer). */
  private hitUntil = 0;

  constructor(
    private readonly def: MobPoseDef,
    private readonly out: MobPoseOutput,
    private readonly times: MobPoseTimes,
  ) {}

  play(anim: MobPoseState, hitMs?: number): void {
    if (anim === 'idle' && !this.skill) {
      this.hitUntil = 0;
      this.out.loop();
      return;
    }
    this.out.frame(mobPoseFrame(this.def, anim, this.skill));
    const token = ++this.frameToken;
    this.hitUntil = 0;
    const back = (): void => {
      if (token === this.frameToken && this.out.alive()) this.play('idle');
    };
    if (anim === 'death') {
      this.out.after(this.times.dyingMs, () => token === this.frameToken && this.out.frame(this.def.dead));
      return;
    }
    if (anim === 'hit') {
      const ms = hitMs ?? this.times.hitMs;
      this.hitUntil = this.out.now() + ms;
      this.out.after(ms, back);
    } else if (!this.skill) this.out.after(this.times.lateMs, back); // skill dışında (geç istek): kendi dönüşü yok, kısa süre sonra boşta
    // skill sürerken attack / cast / idle karesi tutulur: skill bitişi (useSkill(null)) bırakır
  }

  useSkill(skill: MobPoseSkill | null): void {
    const token = ++this.skillToken;
    if (skill) {
      this.skill = skill;
      return;
    }
    this.out.after(this.times.endMs, () => {
      if (token !== this.skillToken) return;
      this.skill = null;
      if (!this.out.alive() || this.out.now() < this.hitUntil) return;
      this.play('idle');
    });
  }
}
