import { describe, expect, it } from 'vitest';
import { Battle, chooseAction, content, explainChoice } from '../src/engine';
import type { AiConfig } from '../src/engine';
import { DEFAULT_VALUE, ValueContext } from '../src/engine/ai-value';

/**
 * YZ çağrı değeri (2026-10-21, open-questions 377): çağrının KENDİ değeri (Verdant Blessing şifası kalktıktan sonra Treant neredeyse hiç çağrılmıyordu).
 * Değer = ömrü boyunca yapacakları (ufukla kısılmaz; üstüne çektiği hasarla erken ölürse daha az) + gövdesinin üstüne çektiği hasar (ön sıranın önüne
 * konup düşmanın erişimini keserse engelleme) ; yuva, boş yuvalar arasında değeri en yüksek olandır.
 */
const ai: AiConfig = { ...content.aiConfig, global: undefined };
const cells = (map: Record<number, string>) => Array.from({ length: 12 }, (_, i) => map[i] ?? '');
function mk(party: Record<number, string>, enemies: Record<number, string>, mode: 'turns' | 'test' = 'turns'): Battle {
  const b = new Battle(content.battleSetup('random-battle', 1, mode, { party: cells(party), enemies: cells(enemies) }, false));
  b.debugClearCooldowns();
  for (const c of b.combatants) {
    c.hp = c.maxHp;
    c.mp = c.maxMp;
  }
  // Düşman Warrior'ın Charge'ı (menzil 4) cooldown'da: yalnızca yakın dövüş (menzil 1) saldırısı kalır; Rage 0 (Headsman yok)
  const w = b.combatants.find((c) => c.side === 'enemy' && c.defId === 'warrior');
  if (w) w.cooldowns.charge = 3;
  return b;
}
const ctxOf = (b: Battle, uid: string) => new ValueContext(b, b.get(uid)!, { ...DEFAULT_VALUE, ...content.aiConfig.value }, () => 'lowest_hp');
const TREANT = { hp: 105, hpRegen: 3, spd: 10 };

describe('ValueContext.summonOutlook: çağrının ömür görünümü', () => {
  // Oyuncunun ön sırası (0) boş, Druid ve Warrior 1. sırada; düşmanda yakın dövüşçü Warrior (menzil 1) ve Mage (menzil 6)
  const board = () => mk({ 3: 'druid', 4: 'warrior' }, { 0: 'warrior', 1: 'mage' });

  it('ön sıranın önüne konan çağrı yakın dövüşçünün erişimini keser (engelleme): o düşmanın vuruşları çağrıya', () => {
    const b = board();
    const look = ctxOf(b, 'party-0').summonOutlook(TREANT, 0, 3);
    expect(look.blockedFoes).toContain('enemy-0');
    expect(look.blockedFoes).not.toContain('enemy-1'); // Mage yine dostlara ulaşır: eşit pay
    expect(look.absorbedBlocked).toBeGreaterThan(0);
    expect(look.absorbedShared).toBeGreaterThan(0);
  });

  it('dostların arkasına konan çağrı yakın dövüşçüyü engellemez; uzak düşmandan eşit pay alır', () => {
    const b = board();
    const back = ctxOf(b, 'party-0').summonOutlook(TREANT, 9, 3);
    expect(back.blockedFoes).toEqual([]);
    expect(back.absorbedBlocked).toBe(0);
    const front = ctxOf(b, 'party-0').summonOutlook(TREANT, 0, 3);
    expect(back.absorbedShared + back.absorbedBlocked).toBeLessThan(front.absorbedShared + front.absorbedBlocked);
  });

  it('tehdit yoksa ömrünün tamamını oynar (ufukla kısılmaz); can sınırı üstüne çekilen hasarı keser ve erken ölüm oynayacağı turu azaltır', () => {
    const b = board();
    const ctx = ctxOf(b, 'party-0');
    expect(ctx.summonOutlook(TREANT, 9, 3).ownTurns).toBe(3);
    const frail = ctx.summonOutlook({ hp: 5, hpRegen: 0, spd: 10 }, 0, 3);
    expect(frail.absorbedBlocked + frail.absorbedShared).toBeCloseTo(5, 5);
    expect(frail.ownTurns).toBeLessThan(3);
  });
});

describe('YZ çağrı kararı: Treant ve Raise Dead', () => {
  it('Treant değeri ömür boyu: yavaş Treant (hız 10) hızlı Druid\'in ufkuyla kısılmaz; çağırır ve gövdeyi önde (engelleyen yuvaya) koyar', () => {
    const b = mk({ 3: 'druid', 4: 'warrior' }, { 0: 'warrior', 1: 'mage' });
    expect(b.currentActor?.uid).toBe('party-0'); // turns modu: ilk sıra Druid'de (hızlı)
    const ex = explainChoice(b, 'party-0', ai)!;
    const cand = ex.candidates.find((c) => c.skill === 'summon_treant')!;
    expect(cand.terms!.summon).toBeGreaterThan(0);
    expect(Math.floor(cand.summonSlot! / content.formulas.formation.lanes)).toBe(0); // ön sıra: yakın dövüşçüyü engeller, tüm düşmanlara ulaşır
    const choice = chooseAction(b, 'party-0', ai);
    if (choice?.skillId === 'summon_treant') expect(choice.slot).toBe(cand.summonSlot);
  });

  it('Treant yaşıyorsa yeniden çağrılmaz (çağrı sınırı)', () => {
    const b = mk({ 3: 'druid', 4: 'warrior' }, { 0: 'warrior', 1: 'mage' }, 'test');
    expect(b.useSkill('party-0', 'summon_treant').ok).toBe(true);
    b.debugClearCooldowns();
    b.get('party-0')!.mp = b.get('party-0')!.maxMp;
    expect(chooseAction(b, 'party-0', ai)?.skillId).not.toBe('summon_treant');
  });

  it('Undead: beslenmemiş (cesetsiz) iskeletin değeri beslenmişinkinden düşük kalır (gövde ve saldırı canla sınırlı)', () => {
    const b = mk({ 0: 'undead', 1: 'warrior' }, { 0: 'warrior', 1: 'mage', 2: 'archer' }, 'test');
    const unfed = explainChoice(b, 'party-0', ai)!.candidates.find((c) => c.skill === 'raise_dead');
    b.debugKill('enemy-2', false); // tüketilebilir düşman cesedi -> beslenmiş çağrı
    const fed = explainChoice(b, 'party-0', ai)!.candidates.find((c) => c.skill === 'raise_dead');
    expect(unfed && fed).toBeTruthy();
    expect(fed!.summonValue!).toBeGreaterThan(unfed!.summonValue!);
  });
});
