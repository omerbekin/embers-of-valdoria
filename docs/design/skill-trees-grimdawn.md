# Sınıf ağaçları: Grim Dawn tarzı (ÖNERİ, 2026-10-12)

> Ömer: “Grim Dawn tarzı sınıf skill ağaçlarını deneyelim. Skill’leri daha yaratıcı yap, biraz çerçevenin dışına çık.”
> Bu belge **yalnızca öneridir**; `data/` ve `src/` değişmedi. Cyberpunk tarzı taslağın (`offhand-and-skilltree-draft.md`, Bölüm D) **alternatifidir**; ikisinden biri seçilecek. Bölüm C’deki kararlar (L30, level başına 1 puan, düşmanda ağaç yok, sıfırlama ücreti, Endless’ta koşuya ait puan) burada da geçerli.
> **Tüm sayılar PROVİZYON.** **[ÖNERİ]** = onay gereken yeni mekanik / stat / kural (hepsi sondaki “Ömer’e sorular” listesinde). **MEVCUT** = motorda olan bir şeyin skill’e bağlanması. Mockup (Warrior): oturum scratchpad’inde `grimdawn-tree.html`.

---

## 1. Sistem kuralları

### 1.1 Grim Dawn’dan ne alıyoruz

| Grim Dawn | Bu oyun (öneri) |
|---|---|
| Mastery bar (0-50): puan koydukça kademeler açılır + temel stat verir | **Ustalık barı (0-15)**. Bara konan her puan kademe açar ve küçük temel stat verir |
| Kademe sütunları (1, 5, 10, 15, 20, 25, 32, 40, 50) | **5 kademe**: bar 0 / 3 / 6 / 10 / 15 (T1-T5; T5 = kapstone) |
| Aktif skill’ler | Aktif skill’ler; mevcut 4 skill + sınıf başına 4-5 **yeni** aktif |
| Modifier (skill’i güçlendirir, rank’lı) | **Güçlendirici (G)**: ana skill’e bağlı, 1-2 rank, sayı ya da küçük ek etki |
| Transmuter (skill’in davranışını değiştirir, birbirini dışlar) | **Dönüştürücü (D)**: ana skill’in şeklini / elementini / hedefini değiştirir. **Bir skill’de aynı anda yalnızca 1 dönüştürücü** |
| Pasif düğümler | Pasif düğümler (slot almaz, hep açık) |
| Devotion (takımyıldızlar) | İsteğe bağlı **Ember Constellations** katmanı (1.7) **[ÖNERİ]** |

### 1.2 Ustalık barı

- Bar en çok **15** puan alır. Kademe eşikleri: **T1 = 0, T2 = 3, T3 = 6, T4 = 10, T5 = 15**.
- Bara konan her puan: **+1 ana stat** (Warrior STR, Hexer LUCK, Druid INT…) ve **+%1 maks can**. 15 puanda +15 ana stat, +%15 can. **[ÖNERİ]** (bar statı yeni bir stat kaynağı)
- Bar puanı “boşa” gitmez: kademe açar ve statı büyütür. Bu yüzden “hep barı doldur” mu, “erken skill’e yatır” mı ikilemi oluşur (Grim Dawn’ın asıl kararı).
- Sınıfın mevcut pasifi (Berserker, Ill Omen, Verdant Blessing…) barın **doğuştan** özelliğidir; puan istemez, değişmez.

### 1.3 Düğüm türleri ve maliyet

| Tür | Öğrenme | Rank | Kural |
|---|---|---|---|
| **Başlangıç aktifleri** (mevcut 4 skill) | L1’de bedava, rank 1 | 1-3 | Rank 2-3 için o kademe açık olmalı. Rank başına +%10 güç ya da -1 MP gibi küçük sayı |
| **Yeni aktif** | 1 puan | 1-3 | Kademesi açık olmalı |
| **Güçlendirici (G)** | 1 puan | 1-2 | Ana skill en az rank 1 + kendi kademesi açık |
| **Dönüştürücü (D)** | 1 puan | 1 | Ana skill rank 1 + kademe açık. **Skill başına en çok 1 dönüştürücü “takılı”**; ikincisini alırsan Gear ekranında hangisinin takılı olduğunu seçersin **[ÖNERİ]** |
| **Pasif** | 1 puan | 1-3 | Kademesi açık olmalı |
| **Kapstone** | 3 puan | 1 | T5 (bar 15). Sınıf başına 1 kapstone |

- Dal / zincir önkoşulu yok: kademe açıksa o sütundaki her düğüm alınabilir; yalnızca G/D düğümleri ana skill’e bağlıdır (ekranda ince altın çizgi).

### 1.4 Savaşta 4 slot kuralı (değişmedi)

- Her kahraman savaşa **yine yalnızca 4 aktif skill** götürür. Ağaçta 8-9 aktif olabilir; hangi 4’ünün takılı olduğu Gear/Formation ekranında seçilir, **savaş içinde değişmez**.
- Varsayılan yükleme = mevcut 4 skill (bugünkü oyun birebir korunur; hiç dokunmayan oyuncu aynı oyunu oynar).
- Pasifler, kapstone ve G/D düğümleri slot almaz; G/D yalnızca ana skill takılıysa çalışır.
- **[ÖNERİ] Ağır skill kuralı:** `initialCooldown` taşıyan (★ işaretli, “ultimate” ağırlığında) skill’lerden yüklemede **en çok 1** olabilir. İki ultimate’lı yapılar denge dışı kalmasın.
- Düşmanlar ve yapay zeka aynı sınıfı **mevcut 4 skill ile ağaçsız** kullanır (Bölüm C kararı).

### 1.5 Puan ve level akışı (sefer ~L1-30)

- Level 2’den itibaren level başına 1 puan = L30’da **29 puan** (karar değişmedi). Puan **tek havuz**: bar ve düğümler aynı havuzdan.
- Tipik L30 yapısı: bar 15 + kapstone 3 = 18; kalan **11** puan: 2 yeni aktif, 3-4 dönüştürücü/güçlendirici, birkaç rank.
- Alternatif “saf skill” yapısı: bar 10’da durur (kapstone yok), 19 puan düğümlere: daha geniş ama daha düşük stat.

| Sefer anı | Puan | Ne açılmış olur (örnek) |
|---|---|---|
| Bölüm 1 sonu (~L10) | 9 | Bar 6 (T3 açık) + 3 düğüm: ilk yeni aktif + 2 dönüştürücü |
| Bölüm 2 sonu (~L20) | 19 | Bar 10 (T4) + 9 düğüm |
| Bölüm 3 sonu (L30) | 29 | Bar 15 + kapstone + 11 düğüm |

- **[ÖNERİ] seçenek B:** bar level’la kendiliğinden dolar (her 2 level’da +1), 29 puanın hepsi düğümlere gider. Daha basit ama Grim Dawn’ın “bar mı skill mi” kararı kaybolur. Öneri: **A (elle)**.

### 1.6 Sıfırlama (respec)

- **Düğüm iadesi:** tek tek, puan başına 5 altın; kasaba ve dinlenme duraklarında; Endless’ta tüccar dalgasında. İade, ona bağlı bir G/D düğümünü ya da açık kademeyi bozacaksa önce onlar iade edilir (arayüz uyarır).
- **Bar iadesi yok** (Grim Dawn gibi); yalnızca **tam sıfırlama** (ağaç + bar) ile: 15 + 4 x level altın (Bölüm D.5 ile aynı ücret). **[ÖNERİ]** (bar iadesinin ayrıca kilitli olması)
- Yükleme (hangi 4 skill, hangi dönüştürücü takılı) bedava ve her an (savaş dışı) değişir.

### 1.7 İsteğe bağlı: Ember Constellations (Devotion benzeri) **[ÖNERİ, isteğe bağlı]**

- Sefer haritasında bazı düğümler **Ember Shrine** (kor sunağı): temizlenen sunak tüm takıma **1 Ember** verir (seferde ~10).
- Her kahraman Ember’lerini **tüm sınıflara ortak** küçük bir yıldız haritasına koyar: 6 takımyıldız x 3-5 yıldız. Yıldızlar küçük stat verir; bir takımyıldızı tamamlamak bir **Celestial Proc** açar ve bu proc kahramanın bir skill’ine **bağlanır**.
- Örnekler: **The Anvil** (bağlı skill kritik yaparsa aynı şeritteki rastgele bir düşmana Stun 1; tur başına 1), **The Lantern** (bağlı skill şifa verirse aynı sıradaki dostlara %20’si), **The Crow** (bağlı skill öldürürse en yakın düşmana 1 Omen; her sınıf kullanabilir), **The Ember** (bağlı skill’in vurduğu ilk hedefte Burning zemini).
- Uygulama sırası: ağaçlardan **sonra**; ağaç sistemi onaylanmadan başlanmaz.

### 1.8 Item’lerle ilişki

- Set item’leri ve affix’ler **sayıyı** büyütür, ağaç **davranış** ekler (Bölüm B.6 ilkesi).
- **[ÖNERİ] Grim Dawn’ın “+1 rank” affix’i:** nadir item’lerde “+1 to Whirlwind” gibi affix; rank 3’ün üstüne (en çok 4) çıkabilir. Düğme: `treeRules.itemRankCap` = 1.
- Çift sayım kuralları Bölüm D.2’deki gibi (bir kullanım = bir tetik; durum bonusu kovası, tavanlar).

### 1.9 Arayüz (kısa)

- Gear ekranında **Gear | Skills | Stats**. Skills sekmesi: solda dikey ustalık barı (aşağıdan yukarı dolar, kademe çentikleri), sağda 5 kademe sütunu; aktif skill’ler büyük daire, G/D küçük elmas, ana skill’e ince altın çizgiyle bağlı.
- Dokun = ayrıntı; + / − = puan; kilitli kademe karartılmış ve “Bar 10 gerekir” yazar. Altta **yükleme şeridi**: 4 slot.
- Telefonda ağaç alanı yatay kaydırılır, sayfa kaymaz.

### 1.10 Denge düğmeleri

`treeRules.masteryMax` 15, `masteryTiers` [0, 3, 6, 10, 15], `masteryStatPerPoint` {primary: 1, hpPct: 0.01}, `capstoneCost` 3, `maxTransmutersPerSkill` 1, `maxHeavyInLoadout` 1, `itemRankCap` 1, `reset.nodeRefund` 5, `reset.full` 15 + 4 x level, `power` 1,0. Ölçüm: sınıf başına 3 hazır yapı `sim:campaign`’de; aynı sınıfın yapıları arasında sefer bitirme farkı <= 3 puan.

---

## 2. WARRIOR: “Warlord” ustalığı (tam örnek)

**Kimlik:** ön sıra, Rage, can azaldıkça sertleşen (Berserker). **Yeni yüzü:** düşman dizilimini **zorla bozan** savaşçı (çekme / itme / şerit kırma) ve ölümle pazarlık. Doğuştan pasif: **Berserker** (değişmez). Bar statı: +1 STR, +%1 can.

| Kademe | Düğümler |
|---|---|
| T1 (bar 0) | Double Strike, Whirlwind, Charge (başlangıç) · Iron Chain (yeni) |
| T2 (bar 3) | Abyssal Cry ★ (başlangıç) · War Banner (yeni) · G/D: Honed Edge, Bleeding Gale, Shatter |
| T3 (bar 6) | Earthbreaker (yeni) · Old Wounds (pasif) · G/D: Cleave Through, Eye of the Storm, Trample, Clothesline, Echoing Cry |
| T4 (bar 10) | Headsman’s Verdict (yeni) · D: Pommel Strike, Shoulder Throw, Dread Roar, Rally Banner, Fault Line |
| T5 (bar 15) | Kapstone: **Deathless Fury** · G: Bloodied Standard, Public Execution, Aftershock |

### 2.1 Aktif ve pasif skill’ler

| Skill | Kademe | Etki (rank 1) | Rank 2-3 | Tür |
|---|---|---|---|---|
| **Double Strike** | T1 | 2 x STR %40, tek hedef | %42 / %44 | başlangıç |
| **Whirlwind** | T1 | 8 MP, cd 3, tüm düşmanlar %69 | %72 / %75 | başlangıç |
| **Charge** | T1 | 10 MP, cd 3, %67,5 + Stun 1 | %71 / %74 | başlangıç |
| **Iron Chain** | T1 | 6 MP, cd 2. Zincir fırlatır: hedef (herhangi bir sıradan) **kendi şeridinde bir sıra öne çekilir**; önündeki hücre doluysa ikisi yer değiştirir. STR %40 | %45 / %50 | **[ÖNERİ]** zorla hareket |
| **Abyssal Cry** ★ | T2 | 30 Rage, cd 5; sonraki 3 saldırı +1 menzil, +%50 STR | +%55 / +%60 | başlangıç |
| **War Banner** | T2 | 10 MP, cd 5. Kendi tahtanda boş bir hücreye **sancak** diker (çağrı, 3 tur, saldırmaz). Sancağın **sırasındaki** dostlar her vuruluşta Warrior’a +2 Rage verir | 4 / 5 tur | MEVCUT çağrı + **[ÖNERİ]** Rage tetiği |
| **Earthbreaker** | T3 | 12 MP, cd 3. Yeri yarar: seçilen **şeridin tamamı** (column, öne→arkaya aşamalı) STR %60, her sıra geriye %15 azalır | %65 / %70 | MEVCUT (column + stages) |
| **Old Wounds** (pasif) | T3 | Warrior her kritik yediğinde 1 **Scar** (en çok 5, savaş sonu sıfırlanır); Scar başına +%4 hasar | +%5 / +%6 | **[ÖNERİ]** yük sayacı |
| **Headsman’s Verdict** ★ | T4 | 15 MP, cd 4, başlangıç cd 2. Tek hedef STR %80; hedefin eksik canının her %10’u +%10. **Öldürürse ceset bırakmaz** (baş kesildi: Raise Dead / Resurrection alamaz) | %85 / %90 | **[ÖNERİ]** ceset inkârı |
| **Deathless Fury** (kapstone) | T5 | Savaşta bir kez ölümcül darbe gelince Warrior **2 kendi turu boyunca ölmez** (can 1’in altına inmez); bu sürede aldığı her hasar Rage’e çevrilir (hasarın %25’i). Süre bitince saklanan hasarın **%50’si** bir kerede gelir; o anda bir düşman öldürmüşse hiç gelmez | — | **[ÖNERİ]** (Lucky Escape’ten farklı: ertelenmiş ölüm) |

### 2.2 Güçlendiriciler (G) ve dönüştürücüler (D)

| Ana skill | Düğüm | Kademe | Rank | Etki |
|---|---|---|---|---|
| Double Strike | **Honed Edge** (G) | T2 | 2 | Vuruş başına +%3 / +%6 ve 2. vuruş 2 tur Wounded (MEVCUT) |
| Double Strike | **Cleave Through** (D) | T3 | 1 | 2. vuruş hedefin **arkasındaki** birime (aynı şerit) geçer: ön sıra + arka sıra delici vuruş |
| Double Strike | **Pommel Strike** (D) | T4 | 1 | 1. vuruş hasarsız ama Staggered (MEVCUT); 2. vuruş Staggered hedefe **kesin kritik** |
| Whirlwind | **Bleeding Gale** (G) | T2 | 2 | Vurulan herkes 1 / 2 tur Wounded (MEVCUT) |
| Whirlwind | **Eye of the Storm** (D) | T3 | 1 | Tüm düşmanlar yerine **plus** şekli; ortadaki birim **3 kez** vurulur (MEVCUT `hitsAtCenter`) |
| Charge | **Shatter** (G) | T2 | 1 | Hedef kendi sonraki turuna kadar Overextended (MEVCUT) |
| Charge | **Trample** (D) | T3 | 1 | Hedefin **şeridindeki herkesi** önden arkaya ezerek geçer: %50 / %40 / %30 / %20; Stun yalnızca son vurulana |
| Charge | **Shoulder Throw** (D) | T4 | 1 | Stun yerine hedefi **bir sıra geri iter**; arkası doluysa ikisi de STR %30 çarpışma hasarı alır ve Staggered **[ÖNERİ]** |
| Iron Chain | **Clothesline** (G) | T3 | 2 | Çekilen hedef 1 tur Slow / + Staggered |
| Abyssal Cry | **Echoing Cry** (G) | T3 | 1 | Fury 3 → 4 saldırı |
| Abyssal Cry | **Dread Roar** (D) | T4 | 1 | Kendine Fury yerine: ön sıradaki tüm düşmanların **sıradaki turu %50 gecikir** (sıra göstergesinde geri kayar; elite/boss %25) **[ÖNERİ]** tur sırası itme |
| War Banner | **Rally Banner** (D) | T4 | 1 | Rage yerine: sancağın sırasındaki dostlar tur başında Haste 1 (MEVCUT durum) |
| War Banner | **Bloodied Standard** (G) | T5 | 1 | Sancak ölürse / süresi dolarsa bulunduğu hücreden **düşman tahtasında aynı hücreye** plus şeklinde STR %40 |
| Earthbreaker | **Fault Line** (D) | T4 | 1 | Şerit yerine **sıra** (row) yarılır |
| Earthbreaker | **Aftershock** (G) | T5 | 1 | Aynı şerit bir sonraki kendi turunun başında %40 güçle tekrar sarsılır (bir kullanım = bir tetik) |
| Headsman’s Verdict | **Public Execution** (G) | T5 | 1 | Öldürürse aynı sıradaki düşmanlar 1 tur Blinded (dehşet) |

**Örnek yapılar:** *Dizilim Kırıcı* (Iron Chain + Trample + Earthbreaker + Charge): arka sıra büyücüyü öne çek, şeridi ez. *Kanlı Sancak* (War Banner + Abyssal Cry + Old Wounds + Deathless Fury): ön sıra tank gibi dayanıp Rage yüzer. *Cellat* (Headsman’s Verdict + Pommel Strike + Double Strike): Undead / Paladin’e karşı ceset inkârı.

---

## 3. HEXER: “Malefic” ustalığı (tam örnek)

**Kimlik:** LUCK, Omen yığını, Doom patlaması, Wither. **Yeni yüzü:** **şans hırsızı**: düşmanın şansını, kaçışını, hatta Lucky Escape’ini çalar; kötü şansı bulaşıcı yapar. Doğuştan pasif: **Ill Omen**. Bar statı: +1 LUCK, +%1 can.

| Kademe | Düğümler |
|---|---|
| T1 | Evil Eye, Jinx (başlangıç) · Unlucky Number (pasif) |
| T2 | Withering Curse (başlangıç) · Sympathy Pin (yeni) · G: Baleful Stare, Fester |
| T3 | Black Cat (yeni) · D: Evil Twin Eye, Hex Knot, Plague Cloud |
| T4 | Doom Mark ★ (başlangıç) · Borrowed Luck (yeni) · D/G: Shared Fate, Final Omen, Bad Omen Cat |
| T5 | Kapstone: **Witching Hour** · G/D: Thief of Fate, Necrotic Bloom |

> Doom Mark bugün de 4. yuva skill’i olduğu için T4’te durur ama **başlangıçtan sahiptir** (rank 1 bedava); yalnızca rank 2-3 ve modları T4 ister.

### 3.1 Aktif ve pasif skill’ler

| Skill | Kademe | Etki (rank 1) | Rank 2-3 | Tür |
|---|---|---|---|---|
| **Evil Eye** | T1 | 0 MP, LUCK %65 + 1 Omen (kritik 2) | %68 / %71 | başlangıç |
| **Jinx** | T1 | 2 MP, cd 3, %55 +%25 kritik, Jinxed 2 tur + 1 Omen | %58 / %61 | başlangıç |
| **Unlucky Number** (pasif) | T1 | Bir düşman **ıskaladığında** (miss) 1 Omen alır (düşman başına tur başına 1) | rank 2: Hexer’in kendisi dodge edince de | **[ÖNERİ]** ıska → Omen |
| **Withering Curse** | T2 | 14 MP, cd 3, 2x3, %22,5 + Wither 3 tur + 1 Omen | %25 / %27 | başlangıç |
| **Sympathy Pin** | T2 | 8 MP, cd 3. İki düşmanı iğneyle **bağlar** (3 tur): birinin aldığı hasarın %25’i diğerine de geçer (bağ zincirleme tetiklemez) | %30 / %35 | **[ÖNERİ]** hasar bağı (Dark Bond’un düşman versiyonu) |
| **Black Cat** | T3 | 12 MP, cd 5. Kendi tahtana **kara kedi** çağırır (2 tur, saldırmaz, düşük can). Kedinin **şeridine** saldıran her düşman -%15 isabet. Kedi ölürse / süresi dolunca **tüm düşmanlara 1 Omen** | 3 tur / -%20 | MEVCUT çağrı + Blinded benzeri |
| **Doom Mark** ★ | T4 | 14 MP, cd 4; Omen patlatır x1,5 | x1,55 / x1,6 | başlangıç |
| **Borrowed Luck** | T4 | 10 MP, cd 4. Hedeften 3 tur **LUCK çalar** (hedefin LUCK’ının %30’u Hexer’e geçer). Hedefin **kullanılmamış Lucky Escape’i varsa Hexer’e geçer** (bu savaş için) | %35 / %40 | **[ÖNERİ]** stat çalma + Lucky Escape çalma |
| **Witching Hour** (kapstone) | T5 | Savaşta bir kez, Hexer’in canı ilk kez %50 altına inince ya da kendi 6. turunda: 2 round boyunca **Omen tavanı 3 → 5**; Doom 3’te değil 5’te patlar ve yığın başına normalin **1,5 katı** vurur | — | **[ÖNERİ]** Omen tavanı değişimi |

### 3.2 Güçlendiriciler ve dönüştürücüler

| Ana skill | Düğüm | Kademe | Rank | Etki |
|---|---|---|---|---|
| Evil Eye | **Baleful Stare** (G) | T2 | 2 | +%5 / +%10 kritik (kritik = 2 Omen) |
| Evil Eye | **Evil Twin Eye** (D) | T3 | 1 | Tek hedef yerine **x** şekli (merkez + 4 çapraz); çaprazlara %40 ve Omen yok, merkeze tam |
| Jinx | **Hex Knot** (D) | T3 | 1 | Jinxed, hedef kendi saldırısında bitmez; **sonraki 2 saldırısına** kadar sürer **[ÖNERİ küçük]** |
| Withering Curse | **Fester** (G) | T2 | 2 | Zaten Wither’lı hedefte Wither’ı 1 / 2 tur uzatır (en çok 5) **[ÖNERİ küçük]** |
| Withering Curse | **Plague Cloud** (D) | T3 | 1 | Element değişir: lanet zehre döner, alan 2x3 yerine **plus** ve Poison zemini bırakır (MEVCUT zemin) |
| Sympathy Pin | **Shared Fate** (D) | T4 | 1 | Hasar yerine **Omen** paylaşılır: birine Omen gelince diğerine de (Doom tetiklemez) |
| Doom Mark | **Final Omen** (G) | T4 | 1 | Patlama komşu birimlere %50 (MEVCUT komşu hasarı) |
| Black Cat | **Bad Omen Cat** (D) | T4 | 1 | Kedi Omen dağıtmak yerine ölünce **kendi hücresine denk gelen düşman şeridini** Jinxed yapar |
| Borrowed Luck | **Thief of Fate** (G) | T5 | 1 | Çalınan LUCK sürerken Hexer’in kritikleri 1 yerine **2 Omen** verir |
| Doom Mark | **Necrotic Bloom** (D) | T5 | 1 | Hedef Wither’lıysa kalan Wither tikleri patlamayla **anında** vurur, ama Omen komşulara geçmez **[ÖNERİ]** |

**Örnek yapılar:** *Kara Kedi Kumarı* (Black Cat + Unlucky Number + Jinx + Evil Eye): düşmanı ıskalatıp Omen bas. *İğne ve Kıyamet* (Sympathy Pin + Shared Fate + Doom Mark + Evil Eye): iki hedefe birden Doom. *Şans Hırsızı* (Borrowed Luck + Thief of Fate + Witching Hour): Gambler / Archer gibi LUCK’lı düşmanlara karşı.

---

## 4. DRUID: “Wildheart” ustalığı (tam örnek)

**Kimlik:** INT, doğa hasarı, şifa, çağrı (Treant), her çağrıda takım şifası (Verdant Blessing). **Yeni yüzü:** **büyüyen savaş alanı**: tohum eker, mevsimleri çevirir, cesetleri toprağa döndürür, gerektiğinde ayıya dönüşür. Doğuştan pasif: **Verdant Blessing**. Bar statı: +1 INT, +%1 can.

| Kademe | Düğümler |
|---|---|
| T1 | Thorn Whip, Rejuvenate (başlangıç) · Plant Seed (yeni) |
| T2 | Nature’s Wrath (başlangıç) · Circle of Seasons (pasif) · G/D: Barbed Lash, Rootwalk, Fertile Soil |
| T3 | Bramble Carpet (yeni) · Return to the Soil (yeni) · D: Chosen Seed, Stampede Roots, Strangler |
| T4 | Summon Treant ★ (başlangıç) · Wild Shape (yeni) · G/D: Ironbark, Elder Sap, Thorn Coat |
| T5 | Kapstone: **The Green Return** · G/D: Rooted Ancient, Carrion Flower, Bear Stance |

### 4.1 Aktif ve pasif skill’ler

| Skill | Kademe | Etki (rank 1) | Rank 2-3 | Tür |
|---|---|---|---|---|
| **Thorn Whip** | T1 | 0 MP, INT %86 doğa + Wounded 2 | %90 / %94 | başlangıç |
| **Rejuvenate** | T1 | 10 MP, cd 3, şifa %67,5 + HoT 3 tur | %71 / %74 | başlangıç |
| **Plant Seed** | T1 | 6 MP, cd 3. Kendi tahtanda boş hücreye **tohum** eker (çağrı, 1 can). **2 kendi turu sonra** filizlenir, rastgele biri olur: **Briar** (önündeki düşmana her tur %30), **Healbloom** (sırasındaki dostlara tur başı %15 şifa), **Snareroot** (şeridindeki ilk düşmanı 1 tur Slow). Filizlenme = çağrı → Verdant Blessing tetiklenir | 2 tohum aynı anda / filiz 3 tur | MEVCUT çağrı + **[ÖNERİ]** gecikmeli büyüme |
| **Nature’s Wrath** | T2 | 14 MP, cd 3, 2x3, %56 doğa | %59 / %62 | başlangıç |
| **Circle of Seasons** (pasif) | T2 | Druid’in her kendi turu mevsimi ilerletir: **Spring** (şifalar +%15) → **Summer** (doğa hasarı +%15) → **Autumn** (Wounded/DoT +1 tur) → **Winter** (doğa isabeti 1 tur Slow) → … Mevsim HUD’da Druid’in yanında görünür | +%20 / +%25 | **[ÖNERİ]** dönen mevsim durumu |
| **Bramble Carpet** | T3 | 12 MP, cd 4. Düşman tahtasında bir **sıraya** diken halısı (yeni zemin **Brambles**, 3 tur): üstündeki birim **Move** yaparsa ya da melee saldırırsa INT %35 alır ve Wounded | 4 tur / %40 | **[ÖNERİ]** yeni zemin |
| **Return to the Soil** | T3 | 8 MP, cd 3. Bir **cesedi** (dost ya da düşman) toprağa gömer: ceset tüketilir; tüm dostlar INT %30 şifa, Druid +8 MP. Düşman cesedi ise ayrıca Druid’in sıradaki çağrısı **+%25 can** | %35 / %40 | MEVCUT ceset tüketme |
| **Summon Treant** ★ | T4 | 16 MP, cd 6, Treant 3 tur | 4 tur / Treant +%15 can | başlangıç |
| **Wild Shape** | T4 | 12 MP, cd 5. 3 kendi turu **ayı** formu: Druid ön sıraya geçmek zorunda değildir ama melee olur; INT yerine STR’sinin 2 katıyla vurur, zırh +%50; Thorn Whip yerine **Maul** (STR %90 + Staggered) kullanılır. Formda şifa skill’leri kapalı | 4 tur / zırh +%60 | **[ÖNERİ]** form değiştirme (skill geçici değişir) |
| **The Green Return** (kapstone) | T5 | Savaşta bir kez, bir dost ölünce cesedi **Sapling** çağrısına dönüşür (aynı hücre, düşük can, saldırmaz). Sapling **2 tur yaşarsa** dost %30 canla dirilir; Sapling ölürse ceset normal kalır (tüketilmez) | — | **[ÖNERİ]** büyüyerek diriliş |

### 4.2 Güçlendiriciler ve dönüştürücüler

| Ana skill | Düğüm | Kademe | Rank | Etki |
|---|---|---|---|---|
| Thorn Whip | **Barbed Lash** (G) | T2 | 2 | Wounded 2 → 3 / 4 tur |
| Thorn Whip | **Strangler** (D) | T3 | 1 | Hedefi **kendi şeridinde bir sıra öne çeker** (Iron Chain ile aynı kural) **[ÖNERİ]** |
| Rejuvenate | **Rootwalk** (D) | T2 | 1 | Şifa öncesi hedefi kendi tahtanda seçtiğin boş hücreye taşır (kökten yürüyüş) ve 1 tur Fortify |
| Plant Seed | **Fertile Soil** (G) | T2 | 1 | Filizlenme 2 → 1 tur |
| Plant Seed | **Chosen Seed** (D) | T3 | 1 | Filiz rastgele değil, **sen seçersin** |
| Nature’s Wrath | **Stampede Roots** (D) | T3 | 1 | 2x3 yerine tek **şerit** (column) ama her vurulan 1 tur Slow ve **en öndeki 2 kez** vurulur |
| Summon Treant | **Ironbark** (G) | T4 | 2 | Treant +%20 / +%40 zırh ve Taunt’la doğar (MEVCUT taunt) |
| Summon Treant | **Elder Sap** (G) | T4 | 1 | Treant ölünce hücresinde Healbloom filizi kalır |
| Wild Shape | **Thorn Coat** (G) | T4 | 1 | Ayı formunda Druid’e melee vuran 1 tur Wounded |
| Summon Treant | **Rooted Ancient** (D) | T5 | 1 | Treant’ın ömrü yok (savaş boyu) ama **hiç hareket etmez ve saldırmaz**; her round sonunda en yaralı dosta INT %25 şifa |
| Return to the Soil | **Carrion Flower** (D) | T5 | 1 | Şifa yerine cesetten **Carrion Flower** çağrısı: 2 tur, her tur düşman sırasına Poison zemini tükürür |
| Wild Shape | **Bear Stance** (D) | T5 | 1 | Form süresizdir ama Druid’in MP yenilenmesi durur; formdan çıkmak 1 tur |

**Örnek yapılar:** *Bahçıvan* (Plant Seed + Chosen Seed + Circle of Seasons + Summon Treant): her filiz takımı şifalar. *Mezar Bahçesi* (Return to the Soil + Carrion Flower + Nature’s Wrath): Undead’in ceset ekonomisini bozar. *Ayı Ruhu* (Wild Shape + Bear Stance + Thorn Coat + Bramble Carpet): ön sırada beklenmedik bir Druid.

---

## 5. Diğer 8 sınıf: kavram + 3 imza yeni skill (PROVİZYON)

**Anti-Mage: “Nullwarden”.** Büyüyü sadece yakmak değil, **büyünün kendisine dönmek**: düşman büyüsünü cezalandırır, MP’yi takıma akıtır. Ward ve Mana Overflow çizgisi korunur.
- **Null Lantern**: kendi tahtana fener çağrısı (3 tur); fenerin **şeridindeki** düşman hedeflere atılan düşman büyüleri +%50 MP öder. **[ÖNERİ]** MP vergisi
- **Mana Leech Chain**: bir düşman büyücüye zincir (3 tur); her MP harcadığında yarısı Anti-Mage’e gelir. **[ÖNERİ]**
- **Spellbreak**: tek seferlik duruş; sıradaki MP’li düşman skill’i bir dosta atılırsa **iptal olur** ve cooldown’u baştan başlar (elite/boss: yarım hasar). **[ÖNERİ]** karşı büyü

**Archer: “Huntmaster”.** Uzaktan ama **alanı şekillendiren** okçu: hedefi yere çiviler, okları sektirir, karanlığı aydınlatır.
- **Pinning Shot**: hedef 2 tur **Pinned**: Move yapamaz, itilip çekilemez, Guard alamaz. **[ÖNERİ]** yeni durum
- **Ricochet Arrow**: ilk hedefe tam, sonra **x** şeklindeki çaprazlara seker (%35); boş hücrede sekme kaybolur. MEVCUT x şekli
- **Flare Arrow**: bir **sırayı** aydınlatır: Shrouded kalkar, 2 tur dostların o sıraya isabeti +%15 ve kritik +%10. MEVCUT durumlar

**Cutthroat: “Shadowhand”.** Arkası açık hedefi avlayan suikastçı, artık **sözleşme** ve **hırsızlık** da yapar.
- **Contract**: hedefe kontrat (3 tur); hedef kimin elinden ölürse ölsün Cutthroat’un tüm cooldown’ları 1 azalır ve Haste 1. **[ÖNERİ]**
- **Pickpocket**: hedefin bir **olumlu durumunu çalar** (Haste, Fortify, Blessed…) ve kendine alır. **[ÖNERİ]** buff çalma
- **Caltrops**: düşman tahtasında bir **şeride** Caltrops zemini; şeritte yer değiştiren ya da öne geçen birim Wounded + Slow. **[ÖNERİ]** yeni zemin

**Defender: “Bastion”.** Bulwark Aura’lı tank, **şerit sahibi** olur: bir şeridi kendine kilitler, kalkan fırlatır, Grit biriktirir.
- **Living Wall**: 2 tur, Defender’ın **şeridine** atılan tüm tek hedefli düşman saldırıları Defender’a gelir (Taunt’ın şerit versiyonu). MEVCUT taunt mantığı + şerit
- **Shield Toss**: kalkan şeridin en önündeki düşmana çarpar, **plus** şeklinde seker (%30), geri dönerken geçtiği şeritteki dosta Fortify. MEVCUT plus
- **Hold the Line**: 2 tur, Defender’ın **sırasındaki** dostlar Stun’lanamaz, itilip çekilemez. **[ÖNERİ]** (zorla hareketle birlikte anlam kazanır)

**Gambler: “High Roller”.** Şansı sadece kendine değil **takıma ve düşmana dağıtan** kumarbaz; Double or Nothing korunur.
- **Wheel of Fate**: çark 6 dilim: düşman sırasına hasar / dost sırasına şifa / herkese Haste / herkese Slow / tüm Omen’ler +1 / Gambler’a Lucky Escape yenilenir. Her dilim önizlemede görünür. **[ÖNERİ]** (Card Trick’in büyük kardeşi)
- **Marked Card**: hedefe işaretli kart; hedef ölünce kart açılır: MP, altın (+%10 savaş ödülü) ya da tüm dostlara kalkan. **[ÖNERİ]** ödül bağlantısı
- **Loaded Fate**: bir dosta Gambler’ın **Lucky Escape’ini devreder** (bu savaş için). MEVCUT Lucky Escape + **[ÖNERİ]** devir

**Mage: “Elementalist”.** Elementleri **birleştiren** büyücü: zeminler ve durumlar tepkimeye girer; zamanla da oynar.
- **Steam Burst**: yalnızca zemin (Burning, Flooded Planks) ya da Slow’lu hedeflerde patlar: Burning + su = Blinded bulutu, Slow + ateş = Staggered. **[ÖNERİ]** element tepkimesi
- **Time Warp**: bir dostun **sıradaki turunu öne çeker** (tur göstergesinde hemen Mage’in arkasına). **[ÖNERİ]** tur sırası çekme
- **Mirror Image**: kendi tahtana 1 tur yaşayan **ayna kopya** çağrısı; düşman YZ onu Mage sanabilir (hedef ağırlığı aynı), vurulunca kırılır ve vuranı 1 tur Blinded. MEVCUT çağrı

**Paladin: “Oathkeeper”.** Şifacı aziz; **yemin** ile dostunun yükünü sırtlanır, kutsal zemini silah yapar.
- **Oathbond**: bir dostla yemin (3 tur); dostun aldığı hasarın %30’u Paladin’e geçer, Paladin bu hasarın yarısı kadar Zeal kazanır. MEVCUT Dark Bond mantığı + **[ÖNERİ]** Zeal
- **Martyr’s Vow**: savaşta bir kez, bir dosta gelen **ölümcül darbeyi Paladin alır** (Paladin’in kendi canından; Paladin ölebilir). **[ÖNERİ]**
- **Dawn Lantern**: kendi tahtana fener çağrısı; fenerin **plus** alanındaki dostlar her tur Divine Light’tan ek şifa alır, ölen dostun cesedi fener alanındaysa Resurrection 1 MP daha ucuz. MEVCUT çağrı

**Undead: “Gravelord”.** Ceset ekonomisinin efendisi; cesetten duvar, patlama, yeni beden yapar.
- **Corpse Explosion**: bir cesedi (dost ya da düşman) patlatır: cesedin bulunduğu hücreye denk düşman tahtasında **plus**, INT %55 + Poison zemini. MEVCUT ceset tüketme + plus
- **Bone Wall**: kendi tahtandaki bir cesetten 2 tur **kemik duvarı** (çağrı, saldırmaz, yüksek zırh): arkasındaki dost melee’ye kapalı. MEVCUT çağrı + `requiresOpenBehind` mantığı tersten
- **Soul Swap**: Undead ile bir düşmanın **can yüzdesi yer değiştirir** (boss ve elite’te %50 yaklaşma). **[ÖNERİ]** (çok güçlü; denge ister)

---

## 6. Yeni mekanikler özeti (onay gerekir)

1. Ustalık barı ve bar statı (+1 ana stat, +%1 can / puan).
2. Dönüştürücü kuralı (skill başına 1 takılı) ve yükleme seçimi.
3. Ağır skill kuralı (yüklemede en çok 1 ★).
4. **Zorla hareket** (çek / it / yer değiştir): Iron Chain, Shoulder Throw, Strangler; karşıtları Pinned, Hold the Line.
5. **Tur sırası oynama**: Dread Roar (geciktir), Time Warp (öne çek).
6. **Ceset inkârı** (Headsman’s Verdict) ve yeni ceset kullanımları (Return to the Soil, Carrion Flower, Corpse Explosion, Bone Wall, The Green Return).
7. **Yük sayaçları**: Scar (Warrior), Zeal (Paladin).
8. **Yeni zeminler**: Brambles, Caltrops.
9. **Yeni durumlar / kurallar**: Pinned, mevsim döngüsü, Wild Shape formu, Omen tavanı değişimi (Witching Hour), Sympathy Pin / Shared Fate bağı.
10. **Şans çalma / devretme**: Borrowed Luck (LUCK + Lucky Escape çalma), Loaded Fate (devir), Unlucky Number (ıska → Omen).
11. **Ertelenmiş ölüm** (Deathless Fury), **çağrı ile diriliş** (The Green Return), **ölümcül darbeyi devralma** (Martyr’s Vow).
12. Ember Constellations katmanı (isteğe bağlı).
13. “+1 rank” item affix’i.

---

## Ömer’e sorular

1. **Hangi ağaç?** Bu Grim Dawn yapısı mı, Cyberpunk yapısı (Bölüm D) mı, yoksa ikisinin karışımı mı (ör. Grim Dawn barı + Cyberpunk bağ şeritleri)?
2. **Ustalık barı statı**: bara konan her puan +1 ana stat ve +%1 can versin mi? (15 puanda +15 ana stat, +%15 can.)
3. **Bar elle mi dolsun** (A, önerilen) yoksa level’la **kendiliğinden** mi (B)?
4. **Kademe eşikleri** 0 / 3 / 6 / 10 / 15 ve bar üst sınırı 15 uygun mu?
5. **Dönüştürücü kuralı**: bir skill’de aynı anda yalnızca 1 dönüştürücü takılı olsun mu? İkinci alınan dönüştürücü Gear ekranında değiştirilebilir mi?
6. **4 slot** kuralı aynen kalıyor; ama **yüklemede en çok 1 ağır (★) skill** kuralı eklensin mi?
7. **Zorla hareket** (düşmanı çekme / itme / yer değiştirme) oyuna girsin mi? Girerse **Pinned** ve **Hold the Line** gibi karşı hamleler de gelsin mi?
8. **Tur sırası oynama** (Dread Roar düşmanı geciktirir, Time Warp dostu öne çeker) olsun mu?
9. **Ceset inkârı**: Headsman’s Verdict ile öldürülen düşman ceset bırakmasın mı (Raise Dead / Resurrection alamaz)?
10. **Yeni ceset kullanımları** (Druid gömme, Undead patlatma / duvar) olsun mu? Ceset artık Undead ile Paladin dışında da paylaşılan bir kaynak olur.
11. **Yük sayaçları**: Warrior’a **Scar**, Paladin’e **Zeal** gelsin mi?
12. **Yeni zeminler**: **Brambles** (Druid) ve **Caltrops** (Cutthroat) eklensin mi?
13. **Druid’in mevsim döngüsü** (Circle of Seasons) ve **ayı formu** (Wild Shape: skill geçici değişir) olsun mu?
14. **Şans çalma**: Hexer düşmanın LUCK’ını ve **Lucky Escape’ini** çalabilsin mi? Gambler Lucky Escape’ini dosta devredebilsin mi?
15. **Unlucky Number**: düşman ıskalayınca Omen alsın mı?
16. **Witching Hour**: Omen tavanı geçici olarak 3’ten 5’e çıkabilsin mi?
17. **Sympathy Pin**: iki düşman arasında hasar (ya da Omen) paylaşımı olsun mu?
18. **Ölümle oynayan kapstone’lar**: Deathless Fury (ertelenmiş ölüm), The Green Return (Sapling ile diriliş), Martyr’s Vow (dostun ölümcül darbesini almak) uygun mu? Lucky Escape ile aynı savaşta üst üste binebilir mi?
19. **Anti-Mage karşı büyüsü** (Spellbreak: düşman skill’ini iptal) ve **MP vergisi** (Null Lantern) olsun mu?
20. **Mage element tepkimeleri** (Steam Burst: zemin + durum birleşimi) olsun mu?
21. **Gambler Marked Card**: savaş ödülüne (altın) bağlanan skill olsun mu?
22. **Undead Soul Swap** (can yüzdesi değiş tokuşu) çok mu uç? Kalsın mı?
23. **Ember Constellations** (Devotion benzeri, sunaklardan puan) ileride eklensin mi, yoksa hiç mi?
24. **“+1 rank” item affix’i** (rank 3’ün üstüne 4’e kadar) olsun mu?
25. **Sıfırlama**: düğümler tek tek 5 altına iade edilsin; **bar ise yalnızca tam sıfırlamayla** (15 + 4 x level altın) mı sıfırlansın?
