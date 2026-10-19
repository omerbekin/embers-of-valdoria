import { describe, expect, it } from 'vitest';
import { clientToLocal, rectToLocal, dropOnCell, fitOfHint, previewMove, reachRows, reachText, rowName, tapCell } from '../src/ui/formation-board-rules';

// 12 hücre: 1 = Warrior (ön sıra), 10 = Undead (arka sıra)
const cells = (): string[] => {
  const c = Array(12).fill('') as string[];
  c[1] = 'warrior';
  c[10] = 'undead';
  return c;
};

describe('formation board kuralları (Formation A)', () => {
  it('kahramana dokunmak yalnızca seçer; başka kahramana dokunmak takas ETMEZ', () => {
    const a = tapCell(cells(), { sel: '', moved: '' }, 1);
    expect(a.st.sel).toBe('warrior');
    expect(a.move).toBeUndefined();
    const b = tapCell(cells(), a.st, 10);
    expect(b.st.sel).toBe('undead');
    expect(b.move).toBeUndefined();
  });

  it('seçili kahramana yeniden dokunmak seçimi kaldırır', () => {
    const r = tapCell(cells(), { sel: 'warrior', moved: '' }, 1);
    expect(r.st.sel).toBe('');
  });

  it('seçiliyken boş hücreye dokunmak taşır ve seçimi kaldırır', () => {
    const r = tapCell(cells(), { sel: 'warrior', moved: '' }, 4);
    expect(r.move).toEqual({ id: 'warrior', cell: 4 });
    expect(r.st).toEqual({ sel: '', moved: 'warrior' });
  });

  it('seçim yokken boş hücreye dokunmak hiçbir şey yapmaz', () => {
    const r = tapCell(cells(), { sel: '', moved: '' }, 4);
    expect(r.move).toBeUndefined();
    expect(r.st.sel).toBe('');
  });

  it('sürükleyip bırakma: dolu hücreye = takas, boşa = taşıma, kendi hücresine / dışarıya = hareket yok', () => {
    expect(dropOnCell(cells(), 'warrior', 10).move).toEqual({ id: 'warrior', cell: 10 });
    expect(dropOnCell(cells(), 'warrior', 7).move).toEqual({ id: 'warrior', cell: 7 });
    expect(dropOnCell(cells(), 'warrior', 1).move).toBeUndefined();
    expect(dropOnCell(cells(), 'warrior', -1).move).toBeUndefined();
    expect(dropOnCell(cells(), 'warrior', 7).st.sel).toBe('');
  });

  it('previewMove: boşa taşır, doluyla yer değiştirir, girdiyi değiştirmez', () => {
    const c = cells();
    const swap = previewMove(c, 'warrior', 10);
    expect(swap[10]).toBe('warrior');
    expect(swap[1]).toBe('undead');
    expect(previewMove(c, 'warrior', 4)[1]).toBe('');
    expect(c[1]).toBe('warrior');
  });

  it('menzil: ulaşılan sıra sayısı ve cümle', () => {
    expect(reachRows(1, 0)).toBe(1);
    expect(reachRows(1, 1)).toBe(0);
    expect(reachRows(6, 0)).toBe(4);
    expect(reachRows(5, 3)).toBe(2);
    expect(reachRows(null, 3)).toBe(4);
    expect(reachText(0)).toMatch(/can't reach/i);
    expect(reachText(1)).toBe('From here: hits the front row only');
    expect(reachText(4)).toBe('From here: hits every row');
    expect(rowName(0)).toBe('Front row');
  });

  it('uygunluk: ipucu yok = iyi, exposed = zayıf, outOfReach = menzil dışı', () => {
    expect(fitOfHint(undefined)).toBe('good');
    expect(fitOfHint({ kind: 'exposed' })).toBe('weak');
    expect(fitOfHint({ kind: 'outOfReach' })).toBe('bad');
  });

  it('işaretçiyi yerel koordinata çevirir (ölçekli ve döndürülmüş sahne)', () => {
    // 2x ölçekli, ekranda (100,50) başlayan 1360 genişlikli kutu
    const r = { left: 100, top: 50, right: 100 + 2720, bottom: 50 + 1200 };
    expect(clientToLocal(300, 250, r, 1360, false)).toEqual({ x: 100, y: 100 });
    // döndürülmüş: ekran (vw - ly, lx); kutu 600 yüksek -> ekranda 1200 boy / 2720 en yok, bbox genişlik 1200 yükseklik 2720
    const rr = { left: 0, top: 0, right: 1200, bottom: 2720 };
    expect(clientToLocal(1100, 400, rr, 1360, true)).toEqual({ x: 200, y: 50 });
  });

  it('ögenin dikdörtgenini yerel konum + boyuta çevirir (ipucu / sürükleme gölgesi döndürülmüş sahnede de yerinde)', () => {
    const root = { left: 100, top: 50, right: 100 + 2720, bottom: 50 + 1200 };
    expect(rectToLocal({ left: 300, top: 250, right: 500, bottom: 450 }, root, 1360, false)).toEqual({ x: 100, y: 100, w: 100, h: 100 });
    // döndürülmüş: kök bbox 1200x2720; ögenin sağ üst köşesi yerel sol üst köşedir (clientToLocal ile aynı eşleme)
    const rr = { left: 0, top: 0, right: 1200, bottom: 2720 };
    const r = { left: 600, top: 400, right: 800, bottom: 600 };
    expect(rectToLocal(r, rr, 1360, true)).toEqual({ x: 200, y: 200, w: 100, h: 100 });
    expect(clientToLocal(r.right, r.top, rr, 1360, true)).toEqual({ x: 200, y: 200 });
  });
});
