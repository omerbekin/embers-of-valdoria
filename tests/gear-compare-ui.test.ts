// Gear (Ömer 2026-11-01): 1) çanta ipucunun yanında kuşanılmış item kartı (yuva eşlemesi + iki kartlı ipucu kutusu),
// 2) kahraman portre kartında item karşılaştırması yok, 3) Sheet'te "Go to skill tree" düğmesi.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyEquipment, type ItemInstance } from '../src/progression';
import { equippedAgainst, heroItemLine } from '../src/ui/gear-hover';

const hero = (cls: string, eq = emptyEquipment()) => ({ id: cls, class: cls, level: 20, equipment: eq });
const inst = (id: string, uid: string): ItemInstance => ({ uid, id });

describe('equippedAgainst: which worn item sits beside a bag item', () => {
  it('single-slot gear compares with its own slot; an empty slot gives no second card', () => {
    const eq = emptyEquipment();
    expect(equippedAgainst(hero('warrior', eq), inst('leather_coif', 'b1'))).toBeNull();
    const worn = inst('leather_coif', 'w1');
    eq.helm = worn;
    expect(equippedAgainst(hero('warrior', eq), inst('leather_coif', 'b1'))).toEqual({ slot: 'helm', item: worn });
  });
  it('the very same instance is never compared with itself', () => {
    const eq = emptyEquipment();
    const worn = inst('leather_coif', 'w1');
    eq.helm = worn;
    expect(equippedAgainst(hero('warrior', eq), worn)).toBeNull();
  });
  it('one-hand weapon: empty main hand gives no card; with a shield worn it compares with the main hand', () => {
    const sword = inst('arming_sword', 'm1');
    const eq = emptyEquipment();
    expect(equippedAgainst(hero('warrior', eq), inst('woodcutters_axe', 'b1'))).toBeNull();
    eq.weapon = sword;
    eq.offhand = inst('oak_shield', 's1');
    expect(equippedAgainst(hero('warrior', eq), inst('woodcutters_axe', 'b1'))).toEqual({ slot: 'weapon', item: sword });
  });
  it('one-hand weapon with a free off hand still compares with the main hand', () => {
    const sword = inst('arming_sword', 'm1');
    const eq = emptyEquipment();
    eq.weapon = sword;
    expect(equippedAgainst(hero('warrior', eq), inst('woodcutters_axe', 'b1'))).toEqual({ slot: 'weapon', item: sword });
  });
  it('two-hand weapon compares with the main hand even when a shield is worn', () => {
    const sword = inst('arming_sword', 'm1');
    const eq = emptyEquipment();
    eq.weapon = sword;
    eq.offhand = inst('oak_shield', 's1');
    expect(equippedAgainst(hero('warrior', eq), inst('greataxe', 'b2'))).toEqual({ slot: 'weapon', item: sword });
  });
  it('a shield compares with the off hand; an unknown item gives nothing', () => {
    const eq = emptyEquipment();
    const shield = inst('oak_shield', 's1');
    eq.offhand = shield;
    expect(equippedAgainst(hero('warrior', eq), inst('kite_shield', 'b3'))).toEqual({ slot: 'offhand', item: shield });
    expect(equippedAgainst(hero('warrior', eq), inst('no_such_item', 'b4'))).toBeNull();
    expect(equippedAgainst(hero('warrior', eq), null)).toBeNull();
  });
});

// --- DOM yokluğu için küçük sahte düğüm (item-tip-hide.test.ts ile aynı desen)
class FakeEl {
  className = '';
  style: Record<string, unknown> = { setProperty: () => {} };
  children: FakeEl[] = [];
  dataset: Record<string, string> = {};
  textContent = '';
  type = '';
  listeners: Record<string, Array<() => void>> = {};
  classList = {
    set: new Set<string>(),
    add: (c: string) => this.classList.set.add(c),
    remove: (c: string) => this.classList.set.delete(c),
    toggle: (c: string, on?: boolean) => ((on ?? !this.classList.set.has(c)) ? this.classList.set.add(c) : this.classList.set.delete(c)),
    contains: (c: string) => this.classList.set.has(c),
  };
  setAttribute(): void {}
  getContext(): null {
    return null;
  }
  toDataURL(): string {
    return '';
  }
  addEventListener(ev: string, fn: () => void): void {
    (this.listeners[ev] ??= []).push(fn);
  }
  append(...n: FakeEl[]): void {
    this.children.push(...n);
  }
  replaceChildren(...n: FakeEl[]): void {
    this.children = n;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, right: 1000, bottom: 600, width: 1000 };
  }
  offsetWidth = 600;
  offsetHeight = 300;
  clientWidth = 1000;
  clientHeight = 600;
}
const card = (): HTMLElement => {
  const n = new FakeEl();
  n.classList.add('it-card');
  return n as unknown as HTMLElement;
};

describe('ItemTip: two cards sit side by side (duo)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('document', { createElement: () => new FakeEl(), documentElement: { classList: { contains: () => false } } });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('hover and pin: duo only with two cards; the action row stays in the bag item card (first)', async () => {
    const { ItemTip } = await import('../src/ui/item-tip');
    const tip = new ItemTip(new FakeEl() as unknown as HTMLElement);
    tip.show('bag:a', [card(), card()], 10, 10);
    expect(tip.box.classList.contains('duo')).toBe(true);
    tip.show('bag:b', [card()], 10, 10);
    expect(tip.box.classList.contains('duo')).toBe(false);
    const [first, second] = [card(), card()];
    tip.pin('bag:a', [first, second], new FakeEl() as unknown as HTMLElement, [{ label: 'Equip', run: () => {} }]);
    expect(tip.box.classList.contains('duo')).toBe(true);
    expect((first as unknown as FakeEl).children).toHaveLength(1);
    expect((second as unknown as FakeEl).children).toHaveLength(0);
    expect(tip.pinned).toBe(true);
  });
  it('the equipped card carries the EQUIPPED tag; a plain card does not', async () => {
    const { itemTipNodes } = await import('../src/ui/item-tip');
    const tagged = itemTipNodes(inst('leather_coif', 'w1'), 'warrior', [], { equipped: true })[0] as unknown as FakeEl;
    expect(tagged.className).toContain('eq');
    expect(tagged.children.some((c) => c.className === 'it-eqtag' && c.textContent === 'Equipped')).toBe(true);
    const plain = itemTipNodes(inst('leather_coif', 'b1'), 'warrior', [], {})[0] as unknown as FakeEl;
    expect(plain.children.some((c) => c.className === 'it-eqtag')).toBe(false);
  });
});

describe('portrait card: no item comparison', () => {
  it('the hint sub-line is the plain line whatever item is selected; fallen heroes keep their mark', async () => {
    const { heroMarkHint } = await import('../src/ui/character-panel');
    const h = hero('warrior');
    expect(heroMarkHint(h)).toEqual({ sub: 'Level 20 · 0/7 items', tone: 'idle' });
    // item karşılaştırması hâlâ hesaplanabilir (item ipucundaki kahraman satırları için), ama portre kartına girmez
    expect(heroItemLine(h, inst('leather_coif', 'b1')).tone).not.toBe('idle');
    expect(heroMarkHint({ ...h, alive: false })).toEqual({ sub: 'Fallen', tone: 'no' });
  });
});

describe('Sheet: Go to skill tree', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { createElement: () => new FakeEl() });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('builds a text button that runs the callback (opens the Tree tab with the same hero)', async () => {
    const { goToTreeButton } = await import('../src/ui/gear-tree-link');
    const go = vi.fn();
    const b = goToTreeButton(go) as unknown as FakeEl;
    expect(b.className).toBe('gr-ms-go');
    expect(b.type).toBe('button');
    expect(b.children[0]?.textContent).toBe('Go to skill tree');
    b.listeners['click']?.forEach((f) => f());
    expect(go).toHaveBeenCalledTimes(1);
  });
});
