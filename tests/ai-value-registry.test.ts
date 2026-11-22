/**
 * Güvenlik ağı (denetim r39 madde 10.2): YZ değer kaydı. Kural (src/engine/CLAUDE.md): her skill, durum, zemin ve ağaç tetiği YZ değeriyle gelir.
 * Bu dosya veriden döner; değeri olmayan yeni içerik testi kırmızı yapar ve adını listeler. BİLİNEN AÇIKLAR listesi (neden yazılı) dışında sapma
 * kırmızı; düzelen madde de kırmızı (liste güncel kalsın). YZ ve motor bu işte değiştirilmedi.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { Battle, content, explainChoice, type AiConfig, type Combatant, type CombatantDef } from '../src/engine';
import { aiCoverageInternals as AC } from '../src/engine/ai';
import { DEFAULT_VALUE, ValueContext } from '../src/engine/ai-value';
import { TRIGGER_EVENTS } from '../src/engine/tree-hooks';

const COLLECT = !!process.env.AI_REGISTRY_COLLECT;
const ai: AiConfig = { ...content.aiConfig, global: undefined };
const unitDef = (id: string): CombatantDef => (content.bosses[id] ?? content.mobs[id] ?? content.summons[id] ?? content.classes[id])!;
const vcOf = () => ({ ...DEFAULT_VALUE, ...(content.aiConfig.value ?? {}) });
const ctxOf = (b: Battle, actor: Combatant) => new ValueContext(b, actor, vcOf(), (c) => content.aiConfig.profiles[c.ai ?? content.aiConfig.defaultProfile]?.focus ?? 'lowest_ratio');

/** Genel sahne (turns, menzil verideki gibi): dört kişilik iki takım, iki taraf da yaralı (şifa / kalkan / koruma skill'leri değer bulsun). */
function arena(partyUnits: [string, number][], enemyUnits: [string, number][]): Battle {
  const base = content.battleSetup('random-battle', 5, 'turns', { party: [], enemies: [] }, false);
  const b = new Battle({ ...base, party: partyUnits.map(([id]) => unitDef(id)), partySlots: partyUnits.map(([, s]) => s), enemies: enemyUnits.map(([id]) => unitDef(id)), enemySlots: enemyUnits.map(([, s]) => s) });
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    c.hp = Math.max(1, Math.floor(c.maxHp * 0.55));
    c.mp = c.maxMp;
    if (c.maxRage !== undefined) c.rage = c.maxRage;
    if (c.maxBlood !== undefined) c.blood = c.maxBlood;
  }
  return b;
}

const ENGINE = join(__dirname, '..', 'src', 'engine');
/** YZ kaynağı, yorumlar çıkarılmış (yorumdaki bir ad ya da `on: 'x'` değer sayılmasın). */
const AI_SRC = ['ai.ts', 'ai-value.ts', 'ai-range.ts']
  .map((f) =>
    readFileSync(join(ENGINE, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, ''),
  )
  .join('\n');

/* ------------------------------------------------------------------ durumlar ------------------------------------------------------------------ */

/**
 * Genel değer fonksiyonunun görmediği, YZ'nin AYRI bir terimle değerlendirdiği durumlar: durum -> o terimin YZ kaynağındaki adı (test, adın
 * kaynakta durduğunu da denetler; terim silinirse kırmızı).
 */
const SPECIAL_STATUS: Record<string, string> = {
  electrocuted: 'electroWorth', // Islak + şimşek: motorla aynı plan (Battle.electroPlan)
  banked_coals: 'coalBanked', // Banked Coals set kuralı (setRules.coalDelay)
  anchored: 'anchorShare', // Iron Mooring bağı: yardımcıyı kırmanın değeri (telegraph.anchorShare)
};

/**
 * Bir durumun YZ değeri var mı (ilk tutan yol döner):
 * worth: genel değer fonksiyonu (statusEffectWorth) sıfırdan farklı; dot: DoT (tik hasarı ayrı yoldan: dotTickDamage); doom: Omen yığını (lanet
 * terimi, def.doom); rooted: kök (telegraf kaçışı terimi, def.rooted); telegraph: bir skill telgrafının işareti (telgraf terimleri); ground: bir
 * zeminin verdiği durum (zemin değeri, groundUnitWorth); named: YZ kaynağında adıyla ('kind'); special: SPECIAL_STATUS.
 */
function statusValued(b: Battle, kind: string): string | null {
  // Her birim hem değerlendiren (bağlam) hem taşıyan olarak denenir: değer bazı durumlarda kitlere bağlı (Blessed: büyü saldıranı olmalı)
  for (const actor of b.combatants) {
    const ctx = ctxOf(b, actor);
    for (const u of b.combatants) if (AC.statusEffectWorth(ctx, u, kind, 2) !== 0) return 'worth';
  }
  const def = b.statusDef(kind)!;
  if (def.dot) return 'dot';
  if (def.doom && AI_SRC.includes('def.doom')) return 'doom';
  if (def.rooted && AI_SRC.includes('def.rooted')) return 'rooted';
  if (Object.values(content.skills).some((sk) => sk.telegraph?.status === kind) && AI_SRC.includes('telegraph')) return 'telegraph';
  if (Object.entries(content.grounds).some(([id, g]) => (g as { status?: string }).status === kind && groundValued(b, id))) return 'ground';
  if (AI_SRC.includes(`'${kind}'`)) return 'named';
  if (SPECIAL_STATUS[kind] && AI_SRC.includes(SPECIAL_STATUS[kind]!)) return 'special';
  return null;
}

/* ------------------------------------------------------------------- zeminler ------------------------------------------------------------------ */

function groundValued(b: Battle, id: string): boolean {
  const me = b.combatants.find((c) => c.side === 'party')!;
  const ctx = ctxOf(b, me);
  for (const u of b.combatants)
    for (const side of ['party', 'enemy'] as const) if (AC.groundUnitWorth(ctx, u, id, 10, 2, side) !== 0) return true;
  return AI_SRC.includes(`'${id}'`);
}

/* ------------------------------------------------------------------- tetikler ------------------------------------------------------------------ */

/** Ağaç verisinde kullanılan tetik olayları (yalnız trigger kancaları; TRIGGER_EVENTS listesinden). */
function usedTriggers(): Map<string, Set<string>> {
  const used = new Map<string, Set<string>>();
  const valid = new Set<string>(TRIGGER_EVENTS);
  const walk = (o: unknown, cls: string): void => {
    if (Array.isArray(o)) for (const x of o) walk(x, cls);
    else if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>;
      if (r.h === 'trigger' && typeof r.on === 'string' && valid.has(r.on)) (used.get(r.on) ?? used.set(r.on, new Set()).get(r.on)!).add(cls);
      for (const v of Object.values(r)) walk(v, cls);
    }
  };
  for (const cls of Object.keys(content.classes)) {
    const raw = (() => {
      try {
        return JSON.parse(readFileSync(join(__dirname, '..', 'data', 'skill-trees', `${cls}.json`), 'utf8')) as unknown;
      } catch {
        return null;
      }
    })();
    if (raw) walk(raw, cls);
  }
  return used;
}

/** YZ tetik olayını değerlendiriyor mu: kaynakta `on: '<olay>'` ile trigEventValue / aiTriggers'a veriliyor. */
const triggerDispatched = (ev: string): boolean => new RegExp(`on: '${ev}'`).test(AI_SRC);

/* -------------------------------------------------------------------- skill'ler ------------------------------------------------------------------ */

const CLASS_IDS = Object.keys(content.classes).filter((id) => !content.classes[id]!.testOnly);

/** Sınıfın her skill'i genel sahnede YZ adayı mı, puanında sıfırdan farklı (bedel / cooldown dışı) bir terim var mı. */
function skillValues(cls: string): Map<string, string | null> {
  const melee = content.isMeleeClass(cls);
  const b = arena(
    [[cls, melee ? 1 : 4], ['archer', melee ? 4 : 1], ['paladin', 3], ['mage', 7]],
    [['warrior', 1], ['archer', 0], ['mage', 4], ['druid', 5]],
  );
  const me = b.combatants.find((c) => c.side === 'party' && c.defId === cls)!;
  // Düşmüş bir dost (Resurrection gibi dead_ally skill'leri aday olsun)
  const fallen = b.combatants.find((c) => c.side === 'party' && c.defId === 'mage' && c !== me)!;
  fallen.hp = 0;
  b.currentUid = me.uid;
  const ex = explainChoice(b, me.uid, ai);
  const out = new Map<string, string | null>();
  for (const sid of me.skills) {
    const cands = ex?.candidates.filter((c) => c.skill === sid) ?? [];
    if (!cands.length) {
      out.set(sid, `aday değil (${ex?.rejected.find((r) => r.skill === sid)?.reason ?? 'neden yok'})`);
      continue;
    }
    const live = cands.some((c) => Object.entries(c.terms ?? {}).some(([k, v]) => v !== 0 && k !== 'cost' && k !== 'cooldown'));
    out.set(sid, live ? null : `terimleri sıfır (${JSON.stringify(cands[0]!.terms ?? {})})`);
  }
  return out;
}

/* ------------------------------------------------------------- bilinen açıklar ------------------------------------------------------------- */

const KNOWN_STATUS: Record<string, string> = {};
const KNOWN_GROUND: Record<string, string> = {};
/**
 * Ağaç tetikleri: YZ eylem değerinde bu olayı hiç trigEventValue / aiTriggers'a vermiyor (ai.ts'de `on: '<olay>'` yok; Battle.aiTriggers kancayı `h.on === ev.on` ile birebir eşler, başka olaya eşlemez). Tetik savaşta çalışır, ama YZ
 * bir eylemin onu tetikleyeceğini (ya da düşmanın tetiğini besleyeceğini) puana katmaz. Seçimden bağımsız olanlar (savaş başı, tur başı) için
 * değer gerekmeyebilir; listede ayrıca belirtildi.
 */
const NO_AI = 'YZ eylem değerinde yok';
const KNOWN_TRIGGER: Record<string, string> = {
  battleStart: 'seçimden bağımsız (savaş başında bir kez); YZ kaydı yok',
  turnStart: 'seçimden bağımsız (tur başı); YZ kaydı yok',
  allyHit: NO_AI, // Anti-Mage: dostu vurulunca
  arrive: NO_AI, // Druid / Undead: çağrı sahaya inince
  bust: NO_AI, // Gambler: zar patladı
  doom: NO_AI, // Hexer: Doom işledi
  enemyDied: NO_AI, // Paladin / Druid / Anti-Mage / Hexer: düşman öldü (kill'den ayrı: öldüren fark etmez)
  enemyHealed: NO_AI, // Undead: düşman iyileşti
  enemyMoved: NO_AI, // Archer: düşman yer değiştirdi
  groundEnd: NO_AI, // Paladin: zemin bitti
  hpBelow: NO_AI, // Warrior / Paladin / Mage / Undead / Druid / Defender: can eşik altına indi
  jackpot: NO_AI, // Gambler: büyük kazanç
  luckyEscape: NO_AI, // Gambler: Lucky Escape işledi
  mpBelow: NO_AI, // Mage: MP eşik altına indi
  passiveHeal: NO_AI, // Paladin: pasif şifa
  payHp: NO_AI, // Undead: can bedeli ödendi (Blood Hymn / Bitter Gift)
  repeat: NO_AI, // Gambler: tekrar vuruşu tuttu
  repeatFail: NO_AI, // Gambler: tekrar vuruşu tutmadı
  revived: NO_AI, // Paladin: dost dirildi
  statusGained: NO_AI, // Warrior / Defender: sahibine durum geldi (YZ yalnız statusApplied'ı sayar)
  summonDeath: NO_AI, // Druid / Undead: çağrı öldü
};
const KNOWN_SKILL: Record<string, string> = {};

/**
 * Mob / boss / çağrı skill'leri: genel sahnede ön koşulu tutmadığı için aday OLAMAYANLAR (değer eksikliği değil; YZ bu skill'i ön koşul tutunca
 * değerlendirir). Beklenen ret nedeni birebir denetlenir: başka bir nedenle (ör. değer yok) aday olmazsa kırmızı.
 */
const SITUATIONAL: Record<string, string> = {
  'bridge_warden|chain_hook': 'needs a standing Iron Mooring',
  'bridge_warden|ash_brand': 'not in this phase',
  'bridge_warden|fall_of_kings_bridge': 'not in this phase',
  'lord_morvane|pyre_of_morvane': 'not in this phase',
  'weir_wyrm|wyrm_deluge': 'not in this phase',
  'admiral_vane|vane_rally': 'not in this phase',
  'admiral_vane|broadside': 'not in this phase',
  'drowned_queen|the_reach_drowns': 'not in this phase',
  'hearthwarden|quench': 'needs a burning cell',
  'forge_master_golem|reforge': 'no other ally',
  'ashborn_hierarch|kindle_the_nave': 'the sermon must end first',
  'pyre_matriarch|spread_the_flame': 'needs a burning cell',
  'pyre_witch|spread_the_flame': 'needs a burning cell',
};

/** Mob / boss / çağrı (düşman tarafında, ön sırada; yanında Warrior) her skill'i: aday + sıfır olmayan terim, ya da beklenen ön koşul reddi. */
function npcSkillGaps(): string[] {
  const gaps: string[] = [];
  for (const id of [...Object.keys(content.bosses), ...Object.keys(content.mobs), ...Object.keys(content.summons)]) {
    const base = content.battleSetup('random-battle', 5, 'turns', { party: [], enemies: [] }, false);
    const b = new Battle({ ...base, party: ['warrior', 'archer', 'mage', 'paladin'].map(unitDef), partySlots: [1, 0, 4, 3], enemies: [unitDef(id), unitDef('warrior')], enemySlots: [1, 4] });
    b.debugClearCooldowns();
    for (const c of b.combatants) {
      c.hp = Math.max(1, Math.floor(c.maxHp * 0.55));
      c.mp = c.maxMp;
      if (c.maxRage !== undefined) c.rage = c.maxRage;
    }
    const me = b.combatants.find((c) => c.side === 'enemy' && c.defId === id)!;
    b.currentUid = me.uid;
    const ex = explainChoice(b, me.uid, ai);
    for (const sid of me.skills) {
      const key = `${id}|${sid}`;
      const cands = ex?.candidates.filter((c) => c.skill === sid) ?? [];
      if (!cands.length) {
        const why = ex?.rejected.find((r) => r.skill === sid)?.reason ?? 'neden yok';
        if (SITUATIONAL[key] !== why) gaps.push(`${key} aday değil: ${why}`);
        continue;
      }
      if (SITUATIONAL[key]) gaps.push(`${key}: ön koşul listesinde ama aday (listeden çıkar)`);
      if (!cands.some((c) => Object.entries(c.terms ?? {}).some(([k, v]) => v !== 0 && k !== 'cost' && k !== 'cooldown'))) gaps.push(`${key}: terimleri sıfır`);
    }
  }
  return gaps;
}

describe('YZ değer kaydı: her skill, durum, zemin ve ağaç tetiği', () => {
  let b: Battle;
  beforeAll(() => {
    b = arena([['warrior', 1], ['paladin', 0], ['mage', 4], ['hexer', 5]], [['warrior', 1], ['defender', 0], ['mage', 4], ['druid', 5]]);
  });

  it('her durumun YZ değeri var (genel değer, DoT tiki ya da adıyla özel terim)', () => {
    const missing: string[] = [];
    for (const kind of Object.keys(content.statuses)) if (!statusValued(b, kind)) missing.push(kind);
    if (COLLECT) console.log('STATUS', missing.join(' '));
    expect(missing.filter((k) => !KNOWN_STATUS[k])).toEqual([]);
    expect(Object.keys(KNOWN_STATUS).filter((k) => !missing.includes(k))).toEqual([]);
  });

  it('her zeminin YZ değeri var (groundUnitWorth ya da adıyla özel terim)', () => {
    const missing: string[] = [];
    for (const id of Object.keys(content.grounds)) if (!groundValued(b, id)) missing.push(id);
    if (COLLECT) console.log('GROUND', missing.join(' '));
    expect(missing.filter((k) => !KNOWN_GROUND[k])).toEqual([]);
    expect(Object.keys(KNOWN_GROUND).filter((k) => !missing.includes(k))).toEqual([]);
  });

  it('ağaç verisinde kullanılan her tetik olayını YZ değerlendiriyor', () => {
    const used = usedTriggers();
    expect(used.size).toBeGreaterThan(10);
    const missing = [...used.keys()].filter((ev) => !triggerDispatched(ev)).sort();
    if (COLLECT) for (const ev of missing) console.log('TRIGGER', ev, [...used.get(ev)!].join(','));
    expect(missing.filter((k) => !KNOWN_TRIGGER[k])).toEqual([]);
    expect(Object.keys(KNOWN_TRIGGER).filter((k) => !missing.includes(k))).toEqual([]);
  });

  it('her sınıf skill\'i genel sahnede YZ adayı ve puanı sıfır değil', () => {
    const missing: string[] = [];
    for (const cls of CLASS_IDS)
      for (const [sid, why] of skillValues(cls)) {
        if (!why) continue;
        missing.push(`${cls}|${sid}`);
        if (COLLECT) console.log('SKILL', `${cls}|${sid}`, why);
      }
    expect(missing.filter((k) => !KNOWN_SKILL[k])).toEqual([]);
    expect(Object.keys(KNOWN_SKILL).filter((k) => !missing.includes(k))).toEqual([]);
  });

  it("her mob / boss / çağrı skill'i YZ adayı ve puanı sıfır değil (ön koşullu olanlar beklenen nedenle reddedilir)", () => {
    expect(Object.keys(content.mobs).length).toBeGreaterThan(50);
    expect(npcSkillGaps()).toEqual([]);
  });
});
