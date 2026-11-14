/**
 * Ortak yazı tipi ve altın tonları. Eski bronz çerçeve yardımcıları (frameRect, gradientRect, glowRect, cornerOrnaments, ensureGrain,
 * makeBadge) kaldırıldı (Ömer 2026-10-09): savaş HUD'ı artık tasarım kitiyle çizilir (`src/game/hud-kit.ts`, `elegant-ui.ts`).
 */
export const SERIF = 'Cinzel, "Palatino Linotype", serif';

export const GOLD = {
  dark: 0x6b4f26,
  edge: 0x9a7438,
  light: 0xe8c47e,
  bright: 0xffe29a,
} as const;
