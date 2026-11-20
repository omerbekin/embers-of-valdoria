/**
 * Durum rozetinin altındaki yüzde yazısı (Ömer 2026-11-16): durumun ANA etkisinin bu birimdeki GERÇEK değeri (ör. Blinded -30%, boss'ta -7.5%).
 * Değer elle yazılmaz: motorun bugünkü etkin değer hesabından (Battle.debuffStrength = rütbe x kaynak tarafı; ağaç potency'si dahil; effectiveStats /
 * statusMult / weakenedMult ile AYNI ifade) okunur. Örnek gücü (`Status.strength`, Ömer 2026-11-16: yarım Shrouded, 1/3 Blinded, 1,4 Wound, Sunder yığını)
 * motorla aynı sırada: tanım değeri x örnek gücü (status-stack.ts > scaleMult / scaleDelta), sonra ağaç eki, boss / elit ölçeği en son. UI buna dokunmaz.
 * Saf (Phaser'sız). Yüzdesiz durum (Stun, DoT, kök, mühür) null döner: rozette yazı çıkmaz.
 */
import type { Combatant, Status, StatusDef } from '../engine/types';
import { scaleDelta, scaleMult } from '../engine/status-stack';

/** Ana etki alanları, öncelik sırasıyla (ilk bulunan gösterilir). 'mult' = çarpan (x0,7 -> -30%), 'delta' = düz ek (-0,3 -> -30%). */
const MAIN: ReadonlyArray<{ key: string; kind: 'mult' | 'delta' }> = [
  { key: 'speedMult', kind: 'mult' },
  { key: 'accuracyDelta', kind: 'delta' },
  { key: 'evasionDelta', kind: 'delta' },
  { key: 'evasionMult', kind: 'mult' },
  { key: 'critDelta', kind: 'delta' },
  { key: 'critTakenDelta', kind: 'delta' },
  { key: 'damageTakenMult', kind: 'mult' },
  { key: 'magicTakenMult', kind: 'mult' },
  { key: 'damageDealtMult', kind: 'mult' },
  { key: 'physicalDealtMult', kind: 'mult' },
  { key: 'magicDealtMult', kind: 'mult' },
  { key: 'healTakenMult', kind: 'mult' },
  { key: 'armorMult', kind: 'mult' },
  { key: 'healDealtMult', kind: 'mult' },
];

/** Motordan yalnız bu iki okuma gerekir (Battle bunu karşılar). */
export interface StatusPctSource {
  statusDef(kind: string): StatusDef | undefined;
  debuffStrength(c: Pick<Combatant, 'tier' | 'boss' | 'side'>, s: Pick<Status, 'kind' | 'source'>): number;
}

export type StatusPctUnit = Pick<Combatant, 'tier' | 'boss' | 'side'>;

export type StatusPctInst = Pick<Status, 'kind' | 'source' | 'potency'> & { strength?: number };

/**
 * TEK BAĞLANTI NOKTASI: durumun gücü iki parça. `inst` = örnek gücü (Status.strength, yoksa 1; tanım değerine uygulanır, ağaç ekinden ÖNCE);
 * `tier` = boss / elit ölçeği (rütbe x kaynak tarafı, Battle.debuffStrength; en SON çarpılır). Motor: battle.ts > effectiveStats / statusMult.
 */
export function strengthOf(b: StatusPctSource, c: StatusPctUnit, s: StatusPctInst): { inst: number; tier: number } {
  return { inst: s.strength ?? 1, tier: b.debuffStrength(c, s) };
}

/** Ana etki alanının etkin yüzdesi (yuvarlanmamış) ve tam güçteki (tanım, ağaçsız, ölçeksiz) yüzdesi; ana etki yoksa null. */
function mainEffect(b: StatusPctSource, c: StatusPctUnit, s: StatusPctInst): { real: number; base: number } | null {
  const d = b.statusDef(s.kind) as Record<string, unknown> | undefined;
  if (!d) return null;
  const { inst, tier } = strengthOf(b, c, s);
  for (const { key, kind } of MAIN) {
    const base = d[key];
    const extra = s.potency?.[key];
    if (typeof base !== 'number' && extra === undefined) continue;
    const def = typeof base === 'number' ? base : kind === 'mult' ? 1 : 0;
    if (kind === 'mult') {
      const v = (typeof base === 'number' ? scaleMult(base, inst) : 1) + (extra ?? 0);
      return { real: (Math.max(0, v) - 1) * tier * 100, base: (def - 1) * 100 };
    }
    const v = (typeof base === 'number' ? scaleDelta(base, inst) : 0) + (extra ?? 0);
    return { real: v * tier * 100, base: def * 100 };
  }
  return null;
}

const round1 = (x: number): number => Math.round(x * 10) / 10;

/** Durumun ana etkisinin etkin yüzdesi (-30, +15, -7.5) ya da yüzdesiz durumda null. Saf. */
export function statusPercent(b: StatusPctSource, c: StatusPctUnit, s: StatusPctInst): number | null {
  const m = mainEffect(b, c, s);
  if (!m) return null;
  const r = round1(m.real);
  return r === 0 ? null : r;
}

/**
 * Durum ipucu (birim kartı EFFECTS satırı) metni: statuses.json `text` tam güçteki sayıyı yazar ("Evasion +20%", "Receives 50% less healing");
 * örnek gücü / ağaç eki / boss ölçeği değeri değiştirdiyse o sayı GERÇEK değerle değiştirilir (yarım Shrouded "+10%", Blood Curse Wound "70%").
 * Metinde tam güçteki sayı yoksa ya da değer aynıysa metin aynen döner. Saf.
 */
export function statusTipText(b: StatusPctSource, c: StatusPctUnit, s: StatusPctInst, text: string): string {
  const m = mainEffect(b, c, s);
  if (!m) return text;
  const full = round1(Math.abs(m.base));
  const real = round1(Math.abs(m.real));
  if (full === real || full === 0) return text;
  const re = /(\d+(?:\.\d+)?)%/g;
  let done = false;
  return text.replace(re, (all, n: string) => {
    if (done || Number(n) !== full) return all;
    done = true;
    return `${real}%`;
  });
}

/** Rozet yazısı: "-30%", "+15%", "-7.5%" (en çok 1 ondalık, gereksiz ".0" yok); null = yazı yok. */
export function statusPercentText(b: StatusPctSource, c: StatusPctUnit, s: StatusPctInst): string | null {
  const p = statusPercent(b, c, s);
  if (p === null) return null;
  return `${p > 0 ? '+' : '-'}${Math.abs(p)}%`;
}

/** Rozet altı yüzde yazısının tahmini genişliği (oyun birimi; kalın serif rakam ~0,6 em): rozet aralığını açmak için. Ölçüm gerektirmez, saf. */
export function pctTextWidth(text: string, px: number): number {
  return Math.ceil(text.length * 0.6 * px);
}

/** Telefonda yüzde yazısı boyu (oyun birimi): 844x390'da ~9 gerçek px (390/1080 x 25). */
export const PHONE_PCT_PX = 25;
