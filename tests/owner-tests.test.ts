import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import { debugGrantEvolve, newCampaign, pickHero } from '../src/campaign';
import { evolvedSkillIds } from '../src/progression/skill-tree-evolve';
import { validate } from '../src/progression/skill-tree';
import { treeOf } from '../src/progression/skill-tree-data';
import { MAGE_EVOLVES, SOUND_GROUPS, mageShowcaseBattleData, mageShowcaseSetup, resolveSound, volumeWarning } from '../src/game/owner-tests';

describe('Owner tests: Mage vitrin savaşı', () => {
  it('Mage kurulumunda 4 evrim açık, ağaç etkisi derlenmiş', () => {
    const s = mageShowcaseSetup();
    expect(s.evolved).toEqual(MAGE_EVOLVES.map((e) => e.skill));
    expect(s.tree).toBeTruthy();
    expect(Object.keys(s.tree!.skills ?? {}).sort()).toEqual(expect.arrayContaining(['blizzard', 'fire_bolt', 'ice_crater']));
    expect(s.tree!.hooks?.length, 'Mirage Veil bir kanca (hitTaken)').toBeGreaterThan(0);
  });
  it('savaş verisi: Mage taraf listesinde, kurulum Mage hücresine bağlı, düşmanlar yakın dövüşçü', () => {
    const d = mageShowcaseBattleData(5);
    const at = d.teams.party.indexOf('mage');
    expect(at).toBeGreaterThanOrEqual(0);
    expect(d.teams.units!.party![at]!.evolved).toHaveLength(4);
    expect(d.mode).toBe('turns');
    expect(d.teams.enemies.filter(Boolean).sort()).toEqual(['cutthroat', 'paladin', 'warrior']);
  });
});

describe('Owner tests: sefer Mage evrimi (tek tek; sefer tavanı L30 = 29 puan, 2. evrim 38 ister)', () => {
  for (const e of MAGE_EVOLVES) {
    it(`${e.base} > ${e.evolve}: geçerli onaylı ağaç, yalnız bu evrim açık`, () => {
      const w = pickHero(newCampaign({ mode: 'normal', seed: 3 }), 'warrior');
      const s0 = { ...w, roster: [...w.roster, { ...JSON.parse(JSON.stringify(w.roster[0])), id: 'h-mage', class: 'mage', level: 1, tree: undefined }] };
      const s = debugGrantEvolve(s0, 'mage', e.skill);
      const h = s.roster.find((x) => x.class === 'mage')!;
      expect(h.tree, 'ağaç yazıldı').toBeTruthy();
      expect(validate(treeOf('mage')!, h.level ?? 1, h.tree!)).toBeNull();
      expect(evolvedSkillIds(h, 'campaign')).toEqual([e.skill]);
    });
  }
});

describe('Owner tests: Sound check', () => {
  it('her ses motorunda çözülür (listedeki hiçbir ad sessiz kalmaz)', () => {
    for (const g of SOUND_GROUPS) for (const e of g.sounds) expect(resolveSound(e), `${g.title} / ${e.id}`).toBeTruthy();
  });
  it('ses uyarısı', () => {
    expect(volumeWarning({ enabled: true, volume: 0, sfx: 1 })).toMatch(/Volume is 0/);
    expect(volumeWarning({ enabled: true, volume: 0.5, sfx: 0 })).toMatch(/Sound Effects/);
    expect(volumeWarning({ enabled: true, volume: 0.5, sfx: 1 })).toBeNull();
  });
});

describe('Owner tests: vitrin savaşı motorda oynanır', () => {
  it('YZ ile oynatılınca Mage kurulur, Mirage Veil tetiklenir (zemin + Burning) ve 3 evrim skill atılır', () => {
    let mirage = 0;
    let ground = 0;
    let blinded = 0;
    const cast = new Set<string>();
    for (let seed = 1; seed <= 8; seed++) {
      const d = mageShowcaseBattleData(seed);
      const b = new Battle(content.battleSetup('random-battle', d.seed, 'turns', d.teams, false));
      const mage = b.combatants.find((c) => c.defId === 'mage')!;
      expect(mage.evolved).toHaveLength(4);
      let guard = 0;
      while (!b.winner && guard++ < 300) {
        const a = b.currentActor;
        if (!a) break;
        const choice = chooseAction(b, a.uid, content.aiConfig);
        const r = b.applyChoice(a.uid, choice);
        if (!r.ok) break;
        if (choice && a.defId === 'mage') cast.add(choice.skillId);
        for (const e of r.events) {
          if (e.type === 'passive' && e.passive === 'heat_mirage') mirage++;
          if (e.type === 'ground') ground++;
          if (e.type === 'status' && e.status === 'blinded' && e.source === mage.uid) blinded++;
        }
      }
    }
    expect(mirage, 'Heat Mirage / Mirage Veil tetiklendi').toBeGreaterThan(0);
    expect(ground).toBeGreaterThan(0);
    expect(blinded, 'Mirage Veil: saldıran Blinded').toBeGreaterThan(0);
    expect([...cast].some((id) => ['fire_bolt', 'blizzard', 'ice_crater'].includes(id)), [...cast].join(',')).toBe(true);
  });
});
