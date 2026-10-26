import { describe, expect, it } from 'vitest';
import {
  activeHeroes,
  autoResolve,
  completeStory,
  debugTeleport,
  healWoundWithValor,
  moveTo,
  newCampaign,
  nextStep,
  valorWoundHealBlocked,
  valorWoundHealCost,
  type CampaignState,
} from '../src/campaign';
import { content } from '../src/engine';
import { SIM_HARD_HEAL_AT, simTownRest, simValorWoundHeal } from '../src/sim/campaign';

/** Savaş dışı Valor ile yara silme (Ömer 2026-10-26): woundHeal.outsideCost Valor = yaşayan kahramanın 1 yarası; ceset kuralı aynı. */
const R = content.valorRules;
const COST = R.woundHeal!.outsideCost;

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
const base = () => debugTeleport(completeStory(playTo(newCampaign({ mode: 'normal', seed: 1234 }), R.campaign.introNode)), '5A');
const withHero = (s: CampaignState, id: string, patch: Record<string, unknown>): CampaignState => ({
  ...s,
  roster: s.roster.map((h) => (h.id === id ? { ...h, ...patch } : h)),
});

describe('Valor ile savaş dışı yara silme', () => {
  it('veri: bedel 3 Valor; diriltme bedelinden ucuz', () => {
    expect(COST).toBe(3);
    expect(valorWoundHealCost()).toBe(3);
    expect(COST).toBeLessThan(R.revive.outsideCost);
  });

  it('bedeli harcar, 1 yara siler, can oranı aynı kalır; son yara silinince alan kalkar', () => {
    const b = base();
    const id = activeHeroes(b)[0]!.id;
    const s = { ...withHero(b, id, { wounds: 2, hpRatio: 0.6 }), valor: 8 };
    const t = healWoundWithValor(s, id);
    const h = t.roster.find((x) => x.id === id)!;
    expect(t.valor).toBe(8 - COST);
    expect(h.wounds).toBe(1);
    expect(h.hpRatio).toBe(0.6);
    const u = healWoundWithValor(t, id);
    expect(u.roster.find((x) => x.id === id)!.wounds).toBeUndefined();
    expect(u.valor).toBe(8 - 2 * COST);
    expect(s.roster.find((x) => x.id === id)!.wounds).toBe(2); // girdi değişmez
  });

  it('engeller: Valor yetmez, yarasız, düşmüş (ceset diriltilir, yara silinmez), Valor kapalı', () => {
    const b = base();
    const id = activeHeroes(b)[0]!.id;
    expect(valorWoundHealBlocked({ ...withHero(b, id, { wounds: 1 }), valor: COST - 1 }, id)).toMatch(/Needs 3 Valor/);
    expect(valorWoundHealBlocked({ ...b, valor: 8 }, id)).toMatch(/no wounds/);
    expect(valorWoundHealBlocked({ ...withHero(b, id, { wounds: 3, alive: false, hpRatio: 0 }), valor: 8 }, id)).toMatch(/revived first/);
    const locked = withHero(b, id, { wounds: 1 });
    delete (locked as { valor?: number }).valor;
    expect(valorWoundHealBlocked(locked, id)).toMatch(/not known/);
    expect(() => healWoundWithValor({ ...b, valor: 8 }, id)).toThrow();
  });
});

describe('sim oyuncu varsayımı (2026-10-26)', () => {
  it('Valor yara silme bir diriltme payını ayırır, önce en çok yaralıyı siler', () => {
    const b = base();
    const [a, c] = activeHeroes(b).map((h) => h.id);
    const s = { ...withHero(withHero(b, a!, { wounds: 1 }), c!, { wounds: 2 }), valor: 8 };
    const r = simValorWoundHeal(s);
    expect(r.healed).toBe(1); // 8 - 3 = 5 >= 4 payı; ikinci silme 2'ye düşürürdü
    expect(r.state.valor).toBe(5);
    expect(r.state.roster.find((h) => h.id === c)!.wounds).toBe(1);
    expect(simValorWoundHeal({ ...s, valor: R.revive.outsideCost + COST - 1 }).healed).toBe(0);
  });

  it('kasaba dönüşü: normalde tek yara sebep değil, 2 yara ya da can %50 altı; elit / boss öncesi herhangi yara ya da can %75 altı', () => {
    const b = { ...base(), gold: 9999 };
    const [a, c] = activeHeroes(b).map((h) => h.id);
    const full = { ...b, roster: b.roster.map((h) => ({ ...h, hpRatio: 1 })) };
    const one = withHero(full, a!, { wounds: 1 });
    expect(simTownRest(one, 0.5)).toBeNull();
    expect(simTownRest(one, 0.5, true)).not.toBeNull();
    expect(simTownRest(withHero(one, c!, { wounds: 1 }), 0.5)).not.toBeNull();
    const mid = { ...full, roster: full.roster.map((h) => ({ ...h, hpRatio: 0.6 })) };
    expect(simTownRest(mid, 0.5)).toBeNull();
    expect(SIM_HARD_HEAL_AT).toBe(0.75);
    expect(simTownRest(mid, 0.5, true)).not.toBeNull();
  });
});
