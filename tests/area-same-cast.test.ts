import { describe, expect, it } from 'vitest';
import { sameAreaResult } from '../src/game/target-cells';

describe('sameAreaResult', () => {
  it('aynı hücreler + hedefler (sıradan bağımsız) = aynı', () => {
    expect(sameAreaResult({ cells: [1, 2, 3], targets: ['a', 'b'], valid: true }, { cells: [3, 2, 1], targets: ['b', 'a'], valid: true })).toBe(true);
  });
  it('farklı alan = farklı', () => {
    expect(sameAreaResult({ cells: [1, 2], targets: ['a'], valid: true }, { cells: [2, 3], targets: ['a'], valid: true })).toBe(false);
    expect(sameAreaResult({ cells: [1], targets: ['a'], valid: true }, { cells: [1], targets: ['b'], valid: true })).toBe(false);
  });
  it('geçersiz alan asla atmaz', () => {
    expect(sameAreaResult({ cells: [1], targets: [], valid: false }, { cells: [1], targets: [], valid: false })).toBe(false);
  });
});
