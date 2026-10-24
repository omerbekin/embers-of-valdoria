import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { autoResolve, getMap, memoryKV, newCampaign, pickHero, readSaves, SAVE_KEY, SAVE_VERSION, writeSave, type CampaignMode, type CampaignState } from '../src/campaign';
import { addScore, newRun, RUN_KEY, SAVE_VERSION as RUN_VERSION, saveRun, saveScores, scoreOf, SCORES_KEY, SCORES_VERSION, parseRun, loadScores } from '../src/endless';
import { TUTORIAL_KEY } from '../src/tutorial/store';
import {
  applyBundle,
  BACKUP_KEY,
  buildBundle,
  bundleFromData,
  decideSync,
  fastForward,
  mergeTutorialRaw,
  readBackup,
  resolveConflict,
  SUPPORTED_VERSIONS,
  SYNC_KEYS,
  validateBundle,
  type SyncBundle,
  type SyncData,
} from '../src/cloud/sync-core';
import { killedBy, readTombstones } from '../src/cloud/tombstones';
import { wrapKV } from '../src/game/kv-storage';
import { deleteSlot } from '../src/campaign';
import { leveledRun } from './level-helpers';

const NOW = '2026-10-24T12:00:00.000Z';
const start = (mode: CampaignMode, seed = 10, slot = 0) => autoResolve(pickHero(newCampaign({ mode, seed, slot, difficulty: 'medium', campaignId: `c${seed}` }), 'archer'));
type KVm = ReturnType<typeof memoryKV>;

/** Gerçek kayıt yollarıyla dolu bir depo: sefer (Normal + Ironman), süren Endless koşusu, skor, tutorial. */
function fullKV(): KVm {
  const kv = memoryKV();
  writeSave(kv, start('normal', 1, 0), 'manual', '2026-10-20T10:00:00Z');
  writeSave(kv, start('ironman', 2, 1), 'auto', '2026-10-20T11:00:00Z');
  const run = leveledRun(newRun(7, ['warrior', 'archer', 'mage', 'druid'], '2026-10-09T00:00:00.000Z'));
  saveRun(kv, run);
  saveScores(kv, addScore([], scoreOf(run, '2026-10-09T00:00:00.000Z')).list);
  kv.setItem(TUTORIAL_KEY, JSON.stringify({ v: 1, on: true, seen: ['turn_bar'] }));
  return kv;
}

const bundleOf = (kv: KVm | null) => buildBundle(kv, 'test', NOW);
const withData = (b: SyncBundle, patch: Partial<SyncData>): SyncBundle => bundleFromData({ ...b.data, ...patch }, 'test', NOW);

/** Kayıttaki durumu değiştirip aynı yuvaya yeni kayıt yazar. */
function writeState(kv: KVm, s: CampaignState): void {
  writeSave(kv, s, 'auto', '2026-10-21T10:00:00Z');
}
const nodeIds = (s: CampaignState) => getMap(s.mapId).nodes.map((n) => n.id);
const advanced = (s: CampaignState, extra: number): CampaignState => ({ ...s, cleared: [...new Set([...(s.cleared ?? []), ...nodeIds(s).slice(0, extra + (s.cleared?.length ?? 0))])] });
const dead = (s: CampaignState): CampaignState => ({ ...s, roster: s.roster.map((h) => ({ ...h, hpRatio: 0, alive: false })) });

describe('sync-core: paket', () => {
  it('anahtar adları okuyucuların sabitleriyle aynı; desteklenen sürümler okuyucularınki', () => {
    expect([...SYNC_KEYS]).toEqual([SAVE_KEY, RUN_KEY, SCORES_KEY, TUTORIAL_KEY]);
    expect(SUPPORTED_VERSIONS).toEqual({ [SAVE_KEY]: SAVE_VERSION, [RUN_KEY]: RUN_VERSION, [SCORES_KEY]: SCORES_VERSION, [TUTORIAL_KEY]: 1 });
  });

  it('gidiş-dönüş: gerçek kayıtlar paketlenip başka depoya uygulanınca ham dizgiler ve okunan sonuç birebir aynı', () => {
    const src = fullKV();
    const b = bundleOf(src);
    expect(b.versions).toEqual({ [SAVE_KEY]: SAVE_VERSION, [RUN_KEY]: RUN_VERSION, [SCORES_KEY]: SCORES_VERSION, [TUTORIAL_KEY]: 1 });
    expect(validateBundle(JSON.parse(JSON.stringify(b)))).toEqual({ ok: true });
    const dst = memoryKV();
    dst.setItem('eov.settings.v1', '{"x":1}');
    expect(applyBundle(dst, JSON.parse(JSON.stringify(b)), 'test', NOW)).toEqual({ ok: true, backedUp: false });
    for (const k of SYNC_KEYS) expect(dst.getItem(k)).toBe(src.getItem(k));
    expect(readSaves(dst).file).toEqual(readSaves(src).file);
    expect(parseRun(dst.getItem(RUN_KEY))).toEqual(parseRun(src.getItem(RUN_KEY)));
    expect(loadScores(dst)).toHaveLength(1);
    expect(dst.getItem('eov.settings.v1')).toBe('{"x":1}'); // ayarlar dokunulmaz
    expect(Object.keys(b.data).sort()).toEqual([...SYNC_KEYS].sort()); // ayarlar pakete girmez
  });

  it('daha yeni şemadan gelen paket reddedilir ve uygulanmaz (her anahtar için)', () => {
    const b = bundleOf(fullKV());
    const bump = (raw: string, field: 'version' | 'v') => JSON.stringify({ ...JSON.parse(raw), [field]: JSON.parse(raw)[field] + 1 });
    for (const k of SYNC_KEYS) {
      const nb = withData(b, { [k]: bump(b.data[k]!, k === TUTORIAL_KEY ? 'v' : 'version') });
      expect(validateBundle(nb)).toEqual({ ok: false, reason: 'newer-schema', key: k });
      const dst = fullKV();
      const before = bundleOf(dst).data;
      expect(applyBundle(dst, nb, 'test', NOW)).toMatchObject({ ok: false, reason: 'newer-schema' });
      expect(bundleOf(dst).data).toEqual(before);
      expect(dst.getItem(BACKUP_KEY)).toBeNull();
    }
    expect(decideSync(bundleOf(memoryKV()), withData(b, { [SAVE_KEY]: bump(b.data[SAVE_KEY]!, 'version') }))).toEqual({ kind: 'refuse', reason: 'newer-schema', key: SAVE_KEY });
  });

  it('bozuk sefer kaydı reddedilir (JSON değil, bozuk yuva, geçersiz kayıt girdisi); bildirilen sürüm uyuşmazsa da', () => {
    const b = bundleOf(fullKV());
    expect(validateBundle(withData(b, { [SAVE_KEY]: '{not json' }))).toEqual({ ok: false, reason: 'corrupt', key: SAVE_KEY });
    const file = JSON.parse(b.data[SAVE_KEY]!);
    expect(validateBundle(withData(b, { [SAVE_KEY]: JSON.stringify({ ...file, slots: ['junk', ...file.slots.slice(1)] }) }))).toMatchObject({ ok: false, reason: 'corrupt', key: SAVE_KEY });
    file.slots[0].saves[0].state = { version: 2, at: 'nowhere' };
    expect(validateBundle(withData(b, { [SAVE_KEY]: JSON.stringify(file) }))).toMatchObject({ ok: false, reason: 'corrupt', key: SAVE_KEY });
    expect(validateBundle({ ...b, versions: { ...b.versions, [SAVE_KEY]: 3 } })).toMatchObject({ ok: false, reason: 'corrupt', key: SAVE_KEY });
    expect(validateBundle(withData(b, { [RUN_KEY]: '{"version":7,"run":{}}' }))).toMatchObject({ ok: false, reason: 'corrupt', key: RUN_KEY });
    expect(validateBundle({ ...b, format: 2 })).toEqual({ ok: false, reason: 'format' });
    expect(validateBundle(null)).toEqual({ ok: false, reason: 'format' });
    const dst = fullKV();
    expect(applyBundle(dst, withData(b, { [SAVE_KEY]: '{not json' }), 'test', NOW)).toMatchObject({ ok: false, reason: 'corrupt' });
    expect(dst.getItem(BACKUP_KEY)).toBeNull();
  });

  it('üzerine yazmadan önce yerel ilerleme yedeklenir; yedek okunur ve geri yüklenebilir; yedek yazılamazsa hiçbir şey yazılmaz', () => {
    const local = memoryKV();
    writeSave(local, start('normal', 5, 2), 'manual', '2026-10-22T10:00:00Z');
    const localBefore = bundleOf(local).data;
    const cloud = bundleOf(fullKV());
    expect(applyBundle(local, cloud, 'test', NOW)).toEqual({ ok: true, backedUp: true });
    expect(local.getItem(SAVE_KEY)).toBe(cloud.data[SAVE_KEY]);
    const bk = readBackup(local)!;
    expect(bk.data).toEqual(localBefore);
    expect(applyBundle(local, bk, 'test', NOW).ok).toBe(true);
    expect(bundleOf(local).data).toEqual(localBefore);
    expect(readBackup(local)!.data).toEqual(cloud.data); // geri yükleme de önce yedekler (takas)

    const full = memoryKV();
    writeSave(full, start('normal', 5, 2), 'manual');
    const raw = full.getItem(SAVE_KEY);
    const quota = { ...full, setItem: (k: string, v: string) => (k === BACKUP_KEY ? (() => { throw new Error('quota'); })() : full.setItem(k, v)) };
    expect(applyBundle(quota, cloud, 'test', NOW)).toEqual({ ok: false, reason: 'backup-failed' });
    expect(full.getItem(SAVE_KEY)).toBe(raw);
  });
});

describe('sync-core: decideSync doğruluk tablosu', () => {
  const empty = () => bundleOf(memoryKV());
  const tutOnly = () => {
    const kv = memoryKV();
    kv.setItem(TUTORIAL_KEY, JSON.stringify({ v: 1, on: true, seen: ['attack'] }));
    return bundleOf(kv);
  };
  const prog = (seed: number) => {
    const kv = memoryKV();
    writeSave(kv, start('normal', seed, 0), 'manual', '2026-10-20T10:00:00Z');
    return bundleOf(kv);
  };

  it('bulut yok / boş', () => {
    expect(decideSync(empty(), null)).toEqual({ kind: 'none' });
    expect(decideSync(empty(), empty())).toEqual({ kind: 'none' });
    expect(decideSync(prog(1), null)).toEqual({ kind: 'upload' });
    expect(decideSync(tutOnly(), empty())).toEqual({ kind: 'upload' });
  });

  it('tek tarafta ilerleme; aynı veri; ilerlemesiz farklar', () => {
    expect(decideSync(empty(), prog(1))).toEqual({ kind: 'download' });
    expect(decideSync(tutOnly(), prog(1))).toEqual({ kind: 'download' });
    expect(decideSync(prog(1), tutOnly())).toEqual({ kind: 'upload' });
    expect(decideSync(prog(1), prog(1))).toEqual({ kind: 'none' });
    // yalnızca tutorial farklı: birleştirilir (kapalı kazanır, görülenler birleşim), sorulmaz
    const tm = decideSync(tutOnly(), withData(tutOnly(), { [TUTORIAL_KEY]: JSON.stringify({ v: 1, on: false, seen: [] }) }));
    expect(tm.kind).toBe('merge');
    if (tm.kind === 'merge') expect(JSON.parse(tm.bundle.data[TUTORIAL_KEY]!)).toEqual({ v: 1, on: false, seen: ['attack'] });
    expect(decideSync(empty(), tutOnly())).toEqual({ kind: 'download' });
  });

  it('iki tarafta da ilerleme var: her zaman sorulur (zaman damgası karar vermez)', () => {
    const a = prog(1);
    const b = { ...prog(2), createdAt: '2030-01-01T00:00:00.000Z' };
    expect(decideSync(a, b)).toEqual({ kind: 'ask', pins: [] });
    expect(decideSync(b, a)).toEqual({ kind: 'ask', pins: [] });
    expect(resolveConflict(a, b, 'local', 'test', NOW).data).toEqual(a.data);
    expect(resolveConflict(a, b, 'cloud', 'test', NOW).data).toEqual(b.data);
  });

  it('bulut paketi geçersizse refuse', () => {
    expect(decideSync(prog(1), withData(prog(2), { [SAVE_KEY]: '{not json' }))).toMatchObject({ kind: 'refuse', reason: 'corrupt' });
    expect(fastForward(prog(1), withData(prog(2), { [SAVE_KEY]: '{not json' }))).toMatchObject({ kind: 'refuse', reason: 'corrupt' });
  });

  it('fastForward (bulut verisi son senkrondan beri değişmedi): soru yok, yerel kalır; buluttaki silme işareti birleşir (merge)', () => {
    const a = prog(1);
    const b = prog(2);
    expect(decideSync(a, b).kind).toBe('ask');
    expect(fastForward(a, b, 'test', NOW)).toEqual({ kind: 'upload' });
    expect(fastForward(a, a, 'test', NOW)).toEqual({ kind: 'none' });
    const tomb = { slot: 5, campaignId: 'old', deletedAt: '2026-10-01T00:00:00.000Z' };
    const r = fastForward(a, { ...b, tombstones: [tomb] }, 'test', NOW);
    expect(r).toMatchObject({ kind: 'merge', pins: [] });
    if (r.kind === 'merge') {
      expect(r.bundle.data).toEqual(a.data);
      expect(r.bundle.tombstones).toEqual([tomb]);
    }
  });
});

describe('sync-core: Ironman kuralı (sıkı)', () => {
  const ironKV = (s: CampaignState, extra?: (kv: KVm) => void) => {
    const kv = memoryKV();
    writeState(kv, s);
    extra?.(kv);
    return kv;
  };
  const base = start('ironman', 3, 0);

  it('aynı Ironman seferi: daha ilerlemiş taraf kazanır, az ilerlemiş taraf hiç sunulmaz (yalnızca o fark varsa otomatik)', () => {
    const behind = bundleOf(ironKV(base));
    const ahead = bundleOf(ironKV(advanced(base, 2)));
    expect(decideSync(behind, ahead)).toEqual({ kind: 'download' });
    expect(decideSync(ahead, behind)).toEqual({ kind: 'upload' });
  });

  it('eşit temizlenmiş düğüm: otomatik kazanan yok (takım leveli yok), oyuncu seçer ve iki taraf da sunulur', () => {
    const lo = bundleOf(ironKV(base));
    const hi = bundleOf(ironKV({ ...base, roster: base.roster.map((h) => ({ ...h, level: h.level + 1, xp: 0 })) }));
    expect(decideSync(lo, hi)).toEqual({ kind: 'ask', pins: [] });
    expect(resolveConflict(lo, hi, 'local', 'test', NOW).data).toEqual(lo.data);
    expect(resolveConflict(lo, hi, 'cloud', 'test', NOW).data).toEqual(hi.data);
  });

  it('ölü Ironman koşusu yaşayanın üstüne yazılmaz (daha ilerlemiş olsa bile)', () => {
    const living = bundleOf(ironKV(base));
    const deadAhead = bundleOf(ironKV(dead(advanced(base, 3))));
    expect(decideSync(living, deadAhead)).toEqual({ kind: 'upload' });
    expect(decideSync(deadAhead, living)).toEqual({ kind: 'download' });
  });

  it('başka farklar da varsa sorulur, ama hangi taraf seçilirse seçilsin Ironman yuvası ilerlemiş taraftan gelir', () => {
    const normal = start('normal', 4, 1);
    const local = bundleOf(ironKV(advanced(base, 2)));
    const cloud = bundleOf(ironKV(base, (kv) => writeSave(kv, normal, 'manual', '2026-10-21T09:00:00Z')));
    expect(decideSync(local, cloud)).toEqual({ kind: 'ask', pins: [{ slot: 0, keep: 'local', reason: 'more-advanced' }] });
    const pickCloud = resolveConflict(local, cloud, 'cloud', 'test', NOW);
    const kv = memoryKV();
    expect(applyBundle(kv, pickCloud, 'test', NOW).ok).toBe(true);
    const file = readSaves(kv).file;
    expect(file.slots[0]).toEqual(readSaves(ironKV(advanced(base, 2))).file.slots[0]);
    expect(file.slots[1]?.campaignId).toBe('c4');
    expect(readSaves(kv).corrupt).toBe(false);
  });

  it('farklı Ironman seferleri: yalnızca ölü/yaşayan kuralı; ikisi de yaşıyorsa sorulur', () => {
    const other = start('ironman', 9, 0);
    expect(decideSync(bundleOf(ironKV(base)), bundleOf(ironKV(other)))).toEqual({ kind: 'ask', pins: [] });
    expect(decideSync(bundleOf(ironKV(base)), bundleOf(ironKV(dead(other))))).toEqual({ kind: 'upload' });
  });
});

describe('sync-core: silinen yuva geri gelmez (silme işaretleri)', () => {
  const base = start('ironman', 3, 0);
  /** A ve B aynı senkronlanmış durumla başlar; A sarılı depo üzerinden oynar (silme işareti sarmalayıcıda yazılır). */
  function synced() {
    const a = memoryKV();
    writeState(a, base);
    const cloud = bundleOf(a);
    const b = memoryKV();
    expect(applyBundle(b, cloud, 'test', NOW).ok).toBe(true);
    return { a, wa: wrapKV(a), b, cloud };
  }
  const decideAndApply = (kv: KVm, cloud: SyncBundle) => {
    const d = decideSync(bundleOf(kv), cloud, 'test', NOW);
    if (d.kind === 'download') expect(applyBundle(kv, cloud, 'test', NOW).ok).toBe(true);
    if (d.kind === 'merge') expect(applyBundle(kv, d.bundle, 'test', NOW).ok).toBe(true);
    return d;
  };

  it("A'da silinen Ironman yuvası B'de geri gelmez; B'den de silinir", () => {
    const { a, wa, b, cloud } = synced();
    deleteSlot(wa, 0);
    expect(readTombstones(a)).toEqual([{ slot: 0, campaignId: 'c3', deletedAt: expect.any(String) }]);
    expect(decideSync(bundleOf(a), cloud, 'test', NOW)).toEqual({ kind: 'upload' });
    const cloud2 = bundleOf(a);
    expect(cloud2.tombstones).toHaveLength(1);
    expect(decideAndApply(b, cloud2).kind).toMatch(/download|merge/);
    expect(readSaves(b).file.slots[0]).toBeNull();
    expect(readTombstones(b)).toEqual(cloud2.tombstones);
    // B'nin sonraki yüklemesi işareti taşır; A ile aynı (artık senkron)
    expect(decideSync(bundleOf(b), cloud2, 'test', NOW).kind).toMatch(/none|upload/);
    expect(readSaves(b).file.slots).toEqual(readSaves(a).file.slots);
  });

  it('B başka yuvada ilerlemişse: silinen yuva çıkarılır, B in kendi ilerlemesi kalır (merge + yükleme)', () => {
    const { wa, a, b } = synced();
    writeSave(b, start('normal', 4, 1), 'manual', '2026-10-22T09:00:00Z');
    deleteSlot(wa, 0);
    const d = decideAndApply(b, bundleOf(a));
    expect(d.kind).toBe('merge');
    expect(readSaves(b).file.slots[0]).toBeNull();
    expect(readSaves(b).file.slots[1]?.campaignId).toBe('c4');
  });

  it('silinmeden SONRA aynı yuvada kurulan yeni Ironman seferi işarete rağmen kalır ve B eski seferi bırakır', () => {
    const { a, wa, b } = synced();
    deleteSlot(wa, 0);
    const fresh = start('ironman', 11, 0);
    writeSave(wa, fresh, 'auto', '2099-01-01T00:00:00Z');
    const cloud2 = bundleOf(a);
    expect(decideSync(bundleOf(a), cloud2, 'test', NOW)).toEqual({ kind: 'none' }); // kendi işareti yeni seferi silmez
    expect(decideAndApply(b, cloud2).kind).toBe('download');
    expect(readSaves(b).file.slots[0]?.campaignId).toBe('c11');
    // aynı campaignId ama silinmeden sonra kurulmuş (startedAt > deletedAt) da kalır
    const t = readTombstones(a)[0]!;
    expect(killedBy(t, 0, { campaignId: 'c3', startedAt: '2000-01-01T00:00:00Z' })).toBe(true);
    expect(killedBy(t, 0, { campaignId: 'c3', startedAt: '2099-01-01T00:00:00Z' })).toBe(false);
    expect(killedBy(t, 1, { campaignId: 'c3', startedAt: '2000-01-01T00:00:00Z' })).toBe(false);
  });

  it('senkron geçmişi olmayan yeni cihaz: boş yuva silme sayılmaz, bulut normal iner', () => {
    const { cloud } = synced();
    const dev = memoryKV();
    expect(decideAndApply(dev, cloud).kind).toBe('download');
    expect(readSaves(dev).file.slots[0]?.campaignId).toBe('c3');
    // yerelde başka yuvada ilerleme olsa da Ironman yuvası korunur (boş != silindi)
    const dev2 = memoryKV();
    writeSave(dev2, start('normal', 4, 1), 'manual', '2026-10-21T09:00:00Z');
    expect(decideSync(bundleOf(dev2), cloud, 'test', NOW)).toEqual({ kind: 'ask', pins: [{ slot: 0, keep: 'cloud', reason: 'not-deleted' }] });
  });

  it('bozuk silme işareti listesi paketi reddettirir', () => {
    const { cloud } = synced();
    expect(validateBundle({ ...cloud, tombstones: [{ slot: 'x' }] })).toEqual({ ok: false, reason: 'format' });
  });
});

describe('anahtar listesi anlık görüntüsü (yeni eov.* anahtarı bilinçli karar ister)', () => {
  /** Senkronlanmayan anahtarlar (ayar, debug, önbellek, tanılama, çok oyunculu, bulut yedeği). Yeni anahtar buraya ya da SYNC_KEYS'e. */
  const NEVER_SYNC = [
    'eov.assetVersions',
    'eov.battleSpeed',
    'eov.cloud.backup.v1',
    'eov.cloud.v1', // bulut istemcisinin senkron meta'sı (src/cloud/cloud.ts), yalnızca girişliyken
    'eov.cloud.tombstones.v1', // paketin `tombstones` alanıyla taşınır, anahtar olarak değil
    'eov.debug.side',
    'eov.debugBtnPos',
    'eov.debugLootXp',
    'eov.diag.crumbs.v1',
    'eov.diag.sessions.v1',
    'eov.diag.v1',
    'eov.hint.fullscreen.v1',
    'eov.hint.valorFall.v1',
    'eov.migrated.v1',
    'eov.mp',
    'eov.mpName',
    'eov.music.v1',
    'eov.perfAuto',
    'eov.perfMode',
    'eov.poseRender',
    'eov.qbEndless',
    'eov.reducedMotion',
    'eov.settings.v1',
    'eov.sfxVolume.v1',
    'eov.showFps',
    'eov.spriteVariants',
    'eov.staleReloadAt',
    'eov.uiSound.v1',
  ];
  /** Yorumdaki yer tutucu (storage-migrate.ts: `eov.X`), anahtar değil. */
  const PLACEHOLDERS = new Set(['eov.X']);
  const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : /\.ts$/.test(f) ? [join(dir, f)] : []));

  it('SYNC_KEYS tam olarak 4 ilerleme anahtarı; src içindeki her eov.* anahtarı sınıflandırılmış', () => {
    expect([...SYNC_KEYS]).toEqual(['eov.campaign.v1', 'eov.endless.v1', 'eov.endless.scores.v1', 'eov.tutorial.v1']);
    const found = new Set<string>();
    for (const f of files('src')) for (const m of readFileSync(f, 'utf8').matchAll(/['"`](eov\.[A-Za-z0-9._-]*[A-Za-z0-9_-])['"`]/g)) if (!PLACEHOLDERS.has(m[1]!)) found.add(m[1]!);
    const known = new Set<string>([...SYNC_KEYS, ...NEVER_SYNC]);
    expect([...found].filter((k) => !known.has(k)).sort()).toEqual([]);
    expect(NEVER_SYNC.filter((k) => (SYNC_KEYS as readonly string[]).includes(k))).toEqual([]);
  });
});

describe('tutorial birleştirme (yalnızca tutorial farklıysa sorulmaz)', () => {
  const tut = (o: object) => JSON.stringify({ v: 1, on: true, seen: [], ...o });
  it('mergeTutorialRaw: birleşim, en büyük gösterim, kapalı kazanır; bozuk/sürüm farkı undefined', () => {
    const m = JSON.parse(mergeTutorialRaw(tut({ seen: ['a', 'b'], done: ['x'], shows: { r: 2 } }), tut({ on: false, seen: ['b', 'c'], shows: { r: 1, s: 3 } }))!);
    expect(m).toEqual({ v: 1, on: false, seen: ['a', 'b', 'c'], done: ['x'], shows: { r: 2, s: 3 } });
    expect(mergeTutorialRaw(null, tut({}))).toBe(tut({}));
    expect(mergeTutorialRaw('{', tut({}))).toBeUndefined();
    expect(mergeTutorialRaw(JSON.stringify({ v: 2, seen: [] }), tut({}))).toBeUndefined();
  });
  it('ilerleme aynı, tutorial farklı: ask yerine birleşik paket (merge)', () => {
    const kv = memoryKV();
    writeSave(kv, start('normal', 1, 0), 'manual', '2026-10-20T10:00:00Z');
    const base = bundleOf(kv);
    const L = withData(base, { [TUTORIAL_KEY]: tut({ seen: ['a'] }) });
    const C = withData(base, { [TUTORIAL_KEY]: tut({ seen: ['b'] }) });
    const d = decideSync(L, C);
    expect(d.kind).toBe('merge');
    if (d.kind === 'merge') expect(JSON.parse(d.bundle.data[TUTORIAL_KEY]!).seen).toEqual(['a', 'b']);
    // bir taraf diğerini kapsıyorsa o taraf aynen: yükleme / indirme
    expect(decideSync(withData(base, { [TUTORIAL_KEY]: tut({ seen: ['a', 'b'] }) }), C).kind).toBe('upload');
  });
});
