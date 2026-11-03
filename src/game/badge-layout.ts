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

/** Bir tarafın planı: gösterilecek ilk `shown` durum `slots[0..shown-1]`de, `more` > 0 ise sayaç `slots[shown]`de. */
export interface SideBadgePlan {
  slots: BadgeSlot[];
  shown: number;
  more: number;
  /** true = hiç yuva sığmadı, ilk yuva zorla kullanıldı (komşuya binebilir). */
  forced?: boolean;
}

/** Telefonda bir birimin rozet planı: buff'lar HEP çubuğun solunda (`left`), debuff'lar HEP sağında (`right`; Ömer 2026-11-03). */
export interface PhoneBadgePlan {
  size: number;
  left: SideBadgePlan;
  right: SideBadgePlan;
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
 * Telefon rozet yerleşimi (Ömer 2026-11-03: buff'lar HEP solda, debuff'lar HEP sağda; taraf durumun türüne göre, yuva sırasına göre değil).
 * Her tarafın durumları ÖNCELİK sırasıyla (çağıran sıralar) o tarafın yuvalarına konur (çubuktan dışa 0, 1, 2...). Bir yuva başka bir
 * birimin çubuğuna / adına / gövdesine / yerleşmiş rozetine (ya da kendi adına / gövdesine) çarpıyorsa atlanır. Bir tarafta sığan yuva
 * sayısı k: durum sayısı k'yi aşarsa ilk k-1 durum + "+N" sayacı (sayaç da bir rozet gibi yer kaplar); k = 1 ise sayaç değil en önemli durum.
 * Hiç yuva sığmazsa bile taraf boş kalmaz: ilk yuvada en önemli durum zorla gösterilir. `counts` = birim başına {left: buff sayısı, right: debuff sayısı}.
 */
export function solvePhoneBadges(units: BadgeUnit[], counts: Map<string, { left: number; right: number }>, o: PhoneBadgeOpts): Map<string, PhoneBadgePlan> {
  const placed: Rect[] = [];
  const plans = new Map<string, PhoneBadgePlan>();
  const none = (): SideBadgePlan => ({ slots: [], shown: 0, more: 0 });
  for (const u of units) {
    const c = counts.get(u.id) ?? { left: 0, right: 0 };
    const blockers: Rect[] = [...placed];
    for (const v of units) {
      if (v === u) blockers.push(...u.parts.filter((p) => p !== u.ownBar));
      else blockers.push(...v.parts.filter((p) => !(p === v.body && hit(u.ownBar, p, 0))));
    }
    const solveSide = (dir: -1 | 1, n: number): SideBadgePlan => {
      if (n <= 0) return none();
      const free: BadgeSlot[] = [];
      // çarpan yuva atlanır; dıştaki yuva boşsa kullanılır (rozet yine bu birimin çubuk hizasında)
      for (let i = 0; i < o.perSide && free.length < n; i++) {
        const slot: BadgeSlot = { dir, i };
        const r = slotRect(u, slot, o.size, o.gapBar, o.gapItem, o.top);
        if (blockers.some((b) => hit(r, b, o.margin))) continue;
        free.push(slot);
      }
      // Taraf asla tamamen kaybolmaz (Ömer 2026-11-03): hiç yuva sığmıyorsa çubuğun hemen yanındaki ilk yuva zorla kullanılır (en önemli durumun rozeti;
      // komşuya binebilir, ama karşı tarafa taşınmaz)
      const forced = free.length === 0;
      if (forced) free.push({ dir, i: 0 });
      const k = free.length;
      // Tek yuva: sayaç değil EN ÖNEMLİ durumun rozeti. "+N" yalnızca en az 2 yuva varken.
      const shown = n <= k ? n : k >= 2 ? k - 1 : k;
      const more = k >= 2 ? n - shown : 0;
      const used = free.slice(0, shown + (more > 0 ? 1 : 0));
      for (const s of used) {
        const r = slotRect(u, s, o.size, o.gapBar, o.gapItem, o.top);
        placed.push(r);
        blockers.push(r);
      }
      return forced ? { slots: used, shown, more, forced } : { slots: used, shown, more };
    };
    const right = solveSide(1, c.right); // debuff'lar önce yer alır (daha önemli)
    const left = solveSide(-1, c.left);
    plans.set(u.id, { size: o.size, left, right });
  }
  return plans;
}

/**
 * Telefonda hangi durum önce: debuff'lar buff'lardan önce; aynı grupta `priority` listesindeki sıra (listede olmayan sona), eşitlikte
 * girdi sırası (kalan tur değişince yerinden oynamaz). Kararlı (aynı girdi = aynı sıra).
 */
export function sortByPriority<T extends { id: string; debuff: boolean; turns: number }>(list: readonly T[], priority: readonly string[]): T[] {
  const rank = (id: string): number => {
    const i = priority.indexOf(id);
    return i < 0 ? priority.length : i;
  };
  return list
    .map((b, k) => ({ b, k }))
    .sort((a, b) => Number(b.b.debuff) - Number(a.b.debuff) || rank(a.b.id) - rank(b.b.id) || a.k - b.k)
    .map((x) => x.b);
}

/**
 * MASAÜSTÜ rozet yuvaları (Ömer 2026-11-03: kural her ekran boyunda aynı): buff'lar HEP çubuğun solunda (`dir` -1), debuff'lar HEP sağında (+1);
 * her taraf kendi içinde girdi sırasıyla çubuktan dışa `perRow` rozetlik satırlara dizilir. Hiçbir rozet gizlenmez, hiçbiri karşı tarafa geçmez;
 * bir taraftaki ekleme / çıkarma yalnızca o tarafı etkiler. Dönüş girdiyle aynı sırada.
 */
export function desktopBadgeSlots(debuffs: readonly boolean[], perRow: number): Array<{ dir: -1 | 1; col: number; row: number }> {
  const n = { [-1]: 0, [1]: 0 };
  return debuffs.map((d) => {
    const dir: -1 | 1 = d ? 1 : -1;
    const i = n[dir]++;
    return { dir, col: i % perRow, row: Math.floor(i / perRow) };
  });
}
