// Loot üretimi (saf, seed'li; Phaser/DOM yok). Tasarım: docs/design/progression/items.md 3.1-3.4; Ömer kararları: düşen item sayısı ve
// nadirlik her zorlukta AYNI (karar 6), boss/hazine düşüşleri otomatik (karar 8), tekrar oynamada azalan ödül (roadmap 2.3 A).
// Nadirlik (Ömer onayı 2026-10-11): tek ağırlık tablosu (drop.ts; item seviyesi ve elit / boss / hazine hafif kaydırır), sonra taban item seçilir
// (taban nadirlikten bağımsız). Sefer (src/campaign/loot.ts) bunu kullanır; rastgelelik yalnızca verilen Rng'den.
import type { Rng } from '../engine/rng';
import { rollDropRarity, type DropKind } from './drop';
import { classWeaponFamilies, ITEMS, RARITY_IDS, SLOT_IDS, instanceIP, itemDef, type Equipment, type ItemDef, type LootKind, type RarityId, type SlotId } from './items';

export interface LootInput {
  rng: Rng;
  kind: LootKind;
  /** Bölüm (1..3): bilgi (nadirlik artık item seviyesine göre kayar). */
  chapter: number;
  /** Düğümün item seviyesi: bu seviyeye kadar olan taban item'ler düşer; nadirlik tablosunu hafifçe kaydırır. */
  ilvl: number;
  /** Aktif takım (sınıf + takılı item'ler): takım boyutu, "akıllı" yuva ve kullanılabilir silah ailesi için. */
  party: Array<{ class: string; equipment?: Partial<Equipment> }>;
  /** Kaçıncı zafer (0 = ilk). Tekrarda azalan ödül, nadirlik tavanı; garanti/pity yalnızca ilk zaferde. */
  replay?: number;
  /** Art arda Rare'siz düşüş sayacı (pity). */
  pity?: number;
}

export interface LootResult {
  /** Düşen taban item id'leri (sırayla). */
  items: string[];
  /** Her item'in zarlanan nadirliği (items ile aynı sırada; örnek bu nadirlikle oluşturulur). */
  rarities: RarityId[];
  gold: number;
  /** Güncel pity sayacı. */
  pity: number;
}

const rIdx = (r: RarityId) => RARITY_IDS.indexOf(r);

/** Kesirli beklentiyi seed'li yuvarlar (taban + kalan olasılık). */
function roundChance(rng: Rng, v: number): number {
  const base = Math.floor(v);
  return base + (rng.next() < v - base ? 1 : 0);
}

/** Loot türü -> nadirlik kayması türü. */
const dropKind = (k: LootKind): DropKind => (k === 'battle' ? 'normal' : k);

/** Takımdaki en zayıf yuva (boş = 0 IP); eşitlikte seed'li seçim. */
function weakestSlot(rng: Rng, party: LootInput['party']): SlotId {
  let best = Infinity;
  let slots: SlotId[] = [];
  for (const h of party)
    for (const k of SLOT_IDS) {
      const inst = h.equipment?.[k];
      const ip = inst && itemDef(inst.id) ? instanceIP(inst) : 0;
      if (ip < best) {
        best = ip;
        slots = [k];
      } else if (ip === best && !slots.includes(k)) slots.push(k);
    }
  return slots.length ? slots[rng.int(0, slots.length - 1)]! : SLOT_IDS[rng.int(0, SLOT_IDS.length - 1)]!;
}

/**
 * Taban item seç (Legendary hariç; nadirlikten bağımsız): yuva (+ silahta aile), ilvl <= düğüm ilvl'si. Uygun yoksa önce aile/yuva gevşer,
 * sonra seviye (en düşük ilvl'li tabanlar).
 */
function pickBase(rng: Rng, slot: SlotId, family: string | undefined, ilvl: number): ItemDef | undefined {
  const bases = ITEMS.items.filter((d) => d.rarity !== 'legendary');
  const fit = (useSlot: boolean, capIlvl: boolean) => bases.filter((d) => (!useSlot || (d.slot === slot && (slot !== 'weapon' || !family || d.family === family))) && (!capIlvl || d.ilvl <= ilvl));
  const choose = (pool: ItemDef[]) => pool[rng.int(0, pool.length - 1)];
  for (const useSlot of [true, false]) {
    const pool = fit(useSlot, true);
    if (pool.length) return choose(pool);
  }
  const all = fit(false, false).sort((a, b) => a.ilvl - b.ilvl);
  return all.length ? choose(all.filter((d) => d.ilvl === all[0]!.ilvl)) : undefined;
}

/** Bir zaferin / sandığın loot'u (items.md 3.1-3.4). Aynı Rng durumu + aynı girdi = aynı sonuç. */
export function rollLoot(o: LootInput): LootResult {
  const L = ITEMS.loot;
  const rng = o.rng;
  const replay = Math.max(0, o.replay ?? 0);
  const rep = L.repeat[Math.min(replay, L.repeat.length - 1)]!;
  const first = replay === 0;
  const n = Math.max(1, o.party.length);
  const expected = o.kind === 'treasure' ? L.treasureBase + L.treasurePerMember * n : L.perPartyMember[o.kind] * n;
  let count = roundChance(rng, expected * rep.items);
  if (first) count = Math.max(count, L.minItems[o.kind] ?? 0);
  const families = [...new Set(o.party.flatMap((h) => classWeaponFamilies(h.class)))];
  const minR = first ? L.minRarity[o.kind] : undefined;
  const cap = rIdx(rep.maxRarity);
  let pity = o.pity ?? 0;
  const items: string[] = [];
  const rarities: RarityId[] = [];
  for (let i = 0; i < count; i++) {
    let r = rIdx(rollDropRarity(rng, o.ilvl, dropKind(o.kind)));
    let floor = 0;
    if (i === 0 && minR) floor = rIdx(minR);
    if (first && pity >= L.pity.rareAfter) floor = Math.max(floor, rIdx('rare'));
    // Legendary bu tablodan çıkmaz (madde 296/297: yalnızca ortak nadir düşüş zarı): en çok Epic
    r = Math.min(Math.max(r, floor), cap, rIdx('epic'));
    const slot = rng.next() < L.smartSlotChance ? weakestSlot(rng, o.party) : SLOT_IDS[rng.int(0, SLOT_IDS.length - 1)]!;
    let family: string | undefined;
    if (slot === 'weapon') {
      const all = ITEMS.weaponFamilies.map((f) => f.id);
      const usable = families.length && rng.next() < L.usableWeaponChance ? families : all;
      family = usable[rng.int(0, usable.length - 1)];
    }
    const d = pickBase(rng, slot, family, o.ilvl);
    if (!d) continue;
    items.push(d.id);
    rarities.push(RARITY_IDS[r]!);
    if (first) pity = r >= rIdx('rare') ? 0 : pity + 1;
  }
  const gold = Math.round((L.gold[o.kind] ?? 0) * Math.max(1, o.ilvl) * rep.gold);
  return { items, rarities, gold, pity };
}
