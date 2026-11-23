// Set item ölçümü (r41 İş 2, Ömer 2026-11-23): set parçası (2 / 3 / 4) taşıyan bir kahramanın takımı, aynı item seviyesinde sıradan Epic taşıyana
// göre ne kadar daha çok kazanıyor? YALNIZCA ölçer: data/ ve motor kurallarına dokunmaz; setsEnabled bayrağı gerekmez (bonuslar takılı
// parçadan çalışır, bayrak yalnız düşüşü ve Codex'i açar: src/progression/sets.ts).
//
// Kullanım: npx tsx src/sim/set-sim.ts <savaş> <seed[,seed2]> [--sets=ashguard_vigil,...] [--none] [--variants=none,epic,k2,...] [--out=dosya.json]
//
// Yöntem (hızlı savaş 4e 4, standart rastgele takımlar, herkes aynı level = setin item seviyesi, stat puanı oyuncu vekili gibi; ağaç yok, item yok):
// - Savaş başına tek TAŞIYICI: oyuncu tarafında seti giyebilen birimlerden biri (seed'li seçim). Giyebilen yoksa seed atlanır; sayılan savaş
//   `<savaş>` olana kadar seed ilerler (iki seed grubu ayrı ayrı).
// - Varyantlar aynı seed'lerle: none (yalnız --none: taşıyıcıda item yok), epic (setin yuvaları sıradan Epic), k parça (k set parçası + kalan set yuvaları Epic).
//   Hangi yuvaların set parçası olduğu seed'e göre döner. Epic tabanı: o yuvanın, sınıfın giyebildiği, set/Legendary olmayan en yüksek nadirlikli
//   tabanı (eşitse seed'le seçilir), Epic zarlanır. Zarlar seed + yuvaya bağlı: epic ve k varyantında aynı yuvanın Epic'i aynıdır.
// - Ölçü: oyuncu tarafı kazanma oranı (taşıyıcı sınıfına göre de dökülür). Fark = varyant - epic.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Rng, content, type BattleSetup, type UnitSetup } from '../engine';
import { ITEMS, canEquip, makeItem, emptyEquipment, type Equipment, type ItemDef, type ItemInstance, type SlotId } from '../progression/items';
import { autoAllocate, statPointsAt, type LevelHero } from '../progression/levels';
import { loadoutSetup } from '../progression/loadout';
import { SETS, setPieces, type SetDef } from '../progression/sets';
import { simulate } from './simulate';
import { levelUnit, treeBattleSetup } from './tree-sim';

const RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, epic: 3 };

/** Seti giyebilen sınıflar (parçaların usableBy birleşimi; yoksa havuzun tamamı). */
export function setClasses(set: SetDef): string[] {
  const pieces = setPieces(set.id);
  return content.randomPool.filter((c) => pieces.every((p) => canEquip(c, p)));
}

export const setIlvl = (set: SetDef): number => Math.max(...setPieces(set.id).map((p) => p.ilvl ?? 1));

/** Yuvanın sıradan Epic adayları: sınıfın giyebildiği, set / Legendary olmayan en yüksek nadirlikli tabanlar. */
export function epicBases(cls: string, slot: string): ItemDef[] {
  const pool = (ITEMS.items as ItemDef[]).filter((d) => d.slot === slot && !d.set && d.rarity !== 'legendary' && canEquip(cls, d));
  const top = Math.max(-1, ...pool.map((d) => RANK[d.rarity] ?? 0));
  return pool.filter((d) => (RANK[d.rarity] ?? 0) === top);
}

/** Taşıyıcının ekipmanı: `pieces` adet set parçası (yuva sırası seed'e göre döner), kalan set yuvaları Epic. pieces < 0 = hiç item. */
export function wearerEquipment(set: SetDef, cls: string, pieces: number, seed: number): Partial<Equipment> {
  const eq: Partial<Equipment> = emptyEquipment();
  if (pieces < 0) return eq;
  const ilvl = setIlvl(set);
  const n = set.slots.length;
  const start = seed % n;
  const setSlots = new Set(Array.from({ length: Math.min(pieces, n) }, (_, i) => set.slots[(start + i) % n]!));
  set.slots.forEach((slot, si) => {
    const rng = new Rng(((seed * 7919) ^ ((si + 1) * 104729)) >>> 0);
    let inst: ItemInstance | null = null;
    if (setSlots.has(slot)) {
      const p = setPieces(set.id).find((d) => d.slot === slot);
      if (p) inst = makeItem(p.id, `set-${slot}`, rng, { forClass: cls });
    } else {
      const bases = epicBases(cls, slot);
      if (bases.length) inst = makeItem(bases[rng.int(0, bases.length - 1)]!.id, `epic-${slot}`, rng, { rarity: 'epic', forClass: cls, ilvl });
    }
    (eq as Record<SlotId, ItemInstance | null>)[slot as SlotId] = inst;
  });
  return eq;
}

function wearerUnit(cls: string, level: number, equipment: Partial<Equipment>): UnitSetup {
  const h: LevelHero = { id: cls, class: cls, level, statPoints: statPointsAt(level), alloc: {} };
  autoAllocate(h);
  return loadoutSetup({ class: cls, level, alloc: h.alloc ?? {}, equipment });
}

/** Taşıyıcı: oyuncu tarafında seti giyebilen birimlerden seed'li biri (indeks); yoksa -1. */
export function pickWearer(seed: number, set: SetDef): number {
  const ok = new Set(setClasses(set));
  const idx = content
    .battleSetup(content.DEFAULT_BATTLE, seed, 'turns')
    .party.map((d, i) => (ok.has(d.id) ? i : -1))
    .filter((i) => i >= 0);
  return idx.length ? idx[new Rng((seed * 31 + 7) >>> 0).int(0, idx.length - 1)]! : -1;
}

/** Sayılacak seed'ler: `first`ten başlayıp taşıyıcısı olan ilk `runs` seed. */
export function eligibleSeeds(runs: number, first: number, set: SetDef): number[] {
  const out: number[] = [];
  for (let s = first; out.length < runs; s++) if (pickWearer(s, set) >= 0) out.push(s);
  return out;
}

export function setBattleSetup(seed: number, set: SetDef, pieces: number): BattleSetup {
  const level = setIlvl(set);
  const setup = treeBattleSetup(seed, (_side, cls) => levelUnit(cls, level));
  const w = pickWearer(seed, set);
  if (w < 0) return setup;
  const cls = setup.party[w]!.id;
  const pu = setup.party.map((_, i) => setup.partyUnits?.[i]);
  pu[w] = { ...(pu[w] ?? {}), ...wearerUnit(cls, level, wearerEquipment(set, cls, pieces, seed)) };
  return { ...setup, partyUnits: pu };
}

export interface SetVariantOut {
  games: number;
  wins: number;
  byClass: Record<string, { games: number; wins: number }>;
}

export function runSetVariant(seeds: readonly number[], set: SetDef, pieces: number): SetVariantOut {
  const out: SetVariantOut = { games: 0, wins: 0, byClass: {} };
  simulate(seeds.length, 0, content.DEFAULT_BATTLE, {}, {
    setupFor: (i) => setBattleSetup(seeds[i]!, set, pieces),
    observer: {
      end(battle, setup, i) {
        const w = pickWearer(seeds[i]!, set);
        const cls = setup.party[w]!.id;
        const won = battle.winner === 'party' ? 1 : 0;
        out.games++;
        out.wins += won;
        const c = (out.byClass[cls] ??= { games: 0, wins: 0 });
        c.games++;
        c.wins += won;
      },
    },
  });
  return out;
}

/** Bir setin tüm varyantları (none, epic, her eşik) iki seed grubunda; sonuç seed grupları birleşik. */
export function measureSet(runs: number, seedStarts: readonly number[], set: SetDef, withNone = false, pick?: readonly string[]): Record<string, SetVariantOut> {
  const seeds = seedStarts.flatMap((f) => eligibleSeeds(runs, f, set));
  const variants: Array<[string, number]> = [...(withNone ? ([['none', -1]] as Array<[string, number]>) : []), ['epic', 0], ...set.thresholds.map((k) => [`k${k}`, k] as [string, number])];
  const res: Record<string, SetVariantOut> = {};
  for (const [name, k] of variants.filter(([n]) => !pick || pick.includes(n))) res[name] = runSetVariant(seeds, set, k);
  return res;
}

const pct = (w: number, g: number) => (g ? (100 * w) / g : 0);
const err = (a: { wins: number; games: number }, b: { wins: number; games: number }) => {
  const p = a.wins / a.games;
  const q = b.wins / b.games;
  return 196 * Math.sqrt((p * (1 - p)) / a.games + (q * (1 - q)) / b.games);
};

function main(argv: string[]) {
  const pos = argv.filter((a) => !a.startsWith('--'));
  const flag = (n: string) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const runs = Number(pos[0] ?? 1000);
  const seeds = (pos[1] ?? '1').split(',').map(Number);
  const want = flag('sets')?.split(',');
  const sets = SETS.filter((s) => !want || want.includes(s.id));
  const all: Record<string, unknown> = {};
  for (const set of sets) {
    const t0 = Date.now();
    const r = measureSet(runs, seeds, set, argv.includes('--none'), flag('variants')?.split(','));
    all[set.id] = { ilvl: setIlvl(set), classes: setClasses(set), variants: r };
    const e = r.epic ?? Object.values(r)[0]!;
    const line = Object.entries(r)
      .map(([k, v]) => `${k} ${pct(v.wins, v.games).toFixed(2)}${k === 'epic' ? '' : ` (${(pct(v.wins, v.games) - pct(e.wins, e.games)).toFixed(3)} ±${err(v, e).toFixed(1)})`}`)
      .join(' | ');
    console.log(`${set.id} ilvl ${setIlvl(set)} n=${e.games}: ${line}  [${((Date.now() - t0) / 1000).toFixed(0)} sn]`);
    const out = flag('out');
    if (out) writeFileSync(out, JSON.stringify({ runs, seeds, sets: all }, null, 1));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2));
