import { describe, expect, it } from 'vitest';
import { canWithdraw, chooseEvent, debugTeleport, eventChoicesFor, newCampaign, nextStep, normalizeState, travelRoutes, type CampaignState } from '../src/campaign';

// Ömer 2026-11-21 (form Tur 40): olay penceresinde X seçenek sayfasında yalnız kapatır (olay açık), sonuç sayfasında Continue'dur (ödül tek kez)
const at = (node: string): CampaignState => debugTeleport(newCampaign({ mode: 'normal', seed: 7 }), node);
const roundTrip = (s: CampaignState): CampaignState => normalizeState(JSON.parse(JSON.stringify(s)), 0)!;

describe('olay penceresi X', () => {
  it('seçim yapılmadan X: olay açık kalır, durum değişmez (kayıt / yüklemeden sonra da)', () => {
    const s = at('6A'); // Witch's Hut: "Leave" çıkış seçeneği
    expect(nextStep(s).kind).toBe('event');
    const before = JSON.stringify(s);
    // pencere kapanır = durum yazılmaz; kayıt / yükleme sonrası aynı olay aynı seçeneklerle bekler
    const loaded = roundTrip(s);
    expect(JSON.stringify(loaded)).toBe(before);
    expect(nextStep(loaded).kind).toBe('event');
    expect(eventChoicesFor(loaded, 'witchs_hut').length).toBeGreaterThan(1);
  });

  it('"çık" seçeneği olan açık olaydan kafile yola çıkabilir (Guild Hall / Ferry Office "Not yet" ile aynı sonuç: yol kapanmaz)', () => {
    const s = at('6A');
    expect(canWithdraw(s)).toBe(true);
    expect(travelRoutes(s).size).toBeGreaterThan(0);
  });

  it('zorunlu seçimli olay (çıkış seçeneği yok) açıkken yol kapalı kalır', () => {
    const s = at('fold');
    expect(nextStep(s).kind).toBe('event');
    const closerless = eventChoicesFor(s, 'shepherds_fold').every((c) => !c.closer && !c.walkAway);
    expect(canWithdraw(s)).toBe(!closerless);
  });

  it('sonuç sayfası X = Continue: seçim tek kez uygulanır, yeniden yükleyince / dokununca ödül ikinci kez verilmez', () => {
    const s = at('6A');
    const pick = eventChoicesFor(s, 'witchs_hut').find((c) => (c.gold ?? 0) > 0 && !c.cost && !c.battle) ?? eventChoicesFor(s, 'witchs_hut').find((c) => !c.closer && !c.battle && !c.cost)!;
    const done = chooseEvent(s, pick.id);
    expect(nextStep(done).kind).not.toBe('event'); // olay bitti
    const loaded = roundTrip(done);
    expect(loaded.gold).toBe(done.gold);
    expect(nextStep(loaded).kind).not.toBe('event');
    expect(() => chooseEvent(loaded, pick.id)).toThrow(); // ikinci kez seçilemez
  });
});
