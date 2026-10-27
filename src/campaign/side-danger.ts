/**
 * Yan karşılaşma uyarısı (Ömer 2026-10-27): yol dışındaki (cep, hazine, olay, görev, isteğe bağlı elit) bir savaş, o noktadaki ana yol savaşlarından
 * belirgin şekilde güçlüyse kart bunu söyler ("Stronger than the road ahead"). YENİ MEKANİK DEĞİL, yalnız bilgi. Kural veriden:
 * düşman gücü = her dalga için (dalganın toplam canı x toplam saldırı gücü), dalgalar toplanır (Lanchester tarzı kaba ölçü); can ve güç
 * savaşın gerçek kurulumundan (battlePlan: karşılaşma çarpanları, bölge / zorluk / rütbe ekleri, düşman level'ı) ve motorun stat formülünden
 * (applyUnitModifiers). Kıyas tabanı = başlangıçtan uzaklığı düğümünkine `window` adım yakın, isteğe bağlı olmayan "battle" düğümlerinin EN
 * GÜÇLÜSÜ. Oran >= ratio: uyarı; >= strongRatio: güçlü uyarı. Eşikler campaign.json > sideDanger. Saf: Phaser / DOM yok.
 */
import { applyUnitModifiers, content } from '../engine';
import { encounterUnit } from '../engine/content';
import type { UnitSetup } from '../engine/types';
import { CONFIG, getMap } from './data';
import { battlePlan } from './encounters';
import { isInertUnit } from './encounter-waves';
import { forwardDistances } from './graph';
import { isCleared, patrolAvailable } from './state';
import type { CampaignMap, CampaignState, MapNode } from './types';

export interface SideDangerCfg {
  ratio: number;
  strongRatio: number;
  window: number;
}
const cfg = (): SideDangerCfg => CONFIG.sideDanger;

/** Kaba düşman gücü: dalga başına (toplam can x toplam saldırı gücü), dalgalar toplanır. Nesneler (totem vb.) sayılmaz. */
export function planStrength(plan: { enemies: string[]; units: { enemies: Record<number, UnitSetup> }; waves?: Array<{ enemies: string[]; units: Record<number, UnitSetup> }> }): number {
  const waveOf = (cells: string[], units: Record<number, UnitSetup>): number => {
    let hp = 0;
    let pw = 0;
    cells.forEach((cls, slot) => {
      if (!cls || isInertUnit(cls)) return;
      const base = content.classes[cls] ?? encounterUnit(cls);
      if (!base) return;
      const d = applyUnitModifiers(base, units[slot]?.modifiers, content.formulas);
      const st = d.stats;
      const sc = content.formulas.scaling;
      const atk = Math.max(st.str * sc.str, st.int * sc.int, st.dex * sc.dex, st.luck * (sc.luck ?? 0));
      hp += st.hp;
      pw += atk * (st.spellPowerMult ?? 1) * (st.damageMult ?? 1);
    });
    return hp * pw;
  };
  let total = waveOf(plan.enemies, plan.units.enemies);
  for (const w of plan.waves ?? []) total += waveOf(w.enemies, w.units);
  return total;
}

/** Durumdan bağımsız kurulum: düğümde duruyormuş gibi, devriye / olay seçimi / arena yok (dalış: bulunulan düğümse durum korunur). */
function strengthAt(s: CampaignState, nodeId: string): number | null {
  try {
    const { patrol: _p, eventChoice: _e, pit: _q, ...rest } = s;
    const t: CampaignState = s.at === nodeId ? { ...s } : { ...rest, at: nodeId };
    return planStrength(battlePlan(t));
  } catch {
    return null;
  }
}

/** Ana yol savaşı: "battle" türü, isteğe bağlı değil, karşılaşması var. */
const isRoad = (n: MapNode): boolean => n.type === 'battle' && !n.optional && !!n.encounter;
/** Uyarının bakıldığı düğüm: ana yol savaşı, boss ve yol üstü elit DEĞİL (onlar zaten tür etiketiyle belli). */
export const isSideFight = (n: MapNode): boolean => !!n.encounter && n.type !== 'boss' && !isRoad(n) && (n.type !== 'elite' || !!n.optional);

const baseCache = new Map<string, number | null>();
/** Düğümün çevresindeki ana yol savaşlarının en güçlüsü (önbellekli: harita + zorluk + düğüm). */
export function roadBaseline(s: CampaignState, nodeId: string): number | null {
  const key = `${s.mapId}|${s.difficulty}|${nodeId}`;
  if (baseCache.has(key)) return baseCache.get(key)!;
  const map: CampaignMap = getMap(s.mapId);
  const dist = forwardDistances(map, map.start);
  const d = dist.get(nodeId);
  let best: number | null = null;
  if (d !== undefined) {
    for (let w = cfg().window; w <= cfg().window + 2 && best === null; w++) {
      for (const n of map.nodes) {
        const dn = dist.get(n.id);
        if (!isRoad(n) || dn === undefined || Math.abs(dn - d) > w) continue;
        const v = strengthAt(s, n.id);
        if (v !== null && (best === null || v > best)) best = v;
      }
    }
  }
  baseCache.set(key, best);
  return best;
}

export type SideDangerBand = 'stronger' | 'much';
export interface SideDanger {
  band: SideDangerBand;
  /** Güç / ana yol tabanı. */
  ratio: number;
}

/** Oran -> bant (eşikler campaign.json > sideDanger). */
export function sideBand(ratio: number, c: SideDangerCfg = cfg()): SideDangerBand | null {
  return ratio >= c.strongRatio ? 'much' : ratio >= c.ratio ? 'stronger' : null;
}

/**
 * Yan düğümün uyarısı; ana yol düğümünde, savaşmayan ya da artık savaşılmayan (temizlenmiş, devriyesi kapalı) düğümde veya yoldan güçlü
 * değilse null. Bulunulan düğümde dalış derinliği beklerken o derinliğin savaşı ölçülür (battlePlan / nextStep).
 */
export function sideDanger(s: CampaignState, nodeId: string): SideDanger | null {
  const n = getMap(s.mapId).nodes.find((x) => x.id === nodeId);
  if (!n || !isSideFight(n)) return null;
  if (isCleared(s, nodeId) && !patrolAvailable(s, nodeId) && s.at !== nodeId) return null;
  const v = strengthAt(s, nodeId);
  const b = roadBaseline(s, nodeId);
  if (v === null || !b) return null;
  const ratio = v / b;
  const band = sideBand(ratio);
  return band ? { band, ratio } : null;
}

/** Kart satırı (İngilizce). */
export const SIDE_DANGER_LINE: Record<SideDangerBand, string> = {
  stronger: 'Stronger than the road ahead',
  much: 'Far stronger than the road ahead',
};
/** Kart etiketi. */
export const SIDE_DANGER_NAME = 'Hard fight';
