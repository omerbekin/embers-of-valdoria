import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import audio from '../data/audio.json';
import vesperAudio from '../data/audio-v2/vesper.json';
import { content } from '../src/engine';
import { VFX as paladinVfx } from '../src/game/art-v2/paladin/vfx';
import { VFX_V2 } from '../src/game/art-v2/vfx-index';
import { getVersion, inScope, ownerOfSkill, versionKeys } from '../src/game/asset-versions';
import { resolveSfx } from '../src/game/audio';
import { selectSkillVfx, skillSfxAllowed } from '../src/game/vfx-select';

const SKILLS = ['toll', 'thunderpeal', 'cracked_bell', 'great_bell_of_valdoria'] as const;
const OWN_SHEETS = ['01-toll-ring', '02-thunder-bell', '03-thunder-bolt', '04-cracked-bell', '05-great-bell', '06-great-bell-burst'];
// önceki ödünç kayıtlar (Paladin + Mage ortak sesleri, 2026-10-28 yer tutucu)
const BORROWED_SFX = ['lightSwell', 'hammerSlam', 'bigBoom', 'earthCrack', 'hammerWhoosh', 'choirAh'];
const ROOT = join(__dirname, '..');

describe('Vesper kendi efekti ve sesiyle oynar (Ömer 2026-11-01: ödünç kalmasın)', () => {
  it('4 skill Paladin efektini istemez; v2 seçiliyken kendi efekti çözülür', () => {
    expect(getVersion('vesper')).toBe('v2');
    for (const id of SKILLS) {
      const s = content.skills[id]!;
      expect(ownerOfSkill(id), id).toBe('vesper');
      // skills.json > vfx v1 yedek adıdır (content testi her skill için zorunlu tutar); v2 seçiliyken kendi id anahtarı önce çözülür
      expect(s.vfx, `${id} v1 yedek vfx adı`).toBeTruthy();
      const pick = selectSkillVfx(s);
      expect(pick.version, id).toBe('v2');
      expect(pick.v2, id).toBe(VFX_V2.vesper![id]);
      for (const borrowed of Object.values(paladinVfx)) expect(pick.v2, id).not.toBe(borrowed);
    }
  });

  it('4 skill kendi seslerini çalar, ödünç ses yok; her ses v2 dosyasından çözülür ve skill başına ayrı', () => {
    const seen = new Set<string>();
    for (const id of SKILLS) {
      const s = content.skills[id]!;
      expect(s.sfx?.length, id).toBeGreaterThan(0);
      for (const name of s.sfx!) {
        expect(BORROWED_SFX, `${id} -> ${name}`).not.toContain(name);
        expect(seen.has(name), `${name} başka skill'de de var`).toBe(false);
        seen.add(name);
        expect(skillSfxAllowed(s, name)).toBe(true);
        const def = (vesperAudio.sfx as Record<string, unknown>)[name];
        expect(def, `${name} data/audio-v2/vesper.json`).toBeDefined();
        expect(resolveSfx(name, 'vesper'), name).toBe(def);
        // skills.json > sfx testi için aynı tarif data/audio.json'da da durur
        expect((audio.sfx as Record<string, unknown>)[name], name).toEqual(def);
      }
    }
  });

  it('çan sesleri saf sinüs tıngırtısı değil: uyumsuz kısmiler + vuruş gürültüsü, Great Bell en derin ve en uzun', () => {
    const sfx = vesperAudio.sfx as unknown as Record<string, { layers: Array<{ type: string; wave?: string; f0?: number; decay?: number }> }>;
    const tones = (id: string) => sfx[id]!.layers.filter((l) => l.type === 'tone');
    for (const id of ['tollStrike', 'thunderPeal', 'greatBellToll']) {
      expect(sfx[id]!.layers.some((l) => l.type === 'noise'), `${id} vuruş gürültüsü`).toBe(true);
      expect(tones(id).some((l) => l.wave !== 'sine'), `${id} yalnız sinüs olmamalı`).toBe(true);
      const freqs = tones(id).map((l) => l.f0!);
      const low = Math.min(...freqs);
      expect(freqs.some((f) => Math.abs(f / low - Math.round(f / low)) > 0.1), `${id} uyumsuz kısmi`).toBe(true);
    }
    const hum = (id: string) => Math.min(...tones(id).map((l) => l.f0!));
    const tail = (id: string) => Math.max(...tones(id).map((l) => l.decay!));
    expect(hum('greatBellToll')).toBeLessThan(hum('thunderPeal'));
    expect(hum('thunderPeal')).toBeLessThan(hum('tollStrike'));
    expect(tail('greatBellToll')).toBeGreaterThan(tail('thunderPeal'));
    expect(tail('thunderPeal')).toBeGreaterThan(tail('tollStrike'));
  });

  it('kendi sheet\'leri diskte ve efekt dosyasında; sürüm seçicide efekt + ses, ikon hâlâ ödünç', () => {
    const src = readFileSync(join(ROOT, 'src/game/art-v2/vesper/vfx.ts'), 'utf8');
    for (const name of OWN_SHEETS) {
      for (const ext of ['png', 'webp', 'json']) expect(existsSync(join(ROOT, 'assets/vfx/vesper', `${name}.${ext}`)), `${name}.${ext}`).toBe(true);
      expect(src.includes(`'vesper/${name}'`), name).toBe(true);
    }
    expect(versionKeys()).toContain('vesper');
    expect(inScope('vesper', 'vfx')).toBe(true);
    expect(inScope('vesper', 'sfx')).toBe(true);
    expect(inScope('vesper', 'icon')).toBe(false);
  });
});
