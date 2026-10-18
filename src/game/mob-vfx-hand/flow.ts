/**
 * El yapımı mob efektlerinin AKIŞ ŞABLONLARI: zamanlama sözleşmesi tek yerde (asıl sheet sürümüyle birebir, src/game/mob-vfx.ts > build).
 *   melee   (windMs varsa hazırlık pozu) -> c.lunge -> T = k.slow(hitMs) sonra vuruş (her hedefte `on(v, T)`)
 *   bolt    c.windUp (280 ms x slow) -> T sonra vuruş. Mermi windUp'ın ikinci yarısında (LEAD) çıkar: `launch(v, F)` F ms sonra hedefe değer
 *   area    (cells / center) windUp -> T sonra vuruş; aşamalı skill'de aşama i: i x 180 ms + T (c.releaseStage(i) aynı anda). `cell` / `center`
 *           çağrıları windUp BAŞINDA yapılır (düşen taş, uçan ok hazırlıkta başlayabilir): verilen `at` = o hücrenin vuruşuna kalan ms
 *   self / ally  windUp -> T sonra doruk (`on(v, at)` windUp başında, at = doruğa kalan ms)
 * Promise vuruşta (ilk aşamada) çözülür; kalan sesler o an çalar.
 */
import layout from '../../../data/battle-layout.json';
import { MOB_VFX_SPECS } from '../mob-vfx';
import { content } from '../../engine';
import { STAGE_STEP, after, land, type CombatantView, type Pt, type VfxCtx, type VfxKit } from './core';

const WIND_MULT = layout.animation.mobVfx.windMult;
/** c.windUp süresi (CombatantView.windUp: 140 ms yoyo). */
export const WINDUP_MS = 280;
/** Mermi bu kadar ms windUp bitmeden önce çıkar (windUp'ın ikinci yarısı: atış). */
export const LEAD_MS = 140;

const sfx0 = (c: VfxCtx): void => {
  const s = c.skill.sfx ?? [];
  if (s[0]) c.sfx(s[0]);
};

export async function melee(c: VfxCtx, k: VfxKit, hitMs: number, on: (v: CombatantView, T: number) => void, o: { shake?: [number, number]; pre?: () => void } = {}): Promise<void> {
  sfx0(c);
  const wind = MOB_VFX_SPECS[c.skill.id]?.windMs;
  if (wind) {
    c.actor.play('cast');
    await new Promise<void>((r) => c.scene.time.delayedCall(k.slow(wind * WIND_MULT), r));
  }
  const t = c.targets[0];
  o.pre?.();
  await c.lunge(t ? t.container.x : c.actor.container.x);
  const T = k.slow(hitMs);
  for (const v of c.targets) on(v, T);
  if (o.shake) after(c, T, () => k.shake(c.scene, o.shake![0], o.shake![1]));
  return land(c, T);
}

export async function bolt(c: VfxCtx, k: VfxKit, hitMs: number, hex: string, launch: (v: CombatantView, F: number) => void, o: { pre?: (D: number) => void; anim?: 'cast' | 'attack' } = {}): Promise<void> {
  sfx0(c);
  const T = k.slow(hitMs);
  const LEAD = k.slow(LEAD_MS);
  const F = k.slow(WINDUP_MS) - LEAD + T;
  o.pre?.(LEAD);
  after(c, LEAD, () => {
    for (const v of c.targets) launch(v, F);
  });
  await c.windUp(hex, o.anim ?? 'cast');
  return land(c, T);
}

export interface AreaInfo {
  /** Kapsanan tüm hücreler (zemin). */
  cells: Pt[];
  /** Aşamalar (aşamasız skill'de tek aşama). */
  stages: Array<{ cells: Pt[]; victims: CombatantView[]; at: number }>;
  /** İlk vuruşa kalan ms (windUp başından). */
  at: number;
  /** windUp süresi (ms, slow). */
  wu: number;
}

/** Alan skill'i: `run(info)` windUp başında çağrılır; vuruş anları info.stages[i].at. */
export async function area(c: VfxCtx, k: VfxKit, hitMs: number, hex: string, run: (a: AreaInfo) => void): Promise<void> {
  sfx0(c);
  const T = k.slow(hitMs);
  const WU = k.slow(WINDUP_MS);
  const staged = !!c.stages && c.stages.length > 1;
  const cells = c.cells.length ? c.cells : c.targets.map((v) => k.feet(v));
  const stages = staged
    ? c.stages!.map((s, i) => ({ cells: s.cells, victims: s.targets, at: WU + T + k.slow(i * STAGE_STEP) }))
    : [{ cells, victims: c.targets, at: WU + T }];
  if (cells.length) run({ cells, stages, at: WU + T, wu: WU });
  await c.windUp(hex, 'cast');
  if (staged) c.stages!.forEach((_, i) => after(c, k.slow(i * STAGE_STEP + hitMs), () => c.releaseStage(i)));
  return land(c, T);
}

/** Tüm tahta (her hücrenin zemin merkezi): tüm tahtaya düşen skill'ler (Pyre of Morvane, Fall of King's Bridge). */
export function boardCells(c: VfxCtx, k: VfxKit): Pt[] {
  return Array.from({ length: content.CELL_COUNT }, (_, i) => k.cellMid(c.board, i));
}

/** Alanın merkezi: seçilen merkez yuva (kapsananlar içindeyse), yoksa ağırlık merkezi. */
export function areaCenter(c: VfxCtx, k: VfxKit, cells: Pt[]): Pt {
  if (c.center !== undefined && c.slots?.includes(c.center)) return k.cellMid(c.board, c.center);
  if (!cells.length) return c.centerPos ?? k.feet(c.actor);
  return cells.reduce((a, p) => ({ x: a.x + p.x / cells.length, y: a.y + p.y / cells.length }), { x: 0, y: 0 });
}

/** self / ally: windUp başında `on(v, at)` (at = doruğa kalan ms). self'te v = atan birim. */
export async function aura(c: VfxCtx, k: VfxKit, hitMs: number, hex: string, on: (v: CombatantView, at: number) => void, self = false): Promise<void> {
  sfx0(c);
  const T = k.slow(hitMs);
  const WU = k.slow(WINDUP_MS);
  const list = self ? [c.actor] : c.targets.length ? c.targets : [c.actor];
  for (const v of list) on(v, WU + T);
  await c.windUp(hex, 'cast');
  return land(c, T);
}
