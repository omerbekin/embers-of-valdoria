import { describe, expect, it, vi } from 'vitest';
import { autoResolve, debugTeleport, debugWinNode, idleStartFrame, moveTo, newCampaign, nextStep, townScreenNode, type CampaignState } from '../src/campaign';
import { guarded, installLoopGuard, makeGuardLog } from '../src/ui/loop-guard';

// 0.7.7 Ashford donması (Ömer 2026-10-14, telefon): Watchtower'dan sonra Ashford'a varınca kasaba ekranı ikinci kahramanın bekleme
// animasyonunu var olmayan 2. kareden başlatmaya çalıştı (tek kareli görsel, `startFrame: i % 2`) -> Phaser hata fırlattı -> rAF döngüsü
// kalıcı durdu ("Tap to skip" ekranda kaldı). Yeniden açılışta aynı hata sahne kurulumunda: kasaba yarım çizildi, Farewell ve Menu yoktu.

describe('kasaba bekleme animasyonu başlangıç karesi', () => {
  it('tek kareli görselde her kahraman 0. kareden başlar (eski i % 2 hatası)', () => {
    for (let i = 0; i < 4; i++) expect(idleStartFrame(i, 1)).toBe(0);
    expect(idleStartFrame(1, 0)).toBe(0);
  });
  it('çok kareli görselde kahramanlar farklı karelerden, kare sayısını aşmadan', () => {
    expect([0, 1, 2, 3].map((i) => idleStartFrame(i, 2))).toEqual([0, 1, 0, 1]);
    expect([0, 1, 2, 3, 4].map((i) => idleStartFrame(i, 4))).toEqual([0, 1, 2, 3, 0]);
    for (let i = 0; i < 10; i++) for (let n = 1; n < 6; n++) expect(idleStartFrame(i, n)).toBeLessThan(n);
  });
});

describe('oyun döngüsü güvenlik ağı', () => {
  it('bir karede fırlatılan hata yutulur, sonraki kareler çalışır; aynı ileti bir kez yazılır', () => {
    const write = vi.fn();
    const log = makeGuardLog(20, write);
    let frames = 0;
    const loop = {
      step(t: number) {
        frames++;
        if (t === 2 || t === 3) throw new TypeError("Cannot read properties of undefined (reading 'duration')");
      },
      stepLimitFPS() {},
    };
    const wrapped = guarded((t: number) => loop.step(t), (e) => log.add(e));
    for (let t = 1; t <= 5; t++) expect(() => wrapped(t)).not.toThrow();
    expect(frames).toBe(5);
    expect(log.count).toBe(2);
    expect(write).toHaveBeenCalledTimes(1);
  });
  it('installLoopGuard Phaser TimeStep benzeri nesnenin iki kare işlevini de sarar ve çalışan geri çağrıyı değiştirir', () => {
    const raf = { isRunning: true, callback: (_t: number) => {} };
    const loop = {
      hasFpsLimit: false,
      raf,
      step: () => {
        throw new Error('boom');
      },
      stepLimitFPS: () => {
        throw new Error('boom2');
      },
    };
    installLoopGuard(loop);
    expect(() => loop.step()).not.toThrow();
    expect(() => loop.stepLimitFPS()).not.toThrow();
    expect(raf.callback).toBe(loop.step);
  });
});

describe('Ashford varışında kaydedilen sefer yüklenince akış sürer', () => {
  /** Ömer'in durumu: Warrior + düşmüş Anti-Mage, Watchtower kazanıldı, Ashford'a yüründü (Farewell bekliyor). */
  function omer(): CampaignState {
    let s = debugTeleport(newCampaign({ mode: 'normal', seed: 5 }), '3');
    s = { ...s, roster: s.roster.map((h, i) => ({ ...h, class: i === 0 ? 'warrior' : 'antimage' })) };
    s = debugWinNode(s);
    for (let n = 0; n < 10 && nextStep(s).kind !== 'move'; n++) s = autoResolve(s);
    s = { ...s, roster: s.roster.map((h, i) => (i === 1 ? { ...h, alive: false, hpRatio: 0 } : h)) };
    return moveTo(s, '4');
  }

  it('kayıt (JSON gidiş-dönüş) Farewell ile başlar, kasaba ekranı kurulur ve yol açılana kadar her adım çözülür', () => {
    const loaded = JSON.parse(JSON.stringify(omer())) as CampaignState;
    expect(loaded.at).toBe('4');
    expect(nextStep(loaded).kind).toBe('farewell');
    expect(townScreenNode(loaded)).toBe('4');
    let s = loaded;
    const seen: string[] = [];
    for (let n = 0; n < 12 && nextStep(s).kind !== 'move'; n++) {
      seen.push(nextStep(s).kind);
      s = autoResolve(s);
    }
    expect(seen).toEqual(['farewell', 'company', 'story', 'town']);
    expect(nextStep(s)).toEqual({ kind: 'move', options: ['moor'] });
  });
});
