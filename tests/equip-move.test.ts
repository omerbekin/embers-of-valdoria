import { describe, expect, it } from 'vitest';
import { emptyEquipment, planMoveEquipped, type ItemInstance } from '../src/progression';
import { dropAction } from '../src/ui/gear-drop';

// Kuşanılmış item'i yuvadan yuvaya sürükleme (Ömer 2026-10-23): hançer ana el <-> ikinci el.
const it_ = (id: string, uid = id): ItemInstance => ({ uid, id });
const eq = (o: Partial<Record<string, ItemInstance>>) => ({ ...emptyEquipment(), ...o });

describe('kuşanılmış item yuvadan yuvaya taşıma', () => {
  it('iki hançer ana el <-> ikinci el yer değiştirir', () => {
    const p = planMoveEquipped('cutthroat', eq({ weapon: it_('rondel_dagger'), offhand: it_('misericorde') }), 'weapon', 'offhand');
    expect('error' in p).toBe(false);
    if ('error' in p) return;
    expect(p.equipment.weapon?.id).toBe('misericorde');
    expect(p.equipment.offhand?.id).toBe('rondel_dagger');
    expect(p.toBag).toEqual([]);
  });
  it('hedefteki item kaynağa uymuyorsa torbaya döner', () => {
    // antimage: ana elde kılıç, ikinci elde hançer; hançer ana ele geçince kılıç ikinci ele giremez -> torba
    const p = planMoveEquipped('antimage', eq({ weapon: it_('arming_sword'), offhand: it_('rondel_dagger') }), 'offhand', 'weapon');
    expect('error' in p).toBe(false);
    if ('error' in p) return;
    expect(p.equipment.weapon?.id).toBe('rondel_dagger');
    expect(p.equipment.offhand).toBeFalsy();
    expect(p.toBag.map((x) => x.id)).toEqual(['arming_sword']);
  });
  it('uymayan yuva ve boş ana elli ikinci el reddedilir', () => {
    expect('error' in planMoveEquipped('warrior', eq({ weapon: it_('arming_sword'), offhand: it_('oak_shield') }), 'offhand', 'weapon')).toBe(true);
    expect('error' in planMoveEquipped('warrior', eq({ weapon: it_('arming_sword') }), 'weapon', 'offhand')).toBe(true);
  });
  it('sürükle-bırak kararı: uyan yuvaya move, uymayana none', () => {
    const at = (_h: string, s: string) => (s === 'weapon' ? 'rondel_dagger' : 'oak_shield');
    const src = { kind: 'slot' as const, heroId: 'h', slot: 'weapon' as const };
    expect(dropAction(src, { kind: 'slot', heroId: 'h', slot: 'offhand' }, () => 'cutthroat', at)).toEqual({ kind: 'move', heroId: 'h', from: 'weapon', to: 'offhand' });
    expect(dropAction(src, { kind: 'slot', heroId: 'h', slot: 'helm' }, () => 'cutthroat', at).kind).toBe('none');
    expect(dropAction({ kind: 'slot', heroId: 'h', slot: 'offhand' }, { kind: 'slot', heroId: 'h', slot: 'weapon' }, () => 'warrior', at).kind).toBe('none'); // kalkan ana ele girmez
    expect(dropAction(src, { kind: 'slot', heroId: 'x', slot: 'offhand' }, () => 'cutthroat', at).kind).toBe('none'); // başka kahraman
  });
});
