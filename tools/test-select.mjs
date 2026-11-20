// Gönderimde test seçimi (Ömer 2026-11-15): değişen dosyaya göre tam test ya da hızlı test. Saf fonksiyon, push-queue.mjs ve tests/test-select.test.ts kullanır.
// Kural: tek bir "tam" ya da sınıflandırılamayan dosya varsa tam test. Hızlı yalnız TÜM dosyalar arayüz/belge ise. CI her zaman tam test koşar.

// Her zaman tam test: veri, motor, ilerleme, kayıt, golden kayıtları, test altyapısı, bu araç. data/patch-notes.json oyuncu metnidir, aşağıda hızlıya sayılır.
const FULL = [
  /^data\//, /^src\/engine\//, /^src\/progression\//, /^src\/storage/, /^tests\/golden\//, /^tests\/fixtures\//,
  /^vitest/, /^package\.json$/, /^package-lock\.json$/, /^tsconfig/, /^tools\/push-queue\.mjs$/, /^tools\/test-select\.mjs$/, /^vitest\.slow-list\.ts$/,
];
// Hızlı yeterli: arayüz, render, stil, statik varlık, belge. (Yavaş liste src/ui ve src/game'i içe almaz; 2026-11-15'te doğrulandı.)
const FAST = [
  /^data\/patch-notes\.json$/, /^src\/ui\//, /^src\/game\//, /\.css$/, /^public\//, /^assets\//, /^docs\//, /^tools\/ui-shot/, /^[^/]+\.md$/,
];
const norm = (f) => f.replace(/\\/g, '/');

/** @param {string[]} files @returns {{mode:'full'|'fast', reason:string, text:string}} */
export function selectTests(files) {
  const fs = [...new Set((files ?? []).map(norm))];
  if (!fs.length) return { mode: 'full', reason: 'dosya listesi boş', text: 'test: tam (sebep: dosya listesi boş)' };
  for (const f of fs) if (!FAST[0].test(f) && FULL.some((r) => r.test(f))) return { mode: 'full', reason: f, text: `test: tam (sebep: ${f})` };
  for (const f of fs) if (!FAST.some((r) => r.test(f))) return { mode: 'full', reason: `sınıflandırılamayan ${f}`, text: `test: tam (sebep: sınıflandırılamayan ${f})` };
  return { mode: 'fast', reason: 'yalnız arayüz/belge', text: `test: hızlı (yalnız arayüz: ${fs.length} dosya)` };
}
