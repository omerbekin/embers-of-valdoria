import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { autoResolve, deleteSlot, memoryKV, newCampaign, pickHero, readSaves, writeSave, type CampaignMode } from '../src/campaign';
import { addScore, newRun, saveScores, scoreOf } from '../src/endless';
import { clearCloudDirty, wrapKV } from '../src/game/kv-storage';
import { BACKUP_KEY } from '../src/cloud/keys';
import { readTombstones, TOMB_KEY } from '../src/cloud/tombstones';
import { CLOUD_META_KEY, CloudClient, DEBOUNCE_MS, GATE_POLL_MS, type CloudEvent, type FetchLike } from '../src/cloud/cloud';
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
    if (key === 'GET /save') return res(200, s.save ? { save: meta(), data: s.save.data, tombstones: s.save.tombstones ?? [] } : { save: null });
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

function setup(opts: { search?: string; host?: string; raw?: KVm; gate?: () => boolean } = {}) {
  const clock = fakeClock();
  const server = fakeServer(clock);
  const raw = opts.raw ?? memoryKV();
  const kv = wrapKV(raw);
  const hidden: Array<() => void> = [];
  const nav: string[] = [];
  const urls: string[] = [];
  const events: CloudEvent[] = [];
  const client = new CloudClient({
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
    app: '0.9.8.1',
  });
  if (opts.gate) client.setApplyGate(opts.gate);
  client.subscribe((e) => events.push(e));
  return { clock, server, raw, kv, client, hidden, nav, urls, events };
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

  it('debug: çakışma benzetimi 409 sonrası yeniden karar verir (aynı içerik -> none)', async () => {
    ctx = await synced();
    await ctx.client.simulateConflict();
    expect(ctx.server.s.calls.map((c) => `${c.method} ${c.path}`)).toEqual(['PUT /save', 'GET /save']);
    expect(ctx.client.getStatus()).toBe('idle');
    expect(metaOf(ctx.raw)).toMatchObject({ rev: 1, dirty: false });
  });
});
