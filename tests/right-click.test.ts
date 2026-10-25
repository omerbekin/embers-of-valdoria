import { describe, expect, it } from 'vitest';
import { createPressGate, installPhaserButtonFilter, keepsNativeMenu, phaserAcceptsButton, rightClickAction, setPhaserRightClick } from '../src/ui/right-click';

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
  it("DOM öğesinde başlayan tıklama Phaser'a sızmaz (debug Close -> haritada bölge adı); tuvalde başlayan sürükleme dışarıda bırakılabilir", () => {
    const canvas = { id: 'canvas' } as unknown as HTMLCanvasElement;
    const button = { id: 'button' } as unknown as EventTarget;
    const got: string[] = [];
    const input = {
      onMouseDown: (e: MouseEvent) => got.push(`down:${(e.target as unknown as { id: string }).id}`),
      onMouseUp: (e: MouseEvent) => got.push(`up:${(e.target as unknown as { id: string }).id}`),
      onTouchStart: (e: TouchEvent) => got.push(`touch:${(e.target as unknown as { id: string }).id}`),
    };
    installPhaserButtonFilter({ input, canvas });
    const ev = (target: unknown) => ({ button: 0, target }) as unknown as MouseEvent;
    // debug menüsünün Close düğmesi: basış da bırakış da DOM'da -> Phaser hiçbirini görmez
    input.onMouseDown(ev(button));
    input.onMouseUp(ev(button));
    // DOM'da basıp tuvalde bırakmak da tık sayılmaz
    input.onMouseDown(ev(button));
    input.onMouseUp(ev(canvas));
    expect(got).toEqual([]);
    // tuvalde basıp DOM üstünde bırakmak (sürükleme sonu) geçer; normal tık geçer
    input.onMouseDown(ev(canvas));
    input.onMouseUp(ev(button));
    input.onMouseDown(ev(canvas));
    input.onMouseUp(ev(canvas));
    // dokunma: yalnızca tuvalde başlayan
    input.onTouchStart({ target: button } as unknown as TouchEvent);
    input.onTouchStart({ target: canvas } as unknown as TouchEvent);
    expect(got).toEqual(['down:canvas', 'up:button', 'down:canvas', 'up:canvas', 'touch:canvas']);
    const g = createPressGate((t) => t === canvas);
    expect(g.up()).toBe(true); // basışsız bırakma (sayfa ilk açılış) engellenmez
  });
});
