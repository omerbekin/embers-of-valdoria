// Mob görünüş varyasyonları (Harita 2 kadın varyasyonları, Ömer 2026-10-26) + Harita 2 elit / boss / totem çizim bağları (UnitSetup.spriteId).
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { battlePlan, campaignWaveTeams, debugJumpDrownedReach, debugTeleport, DROWNED_REACH, ENCOUNTERS, newCampaign, setMapOverride } from '../src/campaign';
import { mobLook, mobLookVariants } from '../src/campaign/mob-looks';
import { Battle, content } from '../src/engine';
import { simulate } from '../src/sim/simulate';
import { MOB_POSES } from '../src/game/mob-poses';
import looks from '../data/mob-looks.json';

beforeAll(() => setMapOverride(DROWNED_REACH, true));
afterAll(() => setMapOverride(DROWNED_REACH, null));

const planAt = (node: string, seed = 11) => battlePlan(debugTeleport(debugJumpDrownedReach(newCampaign({ mode: 'normal', seed })), node));
const setupOf = (plan: ReturnType<typeof planAt>) =>
  content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units, ...campaignWaveTeams(plan) }, false);
const allUnits = (plan: ReturnType<typeof planAt>) => [plan.units.enemies, ...(plan.waves ?? []).map((w) => w.units)].flatMap((u) => Object.values(u));

describe('mob görünüş varyasyonları', () => {
  it('her varyasyonun çizimi ve avatarı var; temel mob verisi aynı (tek mob)', () => {
    for (const [cls, list] of Object.entries(looks.variants)) {
      expect(content.mobs[cls], cls).toBeDefined();
      for (const v of list) {
        expect(existsSync(`assets/sprites/${v}/idle.png`), v).toBe(true);
        expect(existsSync(`assets/avatars/${v}.png`), v).toBe(true);
        expect(content.mobs[v], `${v} ayrı mob değil`).toBeUndefined();
      }
    }
  });

  it('seed\'li: aynı seed aynı görünüş, oran ~%50; elit / boss / hedef / özel çizim etkilenmez', () => {
    const u = { class: 'corsair_cutlass', slot: 0 };
    let f = 0;
    for (let seed = 1; seed <= 2000; seed++) {
      const a = mobLook(u, seed, 0);
      expect(mobLook(u, seed, 0)).toBe(a);
      if (a) {
        expect(a).toBe('corsair_cutlass_f');
        f++;
      }
    }
    expect(f / 2000).toBeGreaterThan(0.44);
    expect(f / 2000).toBeLessThan(0.56);
    for (let seed = 1; seed <= 50; seed++) {
      expect(mobLook({ ...u, tier: 'elite' }, seed, 0)).toBeUndefined();
      expect(mobLook({ ...u, boss: 'giant' }, seed, 0)).toBeUndefined();
      expect(mobLook({ ...u, objective: true }, seed, 0)).toBeUndefined();
      expect(mobLook({ ...u, sprite: 'x' }, seed, 0)).toBeUndefined();
      expect(mobLook({ class: 'siren', slot: 0 }, seed, 0)).toBeUndefined();
    }
    expect(mobLookVariants('salt_crab')).toEqual([]);
  });

  it('sefer planı: dr55 birimleri seed\'e göre karışık görünür, plan tekrarında aynı', () => {
    let seen = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const plan = planAt('dr55', seed);
      expect(planAt('dr55', seed).units).toEqual(plan.units);
      for (const u of allUnits(plan)) if (u.spriteId) seen.add(u.spriteId);
    }
    seen = new Set([...seen].filter((s) => s.endsWith('_f')));
    expect(seen.size).toBeGreaterThan(0);
  });

  it('görünüş savaş RNG\'sini tüketmez: spriteId silinince savaş birebir aynı biter', () => {
    for (const node of ['dr55', 'dr7']) {
      const plan = planAt(node);
      const strip = (u: Record<number, { spriteId?: string }>) => Object.fromEntries(Object.entries(u).map(([k, v]) => [k, { ...v, spriteId: undefined }]));
      const bare = { ...plan, units: { ...plan.units, enemies: strip(plan.units.enemies) }, waves: plan.waves?.map((w) => ({ ...w, units: strip(w.units) })) } as typeof plan;
      const run = (p: typeof plan) => {
        const r = simulate(1, p.seed, content.DEFAULT_BATTLE, {}, { setupFor: () => setupOf(p) });
        return { wins: r.partyWins, turns: r.totalTurns, dmg: [...r.classes].map(([id, c]) => [id, c.damage, c.deaths]) };
      };
      expect(run(plan)).toEqual(run(bare));
    }
  });
});

describe('Harita 2 elit / boss / totem çizimleri', () => {
  const OWN: Record<string, string> = {
    dr7: 'reaver_chief_hook',
    dr18: 'salt_hag_mother',
    dr32: 'guild_enforcer_bastion',
    dr50: 'wrecker_captain',
    dr59: 'corsair_captain_marrow',
    dr65: 'siren_queen',
    dr74: 'salt_bishop',
    dr79: 'drowned_champion',
    dr26: 'weir_wyrm',
    dr66: 'admiral_vane',
    dr82: 'drowned_queen',
    dr13: 'hex_totem',
  };

  it('her önder kendi çizimiyle savaşa girer (kit / ad aynı), dosyalar ve poz kaydı var', () => {
    let inBattle = 0;
    for (const [node, sprite] of Object.entries(OWN)) {
      const plan = planAt(node);
      // önder ilk dalgada ya da sonraki dalgada (elitler 2. dalgayla gelir)
      expect(allUnits(plan).some((u) => u.spriteId === sprite), `${node} ${sprite}`).toBe(true);
      const unit = new Battle(setupOf(plan)).combatants.find((c) => c.spriteId === sprite);
      if (unit) {
        expect(unit.defId).not.toBe(sprite);
        inBattle++;
      }
      expect(existsSync(`assets/sprites/${sprite}/idle.png`), sprite).toBe(true);
      expect(existsSync(`assets/avatars/${sprite}.png`), sprite).toBe(true);
      if (sprite !== 'hex_totem') expect(MOB_POSES[sprite], sprite).toBeDefined();
    }
    expect(inBattle).toBeGreaterThan(0); // motor UnitSetup.spriteId'yi birime yazar
    // Drowned Queen'in yanındaki Champion da kendi çiziminde
    expect(allUnits(planAt('dr82')).some((u) => u.spriteId === 'drowned_champion')).toBe(true);
  });

  it('karşılaşma verisinde sprite alanı yalnızca var olan çizimlere işaret eder', () => {
    for (const [id, def] of Object.entries(ENCOUNTERS)) {
      const units = [...(def.units ?? []), ...((def as { waves?: { units?: { sprite?: string }[] }[] }).waves ?? []).flatMap((w) => w.units ?? [])];
      for (const u of units as { sprite?: string }[]) if (u.sprite) expect(existsSync(`assets/sprites/${u.sprite}/idle.png`), `${id} ${u.sprite}`).toBe(true);
    }
  });
});
