// Respec malzemeleri (Ömer 2026-11-14): Tome of Unlearning (skill ağacı sıfırlama), Draught of Rebirth (stat puanları geri).
// Yalnız boss loot'u ve tüccar stoğu; şans ve fiyat var olan item nadirlik / fiyat tablolarından türer; YZ / sim kullanmaz.
// Ağaçta Confirm adımı kalktı: düğümü basılı tutmak stat kutusu gibi 1 puanı hemen işler (stat-hold.ts > createHold + tree-tab-model.ts > spendOne).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import consumables from '../data/consumables.json';
import itemsJson from '../data/items.json';
import campaignJson from '../data/campaign/campaign.json';
import {
  activeHeroes,
  addSupply,
  buySupplyWare,
  campaignSupplyStock,
  debugTeleport,
  grantLoot,
  newCampaign,
  nodeIlvl,
  normalizeState,
  openCampaignShop,
  respecChance,
  respecSpent,
  respecSupplies,
  respecSupplyPrice,
  rollRespecDrop,
  ELITE_MULT,
  FALLEN_NO_RESPEC,
  supplyBlocked,
  supplyColor,
  supplyCount,
  supplyDef,
  supplyRarityName,
  useSupply,
  type CampaignState,
} from '../src/campaign';
import { simUseSupplies } from '../src/sim/campaign';
import { dropChances } from '../src/progression/drop';
import { treeOf, TREE_RULES } from '../src/progression/skill-tree-data';
import { rankOf, spent } from '../src/progression/skill-tree';
import { applyTree, type TreeHero } from '../src/progression/skill-tree-hero';
import { makeSession, spendOne } from '../src/ui/tree-tab-model';
import { createHold, type HoldClock } from '../src/ui/stat-hold';
import { respecCardTag, respecConfirmText } from '../src/ui/supply-respec';

const TOME = 'tome_of_unlearning';
const DRAUGHT = 'draught_of_rebirth';
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const at = (node: string, seed = 5): CampaignState => debugTeleport(newCampaign({ mode: 'normal', seed }), node);
const base = (): CampaignState => {
  const s = at('moor', 4242);
  delete s.supplies;
  return s;
};

/** Elle sürülen zaman (stat-hold.test.ts ile aynı). */
function clock() {
  let t = 0;
  let id = 0;
  let q: Array<{ id: number; fn: (ts: number) => void }> = [];
  const c: HoldClock = {
    now: () => t,
    raf: (fn) => {
      q.push({ id: ++id, fn });
      return id;
    },
    caf: (i) => {
      q = q.filter((x) => x.id !== i);
    },
  };
  const advance = (ms: number): void => {
    const end = t + ms;
    while (t < end) {
      t = Math.min(end, t + 16);
      const run = q;
      q = [];
      for (const r of run) r.fn(t);
    }
  };
  return { c, advance };
}

describe('respec supplies: data', () => {
  it('two new supplies; neither is in any battle / elite / boss / treasure drop table', () => {
    expect(supplyDef(TOME)).toMatchObject({ name: 'Tome of Unlearning', resetTree: true });
    expect(supplyDef(DRAUGHT)).toMatchObject({ name: 'Draught of Rebirth', resetStats: true });
    for (const row of Object.values(consumables.drops)) {
      expect(Object.keys(row.weights)).not.toContain(TOME);
      expect(Object.keys(row.weights)).not.toContain(DRAUGHT);
    }
    // tek kaynaklar: boss ve tüccar
    for (const d of respecSupplies()) expect(Object.keys(d.from ?? {}).sort()).toEqual(['boss', 'merchant']);
    expect(respecSupplies().map((d) => d.id)).toEqual([TOME, DRAUGHT]);
  });

  it('frame: Draught = Epic colour; Tome = Rare-Epic blend, closer to Epic', () => {
    const col = (id: string) => itemsJson.rarities.find((r) => r.id === id)!.color;
    expect(supplyColor(supplyDef(DRAUGHT)!)).toBe(col('epic'));
    expect(supplyRarityName(supplyDef(DRAUGHT)!)).toBe('Epic');
    expect(supplyRarityName(supplyDef(TOME)!)).toBe('Rare-Epic');
    const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const t = rgb(supplyColor(supplyDef(TOME)!)!);
    const dist = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]!));
    expect(dist(t, rgb(col('epic')))).toBeLessThan(dist(t, rgb(col('rare'))));
  });
});

describe('respec supplies: chance and price come from the item tables', () => {
  it('boss chance = mean of Rare and Epic (Tome) / Epic (Draught) item chance at the boss item level', () => {
    for (const ilvl of [5, 12, 30]) {
      const c = dropChances(ilvl, 'boss');
      expect(respecChance(supplyDef(TOME)!, 'boss', ilvl)).toBeCloseTo((c.rare + c.epic) / 2 / 100, 10);
      expect(respecChance(supplyDef(DRAUGHT)!, 'boss', ilvl)).toBeCloseTo(c.epic / 100, 10);
    }
  });

  it('merchant chance uses the shelves\' normal roll; price = mean item price of those rarities', () => {
    const c = dropChances(10, 'normal');
    expect(respecChance(supplyDef(TOME)!, 'merchant', 10)).toBeCloseTo((c.rare + c.epic) / 2 / 100, 10);
    expect(respecChance(supplyDef(DRAUGHT)!, 'merchant', 10)).toBeCloseTo(c.epic / 100, 10);
    const M = campaignJson.merchant;
    const p = (r: 'rare' | 'epic', ilvl: number) => M.priceBase[r] * (1 + M.pricePerIlvl * ilvl);
    expect(respecSupplyPrice(supplyDef(TOME)!, 10)).toBe(Math.round((p('rare', 10) + p('epic', 10)) / 2));
    expect(respecSupplyPrice(supplyDef(DRAUGHT)!, 10)).toBe(Math.round(p('epic', 10)));
  });

  it('no number is hard-coded in the code: the rules live in data/consumables.json', () => {
    const src = readFileSync('src/campaign/supplies.ts', 'utf8');
    expect(src).not.toMatch(/tome_of_unlearning|draught_of_rebirth/);
  });
});

describe('respec supplies: sources (boss and merchant only)', () => {
  it('boss first clear: seeded, rate close to the derived chance; replays drop nothing', () => {
    const s = base();
    const ilvl = 20;
    let tome = 0;
    let draught = 0;
    const N = 3000;
    for (let i = 0; i < N; i++) {
      const t = clone(s);
      const d = rollRespecDrop(t, `b${i}`, 'boss', 0, ilvl);
      if (d[TOME]) tome++;
      if (d[DRAUGHT]) draught++;
      expect(rollRespecDrop(clone(s), `b${i}`, 'boss', 0, ilvl)).toEqual(d);
    }
    expect(Math.abs(tome / N - respecChance(supplyDef(TOME)!, 'boss', ilvl))).toBeLessThan(0.02);
    expect(Math.abs(draught / N - respecChance(supplyDef(DRAUGHT)!, 'boss', ilvl))).toBeLessThan(0.015);
  });

  it('every victory rolls (Ömer 2026-11-14): replays roll too, seeded and different from the first clear', () => {
    const s = base();
    let drops = 0;
    let differs = 0;
    for (let i = 0; i < 1500; i++) {
      const r1 = rollRespecDrop(clone(s), `b${i}`, 'boss', 1, 20);
      expect(rollRespecDrop(clone(s), `b${i}`, 'boss', 1, 20)).toEqual(r1);
      if (Object.keys(r1).length) drops++;
      if (JSON.stringify(r1) !== JSON.stringify(rollRespecDrop(clone(s), `b${i}`, 'boss', 0, 20))) differs++;
    }
    expect(drops).toBeGreaterThan(0);
    expect(differs).toBeGreaterThan(0);
  });

  it('elite chance = boss chance x data multiplier (0.5), per supply; rate matches', () => {
    expect(consumables.respecEliteMult).toBe(0.5);
    expect(ELITE_MULT).toBe(0.5);
    for (const d of [supplyDef(TOME)!, supplyDef(DRAUGHT)!])
      for (const ilvl of [1, 5, 10, 20]) expect(respecChance(d, 'elite', ilvl)).toBeCloseTo(respecChance(d, 'boss', ilvl) * 0.5, 12);
    const ilvl = 20;
    let tome = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) if (rollRespecDrop(clone(base()), `e${i}`, 'elite', i % 3, ilvl)[TOME]) tome++;
    expect(Math.abs(tome / N - respecChance(supplyDef(TOME)!, 'elite', ilvl))).toBeLessThan(0.015);
  });

  it('battle and treasure give nothing; elite grantLoot can give them on replays too', () => {
    expect(rollRespecDrop(clone(base()), 'x', 'battle', 0, 20)).toEqual({});
    expect(rollRespecDrop(clone(base()), 'x', 'treasure', 0, 20)).toEqual({});
  });

  it('battle, elite and treasure never give them (grantLoot, many nodes)', () => {
    const s = base();
    for (const kind of ['battle', 'treasure'] as const)
      for (let i = 0; i < 300; i++) {
        const t = clone(s);
        const d = grantLoot(t, `x${i}`, kind, activeHeroes(t));
        expect(Object.keys(d.supplies ?? {})).not.toContain(TOME);
        expect(Object.keys(d.supplies ?? {})).not.toContain(DRAUGHT);
        expect(supplyCount(t, TOME) + supplyCount(t, DRAUGHT)).toBe(0);
      }
  });

  it('boss grantLoot can give them, and they land in the save and on the Spoils card', () => {
    const s = base();
    let hit = '';
    for (let i = 0; i < 400 && !hit; i++) {
      const t = clone(s);
      const d = grantLoot(t, `boss${i}`, 'boss', activeHeroes(t));
      const id = [TOME, DRAUGHT].find((x) => d.supplies?.[x]);
      if (id) {
        hit = id;
        expect(supplyCount(t, id)).toBe(1);
        expect(t.pendingLoot?.supplies?.[id]).toBe(1);
      }
    }
    expect(hit).not.toBe('');
  });

  it('merchant shelf: seeded per stock, priced from the item prices, bought with gold (no bag slot)', () => {
    const s = at('camp');
    const ilvl = Math.max(1, nodeIlvl(s.mapId, 'camp'));
    let tome = 0;
    const N = 1500;
    for (let r = 0; r < N; r++) {
      const sup = campaignSupplyStock(s, 'camp', r);
      expect(campaignSupplyStock(s, 'camp', r)).toEqual(sup);
      for (const w of sup) expect(w.price).toBe(respecSupplyPrice(supplyDef(w.id)!, ilvl));
      if (sup.some((w) => w.id === TOME)) tome++;
    }
    expect(Math.abs(tome / N - respecChance(supplyDef(TOME)!, 'merchant', ilvl))).toBeLessThan(0.025);
    // satın alma
    let shop = openCampaignShop({ ...s, gold: 5000, inventory: [] });
    shop = { ...shop, shop: { ...shop.shop!, supplies: [{ id: TOME, price: 140 }] } };
    const bag = shop.inventory.length;
    const after = buySupplyWare(shop, 0);
    expect(after.gold).toBe(5000 - 140);
    expect(supplyCount(after, TOME)).toBe(1);
    expect(after.inventory.length).toBe(bag);
    expect(after.shop!.supplies![0]!.sold).toBe(true);
    expect(() => buySupplyWare(after, 0)).toThrow(/Sold out/);
    expect(() => buySupplyWare({ ...shop, gold: 10 }, 0)).toThrow(/Not enough gold/);
  });

  it('save: the shelf survives a reload; broken entries are dropped', () => {
    const s = openCampaignShop({ ...at('camp'), gold: 500, inventory: [] });
    const t = { ...s, shop: { ...s.shop!, supplies: [{ id: TOME, price: 140 }, { id: 'nope', price: 5 }, { id: DRAUGHT, price: -1 }] } } as CampaignState;
    const back = normalizeState(clone(t))!;
    expect(back.shop!.supplies).toEqual([{ id: TOME, price: 140 }]);
  });
});

describe('respec supplies: use', () => {
  const withHero = (s: CampaignState, patch: Record<string, unknown>): { s: CampaignState; id: string } => {
    const id = activeHeroes(s)[0]!.id;
    return { id, s: { ...s, roster: s.roster.map((h) => (h.id === id ? { ...h, ...patch } : h)) } };
  };
  const give = (s: CampaignState, id: string): CampaignState => {
    const t = clone(s);
    addSupply(t, id, 1);
    return t;
  };

  it('Tome resets the whole skill tree, points return, one is used; blocked with nothing spent', () => {
    const s0 = base();
    const h0 = activeHeroes(s0)[0]!;
    const tree = treeOf(h0.class)!;
    const { s, id } = withHero(s0, { level: 10, skillPoints: 6, tree: { v: tree.version, r: { '1.f1': 3 } }, freeRespec: true });
    const hero = s.roster.find((h) => h.id === id)!;
    expect(respecSpent(hero, TOME)).toBe(3);
    expect(supplyBlocked(give(s, TOME), TOME, id)).toBeNull();
    const a = useSupply(give(s, TOME), TOME, id);
    const h = a.roster.find((x) => x.id === id)!;
    expect(h.tree).toBeUndefined();
    expect(h.skillPoints).toBe(9);
    expect(h.freeRespec).toBeUndefined();
    expect(supplyCount(a, TOME)).toBe(0);
    expect(a.gold).toBe(s.gold); // gold respec yok: bedel malzemenin kendisi
    expect(supplyBlocked(give(a, TOME), TOME, id)).toBe('No skill points to reset');
  });

  it('a fallen hero cannot use Tome or Draught (live heroes only)', () => {
    const { s, id } = withHero(base(), { statPoints: 1, alloc: { str: 3, dex: 1 }, alive: false, hpRatio: 0 });
    expect(supplyBlocked(give(s, DRAUGHT), DRAUGHT, id)).toBe(FALLEN_NO_RESPEC);
    expect(supplyBlocked(give(s, TOME), TOME, id)).toBe(FALLEN_NO_RESPEC);
    expect(FALLEN_NO_RESPEC).toBe("Fallen heroes can't use this.");
    expect(() => useSupply(give(s, DRAUGHT), DRAUGHT, id)).toThrow(FALLEN_NO_RESPEC);
  });

  it('Draught returns every spent stat point (a fallen hero still reports them)', () => {
    const { s, id } = withHero(base(), { statPoints: 1, alloc: { str: 3, dex: 1 }, alive: false, hpRatio: 0 });
    expect(respecSpent(s.roster.find((h) => h.id === id)!, DRAUGHT)).toBe(4);
    const alive = { ...s, roster: s.roster.map((x) => (x.id === id ? { ...x, alive: true, hpRatio: 1 } : x)) };
    const a = useSupply(give(alive, DRAUGHT), DRAUGHT, id);
    const h = a.roster.find((x) => x.id === id)!;
    expect(h.alloc).toEqual({});
    expect(h.statPoints).toBe(5);
    expect(supplyBlocked(give(a, DRAUGHT), DRAUGHT, id)).toBe('No stat points to reset');
  });

  it('the sim bot (AI side) never uses them', () => {
    const { s, id } = withHero(base(), { statPoints: 0, alloc: { str: 3 }, hpRatio: 0.2, wounds: 1 });
    const t = clone(s);
    addSupply(t, TOME, 1);
    addSupply(t, DRAUGHT, 1);
    const after = simUseSupplies(t);
    expect(supplyCount(after, TOME)).toBe(1);
    expect(supplyCount(after, DRAUGHT)).toBe(1);
    expect(after.roster.find((h) => h.id === id)!.alloc).toEqual({ str: 3 });
  });

  it('chooser texts: card tag shows spent points, confirm line names the hero', () => {
    expect(respecCardTag({ id: 'a', class: 'warrior', level: 7, spent: 6 }, 'tree')).toBe('Lv 7 · 6 skill points spent');
    expect(respecCardTag({ id: 'a', class: 'warrior', level: 2, spent: 1 }, 'stats')).toBe('Lv 2 · 1 stat point spent');
    expect(respecCardTag({ id: 'a', class: 'warrior', level: 2, spent: 0, fallen: true }, 'stats')).toBe("Lv 2 · Fallen heroes can't use this.");
    expect(respecConfirmText('Warrior', 'tree')).toBe("Reset Warrior's skill tree? Points return.");
  });
});

describe('skill tree: hold to spend (no Confirm), same as stat points', () => {
  const hero = (level: number, extra: Partial<TreeHero> = {}): TreeHero => ({ id: 'h1', class: 'warrior', level, skillPoints: level - 1, ...extra });

  it('a full hold spends exactly one point at once; tree rules still apply', () => {
    const h = hero(10);
    const { c, advance } = clock();
    let reason = '';
    const hold = (key: string) =>
      createHold({
        canStart: () => true,
        onProgress: () => undefined,
        onDone: () => {
          const r = spendOne(h, makeSession(h)!, key, TREE_RULES);
          if (r.ok) applyTree(h, r.alloc);
          else reason = r.reason;
        },
        clock: c,
      });
    const a = hold('1.f1');
    a.down();
    advance(300);
    a.up();
    advance(400);
    expect(h.tree).toBeUndefined(); // erken bırakma: puan yok
    a.down();
    advance(700);
    expect(rankOf(h.tree!, '1.f1')).toBe(1);
    expect(h.skillPoints).toBe(8);
    advance(1000); // basılı kalmak ikinci puan vermez
    expect(spent(h.tree!)).toBe(1);
    a.up();
    // kilitli düğüm (tier kilidi) reddedilir, durum aynı: ağacın kuralları değişmedi
    const b = hold('1.n0'); // Tier II: sayaç 5 olmadan kilitli
    b.down();
    advance(700);
    expect(reason).not.toBe('');
    expect(spent(h.tree!)).toBe(1);
  });

  it('no points: spendOne refuses and nothing changes', () => {
    const h = hero(1);
    const r = spendOne(h, makeSession(h)!, '1.f1', TREE_RULES);
    expect(r.ok).toBe(false);
  });

  it('the tree tab has no Confirm / Reset buttons; Respec only where the source gives it (Endless)', () => {
    const src = readFileSync('src/ui/tree-tab.ts', 'utf8');
    expect(src).not.toMatch(/data-a="confirm"|data-a="reset"/);
    expect(src).toMatch(/ctx\.respec \?/);
    const gear = readFileSync('src/ui/gear-screen.ts', 'utf8');
    const campaignSrc = gear.slice(gear.indexOf('export function campaignGearSource'), gear.indexOf('/** Boyalı arayüz ikonu'));
    expect(campaignSrc).not.toMatch(/respecTree:/);
    expect(readFileSync('src/game/endless-gear.ts', 'utf8')).toMatch(/respecTree:/);
  });
});
