// A4 Hero Oaths (Ömer seçimi 2026-10-25, maps-2-3.md 9; Ömer notu: TEK tapınak, TEK kahraman; campaign-dev 2026-10-27, open-questions 429):
// saf veri, etki ve metin. Durum geçişleri (swearOath / breakOath) state.ts'te; bu modül state.ts'i içe aktarmaz.
import oathsJson from '../../data/campaign/oaths.json';
import { addPctText, multText } from '../engine/bonus-text';
import type { UnitModifiers, UnitSetup } from '../engine/types';
import type { CampaignState } from './types';

/** Yeminin bir yüzü (artı ya da eksi): savaş kurulumu (damageAdd / critAdd toplanır, hpMult çarpılır) ve sefer şifası çarpanları. */
export interface OathEffect {
  damageAdd?: number;
  critAdd?: number;
  hpMult?: number;
  /** Kamp Rest ve Inn günlük şifası x bu. */
  restHealMult?: number;
  /** Zafer şifası x bu. */
  victoryHealMult?: number;
}

export interface OathDef {
  id: string;
  name: string;
  vow: string;
  plus: OathEffect;
  minus: OathEffect;
}

interface OathData {
  breakCost: number;
  text: string;
  swornText: string;
  oaths: OathDef[];
}

export const OATH_DATA: OathData = oathsJson as unknown as OathData;
export const OATHS: OathDef[] = OATH_DATA.oaths;
export const oathDef = (id: string | undefined): OathDef | undefined => OATHS.find((o) => o.id === id);

/** Yemini bozmanın altın bedeli. */
export const oathBreakCost = (): number => OATH_DATA.breakCost;

/** Kahramanın yemini (yeminli değilse undefined). */
export const heroOath = (s: Pick<CampaignState, 'oath'>, heroId: string): OathDef | undefined => (s.oath?.hero === heroId ? oathDef(s.oath.id) : undefined);

/**
 * Etkinin oyuncu metni (İngilizce; her alan bir satır). Bonus yazım kuralı (Ömer 2026-10-27): damageAdd / critAdd item'lerle aynı havuza
 * toplanır ("+12% damage dealt"); hpMult ve şifa çarpanları ayrı çarpandır ("×1.15 max health", "×0.5 camp and inn rest healing").
 */
export function oathEffectLines(e: OathEffect): string[] {
  const out: string[] = [];
  if (e.damageAdd) out.push(`${addPctText(e.damageAdd)} damage dealt`);
  if (e.critAdd) out.push(`${addPctText(e.critAdd)} critical chance`);
  if (e.hpMult && e.hpMult !== 1) out.push(`${multText(e.hpMult)} max health`);
  if (e.restHealMult !== undefined && e.restHealMult !== 1) out.push(`${multText(e.restHealMult)} camp and inn rest healing`);
  if (e.victoryHealMult !== undefined && e.victoryHealMult !== 1) out.push(`${multText(e.victoryHealMult)} healing after victories`);
  return out;
}

/** Yeminin kısa artı / eksi yazısı. */
export const oathPlusText = (o: OathDef): string => oathEffectLines(o.plus).join(', ');
export const oathMinusText = (o: OathDef): string => oathEffectLines(o.minus).join(', ');

/** İki yüzün toplamı (aynı alan iki yüzde olursa toplanır / çarpılır). */
function combined(o: OathDef): OathEffect {
  const a = o.plus;
  const b = o.minus;
  const sum = (x?: number, y?: number) => (x ?? 0) + (y ?? 0);
  const mul = (x?: number, y?: number) => (x ?? 1) * (y ?? 1);
  return {
    damageAdd: sum(a.damageAdd, b.damageAdd),
    critAdd: sum(a.critAdd, b.critAdd),
    hpMult: mul(a.hpMult, b.hpMult),
    restHealMult: mul(a.restHealMult, b.restHealMult),
    victoryHealMult: mul(a.victoryHealMult, b.victoryHealMult),
  };
}

/** Kahramanın sefer şifası çarpanı (yemin yoksa 1). */
export function oathHealMult(s: Pick<CampaignState, 'oath'>, heroId: string, kind: 'rest' | 'victory'): number {
  const o = heroOath(s, heroId);
  if (!o) return 1;
  const c = combined(o);
  return kind === 'rest' ? (c.restHealMult ?? 1) : (c.victoryHealMult ?? 1);
}

/** Yeminin savaş kurulumuna eklenmesi (YERİNDE): damageAdd / critAdd toplanır, hpMult çarpılır. Yemin yoksa dokunmaz. */
export function applyOath(setup: UnitSetup, s: Pick<CampaignState, 'oath'>, heroId: string): void {
  const o = heroOath(s, heroId);
  if (!o) return;
  const c = combined(o);
  const m: UnitModifiers = { ...(setup.modifiers ?? {}) };
  if (c.damageAdd) m.damageAdd = Math.round(((m.damageAdd ?? 0) + c.damageAdd) * 10000) / 10000;
  if (c.critAdd) m.critAdd = Math.round(((m.critAdd ?? 0) + c.critAdd) * 10000) / 10000;
  if (c.hpMult !== undefined && c.hpMult !== 1) m.hpMult = Math.round((m.hpMult ?? 1) * c.hpMult * 10000) / 10000;
  setup.modifiers = m;
}
