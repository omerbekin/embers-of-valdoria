// Inn'de biri bırakılınca yerine yedekteki kahraman alınabilir (Ömer 2026-10-26): reserveTakeBlocked / recruitFromReserve.
import { describe, expect, it } from 'vitest';
import { activeHeroes, autoResolve, campBlocked, campUsed, skipCamp, useCamp, debugTeleport, heroById, leaveAtInn, newCampaign, nextStep, recruitFromReserve, reserveTakeBlocked, type CampaignState } from '../src/campaign';

function town(): CampaignState {
  let s = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), '7');
  for (let i = 0; i < 20 && nextStep(s).kind !== 'town'; i++) s = autoResolve(s);
  expect(nextStep(s).kind).toBe('town');
  return s;
}

describe('yedekten takıma alma', () => {
  it('yer yoksa engelli, Inn\'e bırakınca boş yere girer ve yedekten çıkar', () => {
    const s = town();
    const spare = { ...s.roster[0]!, id: 'spare-1' };
    const withReserve: CampaignState = { ...s, reserve: [spare] };
    expect(reserveTakeBlocked(withReserve, 'spare-1')).toMatch(/full/);
    const id = activeHeroes(withReserve)[0]!.id;
    const t = leaveAtInn(withReserve, id);
    expect(reserveTakeBlocked(t, 'spare-1')).toBeNull();
    const back = recruitFromReserve(t, 'spare-1');
    expect(heroById(back, 'spare-1')).toBeTruthy();
    expect(back.active.includes('spare-1')).toBe(true);
    expect(back.reserve).toBeUndefined();
  });

  it('yedekte olmayan kahraman ve kasaba dışı engelli', () => {
    const s = town();
    expect(reserveTakeBlocked(s, 'nobody')).not.toBeNull();
    expect(() => recruitFromReserve(s, 'nobody')).toThrow();
  });
});

describe('kampı seçmeden bırakma', () => {
  it('adım biter, kamp kullanılmamış kalır; geri gelince kullanılabilir', () => {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 4242 }), 'hillcamp');
    for (let i = 0; i < 20 && nextStep(s).kind !== 'rest'; i++) s = autoResolve(s);
    expect(nextStep(s).kind).toBe('rest');
    const left = skipCamp(s);
    expect(nextStep(left).kind).toBe('move');
    expect(campUsed(left)).toBeNull();
    expect(campBlocked(left, { kind: 'rest' })).toBeNull();
    const rested = useCamp(left, { kind: 'rest' });
    expect(campUsed(rested)).toBe('rest');
    expect(campBlocked(rested, { kind: 'rest' })).not.toBeNull();
  });
});
