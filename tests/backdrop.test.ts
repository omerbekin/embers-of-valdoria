import { describe, expect, it } from 'vitest';
import { isBackdropTap } from '../src/ui/backdrop';

const panel = { x: 100, y: 100, w: 200, h: 100 };

describe('zemine dokununca kapanma (CLAUDE.md > Geri / Menu kuralı)', () => {
  it('basış ve bırakış panelin dışındaysa kapanır', () => {
    expect(isBackdropTap({ x: 10, y: 10 }, { x: 20, y: 500 }, panel)).toBe(true);
  });
  it('panelin içinde başlayıp dışarıda biten sürükleme kapatmaz', () => {
    expect(isBackdropTap({ x: 150, y: 150 }, { x: 10, y: 10 }, panel)).toBe(false);
  });
  it('dışarıda başlayıp panelde biten basış kapatmaz; basış yoksa kapatmaz', () => {
    expect(isBackdropTap({ x: 10, y: 10 }, { x: 150, y: 150 }, panel)).toBe(false);
    expect(isBackdropTap(null, { x: 10, y: 10 }, panel)).toBe(false);
  });
});

// DOM ortamı yok (environment: node): instanceof Node/Element sınamaları için küçük sahte sınıflar.
describe('dismissOnBackdrop: panel dışındaki açık ipucu (.tt-tip) zemin sayılmaz', () => {
  it('ipucu içindeki basış kapatmaz, çıplak zemin kapatır', async () => {
    class FNode {
      kids: FNode[] = [];
      cls = '';
      handlers: Record<string, ((e: unknown) => void)[]> = {};
      parent: FNode | null = null;
      add(c: FNode): FNode {
        c.parent = this;
        this.kids.push(c);
        return c;
      }
      contains(n: FNode): boolean {
        return n === this || this.kids.some((k) => k.contains(n));
      }
      closest(sel: string): FNode | null {
        const c = sel.slice(1);
        for (let n: FNode | null = this; n; n = n.parent) if (n.cls === c) return n;
        return null;
      }
      addEventListener(t: string, f: (e: unknown) => void): void {
        (this.handlers[t] ??= []).push(f);
      }
      removeEventListener(): void {}
      fire(t: string): void {
        for (const f of this.handlers[t] ?? []) f({ target: this });
      }
    }
    const g = globalThis as unknown as Record<string, unknown>;
    g['Node'] = FNode;
    g['Element'] = FNode;
    try {
      const { dismissOnBackdrop } = await import('../src/ui/backdrop');
      const overlay = new FNode();
      const panelEl = overlay.add(new FNode());
      const tip = overlay.add(new FNode());
      tip.cls = 'tt-tip';
      const btn = tip.add(new FNode());
      // olaylar örtüde dinlenir; hedef olarak düğmeyi/örtüyü taklit et
      let n = 0;
      dismissOnBackdrop(overlay as never, panelEl as never, () => n++);
      const send = (target: FNode, type: string): void => overlay.handlers[type]!.forEach((f) => f({ target }));
      send(btn, 'pointerdown');
      send(btn, 'pointerup');
      expect(n).toBe(0);
      send(overlay, 'pointerdown');
      send(overlay, 'pointerup');
      expect(n).toBe(1);
    } finally {
      delete g['Node'];
      delete g['Element'];
    }
  });
});
