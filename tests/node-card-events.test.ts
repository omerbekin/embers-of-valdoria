// Olay kartı (E1 + olay resmi + tür rozeti): her olay tam bir ailede, sahneler var, blessing yalnız verisinde geçen olayda.
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { EVENTS } from '../src/campaign/data';
import { EVENT_FAMILIES, EVENT_LOOK, eventHasBlessing, eventIsStory, eventQuestClass } from '../src/ui/node-card-events';

describe('event card families', () => {
  it('every campaign event has a family and every family entry is a real event', () => {
    expect(Object.keys(EVENT_LOOK).sort()).toEqual(Object.keys(EVENTS).sort());
  });
  it('every family is used and every scene file exists', () => {
    const used = new Set(Object.values(EVENT_LOOK).map((l) => l.family));
    expect([...used].sort()).toEqual(Object.keys(EVENT_FAMILIES).sort());
    for (const l of Object.values(EVENT_LOOK)) {
      if (l.bg) expect(existsSync(`assets/backgrounds/${l.bg}.webp`), l.bg).toBe(true);
      if (l.win) expect(existsSync(`assets/campaign/windows/${l.win}.webp`), l.win).toBe(true);
    }
  });
  it('blessing surprise comes from event data only (Wayshrine today)', () => {
    expect(Object.keys(EVENTS).filter(eventHasBlessing)).toEqual(['dr_wayshrine']);
  });
  it('every event has its own art file', () => {
    for (const id of Object.keys(EVENTS)) expect(existsSync(`assets/campaign/events/${id}.webp`), id).toBe(true);
  });
  it('quest events give their class, choice-less readings are story, the rest have no badge', () => {
    expect(eventQuestClass('dr_quest_roost')).toBe('archer');
    expect(eventQuestClass('dr_quest_debt')).toBe('cutthroat');
    expect(eventQuestClass('dr_monks_isle')).toBe('paladin');
    expect(eventQuestClass('witchs_hut')).toBeUndefined();
    expect(eventIsStory('dr_flooded_library')).toBe(true);
    expect(eventIsStory('hc_stone_gate')).toBe(true);
    expect(eventIsStory('dr_wayshrine')).toBe(false);
    expect(eventIsStory('dr_quest_roost')).toBe(false);
    expect(eventIsStory('witchs_hut')).toBe(false);
  });
});
