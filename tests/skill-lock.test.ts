import { describe, expect, it } from 'vitest';
import { CONFIG, getMap } from '../src/campaign/data';
import { node } from '../src/campaign/graph';
import { soloSkillOrder, soloUnlockHints } from '../src/campaign/solo-start';
import { LOCKED_FALLBACK, lockBadgeHtml, lockedSkillText } from '../src/ui/skill-lock';
import { skillPlateHtml } from '../src/ui/skill-bar';

const solo = { soloStart: true as const, mapId: CONFIG.maps[0]!, done: [] as string[] };
const lead = (c: string) => ({ class: c, leader: true });
const nameOf = (id: string) => node(getMap(CONFIG.maps[0]!), id).name;
const plate = (locked?: boolean) => ({ id: 's', name: 'S', iconUrl: 'x.png', cost: [], wait: 0, enabled: !locked, selected: false, ult: false, ...(locked ? { locked } : {}) });

describe('kilitli skill: açılış metni veriden', () => {
  it.each(['warrior', 'defender', 'paladin', 'druid'])('%s: Mill Road ve Ravenwood kilitleri doğru yeri söyler', (c) => {
    const o = soloSkillOrder(c);
    const mill = soloUnlockHints(solo, lead(c), '1', nameOf);
    expect(Object.keys(mill)).toEqual(o.slice(1));
    expect(mill[o[1]!]).toBe(`Unlocks at ${nameOf('2')}`);
    expect(mill[o[2]!]).toBe(`Unlocks at ${nameOf('2')}`); // üçüncü skill Ravenwood'un ikinci dalgasında açılır
    expect(mill[o[3]!]).toBe(`Unlocks at ${nameOf('3')}`);
    const raven = soloUnlockHints(solo, lead(c), '2', nameOf);
    expect(raven[o[2]!]).toBe('Unlocks in wave 2');
    expect(raven[o[3]!]).toBe(`Unlocks at ${nameOf('3')}`);
    expect(raven[o[1]!]).toBeUndefined(); // açık skill'in metni yok
  });

  it('kilitsiz durumlar boş: son düğüm, lider olmayan, kazanılmış düğüm, başka harita, eski kayıt', () => {
    expect(soloUnlockHints(solo, lead('warrior'), '3', nameOf)).toEqual({});
    expect(soloUnlockHints(solo, { class: 'warrior', leader: false }, '1', nameOf)).toEqual({});
    expect(soloUnlockHints({ ...solo, done: ['1:battle'] }, lead('warrior'), '1', nameOf)).toEqual({});
    expect(soloUnlockHints({ ...solo, mapId: CONFIG.maps[1]! }, lead('warrior'), '1', nameOf)).toEqual({});
    expect(soloUnlockHints({ mapId: solo.mapId, done: [] }, lead('warrior'), '1', nameOf)).toEqual({});
  });

  it('HUD metni: motorun dalga kilidi > sefer ipucu > "Locked for now"', () => {
    expect(lockedSkillText({ unlockOnWave: { wave: 1, skills: ['a'] } }, 'a', { a: 'Unlocks at X' })).toBe('Unlocks in wave 2');
    expect(lockedSkillText({}, 'a', { a: 'Unlocks at X' })).toBe('Unlocks at X');
    expect(lockedSkillText({}, 'a')).toBe(LOCKED_FALLBACK);
    expect(lockedSkillText({ unlockOnWave: { wave: 1, skills: ['b'] } }, 'a', {})).toBe(LOCKED_FALLBACK);
  });

  it('kilit simgesi yalnız kilitli plakada; dosya var (assets/ui-icons/lock)', () => {
    expect(skillPlateHtml(plate(true), '')).toContain('bp-lock');
    expect(skillPlateHtml(plate(false), '')).not.toContain('bp-lock');
    expect(lockBadgeHtml()).toContain('<img class="bp-lock"');
  });
});
