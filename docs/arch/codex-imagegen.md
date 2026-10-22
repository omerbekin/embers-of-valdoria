# Codex ile görsel üretimi

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
