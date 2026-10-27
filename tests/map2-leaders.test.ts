import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import type { BattleEvent, Teams } from '../src/engine';
import { ENCOUNTERS, validateEncounters } from '../src/campaign';
import { rangeOff } from './range-helpers';
import { existsSync } from 'node:fs';
import { MOB_VFX_SPECS } from '../src/game/mob-vfx';
import { MOB_IMAGE_FILES } from '../src/game/icon-image-files';
import { mobSheetId, vfxSheetFile } from '../src/game/vfx-sheet-files';
import { selectSkillVfx } from '../src/game/vfx-select';
import { MOB_POSES } from '../src/game/mob-poses';

// Harita 2 elit ve boss önderlerinin KENDİ kitleri (maps-2-3.md 3.3, Ömer onayı 2026-10-27; sayılar provizyon: open-questions 435)
// + M-N2 zorla hareket (Boarding Hook: kahramanı kendi şeridinin ön sıra hücresine çeker; hücre doluysa çekme yok; elit/boss çekilmez).

const KITS: Record<string, string[]> = {
  reaver_chief_hook: ['gaff_strike', 'boarding_hook', 'gutting_sweep'],
  salt_hag_mother: ['brine_curse', 'call_the_tide', 'salt_circle'],
  guild_enforcer_bastion: ['iron_maul', 'hold_the_pier', 'debtors_chain'],
  inquisitor_captain_vell: ['scourge_of_heresy', 'writ_of_silence', 'lead_the_faithful'],
  wrecker_captain: ['wreckers_gaff', 'false_beacon', 'drag_to_the_rocks'],
  corsair_captain_marrow: ['black_cutlass', 'captains_rake', 'powder_keg'],
  siren_queen: ['queens_lament', 'grand_chorus', 'sirens_call'],
  salt_bishop: ['brine_rite', 'requiem_of_salt', 'tide_of_mercy'],
  drowned_champion: ['drowned_greatsword', 'champions_challenge', 'wall_of_brine'],
  pit_champion_gorr: ['pit_cestus', 'skull_splitter', 'play_to_the_crowd'], // Fighting Pit dr_pit_5 (open-questions 440)
  weir_wyrm: ['wyrm_lash', 'wyrm_swallow', 'wyrm_surge', 'wyrm_deluge'],
  admiral_vane: ['cutlass_flurry', 'chain_shot', 'vane_rally', 'broadside'],
  drowned_queen: ['brine_lash', 'high_tide', 'lament_of_the_deep', 'the_reach_drowns'],
};
const BOSSES = new Set(['weir_wyrm', 'admiral_vane', 'drowned_queen']);
const def = (id: string) => content.mobs[id] ?? content.bosses[id];
const cells = (units: Record<number, string>): string[] => Array.from({ length: content.CELL_COUNT }, (_, i) => units[i] ?? '');
const PARTY = cells({ 0: 'warrior', 1: 'defender', 6: 'mage', 8: 'archer' });
/** Sık dizilim (iki sıra dolu): alan skill'leri gerçekçi sayıda hedef bulur. */
const DENSE = cells({ 0: 'warrior', 1: 'defender', 3: 'mage', 4: 'archer' });

function teamsFor(id: string, party = PARTY): Teams {
  const boss = BOSSES.has(id);
  const enemies: Record<number, string> = { 1: id };
  if (id === 'admiral_vane') Object.assign(enemies, { 3: 'harpoon_ballista' });
  enemies[4] = 'drowned'; // eşlikçi: Wall of Brine (guard) başka bir dost ister; taunt / dost buff'ı anlam kazanır
  return { party, enemies: cells(enemies), units: { enemies: { 1: { tier: boss ? 'boss' : 'elite', displayName: def(id)!.name } } } };
}
const leader = (b: Battle, id: string) => b.combatants.find((c) => c.defId === id)!;

describe('Harita 2 önderleri: veri', () => {
  it('her önder kendi kitini taşır; Map 1 kiti ödünç alınmaz; mob ise Omen / Dark Bond yok', () => {
    for (const [id, kit] of Object.entries(KITS)) {
      const d = def(id);
      expect(d, id).toBeDefined();
      expect(d!.skills, id).toEqual(kit);
      for (const s of kit) {
        const sk = content.skills[s];
        expect(sk, `${id} -> ${s}`).toBeDefined();
        // KENDİ sanatı: ödünç yok (artOf yok); ikon ve efekt aşağıdaki testte denetlenir
        expect(sk!.artOf, `${s} artOf (ödünç sanat yasak)`).toBeUndefined();
        expect(sk!.effects.some((e) => e.type === 'omen' || e.type === 'detonate' || (e.type as string) === 'darkBond'), `${s}: kahraman mekaniği`).toBe(false);
      }
    }
  });

  it('her önder skill ikonu ve efekti KENDİ sanatı: ödünç efekte düşemez (Ömer 2026-10-27, Harita 2 de ödünç sanat yok)', () => {
    for (const [id, kit] of Object.entries(KITS)) {
      for (const s of kit) {
        const spec = MOB_VFX_SPECS[s];
        expect(spec, `${s} efekt satırı`).toBeDefined();
        expect(spec!.mob, `${s} sheet sahibi`).toBe(id);
        const sheet = vfxSheetFile(mobSheetId(id, s));
        expect(sheet, `${s} efekt sheet'i`).toBeTruthy();
        expect(sheet!.meta.frames, s).toBe(8);
        expect(existsSync(`assets/source/mob-vfx/${id}-${s}.png`), `${s} aslı`).toBe(true);
        expect(MOB_IMAGE_FILES[s], `${s} boyalı ikon`).toBeDefined();
        const pick = selectSkillVfx(content.skills[s]!);
        expect(pick.version, s).toBe('v2');
        expect(pick.v2, s).toBeDefined();
      }
    }
  });

  it('Pit Champion Gorr ve Inquisitor-Captain Vell kendi çizimini kullanır (ödünç Bandit Chief / Oathsworn yok)', () => {
    for (const id of ['pit_champion_gorr', 'inquisitor_captain_vell']) {
      expect(content.mobs[id]!.spriteId, id).toBe(id);
      for (const f of [`assets/sprites/${id}/idle.png`, `assets/avatars/${id}.png`, `assets/sprites/${id}/poses.png`, `assets/source/mobs/${id}.png`, `assets/source/mob-poses/${id}.png`]) expect(existsSync(f), f).toBe(true);
      expect(MOB_POSES[id], `${id} poz kaydı`).toBeDefined();
    }
  });

  it('karşılaşmalar yeni önderleri kullanır; doğrulama temiz', () => {
    expect(validateEncounters()).toEqual([]);
    const used = new Set(Object.values(ENCOUNTERS).flatMap((e) => e.units.map((u) => u.class)));
    for (const id of Object.keys(KITS)) expect(used.has(id), id).toBe(true);
  });

  it('Boarding Hook skill metni çekme kuralını söyler', () => {
    const hook = content.skills.boarding_hook!;
    expect(hook.effects.find((e) => e.type === 'pull')).toMatchObject({ type: 'pull', to: 'frontRow' });
  });
});

describe('M-N2 zorla hareket (Boarding Hook)', () => {
  const setup = (party = PARTY) => {
    const b = new Battle(rangeOff(content.battleSetup(content.DEFAULT_BATTLE, 7, 'test', teamsFor('reaver_chief_hook', party), false)));
    b.debug.dodge = 'never';
    return b;
  };

  it('arka sıradaki kahraman kendi şeridinin ön hücresine çekilir', () => {
    const b = setup();
    const h = leader(b, 'reaver_chief_hook');
    const mage = b.combatants.find((c) => c.defId === 'mage')!; // yuva 6 (sıra 2, şerit 0); ön hücre 0 = Warrior: dolu
    const archer = b.combatants.find((c) => c.defId === 'archer')!; // yuva 8 (şerit 2); ön hücre 2 boş
    expect(b.frontRowPullSlot(mage)).toBeNull();
    expect(b.frontRowPullSlot(archer)).toBe(2);
    const n = b.log.length;
    expect(b.useSkill(h.uid, 'boarding_hook', archer.uid).ok).toBe(true);
    expect(b.log.slice(n).find((e) => e.type === 'moved')).toMatchObject({ actor: archer.uid, from: 8, to: 2, cause: 'boarding_hook', by: h.uid });
    expect(archer.slot).toBe(2);
  });

  it('ön hücre doluysa çekme yok (aradaki hücre boş olsa bile öne kaymaz); hasar yine gelir', () => {
    const b = setup();
    const h = leader(b, 'reaver_chief_hook');
    const mage = b.combatants.find((c) => c.defId === 'mage')!; // 6; 3 boş, 0 dolu
    const hp = mage.hp;
    const n = b.log.length;
    expect(b.useSkill(h.uid, 'boarding_hook', mage.uid).ok).toBe(true);
    expect(b.log.slice(n).some((e) => e.type === 'moved')).toBe(false);
    expect(mage.slot).toBe(6);
    expect(mage.hp).toBeLessThan(hp);
  });

  it('zaten ön sıradaki, elit ve boss rütbeli birim çekilemez', () => {
    const b = setup();
    const warrior = b.combatants.find((c) => c.defId === 'warrior')!;
    expect(b.frontRowPullSlot(warrior)).toBeNull();
    const h = leader(b, 'reaver_chief_hook');
    h.slot = 7; // elit, arka sırada bile çekilmez
    expect(b.frontRowPullSlot(h)).toBeNull();
    const archer = b.combatants.find((c) => c.defId === 'archer')!;
    archer.tier = 'elite';
    expect(b.frontRowPullSlot(archer)).toBeNull();
    expect(b.pullSlotFor(archer, 'frontRow')).toBeNull();
  });

  it('YZ çekilebilecek arka sıra hedefine Boarding Hook kullanır', () => {
    // Warrior + Defender ön sırada, Archer şerit 2 arkada (ön hücre boş): çekme değeri var
    const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, 11, 'turns', teamsFor('reaver_chief_hook'), false));
    const h = leader(b, 'reaver_chief_hook');
    let hooked = false;
    for (let n = 0; n < 400 && !b.winner && !hooked; n++) {
      const uid = b.currentActor?.uid;
      if (!uid) break;
      const c = chooseAction(b, uid, content.aiConfig);
      if (uid === h.uid && c?.skillId === 'boarding_hook') hooked = true;
      if (!b.applyChoice(uid, c).ok) break;
    }
    expect(hooked).toBe(true);
  });
});

describe('Harita 2 önderleri: her skill kullanılabilir', () => {
  for (const [id, kit] of Object.entries(KITS)) {
    it(`${id}: kitteki her skill savaşta çalışır`, () => {
      for (const s of kit) {
        const b = new Battle(rangeOff(content.battleSetup(content.DEFAULT_BATTLE, 5, 'test', teamsFor(id), false)));
        b.debug.dodge = 'never';
        const u = leader(b, id);
        u.phase = 3; // minPhase skill'leri (Deluge, Rally, Broadside, The Reach Drowns)
        expect(b.canUse(u.uid, s), `${id} ${s}`).toEqual({ ok: true });
        const t = b.validTargets(u.uid, s)[0];
        const n = b.log.length;
        const r = b.useSkill(u.uid, s, t?.uid, t?.slot);
        expect(r.ok, `${id} ${s}: ${JSON.stringify(r)}`).toBe(true);
        const ev = b.log.slice(n) as BattleEvent[];
        expect(ev.some((e) => (e.type === 'skillUsed' && e.skill === s) || e.type === 'telegraph'), `${id} ${s}`).toBe(true);
      }
    });
  }

  it('skill ile bırakılan Flooded hasar vermez; Tide suyu gibi Soaked verir (Call the Tide; ayrı Soaked etkisi yok)', () => {
    const b = new Battle(rangeOff(content.battleSetup(content.DEFAULT_BATTLE, 5, 'test', teamsFor('salt_hag_mother'), false)));
    b.debug.dodge = 'never';
    const u = leader(b, 'salt_hag_mother');
    const t = b.validTargets(u.uid, 'call_the_tide')[0]!;
    expect(b.useSkill(u.uid, 'call_the_tide', t.uid, t.slot).ok).toBe(true);
    const water = b.ground.filter((g) => g.ground === 'flooded' && g.board === 'party');
    expect(water.length).toBeGreaterThan(0);
    expect(water.every((g) => g.noDamage)).toBe(true);
    expect(content.skills.call_the_tide!.effects.some((e) => e.type === 'status' && (e.status as string) === 'soaked')).toBe(false);
    expect(b.combatants.some((c) => c.side === 'party' && c.statuses.some((s) => (s.kind as string) === 'soaked'))).toBe(true);
  });

  it('YZ ile oynanan savaşlarda önderler kitlerinden birden fazla skill kullanır (belirleyici)', () => {
    for (const id of Object.keys(KITS)) {
      const used = new Set<string>();
      for (const seed of [21, 22]) {
        const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, seed, 'turns', teamsFor(id, DENSE), false));
        const u = leader(b, id);
        u.maxHp = u.hp = 5000; // kit kullanımı ölçülür, savaşın sonucu değil: önder erken düşmesin
        for (let n = 0; n < 500 && !b.winner; n++) {
          const uid = b.currentActor?.uid;
          if (!uid || !b.applyChoice(uid, chooseAction(b, uid, content.aiConfig)).ok) break;
        }
        for (const e of b.log) if (e.type === 'skillUsed' && e.actor === u.uid) used.add(e.skill);
      }
      expect(used.size, `${id}: ${[...used].join(',')}`).toBeGreaterThan(1);
    }
  });
});
