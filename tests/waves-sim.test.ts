import { afterEach, describe, expect, it } from 'vitest';
import { ENCOUNTERS, battlePlan, debugTeleport, getMap, newCampaign, outcomeFrom, validateEncounters } from '../src/campaign';
import { encounterEnemyCount } from '../src/campaign/xp';
import type { EncounterDef } from '../src/campaign/types';
import { fightPlan } from '../src/sim/campaign';
import { simulate } from '../src/sim/simulate';
import { ENDLESS, fightWave, newRun, outcomeFromBattle, wavePlan } from '../src/endless';
import { battleSummary } from '../src/engine';
import encountersJson from '../data/campaign/encounters.json';
import fixture from './fixtures/wave-encounter.json';

/**
 * Dalgalı savaşın sim / sefer / Endless uçtan uca denemesi (docs/design/waves.md): TEK test karşılaşması (tests/fixtures/wave-encounter.json) geçici
 * olarak karşılaşma tablosuna konur; sefer verisi değişmez. Şema: EncounterDef.waves = [{ units: [...] }, ...] (ilk dalga `units`).
 */
const TEST_ID = 'wave_test_road';
const def = fixture as unknown as EncounterDef;
const raw = encountersJson as unknown as Record<string, unknown>;

const map = getMap('valdoria');
// tutorial dışı ilk savaş düğümü (kaybedilmez açılış savaşı değil)
const battleNode = map.nodes.find((n) => n.encounter && !ENCOUNTERS[n.encounter]!.partyUndying && n.type === 'battle')!;

let restore: (() => void) | null = null;
const install = (id: string) => {
  const prevCampaign = ENCOUNTERS[id];
  const prevRaw = raw[id];
  ENCOUNTERS[id] = def;
  raw[id] = def;
  restore = () => {
    if (prevCampaign) ENCOUNTERS[id] = prevCampaign;
    else delete ENCOUNTERS[id];
    if (prevRaw) raw[id] = prevRaw;
    else delete raw[id];
  };
};
afterEach(() => {
  restore?.();
  restore = null;
});

describe('sefer: dalgalı karşılaşma', () => {
  it('şema doğrulanır; plan sonraki dalgaları aynı güçlendirme kurallarıyla taşır', () => {
    install(TEST_ID);
    expect(validateEncounters()).toEqual([]);
    expect(encounterEnemyCount(TEST_ID)).toBe(5);
    restore!();
    install(battleNode.encounter!);
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 4 }), battleNode.id);
    const plan = battlePlan(s);
    expect(plan.waves).toHaveLength(2);
    expect(plan.waves![0]!.enemies.filter(Boolean)).toEqual(['defender', 'mage']);
    expect(plan.waves![1]!.units[1]).toMatchObject({ displayName: 'Wave Captain', tier: 'elite' });
    // dalga 2'nin birimi ilk dalgadaki eşdeğer birimle aynı zorluk / level / bölüm eklerini alır (yalnızca kendi mods'u farklı olabilir)
    expect(plan.waves![0]!.units[1]!.modifiers?.attrAdd).toEqual(plan.units.enemies[0]!.modifiers?.attrAdd);
  });

  it('sim (fightPlan) 3 dalgayı uçtan uca oynar; belirleyici; zaferde tüm dalgaların düşmanları sayılır', () => {
    install(battleNode.encounter!);
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 4 }), battleNode.id);
    const plan = battlePlan(s);
    const a = fightPlan(plan, 'medium');
    const b = fightPlan(plan, 'medium');
    expect(b.log).toEqual(a.log);
    expect(a.waveCount).toBe(3);
    expect(a.log.filter((e) => e.type === 'waveStart').length).toBe(a.waveIndex + 1);
    expect(a.winner).not.toBeNull();
    if (a.winner === 'party') {
      expect(a.waveIndex).toBe(2);
      expect(battleSummary(a).units.filter((u) => u.side === 'enemy' && !u.alive).length).toBe(5);
    }
    const out = outcomeFrom(plan, a.winner === 'party', battleSummary(a));
    expect(out.units.length).toBe(plan.heroOrder.length);
  });
});

describe('Endless: dalgalı karşılaşma', () => {
  it('elit karşılaşması dalgalıysa plan ve fightWave dalgaları oynar', () => {
    install(TEST_ID);
    const cfg = { ...ENDLESS, elites: [TEST_ID] };
    const run = { ...newRun(3, ['warrior', 'paladin', 'mage', 'archer'], '2026-10-19T00:00:00.000Z', cfg), wave: cfg.eliteEvery };
    const plan = wavePlan(run, cfg);
    expect(plan.name).toBe('Wave Test Road');
    expect(plan.waves).toHaveLength(2);
    expect(plan.waves![1]!.units[1]!.modifiers?.hpMult).toBeGreaterThan(0.8); // dalga güçlenmesi de uygulanır
    const battle = fightWave(plan);
    expect(battle.waveCount).toBe(3);
    expect(fightWave(plan).log).toEqual(battle.log);
    const out = outcomeFromBattle(plan, battle);
    expect(out.kills).toBe(battle.combatants.filter((c) => c.side === 'enemy' && !c.summoned && c.hp <= 0).length);
  });

  it('dalgasız Endless planında waves alanı yok', () => {
    const run = newRun(3, ['warrior', 'paladin', 'mage', 'archer'], '2026-10-19T00:00:00.000Z');
    expect(wavePlan(run).waves).toBeUndefined();
  });
});

describe('npm run sim: --waves', () => {
  it('waves 1 = eski ölçüm birebir; waves 3 dalgalı savaş oynar', () => {
    const plain = simulate(6, 1);
    const one = simulate(6, 1, undefined, {}, { waves: 1 });
    expect(one.partyWins).toBe(plain.partyWins);
    expect(one.totalTurns).toBe(plain.totalTurns);
    expect(one.waveTotal).toBeUndefined();
    const three = simulate(6, 1, undefined, {}, { waves: 3 });
    expect(three.waveTotal).toBe(18);
    expect(three.wavesReached).toBeGreaterThanOrEqual(6);
  });
});
