/**
 * Tur başı yenilenme tikleri (Ömer 2026-10-11, yüzen yazı taslağı A): birimin KENDİ turunun başındaki düz can yenilenmesi (Str hpRegen) ve
 * MP yenilenmesi (mpRegen) yüzen sayı olarak çıkmaz; çubuk kısa parlar ve yanında soluk küçük "+1" / "+2 MP" belirir (regen-fx.ts).
 * SAF karar (Phaser'sız; tests/regen-ticks.test.ts). Motor olay biçimi değişmez: motor turnStart'tan hemen önce, aynı çağrıda sırayla
 * [zemin / DoT / durum tikleri, HoT şifaları] -> düz can yenilenmesi (heal, kaynak = hedef, cause yok, kritik yok) -> mpRegen (cause yok)
 * -> (Divine Light) -> turnStart yayar. Bu modül turnStart gelince geriye bakıp o iki olayı bulur.
 */
import type { BattleEvent } from '../engine';

/** Tur başı penceresini kapatan olaylar (bir eylemin başı ya da önceki tur). */
const WINDOW_STOP = new Set<BattleEvent['type']>(['skillUsed', 'globalUsed', 'turnStart', 'turnSkipped']);

export interface RegenStats {
  /** Birimin tur başı düz can yenilenmesi (stats.hpRegen, yuvarlanmamış olabilir). */
  hpRegen: number;
  /** Birimin tur başı MP yenilenmesi üst sınırı (stats.mpRegen + item turnMp eki). */
  mpRegen: number;
}

/**
 * `recent`: son eylemden beri sıraya giren olaylar (sonuncusu turnStart OLMADAN), `turnStart`: yeni gelen tur başı. Dönen küme, bu
 * pencerede yüzen sayı yerine çubuk parıltısıyla gösterilecek yenilenme olaylarıdır (en çok bir heal + bir mpRegen). Ek eylem turu
 * (`extra`) yenilenme yapmaz.
 */
export function regenTickEvents(recent: readonly BattleEvent[], turnStart: BattleEvent & { type: 'turnStart' }, statsOf: (uid: string) => RegenStats | undefined): Set<BattleEvent> {
  const out = new Set<BattleEvent>();
  if (turnStart.extra) return out;
  const uid = turnStart.actor;
  const st = statsOf(uid);
  if (!st) return out;
  let mpIdx = -1;
  let from = recent.length - 1;
  for (; from >= 0; from--) if (WINDOW_STOP.has(recent[from]!.type)) break;
  // Geriye doğru: önce MP yenilenmesi (cause yok, bu birim, üst sınır içinde), sonra ondan önceki düz can yenilenmesi
  for (let i = recent.length - 1; i > from; i--) {
    const e = recent[i]!;
    if (e.type === 'mpRegen' && e.actor === uid && !e.cause && e.amount > 0 && e.amount <= Math.max(1, Math.round(st.mpRegen))) {
      out.add(e);
      mpIdx = i;
      break;
    }
  }
  const hpCap = Math.round(st.hpRegen);
  if (hpCap <= 0) return out;
  const end = mpIdx >= 0 ? mpIdx : recent.length;
  for (let i = end - 1; i > from; i--) {
    const e = recent[i]!;
    if (e.type === 'heal' && e.target === uid && e.source === uid && !e.cause && !e.crit && e.amount > 0 && e.amount <= hpCap) {
      out.add(e);
      break;
    }
    // MP yenilenmesi bulunduysa can yenilenmesi ONUN hemen öncesindedir (araya başka şifa girmez)
    if (mpIdx >= 0) break;
  }
  return out;
}
