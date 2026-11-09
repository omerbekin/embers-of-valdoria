> **Ne için:** arch/old-claude-md-sections arşivi; güncel değil.
# Eski CLAUDE.md bölümleri (workflow-rules.md sonundan arşive taşındı, birebir)

Güncel çekirdek: kök `CLAUDE.md`. Yalnız geçmiş.

## Sahip ve çalışma biçimi
- Proje sahibi (Ömer) **kod okumaz/denetlemez**. Kalite güvencesi: otomatik testler, oyun içi debug menüsü, denge simülasyon raporları.
- Ömer ile iletişim **Türkçe**, kod diliyle değil sade dille. Her görev sonunda: ne yapıldı, hangi ekranda nasıl görünmeli, ne test edilmeli.
- Ömer'in "çerçevesi" `docs/design/` altındadır. Orada yazmayan bir tasarım kararını kendi kafana göre verme: varsayım yaptıysan görev sonunda açıkça söyle ve `docs/design/open-questions.md` dosyasına ekle.
- Küçük adımlar: her adım sonunda oynanabilir bir şey çıkmalı.
- Ana oturum koordine eder; gerektiğinde `.claude/agents/` altındaki agentları çağırır ve sonuçları Ömer'e tek özet olarak sunar.
- **Lead (Ömer 2026-11-02):** tek sohbet düzeni: Ömer > Lead > agentlar. Alt sohbet yok; tüm yetki Lead'de, agent, sim ve gönderim Ömer'in onayıyla başlar. Kurallar `docs/arch/lead.md`, alan devirleri `docs/arch/areas/<alan>.md`.

## Teknik kararlar (değiştirmeden önce Ömer'e sor)
- TypeScript (strict), Phaser 3, Vite, Vitest.
- **Savaş motoru saf TypeScript**, `src/engine/` altında. Phaser'a, DOM'a, `window`'a bağımlı OLAMAZ. Node'da headless çalışabilmeli.
- Render ve UI `src/game/` ve `src/ui/` altında; motoru yalnızca olay (event) akışı üzerinden dinler.
- **İçerik koddan ayrı**: class, skill, düşman, item, düğüm haritası `data/*.json` dosyalarında. Denge değişikliği = veri değişikliği. Yeni class = yeni veri dosyası (+ sprite).
- **Seed'li RNG** zorunlu. Motorda `Math.random` yasak. Aynı seed + aynı girdiler = birebir aynı savaş.
- Kayıt: localStorage, sürümlü şema.
- **Oyun içi arayüz İngilizce** (menüler, düğmeler, uyarılar, skill/karakter isimleri, debug menüsü dahil). Ömer'le konuşma, raporlar, `docs/` ve kod yorumları Türkçe kalır. Yeni ekran yazılırken İngilizce yazılır.
- **Sahne:** 1920x1080 taban, geniş ekranda mantıksal genişlik 2580'e kadar esner; sahneler 1920x1080 koordinatında çizer, kenara yaslanan Phaser öğeleri `stageView`, tam ekran örtüler `FULL_X0/FULL_W`, işaretçi `worldXY`, DOM kenarları `--er/--et/--eb/--el` (`src/game/stage.ts`, `src/ui/viewport.ts`). Yatay öncelikli, döndürme uyarısı yok (dikey dokunmatikte sahne CSS ile döner). Ayrıntı: `docs/arch/ui-and-stage.md`.
- **İki savaş modu** (`turns` + debug'dan `test`): her yeni savaş özelliği iki modda da bozulmamalı. Motor ayrıntıları: `docs/arch/battle-engine.md`.
- **Tasarım felsefesi: medieval.** Görsel ve ses buna uyar; sesler gerçek karşılığından kurulur, çan gibi çınlayan saf sinüs YOK; Warrior ve Druid sesleri referanstır, dokunma. Ayrıntı: `docs/arch/assets.md`.
- Yayın: her değişiklik önizleme linkine yayınlanır (GitHub Pages otomatik; Cloudflare https://embersofvaldoria.com elle `npm run deploy:cf`), Ömer telefondan oynar. **Yalnızca ücretsiz Cloudflare planı (Ömer): ücretli özellik eklenmez.**


## Kalite kuralları
1. Her motor değişikliği test ile gelir. Testler yeşil değilse iş bitmiş sayılmaz.
2. **Test akışı (2026-10-14):** iterasyon sırasında agentlar `npm run test:fast` + dokundukları test dosyalarını (`npx vitest run tests/<dosya>.test.ts`) çalıştırır; denge/veri değişikliği yaptıysa `npm run test:slow` da. Tam `npm test` + `npm run build` push'tan önce (ana oturum) çalışır; görev sonunda agentın kendi `npm run build`'i de hatasız olmalı.
3. Her ekran/özellik debug menüsünden tetiklenebilir olmalı (Ömer arayüzden test edecek).
4. Denge değişiklikleri tahmine değil `npm run sim` raporuna dayanır.
5. Sprite yoksa placeholder çiz; eksik asset oyunu çökertmemeli.
6. Sayıları koda gömme; veri dosyasına koy.
7. **Asset Gallery Wiki > Assets / Legacy içinde** (otomatik türetilir; test içeriği Codex'te HİÇ yok). Ayrıntı `docs/arch/debug-wiki.md`.
8. **Wiki / Codex:** yeni mekanik/özel kural/pasif eklenince Mechanics metni güncel mi kontrol et (`src/wiki/catalog.ts`, `tests/wiki.test.ts`). Ayrıntı `docs/arch/debug-wiki.md`.

## Kapsam dışı (şimdilik)
- Co-op ve sefer çok oyunculusu. (İki oyunculu çevrimiçi **Quick Battle** var: `docs/design/multiplayer.md`, `src/net/`, Worker `cloudflare/`; ağ katmanı yalnızca lockstep hamle gönderir, motor kuralı değişmez.)
- Kayıtlı (gerçek) ses/müzik dosyaları; SFX ve müzik WebAudio sentezidir (ayrıntı `docs/arch/assets.md` > Ses ve müzik).

## Komutlar
- `npm run dev` — geliştirme sunucusu (`--host` açık: aynı Wi-Fi'deki telefondan da açılır)
- `npm run build` — tip kontrolü + üretim derlemesi (`dist/`)
- `npm test` — TÜM vitest testleri (CI bunu çalıştırır; motor saflığı denetimi dahil: `src/engine` içinde Math.random/Phaser/DOM yasak)
- `npm run test:fast` — yavaş suitler hariç her şey (iterasyon için); `npm run test:slow` — yalnızca yavaş suitler (denge simleri, golden kayıtlar...). Yavaş liste TEK yerde: `vitest.slow-list.ts`.
- `npm run sim` / `npm run sim:campaign` / `npm run sim:endless` — denge simülatörleri (ayrıntı ve hedef bantlar `docs/arch/sims-and-deploy.md`)
- `npm run deploy:cf` — Cloudflare yayını (Ömer "canlıya al" deyince; ayrıntı `docs/arch/sims-and-deploy.md`)
- **Tarayıcı testinde SES KAPALI (Ömer 2026-10-24, ZORUNLU):** oyunu tarayıcıda açan herkes (ana oturum + her agent) her yeni porta/sekmeye ilk iş olarak `localStorage.setItem('eov.settings.v1', JSON.stringify({volume:0, steps:20})); location.reload()` çalıştırır (Master 0 = müzik + efekt + arayüz sesi kapalı). Eski `proto.settings.v1` anahtarı İŞE YARAMAZ (taşıma bir kez çalışır).
- Debug menüsü: klavyede ` veya F2, dokunmatikte üç parmakla kısa dokunma, adreste `?debug=1`. Yeni özellik = `src/ui/debug-tools.ts` içinde `debug.register(...)`. Ayrıntı `docs/arch/debug-wiki.md`.

## Kapsam dışı (şimdilik)
- Co-op ve sefer çok oyunculusu. (İki oyunculu çevrimiçi **Quick Battle** var: `docs/design/multiplayer.md`, `src/net/`, Worker `cloudflare/`; ağ katmanı yalnızca lockstep hamle gönderir, motor kuralı değişmez.)
- Kayıtlı (gerçek) ses/müzik dosyaları; SFX ve müzik WebAudio sentezidir (ayrıntı `docs/arch/assets.md` > Ses ve müzik).
