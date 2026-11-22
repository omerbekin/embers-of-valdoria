// Harita sonu ve oyun sonu (saf; Phaser / DOM yok). Ömer 2026-11-21 form r38-r39:
// - Harita sonu istatistik kartı her haritanın sonunda (Harita 1, 2, 3): kartın verisi burada (mapEndSummary), görünüm src/ui/map-end.ts,
//   bağlantı CampaignMapScene > mapEndCard. Sayılar Harita 1'deki gibi `s.stats` (harita geçişinde taşınır = SEFER TOPLAMI).
// - Harita 3 bitiş olayı Mend or Quench: seçim kayıtta (`crownChoice`, kayıt sürümü 15); kapanış sineması bu seçimle dallanır
//   (cinematics.json > first_fire_mend / first_fire_quench, tetik `mapComplete`). Başka mekanik etkisi yok.
import { classes } from '../engine/content';
import { RARITY_IDS, instanceRarity, itemDef, type ItemInstance } from '../progression/items';
import { CONFIG, EVENTS, MAPS, getMap } from './data';
import { mapOnlyStats, playTimeText } from './ledger';
import { activeHeroes, dayOf } from './state';
import type { CampaignState, CrownChoice } from './types';

const CHOICES: readonly CrownChoice[] = ['mend', 'quench'];

/** Haritadaki Mend or Quench düğümü + seçimi kayda yazan seçenekleri (veri sırasıyla). Yoksa null. */
export function crownChoiceEvent(mapId: string): { node: string; choices: Array<{ id: string; crownChoice: CrownChoice }> } | null {
  const map = MAPS[mapId];
  for (const n of map?.nodes ?? []) {
    if (!n.event) continue;
    const choices = (EVENTS[n.event]?.choices ?? []).filter((c): c is typeof c & { crownChoice: CrownChoice } => !!c.crownChoice && CHOICES.includes(c.crownChoice));
    if (choices.length) return { node: n.id, choices: choices.map((c) => ({ id: c.id, crownChoice: c.crownChoice })) };
  }
  return null;
}

/**
 * Kayıt okuması (sürüm 15; her okumada, idempotent; yerinde): bozuk `crownChoice` atılır. Seçimi olmayan kayıtta bitiş olayı BİTMİŞSE seçim
 * `eventChoice`tan kurtarılır (son düğüm: yürüyüş olmadığı için seçim orada kalır), kurtarılamazsa olayın veri sırasındaki ilk seçeneği (mend).
 * Olay bitmemişse alan yazılmaz (oyuncu seçer).
 */
export function upgradeCrownChoice(s: CampaignState): void {
  if (s.crownChoice !== undefined && !CHOICES.includes(s.crownChoice)) delete (s as { crownChoice?: unknown }).crownChoice;
  if (s.crownChoice) return;
  for (const mapId of [s.mapId, ...(Array.isArray(s.mapsDone) ? s.mapsDone : [])]) {
    const ev = crownChoiceEvent(mapId);
    if (!ev || !Array.isArray(s.done) || !s.done.includes(`${ev.node}:event`)) continue;
    const picked = s.eventChoice?.node === ev.node ? ev.choices.find((c) => c.id === s.eventChoice!.choice) : undefined;
    s.crownChoice = (picked ?? ev.choices[0]!).crownChoice;
    return;
  }
}

export interface MapEndSummary {
  title: string;
  subtitle: string;
  /** Hikâye satırı (boş = az önce sinemanın kapanış kartı aynı cümleyi gösterdi). */
  story: string;
  /** Yalnız bu haritanın sayıları (Ömer 2026-11-21: "o harita + altında toplam"). */
  stats: Array<{ label: string; value: string }>;
  /** Küçük yazıyla sefer toplamı ("Campaign total" satırı). */
  total: string;
  heroes: Array<{ cls: string; name: string; level: number }>;
  /** En iyi 3 item: kadronun taktığı + torbadaki, nadirliğe göre (sonra ilvl). `who` = takan sınıfın adı, torbadaysa ''. */
  loot: Array<{ item: ItemInstance; who: string }>;
}

/**
 * Harita sonu kartının verisi. Başlık / alt başlık / hikâye haritanın `complete` alanından (yoksa Harita 1: "Valdoria Conquered" + texts.complete);
 * sıradaki harita açıksa alt başlık "Map Complete". Sayılar YALNIZ oyunun tuttukları: üstte yalnız BU haritanın sayıları (`mapOnlyStats`: sefer toplamı - `s.mapStart`), altta küçük yazıyla sefer toplamı (`total`). `storyShown`: sinemanın kapanış kartı hikâye cümlesini az önce gösterdi (tekrar edilmez).
 */
export function mapEndSummary(s: CampaignState, nextMapId: string | null, storyShown = false): MapEndSummary {
  const end = getMap(s.mapId).complete;
  const m = mapOnlyStats(s);
  const team = activeHeroes(s);
  const nameOf = (cls: string): string => classes[cls]?.name ?? cls;
  const owned = [
    ...team.flatMap((h) => Object.values(h.equipment).filter((i): i is ItemInstance => !!i).map((item) => ({ item, who: nameOf(h.class) }))),
    ...s.inventory.map((item) => ({ item, who: '' })),
  ].filter((x) => itemDef(x.item.id));
  const rank = (x: (typeof owned)[number]): number => RARITY_IDS.indexOf(instanceRarity(x.item)) * 1000 + (x.item.rolls?.ilvl ?? itemDef(x.item.id)!.ilvl ?? 0);
  return {
    title: end?.title ?? 'Valdoria Conquered',
    subtitle: nextMapId ? 'Map Complete' : (end?.subtitle ?? 'Campaign Complete'),
    story: storyShown ? '' : (end?.text ?? CONFIG.texts.complete ?? ''),
    stats: [
      { label: 'Battles won', value: String(m.victories) },
      { label: 'Defeats', value: String(m.defeats) },
      { label: 'Days', value: String(m.days) },
      { label: 'Gold on hand', value: s.gold.toLocaleString('en-US') },
      // Sefer defteri (Ömer 2026-11-07 endstats; eski kayıtta 0'dan sayılır)
      { label: 'Gold earned', value: m.goldEarned.toLocaleString('en-US') },
      { label: 'Play time', value: playTimeText(m.playMs) },
      { label: 'Heroes fallen', value: String(m.fallen) },
    ],
    total: `${s.stats.victories} won · ${s.stats.defeats} defeats · ${dayOf(s)} days · ${(s.stats.goldEarned ?? 0).toLocaleString('en-US')} gold earned · ${playTimeText(s.stats.playMs)} · ${s.stats.fallen ?? 0} fallen`,
    heroes: team.map((h) => ({ cls: h.class, name: nameOf(h.class), level: h.level })),
    loot: owned.sort((a, b) => rank(b) - rank(a)).slice(0, 3),
  };
}
