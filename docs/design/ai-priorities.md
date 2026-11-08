# Yapay zekanın tercih sıralaması (balans öncesi çalışma)
> **Ne için / Güncel mi (2026-11-08):** YZ karar kuralları (K1-K14) ve uygulama durumu. CANLI sahip: bölüm 0 (Ömer kararları), 6-8 (kurallar, uygulama). Bölüm 1-5 ve 9 (2026-10-07 ölçümü, class bazlı eski davranış) `docs/archive/design/ai-priorities-history.md` içine taşındı (TARİHÇE): sayılar bugünkü `src/engine/ai.ts`/`ai-value.ts` ile eşleşmez, geçerli veri `data/ai.json`.

Durum: **v4 (2026-10-08): Faz 1-5 UYGULANDI (engine-dev, madde 257 + 258).** Madde 258: Faz 2 artığı (mana yakma "engellenen hamle", Dark Bond düzeltmesi), Faz 3 artığı (Rest/Skip/Move sabit kapısız terazide), Faz 5 zorluk seviyeleri, K14 (savaş belliyse diriltme 0), eski skill ipucu koşulları silindi. Ömer'in kararları (K11-K14) 0. bölümün sonunda; uygulama durumu 7. bölümde. v3: Faz 1-4 (madde 257). v2 (2026-10-07): kararlar işlendi, ölçüm balance-tester. Kalan açık sorular 8. bölümde ve `open-questions.md` madde 252 / 254 / 257.

## 0. Ömer kararları (2026-10-07) ve sonucu

| # | Konu | Ömer kararı | Belgedeki karşılığı |
|---|---|---|---|
| K1 | Karar biçimi | YZ **en değerli hamleyi** seçer (kural sırası yok, tek değer terazisi) | 6.1: öldürme, kurtarma, diriltme dahil her şey aynı birimde (can-eşdeğer) puanlanır; sabit öncelik yok |
| K2 | Öldürme mi kurtarma mı | Düşmanı öldürmek dostun ölmesini ENGELLEYECEKSE öldür; yoksa dostu kurtar | 6.2: öldürmenin değerine "kurtardığı dostun değeri" eklenir; yalnızca o düşman dostun ölümüne yetecek tehdidin parçasıysa |
| K3 | Paladin sırası | Metriğe göre değişir; koşullar ileride değişebilir; soruyu daha iyi sor | Sabit sıra yok; diriltme/şifa/hasar aynı terazide (6.1). Metrik ayarları için yeni soru: 8. bölüm Soru P |
| K4 | Mage | Ana odak HASAR; destek de yapsın, Barrier yalnızca terazide gerçekten değerliyse | Mage ağırlıkları: hasar 1,0, destek terazide normal; `shield` önceliği kalkar |
| K5 | Ultimate | Genelde KULLANILSIN; ertelenebilir: normal skill öldürmeye yetiyorsa ya da o an destek gerekiyorsa | 6.4: ultimate'a küçük "erteleme bedeli" yok; yalnızca aynı işi bedava/cooldown'suz skill görüyorsa o seçilir |
| K6 | Defender düşük canda Taunt/Guard | Takıma bağlı; gerekirse kendini feda eder (ör. 2 kişi kalmış, Mage'i korumak) | 6.5: korunan dostun değeri vs Defender'ın hayatta kalma değeri; sabit can kapısı YOK |
| K7 | Skeleton | Ön sırada yer yoksa ÇAĞRILMASIN; ön sıradaki dost ölünce cesedinin ÜSTÜNE çağrılabilsin | YZ kuralı (ai.ts) + motor/tasarım değişikliği (engine-dev, ayrı iş); diriltmeyle çakışma: Soru S |
| K8 | Kontrol etkileri | Stun, Slow, Wound, Haste, Blinded vb. değer hesabına KESİNLİKLE girer | 6.3 |
| K9 | Zorluk | Easy / Medium / Hard | 6.7 |
| K10 | Dark Bond / çağrıya bağ | Çağrının katkısı daha fazlaysa çağrıya da kurulabilir (terazi) | 6.6: bağ değeri bağlanan birimin beklenen kalan katkısına göre; çağrı yasağı YOK |

### Ömer kararları (2026-10-08) ve sonucu

| # | Konu | Ömer kararı | Karşılığı (uygulandı, madde 257) |
|---|---|---|---|
| K11 | Paladin / destek ölçütleri (Soru P'nin yerine) | Değerlendirme ufku **3 TUR**; diriltilecek kişinin (ör.) Archer'ın vuracağı kişiye göre katacağı değer, dirilenin tur barının 0 doğması ve yaşayan kişinin tur barının ne kadar dolu olduğu değerlendirilsin | `ai.json > value.horizon = 3` (kullanıcının kendi turu). "Kalan katkı" = birimin tur başı değeri x ufukta oynayacağı tur sayısı (hız + tur sayacı: dolu sayaçlı dost yakında oynar, dirilen 0 sayaçla başlar). Düşmanın sıradaki hamlesi tahmin edilir (her düşman kendi odak kuralıyla kime vuracak); dost bir sonraki turumuzdan önce ölecekse kurtaran hamleye kurtarma değeri. Diriltme, şifa, kalkan, öldürme aynı terazide. Ek alt soru (savaş bitmek üzereyken diriltme) açık: 8. bölüm |
| K12 | Resurrection işlevi (Soru S'nin yerine) | Diriltme skill'i önce diriltilecek dostu seçsin, sonra seçtiği BOŞ ALANA diriltsin; cesedin üstünde dost olup olmamasından bağımsız | İki adımlı hedefleme (motor + arayüz + YZ). Skeleton cesedin üstündeyken de diriltilebilir: dost başka boş hücreye gelir. Soru S kapandı |
| K13 | Zorluk | Easy / Medium / Hard; sefer başında seçilir, sonra değişmez (kayıtta) | UYGULANDI (madde 258): `chooseAction(..., { difficulty })`, `ai.json > difficulty`; sefer BattleScene'e `difficulty` iletir, düşman tarafı onunla oynar; hızlı savaş Medium. Ayrıntı 6.7 |
| K14 | Diriltme savaş bitmek üzereyken (Soru P alt sorusu) | "Diriltme savaşın galibini değiştirmeyecekse değeri 0 olsun" (2026-10-08) | UYGULANDI (madde 258): `ValueContext.outcome` sezgiseli (iki tarafın ufuk içi bitirme süresi); kazanılmış ya da dirilenle bile kaybedilen savaşta `revive` terimi 0 |

Amaç (Ömer): "Tüm karakterlerin skillerini ve olası takım kompozisyonlarını düşünerek, balans öncesinde yapay zekanın tercih sıralaması." Önce yapay zeka (YZ) doğru oynasın, sonra genel balans: yanlış oynayan bir class'ın kazanma oranı balans sorunu gibi görünür ama AI sorunudur.

## 1-5 ve 9. Eski ölçüm bölümleri (TARİHÇE, taşındı 2026-11-08)

Onlar `docs/archive/design/ai-priorities-history.md` içinde (2026-10-07 ölçümü, class bazlı eski davranış, 5v5 ölçüm sayıları). Güncel kurallar: bu belgede bölüm 0, 6-8; veri `data/ai.json`.

## 6. Ortak kurallar (Ömer kararlarına göre)

### 6.1 Tek değer terazisi (K1)

Her aday aynı birimde puanlanır: **can-eşdeğer net değer** = (bu hamleyle kazandığımız) - (kaybettiğimiz). Sabit öncelik sırası (kill > heal > ... > damage) KALKAR; `ai.json > priorities` listesi silinmez ama artık yalnızca açıklama/eşitlik bozucu olur. Önerim: "güçlü ama terazi içi öncelik" yerine **saf terazi + doğru değer terimleri**; öldürme, kurtarma ve diriltme ayrıcalığını sabit sıradan değil, değerlerinin büyüklüğünden alır (aşağıda). Böylece "neden bunu seçti" sorusunun cevabı her zaman tek sayıdır ve Copy match data'da okunur.

| Değer terimi | Hesap (sade) | Bugün | Ayar |
|---|---|---|---|
| Hasar | beklenen hasar (isabet x ortalama, kalan canla sınırlı; alan skill'inde vurulanların toplamı) | var | — |
| **Öldürme** | öldürme ihtimali x hedefin **kalan katkısı** (ufuk H tur boyunca beklenen hasarı/şifası/kontrolü) | yok (sabit "önce öldür") | K |
| **Kurtarma** | dost "tehlikede" (bir sonraki turumuzdan önce ölecek beklenen hasar alıyor) ise: hamlenin ölüm ihtimalini düşürdüğü kadar x dostun kalan katkısı (+ canı) | yok | K |
| Şifa / kalkan | gerçekten işe yarayacak miktar (fazla şifa sayılmaz; kalkan: emilmesi beklenen hasar) | var (kalkan x0,5 sabit) | K |
| **Diriltme** | dirilen birimin kalan katkısı x hayatta kalma ihtimali + dönen can | yok (sabit "önce dirilt") | K + Soru P |
| **Kontrol** (K8) | Stun = hedefin kaçırdığı hamlenin değeri x ihtimal; Slow/Haste = kaybedilen/kazanılan tur payı x birimin tur değeri; Wound = hedefin alacağı şifadaki beklenen azalma; Blinded/Shrouded/Jinxed = önlenen hasar (bugün var) | kısmen | K |
| Taunt / Guard (K6) | 6.5 | yok | K |
| Çağrı | çağrının KENDİ değeri (2026-10-21, open-questions-archive 377): ömrü boyunca (ufukla kısılmaz) beklenen saldırısı (en iyi skill'inin tur değeri x oynayacağı tur; üstüne çekeceği hasarla erken ölürse daha az; vurabileceği yuva yoksa 0, K7) + gövdesi: ömrü boyunca üstüne çekeceği düşman hasarı (canı + yenilenmesiyle sınırlı; ön sıranın önüne konup bir düşmanın erişimini dostlardan kesiyorsa o düşmanın tüm vuruşları, değilse erişimdeki hedeflerle eşit pay) x protectShare + çağırma yan etkisi (Bone Ward). Yuva: boş yuvalardan değeri en yüksek olan (eşitlikte varsayılan yuva) | kısmen | K |
| Mana yakma | düşmanın o mana ile yapamayacağı hamlelerin değeri | sabit x0,6 | K |
| Bedel | MP/can/cooldown'un gelecekteki fırsat bedeli | MP x ağırlık | J (ağırlıklar) |
| **Sınıf ağırlıkları** (kimlik) | `ai.json` profilinde terim çarpanları: ör. Mage hasar 1,0 / destek 1,0; Paladin şifa/diriltme ağırlığı Soru P ile; Archer "en az can" eğilimi | yok | J |

"Kalan katkı" ufku `ai.json`'da tek parametre (öneri: 2 kendi turu); zorluk seviyesi de bunu kullanır (6.7).

### 6.2 Öldürme mi kurtarma mı (K2)

Her dost için "tehlike" hesaplanır: bir sonraki turumuza kadar sırası gelecek düşmanların ona vurabileceği beklenen hasar >= dostun canı + kalkanı. Bir düşmanı öldürmenin değerine, o düşman çıkınca tehlikesi ortadan kalkan dostların kurtarma değeri eklenir. Sonuç Ömer'in kuralıyla aynı: öldürülen düşman dostu öldürecek olan (ya da tehdidin ölümcül payı) ise öldürmek kazanır; değilse doğrudan kurtaran hamle (şifa, kalkan, Guard, Taunt) kazanır. Ayar: K (tehlike modeli; bugünkü `incomingDamage` düşman başına ayrıştırılır ve sıra çubuğu tahmini kullanılır).

### 6.3 Kontrol etkileri (K8)

6.1 tablosundaki kontrol satırı her durum etkisine uygulanır (Stun, Slow, Haste, Wound, Blinded, Shrouded, Jinxed, Fortify, Omen/Wither zaten var). Zaten taşıdığı durumu tekrar uygulamanın değeri yalnızca uzayan kısımdır; Stun'un Taunt'ı bozması (düşman Defender'ı) ek değerdir. Veri: `statuses.json` alanları yeterli; yeni alan gerekmez (Slow/Haste hız payı, Stun skipTurn). Ayar: K.

### 6.4 Ultimate kullanımı (K5)

Ultimate'a "saklama" puanı yok: değeri yüksek olduğu için genelde kendiliğinden seçilir. İki erteleme durumu teraziden doğal çıkar: (a) aynı öldürmeyi bedava/cooldown'suz bir skill de yapıyorsa, ultimate'ın küçük cooldown fırsat bedeli onu geride bırakır (bedel = ultimate'ın tipik değeri x cooldown payı x küçük katsayı, `ai.json`); (b) o an destek (kurtarma) gerekiyorsa kurtarma değeri büyüktür. `reserveMp` (MP ayırma) kalır. Ayar: K + J (katsayı).

### 6.5 Taunt / Guard ve fedakârlık (K6)

Guard değeri = korunan dosta Guard süresince gelecek beklenen hasarın aktarılan payı (x dost tehlikedeyse kurtarma değeri) - Defender'ın bu aktarılan hasarla ölme ihtimali x Defender'ın kalan katkısı. Taunt aynı mantık, dostların tümü için (Defender'a çekilen tek hedefli saldırılar). Sabit can kapısı yok; "2 kişi kaldı, Mage'i koru" senaryosunda fedakârlık değeri pozitif çıkar. Ayar: K.

### 6.6 Dark Bond ve çağrılar (K10)

Bağ değeri = bağ süresince Undead'in gerçekten çalabileceği can (beklenen vuruşlar x %35, Undead'in eksik canıyla sınırlı) x bağlanan birimin bu sürede o şifayı kullanabilmesi (eksik canı, beklenen alacağı hasar, kalan ömrü: çağrıda lifespan). Çağrıya yasak yok; çağrının katkısı büyükse ona kurulur. Aynı kural çağrıya Guard/şifa/Barrier için de geçerli. Ayar: K + J (`bondSelfFloor`/`bondHpFloor` küçültülür ya da kaldırılır).

### 6.7 Zorluk: Easy / Medium / Hard (K9)

Kural: YZ belirleyici kalır (CLAUDE.md). "Hata" rastgelelik değil, savaş seed'i + tur + birimden türeyen sabit bir sayıdır (aynı savaş = aynı hata); motorun RNG'sine dokunulmaz.

| Davranış | Easy | Medium | Hard |
|---|---|---|---|
| Değer terazisi | var, ufuk 1 tur | var, ufuk 2 tur | var, ufuk 2-3 tur |
| Seçim | en iyi 3 adaydan biri, değere yakın olanlar arasında (2.-3. en iyiyi ~%35 seçer) | en iyisi; değerleri %10 içindeki adaylar arasında sabit "kişilik" tercihi | her zaman en iyisi |
| Kontrol etkileri, sinerji (Opportunist, Omen tamamlama) | sayılmaz | sayılır | sayılır |
| Öldürme / kurtarma (6.2) | yalnızca kesin öldürme; kurtarma yok | var | var + takım planı |
| Odak ateşi | yok (her birim kendi en iyisi) | can oranı en düşük (bugünkü) | takım düzeyinde: aynı turda ölecek hedefe fazladan vurmaz (overkill yok), DoT/Doom ile ölecek hedefi atlar |
| Ultimate | gelir gelmez | terazi (6.4) | terazi + bir sonraki turdaki fırsatı bekleme (ör. 2+ Omen) |
| Rest/Skip/Move | yalnızca MP bitince Rest | bugünkü kurallar | bugünkü + tehlike modeli |
| Kullanım | sefer başı (Bölge I), tutorial | hızlı savaş varsayılanı, sefer orta | sefer sonu/boss, hızlı savaşta seçilebilir |

Ayar: J (`ai.json > difficulty.easy|medium|hard`: ufuk, seçim payı, aç/kapa anahtarları) + K (seçim katmanı, takım odağı). Sim ve denge ölçümü **Medium** ile yapılır.

**Uygulanan (madde 258):**

| Kural | Easy | Medium | Hard |
|---|---|---|---|
| Ufuk | 1 tur | 3 tur (value.horizon) | 3 tur |
| Seçim | puanı en iyinin en az %50'si olan en iyi 3 aday arasından %65 / %23 / %12 (belirleyici: savaş seed'i + oynanan tur + birim; motor RNG'si kullanılmaz) | en iyisi | en iyisi |
| Kurtarma (save) / kontrol (Stun, Slow, Wound...) | 0 (`value.saveWeight 0`, `controlWeight 0`) | var | var |
| Öldürme terimi | yalnızca öldürme ihtimali >= %90 (`killMinChance`) | ihtimal x katkı | ihtimal x katkı |
| Odak ateşi | yok | can oranı (düşman tahmini) | + dostlarımızın da yöneleceği hedefe baskı x (1 + 0,3 x dost sayısı) (`focusFire`) |
| Fazla vurmama | yok | yok | zaten ölecek hedef (tur başı Wither/zemin tiki ya da ondan önce oynayacak dostlarımızın tahmini vuruşları canını bitiriyor): hasar/öldürme/baskı değerinin %20'si (`overkillShare`, terim `overkill`) |
| Uygun anı bekleme | yok | yok | Doom Mark (detonate) öldürmüyorsa ve hedefte 2+ Omen yoksa değerinin %50'si (`patience`) |
| Rest/Skip/Move | yalnızca yapacak hamle yokken Rest | terazi | terazi |

Ölçüm (düşman tarafı seviyeyle, oyuncu Medium; düşman kazanma oranı): Easy %29 (600 savaş), Medium %46-50, Hard Medium'dan yalnızca +1-2 puan (800 savaşta %52,0 vs %49,8; 600 savaşta fark gürültü içinde). Hard'ın davranış farkı gerçek ama küçük: büyük zorluk farkı için seferin stat/sayı ayarları (UnitSetup modifiers) gerekir (balance-tester; PENDING_BALANCE).

### 6.8 Diğer ortak kurallar

| # | Kural | Ayar |
|---|---|---|
| O1 | Alan skill'i: değer vurulan hedeflerin toplamıdır (bugünkü "yaşayan düşman >= 3" kapısı kalkar) | K |
| O2 | Öldürme ihtimali gerçek ihtimal (isabet x hasar zarı); `aiKillMin` 0,5 sabit eşiği gereksizleşir | K (+ J geçici: 0,7) |
| O3 | "Kırılgan" = maks can/zırh ve `frontPriority`; tam canla geri çekilme yok | K + J (`move.retreatHpRatio`) |
| O4 | Çağrı yalnızca vurabileceği yuva varsa (K7) | K; motor: 6.9 |
| O5 | Her yeni değer terimi `explainChoice`'ta ayrı sütun (Copy match data'da "kill value", "save value", "control value"...) | K |

### 6.9 Skeleton yerleşimi (K7) - motor/tasarım işi (engine-dev, ayrı)

- YZ (ai.ts): Raise Dead'in Skeleton'ı vurabileceği (ön sıra / erişimdeki) bir yuva yoksa Raise Dead değeri 0: çağrılmaz.
- Motor/tasarım: ön sıradaki dost ölünce o yuva bugün "ölü dosta ayrılmış" (Move ve çağrı giremez). Ömer: Skeleton bu cesedin ÜSTÜNE çağrılabilsin. Bu, `summonSlots` kuralını ve Resurrection ile ilişkiyi değiştirir: Soru S (8. bölüm). Arayüz: Raise Dead 2. adımında (yuva) bu hücre de seçilebilir; YZ ön sıradakini tercih eder.

### 6.10 Dolu mana eğilimi (Ömer 2026-11-01, Koordinatör formu; open-questions-archive madde 499)

- Yalnız düşman YZ'si, yeni oyun kuralı yok: skill ödendikten sonra MP oranı `manaSurplusFrom` (0,3) üstündeyse mana doldukça skorda MP bedeli silinir, brüt değerin en çok `manaSurplusShare` (0,6) payı eklenir (`data/ai.json`, `ai.ts > scoreOption`).

## 7. Uygulama planı (engine-dev / balance)

Uygulamaya HAZIR: K1, K2, K4-K10 net. Soru P (Paladin ölçütleri) yalnızca ağırlık/ufuk değerlerini etkiler: varsayılanla (ufuk 2 tur, diriltme ağırlığı 1,0) başlanabilir. Soru S yalnızca motor işini (Faz 4) etkiler.

| Faz | İş | Dosya | Büyüklük | Bağımlılık |
|---|---|---|---|---|
| 1 | Değer çekirdeği: tek terazi (`pickClassOption` yeniden), "kalan katkı" tahmini (birimin en iyi hamle değeri x ufuk), öldürme ihtimali, tehlike modeli + kurtarma değeri (K2), alan skill'i vurulan toplamı, ultimate cooldown bedeli; `explainChoice`/`pickerView`/`noPickReason` ve match-log yeni terimlerle | ai.ts, ai.json (yeni alanlar: ufuk, ağırlıklar), match-log.md | **Büyük** (ai.ts'in seçim katmanı baştan; ai testlerinin çoğu yeniden yazılır) | — |
| 2 | Değer terimleri: kontrol etkileri (K8), Taunt/Guard/fedakârlık (K6), şifa/kalkan/Barrier gerçek değer (K4), diriltme (Soru P varsayılanı), Dark Bond yeniden (K10), çağrı değeri + vurabilir yuva (K7), mana yakma, Opportunist hedefleri | ai.ts, ai.json | **Orta-büyük** | Faz 1 |
| 3 | Global eylemler terazide: Rest/Skip/Move aynı birimle; "kırılgan" tanımı | ai.ts, ai.json | Küçük-orta | Faz 1 |
| 4 | Skeleton'ın ölü dostun cesedi üstüne çağrılması (motor + Raise Dead arayüz akışı + wiki Mechanics) | battle.ts, raise-dead-flow.ts, combat.md | Orta | Soru S cevabı |
| 5 | Zorluk Easy/Medium/Hard (seçim katmanı, belirleyici "hata", ayarlar menüsü + debug seçici, sefer düğümlerinde zorluk) | ai.ts, ai.json, ui, campaign verisi | Orta | Faz 1-2 |
| 6 | Ölçüm ve balans: aynı seed'lerle önce/sonra sim; class oranları (Mage, Hexer); `tests/balance.test.ts` | balance-tester | Orta | Faz 1-3 |

**Uygulama durumu (2026-10-08, madde 257):**
- Faz 1 YAPILDI: tek terazi (`src/engine/ai-value.ts` + `ai.ts > scoreOption`), öldürme ihtimali (isabet x hasar zarı, kritik dalı), tehlike modeli + kurtarma (K2), alan skill'i vurulan toplamı, ultimate cooldown bedeli (`cooldownCostShare`), explainChoice / match-log tek sayı + terim dökümü. Profil `priorities` yalnızca etiket; skill `ai` ipuçlarının requires/anyOf koşulları seçimi engellemiyor (yalnızca `reserveMp` sürüyor). Geçici veri yamaları (Whirlwind minTargets, Taunt/Guard can kapısı) hiç uygulanmamıştı; gerek kalmadı.
- Faz 2 YAPILDI (ilk sürüm): kontrol (Stun, Slow, Haste, Wound, Fortify; Blinded/Shrouded/Jinxed eskisi gibi mitigation), Taunt/Guard (yönlenen hasar + kurtarma - Defender riski; fedakârlık mümkün), kalkan = emilmesi beklenen, Mana Barrier temizleme = kaybedilecek tur değeri, diriltme (ufuk 3, tur sayacı 0, hücre seçimi), Dark Bond (tek hedef saldırının lifesteal'i, `bondSelfFloor 0.05`, `bondHpFloor 0.1`), çağrı (ufuktaki katkı x yuvada vurabilirlik + saldırı çekme + Verdant Blessing). Mana yakma değeri hâlâ eski basit hesap (yakılan MP x 0,6): "engellenen hamle" modeli sonraki iş.
- Faz 3 KISMEN: Rest/Skip/Move teraziyle aynı puanı kullanıyor; "kırılgan" tanımı can eksikken (tam canla geri çekilme yok); geri çekilme kendini kurtarıyorsa kurtarma değeri ekleniyor. Global kurallar (eşikler) ai.json'da aynen.
- Faz 4 YAPILDI: Skeleton (ve tüm çağrılar) ölü dostun ceset hücresine çağrılabilir; Resurrection iki adımlı (K12). Madde 258: Move da ceset hücresine girebilir.
- **Madde 258 (2026-10-08):**
  - Faz 2 artığı: mana yakma = "engellenen hamle" (`ValueContext.manaDenial`: hedefin ufuk x `manaHorizonMult` (2) turunda MP yüzünden yapamayacağı MP'li hamlelerin bedelsiz hamlesine göre fazladan değeri; tam sayılı kullanım planı, tur + MP + cooldown kısıtı). Drain Field, Mana Steal ve Spell Ward kancası (korunan dosta saldıracak büyücüler) bunu kullanır. Sonuç: MP'si bol ya da ucuz skill'le yetinebilen hedefte (Mage: Fire Bolt 5 MP, yenilenme 6/tur) yakma neredeyse değersiz; Drain Field kullanımı %2 (balans sorusu: PENDING_BALANCE). Dark Bond düzeltmesi: bağ süresince ikisinin de yiyeceği beklenen hasar çalınabilir/iyileşebilir pay açar (eskiden yalnızca şu anki eksik can; tam canlı Undead'in bağı ~0). Ölçüm (150 savaş, 519 aday): tahmin ort 10,7, gerçekleşebilir (sonraki 3 Undead turunda çaldığı can, dostun eksik canıyla sınırlı) ort 14,7; Dark Bond puanı ort 19 (bağ + tempo), seçilen hamle ort 49: düşük kullanım (%1) GERÇEKÇİ (bağ ~15 can, Wail/Bone Throw daha değerli). Jinx: puan ort 30, Evil Eye 40 (aynı Omen, 2 kat hasar, bedelsiz): %2 kullanım gerçekçi; Jinxed değeri doğru hesaplanıyor (hata bulunmadı).
  - Faz 3 artığı: Rest/Skip/Move'un sabit kapısı (öldürücü/işlevsel class hamlesinde hiç denenmeme) kalktı; kazançları her zaman class hamlesinin terazi puanıyla kıyaslanır.
  - Faz 5: zorluk seviyeleri (6.7 'Uygulanan' tablosu).
  - K14: savaş belliyse diriltme 0 (`ValueContext.outcome`: tUs = düşmanın can+kalkanı / bizim tur başı beklenen hasarımız, tThem tersi; 'win' = tUs <= ufuk ve tUs <= 0,5 x tThem (dirilen HESABA KATILMADAN); 'loss' = aynısı ters yönde, dirilenin ufuk katkısı ve canı bize eklenmişken de; `value.decidedMargin` 0,5).
  - Skill `ai` ipuçlarından eski requires/anyOf koşulları ve incomingShare/opportunityShare veriden SİLİNDİ; kalan: `reserveMp` (Meteor, Aimed Shot, Void Strike, Fist Crush, All In, Doom Mark) ve `reserveMinMpRatio` (All In 0,6). MP ayırma artık değerle: ayrılan skill'in puanı x `reserveValueShare` (0,85) bu saldırıdan büyükse ertelenir.
  - Lucky Escape: ölüm ihtimali (1 - şans); Move ölü dostun ceset hücresine girebilir (madde 257 sorusu 1 kapandı).
- **Block ve Block Break (Ömer 2026-10-31, #17):** saldırı değeri ve hedef seçimi önizlemenin isabet şansından okur: isabet x (1 - (hedefin Block'u - saldıranın Block Break'i)). Kalkanlı mobların Block'u da buradan görünür. Isabet değiştiren debuff değerleri (`hitGain`, `hitLossRaw`, `hitCritLoss`) aynı Block payını kullanır. Test `tests/block-break.test.ts`.
- **Skip Turn kuralı düzeltmesi (Ömer 2026-10-18, seçim sayfası):** Skip yalnızca beklemek gerçekten işe yarıyorsa seçilir: (a) yapacak değerli hamle yoksa, ya da (b) 1 tur sonra hazır olacak bir skill var, şimdiki hamle MP/Rage bedeliyle onu o turda karşılanamaz kılıyor (pas geçince yetiyor) VE şimdiki hamlenin değeri o skill'in değerinin `skip.worthlessShare` payından az. Şimdiki hamle skill'i engellemiyorsa (ör. 0 MP Holy Strike, Radiance'ın beklemesi aynı tur dolar) Skip düşünülmez: skill iki yolda da hazırdır, pas bir tur kaybettirir. Eski kural (b)'deki engel şartını aramıyordu; Paladin ~%11 Skip yapıyordu (çoğu Radiance beklemesi). Rest kuralı değişmedi. Maç kaydında skip satırı engel yoksa `current move does not block it` yazar. Etkisi sim ile ölçülecek.
- Faz 6 (balans ölçümü/ayarı) YAPILMADI (balance-tester).

Toplam: engine-dev için 3-4 ayrı görev (Faz 1, Faz 2+3, Faz 4, Faz 5); en riskli ve en büyük Faz 1. Önerim: Faz 1 ve 2'yi arka arkaya, her birinden sonra sim ile ölç (davranış büyük ölçüde değişeceği için sınıf oranları oynayacak; balans Faz 6'da).

Bu belgenin önceki sürümündeki "yalnızca veri" önerileri (Whirlwind `minTargets`, Taunt/Guard can kapısı, `shieldBelowRatio 0.5`) terazi gelince GEREKSİZ; Faz 1 gecikirse geçici yama olarak kullanılabilir.

## 8. Ömer'e kalan sorular

Ömer'in ilk 10 soruya cevapları 0. bölümde. Kalanlar:

### Soru P (yeniden kurgulandı): Paladin ve diğer şifacılar hangi ÖLÇÜTLERLE karar versin?

Sabit sıra yok; YZ her seçeneğe bir değer verir, en büyüğünü seçer. Sizin karar vermeniz gereken, değerin hangi parçalarının ne kadar sayılacağı:

| Seçenek | Değeri neyden gelir |
|---|---|
| Resurrection | dirilen birimin bundan sonra yapacakları (ufuk: kaç tur sayılır?) x tekrar ölmeme ihtimali + %30 can |
| Radiance | gerçekten dolan can (fazla şifa sayılmaz) + düşmanlara hasar; ölmek üzere olan dostu kurtarıyorsa kurtarma değeri |
| Judgment / Holy Strike | hasar (öldürüyorsa öldürülen düşmanın bundan sonra yapacakları) |

Senaryolar (5v5, savaşın ortası; sayılar yaklaşık):
- **A.** Warrior öldü. İki dost %60 canda, kimse ölmek üzere değil, 4 düşman sağlıklı. Resurrection mı (Warrior %30 canla geri döner, her turu ~25 hasar), Radiance mı (~36 şifa + ~60 hasar), Judgment mı (~40 hasar)?
- **B.** İki dost kaldı: biri %15 canda ve sırada onu vuracak Archer var. Ölü bir Mage var. Radiance onu kurtarır; Resurrection Mage'i getirir ama %15'lik dost muhtemelen ölür.
- **C.** Son düşman %20 canda, Holy Strike muhtemelen öldürür. Bir dost ölü. (Savaş bitince ölü dostun durumu: sefer kuralına göre %20 canla kalkıyor.)
- **D.** Herkes tam canda, ölü bir Gambler var, 5 düşman sağlıklı: Resurrection mı Judgment mı?

Seçenekler:
- **(a) Kısa ufuk (2 tur):** dirilen/kurtarılan birimin yalnızca önümüzdeki 2 turu sayılır. Sonuç: A'da Radiance, B'de Radiance, C'de öldürme, D'de Resurrection ile Judgment başa baş (Gambler'ın 2 turu ~ Judgment).
- **(b) Kalan savaş ufku:** savaşın tahmini kalan uzunluğu kadar (savaş başında uzun, sona doğru kısa). Sonuç: A ve D'de Resurrection (başlarda), B'de Radiance, C'de öldürme.
- **(c) (a) + sizin ayarlayacağınız "diriltme ağırlığı"** (ör. 1,0 = nötr, 1,5 = Paladin diriltmeyi sever): Paladin kimliğini bir sayıyla ayarlarsınız; koşullar değişince yalnızca bu sayı değişir.
- Ek alt soru: savaş bitmek üzereyken (C) diriltmenin değeri sıfır mı sayılsın? **KAPANDI (K14, madde 258): evet, diriltme savaşın galibini değiştirmeyecekse 0.**

**Önerim: (b) + (c)**: ufuk savaşın kalan uzunluğuna göre (erken diriltme değerli, geç diriltme değersiz; C'de öldürme), üstüne ayarlanabilir ağırlık (başlangıç 1,0). Aynı ölçütler Druid (Rejuvenate), Mage (Mana Barrier) ve Anti-Mage (Spell Ward) için de kullanılır.

### Soru S (KAPANDI, K12): Skeleton ölü dostun cesedinin üstüne çağrılınca o dost diriltilebilir mi?

Ömer kararı: evet; Resurrection önce dostu, sonra BOŞ bir hücreyi seçer (aşağıdaki (c) seçeneğine yakın, hücreyi oyuncu seçer). Eski seçenekler kayıt için:

- **(a)** Hayır, Skeleton orada durduğu sürece (ömrü 4 tur) Resurrection o dosta atılamaz; Skeleton ölünce/ömrü bitince yeniden diriltilebilir.
- **(b)** Evet; diriltilen dost aynı yuvaya döner, Skeleton en yakın boş yuvaya itilir (yoksa yok olur).
- **(c)** Evet; diriltilen dost en yakın boş yuvaya gelir.

**Önerim: (a)** (kural basit, Undead "ölüyü kullanır" kimliğine uygun; YZ bunu terazide hesaba katar: dost tarafında canlı bir diriltici varsa o hücreyi kullanmanın bedeli olur).

### Soru Z (küçük): Zorluk seçimi nerede?

Hızlı savaşta oyuncu seçer (varsayılan Medium) ve seferde düğüm başına veride sabit mi (önerim: sefer başı Easy, Bölge II Medium, son bölge ve boss Hard), yoksa seferde de oyuncu genel bir zorluk seçip düğümler ona göre mi kayar?

## Boşuna çağrı ve tıkanma sinyali (2026-10-10, open-questions-archive madde 291)
- **`value.resummonShare` (0,4):** çağrının tarafında onu ufuk içinde yeniden çağırabilecek canlı bir çağırıcı varsa, o çağrıya giden hasar / öldürme / baskı ve ona verilen şifa / Dark Bond bu payla sayılır (`futile` terimi). Hedef seçimi çağırıcıya kayar.
- **Tıkanma sinyali (`value.stallTurns` 150, `stallRamp` 50, `stallFocus` 3):** savaşın toplam tur sayacından (`battle.turnsTaken`) türetilir, YZ saf kalır. Sinyal arttıkça çağrılar cooldown'dan bağımsız olarak kısmen değersizleşir, çağrı olmayan düşmana hasar/baskı ek ağırlık alır (`stall` terimi). Normal savaşlar (~37 tur) etkilenmez.
