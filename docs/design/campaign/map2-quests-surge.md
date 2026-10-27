# Harita 2: Personal Quests (A5) ve Crown Surge (C1) — uygulama taslağı

Durum: **TASLAK, Ömer seçimi bekliyor** (content-designer, 2026-10-27). Kaynak: `maps-2-3.md` bölüm 9 (A5 ve C1 onaylı, form 4Z6Qr7WCm3gVKKJDLLi4cE). Bu belge yalnızca plan; veri ve kod yazılmadı. Sayılar PROVİZYON (denge balance-tester'ın işi, sim ile). Oyun içi metinler İngilizce taslak.

**A5 Harita 2 kısmı UYGULANDI (campaign-dev 2026-10-27, Ömer seçimleri aşağıda 1.6'da KARAR olarak; varsayımlar open-questions 431).** Veri `data/campaign/quests.json` + düğümler dr90-dr93 + dr56 seçeneği; kural `src/campaign/quests.ts`; test `tests/campaign-quests.test.ts`. C1 Crown Surge hâlâ karar bekliyor (bölüm 2).

**Kural:** Belgede (maps-2-3.md) olmayan her şey aşağıda **SORU** olarak yazıldı, karar değil. Görev şekilleri yalnızca onaylı kalıpları kullanır: tek savaş, var olan olay seçimi (`choices[]`: `cost`, `battle`, `win`, `heal`), A1 sınav kuralları ("yalnız 2 kahramanla", "ilk 3 tur ultimate yok", "arka sıra boş") ve B3 hedefleri (Survive N Rounds, Break the Totem, Hold the Bridge). Hero signature kuralı korunur: Omen (Hexer) ve Dark Bond (Undead) yalnız kahraman mekaniği; aşağıdaki hiçbir düşmana verilmez, bonuslar yalnız o kahramanı güçlendirir.

---

## 1. A5 Personal Quests

### 1.1 Sınıflar ve iki haritaya bölünme

Oynanabilir sınıf: **11** (`data/classes/`; `aoe_tester` "Geometer" ve `pose_tester_*` test içeriği, sayılmaz): Anti-Mage, Archer, Cutthroat, Defender, Druid, Gambler, Hexer, Mage, Paladin, Undead, Warrior.

Belgedeki örnekler: Paladin = Monk's Isle (Harita 2), Undead = Sunken Court (Harita 2), Archer = Gull Cliffs (Harita 2), Druid = Snowline (Harita 3).

**Önerilen bölünme (SORU Q-A1):**

| Harita | Sınıflar | Neden |
|---|---|---|
| 2 · The Drowned Reach (6) | **Paladin, Undead, Archer** (belgede) + **Cutthroat, Gambler, Hexer** | Liman şehri, kaçakçılar, korsan zarları, bataklık cadıları: üçünün de doğal yeri burası |
| 3 · The Hollow Crown (5) | **Druid** (belgede) + **Warrior, Defender, Mage, Anti-Mage** | Hillclans (Warrior), cüce kapısı ve yemin (Defender), Ember ve ocak (Mage), Kharduin runeleri (Anti-Mage) |

Harita 3'ün yükü zaten ağır (D4 Frozen Echoes, D5 Ember Shards), bu yüzden 6/5 bölünmede 6'yı Harita 2'ye koydum.

**KARAR (Ömer 2026-10-27, Q-A1 = b): 5 / 6.** Harita 2: Paladin, Undead, Archer, Cutthroat, Gambler. Hexer Harita 3'e gider (aşağıdaki Hexer bölümü yalnız fikir olarak kaldı; 1.4 listesinde).

### 1.2 Ortak kurallar (belgeden)
- Her görev, o sınıf kadrodaysa görünen bir yan düğüm (ya da var olan düğümde sınıfa bağlı ek seçim). Kadroda olmayan sınıfın düğümü görünmez.
- Bitirince: o sınıfa **küçük imza bonusu** (seferin geri kalanı için kalıcı) + **unvan**.
- Görev düğümleri isteğe bağlı cep (çıkmaz dal) olur: ana rota sayımına, K1'e ve `stopsPerRun`'a girmez (Saltmere `spoke` ve opt cep emsali).

### 1.3 Harita 2 görevleri

Her bonus için iki alternatif var: **(a)** sınıfın var olan pasifinin sayısını biraz artırır (yeni kural yok, var olan alanın değeri), **(b)** başka küçük bir ayar. Ömer her satırda a ya da b seçer.

#### Paladin — "Brann's Bell" (Monk's Isle, dr56, Bölge V)
- **Düğüm:** var olan dr56 Monk's Isle olayına yalnız Paladin kadrodayken görünen ek seçim. Faction'dan bağımsız (Order de Guild de görür).
- **Hikâye (EN taslak):** *"The monks' bell has rung for every lost ship since St. Brann hung it. Tonight it rings on its own, and the drowned walk up the shingle toward it. Brother Aldo presses the bell-rope into your Paladin's hands: 'Brann kept this vigil once. Keep it with us.'"*
- **Şekil:** kurallı savaş, B3 hedefi **Survive 4 Rounds** (çanı koru; dalgalar Drowned + Tide Caller + Brine Maiden). Sayı provizyon.
- **Ödül / unvan:** **Bellkeeper of St. Brann**
  - **(a)** Divine Light şifası +%10 (`divineLight.power` 0,27 → 0,30).
  - **(b)** Radiance'ın (ultimate) savaş başı bekleme süresi 1 tur kısa (`initialCooldown` -1). Aşağıdaki tüm (b)'ler 4. yuvadaki ultimate'ın bu değerine dokunur.

#### Undead — "The Name Beneath the Water" (Sunken Court, Bölge VI)
- **Düğüm:** yeni opt cep **"The Drowned Registry"**, dr75 Flooded Library'den çıkmaz dal (alternatif: dr75 olayına sınıfa bağlı ek seçim; SORU Q-A3).
- **Hikâye (EN taslak):** *"Maredh's clerks wrote down every soul that drowned in the Reach. Your Undead finds a page with a name it has not heard in a hundred years, and the ink is still wet. Something in the court does not want it read aloud."*
- **Şekil:** olay seçimi + tek savaş. Seçim: "Speak the name" (savaş: Drowned Knight + 2 Brine Maiden + Siren; kazanınca görev biter) / "Let it drown" (görev kapanır, ödül yok, düğüm bir daha açılmaz).
- **Ödül / unvan:** **The Unforgotten**
  - **(a)** Vampiric Bite can emme oranı 0,5 → 0,6.
  - **(b)** Raise Dead'in savaş başı bekleme süresi 1 tur kısa (`initialCooldown` -1).
  - Not: Dark Bond'a dokunulmaz (hero-only mekanik; bonus onu düşmana taşımaz, ama değiştirmek de istenmedi).

#### Archer — "The Gull Cliffs Shoot" (Gull Cliffs, dr41, Bölge IV)
- **Düğüm:** yeni opt cep **"The Gull Roost"**, dr41 Gull Cliffs'ten çıkmaz dal.
- **Hikâye (EN taslak):** *"Every spring the cliff-hunters shoot for the Gull Feather, and every spring the wreckers' crossbowmen try to win it by putting a bolt in the champion. Your Archer is handed a bow-string and a warning: 'Shoot the marks, watch the ledges.'"*
- **Şekil:** kurallı savaş, A1 kuralı **"yalnız 2 kahramanla"** (Archer + oyuncunun seçtiği bir kahraman); düşman 2 Cliff Crossbowman + 2 Reef Hound.
- **Ödül / unvan:** **Feather of the Gull Cliffs**
  - **(a)** Sharpshooter sıra başına hasar %5 → %6 (`longshot.perRow` 0,05 → 0,06).
  - **(b)** Aimed Shot'ın savaş başı bekleme süresi 1 tur kısa (`initialCooldown` -1).

#### Cutthroat — "An Old Debt in Saltmere" (Saltmere, Bölge III)
- **Düğüm:** yeni Saltmere kolu **"Rat's Nest"**, dr30 Chandlers' Row'dan çıkmaz dal (alternatif: dr43 Smugglers' Cave korunan hazinesine sınıfa bağlı ek seçim; SORU Q-A3).
- **Hikâye (EN taslak):** *"A chalk mark on a door in Chandlers' Row: the sign your Cutthroat swore never to see again. The Dock Rats remember an unpaid debt, and they have hired corsair knives to collect it."*
- **Şekil:** olay seçimi. "Pay what you owe" (`cost` altın, savaş yok; görev biter) / "Settle it the old way" (kurallı savaş, A1 kuralı **"ilk 3 tur ultimate yok"**; düşman 2 Dock Rat + 2 Corsair Cutlass; kazanınca altın da gelir).
- **Ödül / unvan:** **The Knife of Saltmere**
  - **(a)** Opportunist bonusu +%25 → +%30 (`bonusVsStatus.bonus` 0,25 → 0,30).
  - **(b)** Backstab'ın savaş başı bekleme süresi 1 tur kısa (`initialCooldown` -1).
  - SORU (Q-A5): iki yol da aynı ödülü mü verir, yoksa "Pay" yalnız unvan mı?

#### Gambler — "The Corsairs' Table" (Pirate Cove, dr63, Bölge V)
- **Düğüm:** yeni opt cep **"The Dicing Hulk"**, dr63 Pirate Cove'dan çıkmaz dal.
- **Hikâye (EN taslak):** *"A beached hulk where the corsairs dice for shares. The house never loses, because the house cuts the throats of winners. Your Gambler pushes a purse onto the table: 'One throw. Mine.'"*
- **Şekil:** olay seçimi + kurallı savaş. "Lay the stake" (`cost` altın; ardından kurallı savaş, A1 kuralı **"arka sıra boş"**; düşman 3 Corsair Cutlass + 2 Corsair Slinger; kazanınca `win.gold` = bahsin iki katı) / "Walk away" (görev kapanmaz, sonra dönülebilir). Rastgele sonuçlu seçim YOK (olay verisinde yok; eklemek yeni mekanik olur).
- **Ödül / unvan:** **The House Breaker**
  - **(a)** Double or Nothing şansı %25 → %28 (`spellEcho.chance` 0,25 → 0,28).
  - **(b)** All In'in savaş başı bekleme süresi 1 tur kısa (`initialCooldown` -1).

#### Hexer — "The Hag's Stolen Eye" (HARİTA 3'E TAŞINDI, Q-A1 = b; aşağısı yalnız fikir, Harita 2'de YAPILMADI)
- **Düğüm:** yeni opt cep **"The Cauldron Pool"**, dr18 Hag's Island'dan çıkmaz dal (dr18 zaten opt; cep onun arkasında, yani önce Salt Hag Mother yenilir).
- **Hikâye (EN taslak):** *"The Salt Hag Mother kept a jar of eyes, and one of them is looking at your Hexer. It was a teacher's, once. Her daughters have bound it to a salt-totem in the pool, and as long as it stands, the marsh keeps sending them back."*
- **Şekil:** kurallı savaş, B3 hedefi **Break the Totem** (Hex Totem birimi var; kırılana kadar Fen Witchling / Salt Hag takviyesi gelir).
- **Ödül / unvan:** **Hag-Bane**
  - **(a)** Ill Omen: ölen düşmandan geçen Omen en çok 2 → 3 (`omenTransfer.maxOnArrival`). Omen yalnız kahraman mekaniği kalır.
  - **(b)** Doom Mark'ın savaş başı bekleme süresi 1 tur kısa (`initialCooldown` -1).

### 1.4 Harita 3 (yalnız yer listesi, ayrıntı Harita 3 adımında)
| Sınıf | Önerilen yer |
|---|---|
| Druid | Snowline: donmuş koru (belgede), dr3 Frozen Falls cebi |
| Warrior | dr11 Clan Steading / dr12 Chief's Hall (Hillclans) |
| Defender | dr28 The Stone Gate / dr31 Hall of Oaths (cüce yemini) |
| Mage | dr75 Crown Gallery ya da dr60 Kiln Chapel (Ember) |
| Anti-Mage | dr42 Rune Vault (Kharduin runeleri) |
| Hexer | (Q-A1 = b ile Harita 2'den geldi) Rime Witch'lere karşı; yer Harita 3 adımında. Harita 2 fikri "The Hag's Stolen Eye" (Break the Totem) uyarlanabilir |

### 1.5 Uygulama notları (karar değil, engine/campaign-dev için)
- **Görünürlük** için düğüme ya da olay seçimine "bu sınıf kadrodaysa" koşulu gerekir (`choices[]` ve düğüm verisinde bugün sınıf koşulu yok). Bu A5'in onaylı kuralının uygulamasıdır, yeni oyun kuralı değildir.
- **Kahramana kalıcı bonus:** (a) seçenekleri pasifin var olan sayısını o kahraman için değiştirir; (b) seçenekleri var olan `initialCooldown` değerini o kahraman için değiştirir. İkisi de kahraman başına küçük bir "bonus" kaydı ister (kayıt şeması işi; kayıt sürümü kararı campaign-dev'in).
- Bonus Quick Battle / Endless / çevrimiçi savaşa taşınmaz (VARSAYIM; SORU Q-A6).

### 1.6 A5 soruları (Ömer seçer)

**Q-A1. Sınıf bölünmesi?**
- a) Yukarıdaki 6 / 5 (Harita 2: Paladin, Undead, Archer, Cutthroat, Gambler, Hexer). **Önerim.**
- b) 5 / 6: Hexer Harita 3'e (Rime Witch'lere karşı), Harita 2 beşte kalır.
- c) Başka bir dağılım (Ömer söyler).

**Ömer seçimleri (2026-10-27, form quests/surge):** A1 = b, A2 = a (hepsinde), A3 = a, A4 = c, A5 = a, A6 = a, A7 = a, A8 = a. Uygulama özeti:
- **Yerler:** Paladin dr56 Monk's Isle'da "Keep the vigil" seçeneği; Undead dr90 The Drowned Registry (dr75'ten), Archer dr91 The Gull Roost (dr41'den), Cutthroat dr92 Rat's Nest (dr30 Chandlers' Row'dan), Gambler dr93 The Dicing Hulk (dr63'ten). Cepler kesik yol, ana rota / K1 / `stopsPerRun` sayımına girmez.
- **Görünürlük (A4 = c):** görevin sınıfından bir kahraman takımda ya da yedekte varsa cep / seçenek görünür; yoksa cep haritada hiç çizilmez. Ayak basılmış cep kalır.
- **Bonus (A2 = a):** pasif sayısı (Divine Light 0,27 → 0,30; Vampiric Bite 0,5 → 0,6; Sharpshooter 0,05 → 0,06; Opportunist 0,25 → 0,30; Double or Nothing 0,25 → 0,28), yalnız o kahraman, yalnız bu sefer (A7 = a), haritalar arası taşınır; Hero Oath ile birlikte olabilir (A8 = a).
- **Barışçıl yollar (A5 = a):** Cutthroat "Pay what you owe" (60 altın) tam ödül; Undead "Let it drown" ödülsüz kapanır. Gambler "Walk away" görevi açık bırakır.
- **Unvan (A6 = a):** Gear karakter kartında sınıf satırının altında (üstüne gelince bonus), Codex > Mechanics > Personal quests listesi.
- **Debug:** Debug > Campaign > "Map 2 side content" > "Quest (Sınıf): ..." (sınıf takımda yoksa bir kahramanın yerine girer).

**Q-A2. Her görevin bonusu?** Her sınıfta (a) ya da (b) (yukarıdaki satırlar). Önerim: hepsinde **(a)** (pasif sayısı; imzayı en net hissettirir, yeni kural yok).

**Q-A3. Düğüm biçimi: yeni cep mi, var olan düğüme ek seçim mi?**
- a) Paladin var olan dr56'da ek seçim, diğer beşi yeni opt cep (yukarıdaki gibi; Harita 2 83 → 88 düğüm). **Önerim.**
- b) Hepsi var olan düğümlere ek seçim (dr56, dr75, dr41, dr30, dr63, dr18), düğüm sayısı değişmez; ama dr41/dr30/dr63 savaş düğümü, olay seçimi alamaz: onlar için yine cep gerekir.
- c) Hepsi yeni cep (Paladin dahil).

**Q-A4. Kahraman görev sırasında yoksa?** (ölü / cesedi taşınıyor / Saltmere kışlasında yedekte)
- a) Düğüm yalnız sınıf **takımda ve canlıyken** görünür; ölürse ya da yedeğe çıkarsa gizlenir, geri gelince yeniden görünür. **Önerim.**
- b) Bir kez görüldüyse açık kalır; bonus yine o sınıftaki kahramana gider.
- c) Görev başladıysa (ilk savaş yapıldıysa) açık kalır, başlamadıysa a gibi.

**Q-A5. Görevde "barışçıl" yol (Cutthroat "Pay", Undead "Let it drown") ödül verir mi?**
- a) Cutthroat Pay: tam ödül (bedeli altın); Undead "Let it drown": ödülsüz kapanır. **Önerim.**
- b) Barışçıl yollar yalnız unvan verir, bonus savaşla gelir.
- c) Barışçıl yol yok, hepsi savaş.

**Q-A6. Unvan nerede görünür?** (Oyunda bugün unvan sistemi yok; Mend/Quench ve D4 de unvan veriyor.)
- a) Karakter kartında adın altında küçük satır + Codex/istatistik ekranında liste. **Önerim.**
- b) Yalnız karakter kartı.
- c) Yalnız sefer sonu özetinde.

**Q-A7. Bonus sefer dışına taşınır mı?**
- a) Yalnız bu sefer (Harita 2 → 3 geçişinde kahramanla taşınır; Quick Battle / Endless'te yok). **Önerim.**
- b) Hesap düzeyinde kalıcı (her yeni seferde o sınıfta açık) — bu yeni ilerleme kuralı olur.

**Q-A8. Hero Oaths (A4) ile çakışma:** aynı kahraman hem yemin hem görev bonusu alabilir mi?
- a) Evet, ikisi ayrı (organik denge, üst sınır yok). **Önerim.**
- b) Hayır, birini seçer.

---

## 2. C1 Crown Surge

### 2.0 Durum (campaign-dev 2026-10-27): YAPILDI, sayılar provizyon
Ömer'in seçimleri: C1 V1 (HUD taç plakası, eylemi harcar; V2 ulti barı YOK), C2 a, C3 a, C4 (üst sınır yok, her kullanım bir öncekinden pahalı: 1, 2, 3 ... Taint), C5 b (Chapel temizler), C6 a, C7 a, C8 a, C9 a, C10 (savaş başına tek Surge), C11 a (sim 427'den sonra), C12 a. Kurallar `data/campaign/crown-surge.json`, eylemler `data/global-skills.json > ash_surge / salt_surge`, kod `src/campaign/surge.ts` + motor global `surge` (`battle.ts > callSurge`). Varsayımlar ve açık sorular: open-questions 431. Codex: Mechanics > Campaign > Crown Surge and Ashen Taint. Debug: Battle > Team > Enable Crown Surge (her savaş, test savaşı dahil), Refill Crown Surge / Unlock Salt Surge / Add Ashen Taint / Clear Ashen Taint (sefer).

### 2.1 Belgede yazanlar (onaylı)
- Bölük Crown of Ash'i taşır. **Bölge başına 1 kez**, savaşta takım yeteneği **Crown Surge** kullanılır (örnek: takıma 2 tur +%30 hasar).
- Kullanan kahraman **1 Ashen Taint** yığını alır: yığın başına **-%3 maks can**. Taint **kilisede temizlenir**.
- Harita 2 sonunda (Drowned Queen yenilince) Salt yarısı gelir: **ikinci Surge** (su: takıma kalkan).
- Mend/Quench bitiş metni Taint sayısına göre değişir.
- Yapım sırası: bir bölge baştan sona oynanabilir olunca, denge sim ile (bölüm 9.2 adım 5).

Ad önerisi (oyun içi): **Ash Surge** (Harita 2 boyunca tek) ve **Salt Surge** (Harita 2 sonundan itibaren). Codex metni taslağı: *"Crown Surge: once per region, a hero may call on the Crown. Ash Surge: the whole party deals +30% damage for 2 turns. The hero who calls it takes 1 Ashen Taint (-3% max HP per stack) until cleansed."*

### 2.2 Açık sorular (Ömer seçer; her birinde önerim var)

**Q-C1. Nasıl tetiklenir?**
- a) **Savaş HUD'ında taç düğmesi:** sırası gelen kahraman basar, o kahramanın eylemi harcanır (skill kullanmış gibi). Hazır değilse soluk. **Önerim** (görünür, tek dokunuş, var olan "tur harcayan eylem" kuralına oturur).
- b) Aynı düğme ama eylem harcamaz (bedava; tek bedel Taint). Daha güçlü, sim etkisi daha büyük.
- c) "Ulti çubuğu" / dolan bar: oyunda böyle bir bar yok (ultimate'lar bekleme süresiyle çalışır); bu yeni mekanik olur. Önermem.

**Q-C2. Kim kullanır?**
- a) Sırası gelen **herhangi bir kahraman**; Taint ona gider (kimin taşıyacağı oyuncunun seçimi = taktik). **Önerim.**
- b) Yalnız **lider** (tacı taşıyan); Taint hep liderde birikir.
- c) Kasabada "tacı taşıyan" seçilir, yalnız o kullanır.
- Çağrılar (Treant, Raise Dead iskeleti vb.) kullanamaz (VARSAYIM, her seçenekte).

**Q-C3. "Bölge başına 1 kez" nasıl sayılır?**
- a) Bölgeye girince 1 hak dolar; kullanılmayan hak bir sonraki bölgeye **taşınmaz**. **Önerim.**
- b) Kullanılmayan hak birikir (en çok 2).
- c) Bölgeye girince dolar ama boss savaşında kullanılamaz. (Önermem: en çok boss'ta istenecek.)

**Q-C4. Taint üst sınırı?** (Hafıza kuralı: denge üst sınırla değil bedelle; aşağıdaki a buna uyar.)
- a) **Üst sınır yok**; bedel temizleme ücretiyle dengelenir. En kötü durumda Harita 2'de 6 hak = tek kahramanda -%18. **Önerim.**
- b) Kahraman başına en çok 5 yığın (-%15); 5'te o kahraman Surge kullanamaz.
- c) Üst sınır yok ama her yığın bir sonraki temizlemeyi pahalılaştırır.

**Q-C5. "Kilise" nerede, bedeli ne?** (Kasabalarda bugün kilise yok: demirci, tüccar, kışla, ateş başı var.)
- a) Kasaba ekranına yeni satır **"Chapel"**: yığın başına altın (provizyon 25 altın / yığın; sim ile). **Önerim.**
- b) Adında "Chapel" olan dinlenme düğümleri (dr49 Cliff Chapel; Harita 1'de benzerleri) bedava temizler; kasaba temizlemez.
- c) Ateş başında **Valor** ile temizlenir (Valor yara silme emsali, madde 423).

**Q-C6. Taint harita geçişinde?** (Yaralar geçişte siliniyor, D1 b.)
- a) Taint **taşınır** (tacın lanetidir, yara değil). **Önerim.**
- b) Geçişte silinir (yaralar gibi).

**Q-C7. Mend/Quench metni hangi sayıya bakar?**
- a) Seferde **alınan toplam** Taint (temizlenenler dahil) — "tacı ne kadar kullandın". **Önerim.**
- b) Final anında **taşınan** Taint (temizlenmeyen).
- c) İkisi birlikte (metin eşikleri Ömer'le yazılır).

**Q-C8. "2 tur" kimin turu?**
- a) Her kahramanın **kendi sonraki 2 turu** (var olan durum süresi kuralı). **Önerim.**
- b) 2 Round (herkes için aynı anda biter).

**Q-C9. Salt Surge (su: takıma kalkan) ayrıntısı?**
- a) Tüm takıma **maks canın %15'i kalkan**, 2 tur (var olan kalkan/Mana Barrier dili), Taint aynı (Ashen Taint +1). **Önerim** (sayı provizyon).
- b) a + kalkanlı kahramanların Burning'i söner (su teması; Flooded/Soaked ile uyumlu ama ek kural).
- c) Kalkan; Taint yok (Salt yarısı "temiz").

**Q-C10. İki Surge birlikte nasıl?** (Harita 2 sonu → Harita 3)
- a) **Ayrı haklar:** bölge başına 1 Ash + 1 Salt. **Önerim** (belgedeki "ikinci Surge" ifadesine en yakın).
- b) **Tek hak, seçmeli:** bölge başına 1 kez, Ash ya da Salt.
- c) Ayrı haklar ama aynı savaşta yalnız biri.

**Q-C11. Sim etkisi nasıl ölçülür?**
- a) sim:campaign iki koşum: Surge **kapalı** ve **açık** (sim oyuncusu hakkı bölgenin ilk elit/boss savaşında, ilk turda kullanır; Taint'i kasabada her fırsatta temizler). Fark raporlanır; hedef bantlar Surge kapalıyken tutmalı (Surge bonus, zorunlu değil). **Önerim.**
- b) Yalnız açık koşum; bantlar Surge'e göre yeniden ayarlanır.
- c) Sim kullanmaz (Surge hiç sayılmaz).
- Not: madde 427 (düz sim bantları tutmuyor) çözülmeden Surge ölçümü yanıltıcı olur; önce 427.

**Q-C12. Nerede çalışır?**
- a) Yalnız sefer (Harita 2-3); Quick Battle / Endless / çevrimiçi yok; debug > Setup'tan test savaşında açılabilir. **Önerim.**
- b) Endless'te de (ayrı kural gerekir).

### 2.3 Uygulama notları (karar değil)
- Takım geneli hasar artışı ve kalkan var olan durum/etki türleriyle kurulabilir; HUD düğmesi ve "bölge başına hak" sayacı sefer durumu (campaign state) işi; Taint kahraman başına yığın sayacı + maks can çarpanı (kayıt şeması).
- Codex > Mechanics'e Crown Surge, Ashen Taint, Chapel metni; Wiki testi.
- Debug: "Refill Crown Surge", "Add/Clear Ashen Taint".
- Yeni ikon: taç düğmesi (Ash: kor rengi, Salt: deniz yeşili); VFX: tüm takımda kısa kor dalgası / su perdesi; ses: alçak kor gümlemesi / dalga. Ayrıntı sanat adımında.

### 2.4 Ömer kararları 2026-10-27 (ikinci tur; campaign-dev, open-questions 449)
1. **Chapel sayacı altınla sıfırlar, pahalı:** bedava Taint temizliği (varışta) kalır; Chapel'deyken oyuncu ayrıca altın ödeyip seferin Surge kullanım sayacını başa döndürebilir (sonraki Surge yine 1 Taint). Kamp seçimini harcamaz. Fiyat `crown-surge.json > reset.gold` (Harita 2: 400, düz; Ömer 2026-10-28 "kalsın": sayaçla artmaz; gerekçe 449). Arayüz: kamp ekranında, ateş satırının altında "Chapel" satırı + "Ease the Crown · 400" düğmesi (`src/ui/camp-screen.ts > chapelRow`). Kod `src/campaign/surge.ts > surgeResetPrice / surgeResetBlocked / resetSurgeUses`.
2. **Hak yenilgide gitmez:** yenilgide (normal savaş, Dive, Pit) hak harcanmaz, Taint ve sayaç yazılmaz; tekrar denemede Surge yine var. Zafer ve devriyeden geri çekilme eskisi gibi harcar (Ömer 2026-10-28: geri çekilme için istisna yok).
3. **Harita 2'de iki Chapel:** dr23 Tidewatch Tower -> **Tidewatch Chapel** (bölge II, ana yol; Ömer 2026-10-28, ilk öneri dr39 Beacon Quay idi, o eski adına döndü) + dr49 Cliff Chapel (bölge IV).
4. **Surge etkisi 3 tur:** Ash Surge `turns` 2 -> 3 (her kahramanın sonraki 3 kendi turu; çağırana motor yine 1 fazla verir), Salt Surge `shieldTurns` 2 -> 3 (süreli kalkan dili: taşıyanın tur başında azalır). Test modunda süreler işlemez, değer 3 yazılır.

---

## 3. Ömer'e soru listesi (kısa)
A5: Q-A1 sınıf bölünmesi · Q-A2 her sınıfın bonusu (a/b) · Q-A3 cep mi ek seçim mi · Q-A4 kahraman yoksa düğüm · Q-A5 barışçıl yolun ödülü · Q-A6 unvan nerede · Q-A7 bonus sefer dışına · Q-A8 Oath ile birlikte.
C1: Q-C1 tetikleme · Q-C2 kim kullanır · Q-C3 hak sayımı · Q-C4 Taint üst sınırı · Q-C5 kilise yeri/bedeli · Q-C6 Taint geçişte · Q-C7 Mend/Quench sayısı · Q-C8 "2 tur" · Q-C9 Salt Surge · Q-C10 iki Surge · Q-C11 sim · Q-C12 nerede çalışır.
