// Gün sayacı görünüm verisi (Ömer 2026-10-26): gün + completionsPerDay ilerlemesi, gerçek Inn olayı, veri güdümlü kartlar (örnek olay yok).
import { afterEach, describe, expect, it } from 'vitest';
import { completionsPerDay, newCampaign, type CampaignState } from '../src/campaign';
import { countdown, dayView, registerDayEntries } from '../src/ui/day-counter-model';

const base = (): CampaignState => newCampaign({ mode: 'normal', seed: 5 });
const offs: Array<() => void> = [];
afterEach(() => offs.splice(0).forEach((f) => f()));

describe('dayView', () => {
  it('yeni seferde gün 1, ilerleme 0, kart yok', () => {
    const v = dayView(base());
    expect(v.day).toBe(1);
    expect(v.per).toBe(completionsPerDay());
    expect(v.steps).toBe(0);
    expect(v.remaining).toBe(v.per);
    expect(v.entries).toEqual([]);
    expect(v.innGuests).toBe(0);
    expect(v.next).toBe(`${v.per} wins to day 2`);
    expect(v.foot).toBe(`${v.per} wins = 1 day`);
  });

  it('yarım gün ilerlemesi ve Inn şafağı gerçek veriden', () => {
    const s = base();
    const hero = s.roster[0]!;
    const t: CampaignState = { ...s, day: 3, dayProgress: 0.5, inn: [{ hero, mapId: s.mapId, town: s.at, day: 3 }] };
    const v = dayView(t);
    expect(v.day).toBe(3);
    expect(v.steps).toBe(1);
    expect(v.remaining).toBe(1);
    expect(v.innGuests).toBe(1);
    expect(v.next).toBe('Inn heals in 1 win');
  });

  it('bağlanan sistem kart ekler (geri sayıma göre, en çok 4); çözülünce kaybolur', () => {
    const off = registerDayEntries(() => [
      { id: 'b', kind: 'threat', title: 'B', sub: 'later', inDays: 5 },
      { id: 'a', kind: 'quest', title: 'A', sub: 'sooner', inDays: 1 },
    ]);
    offs.push(off);
    const v = dayView(base());
    expect(v.entries.map((e) => e.id)).toEqual(['a', 'b']);
    off();
    expect(dayView(base()).entries).toEqual([]);
  });
});

describe('countdown', () => {
  it('bugün / 1 gün / çok gün', () => {
    expect(countdown(0)).toEqual({ n: 'Now', unit: 'today' });
    expect(countdown(1)).toEqual({ n: '1', unit: 'day' });
    expect(countdown(4)).toEqual({ n: '4', unit: 'days' });
  });
});
