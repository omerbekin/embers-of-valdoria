// The First Fire's Verdict: arayüz metinleri ve rozet içeriği (saf, Phaser'sız; metin data/first-fire-ui.json, sayılar data/battle-rules.json > firstFire).
import ui from '../../data/first-fire-ui.json';
import soundData from '../../data/audio-first-fire.json';
import type { FirstFireRule } from '../engine';
import type { SfxDef } from './audio';

const fill = (s: string, vars: Record<string, number>): string => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

/** Uyarı bandı metni: 'first' = ilk uyarı, 'final' = son uyarı (sayısız). */
export function firstFireWarnText(warning: 'first' | 'final'): string {
  return warning === 'first' ? ui.warnFirst : ui.warnFinal;
}

/** Başlangıç bandı: başlık + alt yazı. */
export function firstFireStartText(): { title: string; sub: string } {
  return { title: ui.start, sub: ui.startSub };
}

/** HUD rozeti: "First Fire" + sıradaki vuruş hasarı; ipucu iki cümle + sıradaki vuruş. */
export function firstFireBadge(damage: number, rule: Pick<FirstFireRule, 'damageStep'>): { label: string; counter: string; tip: { title: string; kind: string; rows: Array<{ text: string; color?: string }> } } {
  return {
    label: ui.badge,
    counter: String(damage),
    tip: {
      title: ui.start,
      kind: ui.tipKind,
      rows: [...ui.tipRows.map((t) => ({ text: fill(t, { step: rule.damageStep }) })), { text: fill(ui.tipNext, { dmg: damage }) }],
    },
  };
}

/** Bildirim sesleri (data/audio-first-fire.json; yeni sentez, ödünç değil): ilk uyarı, son uyarı, başlangıç. */
/** Başlangıç sesi (fısıltı) bitince yeni müzik parçası girer: firstFireStart'tan sonra bu kadar ms (data/audio-first-fire.json > musicEnterMs). Eski müzik başlangıçta söner (Music fadeOutMs). */
export const FIRST_FIRE_MUSIC_ENTER_MS: number = soundData.musicEnterMs;

/** Savaş müziği seçimi (saf): First Fire başladıysa gerilim parçası (boss dahil, dalga / faz geçişinde de sürer), yoksa verilen parça. */
export function battleMusicFor<T extends string>(base: T, firstFireOn: boolean): T | 'first_fire' {
  return firstFireOn ? 'first_fire' : base;
}

export type FirstFireSoundId = 'first_warn' | 'final_warn' | 'start' | 'strike_seal' | 'strike_hit';
export const FIRST_FIRE_SFX = soundData.sfx as unknown as Record<FirstFireSoundId, SfxDef>;
