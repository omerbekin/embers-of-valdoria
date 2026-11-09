# Blood Warden (TASARIM, uygulanmadı)

> **Durum: uygulanmadı, fikir.** **Ne için / Güncel mi (2026-11-08):** Ömer'in "şimdilik yalnız konsept" dediği ön saf düellocu kahraman. Veride, kodda ve testte yok (`data/`, `src/`, `tests/` içinde blood-warden izi yok). 2026-11-08'de `classes/` altından buraya taşındı; fikir listesi: `characters.md`. Gerçek kahramanlar: `../classes.md`.

Durum: Ömer'in kararları 2026-10-25. Sayılar yok ya da taslak; yapı onaylanınca sim ile belirlenir. Sanat promptları: `blood-warden-art.md`; görsellerin son hâli için aşağıdaki "Sanat durumu" bölümü. **Ömer'in son talimatı: yalnızca konsept, motora/veriye hiçbir şey eklenmez.** Tek açık onay: karakter v2 hâliyle kesinleşsin mi (aşağıda).

## Kimlik
- Ön sıra düellocusu. Hasar, dayanıklılık ve takım savunması Warrior ile Defender arasında.
- Dayanıklılığı zırhtan değil **lifesteal**den gelir (zırhı düşük, Warrior civarı ya da altı).
- **Seri karakter (Ömer):** skill animasyonları diğer karakterlerden hızlı hissettirir; counter'ı çok hızlı, az hasarlı 3 vuruş.
- Ana stat STR. Kaynak: **can** (aşağıda).
- Kadın, biraz gore. İdle: çevik, hafif kambur, saldırmaya hazır; çok küçük nefes alıp verme hareketi (kodla).

## Kararlar (Ömer 2026-10-25)
1. **Ağır hasar (YENİ GENEL MEKANİK):** tek saldırıda hedefin canının belli bir yüzdesini almak = ağır hasar. Fiziksel kritik ya da ağır hasar **kan** bırakır. Karakterlerin çok hasar yediğindeki (hit) animasyonu ve kan dökülmesi buna bağlanır.
2. **Counter pasifi (YENİ MEKANİK):** eklenecek.
3. **Kaynak = can (B):** skill'ler mana yerine can harcar; lifesteal geri öder.
4. **Çift silah (c):** iki ele de tek el silah takılır, iki el farklı item olabilir ama **tür aynı olmak zorunda**. Ana ele sword takıldıysa ikinci ele de sword; ana ele axe takılırsa ikinci eldeki sword çantaya döner ve ikinci el axe ister. Silah görselleri diğer karakterler gibi mevcut item çizimlerinden gelir.
5. **Silah üstü kan efekti ve idle nefesi kodla:** tamam.

## Skill'ler (taslak)

### Pasif: Crimson Retort
Düşmanın her melee vuruşunda bir **counter şansı**: tutarsa **3 çok seri, az hasarlı vuruşla** karşılık verir. Counter hasarının bir kısmı lifesteal. Saldıran Blood Pool içindeyse counter Wound da verir. Tetiklenme sınırı yok.

### Aktifler
| Skill | Hedef | Ne yapar |
|---|---|---|
| Rend | tek düşman, yakın | **Maliyetsiz.** İki silahla iki hızlı vuruş, lifesteal. Kritik ya da ağır hasar kan bırakır (genel kural). |
| Crimson Tide | düşman ön sırası | Hafif hasar + Blood Pool (birkaç tur). Havuzdaki düşman Weakened + her tur az can kaybı. |
| Blood Oath | kendisi | Canından öder; birkaç tur lifesteal artar, counter uzaktan vuruşlara da cevap verir. |
| Sanguine Feast | tüm Blood Pool'lar | Havuzları emer: içindeki her düşmana hasar, toplamın bir kısmı kadar iyileşme; havuzlar biter. Uzun bekleme. |

Döngü: Tide ile havuz → düşman vurdukça counter ile beslenir → can düşünce Oath → Feast ile havuzları toplar.

## Kararlar 2. tur (Ömer 2026-10-25)
- **Yalnızca konsept:** motora/veriye hiçbir şey eklenmez; karakter kesinleştiriliyor.
- **Ağır hasar eşiği: tek saldırıda hedefin maks. canının ~%40'ı** (sim ile ince ayar). Yüksek tutuldu çünkü kan, üstüne döküldüğü burning ground gibi etkileri söndürecek; diğer sınıflarla çakışması fazla güçlü olmasın.
- **Kan bir etkileşim malzemesi:** burning ground'u söndürür; diğer elementlerle farklı etkileşimleri olabilir. Dostlara ve düşmanlara davranışı **etkileşim bazında** ayrı ayrı değerlendirilecek (tek bir "herkese / yalnız düşmana" kuralı yok).
- **Kansız düşmanlar** (iskelet, golem, hayalet) kan bırakmaz.
- **Can maliyeti:** temel skill (Rend) maliyetsiz; diğerleri can yetmiyorsa kullanılamaz.
- **Counter sınırı YOK:** düşmanın **her melee vuruşu** için ayrı counter şansı zarı atılır (counter şansa bağlı). Çok vuruşlu skill'de (ör. Warrior Double Strike) her vuruştan sonra ayrı zar; gerekirse saldıranın animasyonu ilk vuruştan sonra durur, Blood Warden 3 seri vuruşla cevap verir, saldıran devam eder.
- **Hız:** SPD statına doğrudan müdahale yok; serilik yalnızca animasyon hızında. Ana stat STR, **ikinci en yüksek stat DEX** (çevik).

## Açık sorular
- Counter şansı yüzdesi ve 3 vuruşun gücü (sim).
- Kanın diğer elementlerle etkileşim listesi (element planıyla birlikte; plan hâlâ beklemede).
- Counter kendisi ağır hasar sayılıp kan bırakabilir mi? (3 vuruş ayrı ayrı değerlendirilirse %40 eşiğine neredeyse hiç ulaşmaz.)
- Sefer tier'ı / açılma: `../progression/character-tiers.md` şablonuyla sonra.

## Sanat durumu (2026-10-25)
- **v2 son hâl:** `assets/source/concepts/blood-warden/v2/` (idle, rend, crimson-tide, blood-oath, sanguine-feast, crimson-retort, icons-sheet, preview). v1 aynı klasörün kökünde, geçersiz (eli silahlı, dik duruş; `bloodletting` adı `rend` oldu). Bu görseller git'e eklenmedi, yalnızca bu bilgisayarda.
- **Ömer'den CEVAP BEKLİYOR:** v2 kesinleşsin mi, yoksa bir tur daha mı? Claude'un gözlemleri: üst gövde yeterince kambur değil; Crimson Tide 48 pikselde leke gibi; ikonlarda istenenden fazla damla; Sanguine Feast'in üstündeki akış hafif kesik olabilir. Önizlemedeki baltalar elle yerleştirildi (biraz büyük, yumruğun üstünde); gerçek tutuş poz aşamasında.
- **Oyuna girecekse gereken sanat:** diğer kahramanlar gibi silahsız poz sayfaları (`assets/source/poses/<id>-v2/`: narrow, one-handed, two-handed düzeni; yumruklu gövde, silah el noktasına takılır), iki ele silah takan rig, silah üstü kan efekti (kod), idle nefesi (kod), hızlı skill animasyonları, skill VFX ve sesleri, ikonlar.
- Prompt notu: ChatGPT'de "blood" yerine "crimson"; uzuv/organ yok. Tarayıcı yolu v2'de ilk denemede ve retsiz çalıştı.

## Bu karakter nasıl seçildi
Ömer'in 3. frontline şartları: dayanıklılık, hasar ve takım savunmasında Defender ile Warrior arasında; güçlü ground; takımı dolaylı korur; dayanıklılık az hasar yemekten değil lifesteal'den; pasif counter; opsiyonel olarak yeni bir elementle mevcut element etkileşimi. Ömer sohbette bir kez bu karaktere "reaver" dedi; kastettiği Blood Warden, ad değişmedi.

Support kararı: ayrı bir support karakteri konusunda Ömer emin değildi; yerine Druid, Paladin ve Mage'in support yanlarına ufak güçlendirme fikri. Karar verilmedi, uygulanmadı.

Seçilmeyen frontline konseptleri (ileride lazım olursa):
- **Ashen Reaver (Kül, yeni element):** Ash Field'daki düşman daha çok ıskalar; külde lifesteal iki kat; Kül + Su = Çamur, Kül + Ateş = Köz. Skill'ler: Cinder Cleave, Smother, Ashstorm, Rekindle; pasif Ember Riposte.
- **Salt Warden (Tuz, yeni element):** kendi karelerine Salt Line çeker, düşman ground'u tutmaz; Wound'lu/wet hedefte lifesteal; Tuz + Su = Brine, Tuz + Kan/Zehir = temizlik + hasar. Skill'ler: Brine Strike, Salt Line, Scour, Preserve; pasif Salt in the Wound.

İlk turdaki genel karakter fikirleri (seçilmedi): Warden (itme/çekme), Chronicler (sıra manipülasyonu), Bard (mana desteği), Alchemist (statü tüketici), Frost Knight (buz ön sıra). Ömer'in yön notu: elementlere yeni anlamları yeni karakterlerle yüklemek istiyor.

## Uygulanırsa unutulmasın
- Blood Warden'ın mevcut elementlerle yazılan kısımları (Kara kan: Kan + Karanlık; Kan + Buz; Defender'ın havuz yayması; Warrior kritiklerinin kan bırakması) taslak; kan söndürme dışındaki etkileşimler karar değil.
- Ağır hasar kuralı genel mekanik: tüm karakterlerin ağır darbe animasyonu ve kan dökülmesi buna bağlanır. Element planındaki eski "ağır kritik = maks. canın %15'i" sayısının (`future-ideas.md`, 2026-10-13) yerine %40 geçer; bu belgedeki karar daha yeni.
- Counter için motorda saldıran animasyonunu vuruşlar arasında durdurma gerekir; çok vuruşlu skill'lerde her vuruş ayrı zar.
- Çift silah kuralı yalnızca bu sınıfa: ikinci ele axes/swords ailesinden tek el silah, tür ana elle aynı.
- Yeni içerik kuralları geçerli: yapay zekâ değerlendirmesi + testi ile gelir; ground, statüsünü içindeyken verir (ground status kuralı, 2026-10-29); her sim öncesi Ömer'e sorulur.
- Oyunda Vesper adlı başka bir yeni kahraman var (`../classes/vesper.md`); ikisi karıştırılmasın.

## Bağlantılar
- Element planı (`../element-class-template.md`): Kan zemini oradaki "ağır kritik" kuralının genişletilmiş hali; element reworkü hâlâ beklemede, Blood Warden'ın kan zemini ondan bağımsız ground sistemiyle yapılabilir.
- Mevcut ground sistemi: `data/grounds.json` (poison, burning, holy_ground...).
- Çift silah kuralı: `data/items.json > _grip`, `src/progression/items.ts > gripOf / fitsSlot / planEquip`.
