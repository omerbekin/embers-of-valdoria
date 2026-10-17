# Level / XP sistemi (KARAR, Ömer 2026-10-17)

Kaynak: seçim formu https://claude.ai/artifact/Ccg6M8igYvQEZGqxbCRsyK (db `levels/main`) + sohbetteki netleştirmeler. Uygulama 2026-10-17 12:00 sonrası, Item Güçlendirme planıyla (itempower/main) birlikte; ardından tek denge turu.

## Eğri ve tavan
- **Tavan L50.** Bölüm başına ~10 level (bölüm 1 -> L1-10 ... bölüm 5 -> L41-50). Item seviyeleri de 50'ye çıkar; aradaki içerik ileride sefere eklenecek.
- **Normal oyuncu biraz geride:** farmsız, her düğümü bir kez oynayan oyuncu bölüm sonunda o bölümün tavanının ~1-2 level altında (ör. bölüm 1 sonu ~L8, 2 ~L17, 3 ~L26). Tavana farm ya da Endless ile ulaşılır.
- **Eğri başta hızlı, sonra yavaş:** ilk level'lar 1-2 savaşta, bölüm sonundaki level'lar 6-8 savaşta.

## XP kaynağı
- **XP düşman başına** kazanılır (savaş sırasında birikir, savaş bitince kahramanlara yazılır).
- Düğüm çarpanı: savaş 1x, elit 2x, boss 4x; olay ve hazine düğümü 0,5x (sabit XP).
- **Takıma bölünür:** düşman XP'si savaşa giren kahraman sayısına bölünür. Düşen kahraman bölen sayısından ÇIKMAZ. Düştükten sonra öldürülen düşmanların payını %50 cezayla alır (düşmeden önceki öldürmelerin payı tam).
- **Sonradan katılan kahraman L1'den başlar**, geride kalan için yakalama bonusu (değer denge turunda).
- **Tekrar ziyaret (farm):** XP %100; frenleme level farkıyla (aşağıda).

## Level farkı (farm ve item'le güçlenen takım freni)
- Her düğümün/karşılaşmanın bir seviyesi var. Kahraman bu seviyeden **2 level'dan fazla yukarıda ya da aşağıda** ise XP azalmaya başlar; **8 level farkta XP gelmez** (2 ile 8 arası doğrusal).
- **İstisna (yeni katılan / geride kalan):** bandın dışında kalan bir kahraman, onun dışındaki kahramanların ortalaması düğüm seviyesine 8 level'dan yakınsa **%100 XP** alır. Böylece düşük level'lı yeni yoldaş takımı yakalar.
- Amaç: item'le güçlenen düşük level'lı bir takım yüksek level'lı içeriği yaparak hızla level atlayamasın (takım ortalaması da bandın dışındaysa ceza işler).

## Level ne verir
- **Her level'da oyuncu 3 temel stat puanını kendisi dağıtır** + 1 skill puanı (skill ağacı gelene kadar birikir).
- **Temel stat kuralı (yeni):** tek bir temel stat, diğer üç temel statın toplamından büyük olamaz. Item ve diğer kaynaklardan gelen statlar BONUS'tur, bu kurala girmez ve toplamda gösterilir.
- **Başlangıç statları yeniden dağıtılır:** her sınıfın en yüksek temel statı, diğer üçünün toplamının **en fazla %80'i** olur (ör. DEX+INT+LUCK = 30 ise STR <= 24), böylece oyuncu level atlayınca ana statına hemen puan verebilir. Bu kuralı aşan sınıflar düzeltilir; Quick Battle dengesi yeniden kontrol edilir.
- **Level atlayınca tam iyileşme.**

## İyileşme değişikliği
- Seferde düğümler arası geçişteki iyileşme ve Endless'ta dalgalar arası iyileşme **%20** (Endless `healRatio` 0,4 -> 0,2; seferdeki karşılığı da %20).

## Item seviye şartı
- **Şart = item seviyesi − 3** (ilvl 12 item L9 ister). Kahramanın level'ı yetmezse item takılamaz (itempower x6).
- Takılamayan item torbada kırmızı "Requires Level X" satırıyla görünür; karşılaştırma gösterilir, takma kapalı.

## Diğer modlar
- **Endless:** her run L1'den başlar, kahramanlar dalgayla birlikte level atlar.
- **Quick Battle / çok oyunculu:** herkes L1 (bugünkü denge korunur; başlangıç statları kuralı yine geçerli).

## Uygulama notları (campaign-dev, 2026-10-17)
Kod: `src/progression/levels.ts` (saf kurallar), `src/campaign/xp.ts` (sefer), `src/endless/run.ts > waveXp` (Endless). Sayılar `data/levels.json` (+ `data/endless.json > levels`). Testler `tests/levels.test.ts`. Varsayımlar `open-questions.md` madde 335.
- **Eğri (PROVİZYON):** sonraki level için XP = 20 x L^1,6 (L1 20, L2 61, L5 263, L8 557, L9 673); düşman başına XP = 10 x (karşılaşma seviyesi)^1,2 (L1 10, L5 69, L10 158). Düğüm çarpanı savaş 1 / elit 2 / boss 4 / olay-hazine 0,5. Ölçüm (farmsız, her düğüm bir kez, hep zafer, 3 rota): Ashford bölüğü bölüm 1 sonunda **L8** (final boss'la), King's Bridge'de L5-6; bölüğün ilk level'ı ilk savaşta, sonra 2, 2, 1-2, 2, 2-3, 2-3 savaşta bir (boss'lar 4x). L8 -> L9 bölüm 1 düğümlerinde ~4-6 savaş, L9 -> L10 ~5-7.
- **Düğüm seviyesi:** bölümün level aralığında derinliğe göre (bölüm n: (n-1) x 10 + 1 .. n x 10, tavan 50; derinlik = item seviyesiyle aynı `nodeDepth`). Valdoria: Mill Road L1 ... Castle Morvane L10.
- **Paylaşım:** düşman XP'si x çarpan / savaşa giren kahraman sayısı; öldürme kaydı motorun olay akışından (`trackKills`: her düşman ölümünde o an düşmüş kahramanlar; dirilen yeniden tam pay; çağrılar sayılmaz). Savaşsız olay / hazine düğümü: 3 düşmanlık XP x 0,5 (aktif takıma bölünür).
- **Level farkı:** |kahraman - düğüm| <= 2 tam, 8'de 0, arası doğrusal. **İstisna:** bandın ALTINDAKİ kahraman, diğerlerinin ortalaması düğüme 8'den yakınsa VE kendisi onlardan daha gerideyse %100 (takımın tamamı gerideyse ceza işler; öndekine istisna yok). **Yakalama bonusu:** diğerlerinin ortalamasının altındaki kahramana level farkı başına +%25, en çok +%100.
- **Level atlayınca:** 3 stat puanı (oyuncu dağıtır; 1 puan = temel stata +1; Ömer 2026-10-17: gizli x2 ölçek kaldırıldı, ekrandaki stat motorun kullandığı stattır) + 1 skill puanı (birikir) + tam iyileşme (ayaktaysa; Endless'ta MP de dolar). Puan dağıtımı Gear > Character: puan taşını stat satırına sürükle ya da +'ya dokun, Reset / Confirm; onaylanan puan geri alınmaz. Temel stat kuralı + düğmesini kapatır. Savaştan sonra haritada "Level Up" kartı (Spend points -> Gear'ın Character sayfası; Later).
- **Başlangıç statları (toplam yine 60 = eski 30; en yüksek <= diğer üçünün %80'i, yani en çok 26):** STR/INT/DEX/LUCK önce -> sonra. Çevik olmayan sınıfların DEX'i (dolayısıyla hızı ve kaçınması) AYNI bırakıldı; Archer ve Cutthroat DEX 26'ya inmek zorunda (hız 26 -> 24). Gambler ve Paladin zaten uyuyordu (değişmedi).
  - Warrior 30/16/8/6 -> 26/12/8/14 · Defender 30/20/6/4 -> 26/24/6/4 · Mage 12/38/6/4 -> 20/26/6/8 · Druid 16/32/10/2 -> 20/26/10/4 · Undead 24/28/4/4 -> 26/26/4/4
  - Anti-Mage 10/30/14/6 -> 10/26/12/12 · Archer 12/16/28/4 -> 16/12/26/6 · Cutthroat 10/10/30/10 -> 14/10/26/10 · Hexer 16/10/6/28 -> 18/10/6/26
  - Quick Battle (npm run sim, 4000 savaş, seed 1): önce %47,2-54,6, sonra %44,6-55,0 (hepsi bantta). Warrior %49,0 -> %44,6 ve Archer %49,8 -> %46,1 en çok kaybedenler; testteki büyük örnekte Warrior ~%43, Paladin ~%56: `tests/balance-checks.ts > PENDING_BALANCE` (balance-tester turu).
- **İyileşme:** sefer zafer şifası `campaign.json > rules.victoryHeal` 0,25 -> 0,2; Endless ödül ekranındaki iyileştirme kartı `endless.json > rewards.healRatio` 0,4 -> 0,2 (dalga arası zafer şifası `carry.victoryHeal` zaten 0,2). Dinlenme kampı (%50) ve kasaba (tam) değişmedi.
- **Endless:** koşu L1; dalga seviyesi = dalga numarası; bir dalganın tüm düşmanları kahraman başına 0,6 x (dalga seviyesinin eşiği) XP (elit 2x, boss 4x; düşen %50; yakalama bonusu). Level farkı cezası Endless'ta yok (farm yok). Kayıpsız 20 dalgada kahramanlar ~L19-20. Kampta level notu, puanlar Gear > Character'da.
- **Quick Battle / MP:** dokunulmadı (herkes L1, güç katmanı yok); yalnızca yeni başlangıç statları.
- **Kayıt:** sefer kayıt sürümü 9: `statPoints`, `skillPoints`, `alloc`; eski kayıtta level / XP aynen kalır, eksik puan level'dan tamamlanır. Endless kahramanında alanlar isteğe bağlı (eski koşu L1).
- **Denge turuna kalanlar:** sefer zorluk bantları (`campaign-difficulty`) ve Endless bantları balance-tester'da. Düşmanlar artık kendi level'larıyla büyür (aşağıda Düşman level'ı); 'level' bütçe sistemi açılmaz.

## Düşman level'ı (KARAR, Ömer 2026-10-17; uygulama campaign-dev)
Sorun: level puanları kahramanı çok güçlendiriyordu (L8'de temel statlar ~+%70), düşman büyümüyordu (sefer Medium ~%100, Endless her koşu 32. dalgaya). Karar: **düşmanların da level'ı var ve kahramanla AYNI tür stat büyümesini alır.**
- **Level:** her düşman karşılaşmanın seviyesindedir. Sefer: düğüm seviyesi (`power.ts > nodeLevel`; mob, elit, boss aynı); Endless: dalga seviyesi (`waves.ts > waveLevel` = dalga numarası). Quick Battle / multiplayer: herkes L1, büyüme yok.
- **Büyüme:** level başına `statPointsPerLevel` (3) puan x `statPerPoint` (1) = +3 temel stat, otomatik dağıtılır. **Profil = birimin kendi temel stat oranları:** her puan, hedef oranın en gerisindeki stata gider (eşitlikte STR, DEX, INT, LUCK sırası). `data/levels.json > enemies.profiles[birim id]` verilirse o ağırlıklar kullanılır (bugün boş). `enemies.enabled: false` = büyüme kapalı.
- **Temel stat kuralı aynen:** bir stata puan, ancak o stat (puanla) diğer üçünün toplamını aşmayacaksa verilir. Kuralı baştan aşan mob (Road Thug STR 28 / diğerleri 18) önce diğer statlarına alır, sonra ana statına; puan kaybı yok.
- **Türev statlar:** can, MP, hız, kritik... statlardan kahramandaki gibi türer (motor `applyUnitModifiers`; birim verisinin `overrides`'ı sabit kalır). Level eki `UnitModifiers.attrAdd` ile DÜZ eklenir: karşılaşmanın / zorluğun / bölümün `statMult`'u bu eki büyütmez, `hpMult` ise türemiş canın tamamını çarpar (elit / boss can artışı oransal olarak kahramanınkiyle aynı).
- **Çift ölçek yok:** `power-budget.json > activeSystems` yalnızca 'item' kalır: bölüm ölçeği (x1,00 -> x1,12) item telafisidir. 'level' sistemi ASLA açılmaz; level'ın karşılığı artık düşmanın kendi level'ıdır (simetrik). Endless'ın dalga başına büyümesi (`endless.json > scaling`) item + zorluk rampası olarak aynen kalır, level eki onun üstüne gelir.
- **Görünüm:** ad plakasında küçük "Lv N" (rütbesiz birimde adın üstünde soluk yazı; elit / boss rozetinde "ELITE · LV 7"); kahramanlarda da kendi level'ı. Çağrılarda yazmaz. Quick Battle'da hiç yazmaz.
- **Kod / veri:** `src/progression/levels.ts > growthAlloc, enemyLevelAttrAdd, withEnemyLevel`; `src/campaign/encounters.ts > battlePlan` (plan.enemyLevel), `src/endless/waves.ts > wavePlan` (plan.enemyLevel); veri `data/levels.json > enemies`. Testler `tests/enemy-levels.test.ts`.
- **İlk ölçüm (denge turu öncesi, bantlar ayarlanmadı):** sefer Medium/Medium vekil, 48 sefer, gear best: düşman level'ı KAPALI normal %99,8 / elit %100 / boss %100, bitirme %100; AÇIK normal %85,2 / elit %64,6 / boss %82,3 (bant 87-98 / 79-90 / 71-82), bitirme %43,8, sefer başına 14,9 yenilgi. Endless 48 koşu (tavan 40): ortalama 20,8 dalga (hedef 13-19), boss 10 %91, 20 %92, 30 %100, 40 %88 (önceden her koşu tavana). Ayar balance-tester'da.
