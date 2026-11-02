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

/** Can değiştirmeyen tur başı olayları: toplamı bozmaz, can satırı grubunu kesmez. Listede olmayan her olay (hasar, başka şifa, ölüm...) keser. */
const SUM_TRANSPARENT = new Set<BattleEvent['type']>(['status', 'statusEnd', 'groundEnd', 'shield', 'manaBurn', 'mpRegen', 'passive']);

/** Can çubuğunun yanındaki tek yazı: `amount` grubun toplamı, `bonus` grupta skill HoT'u var (ek bonus rengi). */
export interface HpChip {
  amount: number;
  bonus: boolean;
}

export interface HpTickPlan {
  /** Yüzen sayı yerine çubuk yanında gösterilecek skill HoT tikleri (günlüğe yazılmaya DEVAM eder; `regen` bayrağı almaz). */
  hot: Set<BattleEvent>;
  /** Her grubun SON olayı -> yazısı; gruptaki diğer olaylar yalnızca çubuğu günceller. */
  chips: Map<BattleEvent, HpChip>;
}

/**
 * Ömer 2026-11-01: skill'den gelen tur bazlı şifa (durum 'regen', olay cause 'regen') düz yenilenmenin üstüne eklenip can çubuğunun sağında
 * tek "+N" olur, bonus renginde. Motor sırası: HoT tikleri -> (yalnız durum / MP / kalkan olayları) -> düz yenilenme, hepsi aynı turnStart
 * çağrısında. Toplam yalnız ARALARINDA can değiştiren olay olmayan ardışık tikleri kapsar; kesilirse her grup kendi yazısını alır.
 * Ömer 2026-11-02: şifa ZEMİNİ tiki (Healing Rain, Holy Ground; olay cause = zemin kimliği, `isHealGround` ile tanınır, motor groundStatusTicks) da
 * aynı toplama girer ve bonus renginde sayılır; ayrı yüzen şifa sayısı çıkmaz. Başkasının zemin şifası yüzen kalır.
 * Kritik HoT tiki gruba girmez (yüzen kritik sayı olarak kalır ve grubu keser): açık soru, Combat Design'a soruldu.
 * `regen`: aynı turnStart için regenTickEvents sonucu.
 */
export function hpTickPlan(
  recent: readonly BattleEvent[],
  turnStart: BattleEvent & { type: 'turnStart' },
  regen: ReadonlySet<BattleEvent>,
  isHealGround?: (cause: string) => boolean,
): HpTickPlan {
  const plan: HpTickPlan = { hot: new Set(), chips: new Map() };
  if (turnStart.extra) return plan;
  const uid = turnStart.actor;
  let from = recent.length - 1;
  for (; from >= 0; from--) if (WINDOW_STOP.has(recent[from]!.type)) break;
  let last: BattleEvent | null = null;
  let chip: HpChip = { amount: 0, bonus: false };
  const flush = () => {
    if (last) plan.chips.set(last, chip);
    last = null;
    chip = { amount: 0, bonus: false };
  };
  for (let i = from + 1; i < recent.length; i++) {
    const e = recent[i]!;
    if (e.type === 'heal' && regen.has(e)) {
      last = e;
      chip.amount += e.amount;
    } else if (e.type === 'heal' && e.target === uid && !e.crit && (e.cause === 'regen' || (!!e.cause && !!isHealGround?.(e.cause)))) {
      plan.hot.add(e);
      last = e;
      chip.amount += e.amount;
      chip.bonus = true;
    } else if (!SUM_TRANSPARENT.has(e.type)) flush();
  }
  flush();
  return plan;
}

/**
 * Tur arası olaylar (savaş günlüğü için; Ömer 2026-10-11 hata: Smoke Bomb satırına sıradaki birimin tur başı "+6" can yenilenmesi karıştı):
 * motor eylemin sonuçlarından hemen sonra, AYNI çağrıda sıradaki birimin (X) tur başını işler ve turnStart'ı en son yayar. turnStart gelince
 * pencerenin sonundan geriye doğru X'e ait tur başı olayları (zemin / DoT hasarı, durum bitişi, HoT ve yenilenme şifası, MP yenilenmesi,
 * Omen / Doom, düşme, Divine Light gibi tur başı pasifleri) toplanır; X'e ait olmayan ilk olayda durulur. Günlük bunları eylemin satırına katmaz, ayrı yazar.
 */
export function betweenTurnEvents(recent: readonly BattleEvent[], turnStart: BattleEvent & { type: 'turnStart' }): Set<BattleEvent> {
  const out = new Set<BattleEvent>();
  if (turnStart.extra) return out;
  const x = turnStart.actor;
  for (let i = recent.length - 1; i >= 0; i--) {
    const e = recent[i]!;
    if (WINDOW_STOP.has(e.type)) break;
    const mine =
      (e.type === 'heal' && (e.target === x || e.source === x)) ||
      (e.type === 'passive' && e.actor === x) ||
      (e.type === 'mpRegen' && e.actor === x) ||
      (e.type === 'damage' && e.target === x && (e.origin === 'ground' || e.origin === 'status')) ||
      (e.type === 'statusEnd' && e.target === x) ||
      ((e.type === 'omen' || e.type === 'doom') && e.target === x) ||
      (e.type === 'death' && e.target === x);
    if (!mine) break;
    out.add(e);
  }
  return out;
}
