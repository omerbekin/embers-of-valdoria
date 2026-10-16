import { describe, expect, it } from 'vitest';
import {
  DIAG,
  KEYS,
  beginSession,
  buildReport,
  byteLength,
  crumbsText,
  loadCrumbs,
  loadPrefs,
  markClean,
  midLoad,
  newThrottle,
  noteSent,
  pushCrumb,
  sessionCrumbs,
  setConsent,
  shouldSend,
  takeCrashed,
  heartbeat,
  type DiagEnv,
  type KV,
} from '../src/diag/diag-core';
import { diagUrlFrom, sceneDataNote } from '../src/diag/diag';
import { parseReport, MAX_CRUMBS, MAX_CRUMB_CHARS, MAX_MESSAGE_CHARS, MAX_REPORT_BYTES, MAX_STACK_CHARS, RATE_LIMIT, RATE_WINDOW_SEC, RETENTION_DAYS, DIAG_KINDS } from '../cloudflare/src/diag-logic';
import { REPORT_KINDS } from '../src/diag/diag-core';

const mem = (): KV & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
let seq = 0;
const bytes = (n: number) => Uint8Array.from({ length: n }, () => ++seq % 256);
const env: DiagEnv = { ua: 'Mozilla/5.0 test', screen: [1920, 1080], viewport: [1600, 900], dpr: 2, mem: 4, heap: null, texMB: 120.5, touch: false, renderer: 'webgl' };

describe("tanılama: iz halkası localStorage'da kalır", () => {
  it('yeniden okununca aynı izler; en fazla maxCrumbs (en eskisi düşer)', () => {
    const kv = mem();
    for (let i = 0; i < DIAG.maxCrumbs + 15; i++) pushCrumb(kv, 'aaa', 'scene', `s${i}`, 1000 + i);
    const again = loadCrumbs(kv); // "sayfa yenilendi"
    expect(again.length).toBe(DIAG.maxCrumbs);
    expect(again[0]!.m).toBe('s15');
    expect(again.at(-1)!.m).toBe(`s${DIAG.maxCrumbs + 14}`);
  });

  it('aynı anda açık iki sekme birbirinin izlerini silmez', () => {
    const kv = mem();
    pushCrumb(kv, 'aaa', 'scene', 'A1', 1);
    pushCrumb(kv, 'bbb', 'scene', 'B1', 2);
    pushCrumb(kv, 'aaa', 'scene', 'A2', 3);
    expect(loadCrumbs(kv).map((c) => c.m)).toEqual(['A1', 'B1', 'A2']);
    expect(sessionCrumbs(loadCrumbs(kv), 'aaa').map((c) => c.m)).toEqual(['A1', 'A2']);
  });

  it('uzun ileti kırpılır; bozuk kayıt boş liste', () => {
    const kv = mem();
    pushCrumb(kv, 'aaa', 'error', 'x'.repeat(5000), 1);
    expect(loadCrumbs(kv)[0]!.m.length).toBe(DIAG.maxCrumbChars);
    kv.setItem(KEYS.crumbs, '{bad');
    expect(loadCrumbs(kv)).toEqual([]);
  });
});

describe('tanılama: çökme tespiti (temiz çıkış işareti + canlılık)', () => {
  const S = DIAG.staleMs;
  it('ilk açılış: çökme yok; temiz kapanmayan ve canlılığı kesilen oturum sonraki açılışta çökmüş sayılır', () => {
    const kv = mem();
    expect(beginSession(kv, 'aaa', '0.8.2', 1)).toEqual([]);
    const prev = beginSession(kv, 'bbb', '0.8.2', 1 + S + 1); // aaa gizlenmeden/kapanmadan bitti
    expect(prev.map((p) => p.id)).toEqual(['aaa']);
    expect(prev[0]!.clean).toBe(false);
    expect(prev[0]!.version).toBe('0.8.2');
  });

  it('başka canlı sekme (taze işaret) çökmüş sayılmaz; canlılığı kesilince sayılır, bir kez', () => {
    const kv = mem();
    beginSession(kv, 'aaa', 'v', 1000);
    heartbeat(kv, 'aaa', 5000);
    expect(beginSession(kv, 'bbb', 'v', 6000)).toEqual([]); // aaa hâlâ açık
    expect(takeCrashed(kv, 5000 + S, 'bbb')).toEqual([]);
    heartbeat(kv, 'aaa', 6000 + S);
    expect(takeCrashed(kv, 6000 + 3 * S, 'bbb').map((p) => p.id)).toEqual(['aaa']); // aaa sessizce öldü
    expect(takeCrashed(kv, 6000 + 4 * S, 'bbb')).toEqual([]);
  });

  it('sayfa gizlendi / kapandı (temiz): çökme sayılmaz; yeniden görünür olup çökerse sayılır', () => {
    const kv = mem();
    beginSession(kv, 'aaa', 'v', 1);
    markClean(kv, 'aaa', true, 2, 'BattleScene');
    expect(beginSession(kv, 'bbb', 'v', 2 + S + 1)).toEqual([]);
    markClean(kv, 'bbb', true, 3 * S);
    markClean(kv, 'bbb', false, 3 * S + 1, undefined, 'v'); // tekrar görünür oldu, sonra çöktü
    expect(beginSession(kv, 'ccc', 'v', 5 * S).map((p) => p.id)).toEqual(['bbb']);
  });

  it('uzun süre arka planda kalıp işareti silinen sekme yeniden görünürse işaret yeniden kurulur', () => {
    const kv = mem();
    beginSession(kv, 'aaa', 'v', 1);
    markClean(kv, 'aaa', true, 2);
    beginSession(kv, 'bbb', 'v', 2 + S + 1); // aaa'nın temiz işareti temizlendi
    markClean(kv, 'aaa', false, 3 * S, undefined, 'v');
    expect(takeCrashed(kv, 5 * S, 'bbb').map((p) => p.id)).toEqual(['aaa']);
  });

  it('önceki oturumun izleri ayrılır; son iz yükleme ortasıysa midLoad', () => {
    const kv = mem();
    pushCrumb(kv, 'aaa', 'boot', 'aaa v1', 1);
    pushCrumb(kv, 'aaa', 'scene', 'MainMenuScene', 2);
    pushCrumb(kv, 'aaa', 'ready', 'MainMenuScene', 3);
    pushCrumb(kv, 'aaa', 'battle', 'campaign enc e1 node n1', 4);
    pushCrumb(kv, 'aaa', 'scene', 'BattleScene (seed 5, turns)', 5);
    pushCrumb(kv, 'bbb', 'boot', 'bbb v1', 6);
    const list = pushCrumb(kv, 'bbb', 'scene', 'MainMenuScene', 7);
    const prev = sessionCrumbs(list, 'aaa');
    expect(prev.map((c) => c.t)).toEqual([1, 2, 3, 4, 5]);
    expect(midLoad(prev)).toBe(true);
    expect(midLoad(prev.slice(0, 3))).toBe(false);
    expect(sessionCrumbs(list, 'zzz')).toEqual([]);
  });
});

describe('tanılama: onay (opt-in) varsayılan kapalı, kapalıyken hiçbir şey gönderilmez', () => {
  it('varsayılan: kapalı, bildirim görülmedi, cihaz kimliği yok', () => {
    expect(loadPrefs(mem())).toEqual({ consent: false, noticed: false });
  });

  it('kapalıyken hiçbir rapor türü gönderilmez (test dahil)', () => {
    const kv = mem();
    const p = loadPrefs(kv);
    for (const k of REPORT_KINDS) expect(shouldSend(p, newThrottle(), k, 'boom', 1e6)).toBe(false);
    const off = setConsent(kv, false, bytes);
    expect(shouldSend(off, newThrottle(), 'error', 'boom', 1e6)).toBe(false);
    expect(off.device).toBeUndefined();
  });

  it('açınca rastgele 16 haneli kimlik; kapatınca silinir, yeniden açınca YENİ kimlik', () => {
    const kv = mem();
    const a = setConsent(kv, true, bytes);
    expect(a.device).toMatch(/^[0-9a-f]{16}$/);
    expect(loadPrefs(kv).device).toBe(a.device);
    setConsent(kv, false, bytes);
    expect(loadPrefs(kv).device).toBeUndefined();
    expect(kv.m.get(KEYS.prefs)).not.toContain(a.device!);
    const b = setConsent(kv, true, bytes);
    expect(b.device).not.toBe(a.device);
  });

  it('açıkken kısıtlama: aynı ileti bir kez, oturum başına sınır, arada bekleme', () => {
    const p = setConsent(mem(), true, bytes);
    const th = newThrottle();
    expect(shouldSend(p, th, 'error', 'A', 0)).toBe(true);
    noteSent(th, 'error', 'A', 0);
    expect(shouldSend(p, th, 'error', 'A', 1e6)).toBe(false);
    expect(shouldSend(p, th, 'error', 'B', 10)).toBe(false); // çok yakın
    let t = 0;
    for (let i = 1; i < DIAG.maxReportsPerSession; i++) {
      t += DIAG.minSendGapMs;
      expect(shouldSend(p, th, 'error', `m${i}`, t)).toBe(true);
      noteSent(th, 'error', `m${i}`, t);
    }
    expect(shouldSend(p, th, 'error', 'other', t + 1e6)).toBe(false);
  });
});

describe('tanılama: rapor boyutu ve içerik', () => {
  it('32 KB sınırı: en eski izler düşer, en son izler kalır', () => {
    const crumbs = Array.from({ length: DIAG.maxCrumbs }, (_, i) => ({ t: i, k: 'scene', m: `${i}:${'y'.repeat(230)}` }));
    const r = buildReport({ kind: 'error', device: 'a'.repeat(16), session: 's', now: 0, app: '0.8.2', scene: 'BattleScene', message: 'm', stack: 'z'.repeat(9000), env, crumbs });
    expect(byteLength(JSON.stringify(r))).toBeLessThanOrEqual(DIAG.maxReportBytes);
    expect(r.crumbs.at(-1)!.t).toBe(DIAG.maxCrumbs - 1);
    expect(r.stack.length).toBe(DIAG.maxStackChars);
    // Worker aynı raporu kabul eder
    expect(parseReport(JSON.stringify(r)).ok).toBe(true);
  });

  it('metin günlüğü (Copy Log): başlık + zaman damgalı satırlar', () => {
    const t = crumbsText([{ t: Date.UTC(2026, 9, 16, 10, 0, 0), k: 'scene', m: 'MainMenuScene' }], { Version: '0.8.2' });
    expect(t.split('\n')[0]).toBe('Version: 0.8.2');
    expect(t).toMatch(/\[scene\] MainMenuScene$/);
  });

  it('sahne verisi notu: savaş seed / karşılaşma; kayıt içeriği yazılmaz', () => {
    expect(sceneDataNote({ seed: 5, mode: 'turns', tutorial: { encounter: 'wolves', node: 'n3' }, teams: { party: ['x'] } })).toBe(' (seed 5, turns, enc wolves, node n3)');
    expect(sceneDataNote(undefined)).toBe('');
  });

  it('adres: multiplayer sunucusunun kökü + /diag (GitHub Pages da aynı Worker\'a gider)', () => {
    expect(diagUrlFrom('wss://eov.backinn.com.tr/lobby')).toBe('https://eov.backinn.com.tr/diag');
    expect(diagUrlFrom('ws://127.0.0.1:8787')).toBe('http://127.0.0.1:8787/diag');
  });
});

describe('tanılama: Worker (POST /diag) doğrulaması', () => {
  const good = () => buildReport({ kind: 'previous_session_crashed', device: '0123456789abcdef', session: 'abc', now: 1, app: '0.8.2', scene: 'BattleScene', message: 'x', env, crumbs: [{ t: 1, k: 'boot', m: 'abc v1' }] });

  it('sınırlar istemciyle aynı (data/diag.json)', () => {
    expect([MAX_CRUMBS, MAX_CRUMB_CHARS, MAX_MESSAGE_CHARS, MAX_STACK_CHARS, MAX_REPORT_BYTES, RATE_LIMIT, RATE_WINDOW_SEC, RETENTION_DAYS]).toEqual([
      DIAG.maxCrumbs,
      DIAG.maxCrumbChars,
      DIAG.maxMessageChars,
      DIAG.maxStackChars,
      DIAG.maxReportBytes,
      DIAG.rateLimit,
      DIAG.rateWindowSec,
      DIAG.retentionDays,
    ]);
    expect([...DIAG_KINDS]).toEqual([...REPORT_KINDS]);
  });

  it('geçerli rapor kabul; fazla alanlar (ör. ip, save) atılır', () => {
    const r = parseReport(JSON.stringify({ ...good(), ip: '1.2.3.4', save: { gold: 9 }, env: { ...env, city: 'X' } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(JSON.stringify(r.report)).not.toContain('1.2.3.4');
    expect('save' in r.report).toBe(false);
    expect('city' in r.report.env).toBe(false);
  });

  it('bozuk / eksik / büyük gövde reddedilir', () => {
    expect(parseReport('').ok).toBe(false);
    expect(parseReport('{').ok).toBe(false);
    expect(parseReport(JSON.stringify({ ...good(), v: 2 })).ok).toBe(false);
    expect(parseReport(JSON.stringify({ ...good(), kind: 'spam' })).ok).toBe(false);
    expect(parseReport(JSON.stringify({ ...good(), device: 'NOT-HEX' })).ok).toBe(false);
    expect(parseReport(JSON.stringify({ ...good(), message: 'm'.repeat(MAX_MESSAGE_CHARS + 1) })).ok).toBe(false);
    expect(parseReport(JSON.stringify({ ...good(), crumbs: [{ t: 1, k: 'x' }] })).ok).toBe(false);
    expect(parseReport(JSON.stringify({ ...good(), env: { ...env, screen: [1] } })).ok).toBe(false);
    expect(parseReport('x'.repeat(MAX_REPORT_BYTES + 1)).ok).toBe(false);
  });
});
