# Proje: Embers of Valdoria (sıra tabanlı yandan görünümlü RPG)
localStorage/sessionStorage anahtarları `eov.*` (eski `proto.*`/`protomedi.*` açılışta `src/storage-migrate.ts` ile taşınır).
TypeScript + Phaser 3 + Vite, 2D pixel art, mobilde de oynanır. 4 kişilik takım (hızlı savaş 4; sefer 1-4), düğüm haritası, hıza göre dinamik sıra.
Belge sahipliği: `docs/arch/docs-map.md`. Eski/yanlış belge listesi: `docs/arch/stale-docs.md`.

## Sahip ve çalışma biçimi
- Ömer **kod okumaz/denetlemez**. Kalite: otomatik testler, debug menüsü, denge sim raporları.
- Ömer ile iletişim **Türkçe**, sade dille. Görev sonunda: ne yapıldı, hangi ekranda nasıl görünmeli, ne test edilmeli.
- Ömer'in çerçevesi `docs/design/`. Orada yazmayan tasarım kararını kendi kafana göre verme: varsayımı görev sonunda söyle ve `docs/design/open-questions.md`'ye ekle (worktree sohbetinde `## Q-NEW. Başlık`).
- Küçük adımlar: her adım sonunda oynanabilir bir şey çıkmalı.
- **Lead (2026-11-02):** Ömer > Lead > agentlar. Alt sohbet yok; agent, sim ve gönderim Ömer'in onayıyla başlar. `docs/arch/lead.md`, `docs/arch/areas/<alan>.md`.
- **Ömer'in kelimeleri (2026-10-17):** agent'lar isteği genişletmez, istenmeyen ek iş yapmaz; emin değilse sorar / raporda soru yazar.
- **Sürüm:** ara sürümleri Ömer söyler; küçük güncelleme ALT sürüm alır (0.6.11.1); her paylaşımda `data/patch-notes.json`'a oyuncu satırı eklenir (yoksa test kırmızı); mockup paylaşımı sürüm almaz. Tam kural: `docs/arch/workflow-rules.md`.
- **Yayın:** "GitHub'a at" = commit + `main` push (Pages) + yerel 5000 yenileme; "canlıya al" = `npm run deploy:cf`; sürümlü her gönderim canlıya da gider. Push öncesi temiz kopyada tam `npm test` + build yeşil. Gönderim kuyruğu `tools/push-queue.mjs`; kodlu sohbet kendi worktree'sinde (`wt-open`), asıl `game/` yazmaya kapalı. Tam metin: `docs/arch/workflow-rules.md`, `docs/arch/sims-and-deploy.md`, `docs/arch/chat-owners.md`.
- **Agent'lar:** açıklama `<tür>: <iş>` ile başlar. Opus yalnız engine-dev; diğerleri Sonnet/Haiku. **KRİTİK İŞ ASLA Sonnet/Haiku'ya verilmez** (motor kuralı, kayıt/durum şeması, denge kararı/değeri, bellek/performans kök sebebi, yayın/deploy, gizlilik/veri; gerekirse `model: opus`). Hata araştırması `bug-hunter`a. ChatGPT sanatı TEK art-pipeline agent'ıyla; engelde dur ve raporla, ASLA aşmaya çalışma. Tam metin (model dağılımı, denge adımı akışı, parça parça yayın): `docs/arch/workflow-rules.md`.

## Teknik kararlar (değiştirmeden önce Ömer'e sor)
- TypeScript (strict), Phaser 3, Vite, Vitest.
- **Savaş motoru saf TypeScript**, `src/engine/`. Phaser'a, DOM'a, `window`'a bağımlı OLAMAZ; Node'da headless çalışmalı.
- Render/UI `src/game/` ve `src/ui/`; motoru yalnızca olay akışıyla dinler.
- **İçerik koddan ayrı**: class, skill, düşman, item, harita `data/*.json`. Denge değişikliği = veri değişikliği. Yeni class = yeni veri dosyası (+ sprite).
- **Seed'li RNG** zorunlu. Motorda `Math.random` yasak. Aynı seed + girdi = birebir aynı savaş.
- Kayıt: localStorage, sürümlü şema.
- **Oyun içi arayüz İngilizce** (debug menüsü dahil). Ömer'le konuşma, raporlar, `docs/` ve kod yorumları Türkçe.
- **Sahne:** 1920x1080 taban, geniş ekranda 2580'e kadar esner; `stageView`, `FULL_X0/FULL_W`, `worldXY`, `--er/--et/--eb/--el` (`src/game/stage.ts`, `src/ui/viewport.ts`). Yatay öncelikli. Ayrıntı: `docs/arch/ui-and-stage.md`.
- **İki savaş modu** (`turns` + debug'dan `test`): her yeni savaş özelliği ikisinde de bozulmamalı (`docs/arch/battle-engine.md`).
- **Tasarım felsefesi: medieval.** Çan gibi çınlayan saf sinüs YOK; Warrior ve Druid sesleri referanstır, dokunma (`docs/arch/assets.md`).
- Yayın: GitHub Pages otomatik; Cloudflare https://embersofvaldoria.com `npm run deploy:cf`. **Yalnızca ücretsiz Cloudflare planı: ücretli özellik eklenmez.**
- Kapsam dışı: co-op ve sefer çok oyunculusu (Quick Battle online var: `docs/design/multiplayer.md`, lockstep); kayıtlı ses/müzik dosyası (WebAudio sentezi, `docs/arch/assets.md`).

## Arayüz GLOBAL kuralları (tam metin: `docs/arch/ui-global-rules.md`, `docs/arch/ui-and-stage.md`)
- **ZORUNLU:** yeni arayüz öncesi `docs/design/ui-design-language.md` ve `docs/design/ui-reference.md`; aynı işi gören parça varsa onu kullan, kopyalama.
- **Tasarım kiti:** Cinzel 600 büyük harf + EB Garamond; **arayüzde italik YOK**; ince altın çizgi, kutusuz yazı düğmeleri. Kitler: `src/game/elegant-ui.ts`, `src/ui/elegant.css`, `src/game/hud-kit.ts`. Hareket TEK yerde `data/ui-motion.json` -> `src/ui/motion.ts`. Düğme sırası: ikinciller solda, BİRİNCİL EN SAĞDA.
- **Geri / Menu:** kurulum/bilgi ekranında yalnızca sol üst Back, oyun içinde yalnızca sağ üst Menu (ikisi birlikte yok); konum `src/ui/nav-icons.ts > NAV_BTN`; yeni ekranda başka konum KULLANILMAZ. Tüm Menu'ler `src/ui/game-menu.ts`. Onay yalnızca ilerleme kaybolacaksa (`elConfirm`).
- **Zemine dokununca kapanma:** `dismissOnBackdrop` / `elBackdropTap`; zorunlu seçim ve kayıp yaratan kartlar kapanmaz; onay pencerelerinde zemin = No.
- **Sürükle-bırak:** yuva doldurulan HER arayüzde (fare + dokunma); yuvalar arası taşıma da.
- Dokunmatik öncelikli; hedefler en az 44px.
- **Üç ekran boyutu:** her arayüz/mockup/sahne 16:9 (1920x1080), 21:9 (2580x1080), telefon (~844x390, `html.short`) için; doğrulama üçünde ekran görüntüsüyle.
- Kısa ekran: CSS `html.short` (<=520px) / `html.compact` (<=720px) (@media değil). Yuva seçimi ortak `shape-draw.ts` CellTile. Ana ekran dışı sahne `lazy-scenes.ts` ile yüklenir.

## Kalite kuralları
1. Her motor değişikliği test ile gelir; testler yeşil değilse iş bitmemiştir.
2. İterasyonda `npm run test:fast` + dokunulan test dosyası (`npx vitest run tests/<dosya>.test.ts`); denge/veri değişince `npm run test:slow` da. Tam `npm test` + `npm run build` push öncesi (ana oturum); agentın `npm run build`'i de hatasız.
3. Her ekran/özellik debug menüsünden tetiklenebilir olmalı.
4. Denge değişikliği tahmine değil `npm run sim` raporuna dayanır.
5. Sprite yoksa placeholder çiz; eksik asset oyunu çökertmemeli.
6. Sayıları koda gömme; veri dosyasına koy.
7. Asset Gallery Wiki > Assets / Legacy içinde (otomatik türetilir; test içeriği Codex'te HİÇ yok). `docs/arch/debug-wiki.md`.
8. Yeni mekanik/özel kural/pasif eklenince Mechanics metni güncel mi bak (`src/wiki/catalog.ts`, `tests/wiki.test.ts`).

## Komutlar
- `npm run dev` (`--host`), `npm run build` (tip kontrolü + `dist/`), `npm test` (TÜM testler; motor saflığı denetimi dahil), `npm run test:fast` / `test:slow` (liste: `vitest.slow-list.ts`).
- `npm run sim` / `sim:campaign` / `sim:endless` (`docs/arch/sims-and-deploy.md`); `npm run deploy:cf` ("canlıya al" deyince).
- **Tarayıcı testinde SES KAPALI (ZORUNLU):** her yeni porta/sekmede ilk iş `localStorage.setItem('eov.settings.v1', JSON.stringify({volume:0, steps:20})); location.reload()`. `proto.settings.v1` İŞE YARAMAZ.
- Debug menüsü: ` veya F2, üç parmak dokunma, `?debug=1`. Yeni özellik = `src/ui/debug-tools.ts` içinde `debug.register(...)`.

## Konu dizini (yalnızca görevinin gerektirdiğini oku; tam sahiplik `docs/arch/docs-map.md`)
| Konu | Belge |
|---|---|
| Motor, mekanikler | `docs/arch/battle-engine.md`, `docs/design/combat.md`, `docs/design/range.md` |
| Arayüz, sahne | `docs/arch/ui-and-stage.md`, `docs/design/ui-design-language.md`, `ui-reference.md`, `ui-consistency-audit.md` |
| Asset, sanat, ses | `docs/arch/assets.md`, `codex-imagegen.md`, `docs/design/art.md`, `art-v2.md`, `audio-map.md` |
| Debug, Wiki, tanılama | `docs/arch/debug-wiki.md`, `docs/arch/diagnostics.md` |
| Sim, build, yayın | `docs/arch/sims-and-deploy.md`, `docs/balance.md`, `data/balance.json` |
| Sefer, item, level | `docs/design/campaign/`, `docs/design/progression/` (items, item-effects, roadmap, levels) |
| Sınıflar, YZ, multiplayer, tutorial | `docs/design/classes.md`, `ai-priorities.md`, `match-log.md`, `multiplayer.md`, `tutorial.md` |
| Açık sorular, fikirler | `docs/design/open-questions.md` (330+; 1-329 `-archive.md`, aramada hariç), `docs/design/future-ideas.md` |
| Kod haritası | `docs/arch/code-map.md` (40 KB+ dosyadan önce; `npm run codemap`) |
| İş akışı, kurallar (taşınan) | `docs/arch/workflow-rules.md`, `docs/arch/ui-global-rules.md`, `docs/arch/project-layout.md` |
