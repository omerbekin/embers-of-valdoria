/**
 * Savaş durum rozetlerinin TELEFON yerleşimi (Ömer 2026-10-11, taslak B): her birimin durumları öncelik sırasıyla can çubuğunun iki yanındaki
 * yuvalara konur; hiçbir yuva başka bir birimin çubuğuna / adına / gövde çekirdeğine ya da yerleşmiş rozetine (ya da kendi adına / gövdesine)
 * binmez; sığmayanlar "+N" sayacında. Yüzen yazılar başın üstünde (çubuğun ~36 birim yukarısı) çıktığı, sıra çubuğu ve HUD sahnenin üst / alt
 * kenarında olduğu için çubuk hizasındaki rozet onlara ulaşmaz. Saf ve test edilebilir (Phaser'sız).
 */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BadgeUnit {
  id: string;
  /** Can çubuğunun ortası (sahne koordinatı). */
  x: number;
  barY: number;
  /** Çubuğun yarı genişliği. */
  barHalfW: number;
  /** Soldaki (buff) ve sağdaki (debuff) rozet sayısı. */
  left: number;
  right: number;
  /** Bu birimin, rozetlerin çarpmaması gereken parçaları (ad, çubuk + MP/hız, gövde çekirdeği): diğer birimler için engel; kendi adı ve gövdesi de. */
  parts: Rect[];
  /** `parts` içinde kendi rozetlerinin zaten bitişiğinde olan parça (kendi can çubuğu): kendisi için engel sayılmaz. */
  ownBar: Rect;
  /** `parts` içindeki gövde çekirdeği (varsa). Komşunun gövdesi bu birimin KENDİ çubuğunu zaten kesiyorsa (çok sıkışık çapraz dizilim) çubuk
   * hizasındaki rozet onu daha kötü yapamaz: o gövde bu birim için engel sayılmaz (çubuklar, adlar ve rozetler her zaman engel). */
  body?: Rect;
}

const hit = (a: Rect, b: Rect, m: number): boolean => a.x0 < b.x1 + m && b.x0 < a.x1 + m && a.y0 < b.y1 + m && b.y0 < a.y1 + m;

// ---------------------------------------------------------------- telefon: öncelikli rozetler + "+N" sayacı (Ömer 2026-10-11, taslak B)

/** Rozet yuvası: taraf (-1 sol, +1 sağ) ve çubuktan dışa doğru sıra (0 = çubuğun hemen yanı). */
export interface BadgeSlot {
  dir: -1 | 1;
  i: number;
}

/** Telefonda bir birimin rozet planı: gösterilecek ilk `shown` durum `slots[0..shown-1]`de, `more` > 0 ise sayaç `slots[shown]`de. */
export interface PhoneBadgePlan {
  size: number;
  slots: BadgeSlot[];
  shown: number;
  more: number;
}

export interface PhoneBadgeOpts {
  /** Telefon rozet boyu (oyun birimi; 844x390'da ~14 gerçek px için en az 39). */
  size: number;
  gapBar: number;
  gapItem: number;
  margin: number;
  /** Taraf başına en çok yuva. */
  perSide: number;
  /** Yuvanın üst kenarı çubuk ortasının bu kadar üstünde (masaüstü rozetinin yarısı). */
  top: number;
}

/**
 * Yuvanın dikdörtgeni (çubuğun iki yanı). Üst kenar masaüstü rozetinin üst kenarında (çubuk - `top`), büyük telefon rozeti aşağı uzar: hemen
 * üstteki kendi adına yaklaşmaz.
 */
export function slotRect(u: Pick<BadgeUnit, 'x' | 'barY' | 'barHalfW'>, slot: BadgeSlot, s: number, gapBar: number, gapItem: number, top = s / 2): Rect {
  const inner = u.barHalfW + gapBar + slot.i * (s + gapItem);
  const xa = u.x + slot.dir * inner;
  const xb = u.x + slot.dir * (inner + s);
  return { x0: Math.min(xa, xb), y0: u.barY - top, x1: Math.max(xa, xb), y1: u.barY - top + s };
}

/**
 * Telefon rozet yerleşimi: her birimin durumları ÖNCELİK sırasıyla (çağıran sıralar) yuvalara konur; yuva sırası sağ 1, sol 1, sağ 2, sol 2...
 * Bir yuva başka bir birimin çubuğuna / adına / gövdesine / yerleşmiş rozetine (ya da kendi adına / gövdesine) çarpıyorsa atlanır. Sığan
 * yuva sayısı k: durum sayısı k'yi aşarsa ilk k-1 durum + "+N" sayacı (sayaç da bir rozet gibi yer kaplar); k = 1 ise sayaç değil en önemli durum. Hiç yuva yoksa plan boş
 * (ayrıntı yan paneldedir). `counts` = birim başına durum sayısı (aynı sırada).
 */
export function solvePhoneBadges(units: BadgeUnit[], counts: Map<string, number>, o: PhoneBadgeOpts): Map<string, PhoneBadgePlan> {
  const order: BadgeSlot[] = [];
  for (let i = 0; i < o.perSide; i++) order.push({ dir: 1, i }, { dir: -1, i });
  const placed: Rect[] = [];
  const plans = new Map<string, PhoneBadgePlan>();
  for (const u of units) {
    const n = counts.get(u.id) ?? 0;
    if (n <= 0) {
      plans.set(u.id, { size: o.size, slots: [], shown: 0, more: 0 });
      continue;
    }
    const blockers: Rect[] = [...placed];
    for (const v of units) {
      if (v === u) blockers.push(...u.parts.filter((p) => p !== u.ownBar));
      else blockers.push(...v.parts.filter((p) => !(p === v.body && hit(u.ownBar, p, 0))));
    }
    const free: BadgeSlot[] = [];
    // çarpan yuva atlanır; dıştaki yuva boşsa kullanılır (sıkışık çaprazda komşunun adı içteki yuvayı kapatabilir; rozet yine bu birimin
    // çubuk hizasında, tek yuva arayla)
    for (const slot of order) {
      if (free.length >= n) break;
      const r = slotRect(u, slot, o.size, o.gapBar, o.gapItem, o.top);
      if (blockers.some((b) => hit(r, b, o.margin))) continue;
      free.push(slot);
    }
    const k = free.length;
    // Tek yuva: sayaç değil EN ÖNEMLİ durumun rozeti (bir ikon "+4"ten çok şey söyler; tam liste yan panelde). "+N" yalnızca en az 2 yuva varken.
    const shown = n <= k ? n : k >= 2 ? k - 1 : k;
    const more = k >= 2 ? n - shown : 0;
    const used = free.slice(0, shown + (more > 0 ? 1 : 0));
    for (const s of used) placed.push(slotRect(u, s, o.size, o.gapBar, o.gapItem, o.top));
    plans.set(u.id, { size: o.size, slots: used, shown, more });
  }
  return plans;
}

/**
 * Telefonda hangi durum önce: debuff'lar buff'lardan önce; aynı grupta `priority` listesindeki sıra (listede olmayan sona), eşitlikte
 * kalan tur az olan önce. Kararlı (aynı girdi = aynı sıra).
 */
export function sortByPriority<T extends { id: string; debuff: boolean; turns: number }>(list: readonly T[], priority: readonly string[]): T[] {
  const rank = (id: string): number => {
    const i = priority.indexOf(id);
    return i < 0 ? priority.length : i;
  };
  return list
    .map((b, k) => ({ b, k }))
    .sort((a, b) => Number(b.b.debuff) - Number(a.b.debuff) || rank(a.b.id) - rank(b.b.id) || a.b.turns - b.b.turns || a.k - b.k)
    .map((x) => x.b);
}
