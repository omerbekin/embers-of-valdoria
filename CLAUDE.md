# Proje: Embers of Valdoria (sıra tabanlı yandan görünümlü RPG)
TypeScript + Phaser 3 + Vite, 2D pixel art, mobilde de oynanır. 4 kişilik takım (hızlı savaş 4; sefer 1-4), düğüm haritası, hıza göre dinamik sıra.
Bu dosya YALNIZ her sohbette gereken çekirdektir. Konu bilgisi aşağıdaki dizindeki belgededir; klasöre özel kurallar o klasörün `CLAUDE.md`'sindedir (`src/engine/`, `src/game/`, `src/ui/`, `data/`).

## Not nereye yazılır (Ömer 2026-11-08, ZORUNLU)
- Ömer "unutma / not al / bundan sonra" dediği her kararı **o konunun sahibi belgeye** yazdır (sahiplik `docs/arch/docs-map.md`): alan durumu/kararlar `docs/arch/areas/<alan>.md`, oyun kuralı `docs/design/...`, çalışma kuralı `docs/arch/lead.md` / `workflow-rules.md`. Hafızaya (MEMORY) yalnız Ömer'le çalışma biçimi girer.
- Bir bilgi tek yerde durur, başka yerde bağlantı. Yeni belge `docs-map.md`'ye satır alır; eskiyen belge `docs/archive/`e taşınır, silinmez. Bu dosyaya yalnız her sohbette gereken kural girer.
- Agent brief'i alan belgesini okutarak başlar; agent bitince o belgenin durum/açık iş bölümünü günceller.

## Sahip ve çalışma biçimi
- Ömer **kod okumaz/denetlemez**. Kalite: otomatik testler, debug menüsü, denge sim raporları.
- Ömer ile iletişim **Türkçe**, sade dille. Görev sonunda: ne yapıldı, hangi ekranda nasıl görünmeli, ne test edilmeli.
- Ömer'in çerçevesi `docs/design/`. Orada yazmayan tasarım kararını kendi kafana göre verme: varsayımı görev sonunda söyle ve `docs/design/open-questions.md`'ye ekle (worktree sohbetinde `## Q-NEW. Başlık`).
- Küçük adımlar: her adım sonunda oynanabilir bir şey çıkmalı. Agent'lar isteği genişletmez; emin değilse sorar (Ömer 2026-10-17).
- **Lead (2026-11-02):** Ömer > Lead > agentlar. Lead kritik olmayan kararları kendi verir (2026-11-03); yeni mekanik/stat/kural, denge değeri ve her sim Ömer'e sorulur; gönderim Ömer'in sözüyle. Kurallar: `docs/arch/lead.md`, `docs/arch/workflow-rules.md`.
- **Gönderim özeti** (tek sahip `docs/arch/areas/push-queue.md`): "GitHub'a at" / "canlıya al" = (1) `node tools/push-queue.mjs ready <oturum> --fixes "<oyuncu satırı, İngilizce, <=140 karakter>"` (metin AYNEN oyuncu sürüm notu olur ve sürümü artırır; `data/patch-notes.json` zaten yazıldıysa ya da yalnız docs/araç ise `--internal`); (2) `push <oturum> --bg`; (3) kuyruk temiz kopyada tam test+build yapar, 5000'i yeniler, `main`e push eder, canlıya alır. Sürüm numarası kuralı: `workflow-rules.md`.

## Teknik kararlar (değiştirmeden önce Ömer'e sor)
- TypeScript (strict), Phaser 3, Vite, Vitest.
- **Savaş motoru saf TypeScript**, `src/engine/`: Phaser/DOM/`window` yok, Node'da headless. Render/UI `src/game/`, `src/ui/`; motoru olay akışıyla dinler.
- **İçerik koddan ayrı**: class, skill, düşman, item, harita `data/*.json`. Denge değişikliği = veri değişikliği.
- **Seed'li RNG** zorunlu; motorda `Math.random` yasak. Aynı seed + girdi = aynı savaş.
- Kayıt: localStorage, sürümlü şema; anahtarlar `eov.*` (eskiler `src/storage-migrate.ts` ile taşınır).
- **Oyun içi arayüz İngilizce** (debug dahil). Ömer'le konuşma, `docs/` ve kod yorumları Türkçe.
- Yalnız ücretsiz Cloudflare planı. Kapsam dışı: sefer co-op'u (çok oyunculu yalnız Quick Battle), kayıtlı ses/müzik dosyası (WebAudio sentezi).

## Kalite
- Her motor değişikliği testle gelir; yeşil değilse iş bitmemiştir.
- İterasyonda `npm run test:fast` + dokunulan test; denge/veri değişince `npm run test:slow`. Push öncesi tam `npm test` + `npm run build`.
- Denge değişikliği `npm run sim` raporuna dayanır, tahmine değil.

## Komutlar
- `npm run dev` (`--host`), `npm run build`, `npm test`, `npm run test:fast` / `test:slow` (`vitest.slow-list.ts`), `npm run sim` / `sim:campaign` / `sim:endless` / `sim:affix`, `npm run codemap`, `npm run diag:pull`, `npm run deploy:cf` (kuyruk çalıştırır). Gönderim: `tools/push-queue.mjs` (normal yol); `npm run release` kuyruk dışı elle yol.
- **Tarayıcı testinde SES KAPALI (ZORUNLU):** yeni port/sekmede ilk iş `localStorage.setItem('eov.settings.v1', JSON.stringify({volume:0, steps:20})); location.reload()`. `proto.settings.v1` İŞE YARAMAZ.
- Debug menüsü: ` veya F2, üç parmak dokunma, `?debug=1`.

## Konu dizini (yalnız görevinin gerektirdiğini oku; tam sahiplik `docs/arch/docs-map.md`)
| Konu | Belge |
|---|---|
| Alan durumu, açık işler, kararlar | `docs/arch/areas/<alan>.md` (campaign, character-design, character-vfx, combat-design, item-design, minor-fixes, push-queue, ui-ux) |
| Motor, mekanikler | `docs/arch/battle-engine.md`, `docs/design/combat.md`, `docs/design/range.md` |
| Arayüz, sahne | `docs/arch/ui-global-rules.md`, `docs/arch/ui-and-stage.md`, `docs/design/ui-design-language.md`, `ui-reference.md` |
| Asset, sanat, ses | `docs/arch/assets.md`, `codex-imagegen.md`, `docs/design/art-v2.md`, `audio-map.md` |
| Debug, Wiki, tanılama | `docs/arch/debug-wiki.md`, `docs/arch/diagnostics.md` |
| Sim, build, yayın | `docs/arch/sims-and-deploy.md`, `docs/balance.md`, `data/balance.json` |
| Sefer, item, level | `docs/design/campaign/`, `docs/design/progression/` |
| Sınıflar, ağaçlar, YZ, multiplayer, tutorial | `docs/design/classes.md`, `docs/design/classes/`, `ai-priorities.md`, `multiplayer.md`, `tutorial.md` |
| Açık sorular, fikirler | `docs/design/open-questions.md` (Ömer'e sorular + onaysız varsayımlar; eski maddeler `-archive.md`), `docs/design/future-ideas/` |
| Kod haritası | `docs/arch/code-map.md` (40 KB+ dosyadan önce; `npm run codemap`) |
| İş akışı | `docs/arch/lead.md`, `docs/arch/workflow-rules.md`, `docs/arch/project-layout.md` |
