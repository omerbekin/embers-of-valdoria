// Tek kişilik sefer başlangıcı (saf; Ömer 2026-11-01, docs/design/tutorial.md > Yeni sefer başlangıcı). Yalnız kayıtta `soloStart` olan seferler:
// ilk kahramanın ilk üç savaştaki skill kilitleri ve Ashford - King's Bridge arası düşman çarpanları. Sayılar data/campaign/campaign.json > soloStart.
import { classes } from '../engine/content';
import { CONFIG } from './data';
import type { CampaignState, Hero, UnitMods } from './types';

type SoloState = Pick<CampaignState, 'soloStart' | 'mapId' | 'done'>;

/** Bu seferde bu düğümde lider için skill durumu. */
export interface SoloSkillStage {
  /** Savaş başında kilitli skill'ler. */
  locked: string[];
  /** Bu savaşın başında yeni açılan skill'ler (Garrick'in cümlesi). */
  fresh: string[];
  /** Dalga başında açılacaklar (dalga 0 tabanlı). */
  onWave?: { wave: number; skills: string[] };
}

/** Sınıfın açılış sırası: veride yoksa sınıfın kendi sırası (yalnız sınıfın gerçek skill'leri). */
export function soloSkillOrder(classId: string): string[] {
  const own = classes[classId]?.skills ?? [];
  const order = CONFIG.soloStart.skillOrder[classId];
  return order ? order.filter((id) => own.includes(id)) : [...own];
}

/**
 * Lider için bu düğümün skill aşaması; kilit yoksa null. Yalnız yeni seferde, ilk haritada, düğüm ilk kez kazanılana kadar (yenilip yeniden denemede
 * aynı, devriyede kilit yok). Yoldaşların tüm skill'leri açıktır.
 */
export function soloSkillStage(s: SoloState, hero: Pick<Hero, 'class' | 'leader'>, nodeId: string): SoloSkillStage | null {
  if (!s.soloStart || !hero.leader || s.mapId !== CONFIG.maps[0] || s.done.includes(`${nodeId}:battle`)) return null;
  const stages = CONFIG.soloStart.stages;
  const stage = stages[nodeId];
  if (!stage) return null;
  const order = soloSkillOrder(hero.class);
  const keys = Object.keys(stages);
  const prev = stages[keys[keys.indexOf(nodeId) - 1] ?? ''];
  const prevOpen = prev ? (prev.wave?.open ?? prev.open) : stage.open;
  const out: SoloSkillStage = { locked: order.slice(stage.open), fresh: order.slice(prevOpen, stage.open) };
  if (stage.wave) out.onWave = { wave: stage.wave.index, skills: order.slice(stage.open, stage.wave.open) };
  return out;
}

/**
 * Liderin kilitli skill'lerinin açılış yeri, HUD ipucu için (Ömer 2026-11-01): skill id -> kısa metin. Veriden türer (soloStart.stages sırası):
 * skill'i açan ilk sonraki düğüm; açılmadan önce bu savaşın dalgasında açılıyorsa "Unlocks in wave N" (dalga 1 tabanlı). Kilit yoksa boş.
 * `nameOf`: düğüm id -> oyuncunun gördüğü ad.
 */
export function soloUnlockHints(s: SoloState, hero: Pick<Hero, 'class' | 'leader'>, nodeId: string, nameOf: (nodeId: string) => string): Record<string, string> {
  const stage = soloSkillStage(s, hero, nodeId);
  if (!stage) return {};
  const order = soloSkillOrder(hero.class);
  const stages = CONFIG.soloStart.stages;
  const keys = Object.keys(stages);
  const out: Record<string, string> = {};
  for (const id of stage.locked) {
    if (stage.onWave?.skills.includes(id)) {
      out[id] = `Unlocks in wave ${stage.onWave.wave + 1}`;
      continue;
    }
    const idx = order.indexOf(id);
    const next = keys.slice(keys.indexOf(nodeId) + 1).find((k) => (stages[k]!.wave?.open ?? stages[k]!.open) > idx);
    if (next) out[id] = `Unlocks at ${nameOf(next)}`;
  }
  return out;
}

/** Düğümün yeni sefer çarpanı (takım boyu + Harita 1 eğrisi; yalnız yeni sefer, ilk harita); yoksa undefined. */
export function soloEnemyScale(s: Pick<CampaignState, 'soloStart' | 'mapId'>, nodeId: string): UnitMods | undefined {
  if (!s.soloStart || s.mapId !== CONFIG.maps[0]) return undefined;
  const scale = CONFIG.soloStart.enemyScale;
  const group = scale.nodes[nodeId];
  return group ? scale.groups[group] : undefined;
}

/** Düğümün harita eğrisi çarpanı (Ömer 2026-11-01; kayıt türünden bağımsız: Harita 2 eski ve yeni kayıtta aynı yapıda); yoksa undefined. Sayılar data/campaign/campaign.json > mapEnemyScale. */
export function mapEnemyScale(mapId: string, nodeId: string): UnitMods | undefined {
  const scale = CONFIG.mapEnemyScale[mapId];
  const group = scale?.nodes[nodeId];
  return group ? scale!.groups[group] : undefined;
}
