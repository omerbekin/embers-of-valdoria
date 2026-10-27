// Ana menü müziği denetimi (hafif; menü parçasında). Beste ve ses motoru ayrı parçada: src/game/music.ts (ilk gerektiğinde dynamic import).
// Kurallar (Ömer 2026-10-10): ana menüde çalar; ilk kullanıcı hareketinden (tık/dokunma/tuş) önce ses YOK (tarayıcı autoplay kuralı), sonra
// yavaşça yükselir; menüden savaşa / sefere / Endless'a çıkarken söner, menüye dönünce kaldığı yerden (bir sonraki ölçü başından) yükselir;
// sekme gizlenince durur (bağlam askıya alınır). Seviye = Settings > Music (0-20 adım = %0-100, 0 = tamamen kapalı: motor ve düğümler
// bırakılır) x Settings > Master Volume x data/audio-music.json > master. Müzik yükleme ekranında başlamaz (Ömer 2026-10-17):
// menuMusic(true) ana menü görününce (MainMenuScene.create) çağrılır; yükleme ekranındaki tık yine sesi açar (onGesture). Hata oyunu durdurmaz.
// Sahne müzikleri (2026-10-13): aynı denetim sahne parçalarını da çalar (data/audio-music-tracks.json): harita, kasaba, savaş, boss savaşı, Endless
// kampı. Her sahne create'inde `sceneMusic(parça)` der; parça değişince eski motor crossfadeMs içinde söner, yenisi aynı sürede yükselir
// (yumuşak geçiş; geçiş anında en çok iki motor). Her parçanın konumu ayrı saklanır (dönünce bir sonraki ölçü başından). Codex önizlemesi
// `previewMusic(parça)` sahneninkini geçici olarak bastırır.
import musicData from '../../data/audio-music.json';
import { crossfadeMs } from '../../data/audio-music-tracks.json';
import bossMap from '../../data/audio-music-boss-map.json';
import { VOLUME_DEFAULTS, clampStep, readStepLevel, stepFraction, stepRecord } from './volume-steps';

type MusicModule = typeof import('../game/music');
type Engine = InstanceType<MusicModule['MusicEngine']>;

const KEY = 'eov.music.v1';
export const DEFAULT_MUSIC_LEVEL: number = musicData.defaultLevel;
const FADE_OUT = musicData.fadeOutMs / 1000;
const XFADE = crossfadeMs / 1000;

export type MusicTrack = 'menu' | 'map' | 'town' | 'battle' | 'boss' | 'camp' | 'boss_warden' | 'boss_priest' | 'boss_morvane' | 'boss_morvane2' | 'boss_morvane3' | 'boss_wyrm' | 'boss_vane' | 'boss_queen' | 'boss_queen2' | 'boss_queen3' | 'map_reach' | 'town_reach' | 'battle_reach' | 'boss_wyrm2' | 'boss_wyrm3' | 'boss_vane2' | 'boss_vane3';

interface BossMapEntry {
  track: MusicTrack;
  anyTier?: boolean;
  phases?: Record<string, MusicTrack>;
}
const BOSS_BY_DEF = bossMap.byDef as unknown as Record<string, BossMapEntry>;

/** Haritanın kendi sahne parçaları (data/campaign/<harita>.json > music; Harita 2 = map_reach / town_reach / battle_reach, content-designer 2026-10-27); tanımsızsa ortak map / town / battle. */
export type SceneMusicKind = 'map' | 'town' | 'battle';
export function mapSceneTrack(music: Partial<Record<SceneMusicKind, string>> | undefined, kind: SceneMusicKind): MusicTrack {
  return (music?.[kind] as MusicTrack | undefined) ?? kind;
}

/** Savaş müziği seçimi (saf): sahadaki düşmanlardan boss varsa onun parçası, yoksa `normal` (varsayılan 'battle'; sefer haritanın kendi savaş parçasını verir). Boss = rütbesi boss / boss tanımlı / haritada anyTier. */
export function battleTrack(enemies: ReadonlyArray<{ defId: string; tier?: string; boss?: unknown; phase?: number }>, normal: MusicTrack = 'battle'): MusicTrack {
  let generic = false;
  for (const e of enemies) {
    const m = BOSS_BY_DEF[e.defId];
    const isBoss = e.tier === 'boss' || e.boss !== undefined;
    if (m && (isBoss || m.anyTier)) return (m.phases?.[String(e.phase ?? 1)] ?? m.track);
    if (isBoss) generic = true;
  }
  return generic ? (bossMap.fallback as MusicTrack) : normal;
}

/** Boss yeni faza girdi: o fazın parçası (haritada tanımlıysa), yoksa null (müzik değişmez). */
export function phaseTrack(defId: string, phase: number): MusicTrack | null {
  return BOSS_BY_DEF[defId]?.phases?.[String(phase)] ?? null;
}
/** İleriye bakan zamanlayıcı: her PUMP_MS'de LOOKAHEAD sn ilerisi zamanlanır. */
const PUMP_MS = 200;
const LOOKAHEAD = 0.9;

/** Kayıtlı müzik seviyesi 0..20 adım (kayıt yoksa varsayılan %60; eski 0-10 kayıtlar x2 göçer). */
export function loadMusicLevel(): number {
  try {
    return readStepLevel(globalThis.localStorage?.getItem(KEY), 'level', DEFAULT_MUSIC_LEVEL);
  } catch {
    return DEFAULT_MUSIC_LEVEL;
  }
}

let level = loadMusicLevel();
/** Ana ses seviyesi 0..20 adım (Settings > Master Volume; src/ui/settings.ts bildirir). */
let master: number = VOLUME_DEFAULTS.master;
/** Sahnenin istediği parça (null = sessiz). */
let wanted: MusicTrack | null = null;
/** Codex önizlemesi: varsa sahnenin parçasının yerine çalar. */
let preview: MusicTrack | null = null;
/** Çalan motorun parçası. */
let engineTrack: MusicTrack | null = null;
const positions = new Map<MusicTrack, number>();
let unlocked = false;
let ctx: AudioContext | null = null;
let mod: MusicModule | null = null;
let loading: Promise<MusicModule | null> | null = null;
let engine: Engine | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let suspendTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(level: number) => void>();

/** Müzik motorunun gerçek kazancı (0..1). Saf: seviye 0-20 x ana ses 0-20. */
export function musicGain(lvl: number, masterLevel: number): number {
  return stepFraction(lvl) * stepFraction(masterLevel);
}

export function musicLevel(): number {
  return level;
}

export function setMusicLevel(v: number): void {
  level = clampStep(v);
  try {
    globalThis.localStorage?.setItem(KEY, stepRecord('level', level));
  } catch {
    /* saklama kapalı: yalnızca bu oturum */
  }
  for (const fn of listeners) fn(level);
  update();
}

/** Seviye değişince haber ver (kaldırma işlevi döner). */
export function onMusicLevelChange(fn: (level: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Settings > Master Volume değişti (0..20 adım): müzik de onunla çarpılır. */
export function setMusicMaster(v: number): void {
  master = clampStep(v);
  update();
}

/** Ana menü açıldı (true) / kapanıyor (false). Kapanış yalnızca menü parçası çalıyorsa susturur (sonraki sahne kendi parçasını seçmiş olabilir). */
export function menuMusic(on: boolean): void {
  if (on) sceneMusic('menu');
  else if (wanted === 'menu') sceneMusic(null);
}

/** Sahnenin müziği (null = sessiz; ör. savaş sonucu stingeri). Aynı parça yeniden istenirse bir şey değişmez. */
export function sceneMusic(track: MusicTrack | null): void {
  wanted = track;
  if (track && level > 0) void loadModule(); // motor ilk harekete hazır olsun (bekleme olmasın)
  update();
}

/** Codex > Sounds > Soundtracks önizlemesi (null = bitir, sahnenin parçasına dön). */
export function previewMusic(track: MusicTrack | null): void {
  preview = track;
  if (track) void loadModule();
  update();
}

export const musicPreviewing = (): MusicTrack | null => preview;

const hidden = (): boolean => typeof document !== 'undefined' && document.hidden;

function makeContext(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const g = globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const C = g.AudioContext ?? g.webkitAudioContext;
    ctx = C ? new C() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

const loadModule = (): Promise<MusicModule | null> =>
  (loading ??= import('../game/music')
    .then((m) => (mod = m))
    .catch(() => {
      loading = null; // ağ hatası: bir sonraki denemede yeniden
      return null;
    }));

function startPump(): void {
  if (timer) return;
  timer = setInterval(() => {
    if (!engine || !ctx || ctx.state !== 'running') return;
    try {
      engine.pump(ctx.currentTime + LOOKAHEAD);
    } catch {
      /* ses hatası menüyü bozmasın */
    }
  }, PUMP_MS);
}

function stopPump(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Durumu uygular: hangi parça çalmalı (önizleme > sahne), kilit açık mı, seviye > 0 mı? Parça değişince yumuşak geçiş. */
function update(): void {
  try {
    const gain = musicGain(level, master);
    const target = preview ?? wanted;
    const should = !!target && unlocked && gain > 0;
    let crossfade = false;
    if (engine && (!should || engineTrack !== target)) {
      // sön ve bırak; konum saklanır (dönünce kaldığı yerden). Başka parçaya geçiliyorsa crossfade süresinde
      crossfade = should;
      if (engineTrack) positions.set(engineTrack, engine.stop(crossfade ? XFADE : FADE_OUT));
      engine = null;
      engineTrack = null;
      if (!should) {
        stopPump();
        if (suspendTimer) clearTimeout(suspendTimer);
        suspendTimer = setTimeout(() => {
          if (!engine && ctx && ctx.state === 'running') void ctx.suspend().catch(() => undefined);
        }, (FADE_OUT + 0.4) * 1000);
        return;
      }
    }
    if (engine) {
      engine.setLevel(gain);
      return;
    }
    if (!should || !target) return;
    const c = makeContext();
    if (!c) return;
    if (!mod) {
      void loadModule().then((m) => m && update());
      return;
    }
    if (suspendTimer) clearTimeout(suspendTimer);
    suspendTimer = null;
    if (c.state !== 'running' && !hidden()) void c.resume().catch(() => undefined);
    const cfg = mod.trackConfig(target);
    const bar = mod.barSec(cfg);
    const from = Math.ceil((positions.get(target) ?? 0) / bar - 1e-6) * bar; // bir sonraki ölçü başından
    engine = new mod.MusicEngine(c, c.destination, gain, cfg);
    engineTrack = target;
    // ana menü ilk açılışta kısık başlayıp yavaşça yükselir; sahne parçaları kendi fadeIn'iyle (geçişte en az crossfade süresi)
    const fadeIn = Math.max(cfg.fadeInMs / 1000, crossfade ? XFADE : 0);
    engine.start(c.currentTime + 0.12, from, fadeIn, target === 'menu' ? (musicData.fadeInFrom ?? 0) : (cfg.fadeInFrom ?? 0));
    engine.pump(c.currentTime + LOOKAHEAD);
    startPump();
  } catch {
    /* ses hatası oyunu bozmasın */
  }
}

const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const;

/** Kullanıcı hareketi: bağlam kurulur/açılır (iOS yalnızca hareket içinde açar); ilk harekette müzik başlar. */
function onGesture(): void {
  const first = !unlocked;
  unlocked = true;
  const c = makeContext();
  if (c && c.state !== 'running' && !hidden() && (engine || ((preview ?? wanted) && level > 0))) void c.resume().catch(() => undefined);
  if (first) {
    void loadModule();
    update();
  }
}

function onVisibility(): void {
  if (!ctx) return;
  if (hidden()) void ctx.suspend().catch(() => undefined);
  else if (engine) void ctx.resume().catch(() => undefined);
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  for (const ev of GESTURES) window.addEventListener(ev, onGesture, { capture: true, passive: true });
  document.addEventListener('visibilitychange', onVisibility);
}

/** Durum (debug / tarayıcı denetimi). */
export function musicState(): { level: number; master: number; wanted: boolean; track: MusicTrack | null; preview: MusicTrack | null; playing: MusicTrack | null; unlocked: boolean; ctx: string; songPos: number } {
  return { level, master, wanted: !!wanted, track: wanted, preview, playing: engine ? engineTrack : null, unlocked, ctx: ctx?.state ?? 'none', songPos: engine ? engine.songPos() : wanted ? (positions.get(wanted) ?? 0) : 0 };
}
