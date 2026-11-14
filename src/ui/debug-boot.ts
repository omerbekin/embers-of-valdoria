import type Phaser from 'phaser';
import { DebugMenu } from './debug-menu';
import { DEBUG_INFO_TAB, DEBUG_TABS, registerDebugTools } from './debug-tools';

/** Debug menüsünü kurar (ayrı kod parçası; src/ui/debug-entry.ts ilk açılışta yükler). */
export function createDebugMenu(game: Phaser.Game, root: HTMLElement): DebugMenu {
  const debug = new DebugMenu(root, DEBUG_TABS, DEBUG_INFO_TAB);
  registerDebugTools({ game, debug });
  debug.registerMenuControls();
  // yerel test: konsoldan eylem çalıştırma (window.__dbgRun('campaign.open'))
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) (window as unknown as { __dbgRun: (id: string) => void }).__dbgRun = (id) => (debug as unknown as { actions: Map<string, { run: () => void }> }).actions.get(id)?.run();
  return debug;
}
