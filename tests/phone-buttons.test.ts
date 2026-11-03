import { describe, expect, it } from 'vitest';
import { growBox, PHONE_HIT_PX } from '../src/ui/phone-buttons';

describe('phone-buttons', () => {
  it('30 px tall button gets a 44 px hit box, wide side untouched', () => {
    const g = growBox({ left: 100, top: 50, width: 200, height: 30 });
    expect(g.bottom - g.top).toBe(PHONE_HIT_PX);
    expect(g.top).toBe(43);
    expect(g.right - g.left).toBe(200);
  });
  it('narrow chip grows in width too', () => {
    const g = growBox({ left: 0, top: 0, width: 29, height: 30 });
    expect(g.right - g.left).toBe(44);
  });
});
