import { describe, expect, it } from 'vitest';
import { chooseAction, content } from '../src/engine';
import { splitIntoWaves, waveOpening } from '../src/engine/wave-split';
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

describe('bölme kuralı (splitIntoWaves)', () => {
  it('önder son dalgada; eşlikçiler yuva sırasıyla önceki dalgalara sırayla dağılır', () => {
    const w = splitIntoWaves([u('a', 7), u('lead', 4, 'boss'), u('b', 0), u('c', 2)], 3);
    expect(w.map((x) => x.map((y) => y.class))).toEqual([['b', 'a'], ['c'], ['lead']]);
  });
  it('önder yoksa tüm dalgalara dağılır; birim yetmezse daha az dalga; tek dalga isteği aynen', () => {
    expect(splitIntoWaves([u('a', 0), u('b', 2), u('c', 7)], 2).map((x) => x.map((y) => y.class))).toEqual([['a', 'c'], ['b']]);
    expect(splitIntoWaves([u('a', 0)], 3)).toHaveLength(1);
    expect(splitIntoWaves([u('a', 0), u('b', 1)], 1)).toEqual([[u('a', 0), u('b', 1)]]);
  });
  it('sıra almayan yardımcı nesne önderle kalır; eşlikçi yoksa tek dalga (Bridge Warden)', () => {
    const inert = (c: string) => c === 'iron_mooring';
    expect(splitIntoWaves(ENCOUNTERS.bridge_warden!.units, 3, inert)).toHaveLength(1);
    const w = splitIntoWaves([u('x', 0), u('iron_mooring', 3), u('lead', 1, 'boss')], 2, inert);
    expect(w.map((x) => x.map((y) => y.class))).toEqual([['x'], ['lead', 'iron_mooring']]);
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

  it('Mill Road ve Ravenwood dalgasız; Watchtower ve sonrası dalgalı; veride waves yoksa birimler bölünür, eklenmez', () => {
    for (const { n, plan } of plans) {
      const total = [plan.enemies, ...(plan.waves ?? []).map((w) => w.enemies)].flat().filter(Boolean).length;
      const enc = ENCOUNTERS[plan.encounterId]!;
      const count = 1 + (plan.waves?.length ?? 0);
      // karşılaşmanın kendi waves alanı (balance-tester 2026-10-19): dalgalar veriden birebir
      if (enc.waves?.length) {
        expect(total, n.id).toBe(enc.units.length + enc.waves.reduce((k, w) => k + w.units.length, 0));
        expect(count, n.id).toBe(1 + enc.waves.length);
        continue;
      }
      expect(total, n.id).toBe(enc.units.length);
      if (n.id === '1' || n.id === '2') expect(count, n.id).toBe(1);
      else if (plan.encounterId === 'bridge_warden') expect(count).toBe(1); // eşlikçisiz boss: veri gerekir (waves.md)
      else expect(count, n.id).toBe(Math.min(n.type === 'boss' ? 3 : 2, ENCOUNTERS[plan.encounterId]!.units.length));
    }
    const w = plans.find((p) => p.n.id === '3')!.plan;
    expect(w.waves!.at(-1)!.enemies.filter(Boolean)).toContain('bandit_chief'); // önder son dalgada (veride eşlikçisiyle, balance-tester 2026-10-19)
    const castle = plans.find((p) => p.n.id === '12')!.plan;
    expect(castle.waves).toHaveLength(2);
    expect(Object.values(castle.waves![1]!.units).some((x) => x.tier === 'boss')).toBe(true);
  });

  it('karşılaşmanın kendi waves alanı önceliklidir', () => {
    const def = { units: [u('a', 0), u('b', 1)], waves: [{ units: [u('c', 2)] }] };
    expect(encounterWaves(def, 'moor', 'battle').map((x) => x.map((y) => y.class))).toEqual([['a', 'b'], ['c']]);
    expect(encounterWaves({ units: def.units }, '1', 'battle')).toHaveLength(1);
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

  it('elit 2, boss 3 dalga (önder son dalgada); eşlikçisiz boss (Bridge Warden) başa rastgele dalga alır', () => {
    const elite = wavePlan(run(15));
    expect(elite.kind).toBe('elite');
    expect(elite.waves).toHaveLength(1);
    expect(Object.values(elite.waves![0]!.units).some((x) => x.tier === 'elite')).toBe(true);
    const boss = wavePlan(run(10));
    expect(boss.waves).toHaveLength(2);
    const bridge = ENDLESS.bosses.indexOf('bridge_warden');
    const bw = wavePlan(run((bridge + 1) * ENDLESS.bossEvery));
    expect(bw.waves).toHaveLength(2);
    expect(bw.waves![1]!.enemies.filter(Boolean).sort()).toEqual(['bridge_warden', 'iron_mooring', 'iron_mooring']);
    expect(planKey(bw)).not.toBe(planKey({ ...bw, waves: undefined }));
  });
});

