/**
 * Debug örnek verisi (Data > Cloud): Worker çalışmadan hesap ekranlarını görmek için sahte hesap API'si ve örnek çakışma kararı.
 * Ağ çağrısı ve depo yazımı YOK; yalnızca debug parçası içe aktarır.
 */
import type { SaveEntry, SlotSummary } from '../../campaign/save';
import type { AccountState, CloudEvent, CloudStatus, PendingDecision, ResolveResult, SideSummary } from '../cloud';
import type { AccountApi } from './api';

const ago = (ms: number): string => new Date(Date.now() - ms).toISOString();
const MIN = 60_000;
const DAY = 86_400_000;

/** Sahte hesap: giriş / çıkış / ad / silme yalnızca bellekte; olaylar gerçek istemci gibi yayılır. */
export function sampleAccountApi(): AccountApi {
  const listeners = new Set<(e: CloudEvent) => void>();
  let status: CloudStatus = 'idle';
  let lastSyncAt = ago(3 * MIN);
  let user: { name: string | null; providers: string[] } | null = { name: 'Ashen Wanderer', providers: ['google'] };
  const account = (): AccountState => ({
    signedIn: !!user,
    userId: user ? '7f3c2a91-4d5e-4b8a-9c1d-2e6f0a7b94md' : null,
    displayName: user?.name ?? null,
    providers: user ? [...user.providers] : [],
    save: null,
    supportId: user ? '7f3c2a91-4d5e-4b8a-9c1d-2e6f0a7b94md' : null,
    local: user ? { userId: 'sample', rev: 12, hash: null, dirty: false, lastSyncAt } : null,
  });
  const emit = (e: CloudEvent): void => listeners.forEach((fn) => fn(e));
  const later = <T>(v: T, ms = 450): Promise<T> => new Promise((r) => window.setTimeout(() => r(v), ms));
  return {
    isLoginAvailable: () => true,
    checkLoginAvailable: () => Promise.resolve(true),
    getAccount: account,
    getCloudStatus: () => status,
    startLogin(opts) {
      if (!opts.consentAccepted) return { ok: false, reason: 'consent' };
      if (opts.mode === 'link' && user) user.providers = [...new Set([...user.providers, opts.provider])];
      else user = { name: null, providers: [opts.provider] };
      emit({ type: 'account', account: account() });
      return { ok: true };
    },
    signOut: () => {
      user = null;
      emit({ type: 'account', account: account() });
      return later({ ok: true as const });
    },
    deleteAccount: () => {
      user = null;
      emit({ type: 'account', account: account() });
      return later({ ok: true as const }, 700);
    },
    setDisplayName: (name) => {
      if (user) user.name = name;
      emit({ type: 'account', account: account() });
      return later({ ok: true as const, displayName: name });
    },
    syncNow: () => {
      status = 'syncing';
      emit({ type: 'status', status });
      return later(null, 900).then(() => {
        status = 'idle';
        lastSyncAt = new Date().toISOString();
        emit({ type: 'status', status });
        return status;
      });
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}

function slot(slotNo: number, o: { mode?: 'normal' | 'ironman'; stop: number; region: string; classes: string[]; playedAgo: number }): SlotSummary {
  const lastPlayed = ago(o.playedAgo);
  const latest = { id: `s${slotNo}`, kind: 'manual', savedAt: lastPlayed, mode: o.mode ?? 'normal', campaignId: `c${slotNo}`, summary: { map: 'valdoria', stop: o.stop, stops: 40, node: o.region, region: o.region, classes: o.classes, hp: [], victories: o.stop } } as unknown as SaveEntry;
  return { slot: slotNo, campaignId: `c${slotNo}`, mode: o.mode ?? 'normal', difficulty: 'medium', lastPlayed, saveCount: 3, latest } as unknown as SlotSummary;
}

/** Taslaktaki örnek: bu cihaz 3 yuva + Endless, bulut 2 yuva; 2. yuva Ironman ve bulutta daha ileride (bu cihazda seçilemez). */
export function samplePending(onResolve?: (choice: 'cloud' | 'local') => void): PendingDecision {
  const local: SideSummary = {
    slots: [
      slot(0, { stop: 14, region: 'Ashen Marches', classes: ['warrior', 'druid', 'hexer', 'cleric'], playedAgo: 20 * MIN }),
      slot(1, { mode: 'ironman', stop: 9, region: 'Greywood', classes: ['rogue', 'mage'], playedAgo: 1.2 * DAY }),
      slot(2, { stop: 3, region: 'Hollow Vale', classes: ['warrior'], playedAgo: 5 * DAY }),
    ],
    endless: { wave: 41, classes: ['warrior', 'cleric'] },
    scores: { count: 6, bestWave: 47 },
    savedAt: null,
    app: null,
  };
  const cloud: SideSummary = {
    slots: [
      slot(0, { stop: 11, region: 'Ashen Marches', classes: ['warrior', 'druid', 'hexer'], playedAgo: 3 * DAY }),
      slot(1, { mode: 'ironman', stop: 12, region: 'Greywood', classes: ['rogue', 'mage', 'cleric'], playedAgo: 4 * DAY }),
      null,
    ],
    endless: null,
    scores: { count: 9, bestWave: 52 },
    savedAt: ago(3 * DAY),
    app: '0.9.8.1',
  };
  return {
    local,
    cloud,
    pins: [{ slot: 1, keep: 'cloud', reason: 'more-advanced' }],
    resolve: (choice) =>
      new Promise<ResolveResult>((r) =>
        window.setTimeout(() => {
          onResolve?.(choice);
          r({ ok: true });
        }, 600),
      ),
  };
}
