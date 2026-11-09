> Ne için: docs/design/ai-priorities.md belgesinden 2026-11-08'de taşınan tarihçe (v2-v4 durum notu, planlanan zorluk tablosu, bölüm 7 uygulama planı Faz 1-6 ve durumu, bölüm 8 Soru P / S / Z); güncel değil. Güncel kural: ai-priorities.md bölüm 0, 6; veri data/ai.json.


## Durum notu (eski başlık altı)
Durum: **v4 (2026-10-08): Faz 1-5 UYGULANDI (engine-dev, madde 257 + 258).** Madde 258: Faz 2 artığı (mana yakma "engellenen hamle", Dark Bond düzeltmesi), Faz 3 artığı (Rest/Skip/Move sabit kapısız terazide), Faz 5 zorluk seviyeleri, K14 (savaş belliyse diriltme 0), eski skill ipucu koşulları silindi. Ömer'in kararları (K11-K14) 0. bölümün sonunda; uygulama durumu 7. bölümde. v3: Faz 1-4 (madde 257). v2 (2026-10-07): kararlar işlendi, ölçüm balance-tester. Kalan açık sorular 8. bölümde ve `open-questions.md` madde 252 / 254 / 257.

## 6.7 planlanan zorluk tablosu (geçersiz; uygulanan tablo canlı belgede)

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

