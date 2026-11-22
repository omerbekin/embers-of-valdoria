// Olay penceresi (Ömer 2026-11-21, form r39): seçenek türü rozeti ("Free" yok), boş "çık" seçenekleri closer, kalıcı seçim Final.
import { describe, expect, it } from 'vitest';
import { EVENTS } from '../src/campaign/data';
import { choiceStyle } from '../src/ui/map-window';
import { choiceChips } from '../src/ui/map-window-data';
import mw from '../data/map-window.json';

const all = Object.entries(EVENTS).flatMap(([id, e]) => (e.choices ?? []).map((c) => ({ id, c })));
const FX = ['cost', 'gold', 'hpLoss', 'heal', 'chest', 'restHeal', 'gift', 'charter', 'light', 'join', 'relic', 'battle', 'faction', 'stoneOath', 'oath', 'nextBattleStatus', 'quest', 'win'];

describe('olay seçenek rozeti', () => {
  it('hiçbir seçenekte Free rozeti yok; rozet izinli türlerden', () => {
    const ok = ['Fight', 'Blood', 'Gold', 'Gain', 'Lore', 'Oath · Final', 'Final', 'Debuff'];
    for (const { id, c } of all) expect(ok, `${id}.${c.id}`).toContain(choiceStyle(id, c).tag);
  });
  it('kalıcı seçimler Final / Oath', () => {
    const tag = (ev: string, ch: string) => choiceStyle(ev, EVENTS[ev]!.choices!.find((x) => x.id === ch)!).tag;
    expect(tag('dr_guild_hall', 'order')).toBe('Final');
    expect(tag('hc_hall_of_oaths', 'swear')).toBe('Final');
    expect(tag('dr_saltspray_shrine', 'oath')).toBe('Oath · Final');
    expect(tag('hc_white_dark', 'wait')).toBe('Debuff');
    expect(tag('dr_stilt_hamlet', 'listen')).toBe('Lore');
  });
  it('closer seçenekleri etkisizdir (yalnız çıkış)', () => {
    const closers = all.filter(({ c }) => c.closer);
    expect(closers.length).toBe(8);
    for (const { id, c } of closers) for (const k of FX) expect((c as unknown as Record<string, unknown>)[k], `${id}.${c.id}.${k}`).toBeUndefined();
  });
  it("üç olay (Shepherds Fold, Witch's Hut, Drowned Registry) rozeti veriden türer: elle ezme yok", () => {
    expect(Object.keys(mw.choices).length).toBe(0);
    const tag = (ev: string, ch: string) => choiceStyle(ev, EVENTS[ev]!.choices!.find((x) => x.id === ch)!).tag;
    expect(tag('shepherds_fold', 'search')).toBe('Fight');
    expect(tag('shepherds_fold', 'bread')).toBe('Gold');
    expect(tag('shepherds_fold', 'castle')).toBe('Lore');
    expect(tag('witchs_hut', 'pay')).toBe('Gold');
    expect(tag('witchs_hut', 'blood')).toBe('Blood');
    expect(tag('witchs_hut', 'leave')).toBe('Lore');
    expect(tag('dr_quest_registry', 'speak')).toBe('Fight');
    expect(tag('dr_quest_registry', 'drown')).toBe('Lore');
  });
  it('etkisi olan seçenekte "No change" çipi yok (Vesper katılır / Legendary takı, yemin, taç seçimi)', () => {
    const chips = (ev: string, ch: string) => choiceChips(EVENTS[ev]!.choices!.find((x) => x.id === ch)!).map((x) => x.text);
    expect(chips('dr_vesper', 'accept')).toEqual(['Vesper joins']);
    expect(chips('dr_vesper', 'refuse')).toEqual(['Legendary trinket']);
    expect(chips('dr_saltspray_shrine', 'oath')).toEqual(['One hero swears an oath (final)']);
    expect(chips('hc_mend_or_quench', 'mend')).toEqual(['Mend the crown (final)']);
    for (const { id, c } of all) {
      const hasFx = FX.some((k) => (c as unknown as Record<string, unknown>)[k] !== undefined) || 'join' in c || 'relic' in c || 'crownChoice' in c;
      if (hasFx) expect(choiceChips(c).map((x) => x.text), `${id}.${c.id}`).not.toContain('No change');
    }
  });
});
