// Aynı durumun yeniden uygulanması (Ömer 2026-10-10: "aynı debuff üst üste binmesin; sadece en fazla vuranınki kalsın").
// Saf yardımcılar: battle.addStatus kullanır, testler doğrudan sınar. Kural verisi statuses.json > stack (types.ts > StatusDef.stack).
import type { Status, StatusDef, StatusStackMode } from './types';

/** Durumun yığılma kipi: veride `stack` varsa o; yoksa yığınlı (maxStacks) durum 'stack', debuff 'refresh-strongest', buff 'replace'. */
export function statusStackMode(def: StatusDef | undefined): StatusStackMode {
  if (def?.stack) return def.stack;
  if (def?.maxStacks) return 'stack';
  return def?.type === 'debuff' ? 'refresh-strongest' : 'replace';
}

/**
 * Örneğin gücü: DoT tik miktarı (`amount`), eşitlikte örnek gücü (`strength`, Ömer 2026-11-16: Fleet kaynağının yarım Shrouded'ı, çanın 1/3 Blinded'ı,
 * Blood Curse zemininin güçlü Wound'u). Sabit büyüklüklü, gücü yazılmamış durumlarda (Slow, Wound...) hepsi eşit (amount 0, strength 1).
 */
export function statusStrength(s: Pick<Status, 'amount' | 'strength'>): number {
  return (s.amount ?? 0) + (s.strength ?? 1) * 1e-3;
}

/**
 * Örnek gücüyle ölçeklenmiş çarpan (Ömer 2026-11-16): 1 + (çarpan - 1) x güç, en az 0 (0,8 zırh çarpanı yarım güçte 0,9; Wound 0,5 x1,4 güçte 0,3).
 * Güç 1 ise çarpan aynen döner (ifade birebir eski).
 */
export function scaleMult(v: number, strength: number): number {
  return strength === 1 ? v : Math.max(0, 1 + (v - 1) * strength);
}

/**
 * 'refresh-strongest' birleştirmesi: birimdeki eski örnek `old` + yeni uygulama `incoming` (Resilience / Unyielding kısaltması uygulanmış hâli) ->
 * birimde kalacak TEK örnek. Süre max(kalan, yeni): yeniden uygulama süreyi geri uzatır ama yeni uygulamanın tam süresini aşmaz (kalan daha uzunsa
 * kalan korunur). Yeni daha GÜÇLÜYSE güç ve kaynak yeninin; eşit ya da zayıfsa eski örnek (güç, kaynak) kalır, yalnızca süre tazelenir.
 */
export function mergeRefreshStrongest(old: Status, incoming: Status): Status {
  const turns = Math.max(old.turns, incoming.turns);
  return statusStrength(incoming) > statusStrength(old) ? { ...incoming, turns } : { ...old, turns };
}

/** Örnek gücüyle ölçeklenmiş ek (isabet / kaçınma / kritik), 3 ondalık (1/3 güçte -0,3 tam -0,1). Güç 1 ise ek aynen döner. */
export function scaleDelta(v: number, strength: number): number {
  return strength === 1 || v === 0 ? v : Math.round(v * strength * 1000) / 1000;
}

/**
 * Eski durum id'leri (Ömer 2026-11-16, "aynı amaca hizmet eden iki modifier olmaz"): kayıtta (Endless taşınan durumlar) kalmış eski örnek yeni
 * id'ye ve gücüne çevrilir. Veri dosyaları yeni id'leri kullanır; bu tablo yalnız eski kayıtlar içindir.
 */
export const STATUS_ALIASES: Readonly<Record<string, { kind: string; strength?: number }>> = {
  fleet: { kind: 'shrouded', strength: 0.5 },
  shaken: { kind: 'blinded', strength: 0.333 },
  overreached: { kind: 'overextended' },
  blood_cursed: { kind: 'wound', strength: 1.4 },
  shredded: { kind: 'sunder' },
  staggered: { kind: 'stun' },
};

/** Eski id'li örneği yeni id'ye çevirir (STATUS_ALIASES); eski değilse aynı örnek. Shredded'ın yığın / tutar alanları atılır (tam Sunder). Saf. */
export function migrateStatus<T extends Pick<Status, 'kind'> & { strength?: number; amount?: number; stacks?: number }>(s: T): T {
  const a = STATUS_ALIASES[s.kind];
  if (!a) return s;
  const out: T = { ...s, kind: a.kind as Status['kind'] };
  if (a.strength !== undefined) out.strength = a.strength;
  if (s.kind === 'shredded') {
    delete out.amount;
    delete out.stacks;
  }
  return out;
}
