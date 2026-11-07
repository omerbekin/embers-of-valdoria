import { describe, expect, it } from 'vitest';
import { skillPlateHtml } from '../src/ui/skill-bar';
import { bandTipHtml } from '../src/ui/band-tip';

const base = { id: 'x', name: 'X', iconUrl: '', wait: 0, enabled: true, selected: false, ult: false };

describe('skill plate: cost / cooldown direction and Silenced', () => {
  it('chip gets up (red) / down (green) class from dir', () => {
    const html = skillPlateHtml({ ...base, cost: [{ text: '20', kind: 'mp', dir: 'up' }, { text: '2', kind: 'cd', dir: 'down' }] }, '');
    expect(html).toMatch(/bp-chip[^"]* up"/);
    expect(html).toMatch(/bp-chip cd down"/);
  });
  it('silenced plate shows the word and is dimmed like a locked one', () => {
    const html = skillPlateHtml({ ...base, enabled: false, silenced: true, wait: 2, cost: [{ text: '10', kind: 'mp' }] }, '');
    expect(html).toContain('Silenced');
    expect(html).not.toContain('class="cdv"');
  });
  it('tip chips are not focusable (not clickable look) and carry dir', () => {
    const html = bandTipHtml({ title: 'T', chips: [{ text: '', num: '20', bare: true, tone: 'v', tip: 'Costs 20 MP', dir: 'up' }] });
    expect(html).not.toContain('tabindex');
    expect(html).toContain('bt-chip v q up');
  });
});
