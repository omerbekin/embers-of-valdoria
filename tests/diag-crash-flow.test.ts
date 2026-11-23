// previous_session_crashed yanlış pozitif taraması (bug-hunter 2026-11-23): normal telefon yaşam döngüleri "çöktü" raporu üretmez;
// yalnız görünürken (canlılık kesilerek) ölen oturum üretir. Çekirdek: src/diag/diag-core.ts (diag.ts olay bağlantısı: hidden/pagehide -> markClean true,
// visible -> markClean false, 15 sn canlılık).
import { describe, expect, it } from 'vitest';
import { DIAG, beginSession, heartbeat, markClean, takeCrashed, type KV } from '../src/diag/diag-core';

const mem = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const S = DIAG.staleMs;
const H = DIAG.heartbeatMs;

describe('çökme bayrağı: normal kullanım yanlış pozitif vermez', () => {
  it('uygulama arka plana gider / döner / tekrar gider (çok kez), sonra sistem öldürür: çökme sayılmaz', () => {
    const kv = mem();
    let t = 1000;
    beginSession(kv, 'a', 'v', t);
    for (let i = 0; i < 5; i++) {
      for (let k = 0; k < 4; k++) heartbeat(kv, 'a', (t += H)); // görünür, canlılık
      markClean(kv, 'a', true, (t += 1000), 'Scene'); // hidden
      t += 10 * 60 * 1000; // uzun süre arka planda
      markClean(kv, 'a', false, t, undefined, 'v'); // visible
    }
    markClean(kv, 'a', true, (t += 1000), 'Scene'); // son kez hidden, sonra OS öldürdü
    expect(beginSession(kv, 'b', 'v', t + 3 * S)).toEqual([]);
  });

  it('sayfayı yenileme / sekmeyi kapatma (yalnız pagehide: temiz) çökme sayılmaz', () => {
    const kv = mem();
    beginSession(kv, 'a', 'v', 1);
    markClean(kv, 'a', true, 5000, 'MainMenuScene'); // pagehide
    expect(beginSession(kv, 'b', 'v', 6000)).toEqual([]); // yenilenen sayfa hemen açılır
    expect(takeCrashed(kv, 6000 + 2 * S, 'b')).toEqual([]);
  });

  it('görünürken canlılığı kesilen oturum (OOM / ani ölüm) gerçekten çökme sayılır (doğru pozitif)', () => {
    const kv = mem();
    beginSession(kv, 'a', 'v', 1);
    heartbeat(kv, 'a', 20000);
    expect(beginSession(kv, 'b', 'v', 20000 + S + 1).map((p) => p.id)).toEqual(['a']);
  });
});
