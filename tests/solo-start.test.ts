// Tek kişilik sefer başlangıcı (Ömer 2026-11-01, docs/design/tutorial.md > Yeni sefer başlangıcı): yeni seferin akışı ve eski kaydın bozulmadan eski yapıda sürmesi.
import { describe, expect, it } from 'vitest';
import {
  CONFIG,
  DROWNED_REACH,
  ENCOUNTERS,
  acknowledgeBriefing,
  activeHeroes,
  autoResolve,
  battlePlan,
  briefingText,
  companyChoices,
  completeSimple,
  continueToMap,
  debugFinishMap1,
  debugTeleport,
  farewell,
  formCompany,
  formationGate,
  formationTapGated,
  getMap,
  leaderOf,
  mapEnemyScale,
  mapFor,
  campaignWaveTeams,
  isPocket,
  moveTo,
  normalizeState,
  pathTo,
  newCampaign,
  nextStep,
  node,
  partyCap,
  pickHero,
  recruit,
  setMapOverride,
  soloEnemyScale,
  soloSkillOrder,
  soloSkillStage,
  type CampaignState,
} from '../src/campaign';
import { legacyBlank, legacyHero } from './legacy-start';
import { Battle } from '../src/engine/battle';
import * as content from '../src/engine/content';
import { fightPlan } from '../src/sim/campaign';
import { TUTORIAL, openingLine } from '../src/tutorial/lessons';

const STARTERS = ['warrior', 'defender', 'paladin', 'druid'];
const fresh = (hero = 'warrior', seed = 7): CampaignState => pickHero(newCampaign({ mode: 'normal', seed }), hero);
const roundTrip = (s: CampaignState): CampaignState => normalizeState(JSON.parse(JSON.stringify(s)))!;
/** Yol üstündeki adımları oyuncu yerine çözerek düğüme yürür; hedefin ilk adımında durur. */
function walk(s: CampaignState, target: string): CampaignState {
  let t = s;
  for (let i = 0; i < 200 && t.at !== target; i++) {
    const step = nextStep(t);
    if (step.kind === 'move') {
      const route = routeTo(t, target);
      t = moveTo(t, route);
    } else t = autoResolve(t, step);
  }
  expect(t.at).toBe(target);
  return t;
}
function routeTo(s: CampaignState, target: string): string {
  const step = nextStep(s);
  if (step.kind !== 'move') throw new Error('not at move');
  const route = pathTo(mapFor(s), target);
  return step.options.find((o) => route.includes(o)) ?? step.options[0]!;
}
const leaderUnit = (s: CampaignState) => {
  const plan = battlePlan(s);
  const slot = Object.keys(plan.party).find((k) => plan.party[Number(k)] === leaderOf(s)!.class)!;
  return { plan, setup: plan.units?.party?.[Number(slot)] ?? {} };
};

describe('yeni sefer: tek kişiyle başla, üç katılım', () => {
  it('başlangıç havuzu 4 sınıf; yeni sefer ve kahraman seçimi yeni yapıyı işaretler', () => {
    expect(CONFIG.starterPool).toEqual(STARTERS);
    expect(newCampaign({ mode: 'normal', seed: 1 }).soloStart).toBe(true);
    for (const c of STARTERS) {
      const s = fresh(c);
      expect(s.soloStart).toBe(true);
      expect(leaderOf(s)!.class).toBe(c);
      expect(s.roster[0]!.tutorial).toBeUndefined();
    }
    expect(() => fresh('archer')).toThrow();
  });

  it('takım boyu Ashford öncesi 1, sonra 2, Valdren sonrası 3, King\'s Bridge sonrası 4; veda ve tutorial takımı yok', () => {
    let s = fresh('warrior');
    const hero = s.roster[0]!;
    expect(partyCap(s)).toBe(1);
    expect(nextStep(s).kind).toBe('battle'); // Mill Road
    s = autoResolve(s);
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['2'] }); // Mill Road katılımı yok
    expect(s.roster).toHaveLength(1);
    s = moveTo(s, '2');
    expect(partyCap(s)).toBe(1);
    s = autoResolve(s);
    s = walk(s, '3');
    expect(partyCap(s)).toBe(1);
    s = walk(s, '4');
    const kinds: string[] = [];
    expect(nextStep(s)).toEqual({ kind: 'company', node: '4', size: 1 });
    const levelBefore = leaderOf(s)!.level;
    expect(() => formCompany(s, [])).toThrow();
    expect(() => formCompany(s, ['warrior'])).toThrow(); // kadrodaki sınıf yeniden seçilemez
    expect(companyChoices(s)).not.toContain('warrior');
    expect(companyChoices(s)).toHaveLength(CONFIG.companyPool.length - 1);
    s = formCompany(s, ['mage']);
    kinds.push(nextStep(s).kind);
    expect(kinds).toEqual(['briefing']);
    expect(s.roster.map((h) => h.class)).toEqual(['warrior', 'mage']);
    expect(leaderOf(s)!.id).toBe(hero.id); // lider aynı kahraman, level korunur
    expect(leaderOf(s)!.level).toBe(levelBefore);
    expect(partyCap(s)).toBe(2);
    expect(activeHeroes(s)).toHaveLength(2);
    expect(briefingText(s)).toContain('Warrior');
    expect(briefingText(s)).toContain('Mage');
    expect(briefingText(s)).not.toContain('{');
    s = acknowledgeBriefing(s);
    expect(nextStep(s).kind).toBe('story');
    expect(s.formationDue).toBe('4'); // Zorunlu Formation kapısı yola çıkışta
    s = walk(s, '7');
    while (nextStep(s).kind !== 'volunteer') s = autoResolve(s);
    const vol = nextStep(s) as { offer: string[] };
    expect(vol.offer).toHaveLength(3);
    for (const c of ['warrior', 'mage']) expect(vol.offer).not.toContain(c);
    s = recruit(s, vol.offer[0]!);
    expect(s.roster).toHaveLength(3);
    expect(partyCap(s)).toBe(3);
    s = walk(s, '9');
    expect(activeHeroes(s)).toHaveLength(3); // boss üç kişiyle
    expect(nextStep(s).kind).toBe('battle');
    s = autoResolve(s);
    const after = nextStep(s);
    expect(after.kind).toBe('recruit'); // zaferden sonra aynı üç kart
    const offer = (after as { offer: string[] }).offer;
    expect(offer).toHaveLength(3);
    for (const h of s.roster) expect(offer).not.toContain(h.class);
    s = recruit(s, offer[0]!);
    expect(s.roster).toHaveLength(4);
    expect(partyCap(s)).toBe(4);
    expect(s.roster.some((h) => h.tutorial)).toBe(false);
    expect(leaderOf(s)!.id).toBe(hero.id);
  });

  it('katılan katılım seviyesinde (takımla) gelir ve tüm skill\'leri açıktır', () => {
    let s = walk(fresh('druid'), '4');
    s = formCompany(s, ['archer']);
    const lead = leaderOf(s)!;
    const mate = s.roster.find((h) => !h.leader)!;
    expect(mate.level).toBeGreaterThanOrEqual(1);
    expect(mate.level).toBeLessThanOrEqual(lead.level);
    s = acknowledgeBriefing(s);
    s = walk(s, nextOf(s));
    if (nextStep(s).kind === 'battle') {
      const plan = battlePlan(s);
      for (const u of Object.values(plan.units?.party ?? {})) expect(u.lockSkills).toBeUndefined();
    }
  });

  it('Ashford kapısı: ileri düğümlerin hepsinde Formation zorunlu, kayıt turunda kaybolmaz', () => {
    let s = acknowledgeBriefing(formCompany(walk(fresh(), '4'), ['mage']));
    while (nextStep(s).kind !== 'move') s = autoResolve(s);
    const options = (nextStep(s) as { options: string[] }).options;
    expect(options.length).toBeGreaterThan(1);
    expect(formationGate(s)).toBe(true);
    for (const o of options) expect(formationTapGated(s, o), o).toBe(true);
    expect(formationTapGated(s, options[0]!, false)).toBe(false); // ders kapalı: kapı yok
    const back = roundTrip(s);
    expect(back.formationDue).toBe('4');
    expect(back.soloStart).toBe(true);
  });

  it('kayıt gidiş dönüşünde yeni sefer işareti kalır, geçersiz değer atılır', () => {
    const s = fresh('paladin');
    expect(roundTrip(s).soloStart).toBe(true);
    expect(normalizeState({ ...JSON.parse(JSON.stringify(s)), soloStart: 'yes' })!.soloStart).toBeUndefined();
  });

  it('Harita 2 dört kişilik varsayımı: Harita 1 sonunda kadro 4, kilit ve çarpan Harita 2\'ye taşmaz', () => {
    const s = fresh();
    expect(soloEnemyScale({ soloStart: true, mapId: CONFIG.maps[1]! }, '4')).toBeUndefined();
    expect(soloSkillStage({ ...s, mapId: CONFIG.maps[1]! }, leaderOf(s)!, '2')).toBeNull();
    // Ana yol oynanır: Harita 1'in sonunda kadro tam dört kişi, lider hâlâ ilk kahraman
    let t = s;
    for (let g = 0; g < 600 && t.mapId === CONFIG.maps[0] && nextStep(t).kind !== 'complete'; g++) {
      const st = nextStep(t);
      if (st.kind === 'move') {
        const open = st.options.filter((id) => !isPocket(mapFor(t), id));
        t = moveTo(t, open[0] ?? st.options[0]!);
      } else t = autoResolve(t, st);
    }
    expect(t.roster).toHaveLength(4);
    expect(activeHeroes(t)).toHaveLength(4);
    expect(leaderOf(t)!.id).toBe(s.roster[0]!.id);
    expect(mapFor({ mapId: CONFIG.maps[1]!, soloStart: true })).toBe(getMap(CONFIG.maps[1]!));
    expect(mapFor({ mapId: CONFIG.maps[1]! })).toBe(getMap(CONFIG.maps[1]!));
  });
});

function nextOf(s: CampaignState): string {
  let t = s;
  while (nextStep(t).kind !== 'move') t = autoResolve(t);
  return (nextStep(t) as { options: string[] }).options[0]!;
}

describe('skill açılışı', () => {
  it('her başlangıç sınıfında açılış sırası sınıfın tüm skill\'lerini bir kez içerir', () => {
    for (const c of STARTERS) expect([...soloSkillOrder(c)].sort(), c).toEqual([...content.classes[c]!.skills].sort());
    expect(soloSkillOrder('warrior')[0]).toBe(content.classes.warrior!.skills[0]);
  });

  it.each(STARTERS)('%s: Mill Road yalnız temel saldırı, Ravenwood 2 + dalgada 3, Watchtower hepsi', (c) => {
    const order = soloSkillOrder(c);
    let s = fresh(c);
    expect(leaderUnit(s).setup.lockSkills).toEqual(order.slice(1));
    expect(leaderUnit(s).setup.unlockOnWave).toBeUndefined();
    s = walk(s, '2');
    const r = leaderUnit(s).setup;
    expect(r.lockSkills).toEqual(order.slice(2));
    expect(r.unlockOnWave).toEqual({ wave: 1, skills: [order[2]] });
    expect(soloSkillStage(s, leaderOf(s)!, '2')!.fresh).toEqual([order[1]]);
    s = walk(s, '3');
    const w = leaderUnit(s).setup;
    expect(w.lockSkills).toBeUndefined();
    expect(soloSkillStage(s, leaderOf(s)!, '3')!.fresh).toEqual([order[3]]);
  });

  it('her açılışın Garrick cümlesi var; kilit yalnız lider ve yalnız ilk zafere kadar', () => {
    for (const c of STARTERS) for (const id of soloSkillOrder(c).slice(1)) expect(TUTORIAL.skillUnlocks[id], id).toBeTruthy();
    // savaşa beklemede başlayan skill 'hazır' demez, beklemeyi söyler (Ömer 2026-11-01)
    for (const c of STARTERS) {
      for (const id of soloSkillOrder(c).slice(1)) {
        const text = TUTORIAL.skillUnlocks[id]!;
        const waits = (content.skills[id]?.initialCooldown ?? 0) > 0;
        if (waits) expect(text, id).not.toContain('is ready');
        expect(text.includes('starts every battle on cooldown'), id).toBe(waits);
      }
    }
    const s = fresh();
    expect(soloSkillStage(s, { class: 'warrior' }, '1')).toBeNull(); // lider değil
    expect(soloSkillStage(autoResolve(s), leaderOf(s)!, '1')).toBeNull(); // kazanıldı: devriyede kilit yok
    expect(soloSkillStage(s, leaderOf(s)!, '4')).toBeNull();
  });

  it.each(['turns', 'test'] as const)('motor: dalga ortası açılış %s modunda (bir kez, olayla)', (mode) => {
    const s = walk(fresh('warrior'), '2');
    const plan = battlePlan(s);
    const b = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, mode, { party: plan.party, enemies: plan.enemies, units: plan.units, ...campaignWaveTeams(plan) }, false));
    const hero = b.living('party')[0]!;
    const third = soloSkillOrder('warrior')[2]!;
    expect(hero.lockedSkills).toContain(third);
    expect(b.log.some((e) => e.type === 'skillUnlocked')).toBe(false);
    const applied = driveUntilWave(b, 1);
    expect(applied, 'ikinci dalgaya ulaşmalı').toBe(true);
    const ev = b.log.filter((e) => e.type === 'skillUnlocked');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ actor: hero.uid, skills: [third] });
    expect(b.get(hero.uid)!.lockedSkills ?? []).not.toContain(third);
    expect(b.get(hero.uid)!.lockedSkills ?? []).toContain(soloSkillOrder('warrior')[3]);
  });
});

/** Düşmanları debug ile öldürerek dalgaya ulaşır (iki modda da aynı yol). */
function driveUntilWave(b: Battle, wave: number): boolean {
  const reached = (): boolean => b.log.some((e) => e.type === 'waveStart' && e.index === wave);
  for (let i = 0; i < 5 && !b.winner && !reached(); i++) for (const c of b.combatants.filter((x) => x.side === 'enemy' && x.hp > 0 && !x.inert)) b.debugKill(c.uid);
  return reached();
}

describe('zorluk (provizyon)', () => {
  it('Ravenwood ve Watchtower: mob sayısı neredeyse aynı, çarpan düşük; elit ve Taunt durur', () => {
    const count = (id: string): number => {
      const def = ENCOUNTERS[id]! as unknown as { units: unknown[]; waves?: { units: unknown[] }[] };
      return def.units.length + (def.waves ?? []).reduce((n, w) => n + w.units.length, 0);
    };
    expect(count('ravenwood_solo')).toBeGreaterThanOrEqual(count('ravenwood_pack'));
    expect(count('watchtower_solo')).toBe(count('watchtower_tutorial'));
    const chief = (ENCOUNTERS['watchtower_solo'] as unknown as { units: { class: string; lockSkills?: string[]; mods?: { powerMult?: number } }[] }).units.find((u) => u.class === 'bandit_chief')!;
    expect(chief).toBeTruthy();
    expect(chief.lockSkills ?? []).not.toContain('taunt');
    expect(chief.mods!.powerMult!).toBeLessThan(1);
    expect(node(mapFor(fresh()), '2').encounter).toBe('ravenwood_solo');
    expect(node(mapFor(fresh()), '3').encounter).toBe('watchtower_solo');
  });

  it('Mill Road kaybedilemez; Ravenwood ve Watchtower kaybedilebilir', () => {
    expect(ENCOUNTERS['mill_road_thugs']!.partyUndying).toBe(true);
    expect(ENCOUNTERS['ravenwood_solo']!.partyUndying).toBeFalsy();
    expect(ENCOUNTERS['watchtower_solo']!.partyUndying).toBeFalsy();
  });

  it('yeni sefer çarpanı yalnız yeni seferde, her düğüm gerçek', () => {
    const map = getMap(CONFIG.maps[0]!);
    const { nodes, groups } = CONFIG.soloStart.enemyScale;
    for (const [id, g] of Object.entries(nodes)) {
      expect(map.nodes.some((n) => n.id === id), id).toBe(true);
      expect(groups[g], id).toBeTruthy();
    }
    expect(Object.keys(nodes).length).toBeGreaterThanOrEqual(15);
    const s = fresh();
    expect(soloEnemyScale(s, '9')).toBeTruthy();
    const old = legacyHero();
    expect(soloEnemyScale(old, '9')).toBeUndefined();
  });

  it('akıl kontrolü: dört başlangıç kahramanı Ravenwood ve Watchtower\'ı alabilir (ölçüm değil, kırılma alarmı)', () => {
    for (const c of STARTERS) {
      for (const n of ['2', '3']) {
        let wins = 0;
        for (let seed = 1; seed <= 8; seed++) {
          const s = walk(fresh(c, seed * 11), n);
          if (fightPlan(battlePlan(s), 'medium').winner === 'party') wins++;
        }
        expect(wins, `${c} @ ${n}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('Harita 2 eğrisi (campaign.json > mapEnemyScale)', () => {
  it('her düğüm ve grup gerçek; bossta can şişirilmez; Harita 1 ve Harita 3 çarpan almaz', () => {
    const map = getMap(DROWNED_REACH);
    const { nodes, groups } = CONFIG.mapEnemyScale[DROWNED_REACH]!;
    for (const [id, g] of Object.entries(nodes)) {
      expect(map.nodes.some((n) => n.id === id), id).toBe(true);
      expect(groups[g], id).toBeTruthy();
    }
    for (const n of map.nodes.filter((x) => x.type === 'elite' || x.type === 'boss')) expect(nodes[n.id], n.id).toBeTruthy();
    expect(groups[nodes['dr82']!]!.hpMult!).toBeLessThanOrEqual(1); // Throne of Brine savaşları zaten uzun
    expect(mapEnemyScale('valdoria', '9')).toBeUndefined();
    expect(Object.keys(CONFIG.mapEnemyScale)).toEqual([DROWNED_REACH]);
  });

  it('eski ve yeni kayıt Harita 2 de aynı çarpanı alır; çarpan düşman kurulumuna gerçekten biner', () => {
    setMapOverride(DROWNED_REACH, true);
    try {
      const planAt = (s: CampaignState) => battlePlan(continueToMap(debugFinishMap1(s)));
      const fromNew = planAt(newCampaign({ mode: 'normal', seed: 5 }));
      const fromOld = planAt(legacyBlank({ mode: 'normal', seed: 5 }));
      expect(fromNew.nodeId).toBe('dr1');
      const mods = (p: typeof fromNew) => Object.values(p.units.enemies).map((u) => [u.modifiers?.hpMult, u.modifiers?.powerMult]);
      expect(mods(fromNew)).toEqual(mods(fromOld));
      // aynı savaş, çarpansız: fark yalnız mapEnemyScale
      const saved = CONFIG.mapEnemyScale[DROWNED_REACH]!;
      delete CONFIG.mapEnemyScale[DROWNED_REACH];
      const bare = planAt(newCampaign({ mode: 'normal', seed: 5 }));
      CONFIG.mapEnemyScale[DROWNED_REACH] = saved;
      const k = mapEnemyScale(DROWNED_REACH, 'dr1')!;
      expect(k.hpMult).not.toBe(1);
      const [a, b] = [mods(fromNew), mods(bare)];
      a.forEach((m, i) => {
        expect(m[0]).toBeCloseTo((b[i]![0] ?? 1) * k.hpMult!, 2);
        expect(m[1]).toBeCloseTo((b[i]![1] ?? 1) * k.powerMult!, 2);
      });
    } finally {
      setMapOverride(DROWNED_REACH, null);
    }
  });
});

describe('metin', () => {
  it('açılışta her başlangıç sınıfının kendi cümlesi; yer tutucu kalmaz', () => {
    const ctx = { node: '1', region: 'mill', encounter: 'mill_road_thugs', defeats: 0 };
    const lines = STARTERS.map((c) => openingLine(ctx as never, new Set(), c));
    expect(new Set(lines).size).toBe(4);
    for (const l of lines) {
      expect(l).toBeTruthy();
      expect(l).not.toContain('{');
      expect(l).not.toContain('  ');
    }
    expect(openingLine(ctx as never, new Set())).not.toContain('{');
  });
});

describe('eski kayıt bozulmaz', () => {
  it('eski kayıt eski haritayı görür: Mill Road katılımı, eski karşılaşmalar, veda, 3 kişilik bölük', () => {
    let s = legacyHero(7, 'archer');
    expect(leaderOf(s)!.class).toBe('archer'); // eski başlangıç sınıfı kayıtta durur
    expect(node(mapFor(s), '2').encounter).toBe('ravenwood_pack');
    expect(node(mapFor(s), '3').encounter).toBe('watchtower_tutorial');
    expect(soloSkillStage(s, leaderOf(s)!, '1')).toBeNull();
    s = autoResolve(s);
    const step = nextStep(s);
    expect(step.kind).toBe('recruit');
    s = recruit(s, (step as { offer: string[] }).offer[0]!);
    expect(s.roster).toHaveLength(2);
    expect(s.roster.every((h) => h.tutorial)).toBe(true);
    expect(s.formationDue).toBe('2');
    s = walk(s, '4');
    expect(nextStep(s)).toEqual({ kind: 'farewell', node: '4' });
    s = farewell(s);
    expect(s.roster).toHaveLength(0);
    expect(nextStep(s)).toEqual({ kind: 'company', node: '4', size: 3 });
    s = formCompany(s, ['druid', 'archer', 'mage'], 1);
    expect(leaderOf(s)!.class).toBe('archer');
    expect(partyCap(s)).toBe(3);
    expect(nextStep(s).kind).toBe('story'); // Garrick'in görevi yok
    s = completeSimple(s, 'story');
    s = completeSimple(s, 'town');
    s = walk(s, '7');
    while (nextStep(s).kind !== 'volunteer') s = autoResolve(s);
    s = recruit(s, (nextStep(s) as { offer: string[] }).offer[0]!);
    expect(partyCap(s)).toBe(4);
    s = walk(s, '9');
    s = autoResolve(s);
    expect(nextStep(s).kind).not.toBe('recruit'); // King's Bridge katılımı yok
    expect(s.roster).toHaveLength(4);
  });

  it('eski kayıt: kilit yok, çarpan yok, yeni alan eklenmez; kayıt gidiş dönüşünde eski kalır', () => {
    const s = walk(legacyHero(), '2');
    const plan = battlePlan(s);
    for (const u of Object.values(plan.units?.party ?? {})) {
      expect(u.lockSkills).toBeUndefined();
      expect(u.unlockOnWave).toBeUndefined();
    }
    const back = roundTrip(s);
    expect(back.soloStart).toBeUndefined();
    expect(back.roster[0]!.tutorial).toBe(true);
    expect(node(mapFor(back), '2').encounter).toBe('ravenwood_pack');
  });

  it('kahraman seçilmemiş eski kayıt seçimde yeni yapıya geçer', () => {
    const blank = newCampaign({ mode: 'normal', seed: 3 });
    delete blank.soloStart;
    const s = pickHero(blank, 'druid');
    expect(s.soloStart).toBe(true);
    expect(s.roster[0]!.tutorial).toBeUndefined();
  });

  it('debug kısayolu: bir duraka yeni yapıda atlar, seçilen kahramanla', () => {
    const s = debugTeleport(newCampaign({ mode: 'normal', seed: 4 }), '4', 'paladin');
    expect(s.soloStart).toBe(true);
    expect(leaderOf(s)!.class).toBe('paladin');
    expect(nextStep(s).kind).toBe('company');
  });
});
