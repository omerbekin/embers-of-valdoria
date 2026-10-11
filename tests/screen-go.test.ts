import { describe, expect, it } from 'vitest';
import { screenGo } from '../src/game/screen-go';
import { startMainMenu } from '../src/game/session-flow';

// Kit ekran geçişi (kararıp açılma): ortak Menu'nün Main Menu / Leave satırı da bundan geçer (Ömer 2026-10-11, harita -> ana menü kesmesi).
function fakeScene(key: string, fading = false) {
  const log: string[] = [];
  let onFade: (() => void) | null = null;
  const scene = {
    sys: { isActive: () => true },
    scene: { key, start: (k: string) => log.push(`start:${k}`) },
    input: { enabled: true },
    cameras: { main: { fadeEffect: { isRunning: fading }, once: (_e: string, fn: () => void) => (onFade = fn), fadeOut: (ms: number) => log.push(`fade:${ms}`) } },
  };
  return { scene, log, finishFade: () => onFade?.() };
}

describe('screenGo / startMainMenu: kit ekran geçişi', () => {
  it('önce kararır (giriş kilitlenir), kararma bitince sahne açılır', () => {
    const f = fakeScene('CampaignMapScene');
    screenGo(f.scene as never, 'MainMenuScene');
    expect(f.log[0]).toMatch(/^fade:\d+/);
    expect(f.scene.input.enabled).toBe(false);
    expect(f.log).not.toContain('start:MainMenuScene');
    f.finishFade();
    expect(f.log).toContain('start:MainMenuScene');
  });

  it('zaten kararıyorsa hemen açılır', () => {
    const f = fakeScene('BattleScene', true);
    screenGo(f.scene as never, 'MainMenuScene');
    expect(f.log).toEqual(['start:MainMenuScene']);
  });

  it('ortak Menu > Main Menu: etkin sahneden kararıp açılma ile', () => {
    const f = fakeScene('CampaignMapScene');
    const game = { scene: { isActive: (k: string) => k === 'CampaignMapScene', getScene: () => f.scene } };
    startMainMenu(game as never);
    expect(f.log[0]).toMatch(/^fade:/);
    f.finishFade();
    expect(f.log).toContain('start:MainMenuScene');
  });
});
