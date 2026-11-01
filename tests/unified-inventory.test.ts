import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SLOT_IDS } from '../src/progression';
import { SLOT_ICON_FILES, slotIconUrl } from '../src/ui/slot-icons';
import { CLOSE_PATH, navSvg } from '../src/ui/nav-icons';

// Ortak envanter v3 "Ledger" (Ömer 2026-10-18): boş yuva simgeleri, sağ üst X (Menu'nün yerinde), Hero / Sheet sekmeleri.
const style = readFileSync('src/style.css', 'utf8');
const gearCss = readFileSync('src/ui/gear.css', 'utf8');
const gear = readFileSync('src/ui/gear-screen.ts', 'utf8');
const bagBar = readFileSync('src/ui/bag-bar.ts', 'utf8');
const panel = readFileSync('src/ui/character-panel.ts', 'utf8');

describe('Ortak envanter (Gear, v3 Ledger)', () => {
  it('her yuvanın boyalı boş yuva simgesi var (assets/ui-icons/slots) ve soluk (~%36) çizilir', () => {
    for (const k of SLOT_IDS) expect(slotIconUrl(k), k).toBeTruthy();
    expect(Object.keys(SLOT_ICON_FILES).sort()).toEqual([...SLOT_IDS].sort());
    expect(gearCss).toMatch(/\.gr-slot \.gr-slot-ico \{\s*opacity: 0\.36;/);
  });

  it('X kapatma ikonu nav dilinde; açıkken Menu gizlenir, tam ekran Menu yokmuş gibi yerinde kalır', () => {
    expect(navSvg('close')).toContain(CLOSE_PATH);
    expect(style).toMatch(/html\.close-btn-on \.settings-toggle\.menu-toggle \{\s*display: none !important;/);
    expect(style).toMatch(/html\.close-btn-on \.settings-toggle\.fullscreen-toggle \{\s*right: calc\(var\(--nav-edge-k\) \+ var\(--nav-hit-k\) \+ var\(--nav-gap-k\) \+ var\(--er\)\);/);
    expect(gear).toContain('mountCloseButton(overlay');
  });

  it('Hero / Sheet sekmeleri; alt Done çubuğu yok; Equip best mentor vurgusu duruyor', () => {
    expect(gear).toMatch(/'Hero' : 'Sheet'/);
    expect(gear).not.toMatch(/'primary', 'Done'|primary`, 'Done'|' primary', 'Done'/);
    expect(bagBar).toContain("dataset['tut'] = 'best'"); // Equip best artık ortak çanta çubuğunda (bag-bar.ts)
    expect(gear).toContain('bestOpts');
  });

  it('çanta çubuğu TEK parça: inventory.ts çizer, gear-screen yalnız veriyi verir; Equip best yalnız torba-yalnız olmayan ekranlarda', () => {
    const inv = readFileSync('src/ui/inventory.ts', 'utf8');
    expect(inv).toContain('bagBarEls(v.bar)');
    expect(gear).toContain("if (bagOnly) return undefined;");
  });

  it('Sheet stat kutuları (Ömer 2026-11-01): + / − / Confirm / Reset ve bekleyen puan yok; basılı tut = 1 puan hemen, sağ tık menüsü yok', () => {
    expect(panel).not.toContain("'sh-pmb'");
    expect(panel).not.toContain('onClear');
    expect(panel).not.toContain('onConfirm');
    expect(panel).not.toContain('onReset');
    expect(panel).not.toContain("'Confirm'");
    expect(panel).toContain('onSpend');
    expect(panel).toContain("'contextmenu'");
    expect(gearCss).not.toContain('sh-pmb');
    expect(gearCss).not.toContain('has-pend');
  });
});
