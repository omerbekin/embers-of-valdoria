import { describe, expect, it } from 'vitest';
import {
  CURSOR_CHOICES,
  CURSOR_SIZES,
  CURSOR_STATES,
  DEFAULT_CURSOR,
  DEFAULT_CURSOR_SIZE,
  LINE_ANGLE,
  PAD,
  PressState,
  VIEW,
  buildCursorCss,
  clampCursorId,
  clampCursorSize,
  cursorArt,
  cursorPrefs,
  cursorUiMode,
  mergeCursorPrefs,
  mergeRecord,
  modeForNative,
  readCursorPrefs,
  resetCursorPrefsCache,
  setCursorPrefs,
  stepCursorSize,
} from '../src/ui/cursor-theme';
import { stepRecord, readStepLevel } from '../src/ui/volume-steps';
import { SETTINGS_PAGES } from '../src/ui/settings-pages';

// Oyun imleci (Ömer 2026-11-02, taslak cursor-6 / cursor-7): varsayılan Longsword, 6 imleç + System, üç durum, boyut adımları, kayıt birleştirme.
describe('imleç basılı durumu', () => {
  const SIX = ['longsword', 'boar-spear', 'kama-dagger', 'hunting-arrow', 'thorn-staff', 'ember-shard', 'wax-candle', 'bat-wing'] as const;

  it('durum tablosu: sekiz imlecin hepsinde press var ve diğer durumlardan farklı; sıcak nokta durumlar arası aynı', () => {
    expect(CURSOR_STATES).toContain('press');
    for (const id of SIX) {
      const svgs = new Set(CURSOR_STATES.map((st) => cursorArt(id, st, 1).svg));
      expect(svgs.size).toBe(CURSOR_STATES.length);
      const hot = CURSOR_STATES.map((st) => { const a = cursorArt(id, st, 1.5); return [a.px, a.hx, a.hy]; });
      for (const h of hot) expect(h).toEqual(hot[0]);
      const pr = cursorArt(id, 'press', 1).svg;
      expect(pr).toContain('#fff4d0'); // uçta parlak nokta
      expect(pr).toContain('#ffb35a'); // arkada kor yıldızı
    }
  });

  it('basılı hareket yönü: alt uç sola (pozitif dönme), Kama dönmez ama eksen boyunca öne gider, Longsword sallanması küçük', () => {
    const rot = (id: Parameters<typeof cursorArt>[0]): number | null => {
      const m = /<g transform="rotate\((-?[\d.]+)\)">/.exec(cursorArt(id, 'press', 1).svg);
      return m ? Number(m[1]) : null;
    };
    expect(rot('thorn-staff')).toBeGreaterThan(0);
    expect(rot('longsword')).toBeGreaterThan(0);
    expect(rot('longsword')!).toBeLessThan(15);
    expect(rot('kama-dagger')).toBeNull();
    expect(cursorArt('kama-dagger', 'press', 1).svg).toContain('translate(0 -1.3)');
  });

  it('Wax Candle ve Bat Wing: kendi basılı resimleri var; Bat Wing kaburgaları kalın', () => {
    expect(cursorArt('wax-candle', 'press', 1).svg).not.toBe(cursorArt('wax-candle', 'hov', 1).svg);
    expect(cursorArt('bat-wing', 'def', 1).svg).toContain('stroke-width="1.3"');
    expect(cursorArt('bat-wing', 'press', 1).svg).toContain('scale(.72 1)');
  });

  it('kayıt: press varsayılan açık; eski kayıt açık okunur; kapatma kalıcı; ses alanları korunur', () => {
    expect(readCursorPrefs(null).press).toBe(true);
    expect(readCursorPrefs(stepRecord('volume', 5)).press).toBe(true);
    expect(readCursorPrefs('{"cursor":"thorn-staff","cursorSize":125}').press).toBe(true); // press öncesi kayıt
    const off = mergeCursorPrefs(stepRecord('volume', 5), { id: 'longsword', size: 100, press: false });
    expect(JSON.parse(off).cursorPress).toBe(false);
    expect(readCursorPrefs(off).press).toBe(false);
    expect(readStepLevel(off, 'volume', 14)).toBe(5);
    expect(readCursorPrefs(mergeRecord(off, stepRecord('volume', 6))).press).toBe(false);
  });

  it('setCursorPrefs({press}) kaydeder ve yeniden okununca korunur', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
    } as Storage;
    resetCursorPrefsCache();
    expect(cursorPrefs().press).toBe(true);
    setCursorPrefs({ press: false });
    resetCursorPrefsCache();
    expect(cursorPrefs().press).toBe(false);
    delete (globalThis as { localStorage?: Storage }).localStorage;
    resetCursorPrefsCache();
  });

  it('basma durum makinesi: bas -> bırak, iptal, odak kaybı, pencereden çıkış; kapalı / metin / sistem değişmez', () => {
    const ps = new PressState();
    expect(ps.mode('def', true)).toBe('def');
    ps.down(0);
    expect(ps.mode('def', true)).toBe('press');
    expect(ps.mode('hov', true)).toBe('press');
    ps.up();
    expect(ps.mode('hov', true)).toBe('hov');
    ps.down(0);
    ps.cancel();
    expect(ps.pressed).toBe(false);
    ps.down(0);
    ps.blur();
    expect(ps.mode('def', true)).toBe('def');
    ps.down(0);
    ps.leave();
    expect(ps.pressed).toBe(false);
    ps.down(2); // sağ düğme sayılmaz
    expect(ps.pressed).toBe(false);
    ps.down(0);
    ps.sync(0); // bırakma olayı kaçtı: hareket olayı düzeltir
    expect(ps.pressed).toBe(false);
    ps.down(0);
    ps.sync(1);
    expect(ps.pressed).toBe(true);
    // kapalı, metin alanı / diğer imleçler: basılıyken de değişmez
    expect(ps.mode('dis', true)).toBe('dis');
    expect(ps.mode('native', true)).toBe('native');
    // ayar kapalı
    expect(ps.mode('def', false)).toBe('def');
    expect(ps.mode('hov', false)).toBe('hov');
  });
});

describe('imleç teması', () => {
  it('varsayılanlar: Longsword, %100; eski / boş / bozuk kayıt göçsüz varsayılana düşer', () => {
    expect(DEFAULT_CURSOR).toBe('longsword');
    expect(CURSOR_CHOICES.map((c) => c.id)).toEqual(['longsword', 'boar-spear', 'kama-dagger', 'hunting-arrow', 'thorn-staff', 'ember-shard', 'wax-candle', 'bat-wing', 'system']);
    expect(readCursorPrefs(null)).toEqual({ id: 'longsword', size: 100, press: true });
    expect(readCursorPrefs('')).toEqual({ id: 'longsword', size: 100, press: true });
    expect(readCursorPrefs('not json')).toEqual({ id: 'longsword', size: 100, press: true });
    expect(readCursorPrefs('[1,2]')).toEqual({ id: 'longsword', size: 100, press: true });
    expect(readCursorPrefs(stepRecord('volume', 12))).toEqual({ id: 'longsword', size: 100, press: true }); // eski yalnız-ses kaydı
    expect(readCursorPrefs('{"cursor":"nope","cursorSize":"x"}')).toEqual({ id: 'longsword', size: 100, press: true });
  });

  it('kimlik ve boyut sınırlanır (en yakın adım, aralık dışı uca)', () => {
    expect(clampCursorId('hunting-arrow')).toBe('hunting-arrow');
    expect(clampCursorId('ember-shard')).toBe('ember-shard');
    expect(clampCursorId('banana')).toBe('longsword');
    expect(clampCursorId(undefined)).toBe('longsword');
    expect(CURSOR_SIZES).toEqual([75, 100, 125, 150, 175, 200]);
    expect(DEFAULT_CURSOR_SIZE).toBe(100);
    expect(clampCursorSize(10)).toBe(75);
    expect(clampCursorSize(9999)).toBe(200);
    expect(clampCursorSize(112)).toBe(100);
    expect(clampCursorSize(113)).toBe(125);
    expect(clampCursorSize(NaN)).toBe(100);
    expect(clampCursorSize('150')).toBe(150);
    expect(stepCursorSize(100, -1)).toBe(75);
    expect(stepCursorSize(75, -1)).toBe(75);
    expect(stepCursorSize(200, 1)).toBe(200);
    expect(stepCursorSize(125, 2)).toBe(175);
  });

  it('kayıt gidiş-dönüş; ses alanları korunur (birleştirme) ve ses okuması bozulmaz', () => {
    const saved = mergeCursorPrefs(stepRecord('volume', 13), { id: 'kama-dagger', size: 150, press: true });
    expect(readCursorPrefs(saved)).toEqual({ id: 'kama-dagger', size: 150, press: true });
    expect(readStepLevel(saved, 'volume', 14)).toBe(13);
    const afterVolume = mergeRecord(saved, stepRecord('volume', 7)); // ses yazılırken imleç alanları silinmez
    expect(readCursorPrefs(afterVolume)).toEqual({ id: 'kama-dagger', size: 150, press: true });
    expect(readStepLevel(afterVolume, 'volume', 14)).toBe(7);
    expect(readCursorPrefs(mergeCursorPrefs(null, { id: 'x' as never, size: 3, press: true }))).toEqual({ id: 'longsword', size: 75, press: true });
  });

  it('setCursorPrefs depoya yazar, yeniden okununca aynı (kalıcılık)', () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
    } as Storage;
    store.set('eov.settings.v1', stepRecord('volume', 9));
    resetCursorPrefsCache();
    expect(cursorPrefs()).toEqual({ id: 'longsword', size: 100, press: true });
    setCursorPrefs({ id: 'thorn-staff' });
    setCursorPrefs({ size: 175 });
    resetCursorPrefsCache();
    expect(cursorPrefs()).toEqual({ id: 'thorn-staff', size: 175, press: true });
    expect(readStepLevel(store.get('eov.settings.v1'), 'volume', 14)).toBe(9);
    delete (globalThis as { localStorage?: Storage }).localStorage;
    resetCursorPrefsCache();
  });

  it('SVG: uç noktası (5,3) boşluk payı ve boyla ölçeklenir (sıcak nokta), her imleç ve durum için', () => {
    expect(VIEW).toBe(32 + PAD * 2);
    for (const c of CURSOR_CHOICES) {
      for (const st of CURSOR_STATES) {
        const a1 = cursorArt(c.id, st, 1);
        expect(a1.px).toBe(VIEW);
        expect(a1.hx).toBe(5 + PAD);
        expect(a1.hy).toBe(3 + PAD);
        const a2 = cursorArt(c.id, st, 2);
        expect(a2.px).toBe(VIEW * 2);
        expect(a2.hx).toBe((5 + PAD) * 2);
        expect(a2.hy).toBe((3 + PAD) * 2);
        expect(a1.svg).toContain(`viewBox="${-PAD} ${-PAD} ${VIEW} ${VIEW}"`);
      }
    }
    const small = cursorArt('longsword', 'def', 0.75);
    expect(small.hx).toBe(Math.round(11 * (small.px / VIEW)));
  });

  it('üç durum farklı çizilir; tilt 110,4 derece hattıyla uyumlu; süzgeç kimliği benzersiz', () => {
    const d = cursorArt('longsword', 'def', 1).svg;
    const hv = cursorArt('longsword', 'hov', 1).svg;
    const ds = cursorArt('longsword', 'dis', 1).svg;
    expect(hv).toContain('#ffb35a'); // kor parıltısı
    expect(d).not.toContain('#ffb35a');
    expect(ds).toContain('feColorMatrix');
    expect(ds).toContain('#d22'); // yasak işareti
    expect(new Set([d, hv, ds]).size).toBe(3);
    expect(d).toContain('rotate(-20.40 5 3)');
    expect(LINE_ANGLE).toBeCloseTo(110.4, 1);
    expect(cursorArt('boar-spear', 'dis', 1, 'a').svg).toContain('id="gy-a"');
    expect(cursorArt('boar-spear', 'dis', 1, 'b').svg).toContain('id="gy-b"');
  });

  it('Thorn Staff açık zeminde soluk değil: gövde ve uç koyu, gövde çizgisi kalın, uç ince (keskin)', () => {
    const svg = cursorArt('thorn-staff', 'def', 1).svg;
    expect(svg).not.toContain('#d8b27a'); // eski soluk uç / gövde rengi
    expect(svg).not.toContain('#a9703a');
    expect(svg).toContain('#80502a'); // koyu gövde (cursor-8 #s6)
    expect(svg).toContain('stroke-width="1.6"'); // kalın gövde çizgisi
  });

  it('CSS: her durum !important ve yedek anahtar sözcük; System boş', () => {
    const css = buildCursorCss({ id: 'longsword', size: 100, press: true });
    for (const s of CURSOR_STATES) expect(css).toContain(`html[data-eov-cur="${s}"]`);
    expect(css.match(/!important/g)).toHaveLength(CURSOR_STATES.length);
    expect(buildCursorCss({ id: 'longsword', size: 100, press: false }).match(/!important/g)).toHaveLength(CURSOR_STATES.length - 1);
    expect(buildCursorCss({ id: 'longsword', size: 100, press: false })).not.toContain('data-eov-cur="press"');
    expect(css).toContain(', default !important');
    expect(css).toContain(', pointer !important');
    expect(css).toContain(', not-allowed !important');
    expect(css).toContain(' 11 9,'); // %100: sıcak nokta (11, 9)
    expect(buildCursorCss({ id: 'system', size: 100, press: true })).toBe('');
    expect(buildCursorCss({ id: 'ember-shard', size: 200, press: true })).toContain(' 22 18,');
    expect(cursorArt('longsword', 'def', 2).px).toBeLessThanOrEqual(128); // tarayıcı sınırı
  });

  it('durum çözümü: özgün imleçten (pointer -> tıklanabilir, not-allowed / disabled -> kapalı, metin alanı sistemde)', () => {
    expect(modeForNative('pointer', false, false)).toBe('hov');
    expect(modeForNative('default', false, false)).toBe('def');
    expect(modeForNative('auto', false, false)).toBe('def');
    expect(modeForNative('not-allowed', false, false)).toBe('dis');
    expect(modeForNative('pointer', true, false)).toBe('dis');
    expect(modeForNative('url(x.png) 1 2, pointer', false, false)).toBe('hov');
    expect(modeForNative('text', false, false)).toBe('native');
    expect(modeForNative('col-resize', false, false)).toBe('native');
    expect(modeForNative('pointer', false, true)).toBe('native');
  });

  it('dokunmatik kararı: hover yok ya da kaba işaretçi -> imleç yok (yalnızca bilgi); fareli cihaz tam', () => {
    expect(cursorUiMode(false, false)).toBe('full');
    expect(cursorUiMode(true, true)).toBe('touch');
    expect(cursorUiMode(true, false)).toBe('touch');
    expect(cursorUiMode(false, true)).toBe('touch');
  });

  it('Settings sayfa listesinde UI sayfası var (Display ile Privacy arasında)', () => {
    const keys = SETTINGS_PAGES.map((p) => p.key);
    expect(keys.indexOf('ui')).toBe(keys.indexOf('display') + 1);
    expect(keys.indexOf('privacy')).toBe(keys.indexOf('ui') + 1);
  });
});
