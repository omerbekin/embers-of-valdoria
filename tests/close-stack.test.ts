import { describe, it, expect, beforeEach, vi } from 'vitest';

type L = (e: unknown) => void;
const listeners: Record<string, L[]> = {};
vi.stubGlobal('window', {
  addEventListener: (t: string, f: L) => (listeners[t] ??= []).push(f),
  matchMedia: () => ({ matches: false }),
  dispatchEvent: () => true,
});

const { pushClose, closeTop, closeDepth, resetCloseStackForTests } = await import('../src/ui/close-stack');

const esc = (): { stopped: boolean } => {
  const r = { stopped: false };
  for (const f of listeners.keydown ?? []) f({ key: 'Escape', defaultPrevented: false, target: null, stopImmediatePropagation: () => (r.stopped = true), preventDefault() {} });
  return r;
};

describe('close stack', () => {
  beforeEach(() => resetCloseStackForTests());

  it('closes only the topmost window', () => {
    const calls: string[] = [];
    pushClose({ close: () => calls.push('a') });
    pushClose({ close: () => calls.push('b') });
    expect(closeTop()).toBe(true);
    expect(calls).toEqual(['b']);
  });

  it('Esc uses esc handler and swallows the key; empty stack lets it pass', () => {
    const calls: string[] = [];
    const pop = pushClose({ close: () => calls.push('x'), esc: () => calls.push('esc') });
    expect(esc().stopped).toBe(true);
    expect(calls).toEqual(['esc']);
    pop();
    expect(closeDepth()).toBe(0);
    expect(esc().stopped).toBe(false);
    expect(closeTop()).toBe(false);
  });

  it('pop is idempotent and removes the right entry', () => {
    const popA = pushClose({ close: () => {} });
    pushClose({ close: () => {} });
    popA();
    popA();
    expect(closeDepth()).toBe(1);
  });
});
