/**
 * Multiplayer: iki taraf hazır olunca savaşın görsellerini, hazır sancakları oynarken (takım seçimi sahnesinin yükleyicisiyle) arka planda indirir.
 * Savaş sahnesi açılınca aynı dokular zaten vardır (BattleScene.preload var olan dokuyu yeniden indirmez), yani geçişte bekleme olmaz.
 * Bu dosya yalnızca YÜKLER; hiçbir doku atmaz, yükleme ekranı göstermez (sancaklar yanık kalır) ve savaşı başlatmaz. Kural BattleScene.preload ile aynı:
 * yalnızca savaştaki birimlerin görselleri / pozları / efekt sayfaları + seed'e göre seçilen arka plan.
 */
import Phaser from 'phaser';
import { backgroundExists, queueAssets } from './assets';
import { battleBackground } from './battle-background';
import { unitWeaponPick } from './pose-weapons';
import { preloadPoses } from './pose-rig';
import { battleSpriteIds } from './sprite-needs';
import { preloadVfxSheets } from './vfx-sheets';
import { VFX_SHEET_FILES, mobSheetsOf } from './vfx-sheet-files';

export interface PrefetchBattle {
  seed: number;
  combatants: readonly { defId: string; summoned?: boolean }[];
}

/** En çok bu kadar beklenir; sonra (eksik dosya yer tutucuya düşer) savaş sahnesi kendi preload'uyla tamamlar. */
export const PREFETCH_TIMEOUT_MS = 15_000;

/** Yükleme bitince (ya da zaman aşımı / hata) çözülür; asla reddedilmez. */
export function prefetchBattleAssets(scene: Phaser.Scene, battle: PrefetchBattle, timeoutMs = PREFETCH_TIMEOUT_MS): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      scene.load?.off(Phaser.Loader.Events.COMPLETE, queueAndStart);
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    const queueAndStart = (): void => {
      try {
        const load = scene.load;
        // yükleyici başka iş yapıyorsa o bitince eksikler yeniden hesaplanır
        if (load.isLoading()) {
          load.once(Phaser.Loader.Events.COMPLETE, queueAndStart);
          return;
        }
        const cells = battle.combatants.filter((c) => !c.summoned).map((c) => c.defId);
        const sprites = battleSpriteIds(cells);
        const bg = battleBackground({ pool: 'multiplayer', seed: battle.seed, fallback: '', exists: backgroundExists });
        let n = queueAssets(scene, { backgrounds: bg ? [bg] : false, items: false, sprites, avatars: sprites });
        n += preloadPoses(scene, battle.combatants.filter((c) => !c.summoned).map((c) => ({ classId: c.defId, pick: unitWeaponPick(c.defId, undefined, false) })));
        const sheets = [...VFX_SHEET_FILES.filter((f) => cells.includes(f.owner)).map((f) => f.id), ...mobSheetsOf(cells)];
        n += preloadVfxSheets(scene, sheets);
        if (n === 0) return finish();
        load.once(Phaser.Loader.Events.COMPLETE, finish);
        load.start();
      } catch (err) {
        console.warn('[multiplayer] prefetch', err);
        finish();
      }
    };
    queueAndStart();
  });
}
