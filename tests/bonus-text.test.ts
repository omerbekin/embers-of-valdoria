// Bonus yazım kuralı (Ömer 2026-10-27): toplamsal "+12%", ayrı çarpan "×1.2" / "×0.8". Yalnızca gösterim; bu test biçimi kilitler.
import { describe, expect, it } from 'vitest';
import { ADDITIVE_LABEL, MULT_PASSIVES, addPctText, isMultText, lessText, moreText, multText } from '../src/engine/bonus-text';
import { ADDITIVE, AFFIX_ADD } from '../src/engine/stats';
import { content } from '../src/engine';
import { describePassive } from '../src/engine/skill-info';
import { ITEMS, partBonusForm, validateItems } from '../src/progression/items';
import { fillValues } from '../src/progression/item-text';
import { OATHS, oathEffectLines } from '../src/campaign/oath';
import { WAYSHRINES } from '../src/campaign/data';
import { buildMechanics, type WikiBlock } from '../src/wiki/catalog';

const blockText = (b: WikiBlock): string[] => {
  const x = b as { kind: string; text?: string; items?: string[]; head?: string[]; rows?: string[][] };
  return [x.text ?? '', ...(x.items ?? []), ...(x.head ?? []), ...(x.rows ?? []).flat()].filter(Boolean);
};

describe('bonus yazımı: biçim', () => {
  it('ayrı çarpan "×", toplamsal "+%"', () => {
    expect(multText(1.2)).toBe('×1.2');
    expect(multText(1.875)).toBe('×1.875');
    expect(multText(0.85)).toBe('×0.85');
    expect(moreText(0.25)).toBe('×1.25');
    expect(lessText(0.3)).toBe('×0.7');
    expect(addPctText(0.12)).toBe('+12%');
    expect(addPctText(-0.08)).toBe('-8%');
    expect(isMultText('×1.2 damage')).toBe(true);
    expect(isMultText('+12% damage')).toBe(false);
  });

  it('toplamsal havuz listesi stats.ts ile birebir', () => {
    expect(new Set([...ADDITIVE, ...AFFIX_ADD])).toEqual(new Set(Object.keys(ADDITIVE_LABEL)));
  });
});

describe('bonus yazımı: veri', () => {
  it('item affix şablonları kurala uyar ({0} toplamsal, {m0} artış çarpanı, {l0} azalış çarpanı)', () => {
    expect(validateItems()).toEqual([]);
    for (const a of Object.values(ITEMS.affixDefs)) {
      (a.parts ?? []).forEach((part, i) => {
        if (part.fixed) return;
        const form = partBonusForm(part.to);
        const tag = form === 'more' ? 'm' : form === 'less' ? 'l' : '';
        if (new RegExp(`\\{[ml]?${i}(:\\d+)?\\}`).test(a.text)) expect(a.text, `${a.name} part ${i}`).toMatch(new RegExp(`\\{${tag}${i}(:\\d+)?\\}`));
      });
    }
  });

  it('item yazısı: element hasarı "×1.05 Fire damage", direnç "×0.9 Fire damage taken"', () => {
    expect(fillValues('{m0} Fire damage', [5])).toBe('×1.05 Fire damage');
    expect(fillValues('{l0} Fire damage taken', [10])).toBe('×0.9 Fire damage taken');
    expect(fillValues('{m0} damage, up to {m0:3}', [2])).toBe('×1.02 damage, up to ×1.06');
    expect(fillValues('+{0}% damage', [12])).toBe('+12% damage');
  });

  it('durum yazıları *Mult değerini "×" ile yazar', () => {
    const KEYS = ['speedMult', 'damageTakenMult', 'healTakenMult', 'armorMult', 'damageDealtMult', 'healDealtMult'] as const;
    for (const [id, s] of Object.entries(content.statuses)) {
      if (id === 'weakened') continue; // gücü kaynağa bağlı, yazıda sayı yok
      for (const k of KEYS) {
        const v = s[k];
        if (typeof v === 'number') expect(s.text, `${id}.${k}`).toContain(multText(v));
      }
    }
  });

  it('Wayshrine nimetleri: *Mult "×", *Add "+%"', () => {
    for (const w of Object.values(WAYSHRINES)) {
      for (const [k, v] of Object.entries(w.mods ?? {})) {
        if (typeof v !== 'number') continue;
        expect(w.effect, `${w.name} ${k}`).toContain(k.endsWith('Mult') ? multText(v) : addPctText(v));
      }
    }
  });

  it('Hero Oath satırları: hasar / kritik "+%", can ve iyileşme "×"', () => {
    expect(oathEffectLines({ damageAdd: 0.12 })).toEqual(['+12% damage dealt']);
    expect(oathEffectLines({ hpMult: 1.15 })).toEqual(['×1.15 max health']);
    expect(oathEffectLines({ restHealMult: 0.5 })).toEqual(['×0.5 camp and inn rest healing']);
    for (const o of OATHS) for (const line of [...oathEffectLines(o.plus), ...oathEffectLines(o.minus)]) {
      if (/damage dealt|critical chance/.test(line)) expect(line, o.name).toMatch(/^[+-]\d/);
      else expect(isMultText(line), `${o.name}: ${line}`).toBe(true);
    }
  });

  it('ayrı çarpan pasifleri "×" yazar', () => {
    const units = [...Object.values(content.classes), ...Object.values(content.mobs), ...Object.values(content.bosses)];
    const types = new Set<string>(MULT_PASSIVES);
    let n = 0;
    for (const u of units) {
      if (!u.passive || !types.has(u.passive.effect.type)) continue;
      n++;
      expect(isMultText(describePassive(u.passive, u.stats, content.formulas)), `${u.passive.name}`).toBe(true);
    }
    expect(n).toBeGreaterThan(0);
  });
});

describe('Codex: How bonuses combine', () => {
  it('makale var, kuralı ve örnek hesabı (×1.25, ×1.875) yazar, listeler veriden dolu', () => {
    const a = buildMechanics().find((x) => x.id === 'bonus-rules');
    expect(a).toBeDefined();
    const text = a!.blocks.flatMap(blockText).join('\n');
    expect(a!.title).toBe('How bonuses combine');
    expect(text).toContain('+12%');
    expect(text).toContain('×1.25');
    expect(text).toContain('×1.875');
    expect(text).toContain(ADDITIVE_LABEL.damageAdd);
    expect(text).toContain('Fire damage');
    expect(text).toContain('Slow');
    expect(text).toContain('Blessing of Stone');
    expect(text).not.toMatch(/undefined|NaN|: \./);
  });
});
