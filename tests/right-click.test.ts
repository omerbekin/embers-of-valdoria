import { describe, expect, it } from 'vitest';
import { keepsNativeMenu, phaserAcceptsButton, rightClickAction, setPhaserRightClick } from '../src/ui/right-click';

describe('sağ tık', () => {
  it('metin girişlerinde tarayıcı menüsü açık kalır, diğer yerlerde kapanır', () => {
    expect(keepsNativeMenu({ tagName: 'INPUT', type: 'text' } as never)).toBe(true);
    expect(keepsNativeMenu({ tagName: 'TEXTAREA' })).toBe(true);
    expect(keepsNativeMenu({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(keepsNativeMenu({ tagName: 'INPUT', type: 'checkbox' } as never)).toBe(false);
    expect(keepsNativeMenu({ tagName: 'BUTTON' })).toBe(false);
    expect(keepsNativeMenu(null)).toBe(false);
  });
  it('boş yere sağ tık sırası: seçim varsa önce yalnızca seçim iptal, sonraki tık kartı kapatır', () => {
    let selection = true;
    let cardOpen = true;
    const click = () => {
      if (rightClickAction(selection) === 'cancel-selection') selection = false;
      else cardOpen = false;
    };
    click();
    expect(selection).toBe(false);
    expect(cardOpen).toBe(true);
    click();
    expect(cardOpen).toBe(false);
    expect(rightClickAction(false)).toBe('close-cards');
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
