import { describe, expect, it } from 'vitest';
import type { Stats } from '../src/engine';
import { snapToStep } from '../src/engine/stats';
import { ATTACK_STATS, DEFENSE_STATS, MAIN_STATS, statRowText } from '../src/game/stat-columns';
import { fmtPanel } from '../src/progression/item-text';

// Ekranda "8.700000000000001" gibi kayan nokta artığı görünmesin (Ömer 2026-10-28: "bunu kökten çözemez miyiz").
// Yazılan her sayı en fazla birkaç ondalık taşımalı; yeni bir stat satırı ham sayı basarsa bu test kırılır.
const LONG = /\d\.\d{4,}/;
const UGLY = [8.700000000000001, 0.1 + 0.2, 87 * 0.1, 1.15 * 3, 2.675, 14.999999999, 0.30000000000000004, 123.456789];

describe('kayan nokta artığı yok', () => {
  it('snapToStep adım katını temiz verir', () => {
    expect(snapToStep(8.7, 0.1)).toBe(8.7);
    expect(String(snapToStep(87 * 0.1, 0.1))).toBe('8.7');
    for (let i = 0; i < 500; i++) {
      const v = Math.random() * 200;
      for (const step of [0.1, 0.05, 0.25, 0.5, 1]) expect(String(snapToStep(v, step))).not.toMatch(LONG);
    }
  });

  it('savaş paneli stat satırları ham sayı basmaz', () => {
    const kinds = [...MAIN_STATS, ...ATTACK_STATS, ...DEFENSE_STATS];
    const label = new Proxy({}, { get: (_t, k) => String(k).toUpperCase() }) as never;
    for (const v of UGLY) {
      const s = new Proxy({}, { get: () => v }) as Stats;
      for (const k of kinds) expect(statRowText(k, s, label), `${k} = ${v}`).not.toMatch(LONG);
    }
  });

  it('karakter paneli biçimi ham sayı basmaz', () => {
    for (const v of UGLY) for (const fmt of [undefined, 'pct', 'dec'] as const) expect(fmtPanel({ value: v, fmt } as never)).not.toMatch(LONG);
  });
});
