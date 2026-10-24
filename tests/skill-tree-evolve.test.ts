import { describe, expect, it } from 'vitest';
import { debugGrantEvolve, newCampaign, pickHero } from '../src/campaign';
import { evolveArtFor, evolveKeys, evolvedRows, evolvedSkillIds, resolveEvolveIcon } from '../src/progression/skill-tree-evolve';
import { loadoutSetup } from '../src/progression/loadout';
import { TREE_RULES, type TreeRules } from '../src/progression/skill-tree-data';

const ART = new Set(['warrior/3_v']);
const hasArt = (id: string): boolean => ART.has(id);
const withEvolve = { class: 'warrior', tree: { v: 1, r: { '3.v': 1 } } };
const off = (modes: Partial<TreeRules['modes']>): TreeRules => ({ ...TREE_RULES, modes: { ...TREE_RULES.modes, ...modes } });

describe('evolve sanatı gerçek dosyalardan', () => {
  it('1_v ve 2_v ve 3_v dosyaları çözücüye girer (Double Strike / Whirlwind / Charge)', async () => {
    const { hasTreeArt } = await import('../src/ui/evolve-icon');
    for (const id of ['warrior/1_v', 'warrior/2_v', 'warrior/3_v']) expect(hasTreeArt(id)).toBe(true);
    const t = (k: string) => ({ class: 'warrior', tree: { v: 1, r: { [k]: 1 } } });
    expect(resolveEvolveIcon(t('1.v'), 'melee_attack', 'campaign', hasTreeArt)).toEqual({ evolved: true, art: 'warrior/1_v' });
    expect(resolveEvolveIcon(t('2.v'), 'whirlwind', 'campaign', hasTreeArt)).toEqual({ evolved: true, art: 'warrior/2_v' });
  });
  it('notable sanatı: dosya yoksa null (eski görünüm)', async () => {
    const { nodeArtUrl } = await import('../src/ui/evolve-icon');
    expect(nodeArtUrl('warrior', '0.n0')).toBeTruthy();
    expect(nodeArtUrl('nobody', '1.n0')).toBeNull();
  });
});

describe('evolve çözücüsü', () => {
  it('evolve düğümleri kurallardan türer (satır başına bir)', () => {
    expect([...evolveKeys().entries()]).toEqual([[0, '0.v'], [1, '1.v'], [2, '2.v'], [3, '3.v']]);
  });

  it('onaylı evolve: skill evolved sayılır, evolve sanatı varsa o seçilir', () => {
    expect(evolvedRows(withEvolve, 'campaign')).toEqual([3]);
    expect(evolvedSkillIds(withEvolve, 'endless')).toEqual(['charge']);
    expect(resolveEvolveIcon(withEvolve, 'charge', 'campaign', hasArt)).toEqual({ evolved: true, art: 'warrior/3_v' });
    // başka skill etkilenmez
    expect(resolveEvolveIcon(withEvolve, 'whirlwind', 'campaign', hasArt)).toEqual({ evolved: false, art: null });
  });

  it('evolve sanatı yoksa: yine evolved (normal ikon animasyonlanır), art null', () => {
    expect(resolveEvolveIcon(withEvolve, 'charge', 'campaign', () => false)).toEqual({ evolved: true, art: null });
    expect(evolveArtFor('warrior', 'charge', () => false)).toBeNull();
    expect(evolveArtFor('warrior', 'charge', hasArt)).toBe('warrior/3_v');
    expect(evolveArtFor('warrior', 'whirlwind', hasArt)).toBeNull();
  });

  it('evolve alınmamış / ağaç yok / ağaçsız class: evolved değil', () => {
    expect(resolveEvolveIcon({ class: 'warrior', tree: { v: 1, r: { '3.f1': 3 } } }, 'charge', 'campaign', hasArt).evolved).toBe(false);
    expect(resolveEvolveIcon({ class: 'warrior' }, 'charge', 'campaign', hasArt).evolved).toBe(false);
    expect(resolveEvolveIcon({ class: 'nobody', tree: { v: 1, r: { '3.v': 1 } } }, 'charge', 'campaign', hasArt).evolved).toBe(false);
  });

  it('mod kapalı (quick / multiplayer / modsuz) ya da ana şalter kapalı: animasyon yok', () => {
    expect(evolvedRows(withEvolve, 'quick')).toEqual([]);
    expect(evolvedRows(withEvolve, 'multiplayer')).toEqual([]);
    expect(evolvedRows(withEvolve, undefined)).toEqual([]);
    expect(evolvedRows(withEvolve, 'campaign', off({ campaign: false }))).toEqual([]);
    expect(evolvedRows(withEvolve, 'campaign', { ...TREE_RULES, enabled: false })).toEqual([]);
  });

  it('savaş kurulumu: evolve onaylı skill id listesi UnitSetup.evolved olarak gider (yalnızca mod verilince)', () => {
    const src = { class: 'warrior', level: 30, tree: withEvolve.tree, equipment: {} };
    expect(loadoutSetup(src as never, { mode: 'campaign' }).evolved).toEqual(['charge']);
    expect(loadoutSetup(src as never).evolved).toBeUndefined();
    expect(loadoutSetup(src as never, { mode: 'quick' }).evolved).toBeUndefined();
  });

  it('debug: Warrior Charge evolve onaylı ağaç verir (bekleyen değil, geçerli)', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 3 }), 'warrior');
    const t = debugGrantEvolve(s, 'warrior', 'charge');
    const w = t.roster.find((h) => h.class === 'warrior')!;
    expect(w).toBeTruthy();
    expect(w.tree?.r['3.v']).toBe(1);
    expect(evolvedSkillIds(w, 'campaign')).toEqual(['charge']);
    expect(w.skillPoints ?? 0).toBeGreaterThanOrEqual(0);
  });
});
