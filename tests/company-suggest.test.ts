import { describe, expect, it } from 'vitest';
import { CONFIG, companySuggestionFor, getMap, newCampaign, debugTeleport, nextStep, suggestCompanion, type CompanySuggestCfg } from '../src/campaign';
import { classes } from '../src/engine/content';

const cfg = CONFIG.companySuggest;
const POOL = CONFIG.companyPool;
const ASH = { mapId: 'valdoria', nodeId: '4', soloStart: true };
const VAL = { mapId: 'valdoria', nodeId: '7', soloStart: true };
const sug = (team: string[], at = ASH, pool = POOL.filter((c) => !team.includes(c))) => suggestCompanion(team, pool, at, cfg);

describe('yoldaş önerisi (suggest.ts)', () => {
  it('öncelik: ön saf > arka saf > takımı besleyen', () => {
    expect(sug(['archer'])?.role).toBe('front'); // hepsi eksik, ön saf önce
    expect(sug(['warrior'])?.role).toBe('back'); // ön saf var, arka saf eksik
    expect(sug(['warrior', 'archer'])?.role).toBe('feed');
    expect(sug(['warrior', 'archer'])?.heroes).toEqual(['druid', 'paladin', 'antimage']); // besleyenlerin hepsi, veri sırasında
    expect(sug(['mage'])?.heroes).toEqual(['warrior', 'defender', 'paladin']); // aynı rolde birden çok aday: hepsi
    expect(sug(['druid'])?.heroes).toEqual(['warrior', 'defender', 'paladin']); // Ömer'in örneği: Druid için tek ön saf Warrior değil
    expect(sug(['warrior'])?.heroes).toEqual(['archer', 'mage', 'hexer', 'vesper']); // yalnız ilk eksik rol
  });

  it('çok rollü kahraman iki rolü birden doldurur', () => {
    expect(cfg.roles['paladin']).toEqual(['front', 'feed']);
    expect(sug(['paladin'])?.role).toBe('back'); // ön saf + besleyen sayıldı
    expect(sug(['paladin', 'mage'])).toBeNull();
  });

  it('üç rol de doluysa öneri yok', () => {
    expect(sug(['warrior', 'archer', 'druid'])).toBeNull();
  });

  it('ilk eksik rolün adayı havuzda yoksa sıradaki eksik rol denenir', () => {
    const r = suggestCompanion(['archer'], ['druid', 'mage'], ASH, cfg);
    expect(r).toMatchObject({ heroes: ['druid'], role: 'feed' });
    expect(suggestCompanion(['archer'], ['cutthroat', 'gambler'], ASH, cfg)).toBeNull();
  });

  it("takımdaki sınıf asla önerilmez; King's Bridge ve eski kayıtta öneri yok", () => {
    expect(sug(['warrior'], ASH, ['warrior', 'archer'])?.heroes).toEqual(['archer']);
    expect(sug(['warrior'], { mapId: 'valdoria', nodeId: '9', soloStart: true })).toBeNull(); // King's Bridge
    expect(sug(['warrior'], { ...ASH, soloStart: false })).toBeNull(); // eski kayıt yapısı
    expect(sug(['warrior'], { mapId: 'drowned-reach', nodeId: '4', soloStart: true })).toBeNull();
    expect(sug(['warrior'], VAL)?.heroes).toContain('archer'); // Valdren Keep
  });

  it('veri değişirse mantık veriyi izler (rol eşlemesi koda gömülü değil)', () => {
    const c: CompanySuggestCfg = { ...cfg, roles: { ...cfg.roles, gambler: ['front'] }, nodes: { valdoria: ['4'] } };
    expect(suggestCompanion(['archer'], ['gambler', 'warrior'], ASH, c)?.heroes).toEqual(['gambler', 'warrior']);
    expect(suggestCompanion(['archer'], ['warrior'], VAL, c)).toBeNull();
  });

  it('durumdan öneri: Ashford yeni kayıt, adaylar veri sırasına dizilir; eski kayıtta yok', () => {
    const solo = debugTeleport(newCampaign({ mode: 'normal', seed: 7 }), '4', 'druid');
    expect(nextStep(solo).kind).toBe('company');
    const pool = [...POOL].reverse().filter((c) => c !== 'druid'); // sunum sırası ters: veri sırası kazanır
    expect(companySuggestionFor(solo, pool)).toMatchObject({ heroes: ['warrior', 'defender', 'paladin'], role: 'front' });
    const old = { ...solo };
    delete (old as { soloStart?: true }).soloStart;
    expect(companySuggestionFor(old, pool)).toBeNull();
  });

  it('metinlerde ve veri adlarında "support" geçmez; satırlar sade İngilizce', () => {
    const blob = JSON.stringify(cfg);
    expect(blob.toLowerCase()).not.toContain('support');
    for (const r of cfg.order) expect(cfg.lines[r]).toMatch(/^Your company has no one .+\.$/);
    expect(cfg.label).toBe('Suggested');
  });

  it('rol eşlemesi sınıfların gerçek kitiyle uyumlu', () => {
    for (const id of POOL) {
      expect(cfg.roles[id], `${id} eşlemede`).toBeDefined();
      const d = classes[id]!;
      const r = cfg.roles[id]!;
      if (r.includes('front')) expect(d.frontPriority ?? 99, `${id} front`).toBeLessThanOrEqual(2);
      if (r.includes('back')) {
        expect(d.frontPriority ?? 0, `${id} back`).toBeGreaterThanOrEqual(6.5);
        expect(d.range ?? 0).toBeGreaterThanOrEqual(5);
      }
      if (r.includes('feed')) {
        const fx = d.skills.flatMap((s) => content(s));
        expect(fx.some((e) => ['heal', 'hot', 'shield'].includes(e)), `${id} feed`).toBe(true);
      }
    }
    expect(getMap('valdoria').nodes.find((n) => n.id === '4')?.newCompany?.leader).toBe('keep');
    expect(getMap('valdoria').nodes.find((n) => n.id === '7')?.barracksSwap).toBeDefined();
  });
});

import { skills } from '../src/engine/content';
function content(id: string): string[] {
  return (skills[id]?.effects ?? []).map((e: { type: string }) => e.type);
}

describe('birden çok öneri + dizilim / hasar türü satırı (Ömer 2026-11-07)', () => {
  it('eksik her rol için öneri döner: ilki heroes/role, kalanı also', () => {
    const r = sug(['mage']); // ön saf ve besleyen eksik
    expect(r?.role).toBe('front');
    expect(r?.also.map((a) => a.role)).toEqual(['feed']);
    expect(r?.also[0]?.heroes).toContain('druid');
    expect(sug(['warrior', 'archer', 'druid'])).toBeNull();
  });
  it('heroTraits: dizilim satırı ve hasar türü kahramanın kitinden', async () => {
    const { heroTraits } = await import('../src/campaign/suggest');
    expect(heroTraits('warrior')).toBe('Front row · Physical damage');
    expect(heroTraits('mage')).toBe('Back row · Magic damage');
    expect(heroTraits('archer')).toBe('Back row · Physical damage');
  });
});
