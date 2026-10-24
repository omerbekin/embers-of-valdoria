/**
 * Gerçek sınıfların çizimi (Ömer 2026-10-13): v2 = kendi poz gövdesi + takılı silah (varsayılan), v1 = eski görünüm (tek idle görseli + kod
 * hareketi; Warrior v1 pozları). Yalnızca karşılaştırma için debug > Characters > Poses; seçim bu tarayıcıda (localStorage) kalır, bir sonraki
 * savaşta (ya da Restart) geçerli olur. Phaser'sız; içe aktarılınca kayıtlı seçimi src/game/poses.ts'e uygular.
 */
import { realPosesV2, setRealPosesV2 } from './poses';

const KEY = 'eov.poseRender';

function load(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(KEY) === 'v1') setRealPosesV2(false);
  } catch {
    /* depolama yok: varsayılan v2 */
  }
}
load();

/** Şu anki seçim: 'v2' (varsayılan) ya da 'v1'. */
export const poseRender = (): 'v1' | 'v2' => (realPosesV2() ? 'v2' : 'v1');

export function setPoseRender(mode: 'v1' | 'v2'): void {
  setRealPosesV2(mode === 'v2');
  try {
    if (mode === 'v2') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, 'v1');
  } catch {
    /* ignore */
  }
}
