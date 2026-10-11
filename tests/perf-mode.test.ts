import { describe, expect, it } from 'vitest';
import layout from '../data/battle-layout.json';
import { cyclePerfSetting, frameTimeSaysSlow, lowEndGuess, parsePerfSetting, perfSettingLabel, resolvePerfLite } from '../src/ui/perf-mode';
import { GAME_H, stageMetrics } from '../src/ui/viewport';

describe('Performance mode ayarı (Settings > Gameplay)', () => {
  it('kayıt okuma: bozuk / yok = Auto', () => {
    expect(parsePerfSetting(null)).toBe('auto');
    expect(parsePerfSetting('xyz')).toBe('auto');
    expect(parsePerfSetting('on')).toBe('on');
    expect(parsePerfSetting('off')).toBe('off');
    expect(perfSettingLabel('auto')).toBe('Auto');
  });
  it('satır döngüsü Auto -> On -> Off -> Auto (sol ok geri)', () => {
    expect(cyclePerfSetting('auto')).toBe('on');
    expect(cyclePerfSetting('on')).toBe('off');
    expect(cyclePerfSetting('off')).toBe('auto');
    expect(cyclePerfSetting('auto', -1)).toBe('off');
  });
  it('On / Off elle; Auto = tahmin ya da ölçüm', () => {
    expect(resolvePerfLite('on', false, false)).toBe(true);
    expect(resolvePerfLite('off', true, true)).toBe(false);
    expect(resolvePerfLite('auto', false, false)).toBe(false);
    expect(resolvePerfLite('auto', true, false)).toBe(true);
    expect(resolvePerfLite('auto', false, true)).toBe(true);
  });
  it('donanım tahmini temkinli: yalnızca dokunmatik + belirgin zayıf donanım', () => {
    expect(lowEndGuess({ coarse: false, cores: 2, memory: 1 })).toBe(false); // masaüstü: asla tahminle
    expect(lowEndGuess({ coarse: true, cores: 8, memory: 4 })).toBe(false); // Redmi Note 7 gibi: ölçüm karar verir
    expect(lowEndGuess({ coarse: true, cores: 8, memory: 2 })).toBe(true);
    expect(lowEndGuess({ coarse: true, cores: 4, memory: 4 })).toBe(true);
    expect(lowEndGuess({ coarse: true })).toBe(false);
  });
  it('ölçüm: ortanca kare süresi 24 ms üstü yavaş; az örnekle karar yok', () => {
    expect(frameTimeSaysSlow(Array(60).fill(16.7))).toBe(false);
    expect(frameTimeSaysSlow(Array(60).fill(33.4))).toBe(true);
    expect(frameTimeSaysSlow([...Array(40).fill(16.7), ...Array(20).fill(80)])).toBe(false); // ara sıra takılma yetmez
    expect(frameTimeSaysSlow(Array(10).fill(50))).toBe(false);
  });
});

describe('Performans modunda tuval çözünürlüğü (yerleşim koordinatları aynı)', () => {
  it('telefon (851x393, dpr 2.75): normalde gerçek piksel (render 1), performans modunda liteRenderScale', () => {
    const n = stageMetrics(851, 393, 2.75);
    const l = stageMetrics(851, 393, 2.75, true);
    expect(n.zoom).toBe(1);
    expect(l.zoom).toBeCloseTo(layout.stage.liteRenderScale, 2);
    expect(l.canvasH).toBe(Math.round(GAME_H * layout.stage.liteRenderScale));
    // görünen dünya (sol / sağ kenar, mantıksal genişlik) değişmez: yalnızca piksel yoğunluğu düşer
    expect(l.logicalW).toBe(n.logicalW);
    expect(l.left).toBeCloseTo(n.left, 0);
    expect(l.right).toBeCloseTo(n.right, 0);
    expect(l.cssScale).toBe(n.cssScale);
  });
  it('masaüstü 4K: performans modu da aynı tavanı uygular', () => {
    expect(stageMetrics(3840, 2160, 1, true).zoom).toBeCloseTo(layout.stage.liteRenderScale, 2);
    expect(stageMetrics(3840, 2160, 1).zoom).toBe(2);
  });
});
