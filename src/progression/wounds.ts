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

/** Yaraların maksimum can çarpanı (1 = yarasız). Ölümcül sınırın üstündeki yara (debug) ek kayıp vermez; en az %5. */
export function woundHpFactor(wounds: number, r: WoundRules): number {
  const n = Math.max(0, Math.min(Math.floor(wounds), Math.max(0, Math.floor(r.lethal))));
  return Math.max(0.05, Math.round((1 - r.maxHpLoss * n) * 1000) / 1000);
}

/** Gösterim için yaranın maks can kaybı yüzdesi (2 yara -> 40). */
export const woundHpLossPct = (wounds: number, r: WoundRules): number => Math.round((1 - woundHpFactor(wounds, r)) * 100);

/** En küçük işlevsel gösterim (yara arayüzü mockup'tan seçilecek): "Wounds: 2 (-40% max HP)"; yarasızsa boş. */
export const woundsLine = (wounds: number, r: WoundRules): string => (wounds > 0 ? `Wounds: ${wounds} (-${woundHpLossPct(wounds, r)}% max HP)` : '');

/**
 * Yaraları savaş kurulumuna uygular (YERİNDE): maks can = (türetilen x hpMult + hpAdd) x çarpan. Motor saf kalır: yalnızca mevcut
 * UnitModifiers.hpMult / hpAdd alanları kullanılır (item'in düz can eki de aynı oranda düşer). Yarasızsa dokunmaz.
 */
export function applyWounds(setup: UnitSetup, wounds: number, r: WoundRules): UnitSetup {
  const f = woundHpFactor(wounds, r);
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
