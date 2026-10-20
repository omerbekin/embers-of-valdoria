import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  SAVE_VERSION,
  activeHeroes,
  applyBattle,
  autoResolve,
  battlePlan,
  completeStory,
  debugTeleport,
  memoryKV,
  migrateSaves,
  moveTo,
  newCampaign,
  nextStep,
  readSaves,
  reviveWithValor,
  valorReviveBlocked,
  valorUnlocked,
  type CampaignState,
} from '../src/campaign';
import { Battle, content } from '../src/engine';

/** Sefer Valor'u (Ömer 2026-10-13): Valdren Keep'e (düğüm 7) kadar gizli ve birikmez; hikâyesi bitince hediye; kazanç, kayıt göçü, savaş dışı diriltme. */
const R = content.valorRules;
const OUT = R.revive.outsideCost;
const COST = R.revive.battleCost;
const fresh = (seed = 1234) => newCampaign({ mode: 'normal', seed });

function playTo(s: CampaignState, target: string): CampaignState {
  let t = s;
  for (let guard = 0; guard < 200; guard++) {
    const step = nextStep(t);
    if (t.at === target && step.kind !== 'hero') return t;
    if (step.kind === 'complete') return t;
    t = step.kind === 'move' ? moveTo(t, step.options[0]!) : autoResolve(t, step);
  }
  throw new Error('guard');
}
const winAll = (s: CampaignState, o: { fallen?: number; valorLeft?: number; flawless?: boolean } = {}) =>
  applyBattle(s, {
    victory: true,
    units: activeHeroes(s).map((h, i) => ({ heroId: h.id, hpRatio: i < (o.fallen ?? 0) ? 0 : 0.8, alive: i >= (o.fallen ?? 0) })),
    ...(o.valorLeft !== undefined ? { valorLeft: o.valorLeft } : {}),
    ...(o.flawless !== undefined ? { flawless: o.flawless } : {}),
  });

describe('sefer Valor kilidi (Valdren Keep)', () => {
  it('Valdren Keep hikâyesinden önce gizli: savaşlar (elit 3 dahil) kazanılsa da birikmez, savaş planında Valor yok', () => {
    const s = playTo(fresh(), R.campaign.introNode);
    expect(s.stats.victories).toBeGreaterThan(3);
    expect(valorUnlocked(s)).toBe(false);
    expect(s.valor).toBeUndefined();
    expect(nextStep(s).kind).toBe('story');
    expect(battlePlan(playTo(fresh(), '3')).valor).toBeUndefined();
  });

  it('Valdren hikâyesi bitince açılır ve hediye (veriden) ile başlar; sonraki savaş planı Valor taşır, motor yalnızca oyuncu tarafında açar', () => {
    const s = completeStory(playTo(fresh(), R.campaign.introNode));
    expect(s.valor).toBe(R.campaign.gift);
    expect(R.campaign.gift).toBeGreaterThanOrEqual(R.revive.outsideCost);
    const t = debugTeleport(s, '5A');
    const plan = battlePlan(t);
    expect(plan.valor).toBe(t.valor);
    const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, valor: { party: plan.valor! } }, false));
    expect(b.valorOf('party')).toBe(plan.valor);
    expect(b.valorOf('enemy')).toBeNull();
  });
});

describe('sefer Valor kazancı', () => {
  const at = (id: string, valor: number) => ({ ...debugTeleport(completeStory(playTo(fresh(), R.campaign.introNode)), id), valor });

  it('normal zafer +1, kusursuz +1 daha; savaşta harcanan düşülür (valorLeft); kimse düşmediyse flawless kendiliğinden', () => {
    const F = R.earn.flawless; // Ömer 2026-10-13: 0
    expect(winAll(at('5A', 0)).valor).toBe(1 + F); // herkes ayakta = kusursuz
    expect(winAll(at('5A', 0), { fallen: 1 }).valor).toBe(1);
    expect(winAll(at('5A', COST + 1), { valorLeft: 1, flawless: false }).valor).toBe(2); // COST+1'den COST harcandı, +1
    expect(winAll(at('5A', 3), { flawless: false }).valor).toBe(4); // diriltilen kahraman da düştü sayılır
  });

  it('elit +2 (+1 kusursuz), boss +3 (+1 kusursuz); üst sınır cap', () => {
    expect(winAll(at('8C', 0), { fallen: 1 }).valor).toBe(2);
    expect(winAll(at('8C', 0)).valor).toBe(2 + R.earn.flawless);
    expect(winAll(at('9', 0), { fallen: 1 }).valor).toBe(3);
    expect(winAll(at('9', 0)).valor).toBe(3 + R.earn.flawless);
    expect(winAll(at('9', R.cap - 1)).valor).toBe(R.cap);
  });

  it('yenilgi Valor değiştirmez', () => {
    const s = at('5A', 3);
    expect(applyBattle(s, { victory: false, units: [] }).valor).toBe(3);
  });
});

describe('sefer: savaş dışında Valor ile diriltme', () => {
  const base = () => debugTeleport(completeStory(playTo(fresh(), R.campaign.introNode)), '5A');
  it('outsideCost Valor (savaştakinden ucuz) harcar, kahraman %50 canla kalkar', () => {
    // 3 yaralı kahraman zaferi düşmüş bitirir: ceset (hp-death-rework 2026-10-19); Valor kaldırır, yaraları kalır
    const b0 = base();
    const first = activeHeroes(b0)[0]!.id;
    const s0 = winAll({ ...b0, roster: b0.roster.map((h) => (h.id === first ? { ...h, wounds: 3 } : h)) }, { fallen: 1 });
    const fallen = s0.roster.find((h) => !h.alive)!;
    expect(fallen.wounds).toBe(3);
    const s = { ...s0, valor: OUT };
    const t = reviveWithValor(s, fallen.id);
    expect(t.valor).toBe(0);
    const h = t.roster.find((x) => x.id === fallen.id)!;
    expect(h.alive).toBe(true);
    expect(h.hpRatio).toBe(R.revive.hpRatio);
    expect(h.wounds).toBe(2); // Valor 1 yara siler (Ömer 2026-10-20)
    expect(valorReviveBlocked({ ...s0, valor: OUT - 1 }, fallen.id)).toBe(`Needs ${OUT} Valor (you have ${OUT - 1})`);
    expect(valorReviveBlocked(s0, s0.roster.find((x) => x.alive)!.id)).toBe('This hero has not fallen');
    const { valor: _v, ...locked } = s;
    expect(valorReviveBlocked(locked as CampaignState, fallen.id)).toBe('Valor is not known yet');
  });
});

describe('sefer kaydı: Valor ve sürüm 7 göçü', () => {
  const file = (states: CampaignState[], version: number) =>
    JSON.stringify({ version, counter: states.length, lastSlot: 0, slots: [{ campaignId: states[0]!.campaignId, mode: 'normal', difficulty: 'medium', startedAt: 't', lastPlayed: 't', saves: states.map((st, i) => ({ id: `s${i}`, kind: 'auto', savedAt: 't', mode: 'normal', campaignId: st.campaignId, summary: {}, state: st })) }, null, null] });
  const strip = (s: CampaignState): CampaignState => {
    const { valor: _v, ...rest } = s;
    return rest as CampaignState;
  };

  it('sürüm 6 dosyası silinmeden okunur; Valdren geçilmişse Valor hediye ile açılır, geçilmemişse kapalı kalır; dosya 7 olarak yazılır', () => {
    const before = playTo(fresh(5), '4');
    const after = { ...debugTeleport(completeStory(playTo(fresh(5), R.campaign.introNode)), '5A') };
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, file([strip(before), strip(after)], 6));
    const r = readSaves(kv);
    expect(r.corrupt).toBe(false);
    expect(r.migrated).toBe(true);
    const saves = r.file.slots[0]!.saves;
    expect(saves).toHaveLength(2);
    expect(r.file.slots[0]!.mapChanged).toBeUndefined();
    expect(saves[0]!.state.valor).toBeUndefined();
    expect(saves[1]!.state.valor).toBe(R.campaign.gift);
    expect(migrateSaves(kv)).toBe(true);
    expect(JSON.parse(kv.getItem(SAVE_KEY)!).version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(11); // 8: başlangıç silahı (Item Güçlendirme), 9: level puanları (2026-10-17), 10: serbest dolaşım (2026-10-18)
  });

  it('Valor kayıtta korunur; bozuk değer 0..cap aralığına kırpılır', () => {
    const s = { ...debugTeleport(completeStory(playTo(fresh(6), R.campaign.introNode)), '5A'), valor: R.cap - 1 };
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, file([s, { ...s, valor: 99 }], SAVE_VERSION));
    const saves = readSaves(kv).file.slots[0]!.saves;
    expect(saves[0]!.state.valor).toBe(R.cap - 1);
    expect(saves[1]!.state.valor).toBe(R.cap);
  });
});
