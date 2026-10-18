import { GAME_H, GAME_W } from '../ui/viewport';

/** Güncel sahne ölçüleri (Phaser'sız; debug bilgisi ve testler de okur). Güncelleyen: `src/game/stage.ts > setStageMetrics`. */
export const stageView = { zoom: 1, viewW: GAME_W, left: 0, right: GAME_W, canvasW: GAME_W, canvasH: GAME_H, /** 1 oyun biriminin CSS pikseli (DOM --gu). */ cssScale: 1, /** Back / Menu / tam ekran masaüstü katsayısı (nav-icons.ts > navScaleFor). */ navK: 1 };

/**
 * Yeni Phaser yazısının çözünürlüğü: en az 2, ekranın gerçek render ölçeğinden (büyük / yüksek yoğunluklu ekranda) küçük olmaz; yazı sonradan
 * (HUD yeniden kurulunca, rozet, sayı) oluşsa da başta keskin çıkar (stage.ts > sharpenAll yalnızca boyut değişiminde var olanlara bakıyordu).
 */
export const textRes = (): number => Math.min(4, Math.max(2, Math.ceil(stageView.zoom * 4) / 4));
