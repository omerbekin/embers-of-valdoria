# Arayüz tasarım dili (2026 ekim, Ömer onaylı)
> **Ne için / Güncel mi (2026-11-08):** Arayüz tasarım dili (zorunlu): ana ilkeler, onaylı parçalar, mockup akışı. Doğru: arayüzde italik yok (bölüm 1, madde 5); `docs/arch/ui-and-stage.md` ile çelişirse bu belge geçerli. Parça dosyaları: `ui-reference.md`.


Ömer 2026-10-18: "yeni yaptığımız bu tasarım diline oyunun geneli için kural olarak oluştur. Sonraki sessionlarda yeni arayüz yaparken ana mantık buradaki gibi olsun."

Bu belge, 2026-10-18 günü onaylanan mockup turlarından çıkan ANA MANTIKTIR. Yeni bir ekran, pencere ya da ipucu yapan herkes, yazmadan önce bunu okur.
- Hangi dosyanın / işlevin kullanılacağı: `ui-reference.md`.
- Yazı tipi, renk, düğme sırası: `docs/arch/ui-global-rules.md` (tam metin `docs/arch/ui-and-stage.md`).

## 1. Temel ilkeler

1. **Önce mevcut parça.** Aynı işi gören ortak parça varsa onu kullan (bölüm 2). Yeni bir görünüm uydurma. Yeni parça gerekiyorsa onu ORTAK (global) kur ki başka ekran da kullanabilsin. Örnek: Formation ızgarası seferde, Quick Battle'da ve Multiplayer'da aynı.
1b. **Üç ekran boyutu (Ömer 2026-10-27).** Her arayüz, mockup ve sahne görseli 16:9 (1920x1080), 21:9 (2580x1080) ve telefon (yatay ~844x390, `html.short` / `html.compact`) için birlikte tasarlanır. Kenara yaslanan öğeler `stageView.left/right` ile yerleşir; kasaba/sahne görsellerinde kırpılan şeritte (21:9'da üst/alt, telefonda yanlar) tıklanacak yer olmaz; dokunma hedefleri telefonda da en az 44px. Mockup'lar ve doğrulama ekran görüntüleri üç boyutta da çıkarılır.
2. **Sınırları koru.** Mevcut bir ekranı yenilerken pencerenin boyutu, yeri ve çerçevesi aynı kalır. Yalnızca içerik iyileşir.
3. **Sade ve ferah.**
   - Boş, ölü alan bırakma. Ama her şeyi birbirinin içine de sıkıştırma: bloklar arasında nefes payı olsun.
   - Göstergeler sakin olsun: ince kenar rengi, küçük nokta. Baskın yeşil tik, kırmızı çarpı ya da dolgu kullanma.
4. **Bilgi hover'da, ekranda kalıcı değil.** Ayrıntı fareyle üstüne gelince açılır; tıklamak zorunlu değildir. Dokunmatikte tek dokunuş sabitler. Kalıcı cetvel, uyarı şeridi ya da tekrar eden yardım cümlesi koyma. Örnek: Formation'daki "Good spot" şeridi kaldırıldı, menzil cetveli hover kutusuna taşındı.
4b. **Abartısız animasyon (Ömer 2026-10-22).** Her yeni ya da yenilenen arayüz, şablonu uygularken uygun yerlerde sakin animasyon kullanır: kartta/düğmede hover'da hafif yükselme (birkaç px) + ince altın kenar parlaması, pencere/kart girişinde kısa sıralı belirme, seçimde yumuşak vurgu. Süreler kısa (yaklaşık 120-250 ms), zıplama/sallanma/dönme yok. Değerler `data/ui-motion.json`'dan gelir. Seçim kartları (karakter, companion, ödül gibi) ana menü kart mantığını kullanır.
5. **Düz yazı, arayüzde italik YOK (Ömer 2026-10-23).** Arayüzdeki her yazı (açıklama, yönerge, ipucu, alt başlık, uyarı, item satırları) düz EB Garamond olur. İtalik YALNIZCA hikâye anlatımında, bir hikâye unsuruna kısaca atıf yaparken kullanılır (ör. hikâye/olay metninde bir yer ya da kişi adına vurgu). Yeni arayüzde italik yazılmaz; eski italikler kaldırılır. Harita düğümü kartındaki lore/devriye satırı (`.sbc-info`) da düz yazılır (Ömer 2026-10-27; eski hafif-italik istisnası kalktı).
6. **Etiketler tek satırda.** Ad altındaki çipler (rol / Range N / sıra gibi) tek satıra sığar.
7. **Etkileşim kuralları.**
   - Tıklama seçer.
   - Yer değiştirme yalnızca sürükleyip birinin üstüne bırakınca olur; tık-tık ile yer değişmez.
   - Yuvalar arası taşıma (Ömer 2026-10-23): dolu bir yuvadaki öğe, onu kabul eden başka bir yuvaya sürüklenebilir (ör. main hand ↔ off hand, ring ↔ ring). Hedef doluysa ikisi yer değiştirir; hedefteki öğe kaynağa uymuyorsa çantaya döner.
   - Çift tık hızlı eylemdir (al / sat).
   - Düğmelerde ikincil eylemler solda, birincil eylem en sağda.
8. **Bonus yazımı (Ömer 2026-10-27).** Aynı havuzda toplanan (toplamsal) bonus "+12% damage" yazılır (item Global damage, Hero Oath hasarı/kritiği, Wayshrine *Add nimetleri, crit chance, accuracy, evasion...). Diğer bonuslarla ÇARPILAN ayrı çarpan **cümle biçiminde** yazılır: "20% more damage", 1'in altındaysa "20% less damage"; alınan hasar "Takes 4% less Holy damage" (Ömer 2026-10-27, silah tipleri reworkü: "×1.2" biçimi HİÇBİR oyuncu yazısında kullanılmaz; durumlar, pasifler, element hasarı / direnci, Speed / Max HP / Max MP / Accuracy, kritik hasarı, skill tree düğümleri, düşman kartları, Codex...). Kritik hasarı sütunda yüzde ("CDMG 150%"), element tablosunda etkisiz hücre "—". **Hesap da yazıya uyar (Ömer 2026-10-27):** bir düğümün rank'ları tek çarpanda toplanır, birbirini çarpmaz ("6% more per rank" rank 3 = 18% more, rank 5 = 30% more; rank yükselince eski bonusun yerine yenisi gelir); ayrı more / less kaynaklar birbirini çarpar (iki "10% more" item = 21% more, item 10% more + düğüm 18% more = 1.1 × 1.18, iki farklı düğüm de çarpılır; birleşme tablosu `src/engine/tree-hooks.ts > STACK_FORM`, test `tests/bonus-stacking.test.ts`); "+%" ve düz "+45" yazılanlar toplanır. Yazı her yerde `src/engine/bonus-text.ts` (`multText`, `moreText`, `lessText`, `addPctText`) ile üretilir; item şablonlarında `{0}` toplamsal, `{m0}` x(1+v) "v% more", `{l0}` x(1−v) "v% less" (yanlış biçim `validateItems` hatası). Oyuncuya açıklama: Codex > Mechanics > "How bonuses combine". Test: `tests/bonus-text.test.ts`.
9. **İngilizce yazım Amerikan (Ömer 2026-11-24).** Oyun içi bütün İngilizce metin Amerikan yazımıyla: armor, color, traveler / traveling, canceled, favor, rumor, smolder, Fervor (armour, colour, travelling, cancelled, favour, rumour, smoulder, Fervour YOK). Tarama listesi: `eov-forms-archive/uiform-live/r45/metin-tarama.md`.

## 2. Onaylı parçalar (her yerde aynı görünür)

| Ne | Görünüm | Kaynak / mockup |
|---|---|---|
| İpucu / küçük bilgi kutusu | **A Band**: solda ikon, renkli başlık şeridi, sağda değer, çipler, elmaslı ayırıcı | `src/ui/band-tip.ts/.css`, `public/mockups/tooltips.html` A |
| Item satırı / şeridi / listesi | **Gear > Hero item plakası**: kare ikon, yuva etiketi, Cinzel ad, Power / iL / affix özeti, köşe süsü yok (r47). Ek bilgi (fiyat) plakanın içinde sağda; kim takar bilgisi plakada yok | `src/ui/gear-plates.css`, `character-panel.ts` |
| Item önizlemesi | **Item ipucu v3**: madalyon ikon, nadirlik kurdelesi, iL, kademe etiketli satırlar, değer, kahraman satırları. Hover ile açılır | `src/ui/item-tip.ts` |
| Skill listesi | **A Plates**. **Pasif HER ZAMAN 1. sırada** | `skill-bar.ts > skillPlateHtml`, `public/mockups/skills-block.html` A |
| Karakter / kahraman kartı | **A**: portre, ad + sağda "Lv X", tek satır çipler, HP/MP çubukları, yalnızca 4 temel stat (STR / DEX / INT / LUCK, ana stat turuncu), skill'ler (pasif önce), pasif ayrı bölüm yok | `public/mockups/character-card.html` A, `public/mockups/formation.html` A |
| Evolve ikonu (skill) | Evolve düğümü ONAYLI skill'in ikonu o kayıtta HER yerde yavaş kor titremesi + altın kenar parıltısı (~2,6 sn döngü); evolve sanatı varsa ikon onunla değişir. Codex / Wiki ve Quick Battle sabit | `src/ui/evolve-icon.ts/.css`, `skill-tree-implementation.md > Evolve ikonu ve animasyonu` |
| Stat listesi | Gear Sheet A | `public/mockups/stats-panels.html` |
| Izgara hücresi uygunluk | Seçili ya da sürüklenen birim için HER hücrede hafif renk (iyi / zayıf / ulaşamaz). Hover kutusu: "X · FRONT ROW", tek cümle, 4 parçalı çubuk | Formation A (ortak bileşen) |
| Sefer haritası düğümleri | C çerçeveleri, biraz küçük; çift yol | `src/game/map-frames.ts`, `public/mockups/map-nodes.html` |
| Sonuç ekranı | A (plaket, satır başına birim, özet şeridi) | `result-screen.ts`, `public/mockups/battle-result.html` |

### 2.1 Çerçeve köşe süsü (Ömer 2026-11-21)

**Köşe süsü = yuvarlak üç nokta** (Ömer 2026-11-21, mockup uc-nokta-3 onaylı, oyuna bağlandı). Bugün köşe karosu olan HER çerçevede karo yerine üç nokta (fildişi `#f6e8bc`); karosu olmayan yere nokta eklenmez. Süs karoları (düğme uçları, başlık süsü, madde imi, sıra göstergesi, seçim işareti: çanta `.gr-dia`, kenar ortası `.mw-notch` / `.sbc-notch`, hücre köşe işaretleri `shape-draw.ts`) KALIR.
- **Boy (tek kural):** taban 4 px; kutunun KISA kenarına göre (masaüstü px): 80 altı +%25, 80-150 +%50, 150-300 +%75, 300 ve üstü +%100. Adım = en az 8 x kademe ve çapın 1,9 katı.
- **Konum:** yalnız kısa kenar 70 altı VE kareye yakın (en / boy <= 1,25) kutularda üst + alt kenara ortalı (üçer nokta); öbür her yerde bugünkü köşe konumunda (sol üst + sağ alt; bugün üst iki köşede karosu olan çerçevede sol üst + sağ üst). Dört köşede karosu olan çerçeve (harita penceresi, Form your company, Phaser `elPanel`) sol üst + sağ alt olur.
- **Telefon:** nokta kutu ölçeğinden türer (`--cd-u` = `--bu` / `--u`), oran masaüstünü aşmaz. Harita penceresinde telefonda noktalar kenarın 3 px içinde (kırpılma + yazıya değmesin). Telefonda bugün karosu olmayan yerde (`.bh-gcol`, `.vl-meter`) nokta da yok.
- **Uygulama (TEK yapı):** kural `src/ui/corner-dots-rule.ts` (DOM + Phaser ortak), DOM işaretleyici `src/ui/corner-dots.ts` (host listesi `CD_HOSTS`: yeni çerçeve eklerken karo çizme, listeye yaz), çizim `src/ui/corner-dots.css`, Phaser `src/game/corner-dots-gfx.ts > drawCornerDots` (`bandTip`, `elPanel`, `kitCorners`, sonuç ekranı). Ölçüm: `?debug=1` ile `window.__cdProbe()`.
- **Skill ağacı (Ömer 2026-11-25: ağaç düğüm karoları > nokta, r46):** Gear > Tree'de düğüm ortası işareti (Filler / Edge), Evolve düğümünün üstündeki küçük işaret, Saga Mastery çubuğu işaretleri ve "skill points to spend" puan işareti karo değil YUVARLAK NOKTA (düğümün kendi rengi korunur; fildişi değil, üç nokta değil, tek nokta). Sheet'teki stat puanı taşı elmas kalır. Ultimate çekirdeği (`.gt-ucore`, büyük elmas çerçeveli ikon) elmas KALIR, 1,3 kat büyük (Ömer 2026-11-25 r47); Evolve kıvılcımları (efekt) bu karara girmedi. Kod `src/ui/tree-tab.css`.
- **Eşya plakası köşesi (Ömer 2026-11-25 r47):** Gear eşya plakasında (`.gr-slot.gr-plate`, plaka kullanılan her yer) köşe süsü YOK: ne karo ne nokta.
- **Menü seçili satırı (Ömer 2026-11-25 r47, mockup menu-thread V5):** ana menü ve Settings sol sütununda seçili satır = "yanan fitil" (kor uç + yazı altına inen fitil + gevşek iplik, kıvılcım ilerler; hareketi azalt = sabit). Kod `src/ui/menu-fuse.ts`. Diğer süs karoları (düğme uçları, başlık süsü, madde imi, sıra, seçim, kenar ortası, hücre, sonuç, Quick Battle, Codex, Settings satırı) Ömer seçene dek bugünkü haliyle durur (mockup `public/mockups/karo-gruplar.html`).
- **Savaş avatarı portresi** bugünkü çift ince çizgi + yan renkli glow çerçevesinde kalır (nokta YOK). Hikâye diyaloğu portresi (`.sd-pic`) de aynı çift çizgi + ışımayı alır; konuşanın tarafı bilinmediği için ışıma NÖTR ALTIN, nokta yok.

## 3. Çalışma akışı

1. **Mockup.** Ömer'in "mockup" isteği ui-dev (Sonnet) agent'ına gider. Mockup oyunun gerçek görünümündedir: gerçek CSS, sanat ve fontlar. `public/mockups/<ad>.html` içinde A / B / C seçenek olur, her biri tek satır Türkçe notla.
2. **Yayın.** Ana oturum mockup'ı 5000'e ve Pages'e koyar, iki linki verir.
3. **Seçim.** Ömer seçer, genelde düzeltmelerle. Düzeltme gelirse eski seçenekler silinir ve yeni 3 seçenek yapılır.
4. **Oyuna ekleme.** Seçilen seçenek ortak parçalarla oyuna eklenir.
5. **Kural.** Ömer bir görünümü "global" ya da "kural" derse bu belgeye ve `.claude/agents/ui-dev.md`'ye yazılır.

## 4. Unified rules (owner decisions 2026-11-09, UI unification form)
These rules replace any older, conflicting per-screen habit. Code owners: `src/ui/elegant.css` + `src/ui/tokens.css` (DOM), `src/game/elegant-ui.ts` (Phaser).

### 4.1 Buttons: one `.el-btn` family, three named sizes
- **Screen 64 px**: the single big action of a screen (Start Battle, Begin the journey, Ready). DOM `.el-btn.scr` (token `--btn-scr-h`), Phaser `elButton(..., { sz: 'screen' })`. Primary buttons default to Screen in Phaser.
- **Dialog 48 px** (default `.el-btn`): actions in a window or dialog (Done, Cancel, Leave, Hero details). Token `--btn-dlg-h`; Phaser `sz: 'dialog'` (default for secondary).
- **Compact 44 px**: in-row and card actions (Buy, Load, Delete, Respec). DOM `.el-btn.sm` (token `--btn-cmp-h`), Phaser `sz: 'compact'`.
- Tabs use `.gr-tab` (token `--btn-tab-h`, 44 px). Phone (`html.short`): every size shows 30 px, touch area stays at least 44 px (`phone-buttons.ts`).
- **Tabs + gold, one rule everywhere (Owner 2026-11-11, "small" pick B).** Tabs are a segmented box: thin outer border, thin dividers between tabs, the active tab has an ember-tinted fill, no ember diamond, no underline. Gold is a plain frameless bigger number (no pill, no border). One shared CSS rule in `src/ui/gear.css` (`.gr-tabs / .bs-tabs / .ct`, `.gr-gold / .bs-stones / .gr-loot-gold`); Gear, merchant, Blacksmith, Camp/Inn, Loot all use it. Never restyle tabs or gold per screen.
- **One Settings screen (Owner 2026-11-11).** Settings is the single DOM screen `src/ui/settings.ts` (left category column + page rows). The main menu opens the same screen (menu slides left); there is no Phaser Settings copy. Opened from the main menu the Account page is the full sign-in page, in game it is the read-only line.
- `.gr-btn`, `.sh-btn`, `.mp-btn`, `.bs-tab`, `.ct-b` no longer exist. Phaser call sites never pass ad-hoc `h` / `size`; they use the presets (`BTN_SIZE` in `elegant-ui.ts`).
- Order: secondary on the left, primary on the right. Hover lifts a few px with a gold glow.

### 4.2 Dialogs and confirmation
- Two implementations only: Phaser `elConfirm`, DOM `openElDialog` (+ `openElConfirm` on top of it). `confirmIn` (Gear) and the Menu's inline confirm are gone.
- A confirm has **Cancel** (left) and one **action verb** (right, primary; red `danger` when destructive). Never Yes / No / Stay. Windows also close with an **X icon in the top-right corner**. Esc, X and a tap on the dim backdrop all mean Cancel. Mandatory choices have no X and ignore backdrop / Esc.
- Label dictionary (single source `src/ui/confirm-labels.ts`): `cancel` Cancel, `title` "Are you sure?", `leave` Leave, `retreat` Retreat, `load` Load, `delete` Delete, `start` Start, `abandon` Abandon, `discard` Discard, `confirm` Confirm. Add a verb there, never inline.
- A confirm opens above the window that asked (Gear, Menu), which stays open behind it.
- Setup screens have only the top-left Back; a Multiplayer lobby therefore has no extra "Leave" button.

### 4.3 Tooltips: one Band box, no folding
- One Band box spec (`BandTipSpec`, `src/ui/band-tip.ts`; Phaser twin `src/game/band-tip.ts`). Wrapper classes (`bh-sktip`, `gr-tip`, `tt-tip`, `cw-tip`, `vl-tipbox`, `fb-tip`) only position the box; the frame is always `.bt`.
- **No More / Less folding anywhere.** Keep tooltip text short; long detail lives in the Codex. (The old fold code, `.bt-morebtn` and the `MORE_MARK` row path, was removed.)
- Item tooltip v3 stays separate (`src/ui/item-tip.ts`).

### 4.4 Toast and status
- Toast sits **top-center**, like Phaser `elToast`: gradient band, plain EB Garamond, no green / red fill (an error only tints the text slightly). DOM `src/ui/el-toast.ts` (`showElToast`), used by `showToast` (match-copy.ts) and the Multiplayer toast.
- Connection status is a thin band with a diamond (`.el-statusband`); the colour lives only in the diamond.
- The Multiplayer prompts (join code, name, copy invite) are `openElDialog` + `.el-field`. The old bronze language (Georgia, `#8a6a32`, `.mp-*`) is gone.

### 4.5 Tokens
- One token file `src/ui/tokens.css`: `--font-display` (Cinzel), `--font-body` (EB Garamond), `--font-num` (Palatino stack), `--scroll-thumb`, plus aliases `--g-disp`, `--g-body`, `--el-display`, `--el-body`, `--bt-*`, `--gar`. Screen CSS never redefines them. JS twin: `DISPLAY_FONT`, `BODY_FONT`, `NUM_FONT` in `src/ui/menu-style.ts`.
- Shared helpers: HP bar `hpBar` (`src/game/campaign-ui.ts`), gold icon `goldImg` (`src/ui/ui-icons.ts`).
- The main menu has one look (the old "classic" branch and `?menu=old` were removed).

### 4.6 Formation
**Board itself: decided 2026-11-10: global campaign board.** Campaign Formation, Quick Battle, Multiplayer and Endless pick all use the same DOM grid (`src/ui/formation-board.ts`, `gridOnly` mode via `src/game/scene-board.ts` on Phaser screens): cell 128, spot dots on every cell for the dragged hero (green good / orange exposed / red out of reach), rating tooltip on the hovered cell, drag from the roster strip previews the same way. No screen draws its own grid. Quick Battle: click on a hero selects (campaign rule); to remove a unit drag it onto the roster strip (or Clear). Endless: drag a hero onto the roster area to remove.

**Surroundings: decided 2026-11-10 (owner picks, form "Formation ve Seçici").** One legend component, `src/ui/spot-legend.ts` (gold hairline + diamond marks + small Cinzel caps: "Good spot / Exposed in front / Out of reach", colors = the board dots). Where it shows:
- **Quick Battle and Multiplayer team setup (shared code, `src/game/board-legend.ts` from `TeamSelectScene`):** the legend sits UNDER each board and is visible ONLY while the pointer is over a board cell or while a hero is being dragged (from the roster or the board); hidden otherwise, short fade (`data/ui-motion.json` > tooltip). Touch: only while dragging.
- **Campaign town Formation window:** the same component replaces the long help sentence (always visible, same place under the grid). With `range.enabled` off the old plain sentence returns.
- **Endless "Choose your company":** board on the left with the same legend line under it (always visible), portrait-tile roster panel on the right (class-color underline, "In team" mark; `src/game/endless-roster.ts`). Drag a hero onto the board (spot dots show live) or click to add / remove; drag a board hero onto the panel to remove.

Board feature (not a variant, always on): **right-click on a placed hero removes it from the board** (back to the roster) in Quick Battle, Multiplayer (your board) and Endless pick (`remove` option of `src/ui/formation-board.ts`, pure rule `removeTarget` in `formation-board-rules.ts`, test in `tests/formation-board.test.ts`). Empty teams stay allowed there (Start / Ready still need a full team, same as the existing "drag to roster" removal). Campaign Formation window: no remove (the company keeps every hero on the board; benching happens only through the Recruit window swap), so right-click does nothing there. Touch keeps the existing remove paths (drag onto the roster / strip).

How to reach: Quick Battle: main menu > Play > Quick Battle. Multiplayer: Play > Multiplayer, create a lobby. Campaign town: open a campaign, town, Formation button. Endless pick: `?endless=1` (or debug menu > Setup > Endless), Start Run / New run.

### 4.7 Hero pickers (decided 2026-11-10)
ONE shared picker component, `src/ui/hero-picker.ts` + `hero-picker.css` (scope `.mw.hp`). A change in it applies to every screen below.
- **Used by:** Choose your hero (new campaign start), Recruit window (the town recruit spot, reserve swap, boss / volunteer recruit; there is no separate Barracks view since 2026-11-10), shrine Swear. Hook: `mountHeroPicker` in `src/ui/map-window.ts` (body "cards").
- **Left = row list:** portrait, name, role, STR / DEX / INT / LCK (primary stat highlighted), class emblem at the right edge (every class has one, Thunder Skald too: `assets/misc-icons/class/skald.*`). Leader crown on the row corner.
- **Right = hero card, height = total height of the rows** (at least its natural height when there are few rows): big portrait, name, role / Range / primary chips, description, and BELOW it the skills list: passive FIRST, then the 4 skills (4th = ULTIMATE), real skill icons + names in the compact skill plate look (`.hp-sk`: diamond-corner icon, Passive / Ultimate tag, Cinzel name; same kit as the gear / tree plates). Hover on a row previews that hero; the picked row stays highlighted.
- Phone (`html.short`) keeps the old card look.
- **Choose a companion = the Recruit window (decided 2026-11-10):** the SAME window and code (`CampaignMapScene > recruitWindow`, map-window A plate, title "Recruit", banner + sword emblem `emblem:recruit` in the town medal, shared header `mwHeaderHtml`); only the intro line differs. List box = exactly 4 rows high (scrolls when more; same right card height); recommended heroes sit first with a small "Recommended" tag. Footer: buttons right-aligned, same size; at campaign start the "Name your company" field + Suggest sit on the same footer row at the left (`name` option of `MwSpec`). Phone (`html.short`) and Form your company (3 slots) keep the old slot + strip window (`company-window.ts`).

### 4.8 Hero card
Pending owner decision (one hero card / portrait frame across screens: not decided yet).
