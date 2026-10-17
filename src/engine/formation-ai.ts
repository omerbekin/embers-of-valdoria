/**
 * MENZİLE DUYARLI DİZİLİM (YZ; Ömer 2026-10-17, docs/design/range.md). Saf ve belirleyici: Phaser/DOM yok, rastgelelik yalnızca verilen seed'li Rng'den.
 * Yalnızca menzil sistemi açıkken kullanılır (content.ts > defaultSlots / randomSlots); kapalıyken eski planCells birebir.
 *
 * Her dizilim puanlanır (ağırlıklar data/ai.json > formation) ve yerel arama (birimi boş hücreye taşı / iki birimi yer değiştir) en yüksek puana çıkar:
 * - ULAŞMA: birimin ana menzili R, kendi sırası r (boş ön sıralar dahil gerçek derinlik): düşmanın en derin ulaşılan sırası d = R - 1 - r (0..3).
 *   d < 0 (düşmanın ön sırasına bile ulaşamaz) = -unreachable; yoksa +reachValue[d].
 * - GÜVENLİK: kendi tarafının en öndeki DOLU sırasından geride durmak (düşman böyle sayar) = safetyValue[geri] x (safetyBase + safetyFrag x kırılganlık).
 * - TAUNT: taunt skill'i olan birim ön sırada durmalı (düşman yakın dövüşü ona ulaşsın): geride durduğu her sıra -tauntDepth.
 * - GUARD: dost menzilli Guard sahibi, menzilinin dışında kalan her dost için -guardReach x o dostun kırılganlığı.
 * - ALAN: düşmanın alan şekilleri iki kırılganı aynı vuruşta alabiliyorsa -aoe x kır1 x kır2 x (ortak vurulma oranı; kırılganlık aoeFragFrom
 *   altı sayılmaz); tahtanın aoeMaxCover
 *   oranından büyük şekiller (3x3 gibi; dağılmak işe yaramaz) sayılmaz.
 * - jitter (yalnızca rastgele dizilim): birim-hücre başına seed'li küçük gürültü; Randomize her seferinde aynı mantıkla biraz farklı dizer.
 */
import { shapeCells, type ShapeFormation } from './area-shape';
import type { Rng } from './rng';
import type { AreaDef, Side } from './types';

export interface FormationWeights {
  reachValue: number[];
  safetyValue: number[];
  safetyBase: number;
  safetyFrag: number;
  unreachable: number;
  tauntDepth: number;
  guardReach: number;
  aoe: number;
  /** Tahtanın bu oranından fazlasını kaplayan şekiller (ör. 3x3) sayılmaz: dağılmak onlara karşı işe yaramaz. */
  aoeMaxCover: number;
  /** Alan teriminde sayılan en düşük kırılganlık (altındakiler 0; üstü 0..1'e ölçeklenir). */
  aoeFragFrom: number;
  jitter: number;
  maxPasses: number;
}

/** Dizilecek birimin dizilimle ilgili özeti (content.ts sınıf/mob/çağrı verisinden çıkarır). */
export interface PlanUnit {
  /** Ana hasar menzili (Infinity = menzilsiz / global). */
  range: number;
  /** Etkin dayanıklılık (can x zırh). Kırılganlık takım içinde buna göre 0..1 ölçeklenir. */
  ehp: number;
  /** Taunt skill'i var mı? */
  taunt: boolean;
  /** Guard (dost menzilli koruma) skill'inin menzili; yoksa undefined. */
  guardRange?: number;
}

export interface PlanOptions {
  formation: ShapeFormation;
  weights: FormationWeights;
  /** Düşmanın alan şekilleri (bilinmiyorsa çağıran varsayılanı verir; boş = alan tehdidi yok). */
  foeAreas: AreaDef[];
  /** Başlangıç dizilimi (eski kural; yerel arama buradan başlar). */
  start: number[];
  /** Hangi tahtada (alan şeklinin ekran aynası için). */
  board?: Side;
  /** Verilirse jitter uygulanır (rastgele dizilim). */
  rng?: Rng;
}

const coCache = new Map<string, number[][]>();

/**
 * cells x cells: iki hücrenin aynı alan vuruşunda birlikte kalma oranı: şekil başına "a vurulduğunda b de vurulur" olasılığı (a'yı kapsayan
 * anchor'lar içinde), iki yönün ortalaması; şekiller üzerinden ortalama. Aynı sıra (row şekli) / aynı şerit (column) = 1, artı komşusu = 0,5.
 */
function coHit(all: AreaDef[], board: Side, formation: ShapeFormation, maxCover: number): number[][] {
  const n = formation.rows * formation.lanes;
  const key = `${board}|${maxCover}|${JSON.stringify(all)}`;
  const hit = coCache.get(key);
  if (hit) return hit;
  const co = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  // en büyük kapsamı (anchor'lar üzerinden) maxCover'ı aşan şekil sayılmaz
  const areas = all.filter((a) => Math.max(...Array.from({ length: n }, (_, i) => shapeCells(a, i, board, formation).length)) <= maxCover * n);
  for (const area of areas) {
    const both = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
    const hits = Array.from({ length: n }, () => 0);
    for (let anchor = 0; anchor < n; anchor++) {
      const cells = shapeCells(area, anchor, board, formation);
      for (const a of cells) {
        hits[a]! += 1;
        for (const b of cells) if (a !== b) both[a]![b]! += 1;
      }
    }
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        const pa = hits[a] ? both[a]![b]! / hits[a]! : 0;
        const pb = hits[b] ? both[a]![b]! / hits[b]! : 0;
        co[a]![b]! += (pa + pb) / 2 / areas.length;
      }
    }
  }
  coCache.set(key, co);
  return co;
}

/** Dizilim puanlayıcısı (yüksek = iyi): planRangeFormation'ın kullandığı puan; testler ve hata ayıklama için de dışa açık. */
export function formationScorer(units: PlanUnit[], opts: Omit<PlanOptions, 'start'>): (slots: number[]) => number {
  const { formation, weights: w, rng } = opts;
  const lanes = formation.lanes;
  const n = formation.rows * lanes;
  const count = units.length;
  const board = opts.board ?? 'party';
  // kırılganlık: takım içinde en dayanıklı 0, en kırılgan 1 (hepsi eşitse 0,5)
  const lo = Math.min(...units.map((u) => u.ehp));
  const hi = Math.max(...units.map((u) => u.ehp));
  const frag = units.map((u) => (hi > lo ? (hi - u.ehp) / (hi - lo) : 0.5));
  const safeW = frag.map((f) => w.safetyBase + w.safetyFrag * f);
  // alan tehdidinde yalnızca takımın kırılgan yarısı sayılır (kırılganlık aoeFragFrom üstünde, 0..1'e ölçekli): dayanıklılar dağılmaya zorlanmaz
  const squish = frag.map((f) => Math.max(0, (f - w.aoeFragFrom) / (1 - w.aoeFragFrom)));
  const co = opts.foeAreas.length ? coHit(opts.foeAreas, board, formation, w.aoeMaxCover) : undefined;
  const noise = rng ? units.map(() => Array.from({ length: n }, () => (rng.next() * 2 - 1) * w.jitter)) : undefined;
  const at = (arr: number[], i: number) => arr[Math.max(0, Math.min(arr.length - 1, i))]!;

  return (slots: number[]): number => {
    let front = Infinity;
    for (const s of slots) front = Math.min(front, Math.floor(s / lanes));
    let total = 0;
    for (let i = 0; i < count; i++) {
      const u = units[i]!;
      const row = Math.floor(slots[i]! / lanes);
      const back = row - front;
      const reach = u.range === Infinity ? formation.rows - 1 : u.range - 1 - row;
      total += reach < 0 ? -w.unreachable : at(w.reachValue, reach);
      total += at(w.safetyValue, back) * safeW[i]!;
      if (u.taunt) total -= w.tauntDepth * back;
      if (u.guardRange !== undefined) {
        for (let j = 0; j < count; j++) {
          if (j !== i && Math.abs(Math.floor(slots[j]! / lanes) - row) > u.guardRange) total -= w.guardReach * frag[j]!;
        }
      }
      if (co) for (let j = i + 1; j < count; j++) total -= w.aoe * squish[i]! * squish[j]! * co[slots[i]!]![slots[j]!]!;
      if (noise) total += noise[i]![slots[i]!]!;
    }
    return total;
  };
}

/** Menzile duyarlı dizilim: her birimin hücresi (girdiyle aynı sırada). */
export function planRangeFormation(units: PlanUnit[], opts: PlanOptions): number[] {
  const count = units.length;
  if (count === 0) return [];
  const n = opts.formation.rows * opts.formation.lanes;
  const score = formationScorer(units, opts);

  // yerel arama: her turda en iyi tek hamle (taşı ya da yer değiştir); iyileşme yoksa dur. Sıra sabit: belirleyici.
  let cur = [...opts.start];
  let best = score(cur);
  for (let pass = 0; pass < opts.weights.maxPasses; pass++) {
    let move: number[] | undefined;
    let moveScore = best;
    const taken = new Set(cur);
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < n; c++) {
        if (c === cur[i]) continue;
        const next = [...cur];
        const j = taken.has(c) ? cur.indexOf(c) : -1;
        if (j >= 0) next[j] = cur[i]!;
        next[i] = c;
        const s = score(next);
        if (s > moveScore + 1e-9) {
          moveScore = s;
          move = next;
        }
      }
    }
    if (!move) break;
    cur = move;
    best = moveScore;
  }
  return cur;
}
