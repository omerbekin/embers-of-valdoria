// Malzeme kullanımı (Ömer 2026-11-07): savaş dışı, seçili kahramana. Kural saf; arayüz (Gear) yalnızca çağırır.
import { woundCount } from '../progression/wounds';
import { supplyCount, supplyDef } from './supplies';
import { heroById, isFallen, pausedLock } from './state';
import type { CampaignState } from './types';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/** Bu malzeme bu kahramana kullanılabilir mi? Değilse nedeni (arayüz bildirimi). */
export function supplyBlocked(s: CampaignState, id: string, heroId: string): string | null {
  const d = supplyDef(id);
  if (!d) return 'Unknown supply';
  if (supplyCount(s, id) <= 0) return `You have no ${d.name}`;
  const lock = pausedLock(s);
  if (lock) return lock;
  const h = heroById(s, heroId);
  if (!h) return 'No such hero';
  if (d.revive !== undefined) return isFallen(h) ? null : 'This hero has not fallen';
  if (isFallen(h)) return 'A fallen hero must be revived first';
  const hurt = d.heal !== undefined && h.hpRatio < 1;
  const wounded = !!d.cureWound && woundCount(h) > 0;
  if (!hurt && !wounded) return d.heal !== undefined && d.cureWound ? 'Already at full health and no wounds' : d.heal !== undefined ? 'Already at full health' : 'This hero has no wounds';
  return null;
}

/** Malzemeyi kahramana kullanır (bir adet düşer). Engel varsa Error. */
export function useSupply(s: CampaignState, id: string, heroId: string): CampaignState {
  const why = supplyBlocked(s, id, heroId);
  if (why) throw new Error(why);
  const d = supplyDef(id)!;
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  const h = heroById(t, heroId)!;
  const left = supplyCount(t, id) - 1;
  const rest = { ...(t.supplies ?? {}) };
  if (left > 0) rest[id] = left;
  else delete rest[id];
  if (Object.keys(rest).length) t.supplies = rest;
  else delete t.supplies;
  if (d.revive !== undefined) {
    h.alive = true;
    h.hpRatio = r3(clamp01(d.revive)); // yara silmez: yaralar kalır
    return t;
  }
  if (d.heal !== undefined) h.hpRatio = r3(clamp01(h.hpRatio + d.heal));
  if (d.cureWound && woundCount(h) > 0) {
    const w = woundCount(h) - 1;
    if (w > 0) h.wounds = w;
    else delete h.wounds;
  }
  return t;
}
