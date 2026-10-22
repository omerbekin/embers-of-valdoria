import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { loadoutSetup } from '../src/progression/loadout';
import { setLevel, type LevelHero } from '../src/progression/levels';
import { TREE_RULES } from '../src/progression/skill-tree-data';
import { simulate } from '../src/sim/simulate';
import { isTreeArgs, parseTreeArgs, planFromArgs, runTreeSim, treeReport } from '../src/sim/tree-cli';
import { autoTreeHeroes, compileBuild, procKind, resolveBuild, treeBattleSetup, TREE_PRESETS, withTreesInMemory } from '../src/sim/tree-sim';

/** Skill ağacı simi (Faz 6, src/sim/tree-sim.ts + tree-cli.ts): araç doğruluğu, küçük savaş sayısı (denge ölçümü DEĞİL). */
describe('tree-sim: kurulum standart simle aynı', () => {
  it('kurulumsuz treeBattleSetup = content.battleSetup (aynı takım, dizilim, seed)', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const a = treeBattleSetup(seed, () => undefined);
      const b = content.battleSetup(content.DEFAULT_BATTLE, seed, 'turns');
      expect(a.party.map((d) => d.id)).toEqual(b.party.map((d) => d.id));
      expect(a.enemies.map((d) => d.id)).toEqual(b.enemies.map((d) => d.id));
      expect(a.partySlots).toEqual(b.partySlots);
      expect(a.enemySlots).toEqual(b.enemySlots);
      expect(a.seed).toEqual(b.seed);
    }
  });

  it('L1 ağaçsız varyant standart simle aynı sonucu verir', () => {
    const res = runTreeSim({ ...planFromArgs(['3', '7', '--tree', 'off', '--level', '1']), out: '' });
    const std = simulate(3, 7);
    const off = res.levels[0]!.variants.off!;
    expect(off.partyWin).toBeCloseTo((std.partyWins / 3) * 100, 6);
    expect(off.avgTurns).toBeCloseTo(std.totalTurns / 3, 6);
  });
});

const shipped = TREE_RULES.enabled;
describe('tree-sim: build ve ölçüm', () => {
  it('odaklı build: L20 a / b yönü ayrılır, ult kolu dolu, dağılım geçerli', () => {
    const a = compileBuild('warrior', 20, resolveBuild('warrior', TREE_PRESETS.focus!, 'a'))!;
    const b = compileBuild('warrior', 20, resolveBuild('warrior', TREE_PRESETS.focus!, 'b'))!;
    expect(a.points).toBe(19);
    expect(a.taken).toContain('1.ea');
    expect(b.taken).toContain('1.eb');
    expect(a.taken.some((k) => k.startsWith(`${TREE_RULES.rows}.`))).toBe(true);
    expect(a.setup).toBeDefined();
  });

  it('kapatılan kısım (ult) derlenmiş ağaçtan düşer, puan aynı', () => {
    const full = compileBuild('warrior', 20, resolveBuild('warrior', TREE_PRESETS.focus!, 'a'))!;
    const noUlt = compileBuild('warrior', 20, resolveBuild('warrior', TREE_PRESETS.focus!, 'a', { ultFx: false }))!;
    expect(noUlt.points).toBe(full.points);
    expect(JSON.stringify(noUlt.setup)).not.toEqual(JSON.stringify(full.setup));
  });

  it('procKind: sayı yaması sürekli, kanca tetikli, fx yok', () => {
    expect(procKind(null)).toBe('none');
    expect(procKind([{ k: 'skill', sel: 'damage', f: 'power', op: 'add', v: 0.1 } as never])).toBe('static');
    expect(procKind([{ k: 'hook', h: 'cond', mod: { powerMul: 0.1 } } as never])).toBe('proc');
    expect(procKind([{ k: 'unitFx', fx: { secondWind: { below: 0.3, heal: 0.1 } } } as never])).toBe('proc');
  });

  it('küçük ağaçlı koşu: referans + a + b, tetiklenme sayılır, ana şalter değişmez', () => {
    const plan = { ...planFromArgs(['2', '11', '--tree', 'focus', '--level', '20', '--side', 'both']), out: '' };
    const res = runTreeSim(plan);
    const V = res.levels[0]!.variants;
    expect(Object.keys(V)).toEqual(['off', 'a', 'b']);
    expect(Object.keys(V.off!.procs)).toHaveLength(0);
    expect(Object.values(V.a!.procs).reduce((x, y) => x + y, 0)).toBeGreaterThan(0);
    expect(Object.keys(V.a!.builds).length).toBeGreaterThan(0);
    expect(TREE_RULES.enabled).toBe(shipped);
    const text = treeReport(res).join('\n');
    expect(text).toContain('SINIF FARKI');
    expect(text).toContain('DÜĞÜM TETİKLENME');
  });
});

describe('tree-sim: bayraklar ve sefer / Endless vekili', () => {
  it('bayraklar: boşluklu ve = biçimi, liste değerleri', () => {
    expect(isTreeArgs(['300', '1'])).toBe(false);
    expect(isTreeArgs(['300', '1', '--level', '15'])).toBe(true);
    const { pos, flags } = parseTreeArgs(['96', '1,50001', '--tree', 'a', '--level=10,15', '--parts', '--only=warrior']);
    expect(pos).toEqual(['96', '1,50001']);
    expect(flags).toMatchObject({ tree: 'a', level: '10,15', parts: 'true', only: 'warrior' });
    const plan = planFromArgs(['96', '1,50001', '--tree', 'a', '--level=10,15', '--parts', '--only=warrior']);
    expect(plan).toMatchObject({ runs: 96, seeds: [1, 50001], levels: [10, 15], side: 'party', preset: 'a', parts: true, only: ['warrior'] });
    expect(() => planFromArgs(['--tree', 'yok'])).toThrow();
  });

  it('withTreesInMemory(false) ağacı kapatır, (true) açar; şalter geri yüklenir', () => {
    const h: LevelHero = { id: 'h1', class: 'warrior' };
    setLevel(h, 20);
    const [t] = autoTreeHeroes([h], 'b');
    expect(t!.tree).toBeDefined();
    expect(t!.skillPoints).toBe(0);
    expect(h.tree).toBeUndefined(); // girdi değişmez
    const src = { class: 'warrior', level: 20, tree: t!.tree! };
    expect(withTreesInMemory(false, () => loadoutSetup(src, { mode: 'campaign' }).tree)).toBeUndefined(); // referans: şalter açık gelse de ağaçsız
    expect(withTreesInMemory(true, () => loadoutSetup(src, { mode: 'campaign' }).tree)).toBeDefined();
    expect(TREE_RULES.enabled).toBe(shipped);
  });
});
