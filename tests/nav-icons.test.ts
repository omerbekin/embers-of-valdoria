import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BACK_POS, backPlacement, NAV_BTN, navSvg } from '../src/ui/nav-icons';

// Ortak gezinme ikonları (Ömer 2026-10-14, ikon taslağı D): sol üst Back, sağ üst Menu ve tam ekran AYNI boyda.
const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');
const style = read('src/style.css');
const elegant = read('src/ui/elegant.css');

describe('Back / Menu / tam ekran aynı ölçü sabitini paylaşır', () => {
  it('CSS değişkenleri NAV_BTN ile aynı (44 px dokunma, 30 px çerçeve)', () => {
    expect(NAV_BTN.hit).toBeGreaterThanOrEqual(44);
    expect(style).toContain(`--nav-hit: ${NAV_BTN.hit}px;`);
    expect(style).toContain(`--nav-frame: ${NAV_BTN.frame}px;`);
    expect(style).toContain(`--nav-icon: ${NAV_BTN.icon}px;`);
    expect(style).toContain(`--nav-edge: ${NAV_BTN.edge}px;`);
  });

  it('üç düğme de ortak .nav-btn sınıfını kullanır; ölçüyü yalnızca .nav-btn verir', () => {
    expect(read('src/ui/fullscreen.ts')).toMatch(/'nav-btn settings-toggle fullscreen-toggle'/);
    expect(read('src/ui/game-menu.ts')).toMatch(/`nav-btn settings-toggle menu-toggle/);
    expect(read('src/ui/settings.ts')).toMatch(/'nav-btn el-back/);
    expect(read('src/wiki/view.ts')).toMatch(/'nav-btn el-back/);
    const block = (css: string, sel: string) => css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)));
    expect(block(style, '.nav-btn')).toContain('width: var(--nav-hit)');
    expect(block(style, '.nav-btn')).toContain('height: var(--nav-hit)');
    for (const sel of ['.settings-toggle', '.el-back']) expect(block(sel === '.el-back' ? elegant : style, sel)).not.toMatch(/\b(width|height)\s*:/);
  });

  it('Phaser elBack aynı sabitten çizer', () => {
    const ui = read('src/game/elegant-ui.ts');
    expect(ui).toMatch(/import \{[^}]*NAV_BTN[^}]*\} from '..\/ui\/nav-icons'/);
    expect(ui).toMatch(/const \{ hit, frame, icon \} = NAV_BTN;/);
  });

  it('ikonlar: Back yazısız chevron, Menu üç çizgi + kor elmas', () => {
    expect(navSvg('back')).toContain('M15 4 L7 12 L15 20');
    expect(navSvg('back')).not.toMatch(/Back/i);
    expect(navSvg('menu')).toContain('M4 6h16');
    expect(navSvg('menu')).toContain('#e0702a');
  });
});

describe('Back konumu (oyun birimi): Menu / tam ekranla aynı hiza', () => {
  it('Back, sağ üst düğmelerin aynası: üstten ve soldan edge px, dikey orta edge + hit/2 px', () => {
    for (const s of [1, 0.36, 1.33]) {
      const p = backPlacement(-330, s);
      expect(p.x).toBeCloseTo(-330 + BACK_POS.edgePx / s);
      expect(p.y * s).toBeCloseTo(NAV_BTN.edge + NAV_BTN.hit / 2); // CSS px: Menu'nün dikey ortasıyla aynı (style.css top: --nav-edge)
      expect(p.scale).toBeCloseTo(1 / s);
    }
  });
  it('DOM .el-back ve .nav-btn aynı top kuralını taşır', () => {
    const css = readFileSync('src/ui/elegant.css', 'utf8');
    expect(css).toContain('top: calc(var(--et, 0px) + var(--nav-edge, 6px));');
  });
});
