# Proje: Sıra Tabanlı Yandan Görünümlü RPG (oyun adı: **Embers of Valdoria**; localStorage/sessionStorage anahtarları `eov.*`, eski `proto.*`/`protomedi.*` anahtarları açılışta `src/storage-migrate.ts` ile taşınır)

## Özet
Armor Games'teki Sonny tarzı, yandan görünümlü (side-view), 2D pixel art, sıra tabanlı RPG.
Web tabanlı (TypeScript + Phaser 3 + Vite), mobil tarayıcıda da oynanır.
4 kişilik takım (hızlı savaş varsayılanı 4; sefer 1-4), düğüm tabanlı dünya haritası, hıza göre dinamik sıra sistemi.

## Sahip ve çalışma biçimi
- Proje sahibi (Ömer) **kod okumaz/denetlemez**. Kalite güvencesi: otomatik testler, oyun içi debug menüsü, denge simülasyon raporları.
- Ömer ile iletişim **Türkçe**, kod diliyle değil sade dille. Her görev sonunda: ne yapıldı, hangi ekranda nasıl görünmeli, ne test edilmeli.
- Ömer'in "çerçevesi" `docs/design/` altındadır. Orada yazmayan bir tasarım kararını kendi kafana göre verme: varsayım yaptıysan görev sonunda açıkça söyle ve `docs/design/open-questions.md` dosyasına ekle.
- Küçük adımlar: her adım sonunda oynanabilir bir şey çıkmalı.
- Ana oturum koordine eder; gerektiğinde `.claude/agents/` altındaki agentları çağırır ve sonuçları Ömer'e tek özet olarak sunar.
- **Sürüm numarası (Ömer 2026-10-10):** ara sürümleri (0.6.0, 0.7.0 gibi) Ömer söyler. Küçük güncellemeler (tek skill değişikliği, bug fix, arayüz rötuşu, performans düzeltmesi) ALT sürüm alır: 0.6.11 -> 0.6.11.1 -> 0.6.11.2 (package.json 3 parçalı kalır, 4 parçalı numara `data/patch-notes.json` en üst girişinde); daha büyük güncellemeler üçüncü sayıyı ilerletir (0.6.12; `npm version <x> --no-git-tag-version`); yalnızca taslak (mockup) paylaşımı sürüm ve not almaz (Ömer 2026-10-11). Sürüm ana menüde sağ altta küçük yazar (`__APP_VERSION__`); tıklanınca Patch Notes açılır: her paylaşımda o sürüm için `data/patch-notes.json`a oyuncuya yönelik sade satırlar eklenir (Ömer 2026-10-11; sürümün notu yoksa test kırmızı).
- **Yayın kelimeleri (Ömer 2026-10-10):** "GitHub'a at" = commit + `main`'e push → GitHub Pages canlı test sitesi (https://omerbekin.github.io/embers-of-valdoria/); biten değişiklikler test için buraya gider; **her push'ta yerel 5000 de yenilenir (Ömer 2026-10-18):** `npx vite build --outDir ../play-build --emptyOutDir` + `.claude/launch.json` içindeki `play` önizlemesi (port 5000, `--host`). "Canlıya al / canlıya at / live'a al / at" = https://embersofvaldoria.com adresine yayın (`npm run deploy:cf`), Ömer "her şey tamam" dedikten sonra. Push'tan önce yerelde temiz kopyada tam `npm test` + build yeşil olmalı (Ömer 2026-10-25; yalnız hızlı testle kırmızı sürümler GitHub'a gitmişti); GitHub Actions da tam testi tekrar koşar, kırmızıysa Pages güncellenmez. **Gönderim kuyruğu (Ömer 2026-10-24):** her sohbetin modu var: `[kritik]` iş bitince haber verip teyitsiz kendisi gönderir, `[eşlik]` (etiketsiz) ilk kritik gönderimle gider, `[gün sonu]` gece 03:00 görevinde gider; sohbetler birbirine mesaj atmaz, `tools/push-queue.mjs` (push / ready / add / status) kullanılır.
- **Agent görev adları (Ömer 2026-10-09):** her agent başlatılırken açıklaması (Background tasks'ta görünen ad) agent türüyle başlar: `<tür>: <iş>` (ör. `ui-dev: battle HUD mockups`, `engine-dev: melee reach bug`, `balance-tester: Endless balance`, `content-designer: summon VFX`, `campaign-dev: item MVP`, `endless-dev: gear bag`, `multiplayer-dev: ...`). Tür `.claude/agents/` altındaki rollerden biridir; genel amaçlı agent kullanılsa bile açıklama işin rolüyle başlar.
- **Agent ve model seçimi (Ömer 2026-10-17):** roller `game/.claude/agents` içinde; oturumun açıldığı üst klasördeki `.claude/agents` buna bağlantıdır (junction), oturum üst klasörde açılır (hafıza oraya bağlı). Model rolün tanımındadır: **Opus** engine-dev, campaign-dev, content-designer, balance-tester, multiplayer-dev, bug-hunter; **Sonnet** ui-dev (küçük arayüz/veri işi), art-pipeline (ChatGPT: önce tarayıcı (Brave), Ömer 2026-10-25; yedek Codex CLI `tools/codex/imagegen.mjs`, `docs/arch/codex-imagegen.md`; + içe aktarma); **Haiku** yalnızca scout (salt okunur arama/özet; küçük denge ölçümünde sim çalıştırma). **KRİTİK İŞ ASLA Sonnet/Haiku'ya verilmez:** motor kuralı, kayıt/durum şeması, denge kararı ve denge değeri değişikliği (sim'i çalıştırıp ham çıktıyı toplamak kritik iş DEĞİLDİR), bellek/performans kök sebebi, yayın/deploy, gizlilik/veri; ui-dev işi bunlara dokunuyorsa Agent çağrısında `model: opus`. Ana oturum hata araştırmasını kendisi yapmaz, `bug-hunter`a verir; paralel çalışan agent'lar `isolation: "worktree"` ile ayrı kopyada çalışır. ChatGPT sanatı TEK art-pipeline agent'ıyla yapılır (Ömer 2026-10-17; iki paralel agent "Unusual activity" engeline yol açtı): varsayılanda bekleme yok; ChatGPT HERHANGİ bir uyarı verirse görseller arasında 2-3 dakika beklenir; sohbet başına en fazla 5 görsel; gönder düğmesine normal tıklama (betikle tıklama tarayıcı aracınca reddedildi); engel / kota / araç reddi sürerse dur ve raporla, ASLA aşmaya çalışma (`.claude/agents/art-pipeline.md`). Yayın tek komut: `npm run release -- <sürüm> "<satır>" ...` (`tools/release.mjs`); komut `assets/` altındaki yeni dosyaları EKLEMEZ, onlar önce elle `git add` edilir.
- **Ömer'in kelimeleri (2026-10-17):** agent'lar isteği kendi kafalarına göre genişletmez, istenmeyen ek iş yapmaz (ör. "boss müziği" denince elitlere de bağlanmaz; boş kalan ikon hücresine istenmemiş ikon eklenmez). Emin değilse sorar ya da raporda soru olarak yazar.
- **Küçük denge adımı akışı (Ömer 2026-10-18):** Ömer'in verdiği değeri Opus (ana oturum ya da balance-tester) uygular → `scout` (Haiku) sabit komutla kısa sim'i çalıştırır (`npx tsx src/sim/cli.ts 800 1` ve `800 50001`), ham çıktıyı dosyaya yazar, YALNIZCA dosya yolunu verir (özet/yorum yok) → Opus dosyayı kendisi okur, kısa tablo + öneri getirir. Bu akışta test setleri çalışmaz, sefer/Endless ölçülmez. Büyük denge turları tamamen balance-tester (Opus).
- **Parça parça yayın (2026-10-17):** çalışma kopyasında yarım iş varken yalnızca hazır bir parçayı yayınlamak için: yalnızca o dosyalar `git add` (karışık dosyada `git apply --cached` ile yalnızca ilgili parçalar) → yalnız index commit → `git worktree add --detach <scratch> HEAD` + node_modules bağlantısı PowerShell ile (`New-Item -ItemType Junction`; git-bash mklink yolu bozar) → orada tam `npm test` + `npm run build` → yeşilse `git push origin main`, değilse `git reset --soft HEAD~1`. Başka agent'ların stage'lediği değişiklikler commit'e girmez.

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

## Her arayüz değişikliğinde geçerli GLOBAL kurallar (özet; tam metin `docs/arch/ui-and-stage.md`)
- **Arayüz tasarım dili (ZORUNLU, Ömer 2026-10-18):** yeni arayüzün ana mantığı `docs/design/ui-design-language.md` (sade ve ferah, sınırları koru, bilgi hover'da, ortak parçalar: A Band ipucu, Gear item plakası, item ipucu v3, A Plates ve pasif 1. sırada, karakter kartı A).
- **Arayüz referansı (ZORUNLU):** yeni ekran / pencere yazmadan önce `docs/design/ui-reference.md`; aynı işi gören parça varsa onu kullan, kopyalama.
- **Tasarım kiti (Ömer 2026-10-09):** HER yeni arayüz, en küçük düğmeye kadar ana menü / Quick Battle "Twin Formations" dilindedir: Cinzel 600 büyük harf başlık/düğme + EB Garamond açıklama (**arayüzde italik YOK, Ömer 2026-10-23**: tüm arayüz yazısı düz; italik yalnızca hikâye anlatımında bir hikâye unsuruna kısa atıfta), ince altın çizgiler, kutusuz yazı düğmeleri, yumuşak geçişler. Phaser `src/game/elegant-ui.ts` (`el*`), DOM `src/ui/elegant.css` (`el-*`), savaş HUD'ı `src/game/hud-kit.ts`. Kor elmaslar idareli: yalnızca ekranın tek birincil eylemi ya da seçili öğe. Eski bronz dil kaldırıldı. Hareketler TEK yerde `data/ui-motion.json` -> `src/ui/motion.ts` (ekran geçişi `elGo` + `elScreenIn`, pencere `elModalIn/elModalOut`, DOM `.el-modal`). Düğme sırası: ikinciller solda, BİRİNCİL EN SAĞDA; iki çerçeve türü: Diyalog ve Çalışma paneli.
- **Geri / Menu kuralı:** kurulum/bilgi ekranında yalnızca sol üst Back, oyun içinde yalnızca sağ üst Menu (Esc) (ikisi birlikte yok). **GLOBAL HİZA KURALI (Ömer 2026-10-14):** Back, Menu ve tam ekran yazısız, aynı boy ikon düğmeleri; üst kenardan aynı `NAV_BTN.edge` px, Back sol kenardan Menu sağ kenardan aynı px içeride, her ekranda ve her boyutta (`src/ui/nav-icons.ts > NAV_BTN, navSvg, backPlacement`; Phaser `elBack`, DOM `nav-btn el-back`); yeni ekranda başka konum KULLANILMAZ. Tüm oyun içi Menu'ler TEK bileşen (`src/ui/game-menu.ts`, içerik `session-flow.ts > menuItems`). Onay yalnızca ilerleme kaybolacaksa (`elConfirm`).
- **Zemine dokununca kapanma:** pencereler kararan zemine dokununca kapanır (Close/Done/Resume ile aynı; sürükleme kapatmaz); DOM `src/ui/backdrop.ts > dismissOnBackdrop`, Phaser `elBackdropTap`, `openModal({ onDismiss, dismissOnBackdrop })`. Zorunlu seçimler ve kayıp yaratacak kartlar kapanmaz; onay pencerelerinde zemin = No.
- **Sürükle-bırak (Ömer 2026-10-10):** yuva doldurulan HER arayüzde sürükle-bırak (fare + dokunma, bırakma hedefi vurgusu, gölge); dokunarak seçme de çalışır. **Yuvalar arası taşıma (Ömer 2026-10-23):** dolu bir yuvadaki öğe, onu kabul eden başka bir yuvaya sürüklenebilir (ör. main hand ↔ off hand); hedef doluysa ikisi yer değiştirir, hedefteki öğe kaynağa uymuyorsa çantaya döner.
- Dokunmatik öncelikli girdi; fare ve klavye de çalışır. Dokunma hedefleri en az 44px (gerçek piksel).
- **Kısa ekran:** CSS `html.short` (<=520px) / `html.compact` (<=720px) sınıflarını kullanır (@media döndürülmüş sahnede yanlış ölçer).
- Yuva/hedef seçimi tek ortak hücre plakası dili (`shape-draw.ts` CellTile). Ana ekran dışı her sahne `lazy-scenes.ts` ile yüklenir (ayrıntı `docs/arch/sims-and-deploy.md` > Build).

## Klasör yapısı
```
CLAUDE.md
docs/arch/        konu belgeleri (motor, arayüz, asset, debug/wiki, sim/yayın; aşağıdaki dizin)
docs/design/      Ömer'in çerçevesi: vision, combat, classes, art, open-questions
docs/balance.md   denge hedefleri
data/             classes, skills, enemies, items, map JSON
src/engine/       saf savaş motoru (headless)
src/game/         Phaser sahneleri, sprite/animasyon sistemi
src/ui/           menüler, HUD, debug menüsü
src/sim/          headless savaş/denge simülatörü (CLI)
assets/           sprite, ses (placeholder'lar kodla üretilir)
tests/            vitest testleri
.claude/agents/   özel agent tanımları
```

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

## Konu dizini (yalnızca görevinin gerektirdiğini oku)
| Konu | Belge | Ne zaman oku |
|---|---|---|
| Savaş motoru, mekanikler | `docs/arch/battle-engine.md` | `src/engine`, skill/class/status/formula/AI verisi, çağrı, ceset, AOE, Rage/mana, kurulum seçenekleri |
| Savaş kuralları (tasarım) | `docs/design/combat.md` | hasar/AOE/durum kuralının ne olması gerektiği |
| Arayüz, sahne, ekran yapısı | `docs/arch/ui-and-stage.md` | herhangi bir ekran, pencere, HUD, menü, viewport, tam ekran, performans |
| Arayüz tasarım dili | `docs/design/ui-design-language.md` | yeni arayüz / mockup öncesi (ZORUNLU) |
| Arayüz parçaları referansı | `docs/design/ui-reference.md` | yeni ekran/pencere yazmadan önce (ZORUNLU) |
| Ekran tutarlılık denetimi | `docs/design/ui-consistency-audit.md` | ortak ekran yapısı, bekleyen tutarlılık işleri |
| Asset, sanat, ses, müzik | `docs/arch/assets.md` | sprite, poz, ikon (boyalı/v1/v2), vfx, ses, müzik, valor görseli, yükleme ekranı |
| Codex ile görsel üretimi | `docs/arch/codex-imagegen.md` | ChatGPT görselini tarayıcısız üretme (`tools/codex/`) |
| Sanat kılavuzları | `docs/design/art.md`, `docs/design/art-v2.md`, `docs/design/audio-map.md` | piksel art paleti, v2 yeniden tasarım, ses listesi |
| Debug menüsü, Codex/Wiki | `docs/arch/debug-wiki.md` | debug aracı ekleme, Codex/Wiki içeriği, Assets/Legacy |
| Simülatörler, build, yayın | `docs/arch/sims-and-deploy.md` | denge simi, kod bölme/yeni sahne, GitHub Pages, Cloudflare |
| Hata raporu (opt-in tanılama) | `docs/arch/diagnostics.md` | çökme/hata izi (`logEvent`), Settings > Privacy, Worker /diag, `npm run diag:pull` |
| Denge hedefleri | `docs/balance.md`, `data/balance.json` | sınıf/skill dengesi |
| Sefer (campaign) | `docs/design/campaign/campaign.md`, `docs/design/campaign/fill-plan.md` | sefer haritası, düğümler, karşılaşmalar |
| Item, ilerleme, Endless | `docs/design/progression/items.md`, `item-effects.md`, `roadmap.md` | item, ödül, Endless, ilerleme |
| Sınıflar | `docs/design/classes.md`, `docs/design/classes/hexer.md` | sınıf tasarımı |
| Yapay zeka öncelikleri | `docs/design/ai-priorities.md`, `docs/design/match-log.md` | YZ kararları, maç kaydı |
| Multiplayer | `docs/design/multiplayer.md` | ağ, lobi, lockstep |
| Tutorial | `docs/design/tutorial.md` | sefer tutorial'ı |
| Menzil sistemi | `docs/design/range.md` | hedefleme, menzil değerleri, dizilim yapay zekası (`range.enabled` bayrağı) |
| Level / XP | `docs/design/progression/levels.md` | XP, level, stat puanı ve başlangıç stat kuralı, düşman level'ı |
| Açık sorular / karar günlüğü | `docs/design/open-questions.md` (madde 330+; 1-329 `open-questions-archive.md`, aramada hariç) | varsayım eklerken (sıradaki numarayla) |
| Gelecek fikirleri | `docs/design/future-ideas.md` | "şimdilik alma" fikirleri |
| Kod haritası (büyük dosyalar) | `docs/arch/code-map.md` | 40 KB+ bir src dosyasını okumadan önce; kod yapısı değişince `npm run codemap` |
