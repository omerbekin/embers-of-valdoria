// Sefer hikâye sinematikleri (saf; Phaser / DOM yok). Veri: data/campaign/cinematics.json (metinler orada; not docs/design/campaign/cinematics.md).
// Tetik kuralı ve "görüldü" bilgisi burada; oynatıcı (görünüm) src/ui/cinematic.ts, bağlantı CampaignMapScene (advance / launchBattle).
// Görüldü bilgisi kayıt şemasını değiştirmez: mevcut `done` listesine `cinematic:<id>` yazılır (kasaba hikâyesinin `<düğüm>:story` kalıbı).
import cinematicsJson from '../../data/campaign/cinematics.json';
import { classes, encounterUnit } from '../engine/content';
import { findNode } from './graph';
import { isDone, mapOf, nextStep, nodeCleared } from './state';
import type { CampaignMap, CampaignState } from './types';

/** Satır: `speaker` = narrator | leader | konuşan anahtarı (`_speakers`) | boss / mob id. */
export interface CinematicLine {
  speaker: string;
  text: string;
}
export interface CinematicScene {
  /** Arka plan anahtarı: assets/cinematics/<bg>.webp, yoksa assets/backgrounds/<bg>.webp, yoksa `_fallback` zinciri. */
  bg: string;
  lines: CinematicLine[];
}
export type CinematicTrigger =
  | { on: 'campaignStart' }
  | { on: 'victory'; node: string }
  | { on: 'firstArrival'; node: string }
  | { on: 'beforeBattle'; node: string };
export interface CinematicDef {
  trigger: CinematicTrigger;
  scenes: CinematicScene[];
  /** Son kapanış kartı (morvane_falls: campaign.json > texts.complete ile aynı metin). */
  endCard?: string;
}
export interface CinematicSpeaker {
  name: string;
  portrait: string;
}

type Raw = Record<string, unknown>;
const raw = cinematicsJson as unknown as Raw;
const strip = (o: unknown): Record<string, string> =>
  Object.fromEntries(Object.entries((o ?? {}) as Record<string, unknown>).filter(([k, v]) => !k.startsWith('_') && typeof v === 'string')) as Record<string, string>;

/** Sinematikler (veri sırasıyla; `_` ile başlayan anahtarlar not / tablo). */
export const CINEMATICS: Record<string, CinematicDef> = Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith('_'))) as Record<string, CinematicDef>;
/** Eksik görsel yedekleri (anahtar -> anahtar). */
export const CINEMATIC_FALLBACK: Record<string, string> = strip(raw['_fallback']);
/** Sabit konuşanlar (merchant = Odo). */
export const CINEMATIC_SPEAKERS: Record<string, CinematicSpeaker> = Object.fromEntries(
  Object.entries((raw['_speakers'] ?? {}) as Record<string, unknown>).filter(([k]) => !k.startsWith('_')),
) as Record<string, CinematicSpeaker>;

export const CINEMATIC_IDS = Object.keys(CINEMATICS);

const seenKey = (id: string): string => `cinematic:${id}`;

/** Bu seferde oynadı mı? */
export const cinematicSeen = (s: Pick<CampaignState, 'done'>, id: string): boolean => s.done.includes(seenKey(id));

/** Görüldü işaretli YENİ durum (zaten işaretliyse aynı içerik). */
export function markCinematicSeen(s: CampaignState, id: string): CampaignState {
  if (cinematicSeen(s, id)) return s;
  return { ...s, done: [...s.done, seenKey(id)] };
}

/**
 * Yenilgide son kayda dönülürken görülen sinematikler taşınır (ör. Morvane karşılaşması savaştan hemen önce oynar, yenilip kayıttan dönülünce
 * yeniden oynamaz). `to` yerinde güncellenir (loadLastSave'in kopyası).
 */
export function carryCinematics(from: Pick<CampaignState, 'done'>, to: Pick<CampaignState, 'done'>): void {
  for (const d of from.done) if (d.startsWith('cinematic:') && !to.done.includes(d)) to.done.push(d);
}

const onMap = (map: CampaignMap, nodeId: string): boolean => !!findNode(map, nodeId);

/**
 * Şu an oynaması gereken sinematik (yoksa null). `when`:
 * - 'map': harita bir sonraki adımı kurarken (CampaignMapScene.advance). campaignStart = kahraman seçimi beklerken (sefer başı, ilk savaştan
 *   önce); victory = düğümde duruluyor ve düğümün savaşı kazanılmış (ganimet ekranından sonra, haritaya dönüşte); firstArrival = düğümde
 *   duruluyor ve düğümün adımları henüz bitmemiş (ör. Forward Camp: tüccar açılmadan önce).
 * - 'beforeBattle': bulunulan düğümün savaşı başlamak üzere (devriye ve duraklatılmış savaşın sürdürülmesi hariç).
 * Her sinematik seferde bir kez (görüldü işareti `done` listesinde).
 */
export function dueCinematic(s: CampaignState, when: 'map' | 'beforeBattle'): string | null {
  const map = mapOf(s);
  for (const id of CINEMATIC_IDS) {
    if (cinematicSeen(s, id)) continue;
    const t = CINEMATICS[id]!.trigger;
    if (when === 'beforeBattle') {
      if (t.on !== 'beforeBattle' || t.node !== s.at || !onMap(map, t.node)) continue;
      if (s.patrol || s.suspended || nextStep(s).kind !== 'battle') continue;
      return id;
    }
    if (t.on === 'campaignStart') {
      if (nextStep(s).kind === 'hero') return id;
    } else if (t.on === 'victory') {
      if (t.node === s.at && onMap(map, t.node) && isDone(s, t.node, 'battle')) return id;
    } else if (t.on === 'firstArrival') {
      if (t.node === s.at && onMap(map, t.node) && !nodeCleared(s, t.node)) return id;
    }
  }
  return null;
}

/** Sinematik başlığı: tetik düğümünün adı (King's Bridge...), düğümsüzse haritanın adı. */
export function cinematicTitle(id: string, map: CampaignMap): string {
  const t = CINEMATICS[id]?.trigger;
  const n = t && 'node' in t ? findNode(map, t.node) : undefined;
  return n?.name ?? map.title;
}

/** Toplam satır sayısı (ilerleme elmasları). */
export const cinematicLineCount = (def: CinematicDef): number => def.scenes.reduce((a, sc) => a + sc.lines.length, 0);

export type CinematicFolder = 'cinematics' | 'backgrounds';
/**
 * Arka plan görseli: önce assets/cinematics/<bg>, sonra assets/backgrounds/<bg>; ikisi de yoksa `_fallback` yedeğiyle aynı arama (zincir,
 * döngü korumalı). Hiçbiri yoksa null (oynatıcı koyu zemin çizer, çökmez).
 */
export function resolveCinematicBg(
  bg: string,
  has: (folder: CinematicFolder, id: string) => boolean,
  fallback: Record<string, string> = CINEMATIC_FALLBACK,
): { folder: CinematicFolder; id: string } | null {
  const seen = new Set<string>();
  let cur: string | undefined = bg;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    if (has('cinematics', cur)) return { folder: 'cinematics', id: cur };
    if (has('backgrounds', cur)) return { folder: 'backgrounds', id: cur };
    cur = fallback[cur];
  }
  return null;
}

/**
 * Satırın konuşanı (görünen ad + portre anahtarı; portre yoksa null). Kural (Ömer 2026-10-23): kişiler yalnızca küçük çerçeveli portreyle
 * görünür (savaş sprite'ı büyütülmez). narrator = adsız, portresiz; leader = bölük liderinin SINIF adı ve sınıf avatarı; `_speakers`
 * tablosundakiler (merchant = Odo); diğerleri boss / mob id'si (oyun verisindeki adı ve avatarı). Tanınmayan anahtar: adı olduğu gibi, portresiz.
 */
export function cinematicSpeaker(speaker: string, leaderClass?: string): { name: string; portrait: string | null } {
  if (speaker === 'narrator') return { name: '', portrait: null };
  if (speaker === 'leader') {
    const def = leaderClass ? classes[leaderClass] : undefined;
    return { name: def?.name ?? 'Leader', portrait: def ? def.spriteId : null };
  }
  const fixed = CINEMATIC_SPEAKERS[speaker];
  if (fixed) return { name: fixed.name, portrait: fixed.portrait };
  const unit = encounterUnit(speaker);
  if (unit) return { name: unit.name, portrait: unit.spriteId };
  return { name: speaker, portrait: null };
}
