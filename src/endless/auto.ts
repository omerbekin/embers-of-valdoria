// Endless dalgasını başsız (headless) oynatır: iki taraf yapay zeka (testler, debug "Auto-win" yok; ileride balance-tester'ın `sim:endless` aracı
// bunu kullanır: roadmap 1.5 "item'li / item'siz kaçıncı dalgada ölünür"). Saf: yalnızca motor.
import { Battle, chooseAction, content, type AiDifficulty } from '../engine';
import { ENDLESS, type EndlessConfig, type EndlessRun } from './data';
import { applyOutcome, outcomeFromBattle } from './run';
import { wavePlan, type WavePlan } from './waves';

/** Savaşı bitmiş saymak için tur sınırı (src/sim/simulate.ts MAX_TURNS ile aynı). */
export const AUTO_MAX_TURNS = 400;

/** Planın savaşı (BattleScene'in kurduğuyla aynı giriş: hücre listeleri, arrange=false). */
export const battleFor = (plan: WavePlan): Battle =>
  new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...waveTeams(plan), ...valorTeams(plan) }, false));

/** Planın dalgalı savaş girişi (motor teams.waves; docs/design/waves.md). Dalgasız planda boş. */
export const waveTeams = (plan: Pick<WavePlan, 'waves'>) => (plan.waves?.length ? { waves: plan.waves.map((w) => ({ enemies: w.enemies, units: w.units })) } : {});

/** Planın Valor'u motor girişi olarak (yalnızca oyuncu tarafı). `valor` false: Valor'suz karşılaştırma (sim VALOR=off). */
export const valorTeams = (plan: Pick<WavePlan, 'valor'>, on = true) => (on ? { valor: { party: plan.valor ?? 0 } } : {});

export function fightWave(plan: WavePlan, player: AiDifficulty = 'medium', valor = true): Battle {
  const battle = valor ? battleFor(plan) : new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...waveTeams(plan) }, false));
  while (!battle.winner && battle.turnsTaken < AUTO_MAX_TURNS) {
    const actor = battle.currentActor;
    if (!actor) break;
    const choice = chooseAction(battle, actor.uid, content.aiConfig, undefined, { difficulty: actor.side === 'enemy' ? plan.difficulty : player });
    if (!battle.applyChoice(actor.uid, choice).ok) break;
  }
  return battle;
}

/** Sıradaki dalgayı YZ ile oynar ve sonucu koşuya uygular. */
export function autoPlayWave(run: EndlessRun, player: AiDifficulty = 'medium', cfg: EndlessConfig = ENDLESS): EndlessRun {
  const plan = wavePlan(run, cfg);
  const battle = fightWave(plan, player);
  return applyOutcome(run, plan, outcomeFromBattle(plan, battle), cfg);
}
