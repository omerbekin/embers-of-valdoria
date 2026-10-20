import { describe, expect, it } from 'vitest';
import { richSegs, splitNow, splitStatTitle } from '../src/ui/band-rich';
import { bandTipHtml, bandRichHtml } from '../src/ui/band-tip';
import { tipToBand } from '../src/ui/battle-hud';

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

  // V2 çipleri (Ömer 2026-10-20): menzil / bedel / bekleme yalnızca ikon + sayı; sözcük yok, tam anlam ipucunda
  it('skill ipucu V2: menzil / MP / bekleme çipleri sözcüksüz, ipucu ve aria metni dolu', () => {
    const html = bandTipHtml(
      tipToBand({
        title: 'Blizzard',
        meta: [
          { iconUrl: 'mp.png', text: '14 MP' },
          { iconUrl: 'cd.png', text: '2 turns' },
        ],
        tags: [{ text: 'Block 3x2' }, { text: 'Ice', color: '#8fd8ff' }, { text: 'Range 6', kind: 'range' }],
        rows: [],
      }),
    );
    const chips = [...html.matchAll(/<span class="bt-chip[^"]*"[^>]*>(.*?)<\/span>(?:<\/span>)?/g)];
    expect(html).not.toMatch(/>\s*(Range|MP|turns?)/);
    expect(html).not.toContain('turns</span>');
    expect(chips.length).toBeGreaterThanOrEqual(5);
    for (const t of ['Range 6', 'Costs 14 MP', 'Cooldown: 2 turns']) {
      expect(html).toContain(`data-tip="${t}"`);
      expect(html).toContain(`aria-label="${t}"`);
    }
    expect(html).toContain('<span class="n">14</span>');
    expect(html).toContain('<span class="n">6</span>');
    expect(html).toContain('<span class="n">2</span>');
  });

  it('skill ipucu V2: tek tur "1 turn", Rage bedeli "Costs 10 Rage", bedelsiz Free ve sözcüklü yedekler korunur', () => {
    const html = bandTipHtml(
      tipToBand({
        title: 'Smash',
        meta: [
          { iconUrl: 'rage.png', text: 'RAGE 10' },
          { iconUrl: 'cd.png', text: '1 turn' },
          { text: 'Free' },
          { iconUrl: 'hp.png', text: '20% of current HP' },
        ],
        rows: [],
      }),
    );
    expect(html).toContain('data-tip="Costs 10 Rage"');
    expect(html).toContain('data-tip="Cooldown: 1 turn"');
    expect(html).toContain('Free');
    expect(html).toContain('of current HP'); // sayıya indirgenemeyen bedel eski yazılı çip olarak kalır
    expect(html).not.toContain('RAGE');
  });
});
