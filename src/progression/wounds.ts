// Yara (Ömer 2026-10-19, docs/design/hp-death-rework.md): sefer ve Endless'ın ORTAK kuralı (saf; Phaser/DOM yok). Sayılar veriden:
// sefer data/campaign/campaign.json > rules.wounds, Endless data/endless.json > carry.wounds.
import type { UnitSetup } from '../engine/types';
import valorJson from '../../data/valor.json';

export interface WoundRules {
  /** Kazanılan savaşı düşmüş bitiren (ve ölümcül sınırda olmayan) kahraman bu can oranıyla kalkar (0,1 = %10). */
  riseRatio: number;
  /** Yara başına maksimum can kaybı (TOPLAMSAL: 3 yara x 0,2 = -%60; VARSAYIM, open-questions 369). */
  maxHpLoss: number;
  /** Bu kadar yarası olan kahraman bir kazanılan savaşı daha düşmüş bitirirse CESET olur (Valor kaldırır). */
  lethal: number;
}

/** Kahramanın yara sayısı (kayıtta `wounds`; yok / bozuk = 0). */
export const woundCount = (h: { wounds?: unknown } | undefined): number => {
  const v = h?.wounds;
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
};

/**
 * Yaraların maksimum can çarpanı (1 = yarasız). Ölümcül sınırın üstündeki yara (debug) ek kayıp vermez; en az %5. `soften` (0-1; b_wound_soft
 * affix'i, Ömer 2026-10-26: src/progression/loadout.ts > itemWoundSoft): yara başına kayıp bu oran az (verilmezse aynı).
 */
export function woundHpFactor(wounds: number, r: WoundRules, soften = 0): number {
  const n = Math.max(0, Math.min(Math.floor(wounds), Math.max(0, Math.floor(r.lethal))));
  const keep = 1 - Math.min(1, Math.max(0, soften));
  return Math.max(0.05, Math.round((1 - r.maxHpLoss * keep * n) * 1000) / 1000);
}

/** Gösterim için yaranın maks can kaybı yüzdesi (2 yara -> 40). */
export const woundHpLossPct = (wounds: number, r: WoundRules): number => Math.round((1 - woundHpFactor(wounds, r)) * 100);

/** En küçük işlevsel gösterim (yara arayüzü mockup'tan seçilecek): "Wounds: 2 (-40% max HP)"; yarasızsa boş. */
export const woundsLine = (wounds: number, r: WoundRules): string => (wounds > 0 ? `Wounds: ${wounds} (-${woundHpLossPct(wounds, r)}% max HP)` : '');

/** Yara ipucunun düz içeriği (DOM ve Phaser ipucu aynı metni kurar; Ömer 2026-10-23, V1 "Scar + dots"). Sayılar kuraldan; yüzdeler yuvarlak. */
export interface WoundTipData {
  title: string;
  /** "-60%" (tam sayı yüzde; kayan nokta artığı yok). */
  value: string;
  valueLabel: string;
  /** "Max HP 56 of 140" (taban bilinmiyorsa yok). */
  maxHp?: string;
  /** Üst sınırda (lethal) mı: "Maximum" çipi. */
  maxed: boolean;
  lines: string[];
  foot?: string;
}

/**
 * Yara ipucu içeriği. `baseHp` yarasız maks can (bilinirse "Max HP x of y"); `town` kasaba dinlenmesi yarayı siler (sefer; Endless'ta yok).
 * Valor'un sildiği yara sayısı data/valor.json'dan. Yarasızsa null.
 */
export function woundTipData(wounds: number, r: WoundRules, opts: { baseHp?: number; town?: boolean } = {}): WoundTipData | null {
  const n = Math.max(0, Math.floor(wounds));
  if (n <= 0) return null;
  const maxed = n >= r.lethal;
  const town = opts.town !== false;
  const valor = valorClearWounds();
  const heal = [town ? 'resting in a town clears all wounds.' : '', valor > 0 ? `A Valor revive clears ${valor}.` : ''].filter(Boolean);
  const lines = [`Each wound lowers max HP by ${Math.round(r.maxHpLoss * 100)}%.`];
  if (heal.length) lines.push(`Heal: ${heal.join(' ').replace(/^r/, 'R')}`);
  if (maxed) lines.push(`Going down again in a won battle leaves a corpse.${valor > 0 ? ' Valor can raise it.' : ''}`);
  const out: WoundTipData = { title: `${n} ${n === 1 ? 'Wound' : 'Wounds'}`, value: `-${woundHpLossPct(n, r)}%`, valueLabel: 'max HP', maxed, lines };
  if (opts.baseHp !== undefined && opts.baseHp > 0) out.maxHp = `Max HP ${Math.max(1, Math.round(opts.baseHp * woundHpFactor(n, r)))} of ${Math.round(opts.baseHp)}`;
  if (town) out.foot = 'Camp rest does not heal wounds.';
  return out;
}

/**
 * Yaraları savaş kurulumuna uygular (YERİNDE): maks can = (türetilen x hpMult + hpAdd) x çarpan. Motor saf kalır: yalnızca mevcut
 * UnitModifiers.hpMult / hpAdd alanları kullanılır (item'in düz can eki de aynı oranda düşer). Yarasızsa dokunmaz.
 */
export function applyWounds(setup: UnitSetup, wounds: number, r: WoundRules, soften = 0): UnitSetup {
  const f = woundHpFactor(wounds, r, soften);
  if (f >= 1) return setup;
  const m = { ...(setup.modifiers ?? {}) };
  m.hpMult = Math.round((m.hpMult ?? 1) * f * 1000) / 1000;
  if (m.hpAdd) m.hpAdd = Math.round(m.hpAdd * f);
  setup.modifiers = m;
  return setup;
}

/**
 * Kazanılan savaşın SONUNDA hâlâ düşmüş olan kahramanın sonucu: yarası `lethal`'ın altındaysa riseRatio canla kalkar ve 1 yara alır; değilse
 * ceset (yaralar aynen kalır). Savaş içinde Valor / Resurrection / Raise Dead ile kalkan zaten "düşmüş" değildir (çağıran sonuca bakar).
 */
export function fallAfterVictory(wounds: number, r: WoundRules): { corpse: true; wounds: number } | { corpse: false; wounds: number; hpRatio: number } {
  if (wounds >= r.lethal) return { corpse: true, wounds };
  return { corpse: false, wounds: wounds + 1, hpRatio: Math.max(0.001, Math.min(1, r.riseRatio)) };
}

// ---------------------------------------------------------------- Valor yara siler (Ömer 2026-10-20, open-questions 369 cevabı 3)

/**
 * Valor diriltmesinin sildiği yara sayısı (data/valor.json > revive.clearWounds; yoksa 0). Savaş dışı ceset kaldırma ve savaş içi Valor
 * diriltmesi aynı; Resurrection / Raise Dead skill'leri yara SİLMEZ (Valor'a özel). Sefer ve Endless.
 */
export const valorClearWounds = (): number => {
  const v = (valorJson.revive as { clearWounds?: unknown }).clearWounds;
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
};

/** Yaradan `n` tanesini siler (en az 0). */
export const healWounds = (wounds: number, n: number): number => Math.max(0, Math.floor(wounds) - Math.max(0, Math.floor(n)));

/**
 * Savaş günlüğünden (Battle.log) kahraman başına savaş içi Valor diriltmesi sayısı ('revive' olayı, cause 'valor'). 'party-i' = heroOrder[i];
 * çağrılar ve skill dirilişleri sayılmaz. Hiç yoksa boş.
 */
export function valorRevivedCounts(log: ReadonlyArray<{ type: string; target?: string; cause?: string }>, heroOrder: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of log) {
    if (e.type !== 'revive' || e.cause !== 'valor' || !e.target || !/^party-\d+$/.test(e.target)) continue;
    const id = heroOrder[Number(e.target.slice('party-'.length))];
    if (id) out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}
