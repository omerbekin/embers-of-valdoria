# The Silver Stag Company: haritalar arası rakip bölük yayı

Durum: **ONAYLANDI (Ömer 2026-10-28), uygulanmadı.** Bölüm 7 > Kararlar. Harita 4/5 = B+C karışımı, S4 = cepte kalır, yay yan görevdir (bölüm 8). Açık: bölüm 8 > Sorular. (content-designer taslağı 2026-10-28.) Yalnızca hikâye planı; veri/kod yazılmadı. Oyun içi metinler İngilizce, açıklamalar Türkçe. Denge sayısı yok, yalnız level ve rol.

Ömer'in isteği (2026-10-28): "Bunun bir hikaye linki olsun. 2 ve 3'te devam etsin, birer map'te. 4 ve/veya 5'te ağırlık veririz. Bir örüntü kur."

---

## 1. Bugün ne var (Harita 1)

- Düğüm `pilgrim` (Pilgrim Road, Bölge II, **zorunlu yol**: grave → pilgrim → 8A | 8C). Karşılaşma `pilgrim_road`: Stag Sellsword (warrior), Stag Knife (cutthroat), Stag Bowman (archer), Stag Magus (mage); 2. dalga Stag Captain (warrior) + 2 Stag Bowman.
- Başlatma kartında "Rival Company" şeridi (`company`: name / line / cause) zaten var.
- Hikâye: St. Brann's Abbey'nin emanetinin peşindeler; sonraki düğüm 8A St. Brann's Abbey relic vault (isteğe bağlı dal).
- Bağlanacak var olan iplik: Harita 2'de Saltmere'deki **Order of St. Brann** (Inquisition House, Monk's Isle, Salt Monastery Vault). Yani Stag'lerin Harita 1'de soyduğu tarikat Harita 2'de bir faction. Yay bunun üstüne kurulur.

---

## 2. Örüntü (her görünüşte sabit olanlar)

**Ana fikir:** Stag'ler her haritada oyuncudan **bir adım önde**, tacın izini süren **gizli bir alıcı** için çalışır. Her haritada bir **anahtar** toplarlar. Üç anahtar, Hearthcrown'u yanmadan takmanın (Morvane'nin bilmediği) yoludur. Harita 4/5'te alıcı ortaya çıkar ve taca uzanır.

Her görünüş aynı **4 vuruştan** oluşur:

| # | Vuruş | Ne olur | Mekanik |
|---|---|---|---|
| 1 | **Söylenti** | 2-4 düğüm önce bir kasaba / olay metninde tek satır: gümüş geyik görüldü. | yok (metin) |
| 2 | **Kapı** | Tacın tarihine bağlı, mühürlü bir yerin kapısında onları bulursun (tarikat mahzeni, manastır kasası, cüce rün kasası). | yok |
| 3 | **Savaş** | "Rival Company" kartı + bölük savaşı. 2. dalgada **Captain** gelir. Oyunun tek oynanabilir-sınıf kopyası düşmanları hep onlardır (ayna bölük). | var olan karşılaşma + dalga |
| 4 | **Kaçış ve iz** | Savaştan sonra Captain anahtarla kaçmıştır; geride bir **sözleşme parçası** kalır. Her parça alıcı hakkında bir bilgi daha verir. | yok (metin; bkz. Soru S1) |

**Sabit kimlik:**
- **Arma:** mavi zemin üstünde koşan gümüş geyik. Her görünüşte duvara, kapıya, taşa kazınmış koşan geyik izi.
- **Captain'ın sözü (her savaşta aynı):** *"The Stag runs first. It always has."*
- **Captain'ın adı:** Harita 1'de yalnız "Stag Captain"; Harita 2'de adı açılır: **Captain Garran Holt**. (Ad önerisi; Admiral Vane ile karışmasın diye "V" ile başlamadı.)
- **Ayna bölük:** oyuncu takımı gibi sınıflardan kurulu; her haritada **bir sınıf daha** katılır (oyuncunun büyüyen kadrosunun aynası).

**Tırmanış (harita harita):**

| Harita | Captain | Bölük | Aldıkları anahtar | Sözleşme parçası ne söyler |
|---|---|---|---|---|
| 1 | adsız, sıradan rütbe, 2. dalga | 4 sınıf | **St. Brann's Seal** (emanetin içindeki mühür) | "Deliver to the buyer. Ask no names." |
| 2 | adı açılır (Holt), sıradan rütbe, güçlü | 5 sınıf (+Defender, +Gambler kiralık) | **The Tide Ledger** (tarikatın, tacın tuz yarısının yolunu yazan defteri) | Ödeme Saltmere Guild'i üzerinden geliyor; alıcı Guild değil, Guild aracı. |
| 3 | **elit** rütbe | 6 sınıf (+Paladin: tarikattan kaçan bir kardeş, +Hexer) | **The Oath-Key of Kharduin** (First Hearth kapısının rün anahtarı) | Alıcının mührü: taç değil, **bir naibin asası** (Harita 4/5 ipucu). |
| 4/5 | boss ya da müttefik (seçenekler bölüm 6) | tam bölük + alıcının adamları | üç anahtar alıcıda | alıcı sahnede |

**St. Brann bağı (yeni lore önerisi, onay ister):** St. Brann, kurucuların tacı ikiye bölen rahibiydi; tarikatı bölünüşün kaydını tutar. Mühür (Harita 1), defter (Harita 2) ve cücelerin yemin anahtarı (Harita 3) birlikte **"the Bearer's Rite"**: tacı takanı yakmadan taşıtan eski ayin. Morvane bunu bilmediği için yandı. Bu, maps-2-3.md omurgasını değiştirmez, yalnız yan iplik ekler.

---

## 3. Harita 1: tohum (küçük dokunuşlar)

Hepsi metin; kural yok.

1. **Pilgrim Road kartı** (`pilgrim_road.company.cause`), mevcut cümleye ek: *"Their captain has a buyer, and the buyer is in a hurry."*
2. **Kaçış:** 2. dalga Stag Captain yenilince savaş biter (bugünkü gibi); ama sonraki metinde kaçtığı söylenir. Savaş sonrası metin alanı yoksa (bkz. S1) iz **8A vault metnine** taşınır.
3. **8A relic_vault metni** (`events.json > relic_vault.text`) önerisi:
   *"Beyond the vault keepers lies the abbey's relic vault, untouched for a hundred years. Untouched, until tonight: the centre niche stands empty, and above it someone has scratched a running stag into the stone."*
4. **Oyuncu 8C'yi seçerse** (vault'u görmez): tohum Pilgrim Road kartında kalır (madde 1). İsteğe bağlı: Riverhead'de / sonraki kasabada tek söylenti satırı: *"Sellswords under a silver stag rode north last night, with something wrapped in abbey cloth."*
5. **İz eşyası (isteğe bağlı):** var olan "Kite Shield of the Stag" adı tesadüfen uyuyor; ona dokunmadan, ileride Stag'lere özel bir item seti düşünülebilir (S5).

---

## 4. Harita 2: The Drowned Reach (bir görünüş)

**Önerilen düğüm: `dr67` Salt Monastery Vault** (Bölge V, Monk's Isle'dan kesik çizgiyle açılan cep). Harita 1'in aynası: yine bir St. Brann kasası, yine önce onlar gelmiş.

- **Değişiklik:** `dr67` korunan hazine (Tr-g) olur; koruyucular Stag'ler. Ödül aynı kalır (keşişlerin eşyası); metin: kasanın bir rafı boş.
- **Söylenti (vuruş 1):** `dr29` Fishmarket "Listen to the rumours" sonucu ya da `dr56` Monk's Isle metni: *"A company under a silver stag hired a boat for the isle. They paid in Guild silver."*
- **Faction dokunuşu (var olan M-L bayrağıyla, onay ister: S3):** Order seçtiysen keşişler yardım ister (düz savaş). Guild seçtiysen Captain kartta: *"We draw from the same purse, friend. Walk away."* Savaş yine olur (seçenek eklemek yeni kural sayılır, S3).
- **Kart metni:** name *"The Silver Stag Company"*, line *"Sellswords hunting the Order's ledger"*, cause *"Captain Holt got here first again. The monks' vault is open, and he means to finish emptying it."*
- **Captain sözü:** *"The Stag runs first. It always has."*
- **Kaçış metni:** *"Holt is gone over the sea wall with the Order's ledger. In the mud he left a torn contract, sealed in Guild wax, written for someone else."*
- **Kadro (L17-18, Bölge V düzeyi; sıradan rütbe):**
  - Dalga 1: Stag Shieldbearer (defender, 1), Stag Sellsword (warrior, 0), Stag Knife (cutthroat, 2), Stag Bowman (archer, 6), Stag Magus (mage, 8).
  - Dalga 2: **Captain Garran Holt** (warrior, 1), **Stag Dicer** (gambler, 7; Saltmere'de kiralanmış zar ustası), Stag Bowman (archer, 6).
- **Geriye bağ:** St. Brann tarikatı adı + emanet mührü ("the Seal you lost at the abbey" keşiş satırı, Order tarafında).
- **Erişim notu:** `dr67` cep ve `dr56` yalnız 54→55 dalında. Oyuncu 54→60 giderse Stag'leri görmez. Alternatif (S4): Saltmere yıldızındaki `dr35` The Crypt Stair (Drowned Cathedral altı, korunan cep; Saltmere'ye herkes uğrar) ya da Bölge V ana yola yeni bir savaş düğümü.

---

## 5. Harita 3: The Hollow Crown (bir görünüş)

**Önerilen düğüm: #40 The Broken Lift** (Bölge III → IV geçişi, ana yol). Bugünkü planda "lifti onar (altın) / savaşarak in" olayı. Öneri: lifti **Stag'ler kesti**; olay yerine savaş düğümü **"The Cut Lift"** (B). Cep #42 Rune Vault metni: kasa açık, Oath-Key yok.

- **Söylenti (vuruş 1):** #30 Kharduin ya da #31 Hall of Oaths metni: *"Men under a silver stag swore the Stone Oath at noon and broke it by nightfall. The Oathkeeper wants their heads."*
- **Kart metni:** line *"Sellswords who broke the Stone Oath"*, cause *"Holt has the dwarves' key and cut the lift behind him. His rearguard holds the shaft, and he is already going down."*
- **Kaçış metni:** *"The rearguard falls, but the lift chain is cut clean. Far below, a lantern bobs away into the dark. On the platform lies the last page of Holt's contract, sealed with a regent's staff."*
- **Kadro (L24-25; Captain elit rütbe):**
  - Dalga 1: Stag Shieldbearer (defender, 0), **Stag Oathbreaker** (paladin, 1; St. Brann tarikatından kaçan kardeş), Stag Knife (cutthroat, 2), Stag Bowman (archer, 6), **Stag Hexwife** (hexer, 8).
  - Dalga 2: **Captain Garran Holt** (warrior, 1, `tier: elite`), Stag Magus (mage, 7), Stag Dicer (gambler, 6).
- **Geriye bağ:** Oathbreaker, Harita 1'deki Oathsworn Brother'ların (St. Brann's Abbey) ailesinden; sözü: *"I kept that vault for nine years. Holt paid better."*
- **Not:** Map 3 verisi henüz yok (branch `maps-2-3`'te yalnız plan); düğüm adı/numarası uygulamada netleşir.

---

## 6. Harita 4 / 5: ağırlıklı rol (Ömer seçer)

Ortak zemin: alıcı **Greyhaven'ın Naibi** (maps-2-3.md'de reddedilen "Greyhaven, Naip tacı istiyor" fikri burada geri gelir). Üç anahtar onda; taç sende.

**A. Av ve hesaplaşma (boss):** Harita 4 Greyhaven; Naip Bearer's Rite'ı kurar, Stag'ler onun muhafızıdır. Holt Harita 4'ün ortasında bölge bossu (kendi boss kiti: ayna bölüğün komutanı), Naip final. Harita 5'te Stag'ler yok. Temiz, düz bir rakip hikâyesi.

**B. İhanet ve ittifak:** Naip ayin tamamlanınca Stag'leri harcar (Harita 4 olayında bölük katledilir). Holt yaralı halde gelir: *"The Stag runs first. This time, it runs with you."* Harita 5'te bir ya da iki savaşta Stag'ler senin yanında dövüşür ya da Holt kadroya katılabilir. Duygusal en güçlü yol; ama yeni mekanik ister (S6).

**C. Taç yarışı (üçüncü taraf):** Holt anahtarları alıcıya teslim etmez, ayini kendi için yapar. Harita 4'te Naip ve Stag'ler birbirine karşı, sen ortada (iki düşman ailesi, bazı düğümlerde taraf seçimi). Harita 5 finalinde Holt tacı takmış **"The Stag Crowned"** olarak boss; Mend/Quench seçimine göre giriş metni değişir. En büyük yay; Mend/Quench'in taşınmasını ister (S2).

---

## 7. Ömer'e açık sorular (yeni mekanik / kural; hiçbiri onaysız yapılmaz)

**Kararlar (Ömer 2026-10-28: "soruların hepsini onaylıyorum. captain de elit olsun"):** S1 evet (savaş sonrası aftermath kartı), S2 evet (Mend/Quench Harita 4/5'e taşınır), S3 evet (faction metni + Guild'e savaşsız "kenara çekil" seçeneği), S5 evet (Stag item/set), S6 evet (müttefik birim / Holt kadroya katılabilir), S7 = Captain kendi ELİT kitiyle (pasif + aktifler), S8 evet (arma katmanı sprite'a), S9 lore onaylı. **İkinci tur (Ömer 2026-10-28):** bölüm 6 = **B ve C birlikte**; S4 = **cepte kalsın** (dr67). Akış kuralı bölüm 8.

| # | Soru | Neden yeni |
|---|---|---|
| S1 | Savaş sonrası kısa bir **"aftermath" metin kartı** eklensin mi (Captain'ın kaçışı, sözleşme parçası)? Yoksa iz hep bir sonraki düğümün metnine mi taşınsın? | Bugün yalnız savaş öncesi `company` kartı var; savaş sonrası metin alanı görünmedi. |
| S2 | Harita 3'teki **Mend / Quench** seçimi Harita 4/5'e taşınsın mı (metin ya da karşılaşma değişsin)? | Bugün "mekanik fark yok"; seçenek C buna dayanır. |
| S3 | Faction bayrağı (M-L, haritalar arası zaten taşınıyor) Stag sahnelerinde **metni** değiştirsin mi? Guild tarafına "kenara çekil" **seçeneği** (savaşsız, ödülsüz geç) eklensin mi? | Metin varyantı hazır kancayla olur; savaşsız geçiş seçeneği yeni kural sayılır. |
| S4 | Harita 2 görünüşü **cepte** (`dr67`, kaçırılabilir) mi kalsın, yoksa **herkesin göreceği** bir yere mi (`dr35` ya da Bölge V'e yeni savaş düğümü)? | Yeni düğüm harita düzenini değiştirir. |
| S5 | Stag'lere özel **item / set** (arma kalkanı, Captain'ın kılıcı) düşsün mü? | Yeni item içeriği. |
| S6 | (Seçenek B için) **Müttefik birimler** (savaşta senin tarafında YZ dostları) ya da Holt'un **kadroya katılması**? | Motorda yok; yeni kural. |
| S7 | Stag Captain'a **kendi kiti** (elit pasif / boss kiti) mi, yoksa Harita 3'e kadar düz warrior + `tier: elite` mi? | Elit/boss kit kuralı (pasif + 3 aktif) sınıf birimine ilk kez uygulanır. |
| S8 | **Arma görseli:** Stag birimlerine sınıf sprite'ı üstüne gümüş geyik nişanı (renk/arma katmanı) çizilsin mi? | Sanat işi (art-pipeline); bugün düz sınıf sprite'ı. |
| S9 | **Lore onayı:** St. Brann = tacı bölen rahip; üç anahtar = Bearer's Rite; alıcı = Greyhaven Naibi. Uygun mu? | maps-2-3.md omurgasına yan iplik ekler. |

**Mob kuralı notu:** Stag'ler, "oynanabilir sınıf kopyası düşman yok" kuralının bilinçli tek istisnası olarak kalır (Harita 1'deki gibi). Örüntünün bir parçası: ayna bölük.

---

## 8. Yan görev akışı: ikinci şans ve kilit (Ömer 2026-10-28)

Ömer: "Harita 1'de kaçıran için harita 2, 2. bir şans olsun görevi başlatmak adına. Harita 2'de de kaçırırsa harita 3'e geçince sadece ufak bir sinematik ya da bilgi parçası görsün, questin kalanından locklanmış olsun. Ana quest yapmayalım map 4-5'te ama ilk görevler yapılırsa önemli bir yeri olsun."

**Yeni kural (Ömer'in açık isteği):** sefer kaydında Stag görevinin durumu tutulur: `none` → `started` ya da `locked` . Haritalar arası taşınır (faction bayrağı gibi).

| An | Koşul | Sonuç |
|---|---|---|
| Harita 1 | Pilgrim Road herkesin yolunda (zorunlu savaş, tohum). **Görevi başlatan:** 8A relic vault'a girip boş nişi ve geyik izini görmek. | 8A → `started`. 8C seçen `none` kalır (yalnız söylenti satırı). |
| Harita 2 | `none` ise **ikinci şans:** dr67 Salt Monastery Vault (cep). Söylenti dr29/dr56'da onu işaret eder. | dr67 savaşı → `started`. Harita 2 biterken hâlâ `none` → `locked`. |
| Harita 2 | Zaten `started` ise dr67 yayın normal 2. görünüşü (Holt'un adı açılır). | Kaçırsa da `started` kalır (bkz. Soru Q2). |
| Harita 3 | `started`: #40 The Cut Lift savaşı + Rune Vault izi. | Yay sürer. |
| Harita 3 | `locked`: #40 bugünkü Broken Lift olayı olarak kalır; girişte **kısa bilgi kartı** (sinematik yerine tek ekran): Stag'lerin anahtarı alıp gittiği. | Kalan görevler kilitli, bir daha açılmaz. |
| Harita 4/5 | Ana hikâye değil. `started` ve Harita 3 görünüşü yapıldıysa B+C içeriği açılır; değilse bu düğümler/sahneler hiç çıkmaz. | Ödül: müttefik Holt (S6), Stag seti (S5). |

**Kilit kartı metni önerisi (Harita 3 girişi, `locked`):**
*"Word travels the deep roads: a company under a silver stag broke the Stone Oath, took the dwarves' key and vanished below. Whatever they were hunting, they found it before you ever knew it was there."*

**B+C birlikte (öneri):**
- **Harita 4 (C, taç yarışı):** Holt üç anahtarı Naibe teslim etmez, ayini kendisi için kurmaya çalışır. Naibin adamları ve Stag'ler birbirine karşı; 1-2 düğümde taraf seçersin (S3 kancası).
- **Harita 5 (B, ihanet ve ittifak):** Naip Stag'leri ezer, anahtarları alır. Holt yaralı gelir: *"The Stag runs first. This time, it runs with you."* Finale giden 1-2 savaşta Stag'ler senin yanında (müttefik) ya da Holt kadroya katılır.
- "The Stag Crowned" final bossu (saf C) bu karışımda **yok**; final ana hikâyenin bossu kalır.

**Cevaplar (Ömer 2026-10-28):** Q1 evet (8A vault başlatır), Q2 evet (dr67'yi atlayan `started` kalır), Q3 evet (Harita 4/5 tam içerik için Harita 3 savaşı şart), Q4 = **kısa animasyonlu sahne** (bilgi kartı değil).

### 8.1 Harita 4/5: tek düğüm değil, katmanlı yay (Ömer 2026-10-28)

Ömer: "Harita 4-5'te tek nodelu olmasın artık bu hikaye. 4'te hikaye ağırlığı artsın. 2-3'te yapan oyuncuların karşısına ana nodelarda da çıksın hikaye parçası; yapmayanlar düz node oynasın onlar yerine. 5'te artsın, daha fazla anlatılsın. Sinematik vs, artık ciddi bir şey olduğu anlaşılsın."

**Kural: üzerine binen düğümler (overlay).** Harita 4/5'in ana yolundaki bazı düğümlerin iki hâli var:
- `started` + Harita 3 savaşı yapıldı → **Stag hâli** (Stag metni, karşılaşma, sahne).
- Değilse → **düz hâli** (aynı yerde normal savaş/olay; harita düzeni, ödül ve zorluk eşdeğer, kimse kayıp hissetmez).

Harita düzeni iki oyuncu için de aynı; yalnız düğümün içeriği değişir.

| Harita | Ağırlık | Stag hâlli düğüm sayısı (öneri) | Sahne |
|---|---|---|---|
| 4 | artar | ana yolda 3-4 düğüm + 1 cep | 1 kısa animasyonlu sahne (C: Holt ayini kendine kuruyor) |
| 5 | en yüksek, daha çok anlatı | ana yolda 4-5 düğüm | 2-3 sahne: Naibin ihaneti, yaralı Holt'un gelişi, finale birlikte yürüyüş |

**Harita 4 (C, taç yarışı) taslak vuruşları:** söylenti → Naibin adamları Stag'leri avlıyor (savaş, taraf seçimi 1) → Holt ayin yerini kuruyor (sahne) → taraf seçimi 2 → Holt anahtarlarla kaçar, Naip peşinde.
**Harita 5 (B, ihanet ve ittifak) taslak vuruşları:** Stag kampı yanmış (sahne: ihanet) → hayatta kalan Stag'ler (savaş, kurtarma) → Holt yaralı gelir (sahne + söz) → 1-2 savaşta müttefik Stag'ler / Holt kadroya → finale giriş sahnesi.
Kesin düğümler Harita 4/5 haritaları planlanınca konur (henüz harita yok).

**Sahneler (yeni iş, Ömer istedi):** Harita 3 kilit sahnesi + Harita 4 (1) + Harita 5 (2-3) = 4-5 kısa animasyonlu sahne. Bugün oyunda böyle bir sahne sistemi var mı, uygulamada bakılacak; yoksa tek ortak "kısa sahne" oynatıcısı yazılır (görsel katmanlar + metin + hareket, atlanabilir). Sanat art-pipeline işi.
