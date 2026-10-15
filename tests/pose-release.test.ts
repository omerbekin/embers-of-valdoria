import { describe, expect, it } from 'vitest';
import { isReleasablePoseTexture, pixelsBlank } from '../src/game/poses';

// Ayna savaşta görünmez birim (Grave Field, 0.7.11.2): pişmiş atlaslar oturum boyunca birikiyor, telefonda tuval belleği dolunca yeni atlas
// boş kalıyordu. Kural: yeni savaşta kullanılmayan atlas / hale / başka sınıfın gövdesi atılır; kullanımdaki ve silah görselleri asla.
describe('pose texture release', () => {
  const inUse = new Set(['pose:warrior_v2:axes.plain:49', 'glowfx:pose:x#idle1:thin:490']);
  it('never releases a texture in use', () => {
    for (const k of inUse) expect(isReleasablePoseTexture(k, inUse, { atlases: true, keepBodies: new Set() })).toBe(false);
  });
  it('atlases only at battle setup, glow always', () => {
    expect(isReleasablePoseTexture('pose:warrior_v2:greataxes.dane.two:49', inUse)).toBe(false);
    expect(isReleasablePoseTexture('pose:warrior_v2:greataxes.dane.two:49', inUse, { atlases: true })).toBe(true);
    expect(isReleasablePoseTexture('glowfx:pose:y#idle2:wide:490', inUse)).toBe(true);
  });
  it('bodies of classes in this battle and weapon art are kept', () => {
    const keepBodies = new Set(['warrior_v2', 'hexer_v2']);
    expect(isReleasablePoseTexture('posebody:warrior_v2:idle1:s', inUse, { atlases: true, keepBodies })).toBe(false);
    expect(isReleasablePoseTexture('posebody:mage_v2:idle1:s', inUse, { atlases: true, keepBodies })).toBe(true);
    expect(isReleasablePoseTexture('posebody:mage_v2:idle1:s', inUse, { atlases: true })).toBe(false); // rastgele takım: tutulur
    expect(isReleasablePoseTexture('poseweapon:axes:plain:s', inUse, { atlases: true, keepBodies })).toBe(false);
    expect(isReleasablePoseTexture('bg:grave-field', inUse, { atlases: true, keepBodies })).toBe(false);
  });
  it('detects a blank (transparent) baked frame', () => {
    const blank = new Uint8ClampedArray(4 * 100);
    expect(pixelsBlank(blank, 3)).toBe(true);
    const ink = new Uint8ClampedArray(4 * 100);
    ink[4 * 60 + 3] = 255;
    expect(pixelsBlank(ink, 3)).toBe(false);
  });
});
