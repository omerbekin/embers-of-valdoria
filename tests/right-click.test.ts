import { describe, expect, it } from 'vitest';
import { keepsNativeMenu, phaserAcceptsButton, setPhaserRightClick } from '../src/ui/right-click';

describe('sağ tık', () => {
  it('metin girişlerinde tarayıcı menüsü açık kalır, diğer yerlerde kapanır', () => {
    expect(keepsNativeMenu({ tagName: 'INPUT', type: 'text' } as never)).toBe(true);
    expect(keepsNativeMenu({ tagName: 'TEXTAREA' })).toBe(true);
    expect(keepsNativeMenu({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(keepsNativeMenu({ tagName: 'INPUT', type: 'checkbox' } as never)).toBe(false);
    expect(keepsNativeMenu({ tagName: 'BUTTON' })).toBe(false);
    expect(keepsNativeMenu(null)).toBe(false);
  });
  it('Phaser sağ tuşu yalnızca savaşta alır, orta tuşu hiç', () => {
    setPhaserRightClick(false);
    expect(phaserAcceptsButton(0)).toBe(true);
    expect(phaserAcceptsButton(2)).toBe(false);
    setPhaserRightClick(true);
    expect(phaserAcceptsButton(2)).toBe(true);
    expect(phaserAcceptsButton(1)).toBe(false);
    setPhaserRightClick(false);
  });
});
