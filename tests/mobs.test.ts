import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content } from '../src/engine';
import { battlePlan, chapterEnemyMods, CONFIG, debugTeleport, ENCOUNTERS, newCampaign, validateEncounters, withDifficulty } from '../src/campaign';

// Sefer mobları (data/mobs; N1, docs/design/campaign/fill-plan.md 2 ve 6): gizli birim kategorisi. Yükleyici, gizlilik, mob kuralları
// (1 temel saldırı + 1 imza skill'i, birkaçında 3.), ödünç sanat (artOf), geçici sprite ve sefer ölçeği (N4).

const dir = new URL('../data/mobs/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const mobs = Object.values(content.mobs);

describe('data/mobs yükleyicisi', () => {
  it('her data/mobs/*.json dosyası content.mobs içinde; anahtar = id = dosya adı', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const raw = JSON.parse(readFileSync(new URL(f, dir), 'utf8')) as { id: string };
      expect(raw.id, f).toBe(f.replace(/\.json$/, ''));
      expect(content.mobs[raw.id], f).toBeDefined();
    }
    expect(Object.keys(content.mobs).sort()).toEqual(files.map((f) => f.replace(/\.json$/, '')).sort());
  });

  it('gizli: class, çağrı ya da boss değil; takım seçimi, rastgele/hızlı savaş ve Endless havuzu (randomPool), sınıf sim dışında', () => {
    for (const m of mobs) {
      expect(content.classes[m.id], m.id).toBeUndefined();
      expect(content.summons[m.id], m.id).toBeUndefined();
      expect(content.bosses[m.id], m.id).toBeUndefined();
      expect(content.randomPool, m.id).not.toContain(m.id);
      expect(content.selectableClasses, m.id).not.toContain(m.id);
      expect(content.encounterUnit(m.id), m.id).toBe(m);
    }
    // rastgele takımlar hiçbir seed'de mob çekmez
    for (let seed = 1; seed <= 30; seed++) for (const id of content.randomTeam(seed, 8)) expect(content.mobs[id]).toBeUndefined();
  });

  it('mob kuralları: 2 skill (birkaçında 3); 1. skill bedelsiz ve bekleme süresiz temel saldırı, diğerleri bekleme süreli', () => {
    for (const m of mobs) {
      expect([2, 3], m.id).toContain(m.skills.length);
      const [basic, ...rest] = m.skills.map((id) => content.skills[id]!);
      expect(basic!.cost.amount, `${m.id} ${basic!.id}`).toBe(0);
      expect(basic!.cooldown ?? 0, `${m.id} ${basic!.id}`).toBe(0);
      expect(basic!.effects.some((e) => e.type === 'damage'), `${m.id} ${basic!.id}`).toBe(true);
      for (const s of rest) expect(s.cooldown ?? 0, `${m.id} ${s.id}`).toBeGreaterThan(0);
      expect(m.family, m.id).toBeTruthy();
    }
  });

  it('mob skill sanatı var olan bir skill\'den ödünç (artOf): ikon, efekt ve ses sahibininkiyle aynı', () => {
    const own = new Set(mobs.flatMap((m) => m.skills));
    const classSkills = new Set([...Object.values(content.classes), ...Object.values(content.summons), ...Object.values(content.bosses)].flatMap((d) => d.skills));
    for (const id of own) {
      if (classSkills.has(id)) continue; // var olan skill'i doğrudan kullanan mob
      const s = content.skills[id]!;
      const src = content.skills[s.artOf ?? '']!;
      expect(src, `${id} artOf ${s.artOf}`).toBeDefined();
      expect(s.icon, id).toBe(src.icon);
      expect(s.vfx, id).toBe(src.vfx);
      expect(s.sfx, id).toEqual(src.sfx);
    }
  });

  it('yalnızca var olan durum ve zeminler kullanılır', () => {
    for (const m of mobs)
      for (const id of m.skills)
        for (const e of content.skills[id]!.effects as { type: string; status?: string; ground?: string }[]) {
          if (e.status) expect(content.statuses[e.status], `${id} ${e.status}`).toBeDefined();
          if (e.ground) expect(content.grounds[e.ground], `${id} ${e.ground}`).toBeDefined();
        }
  });

  it('görsel: spriteId ya mobun kendi id\'si (gerçek çizim) ya da var olan bir class görseli (GEÇİCİ); dosyası diskte', () => {
    const classSprites = new Set(Object.values(content.classes).map((c) => c.spriteId));
    for (const m of mobs) {
      expect(m.spriteId === m.id || classSprites.has(m.spriteId), `${m.id} -> ${m.spriteId}`).toBe(true);
      expect(existsSync(new URL(`../assets/sprites/${m.spriteId}/idle.png`, import.meta.url)), `${m.id} sprite ${m.spriteId}`).toBe(true);
      expect(existsSync(new URL(`../assets/avatars/${m.spriteId}.png`, import.meta.url)), `${m.id} avatar ${m.spriteId}`).toBe(true);
    }
  });
});

describe('moblar savaşta ve seferde', () => {
  it('karşılaşma doğrulaması mobları kabul eder; mob kullanan karşılaşmalar var', () => {
    expect(validateEncounters()).toEqual([]);
    const used = new Set(Object.values(ENCOUNTERS).flatMap((e) => e.units.map((u) => u.class)).filter((c) => content.mobs[c]));
    expect(used.size).toBeGreaterThan(5);
  });

  it('mob takımıyla savaş kurulur ve YZ ile sonuna kadar oynanır (belirleyici)', () => {
    const cells = (u: Record<number, string>) => Array.from({ length: content.CELL_COUNT }, (_, i) => u[i] ?? '');
    const teams = {
      party: cells({ 0: 'warrior', 1: 'defender', 6: 'mage', 8: 'archer' }),
      enemies: cells({ 0: 'drowned', 1: 'shieldwarden', 2: 'moor_raider', 6: 'fen_witchling', 7: 'ember_acolyte', 8: 'will_o_wisp' }),
    };
    const run = () => {
      const b = new Battle(content.battleSetup('random-battle', 4242, 'turns', teams, false));
      for (let n = 0; n < 600 && !b.winner; n++) {
        const uid = b.currentActor?.uid;
        if (!uid || !b.applyChoice(uid, chooseAction(b, uid, content.aiConfig)).ok) break;
      }
      return b;
    };
    const a = run();
    expect(a.winner).toBeTruthy();
    expect(a.combatants.find((c) => c.uid === 'enemy-0')?.defId).toBe('drowned');
    expect(run().log.length).toBe(a.log.length);
  });

  it('N4: sefer ölçeği (enemyScale) ve zorluk çarpanları mob birimlerine class kopyalarıyla aynı yoldan uygulanır', () => {
    // Windy Moor (bölge II, normal savaş): enemyScale.all x karşılaşma mods; Hard: + difficulties.hard.enemy. Motor canı buna göre kurar.
    // Beklenen = battlePlan'in class kopyalarına uyguladığı zincirin aynısı: mods x enemyScale.all x bölüm ölçeği x zorluk
    const expected = (u: (typeof enc.units)[number], d: 'medium' | 'hard') =>
      withDifficulty(withDifficulty(withDifficulty(u.mods, CONFIG.enemyScale!.all), chapterEnemyMods('valdoria', 'moor')), CONFIG.difficulties[d]!.enemy)!;
    const at = (difficulty: 'medium' | 'hard') => {
      const plan = battlePlan(debugTeleport(newCampaign({ mode: 'normal', seed: 5, difficulty }), 'moor'));
      const battle = new Battle(content.battleSetup(content.DEFAULT_BATTLE, plan.seed, 'turns', { party: plan.party, enemies: plan.enemies, units: plan.units }, false));
      return { mods: plan.units.enemies, battle };
    };
    const enc = ENCOUNTERS.windy_moor!;
    const med = at('medium');
    const hard = at('hard');
    expect(enc.units.every((u) => content.mobs[u.class])).toBe(true);
    for (const u of enc.units) {
      const m = med.mods[u.slot]!.modifiers!;
      const h = hard.mods[u.slot]!.modifiers!;
      expect(m.hpMult).toBe(expected(u, 'medium').hpMult);
      expect(m.powerMult).toBe(expected(u, 'medium').powerMult);
      expect(h.hpMult).toBe(expected(u, 'hard').hpMult);
      expect(h.powerMult).toBe(expected(u, 'hard').powerMult);
      expect(m.hpMult!).toBeLessThan(u.mods!.hpMult!); // ölçek gerçekten uygulandı (all < 1)
      // motor: mob biriminin maks canı taban x çarpan
      const unit = med.battle.combatants.find((c) => c.side === 'enemy' && c.defId === u.class)!;
      expect(Math.abs(unit.maxHp - content.mobs[u.class]!.stats.hp * m.hpMult!)).toBeLessThanOrEqual(1);
    }
  });
});
