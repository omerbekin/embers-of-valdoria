import { describe, expect, it } from 'vitest';
import { chooseAction, content } from '../src/engine';
import { buildWaves, reinforcementGroup, waveOpening } from '../src/engine/wave-split';
import {
  ENCOUNTERS,
  battleForPlan,
  battlePlan,
  canResume,
  debugTeleport,
  encounterWaves,
  getMap,
  newCampaign,
  pauseRecord,
  resumeKey,
  resumePlan,
  withSuspended,
} from '../src/campaign';
import { ENDLESS, battleFor, enemyCount, newRun, wavePlan, waveKind } from '../src/endless';
import { attachRecorder, battleHash, planKey, restoreBattle, type ReplayAction } from '../src/endless/replay';
import wavesJson from '../data/waves.json';

// Dalgaların gerçek oyunda açılması (Ömer 2026-10-19, docs/design/waves.md > Açılış): sefer Watchtower'dan, Endless 6. savaştan; normal 2, elit 2, boss 3.

const u = (cls: string, slot: number, tier?: 'elite' | 'boss') => ({ class: cls, slot, ...(tier ? { tier } : {}) });

describe('ekleme kuralı (buildWaves; Ömer 2026-10-19 düzeltmesi: dalgalar EKLENİR, bölünmez)', () => {
  const names = (w: Array<Array<{ class: string }>>) => w.map((x) => x.map((y) => y.class));
  it('normal savaş: 1. dalga karşılaşmanın kendisi, sonra eşlikçilerin kopyası (takviye)', () => {
    const units = [u('a', 0), u('b', 2), u('c', 7)];
    const w = buildWaves(units, 2);
    expect(w[0]).toEqual(units);
    expect(names(w)).toEqual([['a', 'b', 'c'], ['a', 'b', 'c']]);
    expect(buildWaves(units, 1)).toEqual([units]);
  });
  it('önderli savaş: takviyeler ÖNCE, önder kendi eşlikçileriyle SON dalgada; önder kopyalanmaz', () => {
    const units = [u('a', 7), u('lead', 4, 'boss'), u('b', 0), u('c', 2)];
    const w = buildWaves(units, 3);
    expect(w).toHaveLength(3);
    expect(w[2]).toEqual(units);
    expect(names(w.slice(0, 2))).toEqual([['b', 'c', 'a'], ['b', 'c', 'a']]);
    expect(w.slice(0, 2).flat().some((x) => x.tier)).toBe(false);
  });
  it('takviye en az minSize birim (eksikse eşlikçi tekrar eder, boş yuvaya); yardımcı nesne şablona girmez', () => {
    const g = reinforcementGroup([u('x', 6)], 2);
    expect(g.map((x) => x.class)).toEqual(['x', 'x']);
    expect(new Set(g.map((x) => x.slot)).size).toBe(2);
    expect(Math.floor(g[1]!.slot / 3)).toBe(2); // aynı sıra
    const inert = (c: string) => c === 'iron_mooring';
    const w = buildWaves([u('x', 0), u('iron_mooring', 3), u('lead', 1, 'boss')], 2, inert);
    expect(names(w)).toEqual([['x', 'x'], ['x', 'iron_mooring', 'lead']]);
  });
  it('eşlikçi yoksa yedek şablon (bölgenin sıradan birimleri); o da yoksa tek dalga', () => {
    const inert = (c: string) => c === 'iron_mooring';
    expect(buildWaves(ENCOUNTERS.bridge_warden!.units, 3, inert)).toHaveLength(1);
    const w = buildWaves(ENCOUNTERS.bridge_warden!.units, 3, inert, [u('r1', 1), u('r2', 7)]);
    expect(names(w)).toEqual([['r1', 'r2'], ['r1', 'r2'], ENCOUNTERS.bridge_warden!.units.map((x) => x.class)]);
  });
});

describe('sefer: dalgalar Watchtower dan itibaren', () => {
  const map = getMap('valdoria');
  const plans = map.nodes
    .filter((n) => n.encounter)
    .map((n) => ({ n, plan: battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 7 }), n.id)) }));

  it('veri: Ömer in sayıları ve tutorial in dalgasız düğümleri', () => {
    expect(wavesJson.rules.turnOrder).toBe('keep');
    expect(wavesJson.rules.healRatio).toBe(0);
    expect(wavesJson.rules.mpRatio).toBe(0);
    expect(wavesJson.rules.clearCorpses).toBe(true);
    expect(waveOpening.campaign.count).toEqual({ battle: 2, elite: 2, boss: 3 });
    expect(waveOpening.endless.fromBattle).toBe(6);
  });

  it('Mill Road ve Ravenwood dalgasız; Watchtower ve sonrası dalgalı; karşılaşmanın takımı AYNEN kalır, takviye dalgaları eklenir', () => {
    for (const { n, plan } of plans) {
      const enc = ENCOUNTERS[plan.encounterId]!;
      const waves = [plan.enemies, ...(plan.waves ?? []).map((w) => w.enemies)];
      if (enc.waves?.length) {
        expect(waves.length, n.id).toBe(1 + enc.waves.length);
        continue;
      }
      if (n.id === '1' || n.id === '2') {
        expect(waves.length, n.id).toBe(1);
        continue;
      }
      expect(waves.length, n.id).toBe(n.type === 'boss' ? 3 : 2);
      const leader = enc.units.some((x) => x.tier);
      // karşılaşmanın kendi takımı: önderliyse SON dalga, değilse 1. dalga (hücre listesi birebir)
      const own = Array.from({ length: 12 }, () => '');
      for (const x of enc.units) own[x.slot] = x.class;
      expect(leader ? waves.at(-1) : waves[0], n.id).toEqual(own);
      // takviye dalgalarında önder yok, en az 2 birim
      const extra = leader ? waves.slice(0, -1) : waves.slice(1);
      const tiers = new Set(enc.units.filter((x) => x.tier).map((x) => x.class));
      for (const w of extra) {
        expect(w.filter(Boolean).length, n.id).toBeGreaterThanOrEqual(2);
        expect(w.some((c) => tiers.has(c)), n.id).toBe(false);
      }
    }
    const w = plans.find((p) => p.n.id === '3')!.plan;
    expect(w.enemies.filter(Boolean).sort()).toEqual(['ember_acolyte', 'ravenwood_poacher']); // takviye önce
    expect(w.waves!.at(-1)!.enemies.filter(Boolean)).toContain('bandit_chief'); // önder son dalgada
    const castle = plans.find((p) => p.n.id === '12')!.plan;
    expect(castle.waves).toHaveLength(2);
    expect(Object.values(castle.waves![1]!.units).some((x) => x.tier === 'boss')).toBe(true);
    // Bridge Warden: bölge II'nin sıradan birimlerinden 2 takviye dalgası, boss son dalgada
    const bridge = plans.find((p) => p.plan.encounterId === 'bridge_warden')!.plan;
    expect(bridge.waves).toHaveLength(2);
    expect(bridge.enemies.filter(Boolean).sort()).toEqual(['bandit_crossbowman', 'stonebound_warden']);
    expect(bridge.waves![1]!.enemies.filter(Boolean).sort()).toEqual(['bridge_warden', 'iron_mooring', 'iron_mooring']);
  });

  it('karşılaşmanın kendi waves alanı önceliklidir', () => {
    const def = { units: [u('a', 0), u('b', 1)], waves: [{ units: [u('c', 2)] }] };
    expect(encounterWaves(def, 'moor', 'battle').map((x) => x.map((y) => y.class))).toEqual([['a', 'b'], ['c']]);
    expect(encounterWaves({ units: def.units }, '1', 'battle')).toHaveLength(1);
    expect(encounterWaves({ units: def.units }, 'moor', 'battle').map((x) => x.map((y) => y.class))).toEqual([['a', 'b'], ['a', 'b']]);
  });

  it('planın savaşı (battleForPlan) dalgaları taşır; duraklatılan savaş 2. dalgada sürer', () => {
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 11 }), 'moor');
    const plan = battlePlan(s);
    expect(plan.waves).toHaveLength(1);
    expect(resumeKey(plan)).not.toBe(resumeKey({ ...plan, waves: undefined }));
    const b = battleForPlan(plan);
    expect(b.waveCount).toBe(2);
    const actions: ReplayAction[] = [];
    attachRecorder(b, (a) => actions.push(a));
    for (let i = 0; i < 400 && !b.winner && b.waveIndex < 1; i++) {
      const actor = b.currentActor!;
      if (!b.applyChoice(actor.uid, chooseAction(b, actor.uid, content.aiConfig, undefined, { difficulty: 'medium' })).ok) b.skipTurn();
    }
    expect(b.waveIndex).toBe(1);
    const x = pauseRecord(plan, b, actions);
    const s2 = withSuspended(s, x);
    expect(canResume(s2)).toBe(true);
    const again = battleForPlan(resumePlan(s2, x));
    expect(restoreBattle(again, x)).toBe(true);
    expect(again.waveIndex).toBe(1);
    expect(battleHash(again)).toBe(battleHash(b));
  });
});

describe('Endless: dalgalar 6. savaştan itibaren', () => {
  const run = (wave: number) => ({ ...newRun(5, ['warrior', 'paladin', 'mage', 'archer'], '2026-10-19T00:00:00.000Z'), wave });

  it('1-5 dalgasız; 6+ normal savaş 2 dalga, her dalga enemyCount kadar, class tekrar etmez', () => {
    for (const w of [1, 4, 5]) expect(wavePlan(run(w)).waves, String(w)).toBeUndefined();
    for (const w of [6, 7, 13]) {
      if (waveKind(w) !== 'normal') continue;
      const p = wavePlan(run(w));
      expect(p.waves).toHaveLength(1);
      const a = p.enemies.filter(Boolean);
      const b = p.waves![0]!.enemies.filter(Boolean);
      expect(a).toHaveLength(enemyCount(w));
      expect(b).toHaveLength(enemyCount(w));
      expect(b.some((c) => a.includes(c))).toBe(false);
      expect(battleFor(p).waveCount).toBe(2);
    }
  });

  it('elit 2, boss 3 dalga: takviyeler (eşlikçi kopyası) önce, önder kendi takımıyla son dalgada; eşlikçisiz boss (Bridge Warden) başa rastgele dalga alır', () => {
    const elite = wavePlan(run(15));
    expect(elite.kind).toBe('elite');
    expect(elite.waves).toHaveLength(1);
    expect(Object.values(elite.waves![0]!.units).some((x) => x.tier === 'elite')).toBe(true);
    expect(Object.values(elite.units.enemies).some((x) => x.tier)).toBe(false);
    const boss = wavePlan(run(10));
    expect(boss.waves).toHaveLength(2);
    const lm = ENCOUNTERS[ENDLESS.bosses[0]!]!;
    expect(boss.waves![1]!.enemies.filter(Boolean).length).toBe(lm.units.length); // karşılaşma aynen
    const esc = lm.units.filter((x) => !x.tier).map((x) => x.class).sort();
    expect(boss.enemies.filter(Boolean).sort()).toEqual(esc);
    expect(boss.waves![0]!.enemies.filter(Boolean).sort()).toEqual(esc);
    expect(boss.enemyNames.length).toBe(lm.units.length + 2 * esc.length); // önizleme tüm dalgalar
    const bridge = ENDLESS.bosses.indexOf('bridge_warden');
    const bw = wavePlan(run((bridge + 1) * ENDLESS.bossEvery));
    expect(bw.waves).toHaveLength(2);
    expect(bw.waves![1]!.enemies.filter(Boolean).sort()).toEqual(['bridge_warden', 'iron_mooring', 'iron_mooring']);
    expect(planKey(bw)).not.toBe(planKey({ ...bw, waves: undefined }));
  });
});

