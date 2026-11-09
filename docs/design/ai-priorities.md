# YZ karar kuralları
> **Ne için / Güncel mi (2026-11-08):** YZ karar kuralları (K1-K14) ve uygulama durumu. Güncel. CANLI sahip: bölüm 0 (Ömer kararları), 6-8 (kurallar, durum). Bölüm 1-5 ve 9 (2026-10-07 ölçümü, class bazlı eski davranış) `docs/archive/design/ai-priorities-history.md` içine taşındı (TARİHÇE): sayılar bugünkü `src/engine/ai.ts`/`ai-value.ts` ile eşleşmez, geçerli veri `data/ai.json`.



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

| Değer terimi | Hesap (sade) | Ayar |
|---|---|---|
| Hasar | beklenen hasar (isabet x ortalama, kalan canla sınırlı; alan skill'inde vurulanların toplamı) | — |
| **Öldürme** | öldürme ihtimali x hedefin **kalan katkısı** (ufuk H tur boyunca beklenen hasarı/şifası/kontrolü) | K |
| **Kurtarma** | dost "tehlikede" (bir sonraki turumuzdan önce ölecek beklenen hasar alıyor) ise: hamlenin ölüm ihtimalini düşürdüğü kadar x dostun kalan katkısı (+ canı) | K |
| Şifa / kalkan | gerçekten işe yarayacak miktar (fazla şifa sayılmaz; kalkan: emilmesi beklenen hasar) | K |
| **Diriltme** | dirilen birimin kalan katkısı x hayatta kalma ihtimali + dönen can | K + Soru P |
| **Kontrol** (K8) | Stun = hedefin kaçırdığı hamlenin değeri x ihtimal; Slow/Haste = kaybedilen/kazanılan tur payı x birimin tur değeri; Wound = hedefin alacağı şifadaki beklenen azalma; Blinded/Shrouded/Jinxed = önlenen hasar (bugün var) | K |
| Taunt / Guard (K6) | 6.5 | K |
| Çağrı | çağrının KENDİ değeri (2026-10-21, open-questions-archive 377): ömrü boyunca (ufukla kısılmaz) beklenen saldırısı (en iyi skill'inin tur değeri x oynayacağı tur; üstüne çekeceği hasarla erken ölürse daha az; vurabileceği yuva yoksa 0, K7) + gövdesi: ömrü boyunca üstüne çekeceği düşman hasarı (canı + yenilenmesiyle sınırlı; ön sıranın önüne konup bir düşmanın erişimini dostlardan kesiyorsa o düşmanın tüm vuruşları, değilse erişimdeki hedeflerle eşit pay) x protectShare + çağırma yan etkisi (Bone Ward). Yuva: boş yuvalardan değeri en yüksek olan (eşitlikte varsayılan yuva) | K |
| Mana yakma | düşmanın o mana ile yapamayacağı hamlelerin değeri | K |
| Bedel | MP/can/cooldown'un gelecekteki fırsat bedeli | J (ağırlıklar) |
| **Sınıf ağırlıkları** (kimlik) | `ai.json` profilinde terim çarpanları: ör. Mage hasar 1,0 / destek 1,0; Paladin şifa/diriltme ağırlığı Soru P ile; Archer "en az can" eğilimi | J |

"Kalan katkı" ufku `ai.json`'da tek parametre (`ai.json > value.horizon`, bugün 3 kendi turu); zorluk seviyesi de bunu kullanır (6.7).

### 6.2 Öldürme mi kurtarma mı (K2)

Her dost için "tehlike" hesaplanır: bir sonraki turumuza kadar sırası gelecek düşmanların ona vurabileceği beklenen hasar >= dostun canı + kalkanı. Bir düşmanı öldürmenin değerine, o düşman çıkınca tehlikesi ortadan kalkan dostların kurtarma değeri eklenir. Sonuç Ömer'in kuralıyla aynı: öldürülen düşman dostu öldürecek olan (ya da tehdidin ölümcül payı) ise öldürmek kazanır; değilse doğrudan kurtaran hamle (şifa, kalkan, Guard, Taunt) kazanır. Ayar: K (tehlike modeli; bugünkü `incomingDamage` düşman başına ayrıştırılır ve sıra çubuğu tahmini kullanılır).

### 6.3 Kontrol etkileri (K8)

6.1 tablosundaki kontrol satırı her durum etkisine uygulanır (Stun, Slow, Haste, Wound, Blinded, Shrouded, Jinxed, Fortify, Omen/Wither zaten var). Zaten taşıdığı durumu tekrar uygulamanın değeri yalnızca uzayan kısımdır; Stun'un Taunt'ı bozması (düşman Defender'ı) ek değerdir. Veri: `statuses.json` alanları yeterli; yeni alan gerekmez (Slow/Haste hız payı, Stun skipTurn). Ayar: K.

### 6.4 Ultimate kullanımı (K5)

Ultimate'a "saklama" puanı yok: değeri yüksek olduğu için genelde kendiliğinden seçilir. İki erteleme durumu teraziden doğal çıkar: (a) aynı öldürmeyi bedava/cooldown'suz bir skill de yapıyorsa, ultimate'ın küçük cooldown fırsat bedeli onu geride bırakır (bedel = ultimate'ın tipik değeri x cooldown payı x küçük katsayı, `ai.json`); (b) o an destek (kurtarma) gerekiyorsa kurtarma değeri büyüktür. `reserveMp` (MP ayırma) kalır. Ayar: K + J (katsayı).

### 6.5 Taunt / Guard ve fedakârlık (K6)

Guard değeri = korunan dosta Guard süresince gelecek beklenen hasarın aktarılan payı (x dost tehlikedeyse kurtarma değeri) - Defender'ın bu aktarılan hasarla ölme ihtimali x Defender'ın kalan katkısı. Taunt aynı mantık, dostların tümü için (Defender'a çekilen tek hedefli saldırılar). Sabit can kapısı yok; "2 kişi kaldı, Mage'i koru" senaryosunda fedakârlık değeri pozitif çıkar. Ayar: K.

### 6.6 Dark Bond ve çağrılar (K10)

Bağ değeri = bağ süresince Undead'in gerçekten çalabileceği can (beklenen vuruşlar x Vampiric Bite oranı (`undead.json` > soulDrain.ratio), Undead'in eksik canıyla sınırlı) x bağlanan birimin bu sürede o şifayı kullanabilmesi (eksik canı, beklenen alacağı hasar, kalan ömrü: çağrıda lifespan). Çağrıya yasak yok; çağrının katkısı büyükse ona kurulur. Aynı kural çağrıya Guard/şifa/Barrier için de geçerli. Ayar: K + J (`bondSelfFloor`/`bondHpFloor` küçültülür ya da kaldırılır).

### 6.7 Zorluk: Easy / Medium / Hard (K9)

Kural: YZ belirleyici kalır (CLAUDE.md). "Hata" rastgelelik değil, savaş seed'i + tur + birimden türeyen sabit bir sayıdır (aynı savaş = aynı hata); motorun RNG'sine dokunulmaz.
Ayar: J (`ai.json > difficulty.easy|medium|hard`: ufuk, seçim payı, aç/kapa anahtarları) + K (seçim katmanı, takım odağı). Sim ve denge ölçümü **Medium** ile yapılır.

**Uygulanan (madde 258):**

| Kural | Easy | Medium | Hard |
|---|---|---|---|
| Ufuk | 1 tur | 3 tur (value.horizon) | 3 tur |
| Seçim | puanı en iyinin en az %50'si olan en iyi 3 aday arasından %65 / %23 / %12 (belirleyici: savaş seed'i + oynanan tur + birim; motor RNG'si kullanılmaz) | en iyisi | en iyisi |
| Kurtarma (save) / kontrol (Stun, Slow, Wound...) | 0 (`difficulty.easy.value.saveWeight 0`, `controlWeight 0`; `killMinChance`, `focusFire`, `overkillShare`, `patience` de `difficulty.<seviye>.value` altında) | var | var |
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

- UYGULANDI (K7 / K12): Raise Dead, vurabileceği yuva yoksa 0 değer alır (ai.ts); ön sıradaki dost ölünce ceset hücresine çağrı ve Move girebilir. Motor kuralı: `docs/arch/battle-engine.md`.

### 6.10 Dolu mana eğilimi (Ömer 2026-11-01, Ömer formu; open-questions-archive madde 499)

- Yalnız düşman YZ'si, yeni oyun kuralı yok: skill ödendikten sonra MP oranı `manaSurplusFrom` (0,3) üstündeyse mana doldukça skorda MP bedeli silinir, brüt değerin en çok `manaSurplusShare` (0,6) payı eklenir (`data/ai.json`, `ai.ts > scoreOption`).

## 7. Uygulama durumu

Faz 1-5 UYGULANDI (tek değer terazisi, kontrol / taunt / çağrı / diriltme terimleri, Rest-Skip-Move terazide, zorluk seviyeleri, K14). Faz 6 (balans ölçümü ve ayarı) YAPILMADI (balance-tester). Plan tablosu ve Faz notları: `docs/archive/design/ai-priorities-plan-and-questions.md`. Geçerli kurallar:
- **Block ve Block Break (Ömer 2026-10-31, #17):** saldırı değeri ve hedef seçimi önizlemenin isabet şansından okur: isabet x (1 - (hedefin Block'u - saldıranın Block Break'i)). Kalkanlı mobların Block'u da buradan görünür. Isabet değiştiren debuff değerleri (`hitGain`, `hitLossRaw`, `hitCritLoss`) aynı Block payını kullanır. Test `tests/block-break.test.ts`.
- **Skip Turn kuralı düzeltmesi (Ömer 2026-10-18, seçim sayfası):** Skip yalnızca beklemek gerçekten işe yarıyorsa seçilir: (a) yapacak değerli hamle yoksa, ya da (b) 1 tur sonra hazır olacak bir skill var, şimdiki hamle MP/Rage bedeliyle onu o turda karşılanamaz kılıyor (pas geçince yetiyor) VE şimdiki hamlenin değeri o skill'in değerinin `skip.worthlessShare` payından az. Şimdiki hamle skill'i engellemiyorsa (ör. 0 MP Holy Strike, Radiance'ın beklemesi aynı tur dolar) Skip düşünülmez: skill iki yolda da hazırdır, pas bir tur kaybettirir. Eski kural (b)'deki engel şartını aramıyordu; Paladin ~%11 Skip yapıyordu (çoğu Radiance beklemesi). Rest kuralı değişmedi. Maç kaydında skip satırı engel yoksa `current move does not block it` yazar. Etkisi sim ile ölçülecek.

## 8. Açık sorular

Yok: Soru P (Paladin ölçütleri) K11'le, Soru S (Skeleton / ceset) K12'yle, Soru Z (zorluk nerede) K13'le kapandı; eski metin arşivde.

## Boşuna çağrı ve tıkanma sinyali (2026-10-10, open-questions-archive madde 291)
- **`value.resummonShare` (0,4):** çağrının tarafında onu ufuk içinde yeniden çağırabilecek canlı bir çağırıcı varsa, o çağrıya giden hasar / öldürme / baskı ve ona verilen şifa / Dark Bond bu payla sayılır (`futile` terimi). Hedef seçimi çağırıcıya kayar.
- **Tıkanma sinyali (`value.stallTurns` 150, `stallRamp` 50, `stallFocus` 3):** savaşın toplam tur sayacından (`battle.turnsTaken`) türetilir, YZ saf kalır. Sinyal arttıkça çağrılar cooldown'dan bağımsız olarak kısmen değersizleşir, çağrı olmayan düşmana hasar/baskı ek ağırlık alır (`stall` terimi). Normal savaşlar (~37 tur) etkilenmez.

## YZ'ye yeni değer terimi eklemek için
Sıra: (1) terim `src/engine/ai-value.ts` (ya da `ai.ts`) içinde; (2) ayar `data/ai.json > value.<terim>` (`_not` alanına açıklama); (3) karar gerekçesi `ai.ts > explainChoice` ve `docs/design/match-log.md` satırı; (4) test `tests/ai-value.test.ts` / `tests/ai-coverage.test.ts` (yeni skill / durum / zemin / tetik için YZ değeri olmak ZORUNDA); (5) zorluk etkisi varsa `ai.json > difficulty`. Veri yolları ve terim adları `docs/arch/battle-engine.md` > Değişiklik reçetesi ile aynı.

**Son eklenen YZ terimleri (hepsi `ai.ts` / `ai-value.ts`, ayar `ai.json > value`):** `thunderValue` / `thunderCellWorth` (`value.thunder`), `frostValue` (`value.frost`), `darknessValue` (`value.darkness`), `mobKitValue` ve `kitPassiveValue` (`value.mobKit`), `eliteKitValue` ve `bossTouchValue` (`value.bossTouch`), `signatureValue` / `rodChoice` (`value.signature`), `conductorSetup` (Skald conductor), `manaDenial` (mana yakma). **`enemyMissed` kurulumu** (2026-11-08; `ai.ts` içinde `enemyMissed` tetik değeri ve kurulum bloğu): saldırımız ıskalarsa hedefin tarafındaki kancalı birimlerin `enemyMissed` tetiği bedel olarak sayılır; skill düşmana, bir dostun `enemyMissed` koşulunu açan durum (ör. Blind) veriyorsa durumun eklediği turlar için kurulum değeri eklenir (Vesper ıska çanı, Counter Cut, Backlash).
