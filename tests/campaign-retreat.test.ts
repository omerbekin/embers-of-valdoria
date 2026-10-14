import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chooseAction, content, type Battle } from '../src/engine';
import {
  applyBattle,
  autoFormation,
  autoResolve,
  battleForPlan,
  battlePlan,
  canResume,
  debugSetValor,
  latestSave,
  memoryKV,
  moveHero,
  moveTo,
  newCampaign,
  nextStep,
  normalizeState,
  pausedLock,
  readSaves,
  resumePlan,
  suspendedOf,
  valorReviveBlocked,
  withSuspended,
  writeSave,
  PAUSED_LOCK,
  type CampaignState,
} from '../src/campaign';
import { battleHash, restoreBattle } from '../src/endless/replay';
import { loadLastSave, resultActions, retreatToMap, session, startCampaignBattle } from '../src/game/campaign-session';
import type { BattleSceneData } from '../src/game/scenes/BattleScene';

// Retreat to Map savaşı DURAKLATIR (Ömer 2026-10-14; Endless 0.7.8.1 ile aynı kural): kaybedilen savaşı geri çekilip baştan oynamak yok.

const g = globalThis as unknown as { window?: { localStorage: ReturnType<typeof memoryKV> } };
let kv: ReturnType<typeof memoryKV>;

beforeEach(() => {
  kv = memoryKV();
  g.window = { localStorage: kv };
});
afterEach(() => {
  delete g.window;
});

/** Savaş bekleyen ilk düğüme kadar sefer (seed'li otomatik adımlar). */
function atBattle(mode: 'normal' | 'ironman' = 'ironman'): CampaignState {
  let s = newCampaign({ mode, seed: 4242, difficulty: 'medium', slot: 0, campaignId: 'c-test' });
  // Tutorial savaşları kısa: Ashford'dan (4) sonraki ilk savaşa kadar git
  let skip = 3;
  for (let i = 0; i < 80; i++) {
    const st = nextStep(s);
    if (st.kind === 'battle' && skip-- <= 0) break;
    s = st.kind === 'move' ? moveTo(s, st.options[0]!) : autoResolve(s, st);
  }
  expect(nextStep(s).kind).toBe('battle');
  return s;
}

/** startCampaignBattle'ı sahnesiz çağırır: BattleScene'e giden veri yakalanır. */
function launch(): Partial<BattleSceneData> {
  let data: Partial<BattleSceneData> | undefined;
  const scene = { game: { scene: { getScene: () => null } }, scene: { start: (_k: string, d: Partial<BattleSceneData>) => void (data = d) } };
  startCampaignBattle(scene as never);
  return data!;
}

/** BattleScene'in yaptığı gibi: savaş kurulur, prepareBattle çağrılır. */
function sceneBattle(data: Partial<BattleSceneData>): Battle {
  const s = session.state!;
  const susp = suspendedOf(s);
  const plan = susp ? resumePlan(s, susp) : battlePlan(s, session.attempts.get(s.at) ?? 0);
  expect(data.seed).toBe(plan.seed);
  const b = battleForPlan(plan);
  data.campaign!.prepareBattle!(b);
  return b;
}

function play(b: Battle, n: number): void {
  for (let i = 0; i < n && !b.winner; i++) {
    const actor = b.currentActor!;
    const choice = chooseAction(b, actor.uid, content.aiConfig, undefined, { difficulty: 'medium' });
    if (!b.applyChoice(actor.uid, choice).ok) b.skipTurn();
  }
}

describe('sefer: Retreat to Map savaşı duraklatır', () => {
  it('geri çekil -> suspended + kayıt -> kilitler -> sürdür aynı tur/özet -> zafer siler', () => {
    const s0 = atBattle('ironman');
    session.state = s0;
    session.attempts = new Map();
    const data = launch();
    expect(data.campaign!.retreatConfirm).toBe('Retreat to map? The battle stays paused and resumes where you left it.');
    const b1 = sceneBattle(data);
    play(b1, 9);
    expect(b1.winner).toBeFalsy();
    const turn = b1.turnsTaken;
    const hash = battleHash(b1);

    const after = retreatToMap()!;
    expect(session.notice).toBe('The battle is paused. It resumes where you left it.');
    const p = suspendedOf(after)!;
    expect(p).toBeTruthy();
    expect(p.node).toBe(s0.at);
    expect(p.turn).toBe(turn);
    expect(p.hash).toBe(hash);
    expect(p.actions.length).toBeGreaterThan(0);
    // Ironman'da da kaydedildi (sekme kapansa da duraklatma kalır)
    expect(latestSave(kv, 0)?.state.suspended?.hash).toBe(hash);

    // Kilitler: yola çıkma, Formation, Valor diriltmesi
    expect(pausedLock(after)).toBe(PAUSED_LOCK);
    expect(PAUSED_LOCK).toBe('Finish the paused battle first');
    const hero = after.active.find(Boolean)!;
    expect(moveHero(after, hero, 11)).toBe(after);
    expect(autoFormation(after)).toBe(after);
    const withValor = debugSetValor(after, 10);
    expect(valorReviveBlocked(withValor, hero)).toBe(PAUSED_LOCK);

    // Yeniden giriş: aynı seed, günlük oynatılır, aynı tur ve özet
    expect(canResume(after)).toBe(true);
    session.attempts.set(after.at, 3); // deneme sayacı seed'i değiştirmez (kayıttaki seed)
    const data2 = launch();
    expect(data2.seed).toBe(p.seed);
    const b2 = sceneBattle(data2);
    expect(b2.turnsTaken).toBe(turn);
    expect(battleHash(b2)).toBe(hash);

    // Zafer kaydı siler
    const won = applyBattle(session.state!, { victory: true, units: [] });
    expect(won.suspended).toBeUndefined();
  });

  it('yenilgi: duraklatma kaydı bellekten ve son kayıttan silinir, Load Last Save savaşı baştan açar', () => {
    const s0 = atBattle('normal');
    session.state = s0;
    session.attempts = new Map();
    session.fallback = s0;
    writeSave(kv, s0, 'start');
    const data = launch();
    const b = sceneBattle(data);
    play(b, 6);
    retreatToMap();
    expect(latestSave(kv, 0)?.state.suspended).toBeTruthy();
    // Normal: aynı düğümde ikinci geri çekilme kaydı çoğaltmaz (en yeni duraklatma kaydının yerine yazılır)
    const n1 = readSaves(kv).file.slots[0]!.saves.length;
    const b2 = sceneBattle(launch());
    play(b2, 2);
    retreatToMap();
    expect(readSaves(kv).file.slots[0]!.saves.length).toBe(n1);

    const b3 = sceneBattle(launch());
    const plan = resumePlan(session.state!, suspendedOf(session.state)!);
    resultActions({} as never, plan, false, b3);
    expect(session.state!.suspended).toBeUndefined();
    expect(latestSave(kv, 0)?.state.suspended).toBeUndefined();
    const back = loadLastSave()!;
    expect(back.suspended).toBeUndefined();
    expect(nextStep(back).kind).toBe('battle');
  });

  it('doğrulanamayan kayıt sürdürülmez; bozuk / başka düğümün kaydı okunurken atılır', () => {
    const s0 = atBattle('ironman');
    const plan = battlePlan(s0);
    const b = battleForPlan(plan);
    const good = { node: s0.at, seed: plan.seed, actions: [], turn: b.turnsTaken, hash: battleHash(b), setup: 'x' };
    // kurulum parmak izi tutmuyor
    expect(canResume(withSuspended(s0, good))).toBe(false);
    expect(restoreBattle(battleForPlan(plan), good)).toBe(true);
    // bozuk alan
    expect(normalizeState({ ...s0, suspended: { node: s0.at, seed: 'no' } })?.suspended).toBeUndefined();
    // başka düğüm
    expect(normalizeState({ ...s0, suspended: { ...good, node: 'nowhere' } })?.suspended).toBeUndefined();
    // geçerli kayıt korunur
    expect(normalizeState({ ...s0, suspended: good })?.suspended).toEqual(good);
  });

  it('kayıt yokken geri çekilme durumu değiştirmez', () => {
    const s = atBattle('ironman');
    session.state = s;
    const before = JSON.stringify(s);
    retreatToMap();
    expect(JSON.stringify(session.state)).toBe(before);
  });
});
