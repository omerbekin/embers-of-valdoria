import { describe, expect, it } from 'vitest';
import {
  autoResolve,
  buyWare,
  completeSimple,
  debugTeleport,
  isDone,
  leaveMerchant,
  moveTo,
  newCampaign,
  nextStep,
  openCampaignShop,
  restAtCamp,
  reviveAtCamp,
  reviveCost,
  revisitKind,
  revisitNode,
  type CampaignState,
} from '../src/campaign';

// "Ashford'a giremiyorum" (Ömer 2026-10-13): adımları bitmiş kasaba / tüccar / kampa, üstünde dururken yeniden girilebilir.
const at = (node: string, seed = 5): CampaignState => debugTeleport(newCampaign({ mode: 'normal', seed }), node);
/** Yola çıkma adımına kadar (move) çöz; `stop` adımında durur. */
const until = (s: CampaignState, stop: string): CampaignState => {
  for (let i = 0; i < 20 && nextStep(s).kind !== stop; i++) s = autoResolve(s);
  expect(nextStep(s).kind).toBe(stop);
  return s;
};

describe('düğüme yeniden giriş', () => {
  it('Ashford: Leave sonrası kasaba yeniden açılır; hikâye yeniden oynamaz; Leave yine bitirir', () => {
    const left = until(at('4'), 'move');
    expect(revisitKind(left)).toBe('town');
    const back = revisitNode(left);
    expect(nextStep(back)).toEqual({ kind: 'town', node: '4' });
    expect(isDone(back, '4', 'story')).toBe(true);
    const again = completeSimple(back, 'town');
    expect(nextStep(again).kind).toBe('move');
    expect(revisitKind(again)).toBe('town');
  });

  it('kasaba tezgâhı: yeniden girince aynı mallar döner, satılan mal yeniden dolmaz; yola çıkınca unutulur', () => {
    let s = until(at('4'), 'town');
    s = openCampaignShop({ ...s, gold: 99999 });
    s = buyWare(s, 0);
    const wares = s.shop!.wares;
    s = completeSimple(s, 'town');
    expect(s.shop).toBeUndefined();
    s = openCampaignShop(revisitNode(s));
    expect(s.shop!.wares).toEqual(wares);
    expect(s.shop!.wares[0]!.sold).toBe(true);
    s = completeSimple(s, 'town');
    const step = nextStep(s);
    if (step.kind !== 'move') throw new Error('move bekleniyordu');
    expect(moveTo(s, step.options[0]!).closedShop).toBeUndefined();
  });

  it('tüccar düğümü yeniden açılır (aynı tezgâh)', () => {
    let s = until(at('camp'), 'merchant');
    s = openCampaignShop(s);
    const wares = s.shop!.wares;
    s = until(leaveMerchant(s), 'move');
    expect(revisitKind(s)).toBe('merchant');
    s = revisitNode(s);
    expect(nextStep(s).kind).toBe('merchant');
    expect(openCampaignShop(s).shop!.wares).toEqual(wares);
  });

  it('kamp: yeniden girişte ikinci dinlenme yok ama altınla diriltme açık', () => {
    const rested = until(restAtCamp(until(at('river'), 'rest')), 'move');
    expect(revisitKind(rested)).toBe('rest');
    expect(revisitNode(rested)).toBe(rested);
    expect(() => restAtCamp(rested)).toThrow();
    const fallen = rested.roster[0]!.id;
    const s = { ...rested, gold: reviveCost(rested), roster: rested.roster.map((h) => (h.id === fallen ? { ...h, hpRatio: 0, alive: false } : h)) };
    expect(reviveAtCamp(s, fallen).roster.find((h) => h.id === fallen)!.alive).toBe(true);
  });

  it('düz savaş düğümü ve bekleyen adım: yeniden giriş yok', () => {
    expect(revisitKind(until(at('10'), 'move'))).toBeNull();
    expect(revisitKind(until(at('4'), 'town'))).toBeNull();
  });
});
