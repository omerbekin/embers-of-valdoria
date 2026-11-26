/**
 * Debug menüsü > Setup > "Owner tests" (Ömer 2026-11-24): elle denenen şeylere tek tuş kısayolları. Burada yalnızca düğmeler vardır;
 * Mage vitrin savaşı verisi `src/game/owner-tests.ts` (saf), ses paneli `debug-sound-check.ts`, yükleme sayacı `debug-load-timer.ts` (ikisi de tembel yüklenir).
 * Sefer Mage evrimi düğmesi `debug-campaign.ts` (owner.mage-grant), çok oyunculu davet kopyalama `debug-mp.ts` (owner.mp-host-copy) içindedir.
 */
import type Phaser from 'phaser';
import { MAGE_EVOLVES_TEXT, mageShowcaseBattleData } from '../game/owner-tests';
import { newSeed } from '../game/seed';
import type { DebugMenu } from './debug-menu';

const TAB = 'Setup';
const SECTION = 'Owner tests';
let timerOn = false;

export function registerOwnerTestsDebug(game: Phaser.Game, debug: DebugMenu): void {
  debug.register({
    id: 'owner.mage-showcase',
    tab: TAB,
    section: SECTION,
    icon: 'wizhat',
    label: 'Mage evolves showcase battle',
    hint: `Quick battle with a Mage that has ALL four evolves on, under your control: ${MAGE_EVOLVES_TEXT}. Skill 1 = Fire Bolt (Sunfire), skill 2 = Blizzard (Eternal Winter), skill 3 = Ice Crater (Glacier Crater). The passive Mirage Veil shows when a melee enemy (Warrior, Paladin, Cutthroat) hits the Mage: a ring plus Burning Ground under the attacker. No range limit, Mage has triple health. A real hero holds at most 2 evolves; this battle bypasses that on purpose.`,
    run: () => {
      const data = mageShowcaseBattleData(newSeed());
      const active = game.scene.getScenes(true)[0];
      const battle = game.scene.isActive('BattleScene') ? game.scene.getScene('BattleScene') : null;
      if (battle && !('isLoading' in battle)) battle.scene.restart(data);
      else if (active) active.scene.start('BattleScene', data);
      else game.scene.start('BattleScene', data);
    },
  });
  debug.register({
    id: 'owner.sound-check',
    tab: TAB,
    section: SECTION,
    icon: 'speaker',
    label: 'Sound check panel',
    hint: 'Small panel with one button per sound: Mage evolve sounds (Sunfire, Eternal Winter, Glacier Crater), the 5 ice evolve sounds, Redtithe stab sounds, roars. Shows a warning when Master Volume is 0 in Settings.',
    run: () => void import('./debug-sound-check').then((m) => m.toggleSoundCheck(game)),
  });
  debug.register({
    id: 'owner.endless-timer',
    tab: TAB,
    section: SECTION,
    icon: 'hourglass',
    on: () => timerOn,
    label: () => (timerOn ? 'Endless load timer: on' : 'Endless load timer: off'),
    hint: 'When on, entering Endless (Main Menu > Endless, or the Endless card at the end of Map 3) shows "Loaded in X.X s" in the top-left corner, counted from your click until the Endless screen is ready. Off leaves no trace. Resets when the page reloads.',
    run: () => {
      timerOn = !timerOn;
      void import('./debug-load-timer').then((m) => m.setLoadTimer(game, timerOn));
    },
  });
}
