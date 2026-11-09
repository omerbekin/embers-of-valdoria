> **Ne için:** arch/codex-art-loop arşivi; güncel değil.
# Terra çizer / Sol kontrol eder döngüsü (`tools/codex/art-loop.mjs`)

Genel sanat aracı (Ömer 2026-11-02; Vesper pozlarındaki deneme, `vesper-loop`, genelleştirildi). Terra (`gpt-6.1-terra`, workspace-write) çizer ve `outDir/NOTES.md`'ye not alır; Sol (`gpt-6.1-sol`, reasoning high, read-only) kontrol eder. İkisi AYRI süreçtir (Sol, Terra sandbox'ında açılamaz, Windows os error 5). Araç karar vermez: Sol ilk satıra `GECTI`/`KALDI`, ikinci satıra `PUAN: n` yazar; `PUAN >= eşik` (varsayılan 8, `--threshold` ya da iş dosyasında `threshold`) ya da `GECTI` = geçti. Ücretli API yok; kota/izin engelinde (Codex sıfırdan farklı çıkış, Sol'un ilk satırı karar değil) durur, NOTES.md'ye `DURDU:` yazar, aşmaya çalışmaz. VFX akışı (`/vfx`) ve `run.mjs`/`imagegen.mjs` bundan bağımsızdır.

```bash
node tools/codex/art-loop.mjs is.json --dry-run     # plan, Codex çağrılmaz
node tools/codex/art-loop.mjs is.json               # koş
node tools/codex/art-loop.mjs is.json --resume      # biten turları (turlar/ + checks/) atla
```

## İş dosyası (JSON)
```json
{ "name": "vesper-poses", "outDir": "docs/anim-review/new-art/vesper-poses",
  "rules": "docs/.../PROMPT.md  (yol ya da düz metin; Terra ve Sol'a başa eklenir)",
  "chainPrevious": true, "maxRounds": 4, "threshold": 8, "root": "(varsayılan: çalışma klasörü)",
  "pages": [ { "id": "narrow", "task": "Terra istemi", "refs": ["ref.png", "sablon.png"],
               "checkRefs": ["(Sol'a verilecek görseller; yoksa refs)"], "checkRules": "- Sol'a kesin kurallar",
               "maxRounds": 4, "file": "narrow.png", "chainPrevious": true } ],
  "finalCheck": { "task": "Terra istemi", "outputs": ["config.json"], "checkRules": "- ...", "refs": [], "maxRounds": 4 } }
```
- `chainPrevious` (iş ya da sayfa düzeyinde): önceki sayfanın GEÇEN turu sonraki sayfaya referans olur.
- Tur 2+ : Terra sıfırdan çizmez, o ana kadarki en yüksek puanlı turu ve Sol'un düzeltmelerini alır.
- `finalCheck`: sayfalar bitince Terra `outputs` dosyalarını yazar; Sol sayfa görselleri + çıktılarla kontrol eder (metin çıktıları isteme gömülür).

## Çıktılar (`outDir`)
`<id>.png` (en iyi tur), `turlar/<id>-<n>.png`, `checks/<id>-<n>.md` (Sol kararı), `checks/final-<n>.md`, `sonuc.json` (sayfa başına tur/geçti/en iyi tur/puan; durduysa `durdu`), `art-loop.log`, `NOTES.md`. En iyi tur: geçen ilk tur, yoksa en yüksek puan (eşitlikte sonraki).

Testler: `tests/art-loop.test.ts` (doğrulama, ayrıştırma, en iyi tur, plan; Codex çağırmaz).
