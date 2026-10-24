import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoResolve, deleteSlot, memoryKV, newCampaign, pickHero, readSaves, writeSave, type CampaignMode } from '../src/campaign';
import { addScore, newRun, saveScores, scoreOf } from '../src/endless';
import { clearCloudDirty, wrapKV } from '../src/game/kv-storage';
import { BACKUP_KEY } from '../src/cloud/keys';
import { readTombstones, TOMB_KEY } from '../src/cloud/tombstones';
import cloudConfig from '../data/cloud.json';
import { CLOUD_META_KEY, CloudClient, DEBOUNCE_MS, GATE_POLL_MS, PULL_MIN_GAP_MS, PULL_MS, type CloudCore, type CloudEvent, type FetchLike } from '../src/cloud/cloud';
import * as syncCore from '../src/cloud/sync-core';
import * as campaignSave from '../src/campaign/save';
import * as endlessSave from '../src/endless/save';
import { decidePut, parseSavePut, serializeBlob, type SaveData, type Tombstone as WireTomb, type Versions } from '../cloudflare/src/save-logic';

const T0 = Date.parse('2026-10-24T12:00:00.000Z');
const start = (mode: CampaignMode, seed = 10, slot = 0) => autoResolve(pickHero(newCampaign({ mode, seed, slot, difficulty: 'medium', campaignId: `c${seed}` }), 'archer'));

/** Sahte saat + zamanlayıcılar. */
function fakeClock() {
  let now = T0;
  let id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => now,
    setTimeout: (fn: () => void, ms: number) => {
      timers.set(++id, { at: now + ms, fn });
      return id;
    },
    clearTimeout: (h: unknown) => void timers.delete(h as number),
    /** Zamanı ilerletir, vadesi gelen zamanlayıcıları sırayla çalıştırır. */
    advance(ms: number) {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = end;
    },
    pending: () => timers.size,
  };
}

interface Call {
  method: string;
  path: string;
  body: string | undefined;
  keepalive: boolean;
}

/** Worker sözleşmesini (cloudflare/src/auth.ts) save-logic'in saf kurallarıyla taklit eden sahte sunucu. */
function fakeServer(clock: ReturnType<typeof fakeClock>) {
  const s = {
    user: { id: 'u-1', displayName: null as string | null, providers: ['google'] } as { id: string; displayName: string | null; providers: string[] } | null,
    save: null as null | { rev: number; updatedAt: number; versions: Versions; app: string; data: SaveData; hash: string; size: number; tombstones?: WireTomb[] },
    offline: false,
    unavailable: false,
    getShape: 'worker' as 'worker' | 'legacy' | 'broken',
    calls: [] as Call[],
  };
  const res = (status: number, body?: unknown, headers: Record<string, string> = {}) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
  const meta = () => (s.save ? { rev: s.save.rev, updatedAt: s.save.updatedAt, versions: s.save.versions, app: s.save.app, size: s.save.size, hash: s.save.hash } : null);
  const fetch: FetchLike = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    s.calls.push({ method, path: url, body: init.body, keepalive: !!init.keepalive });
    if (s.offline) throw new TypeError('Failed to fetch');
    if (s.unavailable) return res(503, { error: 'not-configured' });
    const key = `${method} ${url}`;
    if (key === 'GET /auth/me') return res(200, s.user ? { user: s.user, save: meta() } : { user: null });
    if (key === 'POST /auth/logout') {
      s.user = null;
      return new Response(null, { status: 204 });
    }
    if (!s.user) return res(401, { error: 'signed-out' });
    if (key === 'GET /save') {
      if (!s.save) return res(200, { save: null });
      // Gerçek Worker biçimi (auth.ts > saveGet): data ve tombstones `save` nesnesinin İÇİNDE. 'legacy': üst düzeyde; 'broken': data yok.
      if (s.getShape === 'legacy') return res(200, { save: meta(), data: s.save.data, tombstones: s.save.tombstones ?? [] });
      if (s.getShape === 'broken') return res(200, { save: meta() });
      const m = JSON.stringify(meta());
      return new Response(`{"save":${m.slice(0, -1)},"tombstones":${JSON.stringify(s.save.tombstones ?? [])},"data":${serializeBlob(s.save.data)!.blob}}}`, { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (key === 'PUT /save') {
      const p = parseSavePut(init.body ?? '');
      if (!p.ok) return res(400, { error: p.error });
      const d = decidePut(s.save, p.put, clock.now());
      if (!d.ok) return res(d.status, { error: d.error, rev: d.rev }, d.status === 429 ? { 'retry-after': '5' } : {});
      const ser = serializeBlob(p.put.data)!;
      const hash = createHash('sha256').update(ser.blob).digest('hex');
      s.save = { rev: d.rev, updatedAt: clock.now(), versions: p.put.versions, app: p.put.app, data: p.put.data, hash, size: ser.size, tombstones: p.put.tombstones ?? [] };
      return res(200, { rev: d.rev, updatedAt: clock.now(), hash, size: ser.size });
    }
    if (key === 'DELETE /account') {
      if (init.body !== JSON.stringify({ confirm: 'DELETE' })) return res(400, { error: 'confirm' });
      s.user = null;
      s.save = null;
      return res(200, { deleted: true });
    }
    if (key === 'PUT /account/name') {
      const n = (JSON.parse(init.body ?? '{}') as { displayName?: string }).displayName ?? '';
      if (n.trim().length < 2) return res(400, { error: 'bad-name' });
      s.user.displayName = n.trim();
      return res(200, { displayName: n.trim() });
    }
    return res(404, { error: 'not-found' });
  };
  return { s, fetch };
}

type KVm = ReturnType<typeof memoryKV>;

function setup(opts: { search?: string; host?: string; raw?: KVm; gate?: () => boolean; enabled?: boolean; loadCore?: () => Promise<CloudCore> } = {}) {
  const clock = fakeClock();
  const server = fakeServer(clock);
  const raw = opts.raw ?? memoryKV();
  const kv = wrapKV(raw);
  const hidden: Array<() => void> = [];
  const visible: Array<() => void> = [];
  const vis = { on: true };
  const nav: string[] = [];
  const urls: string[] = [];
  const events: CloudEvent[] = [];
  const logs: string[] = [];
  const reports: Array<{ code: string; msg: string }> = [];
  const client = new CloudClient({
    diag: { log: (m) => logs.push(m), report: (code, msg) => reports.push({ code, msg }) },
    ...(opts.loadCore ? { loadCore: opts.loadCore } : {}),
    enabled: opts.enabled ?? true,
    fetch: server.fetch,
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    kv: () => kv,
    hostname: opts.host ?? 'localhost',
    location: () => ({ pathname: '/', search: opts.search ?? '', hash: '' }),
    replaceUrl: (u) => urls.push(u),
    navigate: (u) => nav.push(u),
    onHidden: (fn) => hidden.push(fn),
    onVisible: (fn) => visible.push(fn),
    isVisible: () => vis.on,
    app: '0.9.8.1',
  });
  if (opts.gate) client.setApplyGate(opts.gate);
  client.subscribe((e) => events.push(e));
  return { clock, server, raw, kv, client, hidden, visible, vis, nav, urls, events, logs, reports };
}

/** Bir depoya sefer ilerlemesi yazar. */
function progress(kv: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }, seed = 1, slot = 0, mode: CampaignMode = 'normal') {
  writeSave(kv, start(mode, seed, slot), mode === 'ironman' ? 'auto' : 'manual', '2026-10-20T10:00:00Z');
}

/** Sunucuya başka bir cihazdan yüklenmiş gibi kayıt koyar (gerçek okuyucularla geçerli veri). */
function seedServer(s: ReturnType<typeof fakeServer>['s'], rev: number, fill: (kv: KVm) => void) {
  const kv = memoryKV();
  fill(kv);
  const data: SaveData = {};
  const versions: Versions = {};
  const camp = kv.getItem('eov.campaign.v1');
  if (camp) {
    data['eov.campaign.v1'] = camp;
    versions['eov.campaign.v1'] = (JSON.parse(camp) as { version: number }).version;
  }
  const sc = kv.getItem('eov.endless.scores.v1');
  if (sc) {
    data['eov.endless.scores.v1'] = sc;
    versions['eov.endless.scores.v1'] = 1;
  }
  const ser = serializeBlob(data)!;
  s.save = { rev, updatedAt: T0 - 3_600_000, versions, app: '0.9.8.1', data, hash: createHash('sha256').update(ser.blob).digest('hex'), size: ser.size };
}

const scores = (kv: KVm) => {
  const run = newRun(7, ['warrior', 'archer', 'mage', 'druid'], '2026-10-09T00:00:00.000Z');
  saveScores(kv, addScore([], scoreOf(run, '2026-10-09T00:00:00.000Z')).list);
};

const metaOf = (raw: KVm) => JSON.parse(raw.getItem(CLOUD_META_KEY) ?? 'null') as { userId: string; rev: number; dirty: boolean } | null;

describe('bulut istemcisi (src/cloud/cloud.ts)', () => {
  let ctx: ReturnType<typeof setup> | null = null;
  beforeEach(() => clearCloudDirty());
  afterEach(() => {
    ctx?.client.dispose();
    ctx = null;
    clearCloudDirty();
  });

  it('girişsiz oyuncu: hiç ağ çağrısı yok, eov.cloud.v1 oluşmaz (yazım ve zaman geçse de)', async () => {
    ctx = setup();
    await ctx.client.init();
    progress(ctx.kv);
    ctx.clock.advance(120_000);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toEqual([]);
    expect(ctx.raw.getItem(CLOUD_META_KEY)).toBeNull();
    expect(ctx.client.isLoginAvailable()).toBe(true);
    expect(ctx.client.getAccount().signedIn).toBe(false);
  });

  it('anahtar kapalıyken (enabled:false): giriş yok, init/checkLoginAvailable/startLogin sıfır ağ çağrısı, dinleyici yok, ?auth= bile yoklanmaz', async () => {
    expect(typeof cloudConfig.enabled).toBe('boolean');
    const raw = memoryKV();
    raw.setItem(CLOUD_META_KEY, JSON.stringify({ userId: 'u-1', rev: 1, hash: null, dirty: true, lastSyncAt: null }));
    ctx = setup({ enabled: false, raw, search: '?auth=ok' });
    await ctx.client.init();
    expect(ctx.client.isEnabled()).toBe(false);
    expect(ctx.client.isLoginAvailable()).toBe(false);
    expect(await ctx.client.checkLoginAvailable()).toBe(false);
    expect(ctx.client.startLogin({ provider: 'google', consentAccepted: true })).toEqual({ ok: false, reason: 'unavailable' });
    progress(ctx.kv);
    ctx.clock.advance(120_000);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toEqual([]);
    expect(ctx.hidden).toEqual([]);
    expect(ctx.nav).toEqual([]);
    expect(ctx.clock.pending()).toBe(0);
  });

  it('giriş yalnızca izinli alan adında; Pages adresinde meta olsa da ağ çağrısı yok', async () => {
    const raw = memoryKV();
    raw.setItem(CLOUD_META_KEY, JSON.stringify({ userId: 'u-1', rev: 1, hash: null, dirty: true, lastSyncAt: null }));
    ctx = setup({ host: 'omerbekin.github.io', raw });
    await ctx.client.init();
    expect(ctx.client.isLoginAvailable()).toBe(false);
    expect(await ctx.client.checkLoginAvailable()).toBe(false);
    expect(ctx.server.s.calls).toEqual([]);
  });

  it('503 / ağ hatası girişi gizler', async () => {
    ctx = setup();
    ctx.server.s.unavailable = true;
    expect(await ctx.client.checkLoginAvailable()).toBe(false);
    expect(ctx.client.isLoginAvailable()).toBe(false);
  });

  it('rıza kutusu olmadan giriş reddedilir; rızayla tam sayfa yönlendirme', () => {
    ctx = setup();
    expect(ctx.client.startLogin({ provider: 'google', consentAccepted: false })).toEqual({ ok: false, reason: 'consent' });
    expect(ctx.nav).toEqual([]);
    expect(ctx.client.startLogin({ provider: 'discord', mode: 'link', consentAccepted: true })).toEqual({ ok: false, reason: 'not-signed-in' });
    expect(ctx.client.startLogin({ provider: 'google', consentAccepted: true })).toEqual({ ok: true });
    expect(ctx.nav).toEqual(['/auth/google?mode=login&return=%2F']);
  });

  it('ilk giriş, bulut boş: yerel yüklenir; adres temizlenir; auth olayı', async () => {
    const raw = memoryKV();
    progress(raw);
    ctx = setup({ raw, search: '?auth=ok&x=1' });
    await ctx.client.init();
    expect(ctx.urls).toEqual(['/?x=1']);
    expect(ctx.events.find((e) => e.type === 'auth')).toEqual({ type: 'auth', ok: true });
    const puts = ctx.server.s.calls.filter((c) => c.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(JSON.parse(puts[0]!.body!).baseRev).toBe(0);
    expect(ctx.server.s.save?.data['eov.campaign.v1']).toBe(raw.getItem('eov.campaign.v1'));
    expect(metaOf(raw)).toMatchObject({ userId: 'u-1', rev: 1, dirty: false });
    expect(ctx.client.getStatus()).toBe('idle');
    expect(ctx.client.getAccount()).toMatchObject({ signedIn: true, userId: 'u-1', supportId: 'u-1', providers: ['google'] });
  });

  it('?auth=error: hata olayı, ağ çağrısı yok', async () => {
    ctx = setup({ search: '?auth=error&reason=denied' });
    await ctx.client.init();
    expect(ctx.events).toContainEqual({ type: 'auth', ok: false, reason: 'denied' });
    expect(ctx.urls).toEqual(['/']);
    expect(ctx.server.s.calls).toEqual([]);
  });

  it('ilk giriş, yerel boş: bulut yalnızca güvenli anda iner', async () => {
    let safe = false;
    ctx = setup({ search: '?auth=ok', gate: () => safe });
    seedServer(ctx.server.s, 4, (kv) => progress(kv, 3));
    await ctx.client.init();
    expect(ctx.raw.getItem('eov.campaign.v1')).toBeNull();
    ctx.clock.advance(GATE_POLL_MS);
    await ctx.client.whenIdle();
    expect(ctx.raw.getItem('eov.campaign.v1')).toBeNull();
    safe = true;
    ctx.clock.advance(GATE_POLL_MS);
    await ctx.client.whenIdle();
    expect(ctx.raw.getItem('eov.campaign.v1')).toBe(ctx.server.s.save!.data['eov.campaign.v1']);
    expect(ctx.events).toContainEqual({ type: 'applied', source: 'download' });
    expect(metaOf(ctx.raw)).toMatchObject({ rev: 4, dirty: false });
    // indirme yazımı yükleme tetiklemez
    ctx.clock.advance(DEBOUNCE_MS * 2);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('ikinci cihaz (gerçek Worker GET /save biçimi, yerelde yalnızca tutorial): bulut iner, Continue kaydı görünür, bulut ezilmez', async () => {
    const raw = memoryKV();
    raw.setItem('eov.tutorial.v1', JSON.stringify({ v: 1, on: true, seen: [] }));
    ctx = setup({ raw, search: '?auth=ok' });
    seedServer(ctx.server.s, 9, (kv) => progress(kv, 3));
    const cloudCamp = ctx.server.s.save!.data['eov.campaign.v1'];
    await ctx.client.init();
    ctx.clock.advance(DEBOUNCE_MS * 2);
    await ctx.client.whenIdle();
    expect(raw.getItem('eov.campaign.v1')).toBe(cloudCamp);
    expect(readSaves(raw).file.slots[0]?.campaignId).toBe('c3');
    expect(ctx.events).toContainEqual({ type: 'applied', source: 'download' });
    expect(metaOf(raw)).toMatchObject({ rev: 9, dirty: false });
    expect(ctx.server.s.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(ctx.server.s.save!.rev).toBe(9);
  });

  it('0.9.8.8 hatasından kalan cihaz (meta rev = bulut rev, bulutun anahtarı yerelde yok): açılışta yeniden karar verilir, bulut iner', async () => {
    const raw = memoryKV();
    raw.setItem('eov.tutorial.v1', JSON.stringify({ v: 1, on: true, seen: [] }));
    raw.setItem(CLOUD_META_KEY, JSON.stringify({ userId: 'u-1', rev: 9, hash: null, dirty: false, lastSyncAt: '2026-10-24T21:00:00.000Z' }));
    ctx = setup({ raw });
    seedServer(ctx.server.s, 9, (kv) => progress(kv, 3));
    const cloudCamp = ctx.server.s.save!.data['eov.campaign.v1'];
    await ctx.client.init();
    ctx.clock.advance(DEBOUNCE_MS * 2);
    await ctx.client.whenIdle();
    expect(raw.getItem('eov.campaign.v1')).toBe(cloudCamp);
    expect(ctx.server.s.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(ctx.server.s.save!.rev).toBe(9);
  });

  it('eski üst düzey GET /save biçimi de okunur; data okunamayan yanıtta karar verilmez, yükleme yapılmaz', async () => {
    ctx = setup({ search: '?auth=ok' });
    seedServer(ctx.server.s, 2, (kv) => progress(kv, 4));
    ctx.server.s.getShape = 'legacy';
    await ctx.client.init();
    expect(readSaves(ctx.raw).file.slots[0]?.campaignId).toBe('c4');
    ctx.client.dispose();

    const raw = memoryKV();
    raw.setItem('eov.tutorial.v1', JSON.stringify({ v: 1, on: true, seen: [] }));
    ctx = setup({ raw, search: '?auth=ok' });
    seedServer(ctx.server.s, 5, (kv) => progress(kv, 6));
    ctx.server.s.getShape = 'broken';
    await ctx.client.init();
    ctx.clock.advance(DEBOUNCE_MS * 2);
    await ctx.client.whenIdle();
    expect(ctx.client.getStatus()).toBe('error');
    expect(ctx.client.getLastError()).toBe('save-shape');
    expect(raw.getItem('eov.campaign.v1')).toBeNull();
    expect(ctx.server.s.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(metaOf(raw)?.rev).toBe(0);
  });

  it('ilk giriş, iki tarafta ilerleme: soru; "cloud" seçimi buluttakini yazar, yereli yedekler', async () => {
    const raw = memoryKV();
    progress(raw, 1);
    const localCamp = raw.getItem('eov.campaign.v1');
    ctx = setup({ raw, search: '?auth=ok' });
    seedServer(ctx.server.s, 2, (kv) => progress(kv, 5));
    await ctx.client.init();
    expect(ctx.client.getStatus()).toBe('needs-choice');
    const p = ctx.client.getPending()!;
    expect(p.local.slots[0]?.campaignId).toBe('c1');
    expect(p.cloud.slots[0]?.campaignId).toBe('c5');
    expect(p.cloud.app).toBe('0.9.8.1');
    expect(p.pins).toEqual([]);
    expect(ctx.server.s.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(await p.resolve('cloud')).toEqual({ ok: true });
    expect(readSaves(raw).file.slots[0]?.campaignId).toBe('c5');
    expect(JSON.parse(raw.getItem(BACKUP_KEY)!).data['eov.campaign.v1']).toBe(localCamp);
    expect(ctx.client.getPending()).toBeNull();
    expect(ctx.client.getStatus()).toBe('idle');
    expect(metaOf(raw)).toMatchObject({ rev: 2, dirty: false });
    expect(await p.resolve('local')).toEqual({ ok: false, reason: 'stale' });
  });

  it('"local" seçimi yereli yükler, bulutu yerelde yedekler', async () => {
    const raw = memoryKV();
    progress(raw, 1);
    ctx = setup({ raw, search: '?auth=ok' });
    seedServer(ctx.server.s, 2, (kv) => progress(kv, 5));
    const cloudCamp = ctx.server.s.save!.data['eov.campaign.v1'];
    await ctx.client.init();
    expect(await ctx.client.getPending()!.resolve('local')).toEqual({ ok: true });
    expect(ctx.server.s.save!.rev).toBe(3);
    expect(ctx.server.s.save!.data['eov.campaign.v1']).toBe(raw.getItem('eov.campaign.v1'));
    expect(JSON.parse(raw.getItem(BACKUP_KEY)!).data['eov.campaign.v1']).toBe(cloudCamp);
    expect(metaOf(raw)).toMatchObject({ rev: 3, dirty: false });
  });

  /** Senkronlanmış oturum: yerel ve bulut aynı (rev 1). */
  async function synced() {
    const raw = memoryKV();
    progress(raw, 1);
    const c = setup({ raw, search: '?auth=ok' });
    await c.client.init();
    expect(metaOf(raw)).toMatchObject({ rev: 1, dirty: false });
    c.server.s.calls.length = 0;
    return c;
  }

  it('debounce: yazımlar 15 sn sessizlikten sonra tek PUT olur', async () => {
    ctx = await synced();
    ctx.clock.advance(10_000);
    progress(ctx.kv, 2, 1);
    expect(metaOf(ctx.raw)?.dirty).toBe(true);
    ctx.clock.advance(10_000);
    scores(ctx.raw); // sarılmamış depo: işaretlemez
    progress(ctx.kv, 3, 2);
    ctx.clock.advance(DEBOUNCE_MS - 1);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toEqual([]);
    ctx.clock.advance(1);
    await ctx.client.whenIdle();
    const puts = ctx.server.s.calls.filter((c) => c.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(JSON.parse(puts[0]!.body!).baseRev).toBe(1);
    expect(readSaves(ctx.raw).file.slots[2]?.campaignId).toBe('c3');
    expect(metaOf(ctx.raw)).toMatchObject({ rev: 2, dirty: false });
  });

  it('409 conflict: buluttaki kayıt yeniden okunur ve yeniden karar verilir (iki tarafta ilerleme -> soru)', async () => {
    ctx = await synced();
    seedServer(ctx.server.s, 5, (kv) => {
      progress(kv, 1);
      progress(kv, 9, 2);
    }); // başka cihaz
    progress(ctx.kv, 4, 1);
    ctx.clock.advance(DEBOUNCE_MS);
    await ctx.client.whenIdle();
    const seq = ctx.server.s.calls.map((c) => `${c.method} ${c.path}`);
    expect(seq).toEqual(['PUT /save', 'GET /save']);
    expect(ctx.client.getStatus()).toBe('needs-choice');
    expect(await ctx.client.getPending()!.resolve('local')).toEqual({ ok: true });
    expect(ctx.server.s.save!.rev).toBe(6);
  });

  it('409 schema-older: newer-version, sonraki yazımlar yüklenmez', async () => {
    ctx = await synced();
    ctx.server.s.save!.versions = { ...ctx.server.s.save!.versions, 'eov.campaign.v1': 999 };
    progress(ctx.kv, 4, 1);
    ctx.clock.advance(DEBOUNCE_MS);
    await ctx.client.whenIdle();
    expect(ctx.client.getStatus()).toBe('newer-version');
    ctx.server.s.calls.length = 0;
    progress(ctx.kv, 6, 2);
    ctx.clock.advance(DEBOUNCE_MS * 4);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toEqual([]);
  });

  it('çevrimdışı: durum offline, sessiz yeniden deneme bağlantı gelince yükler', async () => {
    ctx = await synced();
    ctx.server.s.offline = true;
    progress(ctx.kv, 4, 1);
    ctx.clock.advance(DEBOUNCE_MS);
    await ctx.client.whenIdle();
    expect(ctx.client.getStatus()).toBe('offline');
    expect(metaOf(ctx.raw)?.dirty).toBe(true);
    ctx.server.s.offline = false;
    ctx.clock.advance(15_000);
    await ctx.client.whenIdle();
    expect(ctx.client.getStatus()).toBe('idle');
    expect(ctx.server.s.save!.rev).toBe(2);
    expect(metaOf(ctx.raw)).toMatchObject({ rev: 2, dirty: false });
  });

  it('açılışta ağ yok: offline; meta kirliyse sonraki denemede yüklenir', async () => {
    const raw = memoryKV();
    progress(raw, 1);
    raw.setItem(CLOUD_META_KEY, JSON.stringify({ userId: 'u-1', rev: 0, hash: null, dirty: true, lastSyncAt: null }));
    ctx = setup({ raw });
    ctx.server.s.offline = true;
    await ctx.client.init();
    expect(ctx.client.getStatus()).toBe('offline');
    ctx.server.s.offline = false;
    ctx.clock.advance(15_000);
    await ctx.client.whenIdle();
    expect(ctx.server.s.save?.rev).toBe(1);
    expect(metaOf(raw)).toMatchObject({ rev: 1, dirty: false });
  });

  it('başka cihaz yükledi, bu cihaz temiz: açılışta indirilir', async () => {
    const raw = memoryKV();
    progress(raw, 1);
    raw.setItem(CLOUD_META_KEY, JSON.stringify({ userId: 'u-1', rev: 1, hash: null, dirty: false, lastSyncAt: null }));
    ctx = setup({ raw });
    seedServer(ctx.server.s, 3, (kv) => {
      progress(kv, 1);
      progress(kv, 8, 1);
    });
    await ctx.client.init();
    expect(readSaves(raw).file.slots[1]?.campaignId).toBe('c8');
    expect(metaOf(raw)).toMatchObject({ rev: 3, dirty: false });
  });

  it('sekme gizlenince keepalive PUT; 64 KB üstü gövde gönderilmez (meta kirli kalır)', async () => {
    ctx = await synced();
    ctx.clock.advance(6_000); // sunucu freni: iki yazım arası en az 5 sn
    progress(ctx.kv, 4, 1);
    ctx.hidden.forEach((f) => f());
    await ctx.client.whenIdle();
    const put = ctx.server.s.calls.find((c) => c.method === 'PUT')!;
    expect(put.keepalive).toBe(true);
    expect(metaOf(ctx.raw)).toMatchObject({ rev: 2, dirty: false });
    // büyük gövde
    ctx.server.s.calls.length = 0;
    ctx.clock.advance(10_000);
    ctx.kv.setItem('eov.tutorial.v1', JSON.stringify({ v: 1, on: true, seen: Array.from({ length: 9000 }, (_, i) => `lesson_${i}`) }));
    ctx.hidden.forEach((f) => f());
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toEqual([]);
    expect(metaOf(ctx.raw)?.dirty).toBe(true);
  });

  it('çıkış: logout çağrılır, meta silinir, sonra ağ çağrısı yok; yerel ilerleme kalır', async () => {
    ctx = await synced();
    expect(await ctx.client.signOut()).toEqual({ ok: true });
    expect(ctx.server.s.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['POST /auth/logout']);
    expect(ctx.raw.getItem(CLOUD_META_KEY)).toBeNull();
    expect(ctx.raw.getItem('eov.campaign.v1')).not.toBeNull();
    expect(ctx.client.getAccount().signedIn).toBe(false);
    ctx.server.s.calls.length = 0;
    progress(ctx.kv, 4, 1);
    ctx.clock.advance(DEBOUNCE_MS * 3);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toEqual([]);
  });

  it('çıkıştan önce bekleyen yükleme gönderilir', async () => {
    ctx = await synced();
    progress(ctx.kv, 4, 1);
    ctx.clock.advance(6_000);
    await ctx.client.signOut();
    expect(ctx.server.s.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['PUT /save', 'POST /auth/logout']);
  });

  it('hesap silme: DELETE {confirm}, meta silinir, yerel ilerleme kalır', async () => {
    ctx = await synced();
    expect(await ctx.client.deleteAccount()).toEqual({ ok: true });
    const del = ctx.server.s.calls.find((c) => c.method === 'DELETE')!;
    expect(del.path).toBe('/account');
    expect(JSON.parse(del.body!)).toEqual({ confirm: 'DELETE' });
    expect(ctx.raw.getItem(CLOUD_META_KEY)).toBeNull();
    expect(readSaves(ctx.raw).file.slots[0]?.campaignId).toBe('c1');
    expect(ctx.client.getAccount().signedIn).toBe(false);
  });

  it('görünen ad', async () => {
    ctx = await synced();
    expect(await ctx.client.setDisplayName('x')).toEqual({ ok: false, reason: 'bad-name' });
    expect(await ctx.client.setDisplayName('Omer')).toEqual({ ok: true, displayName: 'Omer' });
    expect(ctx.client.getAccount().displayName).toBe('Omer');
  });

  it('oturum süresi dolmuş (/auth/me user null): meta silinir', async () => {
    const raw = memoryKV();
    raw.setItem(CLOUD_META_KEY, JSON.stringify({ userId: 'u-1', rev: 1, hash: null, dirty: false, lastSyncAt: null }));
    ctx = setup({ raw });
    ctx.server.s.user = null;
    await ctx.client.init();
    expect(raw.getItem(CLOUD_META_KEY)).toBeNull();
    expect(ctx.client.getAccount().signedIn).toBe(false);
  });

  it('silme işareti: A yuvayı siler ve yükler; B (kendi değişikliğiyle) indirir ve aynı Ironman yuvasını kaldırır', async () => {
    // A ve B aynı başlangıç: Ironman yuvası 0 (c1), bulut rev 1
    const rawA = memoryKV();
    progress(rawA, 1, 0, 'ironman');
    const rawB = memoryKV();
    for (const k of ['eov.campaign.v1']) rawB.setItem(k, rawA.getItem(k)!);
    ctx = setup({ raw: rawA, search: '?auth=ok' });
    await ctx.client.init();
    const server = ctx.server;
    // A siler -> işaret + yükleme
    ctx.clock.advance(6_000);
    deleteSlot(ctx.kv, 0);
    ctx.clock.advance(DEBOUNCE_MS);
    await ctx.client.whenIdle();
    const put = JSON.parse(server.s.calls.filter((c) => c.method === 'PUT').at(-1)!.body!);
    expect(put.tombstones).toEqual([{ slot: 0, campaignId: 'c1', deletedAt: expect.any(Number) }]);
    expect(server.s.save!.rev).toBe(2);
    ctx.client.dispose();
    // B: son bildiği rev 1, sonra yerelde başka yuvada ilerleme (kirli)
    rawB.setItem(CLOUD_META_KEY, JSON.stringify({ userId: 'u-1', rev: 1, hash: null, dirty: false, lastSyncAt: null }));
    const b = setup({ raw: rawB });
    ctx = b;
    b.server.s.save = server.s.save;
    progress(b.kv, 4, 1);
    b.server.s.calls.length = 0;
    await b.client.init();
    expect(readSaves(rawB).file.slots[0]).toBeNull(); // silinen Ironman yuvası geri gelmedi, B'de de kalktı
    expect(readSaves(rawB).file.slots[1]?.campaignId).toBe('c4');
    expect(readTombstones(rawB).map((t) => [t.slot, t.campaignId])).toEqual([[0, 'c1']]);
    expect(b.events).toContainEqual({ type: 'applied', source: 'merge' });
    expect(b.server.s.save!.rev).toBe(3);
    expect(b.server.s.save!.tombstones?.map((t) => t.campaignId)).toEqual(['c1']);
  });

  it('yalnızca silme işareti farkı: temiz indirmeden sonra yereldeki fazla işaret yüklenir', async () => {
    const raw = memoryKV();
    progress(raw, 1);
    raw.setItem(CLOUD_META_KEY, JSON.stringify({ userId: 'u-1', rev: 1, hash: null, dirty: false, lastSyncAt: null }));
    raw.setItem(TOMB_KEY, JSON.stringify([{ slot: 3, campaignId: 'old', deletedAt: '2026-10-01T00:00:00.000Z' }]));
    ctx = setup({ raw });
    seedServer(ctx.server.s, 2, (kv) => {
      progress(kv, 1);
      progress(kv, 8, 1);
    });
    await ctx.client.init();
    expect(readSaves(raw).file.slots[1]?.campaignId).toBe('c8');
    const puts = ctx.server.s.calls.filter((c) => c.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(JSON.parse(puts[0]!.body!).tombstones).toEqual([{ slot: 3, campaignId: 'old', deletedAt: Date.parse('2026-10-01T00:00:00.000Z') }]);
    expect(metaOf(raw)).toMatchObject({ rev: 3, dirty: false });
  });

  // ------------------------------------------------ tanılama (hata raporu bağlantısı)

  /** Gerçek modüller; sync kısmı tek tek ezilebilir (koruma / uyumsuzluk yollarını zorlamak için). */
  const coreWith = (sync: Partial<typeof syncCore>) => async (): Promise<CloudCore> => ({ sync: { ...syncCore, ...sync }, slotSummaries: campaignSave.slotSummaries, loadRun: endlessSave.loadRun, loadScores: endlessSave.loadScores, memoryKV: campaignSave.memoryKV });

  /** Rapor / iz metninde kayıt içeriği, ad, kimlik yok. */
  function expectTechnicalOnly(c: ReturnType<typeof setup>, extra: string[] = []) {
    const text = [...c.logs, ...c.reports.map((r) => `${r.code} ${r.msg}`)].join('\n');
    const camp = c.server.s.save?.data['eov.campaign.v1'] ?? c.raw.getItem('eov.campaign.v1') ?? '';
    for (const bad of ['u-1', 'google', '"slots"', 'campaignId', 'archer', 'c3', ...extra]) expect(text).not.toContain(bad);
    if (camp) expect(text).not.toContain(camp.slice(0, 40));
  }

  it('tanılama: karar ve uygulama izleri yazılır (yalnızca teknik veri), hatasız akışta rapor yok', async () => {
    const raw = memoryKV();
    raw.setItem('eov.tutorial.v1', JSON.stringify({ v: 1, on: true, seen: [] }));
    ctx = setup({ raw, search: '?auth=ok' });
    ctx.server.s.user!.displayName = 'Sir Omerius';
    seedServer(ctx.server.s, 9, (kv) => progress(kv, 3));
    await ctx.client.init();
    expect(ctx.logs).toContain('sign-in ok');
    expect(ctx.logs.find((l) => l.startsWith('decision download'))).toMatch(/cloud rev 9 \[eov\.campaign\.v1=\d+\] slots 1, local \[eov\.tutorial\.v1=\d+\] slots 0/);
    expect(ctx.logs.find((l) => l.startsWith('apply ok'))).toMatch(/slots 1/);
    expect(ctx.reports).toEqual([]);
    expect(await ctx.client.signOut()).toEqual({ ok: true });
    expect(ctx.logs).toContain('session ended (sign-out)');
    expectTechnicalOnly(ctx, ['Sir Omerius', 'Omerius']);
  });

  it('tanılama: ?auth=error raporlanır (neden kodu güvenli), hata durumu kodla raporlanır, kod başına bir kez', async () => {
    ctx = setup({ search: '?auth=error&reason=denied<script>' });
    await ctx.client.init();
    expect(ctx.reports).toEqual([{ code: 'auth-error', msg: 'sign-in error deniedscript' }]);
    ctx.client.dispose();

    const raw = memoryKV();
    raw.setItem('eov.tutorial.v1', JSON.stringify({ v: 1, on: true, seen: [] }));
    ctx = setup({ raw, search: '?auth=ok' });
    seedServer(ctx.server.s, 5, (kv) => progress(kv, 6));
    ctx.server.s.getShape = 'broken';
    await ctx.client.init();
    await ctx.client.syncNow();
    expect(ctx.client.getLastError()).toBe('save-shape');
    expect(ctx.logs).toContain('status error save-shape');
    expect(ctx.reports).toEqual([{ code: 'save-shape', msg: 'status error save-shape' }]);
    expectTechnicalOnly(ctx);
  });

  it('tanılama: indirme sonrası yerelde yuva eksikse cloud_apply_mismatch raporu', async () => {
    const raw = memoryKV();
    raw.setItem('eov.tutorial.v1', JSON.stringify({ v: 1, on: true, seen: [] }));
    // applyBundle hiçbir şey yazmadan "ok" dönerse (bozuk yazım benzetimi)
    ctx = setup({ raw, search: '?auth=ok', loadCore: coreWith({ applyBundle: () => ({ ok: true, backedUp: false }) }) });
    seedServer(ctx.server.s, 4, (kv) => {
      progress(kv, 3);
      progress(kv, 7, 1);
    });
    await ctx.client.init();
    const r = ctx.reports.find((x) => x.code === 'cloud_apply_mismatch');
    expect(r?.msg).toBe('download applied cloud rev 4: bundle slots 2, cloud slots 2, local slots after 0');
    expectTechnicalOnly(ctx);
  });

  it('tanılama: bulutta ilerleme varken ilerlemesiz cihazda "upload" kararı PUT yapmaz, upload-guard raporlar', async () => {
    const raw = memoryKV();
    raw.setItem('eov.tutorial.v1', JSON.stringify({ v: 1, on: true, seen: [] }));
    ctx = setup({ raw, search: '?auth=ok', loadCore: coreWith({ decideSync: () => ({ kind: 'upload' }) }) });
    seedServer(ctx.server.s, 6, (kv) => progress(kv, 3));
    const before = JSON.stringify(ctx.server.s.save);
    await ctx.client.init();
    ctx.clock.advance(DEBOUNCE_MS * 2);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(JSON.stringify(ctx.server.s.save)).toBe(before);
    expect(ctx.client.getStatus()).toBe('error');
    expect(ctx.client.getLastError()).toBe('upload-guard');
    expect(ctx.reports.map((x) => x.code)).toEqual(['upload-guard']);
    expect(ctx.reports[0]!.msg).toMatch(/^upload blocked: cloud has progress, local none \(cloud rev 6 \[eov\.campaign\.v1=\d+\] slots 1, local \[eov\.tutorial\.v1=\d+\]\)$/);
    expectTechnicalOnly(ctx);
  });

  it('debug: çakışma benzetimi 409 sonrası yeniden karar verir (aynı içerik -> none)', async () => {
    ctx = await synced();
    await ctx.client.simulateConflict();
    expect(ctx.server.s.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['PUT /save', 'GET /save']);
    expect(ctx.client.getStatus()).toBe('idle');
    expect(metaOf(ctx.raw)).toMatchObject({ rev: 1, dirty: false });
  });
});

// ---------------------------------------------------------------- canlı çekme (tek cihaz)

describe('canlı çekme (GET /auth/me yoklaması)', () => {
  let ctx: ReturnType<typeof setup> | null = null;
  beforeEach(() => clearCloudDirty());
  afterEach(() => {
    ctx?.client.dispose();
    ctx = null;
    clearCloudDirty();
  });

  const meCalls = (c: ReturnType<typeof setup>) => c.server.s.calls.filter((x) => x.path === '/auth/me').length;

  async function synced(gate?: () => boolean) {
    const raw = memoryKV();
    progress(raw, 1);
    const c = setup({ raw, search: '?auth=ok', ...(gate ? { gate } : {}) });
    await c.client.init();
    c.server.s.calls.length = 0;
    return c;
  }

  it('girişliyken ve görünürken dakikada bir /auth/me; rev aynıysa başka çağrı yok', async () => {
    ctx = await synced();
    ctx.clock.advance(PULL_MS - 1);
    await ctx.client.whenIdle();
    expect(meCalls(ctx)).toBe(0);
    ctx.clock.advance(1);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['GET /auth/me']);
    for (let i = 0; i < 9; i++) {
      ctx.clock.advance(PULL_MS);
      await ctx.client.whenIdle();
    }
    expect(meCalls(ctx)).toBe(10);
    expect(ctx.server.s.calls.every((c) => c.path === '/auth/me')).toBe(true);
  });

  it('başka cihaz yükledi, bu cihaz temiz: yoklama farkı görür, buluttaki yalnızca güvenli anda iner', async () => {
    let safe = false;
    ctx = await synced(() => safe);
    seedServer(ctx.server.s, 4, (kv) => {
      progress(kv, 1);
      progress(kv, 8, 1);
    });
    ctx.clock.advance(PULL_MS);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['GET /auth/me', 'GET /save']);
    expect(readSaves(ctx.raw).file.slots[1]).toBeNull(); // ana menü değil: bekler
    safe = true;
    ctx.clock.advance(GATE_POLL_MS);
    await ctx.client.whenIdle();
    expect(readSaves(ctx.raw).file.slots[1]?.campaignId).toBe('c8');
    expect(metaOf(ctx.raw)).toMatchObject({ rev: 4, dirty: false });
    expect(ctx.events).toContainEqual({ type: 'applied', source: 'download' });
    expect(ctx.server.s.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('indirme ana menüyü beklerken yerelde oynandı: eski indirme uygulanmaz, yeniden karar (iki tarafta ilerleme -> soru)', async () => {
    let safe = false;
    ctx = await synced(() => safe);
    seedServer(ctx.server.s, 4, (kv) => {
      progress(kv, 1);
      progress(kv, 8, 1);
    });
    ctx.clock.advance(PULL_MS);
    await ctx.client.whenIdle();
    progress(ctx.kv, 5, 2); // oyuncu haritada oynuyor
    safe = true;
    ctx.clock.advance(GATE_POLL_MS);
    await ctx.client.whenIdle();
    expect(readSaves(ctx.raw).file.slots[2]?.campaignId).toBe('c5'); // yeni yerel ilerleme ezilmedi
    expect(ctx.client.getStatus()).toBe('needs-choice');
    expect(ctx.logs.some((l) => l.startsWith('local changed since download decision'))).toBe(true);
    expect(ctx.server.s.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('kirli cihaz: yoklama farkı görünce buluttakini okuyup karar verir (soru); karar beklerken yoklama yok', async () => {
    ctx = await synced();
    ctx.clock.advance(PULL_MS - 5_000);
    await ctx.client.whenIdle();
    seedServer(ctx.server.s, 4, (kv) => progress(kv, 9));
    progress(ctx.kv, 2, 1); // debounce 15 sn: yoklama (5 sn sonra) önce gelir
    ctx.clock.advance(5_000);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['GET /auth/me', 'GET /save']);
    expect(ctx.client.getStatus()).toBe('needs-choice');
    ctx.clock.advance(PULL_MS * 3);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toHaveLength(2);
  });

  it('sekme gizliyken çağrı yok; görünür olunca hemen bir yoklama (son yoklama yeniyse yok); hatada geri çekilme', async () => {
    ctx = await synced();
    ctx.vis.on = false;
    ctx.hidden.forEach((f) => f());
    ctx.clock.advance(PULL_MS * 10);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toEqual([]);
    ctx.vis.on = true;
    ctx.visible.forEach((f) => f());
    await ctx.client.whenIdle();
    expect(meCalls(ctx)).toBe(1);
    // son yoklamadan PULL_MIN_GAP_MS geçmeden yeniden görünür: çağrı yok
    ctx.clock.advance(PULL_MIN_GAP_MS - 1_000);
    ctx.visible.forEach((f) => f());
    await ctx.client.whenIdle();
    expect(meCalls(ctx)).toBe(1);
    // çevrimdışı: 60 sn, sonra 120 sn, sonra 240 sn aralık; bağlantı gelince normal
    ctx.server.s.offline = true;
    ctx.server.s.calls.length = 0;
    ctx.clock.advance(PULL_MS);
    await ctx.client.whenIdle();
    expect(meCalls(ctx)).toBe(1);
    ctx.clock.advance(PULL_MS * 2 - 1);
    await ctx.client.whenIdle();
    expect(meCalls(ctx)).toBe(1);
    ctx.clock.advance(1);
    await ctx.client.whenIdle();
    expect(meCalls(ctx)).toBe(2);
    ctx.server.s.offline = false;
    ctx.clock.advance(PULL_MS * 4);
    await ctx.client.whenIdle();
    expect(meCalls(ctx)).toBe(3);
    expect(ctx.client.getStatus()).toBe('idle');
  });

  it('çıkıştan sonra ve oturum düşünce yoklama yok', async () => {
    ctx = await synced();
    await ctx.client.signOut();
    ctx.server.s.calls.length = 0;
    ctx.clock.advance(PULL_MS * 5);
    ctx.visible.forEach((f) => f());
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toEqual([]);
    ctx.client.dispose();

    ctx = await synced();
    ctx.server.s.user = null; // oturum başka yerde kapandı
    ctx.clock.advance(PULL_MS);
    await ctx.client.whenIdle();
    expect(ctx.client.getAccount().signedIn).toBe(false);
    expect(ctx.raw.getItem(CLOUD_META_KEY)).toBeNull();
    ctx.server.s.calls.length = 0;
    ctx.clock.advance(PULL_MS * 5);
    await ctx.client.whenIdle();
    expect(ctx.server.s.calls).toEqual([]);
  });
});

// ---------------------------------------------------------------- iki cihaz, tek sunucu

/**
 * İki cihaz (masaüstü A, telefon B) aynı sahte sunucuyu paylaşır. Her cihazın kendi modül örneği vardır (vi.resetModules): bulut "kirli"
 * işareti kv-storage'da modül düzeyindedir (tarayıcıda sekme başına), tek örnekte iki cihaz birbirini kirletirdi.
 */
async function device(name: string, clock: ReturnType<typeof fakeClock>, server: ReturnType<typeof fakeServer>, raw: KVm, opts: { search?: string } = {}) {
  vi.resetModules();
  const C = await import('../src/cloud/cloud');
  const K = await import('../src/game/kv-storage');
  const kv = K.wrapKV(raw);
  const gate = { safe: true };
  const vis = { on: true };
  const hidden: Array<() => void> = [];
  const visible: Array<() => void> = [];
  const events: CloudEvent[] = [];
  const logs: string[] = [];
  const calls: string[] = [];
  const client = new C.CloudClient({
    diag: { log: (m) => logs.push(m), report: () => undefined },
    enabled: true,
    fetch: (url, init) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      return server.fetch(url, init);
    },
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    kv: () => kv,
    hostname: 'localhost',
    location: () => ({ pathname: '/', search: opts.search ?? '', hash: '' }),
    replaceUrl: () => undefined,
    navigate: () => undefined,
    onHidden: (fn) => hidden.push(fn),
    onVisible: (fn) => visible.push(fn),
    isVisible: () => vis.on,
    app: '0.9.8.1',
  });
  client.setApplyGate(() => gate.safe);
  client.subscribe((e) => events.push(e));
  const asks = () => events.filter((e) => e.type === 'pending' && e.pending).length;
  const hide = () => {
    vis.on = false;
    hidden.forEach((f) => f());
  };
  return { name, client, kv, raw, gate, vis, events, logs, calls, asks, hide };
}
type Device = Awaited<ReturnType<typeof device>>;

type AnyKV = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
/** Aynı seferde bir düğüm daha (yeni kayıt girdisi): yuva 0, c1. */
const playMore = (kv: AnyKV, at: string) => writeSave(kv, start('normal', 1, 0), 'manual', at);
const campOf = (raw: string) => {
  const kv = memoryKV();
  kv.setItem('eov.campaign.v1', raw);
  return readSaves(kv).file;
};

describe('iki cihaz, tek sunucu (çift çakışma penceresi, bayat sekme)', () => {
  const devs: Device[] = [];
  afterEach(() => {
    for (const d of devs.splice(0)) d.client.dispose();
  });
  const idle = async () => {
    for (let i = 0; i < 3; i++) for (const d of devs) await d.client.whenIdle();
  };
  const tick = async (clock: ReturnType<typeof fakeClock>, ms: number) => {
    clock.advance(ms);
    await idle();
  };
  /** Sekme öldü (temizlik yok); aynı depo yeni bir örnekle açılır. */
  const reopen = async (d: Device, clock: ReturnType<typeof fakeClock>, server: ReturnType<typeof fakeServer>, name: string) => {
    d.client.dispose();
    devs.splice(devs.indexOf(d), 1);
    const n = await device(name, clock, server, d.raw);
    devs.push(n);
    return n;
  };

  /** A (masaüstü) yükler, B (telefon, boş) indirir: ikisi de rev 1. */
  async function pair() {
    const clock = fakeClock();
    const server = fakeServer(clock);
    const rawA = memoryKV();
    progress(rawA, 1);
    const A = await device('A', clock, server, rawA, { search: '?auth=ok' });
    devs.push(A);
    await A.client.init();
    const B = await device('B', clock, server, memoryKV(), { search: '?auth=ok' });
    devs.push(B);
    await B.client.init();
    expect(server.s.save!.rev).toBe(1);
    expect(B.raw.getItem('eov.campaign.v1')).toBe(rawA.getItem('eov.campaign.v1'));
    expect(metaOf(B.raw)).toMatchObject({ rev: 1, dirty: false });
    return { clock, server, A, B };
  }

  it('bayat masaüstü canlı çekmeyle telefonun ilerlemesini alır; sonraki rastlantısal yazım (Continue) çakışmasız yüklenir', async () => {
    const { clock, server, A, B } = await pair();
    await tick(clock, 6_000);
    playMore(B.kv, '2026-10-24T12:01:00Z');
    await tick(clock, DEBOUNCE_MS);
    expect(server.s.save!.rev).toBe(2);
    const mobile = server.s.save!.data['eov.campaign.v1'];
    await tick(clock, PULL_MS); // A yoklar, temiz: indirir (ana menü)
    expect(A.raw.getItem('eov.campaign.v1')).toBe(mobile);
    campaignSave.markPlayed(A.kv, 0, '2026-10-24T12:03:00Z');
    await tick(clock, DEBOUNCE_MS);
    expect(server.s.save!.rev).toBe(3);
    expect(campOf(server.s.save!.data['eov.campaign.v1']!).slots[0]!.saves).toHaveLength(2); // telefonun düğümü bulutta kaldı
    expect(A.asks() + B.asks()).toBe(0);
  });

  it('bayat masaüstü (yoklama kaçtı) rastlantısal yazımla yüklemeye kalkar: 409 -> soru; telefonun ilerlemesi sessizce ezilmez', async () => {
    const { clock, server, A, B } = await pair();
    A.hide();
    await tick(clock, 6_000);
    playMore(B.kv, '2026-10-24T12:01:00Z');
    await tick(clock, DEBOUNCE_MS);
    await tick(clock, 6_000);
    playMore(B.kv, '2026-10-24T12:02:00Z');
    await tick(clock, DEBOUNCE_MS);
    expect(server.s.save!.rev).toBe(3);
    const mobile = JSON.stringify(server.s.save);
    A.vis.on = true; // görünür ama olay gelmedi: A hâlâ rev 1 sanıyor
    A.gate.safe = false; // haritada
    campaignSave.markPlayed(A.kv, 0, '2026-10-24T12:03:00Z');
    await tick(clock, DEBOUNCE_MS);
    expect(A.calls.slice(-2)).toEqual(['PUT /save', 'GET /save']);
    expect(JSON.stringify(server.s.save)).toBe(mobile); // bulut değişmedi
    A.gate.safe = true;
    await tick(clock, GATE_POLL_MS);
    expect(A.client.getStatus()).toBe('needs-choice');
    expect(JSON.stringify(server.s.save)).toBe(mobile);
  });

  it('çift çakışma: telefon kirli açılır, çakışma, "local" seçilir -> arada bulut yalnızca rev/silme işareti değiştiyse İKİNCİ KEZ SORULMAZ', async () => {
    const { clock, server, A, B } = await pair();
    // A (masaüstü) kendi ilerlemesini yükledi (rev 2)
    await tick(clock, 6_000);
    progress(A.kv, 4, 1);
    await tick(clock, DEBOUNCE_MS);
    expect(server.s.save!.rev).toBe(2);
    // B (telefon) yoklamadan önce oynadı ve sekme öldü (yüklenmemiş ilerleme, meta kirli)
    playMore(B.kv, '2026-10-24T12:01:00Z');
    expect(metaOf(B.raw)?.dirty).toBe(true);
    const B2 = await reopen(B, clock, server, 'B2');
    // B yeniden açılır: bulut rev 2 (A), yerel kirli -> soru (meşru: iki tarafta farklı ilerleme)
    await B2.client.init();
    expect(B2.asks()).toBe(1);
    const p = B2.client.getPending()!;
    // Karar beklerken öbür cihaz VERİYİ DEĞİŞTİRMEYEN bir yükleme yaptı (ör. yalnızca silme işareti): rev 3, aynı hash
    const s = server.s.save!;
    server.s.save = { ...s, rev: s.rev + 1, updatedAt: clock.now(), tombstones: [{ slot: 5, campaignId: 'old', deletedAt: T0 - 86_400_000 }] };
    await tick(clock, 6_000);
    expect(await p.resolve('local')).toEqual({ ok: true });
    await idle();
    expect(B2.asks()).toBe(1); // ikinci pencere yok (eski kod: PUT 409 -> yeniden okuma -> yeniden soru)
    expect(B2.logs.some((l) => l.includes('unchanged since last sync'))).toBe(true);
    expect(server.s.save!.rev).toBe(4);
    expect(server.s.save!.data['eov.campaign.v1']).toBe(B2.raw.getItem('eov.campaign.v1'));
    expect(server.s.save!.tombstones?.map((t) => t.campaignId)).toEqual(['old']); // öbür cihazın işareti korunur
    expect(metaOf(B2.raw)).toMatchObject({ rev: 4, dirty: false });
    // A canlı çekmeyle telefonun seçtiğini alır (temiz, soru yok)
    await tick(clock, PULL_MS);
    expect(A.raw.getItem('eov.campaign.v1')).toBe(server.s.save!.data['eov.campaign.v1']);
    expect(A.asks()).toBe(0);
  });

  it('çift çakışma (meşru): karar beklerken öbür cihaz bulutu GERÇEKTEN yeniden değiştirdiyse yeniden sorulur', async () => {
    const { clock, server, A, B } = await pair();
    await tick(clock, 6_000);
    progress(A.kv, 4, 1);
    await tick(clock, DEBOUNCE_MS);
    expect(server.s.save!.rev).toBe(2);
    playMore(B.kv, '2026-10-24T12:01:00Z');
    const B2 = await reopen(B, clock, server, 'B2');
    await B2.client.init();
    expect(B2.asks()).toBe(1);
    const p = B2.client.getPending()!;
    progress(A.kv, 6, 2); // A yine oynar ve yükler (rev 3, farklı veri)
    await tick(clock, DEBOUNCE_MS);
    expect(server.s.save!.rev).toBe(3);
    expect(await p.resolve('local')).toEqual({ ok: true });
    await idle();
    expect(B2.asks()).toBe(2);
  });
});
