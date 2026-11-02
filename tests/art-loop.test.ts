import { describe, expect, it } from 'vitest';
// @ts-expect-error saf JS aracı, tür dosyası yok
import * as loop from '../tools/codex/art-loop.mjs';

const L = loop as {
  validateJob: (job: unknown, exists?: (p: string) => boolean) => string[];
  parseVerdict: (b: string, t?: number) => { valid: boolean; pass: boolean; score: number; said: string | null };
  pickBest: (r: { round: number; score: number; pass: boolean; file: string }[]) => { round: number } | null;
  buildPlan: (job: unknown, root: string) => { pages: { id: string; maxRounds: number; chainFrom: string | null; file: string; checkRefs: string[] }[]; rel: string; threshold: number };
  terraArgs: (root: string, home: string, refs: string[]) => string[];
  solArgs: (dir: string, imgs: string[], out: string) => string[];
};

const page = { id: 'a', task: 't', checkRules: 'k' };
const job = { name: 'x', outDir: 'docs/out', pages: [page, { ...page, id: 'b', maxRounds: 2, refs: ['r.png'] }] };

describe('art-loop (saf kısımlar)', () => {
  it('geçerli iş dosyası hata vermez', () => {
    expect(L.validateJob(job)).toEqual([]);
  });
  it('eksik ve yinelenen alanları yakalar', () => {
    expect(L.validateJob(null)).not.toEqual([]);
    expect(L.validateJob({ ...job, name: '' })).toContain('name boş');
    expect(L.validateJob({ ...job, pages: [] })).toContain('pages boş');
    expect(L.validateJob({ ...job, pages: [page, page] }).some((e) => e.includes('yinelenmiş'))).toBe(true);
    expect(L.validateJob({ ...job, pages: [{ id: 'a b', task: 't', checkRules: 'k' }] }).some((e) => e.includes('id'))).toBe(true);
    expect(L.validateJob({ ...job, pages: [{ ...page, maxRounds: 0 }] }).some((e) => e.includes('maxRounds'))).toBe(true);
    expect(L.validateJob({ ...job, threshold: 11 }).some((e) => e.includes('threshold'))).toBe(true);
    expect(L.validateJob({ ...job, finalCheck: { task: 't' } }).length).toBeGreaterThan(1);
  });
  it('referans dosya yoksa yakalar', () => {
    expect(L.validateJob(job, () => false).some((e) => e.includes('dosya yok'))).toBe(true);
    expect(L.validateJob(job, () => true)).toEqual([]);
  });
  it('Sol kararını ayrıştırır', () => {
    expect(L.parseVerdict('GECTI\nPUAN: 9')).toMatchObject({ valid: true, pass: true, score: 9 });
    expect(L.parseVerdict('GEÇTİ\nPUAN: 9')).toMatchObject({ valid: true, said: 'GECTI' });
    expect(L.parseVerdict('KALDI\nPUAN: 6\nDüzelt')).toMatchObject({ valid: true, pass: false, score: 6 });
    expect(L.parseVerdict('KALDI\nPUAN: 8').pass).toBe(true); // eşik 8: puan 8 geçer
    expect(L.parseVerdict('KALDI\nPUAN: 8', 9).pass).toBe(false);
    expect(L.parseVerdict('Bilmiyorum').valid).toBe(false);
    expect(L.parseVerdict('kaldı\nPUAN: 7,5').score).toBe(7.5);
  });
  it('en iyi turu seçer', () => {
    const r = (round: number, score: number, pass = false) => ({ round, score, pass, file: `${round}.png` });
    expect(L.pickBest([r(1, 5), r(2, 7), r(3, 6)])?.round).toBe(2);
    expect(L.pickBest([r(1, 7), r(2, 7)])?.round).toBe(2); // eşitlikte sonraki
    expect(L.pickBest([r(1, 5), r(2, 9, true), r(3, 10)])?.round).toBe(2); // geçen ilk tur
    expect(L.pickBest([])).toBeNull();
  });
  it('plan: tur sayısı, zincir ve yollar', () => {
    const p = L.buildPlan({ ...job, chainPrevious: true, maxRounds: 3 }, 'C:/kok');
    expect(p.rel).toBe('docs/out');
    expect(p.threshold).toBe(8);
    expect(p.pages[0]!).toMatchObject({ maxRounds: 3, chainFrom: null });
    expect(p.pages[1]!).toMatchObject({ maxRounds: 2, chainFrom: 'a' });
    expect(p.pages[1]!.checkRefs[0]!.replace(/\\/g, '/')).toBe('C:/kok/r.png');
    expect(L.buildPlan(job, 'C:/kok').pages[1]!.chainFrom).toBeNull();
  });
  it('Terra ve Sol ayrı model ve kipte', () => {
    expect(L.terraArgs('R', 'H', ['x.png'])).toEqual(expect.arrayContaining(['gpt-6.1-terra', 'workspace-write', '-i', 'x.png']));
    const s = L.solArgs('D', ['y.png'], 'o.md');
    expect(s).toEqual(expect.arrayContaining(['gpt-6.1-sol', 'read-only', 'model_reasoning_effort=high', '-o', 'o.md']));
    expect(s).not.toContain('workspace-write');
  });
});
