// Seferde loot'un duruma yazılması (saf; durumu YERİNDE değiştirir, çağıran klonlamış olmalı: state.ts > applyBattle / completeSimple).
// Zar: hash(seed, harita, düğüm, 'loot', tür, oynama sayısı): yenilgi/deneme sayısı ve Retreat loot'u DEĞİŞTİRMEZ (save-scum yok, items.md 3.4).
import { BAG_SIZE, ITEMS, canEquip, itemDef, makeItem, rollLoot, rollRareDrop, type ItemInstance, type LootKind, type RarityId } from '../progression';
import { chapterOf, nodeIlvl } from './power';
import { rngFor } from './seed';
import type { CampaignState, Hero, LootDrop } from './types';

/** Kayıt alanının varsayılanı. */
export const emptyLootState = (): CampaignState['lootState'] => ({ rarePity: 0, clears: {}, rareMisses: 0 });

/**
 * Düğümün loot'unu verir: item'ler torbaya (doluysa sığmayanlar kartta `left`: oyuncu yer açıp alabilir), altın kesesine; `pendingLoot` haritada gösterilecek
 * "Spoils" kartıdır (arayüz onaylayınca `acknowledgeLoot`). Aynı düğümün kaçıncı zaferi olduğu `lootState.clears`'ta sayılır.
 */
export function grantLoot(t: CampaignState, nodeId: string, kind: LootKind, party: Hero[], opts?: { maxItems?: number; gold?: number }): LootDrop {
  const key = `${nodeId}:${kind === 'treasure' ? 'treasure' : 'battle'}`;
  const replay = t.lootState.clears[key] ?? 0;
  const res = rollLoot({
    rng: rngFor(t.seed, t.mapId, nodeId, 'loot', kind, replay),
    kind,
    chapter: chapterOf(t.mapId).chapter,
    ilvl: nodeIlvl(t.mapId, nodeId),
    party: party.map((h) => ({ class: h.class, equipment: h.equipment })),
    replay,
    pity: t.lootState.rarePity,
  });
  // Küçük sandık (cadının bedelli seçenekleri, Ömer 2026-10-12): aynı zardan yalnızca ilk N item + sabit altın
  if (opts?.maxItems !== undefined) {
    res.items.length = Math.min(res.items.length, opts.maxItems);
    res.rarities.length = Math.min(res.rarities.length, opts.maxItems);
    res.forClass.length = Math.min(res.forClass.length, opts.maxItems);
  }
  if (opts?.gold !== undefined) res.gold = opts.gold;
  t.lootState.rarePity = res.pity;
  t.lootState.clears[key] = replay + 1;
  // Ortak nadir düşüş (madde 297): kazanılan her savaşta bir zar (sandık değil); düşüşsüz zafer sayacı kayıtta
  const rare: string[] = [];
  let rareIndex = -1; // nadir düşüşün res.items içindeki sırası (düğümün item seviyesinde zarlanır)
  if (kind !== 'treasure') {
    const rr = rollRareDrop({ rng: rngFor(t.seed, t.mapId, nodeId, 'rare', kind, replay), kind, misses: t.lootState.rareMisses ?? 0, chapter: chapterOf(t.mapId).chapter });
    t.lootState.rareMisses = rr.misses;
    if (rr.item) {
      rareIndex = res.items.length;
      res.items.push(rr.item);
      rare.push(rr.item);
    }
  }
  const items: ItemInstance[] = [];
  const left: string[] = [];
  const leftRolls: Array<ItemInstance['rolls']> = [];
  res.items.forEach((id, i) => {
    // Stat zarları loot seed'inden (Ömer 2026-10-10): aynı düşüş = aynı değerler; kayda yazılır, yüklemede yeniden atılmaz
    // Nadirlik loot zarından (tek tablo, Ömer 2026-10-11); nadir düşüş (Legendary) kendi nadirliğiyle
    const rarity = res.rarities[i];
    const cls = res.forClass[i];
    // Nadir düşüş (Legendary) TABAN SEVİYESİZ: düştüğü düğümün item seviyesinde zarlanır, Endless'taki dalga seviyesi gibi (Ömer 2026-10-12)
    const ilvl = i === rareIndex && itemDef(id) ? nodeIlvl(t.mapId, nodeId) : undefined;
    const rolled = makeItem(id, '', rngFor(t.seed, t.mapId, nodeId, 'roll', kind, replay, i), { ...(rarity ? { rarity } : {}), ...(cls ? { forClass: cls } : {}), ...(ilvl !== undefined ? { ilvl } : {}) });
    if (t.inventory.length < BAG_SIZE) {
      const inst: ItemInstance = { ...rolled, uid: `i${t.nextItemId++}` };
      t.inventory.push(inst);
      items.push(inst);
    } else {
      left.push(id); // torba dolu: Spoils kartında "geride kalan" (madde 280)
      leftRolls.push(rolled.rolls);
    }
  });
  t.gold += res.gold;
  const drop: LootDrop = { node: nodeId, kind, items: items.map((i) => i.uid), gold: res.gold, ...(left.length ? { left, leftRolls } : {}), ...(rare.length ? { rare } : {}) };
  // Aynı düğümde savaş + sandık (korunan hazine): tek kartta birleşir
  const prev = t.pendingLoot;
  if (prev && prev.node === nodeId) {
    const allLeft = [...(prev.left ?? []), ...left];
    const allRolls = [...(prev.left ?? []).map((_, i) => prev.leftRolls?.[i]), ...leftRolls];
    const allRare = [...(prev.rare ?? []), ...rare];
    t.pendingLoot = { node: nodeId, kind, items: [...prev.items, ...drop.items], gold: prev.gold + drop.gold, ...(allLeft.length ? { left: allLeft, leftRolls: allRolls } : {}), ...(allRare.length ? { rare: allRare } : {}) };
  } else {
    // Önceki kart hiç kapatılmadıysa onun geride kalanları burada kaybolur (normal akışta kart her zaman önce kapanır)
    t.pendingLoot = drop;
  }
  return drop;
}

/**
 * Spoils kartında geride kalan bir item'i torbaya alır (yer açıldıysa). `index` = `pendingLoot.left` içindeki sıra. Yer yoksa durum aynen döner.
 */
export function takeLeftover(s: CampaignState, index: number): CampaignState {
  const left = s.pendingLoot?.left ?? [];
  const id = left[index];
  if (id === undefined || s.inventory.length >= BAG_SIZE || !itemDef(id)) return s;
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  const pl = t.pendingLoot!;
  // Zarlar düşüş anında atılmıştı (leftRolls); eski kartta yoksa katalog değeri
  const rolls = pl.leftRolls?.[index];
  const inst: ItemInstance = { uid: `i${t.nextItemId++}`, id, ...(rolls ? { rolls } : {}) };
  t.inventory.push(inst);
  pl.items.push(inst.uid);
  pl.left = left.filter((_, i) => i !== index);
  if (pl.leftRolls) pl.leftRolls = pl.leftRolls.filter((_, i) => i !== index);
  if (!pl.left.length) {
    delete pl.left;
    delete pl.leftRolls;
  }
  return t;
}

/** Spoils kartı kapandı: geride kalan item'ler (varsa) kaybolur. */
export function acknowledgeLoot(s: CampaignState): CampaignState {
  if (!s.pendingLoot) return s;
  const t = JSON.parse(JSON.stringify(s)) as CampaignState;
  delete t.pendingLoot;
  return t;
}

/**
 * Hediye item'i (kasaba diyalog sahnesi; Ömer 2026-10-12): düğümün item seviyesine kadar bir taban, `rarity` nadirliğinde (Common), takımdan biri
 * için zarlanır (seed'li: aynı sefer + düğüm + etiket = aynı item). Torbaya; torba doluysa Spoils kartında "geride kalan". `t` klonlanmış olmalı.
 */
export function grantGift(t: CampaignState, nodeId: string, party: Hero[], tag: string, rarity: RarityId = 'common'): LootDrop | null {
  const ilvl = Math.max(1, nodeIlvl(t.mapId, nodeId));
  const rng = rngFor(t.seed, t.mapId, nodeId, 'gift', tag);
  const bases = ITEMS.items.filter((d) => d.rarity !== 'legendary' && d.ilvl <= ilvl && (!d.family || party.some((h) => canEquip(h.class, d))));
  if (!bases.length) return null;
  const d = bases[rng.int(0, bases.length - 1)]!;
  const fits = party.filter((h) => canEquip(h.class, d));
  const forClass = fits.length ? fits[rng.int(0, fits.length - 1)]!.class : undefined;
  const rolled = makeItem(d.id, '', rngFor(t.seed, t.mapId, nodeId, 'gift-roll', tag), { rarity, ilvl, ...(forClass ? { forClass } : {}) });
  let drop: LootDrop;
  if (t.inventory.length < BAG_SIZE) {
    const inst: ItemInstance = { ...rolled, uid: `i${t.nextItemId++}` };
    t.inventory.push(inst);
    drop = { node: nodeId, kind: 'treasure', items: [inst.uid], gold: 0, gift: true };
  } else drop = { node: nodeId, kind: 'treasure', items: [], gold: 0, gift: true, left: [d.id], leftRolls: [rolled.rolls] };
  const prev = t.pendingLoot;
  t.pendingLoot =
    prev && prev.node === nodeId
      ? { ...prev, items: [...prev.items, ...drop.items], ...(drop.left ? { left: [...(prev.left ?? []), ...drop.left], leftRolls: [...(prev.left ?? []).map((_, i) => prev.leftRolls?.[i]), ...drop.leftRolls!] } : {}) }
      : drop;
  return drop;
}
