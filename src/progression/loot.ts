// Loot üretimi (saf, seed'li; Phaser/DOM yok). Tasarım: docs/design/progression/items.md 3.1-3.4; Ömer kararları: düşen item sayısı ve
// nadirlik her zorlukta AYNI (karar 6), boss/hazine düşüşleri otomatik (karar 8), tekrar oynamada azalan ödül (roadmap 2.3 A).
// Nadirlik (Ömer onayı 2026-10-11): tek ağırlık tablosu (drop.ts; item seviyesi ve elit / boss / hazine hafif kaydırır), sonra taban item seçilir
// (taban nadirlikten bağımsız). Sefer (src/campaign/loot.ts) bunu kullanır; rastgelelik yalnızca verilen Rng'den.
import type { Rng } from '../engine/rng';
import { rollDropRarity, type DropKind } from './drop';
import { classUsesOffhand, classWeaponFamilies, fitsSlot, ITEMS, offhandBlocker, RARITY_IDS, SLOT_IDS, instanceIP, itemDef, type Equipment, type ItemDef, type LootKind, type RarityId, type SlotId } from './items';

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
  /** Eski Rare pity sayacı: 2026-10-11'den beri kullanılmaz (Ömer: pity ve "en az bir Rare" kalktı, nadirliği tablo belirler); aynen döner. */
  pity?: number;
}

export interface LootResult {
  /** Düşen taban item id'leri (sırayla). */
  items: string[];
  /** Her item'in zarlanan nadirliği (items ile aynı sırada; örnek bu nadirlikle oluşturulur). */
  rarities: RarityId[];
  /** Her item kimin için zarlansın (silahta ailesini kullanan takım üyesi; affix ağırlığı ve ana affix için); yoksa undefined. */
  forClass: Array<string | undefined>;
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
      // İkinci el: sınıf kullanamıyorsa ya da çift el silah kapatıyorsa "boş yuva" sayılmaz
      if (k === 'offhand' && (!classUsesOffhand(h.class) || offhandBlocker(h.equipment ?? {}))) continue;
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
  const fit = (useSlot: boolean, capIlvl: boolean) =>
    bases.filter((d) => (!useSlot || (fitsSlot(d, slot) && ((slot !== 'weapon' && slot !== 'offhand') || !family || d.family === family))) && (!capIlvl || d.ilvl <= ilvl));
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
  const cap = rIdx(rep.maxRarity);
  const items: string[] = [];
  const rarities: RarityId[] = [];
  const forClass: Array<string | undefined> = [];
  for (let i = 0; i < count; i++) {
    // Nadirliği yalnızca tablo belirler (Ömer 2026-10-11: boss / hazine "en az Rare" ve Rare pity kalktı); Legendary bu tablodan çıkmaz: en çok Epic
    const r = Math.min(rIdx(rollDropRarity(rng, o.ilvl, dropKind(o.kind))), cap, rIdx('epic'));
    const slot = rng.next() < L.smartSlotChance ? weakestSlot(rng, o.party) : SLOT_IDS[rng.int(0, SLOT_IDS.length - 1)]!;
    let family: string | undefined;
    if (slot === 'weapon' || slot === 'offhand') {
      // İkinci el (2026-10-12): yalnızca ikinci el item'i olan aileler (kalkan: Maces & Shields, hançer)
      const all = ITEMS.weaponFamilies.map((f) => f.id).filter((f) => slot === 'weapon' || ITEMS.items.some((d) => d.family === f && d.rarity !== 'legendary' && fitsSlot(d, 'offhand')));
      const fams = families.filter((f) => all.includes(f));
      const usable = fams.length && rng.next() < L.usableWeaponChance ? fams : all;
      family = usable[rng.int(0, usable.length - 1)];
    }
    const d = pickBase(rng, slot, family, o.ilvl);
    if (!d) continue;
    items.push(d.id);
    rarities.push(RARITY_IDS[r]!);
    forClass.push(d.family ? o.party.find((h) => classWeaponFamilies(h.class).includes(d.family ?? ''))?.class : undefined);
  }
  const gold = Math.round((L.gold[o.kind] ?? 0) * Math.max(1, o.ilvl) * rep.gold);
  return { items, rarities, forClass, gold, pity: o.pity ?? 0 };
}
