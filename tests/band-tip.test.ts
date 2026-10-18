import { describe, expect, it } from 'vitest';
import { richSegs, splitNow, splitStatTitle } from '../src/ui/band-rich';
import { bandTipHtml, bandRichHtml } from '../src/ui/band-tip';

describe('band tooltip (A - Band) metin ayrıştırma', () => {
  it('etiket + rakam + fark parçalanır, metin birebir korunur', () => {
    const line = 'Max HP: +3 per point (+2)';
    const segs = richSegs(line);
    expect(segs[0]).toEqual({ text: 'Max HP', kind: 'k' });
    expect(segs.filter((s) => s.kind === 'n').map((s) => s.text)).toEqual(['+3']);
    expect(segs.at(-1)).toEqual({ text: '(+2)', kind: 'up' });
    // iki noktanın dışında hiçbir karakter kaybolmaz
    expect(segs.map((s) => s.text).join('')).toBe(line.replace(':', ''));
  });

  it('baş harfi büyük kelime + rakam anahtar kelime olur, kelime içi rakam sayılmaz', () => {
    expect(richSegs('Damage 30% LUCK (10)')[0]).toEqual({ text: 'Damage', kind: 'k' });
    expect(richSegs('Block2 plain').some((s) => s.kind === 'n')).toBe(false);
    expect(richSegs('Crit x1.5').some((s) => s.kind === 'n' && s.text === 'x1.5')).toBe(true);
  });

  it('"(now N)" sağ çipe ayrılır', () => {
    expect(splitNow('Max HP: +3 per point (now 84)')).toEqual({ text: 'Max HP: +3 per point', now: 'now 84' });
    expect(splitNow('Plain line')).toEqual({ text: 'Plain line' });
  });

  it('stat başlığı ad + büyük değer + bonus', () => {
    expect(splitStatTitle('Strength 18')).toEqual({ name: 'Strength', value: '18' });
    expect(splitStatTitle('Crit damage x1.5')).toEqual({ name: 'Crit damage', value: 'x1.5' });
    expect(splitStatTitle('Strength 18 → 20 · Brute')).toEqual({ name: 'Strength', value: '18 → 20', bonus: 'Brute' });
    expect(splitStatTitle('Block chance')).toEqual({ name: 'Block chance' });
  });

  it('HTML: şerit, çipler, ayırıcı, satırlar; kaçış güvenli', () => {
    const html = bandTipHtml({ accent: '#7fbf3f', kind: 'Skill', title: 'Venom <Edge>', chips: [{ text: 'Single target' }], lines: [{ text: 'Damage 100% DEX (26)' }], foot: 'Sweeps' });
    expect(html).toContain('bt-head');
    expect(html).toContain('bt-meta');
    expect(html).toContain('bt-div');
    expect(html).toContain('bt-foot');
    expect(html).toContain('Venom &lt;Edge&gt;');
    expect(bandRichHtml('Wound 2 turns')).toContain('<span class="n">2</span>');
  });
});
