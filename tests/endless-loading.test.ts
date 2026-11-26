import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Harita sonu kartı Endless / Main Menu (Ömer 2026-11-23, "klasik loading ekranı"): basınca açılış / kısa yükleyici kutusu (#boot) HEMEN açılır
 * (Phaser karesini beklemeden), yeni sahne kurulana kadar kapanmaz; çift basış ikinci geçiş başlatmaz.
 */
class FakeClassList {
  readonly set = new Set<string>();
  add(...c: string[]): void { for (const x of c) this.set.add(x); }
  remove(...c: string[]): void { for (const x of c) this.set.delete(x); }
  contains(c: string): boolean { return this.set.has(c); }
}

let boot: { classList: FakeClassList; querySelector: () => null };
const shown = () => !boot.classList.contains('boot-hidden') && !boot.classList.contains('boot-off');

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  boot = { classList: new FakeClassList(), querySelector: () => null };
  boot.classList.add('boot-off', 'boot-hidden');
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  vi.stubGlobal('document', { getElementById: (id: string) => (id === 'boot' ? boot : null), documentElement: { style: { setProperty: () => undefined }, classList: { toggle: () => undefined } } });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('geçiş yükleme ekranı (holdBoot)', () => {
  it('basışta eşzamanlı açılır, kod parçası kapanışı erken gizlemez, yeni sahne kurulunca kapanır', async () => {
    const bl = await import('../src/ui/boot-loader');
    bl.holdBoot();
    expect(shown()).toBe(true); // zamanlayıcı ilerlemeden: hemen
    const chunk = bl.trackChunkLoad(Promise.resolve(1)); // açılış bitmediği için izlemez; kapanış denemesi: dışarıdan
    await chunk;
    vi.advanceTimersByTime(2000);
    expect(shown()).toBe(true);
    bl.releaseBootHold();
    vi.advanceTimersByTime(1000);
    expect(shown()).toBe(false);
  });

  it('çift basış kutuyu yeniden kurmaz; yeni sahne hiç gelmezse güvenlik süresinde kalkar', async () => {
    const bl = await import('../src/ui/boot-loader');
    bl.holdBoot();
    bl.holdBoot();
    expect(bl.bootHeld()).toBe(true);
    vi.advanceTimersByTime(bl.HOLD_SAFETY_MS + 1500);
    expect(bl.bootHeld()).toBe(false);
    expect(shown()).toBe(false);
  });
});

describe('screenGo loading seçeneği', () => {
  it('loading:true kararma beklemeden kutuyu açar; seçeneksiz geçiş kutuya dokunmaz', async () => {
    const { screenGo } = await import('../src/game/screen-go');
    const mk = () => ({
      sys: { isActive: () => true },
      scene: { start: vi.fn() },
      input: { enabled: true },
      cameras: { main: { fadeEffect: { isRunning: false }, once: vi.fn(), fadeOut: vi.fn() } },
    });
    const a = mk();
    screenGo(a as never, 'MainMenuScene');
    expect(shown()).toBe(false);
    const b = mk();
    screenGo(b as never, 'EndlessScene', undefined, { loading: true });
    expect(shown()).toBe(true);
    expect(b.scene.start).not.toHaveBeenCalled(); // kararma bitmedi, kutu zaten açık
  });
});

describe('harita sonu kartı çift basış', () => {
  it('map-end: ilk basıştan sonra düğmeler pasif, run yalnız bir kez', () => {
    const src = readFileSync('src/ui/map-end.ts', 'utf8');
    expect(src).toMatch(/if \(done \|\| busy\) return;\s*busy = true;/);
    expect(src).toMatch(/x\.disabled = true/);
    const scene = readFileSync('src/game/scenes/CampaignMapScene.ts', 'utf8');
    expect(scene).toMatch(/elGo\(this, MENU_SCENE, undefined, \{ loading: true \}\)/);
    expect(readFileSync('src/game/stage.ts', 'utf8')).toContain('releaseBootHold()');
  });
});
