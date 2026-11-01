/**
 * Sandık açılış animasyonunun SAF mantığı (Ömer 2026-11-01, taslak public/mockups/chest-open.html > B): DOM'a ve zamanlayıcıya bağımlı değil.
 * - `chestPlan`: kaç sütun, hangi gecikmeyle, hangi renkte ışık sütunu (rank >= 3 = Epic+ geniş sütun + patlama).
 * - `ChestFlow`: dokunma durum makinesi. closed -> opening -> shown -> done. Hızlı geçme (skip) sona atlar; ödül TEK kez teslim edilir
 *   (ikinci dokunma / çift tıklama / skip sonrası tekrar `finish` işe yaramaz).
 */

import { acknowledgeLoot, takeLeftover, type CampaignState } from '../campaign';
import { BAG_SIZE } from '../progression';

export interface ChestPlanItem {
  color: string;
  /** Nadirlik sırası (RARITY_IDS içindeki yer). */
  rank: number;
}

export interface ChestPlanStep {
  index: number;
  color: string;
  /** Sütun ve plaka açılış gecikmesi (ms, dokunmadan sonra). */
  at: number;
  /** Epic ve üstü: geniş sütun + renkli patlama. */
  big: boolean;
}

export interface ChestPlan {
  /** Kapak patlaması (ms). */
  openAt: number;
  /** Altın sayacı başlar / biter (altın yoksa ikisi de -1). */
  goldAt: number;
  goldMs: number;
  steps: ChestPlanStep[];
  /** "Take all" düğmesinin belirdiği an (toplam süre). */
  buttonAt: number;
}

export const CHEST_TIMING = { shakeMs: 200, openMs: 190, spillMs: 260, goldMs: 600, itemGapMs: 300, tailMs: 400 } as const;

/** Zaman çizelgesi: sallanma -> kapak -> altın -> item'ler tek tek 300 ms arayla -> düğme. Item yoksa yalnız altın; ikisi de yoksa doğrudan düğme. */
export function chestPlan(items: ChestPlanItem[], gold: number): ChestPlan {
  const T = CHEST_TIMING;
  const openAt = T.openMs;
  let t = openAt + T.spillMs;
  const hasGold = gold > 0;
  const goldAt = hasGold ? t : -1;
  if (hasGold) t += T.goldMs;
  const steps: ChestPlanStep[] = items.map((it, index) => {
    const step = { index, color: it.color, at: t, big: it.rank >= 3 };
    t += T.itemGapMs;
    return step;
  });
  return { openAt, goldAt, goldMs: hasGold ? T.goldMs : -1, steps, buttonAt: t + T.tailMs };
}

export type ChestPhase = 'closed' | 'opening' | 'shown' | 'done';

export class ChestFlow {
  phase: ChestPhase = 'closed';
  private delivered = false;

  /** Ekrana / sandığa dokunma. 'open' = animasyonu başlat, 'skip' = sona atla, null = bir şey yapma. */
  tap(): 'open' | 'skip' | null {
    if (this.phase === 'closed') {
      this.phase = 'opening';
      return 'open';
    }
    if (this.phase === 'opening') return 'skip';
    return null;
  }

  /** Zaman çizelgesi bitti (ya da skip sona atladı): düğme görünür. */
  reveal(): void {
    if (this.phase === 'opening' || this.phase === 'closed') this.phase = 'shown';
  }

  /** "Take all" / Continue: kapanışı BİR kez verir (true), sonrakiler false. Düğme görünmeden (shown öncesi) verilmez. */
  finish(): boolean {
    if (this.delivered || this.phase !== 'shown') return false;
    this.delivered = true;
    this.phase = 'done';
    return true;
  }
}

/** Ekranın bu sandık düşüşü için daha önce oynatıldığını ayırt eden anahtar (yeniden yüklemede animasyon baştan oynamasın; ödül kayıttadır). */
export function chestKey(drop: { node: string; items: string[]; left?: string[]; gold: number }): string {
  return `${drop.node}|${drop.gold}|${drop.items.join(',')}|${(drop.left ?? []).join(',')}`;
}

/**
 * "Take all" (Ömer 2026-11-01, koordinatör kararı): LOOT ekranının takeAll kuralıyla aynı: geride kalan item'ler torba doldukça alınır.
 * Hepsi alındıysa ganimet kaydı kapanır (`done`: LOOT ekranı açılmaz); torba doluysa / sığmayan varsa durum LOOT ekranına bırakılır (oyuncu seçer,
 * bırakılan kaybolur kuralı aynı). `hasItems` yoksa (yalnız altın) hiçbir şey yapılmaz: düğme Continue'dur ve LOOT ekranı açılır.
 * Düşüşte torbaya giren item'ler zaten torbadadır (`left` yoksa alınacak bir şey kalmamıştır). Saf: yeni durum döner.
 */
export function chestClaim(s: CampaignState, hasItems: boolean): { state: CampaignState; done: boolean } {
  if (!hasItems || !s.pendingLoot) return { state: s, done: false };
  let t = s;
  while ((t.pendingLoot?.left?.length ?? 0) > 0 && t.inventory.length < BAG_SIZE) {
    const n = takeLeftover(t, 0);
    if (n === t) break;
    t = n;
  }
  if ((t.pendingLoot?.left?.length ?? 0) > 0) return { state: t, done: false };
  return { state: acknowledgeLoot(t), done: true };
}
