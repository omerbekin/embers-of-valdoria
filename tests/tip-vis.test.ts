// Ortak DOM ipucu göster/gizle (src/ui/tip-vis.ts): gizlenince solma sonrası display: none, yeniden gösterilince geri açılır.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tipOff, tipOn } from '../src/ui/tip-vis';

const fake = () => {
  const set = new Set<string>();
  return { style: {} as Record<string, string>, offsetWidth: 10, classList: { add: (c: string) => set.add(c), remove: (c: string) => set.delete(c), contains: (c: string) => set.has(c) } } as unknown as HTMLElement;
};

describe('tip-vis', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('gizleyince solma süresinden sonra display none, tekrar gösterince geri açılır', () => {
    const b = fake();
    tipOn(b);
    expect(b.classList.contains('on')).toBe(true);
    tipOff(b);
    expect(b.classList.contains('on')).toBe(false);
    vi.advanceTimersByTime(250);
    expect(b.style['display']).toBe('none');
    tipOn(b);
    expect(b.style['display']).toBe('');
    expect(b.classList.contains('on')).toBe(true);
  });
  it('gizleme beklerken tekrar gösterilirse kapanmaz', () => {
    const b = fake();
    tipOn(b);
    tipOff(b);
    tipOn(b);
    vi.advanceTimersByTime(300);
    expect(b.style['display']).not.toBe('none');
  });
});
