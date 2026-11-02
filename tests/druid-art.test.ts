import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import audio from '../data/audio.json';
import druidAudio from '../data/audio-v2/druid.json';
import { content } from '../src/engine';
import { VFX_V2 } from '../src/game/art-v2/vfx-index';
import { getVersion, ownerOfSkill } from '../src/game/asset-versions';
import { resolveSfx } from '../src/game/audio';
import { selectSkillVfx, skillSfxAllowed, v2VfxKey } from '../src/game/vfx-select';

// Druid ve Treant efektleri (Ömer 2026-11-02: su ve şifa; kendi sheet'leri + sesleri). Her skill: hangi sheet'ler, hangi yeni sesler.
const SKILLS: Record<string, { sheets: string[]; sfx: string[] }> = {
  rejuvenate: { sheets: ['01-healing-rain', '02-healing-pool'], sfx: ['healRainDrops', 'healChime'] },
  natures_wrath: { sheets: ['03-wrath-surge'], sfx: ['rootSnap', 'waterSurge'] },
  thorn_whip: { sheets: ['04-thorn-whip'], sfx: ['thornWhoosh', 'thornSnap'] },
  summon_treant: { sheets: ['05-treant-rise'], sfx: ['soilHeave', 'rootRise'] },
  root_smash: { sheets: ['06-root-fist'], sfx: ['rootFistFall', 'rootFistSlam'] },
  vine_snare: { sheets: ['07-vine-snare', '08-root-lash'], sfx: ['rootCoilCreak', 'rootCinch'] },
};
const ROOT = join(__dirname, '..');

describe('Druid ve Treant efektleri kendi sheet ve sesleriyle çalar', () => {
  it('6 skill Druid sahibine ait; v2 seçiliyken kendi efekti çözülür', () => {
    expect(getVersion('druid')).toBe('v2');
    for (const id of Object.keys(SKILLS)) {
      const s = content.skills[id]!;
      expect(ownerOfSkill(id), id).toBe('druid');
      const pick = selectSkillVfx(s);
      expect(pick.version, id).toBe('v2');
      expect(pick.v2, id).toBeTypeOf('function');
      expect(VFX_V2.druid![v2VfxKey(s)], id).toBeDefined();
    }
  });

  it('Treant kaybolma olay efekti druid/vfx.ts içinde kayıtlı; ölme efekti ertelendi (7/10), bağlı değil', () => {
    expect(VFX_V2.druid!['summonvanish_treant']).toBeTypeOf('function');
    expect(VFX_V2.druid!['summondeath_treant']).toBeUndefined();
  });

  it('yeni sesler skill listesinde, v2 dosyasından çözülür ve data/audio.json ile aynı tarif', () => {
    for (const [id, want] of Object.entries(SKILLS)) {
      const s = content.skills[id]!;
      for (const name of want.sfx) {
        expect(s.sfx, `${id} sfx listesi ${name}`).toContain(name);
        expect(skillSfxAllowed(s, name)).toBe(true);
        const def = (druidAudio.sfx as Record<string, unknown>)[name];
        expect(def, `${name} data/audio-v2/druid.json`).toBeDefined();
        expect(resolveSfx(name, 'druid'), name).toBe(def);
        expect((audio.sfx as Record<string, unknown>)[name], name).toEqual(def);
      }
    }
  });

  it('sesler kısa, kırpılmaz ve kısık değil: toplam süre <= 2 sn, kazanç makul, her katman geçerli', () => {
    const sfx = druidAudio.sfx as unknown as Record<string, { gain: number; layers: Array<{ type: string; attack?: number; decay?: number; at?: number; gain: number }> }>;
    for (const name of new Set(Object.values(SKILLS).flatMap((v) => v.sfx))) {
      const d = sfx[name]!;
      const end = Math.max(...d.layers.map((l) => (l.at ?? 0) + (l.attack ?? 0) + (l.decay ?? 0)));
      expect(end, `${name} süre`).toBeLessThanOrEqual(2);
      expect(end, `${name} çok kısa`).toBeGreaterThanOrEqual(0.15);
      // aynı anda sesli katmanların kazanç toplamı (üst sınır tahmini): kısık ya da kırpılan ses yok
      let peak = 0;
      for (let s = 0; s < end; s += 0.01) peak = Math.max(peak, d.layers.filter((l) => (l.at ?? 0) <= s && s < (l.at ?? 0) + (l.attack ?? 0) + (l.decay ?? 0)).reduce((n, l) => n + l.gain, 0) * d.gain);
      expect(peak, `${name} kısık`).toBeGreaterThan(0.5);
      expect(peak, `${name} kırpılır`).toBeLessThan(4);
      for (const l of d.layers) {
        expect(l.gain).toBeGreaterThan(0);
        expect(l.decay ?? 0).toBeGreaterThan(0);
      }
    }
    // şifa çanı saf sinüs tıngırtısı değil (medieval kuralı): üçgen taban + uyumsuz kısmi
    const chime = sfx['healChime']!.layers.filter((l) => l.type === 'tone') as unknown as Array<{ wave: string; f0: number }>;
    expect(chime.some((l) => l.wave !== 'sine')).toBe(true);
    const low = Math.min(...chime.map((l) => l.f0));
    expect(chime.some((l) => Math.abs(l.f0 / low - Math.round(l.f0 / low)) > 0.1)).toBe(true);
  });

  it("kendi sheet'leri diskte ve efekt dosyasında anılır; zemin havuzu groundArea'da", () => {
    const src = readFileSync(join(ROOT, 'src/game/art-v2/druid/vfx.ts'), 'utf8');
    const ground = readFileSync(join(ROOT, 'src/game/vfx.ts'), 'utf8');
    for (const { sheets } of Object.values(SKILLS)) {
      for (const name of sheets) {
        for (const ext of ['png', 'webp', 'json']) expect(existsSync(join(ROOT, 'assets/vfx/druid', `${name}.${ext}`)), `${name}.${ext}`).toBe(true);
        expect(src.includes(`druid/${name}`) || ground.includes(`druid/${name}`), name).toBe(true);
      }
    }
  });
});
