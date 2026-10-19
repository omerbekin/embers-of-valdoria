import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Regresyon: tüccar karşılama kartındaki (.mw-welcome) "Browse wares" basışı ortak Gear örtüsünün
// zemin dokunuşu sayılmamalı (aksi halde karşılama + tüm tüccar penceresi kapanıyordu).
describe('tüccar karşılama kartı zemin kuralı', () => {
  it('gear-screen zemin sınaması .mw-welcome içini "içeri" sayar', () => {
    const src = readFileSync('src/ui/gear-screen.ts', 'utf8');
    const line = src.split('\n').find((l) => l.includes('dismissOnBackdrop(overlay, (t) => inPair'));
    expect(line).toBeTruthy();
    expect(line).toContain('.mw-welcome');
  });
  it('karşılama kartının kendi zemin kapanışı hâlâ var', () => {
    expect(readFileSync('src/ui/merchant-screen.ts', 'utf8')).toContain('dismissOnBackdrop(overlay, card');
  });
});
