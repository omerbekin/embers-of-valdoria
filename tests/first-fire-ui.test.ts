// The First Fire's Verdict arayüz metinleri ve rozeti (src/game/first-fire-ui.ts; metin data/first-fire-ui.json, sayılar data/battle-rules.json).
import { describe, expect, it } from 'vitest';
import { content } from '../src/engine';
import { MUSIC_TRACK_IDS, barSec, cycleSec, trackConfig } from '../src/game/music';
import { battleTrack, musicState, sceneMusic } from '../src/ui/music';
import { FIRST_FIRE_MUSIC_ENTER_MS, FIRST_FIRE_SFX, battleMusicFor, firstFireBadge, firstFireStartText, firstFireWarnText } from '../src/game/first-fire-ui';

const rule = content.firstFireRule();

describe('First Fire arayüzü', () => {
  it('uyarı metinleri: ikisi de sayısız', () => {
    expect(firstFireWarnText('first')).toBe('The First Fire grows impatient');
    expect(firstFireWarnText('final')).toBe('The First Fire is about to pass judgment');
  });

  it('başlangıç bandı başlığı kuralın adıdır', () => {
    expect(firstFireStartText().title).toBe(rule.name);
  });

  it('rozet: sıradaki vuruş hasarı + iki cümlelik kural + sıradaki vuruş satırı', () => {
    const b = firstFireBadge(40, rule);
    expect(b.label).toBe('First Fire');
    expect(b.counter).toBe('40');
    expect(b.tip.rows.length).toBe(3);
    expect(b.tip.rows[1]!.text).toContain(String(rule.damageStep));
    expect(b.tip.rows[2]!.text).toContain('40');
    expect(b.tip.rows.map((r) => r.text).join(" ")).not.toMatch(/[{}]/);
  });

  it('üç bildirim sesi tanımlı ve tırmanır (kazanç ve süre artar)', () => {
    const { first_warn: a, final_warn: b, start: c } = FIRST_FIRE_SFX;
    for (const d of [a, b, c]) expect(d.layers.length).toBeGreaterThan(0);
    expect(a.gain).toBeLessThan(b.gain);
    expect(FIRST_FIRE_SFX.start.layers.some((l) => l.type === 'voice')).toBe(true); // fısıltı koro
    expect(Object.keys(FIRST_FIRE_SFX).sort()).toEqual(['final_warn', 'first_warn', 'start', 'strike_hit', 'strike_seal']);
  });

  it('müzik seçimi: kural başlamadan değişmez, başlayınca first_fire (boss dahil), savaş sonu normal akış', () => {
    expect(battleMusicFor('battle', false)).toBe('battle');
    expect(battleMusicFor('battle_reach', false)).toBe('battle_reach');
    expect(battleMusicFor('battle', true)).toBe('first_fire');
    const boss = battleTrack([{ defId: 'bridge_warden', tier: 'boss' }]);
    expect(boss).not.toBe('first_fire');
    expect(battleMusicFor(boss, true)).toBe('first_fire'); // boss müziğinin üstüne çıkar
    // sahne müziği durumu (ses kapalıyken de wanted = istenen parça okunur)
    sceneMusic(battleMusicFor('battle', false));
    expect(musicState().track).toBe('battle');
    sceneMusic(null); // başlangıçta eski müzik söner
    expect(musicState().track).toBeNull();
    sceneMusic(battleMusicFor('battle', true)); // fısıltı bitince yeni parça
    expect(musicState().track).toBe('first_fire');
    sceneMusic(null); // savaş sonu
    expect(musicState().track).toBeNull();
    expect(FIRST_FIRE_MUSIC_ENTER_MS).toBeGreaterThan(2500);
  });

  it('first_fire parçası kayıtlı, kendi ayarlı (başka parçanın kopyası değil), döngü 30-130 sn, drone altta', () => {
    expect(MUSIC_TRACK_IDS).toContain('first_fire');
    const c = trackConfig('first_fire');
    expect(c.mode).toBe('phrygian');
    expect(c.tonic).toBe('E');
    for (const other of ['battle', 'battle_reach', 'boss'] as const) expect(c.sections).not.toEqual(trackConfig(other).sections);
    const cyc = cycleSec(c);
    expect(cyc).toBeGreaterThan(30);
    expect(cyc).toBeLessThan(130);
    expect(barSec(c)).toBeGreaterThan(0);
    expect(c.voices.drone.gain).toBeGreaterThan(0);
    expect(c.voices.drone.gain).toBeLessThan(c.voices.harp.gain);
    // nabız hızlanır: bölümlerin davul kalıplarında vuruş sayısı artar
    const hits = (n: string | null | undefined) => (n ? c.drumPatterns[n]!.filter((v) => v > 0).length : 0);
    const f = c.form.map((s) => hits(c.sections[s]!.drum));
    expect(f[1]!).toBeGreaterThan(f[0]!);
    expect(f[3]!).toBeGreaterThan(f[1]!);
  });

  it('Ocak mührü sprite sheetleri (assets/first-fire, Codex çizimi): kare sayısı ve boyutu json ile tutarlı, palette kırmızı / turuncu yok', async () => {
    const sharp = (await import('sharp')).default;
    const { readFileSync } = await import('node:fs');
    for (const [name, frames] of [['seal', 6], ['column', 6]] as const) {
      const meta = JSON.parse(readFileSync(`assets/first-fire/${name}.json`, 'utf8')) as { frames: number; frame_size: [number, number] };
      expect(meta.frames, name).toBe(frames);
      const { data, info } = await sharp(`assets/first-fire/${name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect([info.width, info.height], name).toEqual([meta.frame_size[0] * frames, meta.frame_size[1]]);
      let opaque = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3]) continue;
        opaque++;
        // beyaz / altın / koyu altın: yeşil kanal kırmızının %70'inin altına düşerse (turuncu / kırmızı) hata
        expect(data[i + 1]! >= data[i]! * 0.7, `${name}: kırmızımsı piksel`).toBe(true);
      }
      expect(opaque, `${name}: boş sheet`).toBeGreaterThan(1000);
    }
  });

  it('vuruş sesleri (Ocak mührü) kendi sentezi: mühür = FM metal + gürültü (saf sinüs çınlaması yok), fışkırma = darbe + gürültü soluğu', () => {
    const { strike_seal: seal, strike_hit: hit } = FIRST_FIRE_SFX;
    expect(seal.layers.some((l) => l.type === 'tone' && !!l.fm)).toBe(true);
    expect(seal.layers.some((l) => l.type === 'tone' && l.wave === 'sine')).toBe(false);
    expect(seal.layers.some((l) => l.type === 'noise')).toBe(true);
    expect(hit.layers.filter((l) => l.type === 'noise').length).toBeGreaterThanOrEqual(2);
    // kısa: iki ses de yarım saniyeden kısa sürede biter
    for (const d of [seal, hit]) for (const l of d.layers) if (l.type === 'tone' || l.type === 'noise') expect((l.at ?? 0) + l.attack + l.decay).toBeLessThan(0.5);
  });
});
