# Playtest 2026-10-23 — Ömer'in seçtiği öneriler (uygulama notu)

Kaynak: Fable'ın built-in browser'da oynadığı Map 1 playtest'i (play-build 0.9.7.1, Normal/Medium, Defender · Mage · Paladin, 9 düğüm, 2 ölüm). Günlük: `docs/design/playtest-2026-10-23.md`. Seçim sayfası: https://claude.ai/artifact/NDmLkTncd4TBYynBfwnzno (db `playtest/main`).
Ömer 40 kartın 35'ini seçti. Seçilmeyenler: **D3** (ult miss), **D10** (ıska koruması), **U6** (Treasure zorluk rozeti), **H1** (savaş süresi/ödül) — bunlara dokunma.

Çalışma kuralları (CLAUDE.md + hafıza): işi ilgili agent'lara ver (ui-dev Sonnet, engine/balance Opus); denge değerleri Opus; yeni mekanik/stat gerekiyorsa önce Ömer'e sor; sim çalıştırmadan önce onay al; hepsi bitince tek push (patch sürümü, Pages + 5000 rebuild).

---

## HATA

### B1 · Kasaba ilerlemesi kaydedilmiyor (Yüksek)
Gözlem: Valdren Keep'te 6 eşya alındı, Warrior kadroya katıldı, Warden diyaloğu bitti, 4 ember alındı. Dwarven Mine'da ölünce "Load Last Save" Charcoal Camp'e (kasaba öncesine) attı: alışveriş, Warrior, diyalog, emberler gitti; altın 161'e döndü.
Öneri: Her kasaba işleminden (satın alma, recruit, diyalog sonu, Castle Gate) sonra otomatik kayıt. Defeat'teki "Load Last Save" kasabayı korusun.
Not: Önce `src/game/campaign-session.ts` / `src/campaign/` içinde kaydın ne zaman yazıldığına bak; checkpoint tasarımıysa da Ömer bunu istemiyor → kasaba işlemleri kayda girsin.

### B2 · Stat puanı Confirm'siz kayboluyor (Yüksek)
Gözlem: Sheet'te "+" basıp Tree sekmesine geçince puan sessizce geri dönüyor; uyarı yok.
Öneri: Sekme değişiminde bekleyen puanı otomatik onayla ya da "1 puan onaylanmadı" uyarısı; Confirm düğmesi "+" düğmesinin yanına.

### B3 · "LEVEL UP" rozeti puan harcandıktan sonra kalıyor (Orta)
Gözlem: Loot ekranında puanlar harcandıktan sonra da üç kahramanda rozet duruyor.
Öneri: Bekleyen puan yoksa rozet sönsün ("Lv 3" kalsın).

### B4 · Yapışan tooltip'ler (Orta)
Gözlem: Tüccarda "Today's pick" War Maul kartına tıklayınca büyük tooltip kalıyor, Esc kapatmıyor, listeyi ve bag'i örtüyor. Tree node tooltip'i ağacın üstünü kapatıyor.
Öneri: Tooltip yalnızca hover/basılı tutma; tıklama = seçim. Esc ve dışarı tıklama her tooltip'i kapatsın. Tree tooltip'i ağacın sağına/altına kaysın.

### B5 · Formation'da tıklayarak yer değiştirme çalışmıyor (Orta)
Gözlem: "Click a hero, then click an empty cell" yazıyor; dolu hücreye tıklayınca swap değil seçim oluyor. Sürükleme gerekiyor ama metin bunu küçük yazıyla söylüyor.
Öneri: Seçiliyken dolu hücreye tıklamak yer değiştirsin (CLAUDE.md yuvalar arası taşıma kuralı). Yardım metni iki yolu da söylesin.

### B6 · Sheet'te "SKILL TREE – COMING SOON" kalıntısı (Orta)
Öneri: Paneli kaldır; yerine o kahramanın mastery özeti (2/25, aktif node'lar).

### B7 · Düşman adı tutarsız (Düşük)
Gözlem: HUD "Pass Crossbowman", veri/log "Bandit Crossbowman".
Öneri: Tek kaynak: düğüm verisindeki ad HUD'a da gitsin.

### B8 · Diyalog seçeneğinde vurgulu kelime erişilebilir isimden düşüyor (Düşük)
Gözlem: "Because the Ash Lord's men will cross it" erişilebilirlik ağacında "Because the 's men…" görünüyor.
Öneri: aria-label'ı bozmayan işaretleme (<em>/<b>) ya da butona aria-label.

### B9 · Tutorial "turn bar"dan bahsediyor ama o savaşta yok (Düşük)
Öneri: İpucunu çubuğun göründüğü savaşa taşı ya da tutorial'da da çiz.

---

## DENGE

### D1 · Seviye atlamak güç vermiyor (Yüksek)
Gözlem: Lv1→Lv3 Defender 143 HP, Paladin 104 HP aynı; kazanç +1 stat ve +1 zayıf filler. Düşman Lv2'de %20-25 daha fazla HP (Moor Raider 95→117).
Öneri: Level başına +%6 Max HP ve +%4 MP, stat puanı 2; ya da düşman HP eğrisini seviye başına %10'a çek. Tier I filler'lar hissedilir olsun (D9).
Not: Stat puanı sistemiyle kasıtlı mı önce `data/` ve `docs/design` altında bak; HP/MP per level yeni bir kural sayılır → uygulamadan önce Ömer'e seçenek sun.

### D2 · Charcoal Camp ve Dwarven Mine duvar (Yüksek)
Gözlem: Charcoal Camp 6 düşman/2 dalga, Shieldwarden 119 HP; Lv2 kadro ilk deneme 38 turda tam ölüm, Taunt+DoT+AoE ile 56 turda ancak. Dwarven Mine ("Treasure"): Thane 154 + Warden 155 + 4 destek, 4 kahramanla 73 turda ölüm.
Öneri: Charcoal Camp dalga 2'yi 2 düşmana indir, Shieldwarden'ı kaldır. Dwarven Mine'ı Elite işaretle ve Lv4 hedefle; ya da dalga 2 Crossbowman'leri sil.
Not: U6 seçilmedi → düğüm kartına zorluk rozeti EKLEME; sadece karşılaşma içeriğini ayarla. Sim öncesi onay.

### D4 · Düşman her savaşa önce başlıyor (Yüksek) — **Ömer: "Sorunu çözelim ama başka öneri yap"**
Gözlem: 9 savaşın hepsinde biz davranmadan 3 düşman turu geçti: Blinded, Slow, 20-25 hasar. Mage ilk hamlesinde %75'te.
Reddedilen öneri: dönüşümlü başlangıç / ilk turda debuff yasağı.
Yapılacak: Önce sebebi bul (hız değerleri? ilk tur sıralaması? initiative formülü?) ve Ömer'e 2-3 FARKLI çözüm sun (örn. savaş başı oyuncu hız bonusu, kahramanlara eşit sıra garantisi, düşman ilk hamlesinde yalnızca hareket, hız dengesini düşman verisinde düzeltme). Seçmeden uygulama.

### D5 · Arka sıra odağı: Mage her savaşta ölüm sınırında (Orta)
Gözlem: Charcoal Burner AoE + Crossbowman + Acolyte Mage'i %10-20'ye çekiyor. Taunt menzilli saldırıları etkilemiyor gibi.
Öneri: Taunt menzilli hedef seçimini de bağlasın (%70 ağırlık). AI'nin "en düşük HP'yi vur" ağırlığını bölge I'de düşür.

### D6 · Dinlenme boşluğu ve görünmeyen regen (Orta)
Gözlem: Ashford→Valdren arası 4 savaş (3'ü 2 dalgalı), dinlenme yok; düğümler arası sessiz regen var (%47→%73) ama yazmıyor.
Öneri: Düğüm geçişinde "+%25 yol dinlenmesi" bildirimi. Cairn Hill sonrası Rest düğümü ya da Charcoal Camp öncesi kamp.

### D7 · XP ödülü zorlukla orantısız (Orta)
Gözlem: Brackenridge 24 XP, Cairn Hill (6 düşman, 117 HP Raider) 20 XP, Charcoal Camp 38 XP. Lv2→3 için 61 XP.
Öneri: XP = toplam düşman level × 4 + dalga bonusu. Zor düğüm az XP vermesin.

### D8 · Ekonomi tutarsız (Orta)
Gözlem: Savaş ödülü 12-16 altın; eşya 8-160; temper 94 (sat fiyatı 39 olan item için). Iron Buckler iL2 +3 armor 72, Leather Jerkin iL4 +4 armor 16.
Öneri: Fiyat = iL × 6 + rarity çarpanı (tek tablo). Temper = sat fiyatı × 1.5. Savaş altını 20-40.
Not: `docs/design` ekonomi formu/kararlarıyla (economy-form) çakışmasın; önce oradaki kararlara bak.

### D9 · Tier I filler node'lar çok zayıf (Orta)
Gözlem: Braced Stance armor %3 (≈1.5 armor); Wrathful Glow INT %2 (0.5 hasar).
Öneri: Her Tier I filler en az görünür bir sayı: +%4 hasar, +8 HP, +%3 isabet. Koşullu olanlar %6+.
Not: Tree balance 0.9.6.x'te +20..25 hedefiyle ayarlandı; filler'ı artırırken toplam tree gücü hedefini koru (sim onayla).

### D11 · Paladin Lv1'de aktif heal yok (Düşük) — **Ömer'in notu = Radiance rework**
Ömer: "Radiance rework: tek hücreye aoe atsın. Dosta atarsa burst heal + holy ground dosta heal atsın. Düşmana atarsa aynı skill effecti 1 aoe."
Yapılacak: Radiance (Paladin ult) hedef seçilen tek hücre merkezli AoE olsun; dost hücreye atılırsa anlık heal + o alanda kalan "holy ground" dostlara tur başı heal; düşman hücreye atılırsa aynı alan şekliyle AoE hasar. Kartın orijinal önerisi (Holy Strike %30 heal / Mend) yerine BU uygulanır. content-designer + engine; vfx aynı efekt iki renk/mod.

### D12 · Recruit seviyesi (Düşük)
Gözlem: Barracks'tan gelen Warrior (Lv1?) elit Thane'in ilk odağında 12. turda öldü; seviye listede yok.
Öneri: Recruit'lar partinin ortalama seviyesinde gelsin; harita party listesinde seviye yazsın.

---

## ARAYÜZ

### U1 · Harita etiketleri çakışıyor (Yüksek)
Gözlem: "Iron Pass" etiketi "THE BORDERLANDS" başlığının ve bölge II'de Valor HUD'unun altında; Ashford etiketi marker'ın üstüne biniyor.
Öneri: Etiketleri çakışmaya göre kaydır; HUD altındaki düğümleri harita kaydırmasıyla açığa çıkar.

### U2 · Düşman inspect paneli hedeflerken açılıyor (Orta) — **Ömer: "Önerin güzel. Panel yeni tur başlayınca kapanmasın, eskisi gibi devam etsin"**
Gözlem: Skill seçmeden düşmana tıklayınca sağda kalıcı panel açılıyor, sahnenin 1/3'ünü kapatıyor.
Yapılacak: Panel yalnızca basılı tutma/uzun basma ile açılsın; tek tıklama her zaman hedefleme. Panelin tur başında otomatik kapanması YOK (açık kalma davranışı eskisi gibi).

### U3 · Banner ve ipucu yığılması (Orta)
Gözlem: Haritaya dönüşte 3 "reached Level 3" banner'ı + "Roads" ipucu aynı anda; tüccarda intro + ipucu üst üste.
Öneri: Tek birleşik banner ("Company reached Lv 3 · 3 stat points"), ipuçları kuyruğa.

### U4 · DoT ve regen görünmüyor (Orta) — **Ömer: "Bununla ilgili başka notum vardı. Oradaki rework'e buradaki bilgiyi uygula"**
Gözlem: Judgment anında hasar vermiyor, Holy Fire 8/tur; HUD'da tur başı popup yok. Road Thug Grudge ile 76→80 HP aldı, yeşil sayı yok.
Öneri: Durum ikonu + tur başı "Holy Fire 8" sayısı; regen için yeşil +HP popup; skill kartında "Damage over time" etiketi.
Yapılacak: Ömer'in daha önceki ilgili notunu bul (`docs/design/future-ideas.md`, open-questions, HP/wound rework notları — DoT/regen/status görünürlüğü ile ilgili bir rework) ve bu kartı ayrı iş yapmak yerine o rework'ün kapsamına ekle. Bulamazsan Ömer'e hangi notu kastettiğini sor.

### U5 · Victory ekranı geç açılıyor (Orta)
Öneri: Tıklama animasyonu atlasın; Continue ilk kareden aktif.

### U7 · Valor'un savaşta nasıl kullanıldığı belli değil (Düşük)
Gözlem: 4/8 ember var ama kahramanlar düşerken HUD'da "Revive" görünmedi.
Öneri: Düşen kahramanın portresinde "Revive · 1 ember" düğmesi; ilk düşüşte bir kerelik ipucu.
Not: Valor'un gerçek kuralını önce oku (belki savaş içinde kullanılmıyor); kural değişikliği gerekiyorsa sor.

### U8 · Temizlenmiş kasabaya haritadan gidilemiyor (Düşük)
Öneri: Temizlenmiş düğümlere tek tıkla hızlı seyahat (patrol savaşı kuralıyla uyumlu).

### U9 · Tüccar seçim toggle'ı (Düşük)
Gözlem: Seçili ware'e tekrar tıklayınca seçim kalkıyor, BUY kayboluyor; iki ware seçiliyken iki BUY.
Öneri: Tıklama her zaman seçer; satın alınca seçim temizlenir.

### U10 · Blacksmith giyili eşyayı seçmiyor (Düşük)
Öneri: Giyili yuvalar da temper hedefi olsun.

---

## HİS

### H2 · Tutorial kadrosu uyarısız gidiyor (Orta)
Gözlem: Ashford'da "Farewell": tutorial'da harcanan stat/tree puanları ve ekipman gitti; uyarı yoktu.
Öneri: Tutorial'da puan harcatma (ya da "geçici kadro" etiketi) ve Ashford'da bir cümlelik uyarı.

### H3 · "Fight" deyince kadro seçimi sürprizi (Orta)
Gözlem: Ravenwood'da Fight'tan sonra beklenmedik recruit/kadro ekranı.
Öneri: Düğüm kartında "Form your company" adımı önceden yazsın; düğme "Continue" olsun.

### H4 · Defeat sonrası kaydın nereye döneceği yazmıyor (Düşük)
Öneri: "Load Last Save" altında kayıt yeri ve zamanı ("Charcoal Camp · 12 dk önce"). B1 ile birlikte yap.

---

## ANİMASYON

### A1 · Fist Crush banner'ında dev ikon (Orta)
Gözlem: Banner'ın sağında kocaman eldiven ikonu metnin üstüne biniyor; vuruş VFX'i kısa ve silik.
Öneri: Banner ikonunu 32px'e indir, metnin soluna al. Ult vuruşuna ekran titremesi + 0.3 s zemin çatlağı.

### A2 · Arka sıra sprite'ları önü örtüyor (Düşük)
Öneri: Çizim sırası y'ye göre (öndeki üstte); hit alanı sprite gövdesiyle sınırlı.

### A3 · Wave geçişi sessiz (Düşük)
Öneri: "Reinforcements!" banner'ı + yandan koşarak giriş.

---

## NİTPİCK (N1, tek cila turu)
- Summon ult cooldown'dayken açılıyor, yerleştirme hücreleri görünmüyor.
- "NATURE SU…" etiketi kesiliyor.
- Notice Board boş.
- "Road Out" etiketi dar.
- Loot ekranında boş bag ızgarası gereksiz yer kaplıyor.
- Düşman turunda Rest/Skip/Move düşman panelinde görünüyor.
- Formation ipucu kasaba çıkışında, Formation düğmesi ise haritada.
- Party listesinde Warrior'un seviyesi yok.
- Campfire metni "first rest was your arrival" ilk gelişte kafa karıştırıcı.
- Victory'de "COPY MATCH DATA" oyuncu için anlamsız.

---

## Önerilen iş bölümü
- **bug-hunter / engine (Opus):** B1 (+H4), D4 sebep analizi + seçenekler, D5 Taunt/AI.
- **ui-dev (Sonnet):** B2, B3, B4, B5, B6, B7, B8, B9, U1, U2, U3, U5, U7, U8, U9, U10, A1, A2, A3, H3, N1.
- **content-designer + engine:** D11 Radiance rework.
- **balance-tester (Opus, sim onayı ile):** D1 (önce Ömer'e seçenek), D2, D6, D7, D8, D9, D12.
- **campaign-dev:** D6 Rest düğümü / yol dinlenmesi bildirimi, H2 tutorial uyarısı.
- U4 → mevcut rework notuna bağla (bul, sor).
