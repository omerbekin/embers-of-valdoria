import { describe, expect, it } from 'vitest';
import worldData from '../data/audio-world.json';
import tracksData from '../data/audio-music-tracks.json';
import { sfxDuration } from '../src/gallery/catalog';
import { MUSIC, MUSIC_CROSSFADE_MS, MUSIC_TRACK_IDS, barSec, chordScale, composeCycle, cycleSec, noteMidi, parseBar, parseChord, trackConfig, type MusicTrackId } from '../src/game/music';
import { itemSoundKind, WORLD_AUDIO, WORLD_SFX, WORLD_SOUND_KINDS, worldGain, worldSound } from '../src/ui/ui-sound';

const pc = (m: number) => ((m % 12) + 12) % 12;

describe('Dünya / anlatı sesleri (data/audio-world.json)', () => {
  it('her sesin adı, açıklaması, kaydırıcısı (bus) ve katmanları var; süre 0,04-3 sn', () => {
    expect(WORLD_SOUND_KINDS.length).toBeGreaterThanOrEqual(20);
    for (const k of WORLD_SOUND_KINDS) {
      const d = WORLD_SFX[k];
      expect(d.label.length, k).toBeGreaterThan(0);
      expect(d.desc.length, k).toBeGreaterThan(20);
      expect(['ui', 'sfx'], k).toContain(d.bus);
      expect(d.gain, k).toBeGreaterThan(0);
      expect(d.gain, k).toBeLessThanOrEqual(1);
      const dur = sfxDuration(d);
      expect(dur, `${k} ${dur}`).toBeGreaterThanOrEqual(0.04);
      expect(dur, `${k} ${dur}`).toBeLessThanOrEqual(3);
      for (const l of d.layers) {
        expect(['tone', 'noise', 'pluck', 'voice'], k).toContain(l.type);
        if (l.type === 'tone' || l.type === 'noise') {
          expect(l.attack, k).toBeGreaterThan(0);
          expect(l.decay, k).toBeGreaterThan(0);
          expect(l.gain, k).toBeLessThanOrEqual(1);
        }
      }
    }
    expect(WORLD_AUDIO.master).toBeGreaterThan(0);
    expect(WORLD_AUDIO.master).toBeLessThanOrEqual(0.8);
  });

  it('çan yok: sinüs/üçgen tonlar yalnızca alçak gövde (<= 600 Hz, <= 0,7 sn); testere yalnızca alçak geçirenli boru (<= 1500 Hz)', () => {
    for (const k of WORLD_SOUND_KINDS)
      for (const l of WORLD_SFX[k].layers) {
        if (l.type !== 'tone') continue;
        if (l.wave === 'sine' || l.wave === 'triangle') {
          expect(Math.max(l.f0, l.f1), `${k} tonu çok tiz`).toBeLessThanOrEqual(600);
          expect(l.attack + l.decay, `${k} tonu çınlıyor`).toBeLessThanOrEqual(0.7);
          expect(l.tremHz ?? 0, `${k} titreşimli sinüs`).toBe(0);
        } else {
          expect(l.wave, k).toBe('sawtooth');
          expect(l.filter?.type, `${k} filtresiz testere`).toBe('lowpass');
          expect(l.filter!.f, k).toBeLessThanOrEqual(1500);
        }
      }
  });

  it('sahne sesleri istenen olaylar için var; dünyadaki sesler Sound Effects, sayfa/item sesleri UI sounds kaydırıcısında', () => {
    for (const k of ['map_unroll', 'map_roll', 'book_open', 'book_close', 'quill', 'seal', 'coin_count', 'door', 'hearth', 'ember_ignite', 'loot_reveal', 'item_cloth', 'item_leather', 'item_metal', 'item_wood', 'item_jewel'] as const)
      expect(WORLD_SFX[k].bus, k).toBe('ui');
    for (const k of ['march_step', 'wagon_creak', 'battle_horn', 'boss_horn', 'victory', 'defeat'] as const) expect(WORLD_SFX[k].bus, k).toBe('sfx');
    expect(Object.keys(worldData.sfx).sort()).toEqual([...WORLD_SOUND_KINDS].sort());
  });

  it('item malzemesi: silah ailesi / yuva -> ses', () => {
    expect(itemSoundKind({ slot: 'weapon', family: 'axes' })).toBe('item_metal');
    expect(itemSoundKind({ slot: 'weapon', family: 'daggers' })).toBe('item_metal');
    expect(itemSoundKind({ slot: 'offhand', family: 'maces' })).toBe('item_metal');
    expect(itemSoundKind({ slot: 'weapon', family: 'bows' })).toBe('item_wood');
    expect(itemSoundKind({ slot: 'weapon', family: 'staves' })).toBe('item_wood');
    expect(itemSoundKind({ slot: 'weapon', family: 'charms' })).toBe('item_cloth');
    expect(itemSoundKind({ slot: 'helm' })).toBe('item_metal');
    expect(itemSoundKind({ slot: 'armor' })).toBe('item_leather');
    expect(itemSoundKind({ slot: 'boots' })).toBe('item_leather');
    expect(itemSoundKind({ slot: 'trinket' })).toBe('item_jewel');
    expect(itemSoundKind(undefined)).toBe('item_leather');
  });

  it('kazanç: UI sesleri UI seviyesiyle, dünya sesleri Sound Effects ile; ikisi de Master ile çarpılır; 0 = sessiz', () => {
    expect(worldGain('ui', 0, 1, 1)).toBe(0);
    expect(worldGain('sfx', 20, 1, 0)).toBe(0);
    expect(worldGain('ui', 20, 0, 1)).toBe(0);
    expect(worldGain('ui', 10, 1, 0)).toBeCloseTo(WORLD_AUDIO.master * 0.5);
    expect(worldGain('sfx', 0, 0.5, 1)).toBeCloseTo(WORLD_AUDIO.master * 0.5);
    expect(worldGain('sfx', 0, 1, 1, 0.5)).toBeCloseTo(WORLD_AUDIO.master * 0.5);
  });

  it('yürüyüş temposu verisi geçerli; kullanıcı hareketinden önce (ve Node da) worldSound sessizce hiçbir şey yapmaz', () => {
    expect(WORLD_AUDIO.march.stepMs).toBeGreaterThan(150);
    expect(WORLD_AUDIO.march.stepGain.length).toBeGreaterThan(0);
    expect(WORLD_AUDIO.march.wagonEvery).toBeGreaterThan(1);
    expect(WORLD_AUDIO.itemPickupGain).toBeGreaterThan(0);
    expect(WORLD_AUDIO.itemPickupGain).toBeLessThanOrEqual(1);
    for (const k of WORLD_SOUND_KINDS) expect(() => worldSound(k)).not.toThrow();
  });
});

describe('Sahne müzikleri (data/audio-music-tracks.json, src/game/music.ts > trackConfig)', () => {
  const scenes = MUSIC_TRACK_IDS.filter((t): t is Exclude<MusicTrackId, 'menu'> => t !== 'menu');

  it('parça listesi veriyle aynı; menü = ana menü ayarı; ayarlar önbellekli (aynı nesne)', () => {
    expect([...scenes].sort()).toEqual(Object.keys(tracksData.tracks).sort());
    expect(trackConfig('menu')).toBe(MUSIC);
    for (const t of scenes) expect(trackConfig(t)).toBe(trackConfig(t));
    expect(MUSIC_CROSSFADE_MS).toBeGreaterThanOrEqual(800);
    expect(MUSIC_CROSSFADE_MS).toBeLessThanOrEqual(5000);
  });

  it('her parça geçerli: akorlar, kalıp boyları (ölçü x 2 sekizlik), temalar tam ölçü ve akor ölçeğinde; döngü 30-90 sn', () => {
    for (const t of scenes) {
      const cfg = trackConfig(t);
      const eighths = cfg.beatsPerBar * 2;
      for (const [name, sec] of Object.entries(cfg.sections)) {
        for (const c of sec.chords) expect(() => parseChord(c), `${t}/${name}: ${c}`).not.toThrow();
        const harp = cfg.harpPatterns[sec.harp];
        expect(harp, `${t}/${name} arp`).toBeDefined();
        expect(harp!.length % eighths, `${t}/${name} arp boyu`).toBe(0);
        for (const d of [sec.drum, sec.drumLast]) if (d) expect(cfg.drumPatterns[d]?.length, `${t}/${name} davul ${d}`).toBe(eighths);
        if (sec.melody?.startsWith('theme:')) {
          const bars = cfg.themes[sec.melody.slice(6)]!;
          expect(bars.length, `${t}/${name} tema`).toBe(sec.chords.length);
          bars.forEach((b, i) => {
            const notes = parseBar(b);
            expect(notes.reduce((s, n) => s + n.beats, 0), `${t}/${name} ölçü ${i + 1}`).toBeCloseTo(cfg.beatsPerBar);
            for (const n of notes) expect(chordScale(sec.chords[i]!, cfg), `${t}/${name} ölçü ${i + 1} ${b}`).toContain(pc(n.midi));
          });
        }
      }
      for (const r of [...cfg.rhythms.high, ...cfg.rhythms.low, ...cfg.rhythms.cadence]) expect(r.reduce((a, b) => a + b, 0), `${t} ritim ${r}`).toBeCloseTo(cfg.beatsPerBar);
      for (const f of cfg.form) expect(cfg.sections[f], `${t} ${f}`).toBeDefined();
      expect(cycleSec(cfg), t).toBeGreaterThanOrEqual(30);
      expect(cycleSec(cfg), t).toBeLessThanOrEqual(90);
      expect(barSec(cfg)).toBeGreaterThan(0);
      for (const n of cfg.voices.drone.notes) expect(noteMidi(n), `${t} drone`).toBeGreaterThanOrEqual(noteMidi('A1'));
    }
  });

  it('beste belirleyici ve sonlu; ezgi notaları akor ölçeğinde; savaş/boss alçak (arp transpozu) ve davullu, kamp/harita sakin', () => {
    for (const t of scenes) {
      const cfg = trackConfig(t);
      const L = cycleSec(cfg);
      const bar = barSec(cfg);
      const chordAt = (time: number): string => {
        let b = Math.floor(time / bar + 1e-6);
        for (const f of cfg.form) {
          const n = cfg.sections[f]!.chords.length;
          if (b < n) return cfg.sections[f]!.chords[b]!;
          b -= n;
        }
        return cfg.sections[cfg.form.at(-1)!]!.chords.at(-1)!;
      };
      for (let k = 0; k < 4; k++) {
        const ev = composeCycle(k, cfg);
        expect(composeCycle(k, cfg)).toEqual(ev);
        expect(ev.some((e) => e.kind === 'harp'), `${t} ${k} harp`).toBe(true);
        let last = -1;
        for (const e of ev) {
          expect(Number.isFinite(e.t)).toBe(true);
          expect(e.t).toBeGreaterThanOrEqual(last);
          expect(e.t).toBeLessThan(L);
          last = e.t;
          if (e.kind === 'flute') expect(chordScale(chordAt(e.t + 0.02), cfg), `${t} ${k} midi ${e.midi}`).toContain(pc(e.midi));
          if (e.kind === 'harp') expect(e.midi, t).toBeGreaterThanOrEqual(noteMidi('C1'));
        }
      }
    }
    expect(trackConfig('battle').voices.harp.shift).toBe(-12);
    expect(trackConfig('boss').voices.harp.shift).toBe(-12);
    expect(trackConfig('boss').voices.drum.gain).toBeGreaterThan(trackConfig('battle').voices.drum.gain);
    expect(composeCycle(0, trackConfig('battle')).some((e) => e.kind === 'drum')).toBe(true);
    expect(trackConfig('battle').master).toBeLessThan(trackConfig('map').master); // savaş müziği skill seslerinin altında
  });
});
