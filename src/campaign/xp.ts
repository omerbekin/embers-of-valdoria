// Seferde level / XP (saf; Ömer 2026-10-17, docs/design/progression/levels.md). Kurallar src/progression/levels.ts; burası sefer durumuna yazar.
import { summons } from '../engine/content';
import { ENCOUNTERS, getMap } from './data';
import { node } from './graph';
import { nodeLevel } from './power';
import { LEVELS, addXp, allocate, autoAllocate, nodeXpMult, setLevel, splitXp, type KillRecord, type LevelUp, type StatAlloc } from '../progression/levels';
import type { BattleOutcome, CampaignState, Hero } from './types';

const clone = (s: CampaignState): CampaignState => JSON.parse(JSON.stringify(s)) as CampaignState;
const fallen = (h: Hero): boolean => !h.alive || h.hpRatio <= 0;

/** Karşılaşmanın öldürülecek düşman sayısı (hazır çağrılar hariç; öldürme kaydı olmayan sonuç için). */
export function encounterEnemyCount(encounterId: string): number {
  return (ENCOUNTERS[encounterId]?.units ?? []).filter((u) => !summons[u.class]).length;
}

/**
 * Kazanılan XP'yi kahramanlara yazar (durumu YERİNDE değiştirir; çağıran klonlamış olmalı). Level atlayan kahraman tam iyileşir (yalnızca
 * ayaktaysa; düşmüş kahraman level atlasa da ceset kalır, VARSAYIM madde 335) ve `levelUps`'a eklenir. Dönen: kahraman başına XP.
 */
export function applyXp(t: CampaignState, gains: Record<string, number>): LevelUp[] {
  const ups: LevelUp[] = [];
  for (const [id, xp] of Object.entries(gains)) {
    const h = t.roster.find((x) => x.id === id);
    if (!h || xp <= 0) continue;
    const up = addXp(h, xp);
    if (!up) continue;
    if (!fallen(h)) h.hpRatio = 1; // level atlayınca tam iyileşme (levels.md)
    ups.push(up);
  }
  if (ups.length) {
    const prev = t.levelUps ?? [];
    // aynı kahramanın birikmiş kaydı birleşir (ilk "from", son "to")
    for (const u of ups) {
      const p = prev.find((x) => x.heroId === u.heroId);
      if (p) p.to = u.to;
      else prev.push({ ...u });
    }
    t.levelUps = prev;
  }
  return ups;
}

/** Savaş XP'si (zafer): savaşa giren kahramanlar (sonuçtaki birimler), öldürme kaydı (yoksa tüm düşmanlar, kimse düşmeden). */
export function battleXp(t: CampaignState, outcome: BattleOutcome, encounterId: string): Record<string, number> {
  const heroes = outcome.units.map((u) => t.roster.find((h) => h.id === u.heroId)).filter((h): h is Hero => !!h);
  const kills: KillRecord[] = outcome.kills ?? Array.from({ length: encounterEnemyCount(encounterId) }, () => ({ down: [] }));
  const n = node(getMap(t.mapId), t.at);
  return splitXp({ heroes: heroes.map((h) => ({ id: h.id, level: h.level })), nodeLevel: nodeLevel(t.mapId, t.at), mult: nodeXpMult(n.type), kills });
}

/** Savaşsız olay / hazine düğümünün sabit XP'si: fixedEnemies düşmanlık XP x düğüm çarpanı (0,5), aktif takıma bölünür (düşmüşler fallenShare). */
export function fixedXp(t: CampaignState, heroes: Hero[]): Record<string, number> {
  const n = node(getMap(t.mapId), t.at);
  const down = heroes.filter(fallen).map((h) => h.id);
  const kills = Array.from({ length: LEVELS.fixedEnemies }, () => ({ down }));
  return splitXp({ heroes: heroes.map((h) => ({ id: h.id, level: h.level })), nodeLevel: nodeLevel(t.mapId, t.at), mult: nodeXpMult(n.type), kills });
}

/** Bulunulan düğüm savaşsız olay / hazine mi (sabit XP verir)? Savaşlı düğümde XP savaştan gelir (çift sayılmaz). */
export const fixedXpNode = (t: CampaignState): boolean => {
  const n = node(getMap(t.mapId), t.at);
  return (n.type === 'event' || n.type === 'treasure') && !n.encounter;
};

/** "Level Up" kartı görüldü: bekleyen kayıtlar silinir. */
export function acknowledgeLevelUps(s: CampaignState): CampaignState {
  if (!s.levelUps) return s;
  const t = clone(s);
  delete t.levelUps;
  return t;
}

/** Stat puanı dağıt (Gear > Character): geçersizse Error (puan yetmiyor / temel stat kuralı). Düşmüş kahraman da harcayabilir (Ömer 2026-10-18). */
export function allocateStats(s: CampaignState, heroId: string, add: StatAlloc): CampaignState {
  const t = clone(s);
  const h = t.roster.find((x) => x.id === heroId);
  if (!h) throw new Error('Unknown hero');
  allocate(h, add);
  return t;
}

/** Oyuncu vekili (sim / otomatik): herkesin puanları ana stata (kural izin verdikçe). */
export function autoAllocateAll(s: CampaignState): CampaignState {
  if (!s.roster.some((h) => (h.statPoints ?? 0) > 0)) return s;
  const t = clone(s);
  for (const h of t.roster) autoAllocate(h);
  return t;
}

/** Debug: XP ver (heroId yoksa aktif takım / tüm kadro). */
export function debugGrantXp(s: CampaignState, amount: number, heroId?: string): CampaignState {
  const t = clone(s);
  const ids = heroId ? [heroId] : (t.active.filter(Boolean).length ? t.active.filter(Boolean) : t.roster.map((h) => h.id));
  applyXp(t, Object.fromEntries(ids.map((id) => [id, amount])));
  return t;
}

/** Debug: level'ı ayarla (dağıtılmış puanlar sıfırlanır, puanlar level'a göre yeniden verilir). heroId yoksa tüm kadro. */
export function debugSetLevel(s: CampaignState, level: number, heroId?: string): CampaignState {
  const t = clone(s);
  for (const h of t.roster) if (!heroId || h.id === heroId) setLevel(h, level);
  return t;
}
