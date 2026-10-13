import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { applyOutcome, battleFor, newRun, parseRun, reviveWithValor, valorReviveBlocked, wavePlan, type EndlessRun, type WaveOutcome } from '../src/endless';

/** Endless Valor (Ömer 2026-10-13): ilk dalgadan açık; dalga zaferinde kazanç, savaşta oyuncu tarafına verilir, savaş dışı diriltme outsideCost. */
const R = content.valorRules;
const OUT = R.revive.outsideCost;
const win = (run: EndlessRun, o: { dead?: string[]; valorLeft?: number; flawless?: boolean } = {}): WaveOutcome => ({
  victory: true,
  units: run.heroes.map((h) => ({ heroId: h.id, hpRatio: o.dead?.includes(h.id) ? 0 : 0.6, alive: !o.dead?.includes(h.id) })),
  kills: 3,
  turns: 20,
  ...(o.valorLeft !== undefined ? { valorLeft: o.valorLeft } : {}),
  ...(o.flawless !== undefined ? { flawless: o.flawless } : {}),
});
const run0 = (): EndlessRun => newRun(7, ['warrior', 'mage', 'archer', 'paladin'], 't');
const atWave = (wave: number, valor: number): EndlessRun => ({ ...run0(), wave, valor });

describe('Endless Valor', () => {
  it('koşu 0 Valor ile başlar; dalga planı Valor taşır, motor yalnızca oyuncu tarafında açar', () => {
    const run = run0();
    expect(run.valor).toBe(R.endless.start);
    const b = battleFor({ ...wavePlan(run), valor: 6 });
    expect(b.valorOf('party')).toBe(6);
    expect(b.valorOf('enemy')).toBeNull();
    expect(b.globalSkillIds('party')).toContain('valor_revive');
  });

  it('normal dalga +1 (+1 kusursuz), elit (5. dalga) +2, boss (10.) +3; savaşta harcanan düşülür; üst sınır cap', () => {
    const F = R.earn.flawless; // Ömer 2026-10-13: 0
    expect(applyOutcome(atWave(1, 0), { wave: 1 }, win(atWave(1, 0))).valor).toBe(1 + F);
    expect(applyOutcome(atWave(1, 0), { wave: 1 }, win(atWave(1, 0), { dead: ['h2'] })).valor).toBe(1);
    expect(applyOutcome(atWave(5, 0), { wave: 5 }, win(atWave(5, 0), { dead: ['h2'] })).valor).toBe(2);
    expect(applyOutcome(atWave(5, 0), { wave: 5 }, win(atWave(5, 0))).valor).toBe(2 + F);
    expect(applyOutcome(atWave(10, 0), { wave: 10 }, win(atWave(10, 0), { dead: ['h1'] })).valor).toBe(3);
    expect(applyOutcome(atWave(2, R.cap - 1), { wave: 2 }, win(atWave(2, R.cap - 1), { valorLeft: 2, flawless: false })).valor).toBe(3);
    expect(applyOutcome(atWave(10, R.cap - 1), { wave: 10 }, win(atWave(10, R.cap - 1))).valor).toBe(R.cap);
  });

  it('savaş dışında Valor ile diriltme: outsideCost Valor, %50 can (+%50 MP taşınır); yetmezse / yarım savaş varken olmaz; Revive kartı yok', () => {
    const won = applyOutcome(atWave(1, OUT), { wave: 1 }, win(atWave(1, OUT), { dead: ['h2'], flawless: false }));
    expect(won.phase).toBe('reward');
    expect(won.valor).toBe(OUT + 1);
    const t = reviveWithValor(won, 'h2');
    expect(t.valor).toBe(1);
    expect(t.heroes.find((h) => h.id === 'h2')!.hpRatio).toBe(R.revive.hpRatio);
    expect(valorReviveBlocked(t, 'h2')).toBe('This hero has not fallen');
    expect(valorReviveBlocked({ ...won, valor: OUT - 1 }, 'h2')).toBe(`Needs ${OUT} Valor (you have ${OUT - 1})`);
    expect(valorReviveBlocked({ ...won, suspended: { wave: 2, seed: 1, turn: 1, hash: 'x', actions: [] } }, 'h2')).toBe('Finish the battle first');
    expect(t.offer!.some((c) => c.kind === 'revive')).toBe(false); // Revive kartı kaldırıldı (Ömer 2026-10-14)
  });

  it('eski kayıt (Valor alanı yok) 0 ile yüklenir; bozuk değer kırpılır', () => {
    const { valor: _v, ...old } = run0();
    expect(parseRun(JSON.stringify({ version: 4, run: old }))!.valor).toBe(0);
    expect(parseRun(JSON.stringify({ version: 4, run: { ...old, valor: 42 } }))!.valor).toBe(R.cap);
  });
});
