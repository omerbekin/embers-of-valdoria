# Codex ile görsel üretimi
> **Ne için / Güncel mi (2026-11-08):** Codex CLI ile görsel üretimi ve art-loop (Terra/Sol) akışı. evet; tools/codex/{imagegen,art-loop,run}.mjs var.


ChatGPT aboneliğindeki görsel üretimi (imagegen) Codex CLI üzerinden, tarayıcı açmadan çalıştırılır. Ek API ücreti yok; ChatGPT kotasından düşer. Görsel başına 1-15 dk (test 2026-10-22: ~2 dk).

## Gerekenler
- Windows: ChatGPT/Codex masaüstü uygulaması kurulu ve oturum açık (uygulamanın açık kalması gerekmez). CLI `%LOCALAPPDATA%\OpenAI\Codex\bin\<sürüm>\codex.exe`.
- Başka sistemler: `npm i -g @openai/codex` + `codex login`.

## Betikler (`tools/codex/`)
- `run.mjs`: en yeni `codex.exe`'yi bulur (uygulama her güncellemede klasörü değiştirir), argümanları aynen iletir, çıkış kodunu döndürür. Seçenekler değişirse: `node tools/codex/run.mjs exec --help`.
- `imagegen.mjs`: istemi kalıba sokar, Codex'i çalıştırır, görseli hedefe koyar.

```bash
node tools/codex/imagegen.mjs --out assets/source/x/y.png --prompt "<konu, stil, arka plan, metin yok>" -i ref.png
node tools/codex/imagegen.mjs --list liste.json --parallel 2
```

Liste: `[{ "out": "...", "prompt": "...", "refs": ["..."] }]`. Hedef varsa atlanır (yarıda kalan koşu kaldığı yerden sürer). Her işin günlüğü `<out>.codex.log`, Codex'in son mesajı `<out>.last.txt` (ikisi de içe aktarmadan önce silinir ya da scratch klasörde kalır).

## Bilinen davranışlar
- Codex sandbox'ı üretilen görseli çoğu zaman hedefe kopyalayamaz; görsel `~/.codex/generated_images/<oturum id>/` altına düşer. `imagegen.mjs` oturum id'sini günlükten okuyup oradaki en yeni PNG'yi kendisi kopyalar.
- İstemdeki "TEK görsel", "kod yazma", "ücretli API / image_gen.py kullanma" cümleleri zorunlu (kalıpta hazır). Ücretli API anahtarıyla çalışan bir betik ASLA çalıştırılmaz.
- En fazla 2 paralel iş; 4 işte ChatGPT sıraya alıyor (görsel başına 8-15 dk).
- Piksel sanatı: imagegen piksel ızgarasına tam uymaz; ham görsel gerektiğinde ayrı bir araçla ızgaraya oturtulur.
- Şeffaf arka plan garantisi yok; dama tahtası / koyu hale kontrolü `.claude/agents/art-pipeline.md` kurallarıyla aynen geçerli.

## Model
`tools/codex/run.mjs` her `exec` çağrısında `gpt-6.1-terra` (Terra 6.1) kullanır (Ömer 2026-10-31); `-m` verilirse o geçerli.

## Terra çizer / Sol kontrol eder döngüsü (`tools/codex/art-loop.mjs`)
Genel sanat aracı (Ömer 2026-11-02; Vesper pozlarındaki deneme, `vesper-loop`, genelleştirildi). Terra (`gpt-6.1-terra`, workspace-write) çizer ve `outDir/NOTES.md`'ye not alır; Sol (`gpt-6.1-sol`, reasoning high, read-only) kontrol eder. İkisi AYRI süreçtir (Sol, Terra sandbox'ında açılamaz, Windows os error 5). Araç karar vermez: Sol ilk satıra `GECTI`/`KALDI`, ikinci satıra `PUAN: n` yazar; `PUAN >= eşik` (varsayılan 8, `--threshold` ya da iş dosyasında `threshold`) ya da `GECTI` = geçti. Ücretli API yok; kota/izin engelinde (Codex sıfırdan farklı çıkış, Sol'un ilk satırı karar değil) durur, NOTES.md'ye `DURDU:` yazar, aşmaya çalışmaz. VFX akışı (`/vfx`) ve `run.mjs`/`imagegen.mjs` bundan bağımsızdır.

```bash
node tools/codex/art-loop.mjs is.json --dry-run     # plan, Codex çağrılmaz
node tools/codex/art-loop.mjs is.json               # koş
node tools/codex/art-loop.mjs is.json --resume      # biten turları (turlar/ + checks/) atla
```

### İş dosyası (JSON)
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

### Çıktılar (`outDir`)
`<id>.png` (en iyi tur), `turlar/<id>-<n>.png`, `checks/<id>-<n>.md` (Sol kararı), `checks/final-<n>.md`, `sonuc.json` (sayfa başına tur/geçti/en iyi tur/puan; durduysa `durdu`), `art-loop.log`, `NOTES.md`. En iyi tur: geçen ilk tur, yoksa en yüksek puan (eşitlikte sonraki).

Testler: `tests/art-loop.test.ts` (doğrulama, ayrıştırma, en iyi tur, plan; Codex çağırmaz).
