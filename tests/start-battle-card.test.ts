import { describe, expect, it } from 'vitest';
import { CONFIG, MAPS, foeGroups, getMap, startCardInfo } from '../src/campaign';

describe('Start battle? kartı: düşman grupları + tek bilgi satırı', () => {
  it('aynı düşman "N×" olarak birleşir, yedek bilgi önderin var olan pasif metnidir', () => {
    const r = foeGroups('ravenwood_pack');
    expect(r.groups[0]).toMatchObject({ cls: 'grey_wolf', n: 3 });
    expect(r.groups.length).toBe(3);
    expect(r.info?.who).toBe('Grey Wolf');
    expect(r.info?.text).toMatch(/Pack|damage/i);
  });
  it('elit önder rütbeli işaretlenir', () => {
    const r = foeGroups('watchtower_tutorial');
    expect(r.groups.find((g) => g.tier === 'elite')?.name).toBe('Bandit Chief');
    expect(r.info?.who).toBe('Bandit Chief');
  });
  it('boss: pasifi yoksa ilk savaş çığlığı alıntı olarak gelir', () => {
    const r = foeGroups('bridge_warden');
    expect(r.groups.find((g) => g.tier === 'boss')).toBeTruthy();
    expect(r.info?.quote).toBe(true);
  });
  it('düğümün lore cümlesi varsa bilgi satırı odur (başlıksız); yoksa önder pasifi / boss çığlığı kalır', () => {
    const n = getMap('valdoria').nodes.find((x) => x.id === '2')!;
    const fb = foeGroups(n.encounter!).info;
    expect(startCardInfo(n.lore, fb)).toEqual({ text: n.lore });
    expect(startCardInfo(undefined, fb)).toBe(fb);
    expect(startCardInfo('   ', fb)).toBe(fb);
    expect(startCardInfo(undefined, undefined)).toBeUndefined();
  });
});

describe('Sefer haritası lore cümleleri', () => {
  for (const id of CONFIG.maps) {
    it(`${id}: her düğümün tek, kısa lore cümlesi var (sayı yok)`, () => {
      const m = MAPS[id] ?? getMap(id);
      for (const n of m.nodes) {
        const t = n.lore ?? '';
        expect(t, `${n.id} lore`).not.toBe('');
        expect(t.length, `${n.id} uzunluk`).toBeGreaterThanOrEqual(40);
        expect(t.length, `${n.id} uzunluk`).toBeLessThanOrEqual(130);
        expect(t, `${n.id} rakam`).not.toMatch(/\d/);
      }
    });
  }
});
