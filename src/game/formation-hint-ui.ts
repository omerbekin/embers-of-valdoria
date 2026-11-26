/** Dizilim ipucu rengi (kural src/engine/formation-hints.ts). Eski "!" elması rozeti (hintBadge) karo turunda kullanılmadığı için silindi (Lead 2026-11-25). */
import type { PlacementHint } from '../engine';
import { EL } from './elegant-ui';

/** İpucu metninin rengi. */
export const hintColor = (hint: PlacementHint): string => (hint.kind === 'outOfReach' ? EL.BAD : '#ffb35a');
