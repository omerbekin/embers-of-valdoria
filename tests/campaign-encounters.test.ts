import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ENCOUNTERS,
  ENGINE_CAPS,
  battlePlan,
  battleSeed,
  debugTeleport,
  enemyPreview,
  getMap,
  newCampaign,
  outcomeFrom,
  pickHero,
  resolveEncounter,
  validateEncounters,
} from '../src/campaign';
import { Battle, battleSummary, content } from '../src/engine';

const map = getMap('valdoria');

describe('sefer karşılaşmaları', () => {
  it('veri geçerli: sınıflar oynanabilir (Geometer yok), yuvalar 0-11 tekrarsız, yedekler geçerli', () => {
    expect(validateEncounters()).toEqual([]);
  });

  it('her savaşlı düğüm var olan, yedek olmayan bir karşılaşmaya işaret eder', () => {
    for (const n of map.nodes.filter((x) => x.encounter)) {
      const e = ENCOUNTERS[n.encounter!];
      expect(e, n.id).toBeTruthy();
      expect(e!.fallbackOnly, n.id).toBeFalsy();
    }
  });

  it('motor güçlendirmeyi destekliyor: asıl takımlar oynanır; destek yoksa yedekler (Mill Road 1v1, Kings Bridge eskortlu)', () => {
    expect(ENGINE_CAPS).toEqual({ unitMods: true, startHp: true });
    const off = { unitMods: false, startHp: false };
    expect(resolveEncounter('mill_road_thugs').id).toBe('mill_road_thugs');
    expect(resolveEncounter('mill_road_thugs', off).id).toBe('mill_road_thug_solo');
    expect(resolveEncounter('bridge_warden').def.units.map((u) => u.class)).toEqual(['bridge_warden', 'iron_mooring', 'iron_mooring']);
    expect(resolveEncounter('bridge_warden', off).def.units).toHaveLength(4);
    expect(resolveEncounter('bog_ambush').fallback).toBe(false);
    expect(enemyPreview('watchtower_chief')).toMatchObject({ classes: ['warrior', 'archer', 'archer'], leader: 'Bandit Chief' });
    // görünen adlar: id değil, boss adı ve birleşik tekrar
    expect(enemyPreview('bridge_warden').names).toEqual(['The Bridge Warden', '2× Iron Mooring']);
  });

  it('elit/boss güçlendirmesi, özel ad ve rütbe motora gider; tutorial düşmanları zayıf', () => {
    const at = (node: string) => {
      const s = debugTeleport(newCampaign({ mode: 'normal', seed: 4 }), node);
      const plan = battlePlan(s);
      const battle = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units }, false));
      return { plan, battle };
    };
    const w = at('3');
    const chief = battleSummary(w.battle).units.find((u) => u.side === 'enemy' && u.classId === 'bandit_chief')!;
    expect(chief.tier).toBe('elite');
    const m = at('1');
    const thug = battleSummary(m.battle).units.find((u) => u.side === 'enemy' && u.classId === 'road_thug')!;
    expect(thug.maxHp).toBeLessThan(content.mobs.road_thug!.stats.hp);
    // Watchtower şefi (tutorial kopyası, 2026-10-14 zayıflatıldı) yine de sıradan tutorial düşmanından sağlam
    expect(chief.maxHp).toBeGreaterThan(thug.maxHp);
    // Arka plan önceliği: karşılaşma > düğüm > bölge; King's Bridge kendi arka planını kullanır, dosyası diskte var
    expect(at('9').plan.background).toBe('kings-bridge');
    expect(existsSync(join(__dirname, '..', 'assets', 'backgrounds', 'kings-bridge.webp'))).toBe(true);
    expect(at('3').plan.background).toBe(map.regions.find((r) => r.id === map.nodes.find((n) => n.id === '3')!.region)?.battleBackground);
    const b = at('9');
    const warden = b.battle.combatants.find((c) => c.side === 'enemy')!;
    expect(warden.tier).toBe('boss');
    expect(warden.actionsPerTurn).toBe(2);
  });

  it('can taşıma: eksik canlı karakter savaşa o oranla girer', () => {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 6 }), '3');
    s = { ...s, roster: s.roster.map((h, i) => (i === 0 ? { ...h, hpRatio: 0.4 } : h)) };
    const plan = battlePlan(s);
    const battle = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units }, false));
    const i = plan.heroOrder.indexOf(s.roster[0]!.id);
    const c = battle.get(`party-${i}`)!;
    // kahraman düşmandan hızlıysa ilk turunu oynamış olabilir: turn başı yenilenme (str x hpRegenPerStr) eklenebilir
    const regen = Math.round(c.stats.hpRegen ?? 0);
    expect([Math.round(c.maxHp * 0.4), Math.round(c.maxHp * 0.4) + regen]).toContain(c.hp);
    // can taşıması kapalı: kurulumda yalnızca ekipman (başlangıç silahı) kalır
    for (const u of Object.values(battlePlan(s, 0, { unitMods: true, startHp: false }).units.party)) expect(Object.keys(u)).toEqual(['modifiers']);
  });

  it('savaş planı mevcut savaş girişiyle kurulur; sonuç hero id ile geri okunur; seed belirleyici', () => {
    const s = pickHero(newCampaign({ mode: 'normal', seed: 5 }), 'warrior');
    const plan = battlePlan(s);
    expect(plan.party.filter(Boolean)).toEqual(['warrior']);
    expect(plan.seed).toBe(battleSeed(5, 'valdoria', '1', 0));
    expect(battlePlan(s, 1).seed).not.toBe(plan.seed);
    expect(battlePlan(s).seed).toBe(plan.seed);
    const battle = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies }, false));
    const party = battle.combatants.filter((c) => c.side === 'party');
    expect(party).toHaveLength(1);
    party[0]!.hp = Math.round(party[0]!.maxHp / 2);
    const out = outcomeFrom(plan, true, battleSummary(battle).units);
    expect(out.units).toEqual([{ heroId: s.roster[0]!.id, hpRatio: party[0]!.hp / party[0]!.maxHp, alive: true }]);
  });

  it('4 kişilik takım planı: hero sırası yuva sırasıdır (party-i = i. dolu hücre)', () => {
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 8 }), '8A');
    const plan = battlePlan(s);
    expect(plan.heroOrder).toHaveLength(4);
    const battle = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies }, false));
    plan.heroOrder.forEach((id, i) => {
      const hero = s.roster.find((h) => h.id === id)!;
      expect(battle.get(`party-${i}`)!.defId).toBe(hero.class);
    });
    expect(plan.enemies.filter(Boolean)).toHaveLength(ENCOUNTERS[plan.encounterId]!.units.length);
  });
});

describe('Bölge I mobları (mob-plan.md 9.5-9.6): class kopyası yok; Mill Road kilitli, Ravenwood ve şef geç açılır', () => {
  it("Mill Road: düşmanlar yalnızca temel saldırı (temel dışı skill'ler kilitli); Ravenwood: kilit yok, hepsi +1 başlangıç cooldown'u; Watchtower: elit şef +1, eşlikçiler kilitsiz; motora gider", () => {
    const plays = (enc: string) => ENCOUNTERS[enc]!.units;
    for (const enc of ['mill_road_thugs', 'ravenwood_pack', 'watchtower_tutorial']) for (const u of plays(enc)) expect(content.mobs[u.class], `${enc} ${u.class}`).toBeDefined();
    expect(plays('mill_road_thugs').map((u) => u.class)).toEqual(['road_thug', 'cutpurse']);
    expect(plays('ravenwood_pack').map((u) => [u.class, u.slot])).toEqual([['grey_wolf', 0], ['grey_wolf', 1], ['grey_wolf', 2], ['ravenwood_poacher', 7], ['raven_seer', 8]]);
    expect(plays('watchtower_tutorial').map((u) => [u.class, u.slot, u.tier])).toEqual([['bandit_chief', 1, 'elite'], ['ravenwood_poacher', 6, undefined], ['ember_acolyte', 8, undefined]]);
    for (const u of plays('mill_road_thugs')) expect(u.lockSkills, u.class).toEqual(content.mobs[u.class]!.skills.slice(1));
    for (const u of plays('ravenwood_pack')) expect([u.lockSkills, u.initialCooldownBonus], u.class).toEqual([undefined, 1]);
    for (const u of plays('watchtower_tutorial')) expect([u.lockSkills, u.initialCooldownBonus], u.class).toEqual([undefined, u.tier ? 1 : undefined]);
    const battleAt = (node: string) => {
      const plan = battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 4 }), node));
      return new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units }, false));
    };
    for (const c of battleAt('1').combatants.filter((x) => x.side === 'enemy')) expect(c.lockedSkills, c.defId).toEqual(content.mobs[c.defId]!.skills.slice(1));
    for (const node of ['2', '3']) for (const c of battleAt(node).combatants.filter((x) => x.side === 'enemy')) {
      expect(c.lockedSkills, `${node} ${c.defId}`).toBeUndefined();
      if (node === '2' || c.tier) for (const id of c.skills.slice(1)) expect(c.cooldowns[id], `${node} ${c.defId} ${id}`).toBeGreaterThanOrEqual(1);
    }
  });
});
