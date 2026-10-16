// Arayüz (menü) sesleri için TEK bağlantı noktası (Ömer 2026-10-10 onayı). Ortak kit yardımcıları (elegant-ui.ts: elModalIn/elModalOut/
// elConfirm/elBack/elButton/elLink; DOM: game-menu, Gear/Spoils pencereleri, closeDom) olay anında `uiSound(kind)` çağırır.
// Sesler `data/audio-ui.json` içinde, oyunun skill sesleriyle aynı katman dilinde (src/game/audio.ts > synthSfx) WebAudio ile sentezlenir:
// deri/parşömen hışırtısı, ahşap/demir tık, boğuk gümleme, kumaş fırçası, kese sallama, deri toka, ahşap vuruş (CLAUDE.md ses felsefesi).
// Kurallar: ilk kullanıcı hareketinden (tık/dokunma/tuş) önce ses YOK (tarayıcı autoplay kuralı); aynı tür ses `throttleMs`'ten sık çalmaz,
// hover tık/açılıştan hemen sonra susar; seviye = Settings > UI sounds (0-20 adım = %0-100, 0 = kapalı) x Master Volume. Hata oyunu durdurmaz.
import uiData from '../../data/audio-ui.json';
import worldData from '../../data/audio-world.json';
import type { SfxDef } from '../game/audio';
import { clampStep, readStepLevel, stepFraction, stepRecord } from './volume-steps';

export type UiSoundKind = 'open' | 'close' | 'confirm' | 'back' | 'hover' | 'select' | 'error' | 'toast' | 'tab' | 'equip' | 'snap' | 'buy' | 'sell';
export const UI_SOUND_KINDS: readonly UiSoundKind[] = ['open', 'close', 'confirm', 'back', 'hover', 'select', 'error', 'toast', 'tab', 'equip', 'snap', 'buy', 'sell'];

export interface UiSfxDef extends SfxDef {
  /** Codex'te görünen ad. */
  label: string;
  /** Sesin gerçek hayattaki karşılığı (Codex açıklaması). */
  desc: string;
}

export const UI_SFX = uiData.sfx as unknown as Record<UiSoundKind, UiSfxDef>;

/** Ayarlar (data/audio-ui.json). */
export const UI_AUDIO = {
  master: uiData.master,
  defaultLevel: uiData.defaultLevel,
  throttleMs: uiData.throttleMs as Record<string, number> & { default: number },
  hoverQuietMs: uiData.hoverQuietMs,
  vary: uiData.vary,
};

// ---------------------------------------------------------------- dünya / anlatı sesleri (data/audio-world.json; 2026-10-13)
// Harita açma/kapama (parşömen), Codex (kitap), olay/diyalog (tüy kalem, mühür), tüccar (sikke), kasaba (kapı, ocak), Valor korları, ganimet
// sandığı, item malzemesi (kumaş/deri/çelik/ahşap/takı), yürüyüş adımı + araba, savaş başı borusu, zafer/yenilgi stingeri. Kısalık kuralı
// (40-250 ms) yalnızca menü seslerine (audio-ui.json) uygulanır; bunlar daha uzun olabilir. bus 'ui' = UI sounds kaydırıcısı, 'sfx' = Sound Effects.

export type WorldSoundKind =
  | 'map_unroll'
  | 'map_roll'
  | 'book_open'
  | 'book_close'
  | 'quill'
  | 'seal'
  | 'coin_count'
  | 'door'
  | 'hearth'
  | 'ember_ignite'
  | 'loot_reveal'
  | 'item_cloth'
  | 'item_leather'
  | 'item_metal'
  | 'item_wood'
  | 'item_jewel'
  | 'march_step'
  | 'wagon_creak'
  | 'battle_horn'
  | 'boss_horn'
  | 'victory'
  | 'defeat';
export const WORLD_SOUND_KINDS = Object.keys(worldData.sfx) as WorldSoundKind[];

export interface WorldSfxDef extends UiSfxDef {
  /** Hangi kaydırıcı: 'ui' (UI sounds) ya da 'sfx' (Sound Effects). */
  bus: 'ui' | 'sfx';
}
export const WORLD_SFX = worldData.sfx as unknown as Record<WorldSoundKind, WorldSfxDef>;
export const WORLD_AUDIO = {
  master: worldData.master,
  throttleMs: worldData.throttleMs as Record<string, number> & { default: number },
  /** Haritada yürüyüş adımlarının temposu (CampaignMapScene.walk). */
  march: worldData.march as { stepMs: number; stepGain: number[]; wagonEvery: number; wagonGain: number },
  /** Item kaldırma (sürükleme başı) sesi, kuşanmaya göre kısık. */
  itemPickupGain: worldData.itemPickupGain,
};

/** Item malzemesi -> ses (saf; testli): silah ailesi / yuva. Kalkan, balta, gürz, hançer, miğfer = çelik; yay, asa = ahşap; tılsım = kumaş; zırh/eldiven/çizme = deri; takı = zincir. */
export function itemSoundKind(d: { slot: string; family?: string | undefined } | null | undefined): WorldSoundKind {
  if (!d) return 'item_leather';
  if (d.slot === 'trinket') return 'item_jewel';
  if (d.slot === 'weapon' || d.slot === 'offhand') {
    if (d.family === 'bows' || d.family === 'staves') return 'item_wood';
    if (d.family === 'charms') return 'item_cloth';
    return 'item_metal';
  }
  if (d.slot === 'helm') return 'item_metal';
  return 'item_leather';
}

// ---------------------------------------------------------------- seviye (Settings > UI sounds)

const KEY = 'proto.uiSound.v1';
const levelListeners = new Set<(level: number) => void>();
/** Kayıtlı arayüz ses seviyesi 0..20 adım (kayıt yoksa varsayılan: açık, orta; eski 0-10 kayıtlar x2 göçer: src/ui/volume-steps.ts). */
export function loadUiSoundLevel(): number {
  try {
    return readStepLevel(globalThis.localStorage?.getItem(KEY), 'level', UI_AUDIO.defaultLevel);
  } catch {
    return UI_AUDIO.defaultLevel;
  }
}

let level = loadUiSoundLevel();

export function uiSoundLevel(): number {
  return level;
}

export function setUiSoundLevel(v: number): void {
  level = clampStep(v);
  try {
    globalThis.localStorage?.setItem(KEY, stepRecord('level', level));
  } catch {
    /* saklama kapalı: yalnızca bu oturum */
  }
  for (const fn of levelListeners) fn(level);
}

/** Seviye değişince haber ver (kaldırma işlevi döner). */
export function onUiSoundLevelChange(fn: (level: number) => void): () => void {
  levelListeners.add(fn);
  return () => levelListeners.delete(fn);
}

// ---------------------------------------------------------------- seyreltme (saf; testli)

/** Aynı tür ses çok sık çalmasın; hover tık/açılış sonrası kısa süre susar (fare hızlı gezinince yağmur olmasın). */
export class UiSoundThrottle {
  private readonly last = new Map<string, number>();
  private lastOther = -Infinity;

  allow(kind: UiSoundKind, now: number): boolean {
    const gap = UI_AUDIO.throttleMs[kind] ?? UI_AUDIO.throttleMs.default;
    if (now - (this.last.get(kind) ?? -Infinity) < gap) return false;
    if (kind === 'hover' && now - this.lastOther < UI_AUDIO.hoverQuietMs) return false;
    this.last.set(kind, now);
    if (kind !== 'hover') this.lastOther = now;
    return true;
  }
}

/** Her çalışta küçük sapma (frekans ±vary.freq, kazanç -vary.gain..0): tekrarda makineli tüfek etkisi olmasın. Saf: `rnd` 0..1. */
export function varySfx(def: SfxDef, rnd: () => number): SfxDef {
  const f = 1 + (rnd() * 2 - 1) * UI_AUDIO.vary.freq;
  const g = 1 - rnd() * UI_AUDIO.vary.gain;
  return {
    gain: def.gain * g,
    layers: def.layers.map((l) => {
      if (l.type === 'tone' || l.type === 'noise') return { ...l, f0: l.f0 * f, f1: l.f1 * f };
      if (l.type === 'pluck') return { ...l, f: l.f * f };
      return l;
    }),
  };
}

// ---------------------------------------------------------------- çalma

type AudioModule = typeof import('../game/audio');
let synth: AudioModule | null = null;
let ctx: AudioContext | null = null;
let unlocked = false;
const throttle = new UiSoundThrottle();
let player: ((kind: UiSoundKind) => void) | null = null;

const loadSynth = (): Promise<AudioModule> =>
  import('../game/audio').then((m) => {
    synth = m;
    return m;
  });

function makeContext(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const C = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    ctx = C ? new C() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Bir sesi verilen bağlamda çalar (seviye x ana ses x arayüz master). Seviye 0 ya da oyun sesi kapalıysa sessiz. */
function playOn(c: AudioContext, m: AudioModule, kind: UiSoundKind, vary: boolean, lvl = level): void {
  const def = UI_SFX[kind];
  if (!def || lvl <= 0 || !m.audioSettings.enabled || m.audioSettings.volume <= 0) return;
  if (c.state !== 'running') void c.resume();
  const out = c.createGain();
  out.gain.value = UI_AUDIO.master * stepFraction(lvl) * m.audioSettings.volume;
  out.connect(c.destination);
  m.synthSfx(c, out, vary ? varySfx(def, Math.random) : def);
}

const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const;

/** İlk kullanıcı hareketinde ses bağlamı kurulur/açılır; bağlam çalışana kadar (iOS) dinlemeye devam eder. */
function onGesture(): void {
  unlocked = true;
  const c = makeContext();
  if (!synth) void loadSynth().catch(() => undefined);
  if (!c) return;
  if (c.state !== 'running') void c.resume().catch(() => undefined);
  else for (const ev of GESTURES) globalThis.removeEventListener?.(ev, onGesture, true);
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  for (const ev of GESTURES) window.addEventListener(ev, onGesture, { capture: true, passive: true });
}

/** Arayüz olayı: ilk kullanıcı hareketinden sonra, seyreltmeden geçerse sesi çalar. Hata oyunu durdurmaz. */
export function uiSound(kind: UiSoundKind): void {
  try {
    if (player) return player(kind);
    if (!unlocked || !ctx || !synth || level <= 0) return;
    if (!throttle.allow(kind, performance.now())) return;
    playOn(ctx, synth, kind, true);
  } catch {
    /* ses hatası arayüzü bozmasın */
  }
}

/**
 * Deneme çalışı (Codex > Sounds, Settings kaydırıcısı): seyreltme ve sapma YOK; bir tıkla çağrıldığı için kilit açıktır.
 * `on` verilirse o bağlamda (Codex'in kendi bağlamı) çalar. `audition`: arayüz sesleri kapalı (0) olsa da varsayılan seviyede dinlet (Codex).
 */
export function previewUiSound(kind: UiSoundKind, on?: AudioContext, audition = false): void {
  onGesture();
  const c = on ?? ctx;
  if (!c) return;
  void (synth ? Promise.resolve(synth) : loadSynth()).then((m) => playOn(c, m, kind, false, audition && level <= 0 ? UI_AUDIO.defaultLevel : level)).catch(() => undefined);
}

// ---------------------------------------------------------------- dünya seslerini çalma

const worldLast = new Map<string, number>();
let worldPlayer: ((kind: WorldSoundKind, gainMul: number) => void) | null = null;

/** Dünya sesinin toplam kazancı (saf): master x Master Volume x (UI sounds seviyesi | Sound Effects oranı) x gainMul. */
export function worldGain(bus: 'ui' | 'sfx', uiLevel: number, volume: number, sfx: number, gainMul = 1): number {
  return WORLD_AUDIO.master * volume * (bus === 'ui' ? stepFraction(uiLevel) : sfx) * gainMul;
}

function playWorldOn(c: AudioContext, m: AudioModule, kind: WorldSoundKind, vary: boolean, gainMul: number, uiLvl = level): void {
  const def = WORLD_SFX[kind];
  if (!def || !m.audioSettings.enabled) return;
  const g = worldGain(def.bus, uiLvl, m.audioSettings.volume, m.audioSettings.sfx, gainMul);
  if (g <= 0) return;
  if (c.state !== 'running') void c.resume();
  const out = c.createGain();
  out.gain.value = g;
  out.connect(c.destination);
  m.synthSfx(c, out, vary ? varySfx(def, Math.random) : def);
}

/** Dünya / anlatı olayı: ilk kullanıcı hareketinden sonra, seyreltmeden geçerse çalar (`gainMul`: ör. item kaldırma = 0.6). Hata oyunu durdurmaz. */
export function worldSound(kind: WorldSoundKind, gainMul = 1): void {
  try {
    if (worldPlayer) return worldPlayer(kind, gainMul);
    if (!unlocked || !ctx || !synth) return;
    const now = performance.now();
    const gap = WORLD_AUDIO.throttleMs[kind] ?? WORLD_AUDIO.throttleMs.default;
    if (now - (worldLast.get(kind) ?? -Infinity) < gap) return;
    worldLast.set(kind, now);
    playWorldOn(ctx, synth, kind, true, gainMul);
  } catch {
    /* ses hatası oyunu bozmasın */
  }
}

/** Codex deneme çalışı: seyreltme/sapma yok; UI sesleri kapalı (0) olsa da varsayılan seviyede dinletir. */
export function previewWorldSound(kind: WorldSoundKind, on?: AudioContext): void {
  onGesture();
  const c = on ?? ctx;
  if (!c) return;
  void (synth ? Promise.resolve(synth) : loadSynth()).then((m) => playWorldOn(c, m, kind, false, 1, level <= 0 ? UI_AUDIO.defaultLevel : level)).catch(() => undefined);
}

/** Dünya sesi çalıcısını değiştirir (null = yerleşik sentez; test için). */
export function setWorldSoundPlayer(fn: ((kind: WorldSoundKind, gainMul: number) => void) | null): void {
  worldPlayer = fn;
}

/** Çalıcıyı değiştirir (null = yerleşik sentez). Test ya da özel kullanım için. */
export function setUiSoundPlayer(fn: ((kind: UiSoundKind) => void) | null): void {
  player = fn;
}
