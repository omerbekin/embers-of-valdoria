// ItemTip gizleme yaşam döngüsü (2026-10-18 hayalet ipucu): CSS solması donsa da (arka plan sekmesi / gizli önizleme paneli)
// gizlenen ipucu kısa süre sonra satır içi display: none alır; yeniden gösterilince bu kaldırılır.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeEl {
  className = '';
  style: Record<string, string> = {};
  children: FakeEl[] = [];
  classList = {
    set: new Set<string>(),
    add: (c: string) => this.classList.set.add(c),
    remove: (c: string) => this.classList.set.delete(c),
    toggle: (c: string, on?: boolean) => ((on ?? !this.classList.set.has(c)) ? this.classList.set.add(c) : this.classList.set.delete(c)),
    contains: (c: string) => this.classList.set.has(c),
  };
  setAttribute(): void {}
  addEventListener(): void {}
  append(...n: FakeEl[]): void {
    this.children.push(...n);
  }
  replaceChildren(...n: FakeEl[]): void {
    this.children = n;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 1000 };
  }
  offsetWidth = 1000;
  clientWidth = 1000;
  clientHeight = 600;
}

describe('ItemTip hide', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', { createElement: () => new FakeEl() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('hard-hides after the fade even if CSS transitions are frozen, and shows again', async () => {
    const { ItemTip } = await import('../src/ui/item-tip');
    const host = new FakeEl();
    const tip = new ItemTip(host as unknown as HTMLElement);
    const node = new FakeEl() as unknown as HTMLElement;
    tip.show('slot:hands', [node], 10, 10);
    expect(tip.box.classList.contains('on')).toBe(true);
    expect(tip.box.style.display || '').toBe('');
    tip.hide();
    expect(tip.box.classList.contains('on')).toBe(false);
    vi.advanceTimersByTime(250);
    expect(tip.box.style.display).toBe('none');
    tip.show('slot:hands', [node], 10, 10);
    expect(tip.box.style.display || '').toBe('');
    // gizle + hemen yeniden göster: eski zamanlayıcı yeni ipucunu kapatmaz
    tip.hide();
    tip.show('slot:feet', [node], 10, 10);
    vi.advanceTimersByTime(250);
    expect(tip.box.style.display || '').toBe('');
    expect(tip.box.classList.contains('on')).toBe(true);
  });
});
