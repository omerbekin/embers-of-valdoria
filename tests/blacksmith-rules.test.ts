import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { ITEMS, makeItem, type RarityId } from '../src/progression';
import { REFORGE_EPIC_ONLY, reforgeAccepts, reforgePickOnSwitch, reforgeRejectReason } from '../src/ui/blacksmith-rules';

// Ömer 2026-11-12: Reforge sekmesi yalnız Epic item alır (arayüz kuralı; motor kuralı aynı).
const plain = ITEMS.items.find((d) => d.rarity !== 'legendary' && !d.set)!;
const mk = (uid: string, rarity: RarityId) => makeItem(plain.id, uid, new Rng(uid.length * 13), { rarity });

describe('Blacksmith: Reforge yalnız Epic', () => {
  it('Epic kabul, Common / Uncommon / Rare reddedilir', () => {
    expect(reforgeAccepts(mk('e1', 'epic'))).toBe(true);
    for (const r of ['common', 'uncommon', 'rare'] as RarityId[]) {
      expect(reforgeAccepts(mk(`x-${r}`, r))).toBe(false);
      expect(reforgeRejectReason(mk(`x-${r}`, r))).toBe(REFORGE_EPIC_ONLY);
    }
    expect(reforgeAccepts(null)).toBe(false);
  });
  it('set parçası ayrı nedenle reddedilir', () => {
    const set = ITEMS.items.find((d) => d.set);
    if (!set) return;
    const inst = makeItem(set.id, 's1', new Rng(3));
    expect(reforgeAccepts(inst)).toBe(false);
    expect(reforgeRejectReason(inst)).toBe('Set items cannot be reforged');
  });
  it('sekme değişimi: Temper seçimi Epic değilse Reforge boş kalır', () => {
    expect(reforgePickOnSwitch(mk('r1', 'rare'), 'old')).toBe('');
    expect(reforgePickOnSwitch(mk('e2', 'epic'), '')).toBe('e2');
    expect(reforgePickOnSwitch(null, 'keep')).toBe('keep');
  });
});
