import { describe, expect, it } from 'vitest';
import { hpLossSwing } from '../src/game/hp-preview';

describe('can çubuğu önizleme aralığı', () => {
  it('en az ve en çok hasar arasında gidip gelir', () => {
    expect(hpLossSwing(37, 80, 27, 33)).toEqual({ maxWidth: 33 / 80, minScale: 27 / 33 });
  });

  it('sabit hasarda gidip gelme yok', () => {
    expect(hpLossSwing(50, 100, 10, 10).minScale).toBe(1);
  });

  it('canı aşan hasar mevcut canla sınırlı', () => {
    expect(hpLossSwing(20, 100, 30, 40)).toEqual({ maxWidth: 0.2, minScale: 1 });
    expect(hpLossSwing(20, 100, 10, 40)).toEqual({ maxWidth: 0.2, minScale: 0.5 });
  });

  it('kalkan en az hasarı sıfırlarsa parça tamamen kapanabilir, hasar yoksa bozulmaz', () => {
    expect(hpLossSwing(50, 100, 0, 8).minScale).toBe(0);
    expect(hpLossSwing(50, 100, 0, 0)).toEqual({ maxWidth: 0, minScale: 1 });
  });
});
