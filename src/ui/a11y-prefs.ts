// Erisilebilirlik ayarlari (Settings > Accessibility): yazi boyu, renk korlugu destegi. Hareketi azalt = motion-pref.ts (`reducedMotion()`).
// Kayit: eov.settings.v1 icinde `textSize` ('small' | 'normal' | 'large') ve `colorblind` (boolean); gecersiz / eksik deger = varsayilan.
import { patchSettings, readSettingsObject } from './settings-store';

export type TextSize = 'small' | 'normal' | 'large';
export const TEXT_SIZES: readonly TextSize[] = ['small', 'normal', 'large'];
export const TEXT_SCALE: Record<TextSize, number> = { small: 0.9, normal: 1, large: 1.2 };
export const TEXT_LABEL: Record<TextSize, string> = { small: 'Small', normal: 'Normal', large: 'Large' };

export const parseTextSize = (v: unknown): TextSize => (v === 'small' || v === 'large' ? v : 'normal');
export const parseColorblind = (v: unknown): boolean => v === true;

/** d adim (+1 / -1) sonraki boy; uclarda doner. */
export const stepTextSize = (cur: TextSize, d: number): TextSize => TEXT_SIZES[(TEXT_SIZES.indexOf(cur) + d + TEXT_SIZES.length * 8) % TEXT_SIZES.length]!;

const listeners = new Set<() => void>();
let size: TextSize | null = null;
let cb: boolean | null = null;

export function textSize(): TextSize {
  return (size ??= parseTextSize(readSettingsObject()['textSize']));
}
export function colorblind(): boolean {
  return (cb ??= parseColorblind(readSettingsObject()['colorblind']));
}

/** Kok sinifi / degiskeni yazar: `--tx` (yazi carpani) ve `html.cb` (rarity isaretleri gorunur). */
export function applyA11y(): void {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  r.style.setProperty('--tx', String(TEXT_SCALE[textSize()]));
  r.classList.toggle('tx-small', textSize() === 'small');
  r.classList.toggle('tx-large', textSize() === 'large');
  r.classList.toggle('cb', colorblind());
}

export function setTextSize(v: TextSize): void {
  size = v;
  patchSettings({ textSize: v });
  applyA11y();
  for (const fn of listeners) fn();
}
export function setColorblind(on: boolean): void {
  cb = on;
  patchSettings({ colorblind: on });
  applyA11y();
  for (const fn of listeners) fn();
}
export function onA11yChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
