# Gambler

> **Ne için / Güncel mi (2026-11-19):** Gambler kahramanının kimlik, pasif, skill ve ağaç özeti. Sayılar `data/classes/gambler.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. 2026-11-18 rework (Lucky Streak) sayıları PROVİZYON; varsayımlar `docs/design/open-questions.md` > "Gambler rework varsayımları" ve "Gambler ağaç uyarlaması".

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `gambler` / Risk Taker |
| Ön sıra önceliği, menzil | 4.5, menzil 5 |
| Stat (STR / INT / DEX / LUCK) | 16 / 6 / 14 / 24, ana stat LUCK (toplam 60) |
| Zırh / büyü zırhı | 24 / 0 |
| YZ profili | `gambler` (`data/ai.json > profiles.gambler`; seri terimleri `value.aiCov.streak`) |
| Pasif | **Lucky Streak** (iç id `double_or_nothing` korunur; etki `luckyStreak`) |

- Risk alan: can ve MP'sini şansa bahse sokup büyük vurur ("Reckless risk taker who wagers HP and mana on fate for huge hits", `data/classes/gambler.json > blurb`).
- Kimlik (Ömer 2026-11-18): seri kurar, doluyken hangi skill'le harcayacağını seçer. 1. skill seriyi kurar ama harcamaz.
- Hexer ile ilişki: aynı stat, zıt felsefe; Gambler kendi şansıyla kumar oynar, Hexer rakibin şansını bozar (`hexer.md`). `spellEcho` pasif türü motorda ve test sınıflarında sürüyor (Gambler artık kullanmıyor).
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Pasif ve skill'ler (pasif > 1 > 2 > 3 > 4)

| Sıra | Ad | Ne yapar | MP / bekleme | Sayı (veri, PROVİZYON) |
|---|---|---|---|---|
| Pasif | Lucky Streak | Seri sayacı 0-3 (savaş başı 0; doluyken yeni kazanç boşa; diriliş 0'lar). Artış: Loaded Dice çift zar +1, High Stakes bahis kazancı +1. Sıfırlama: High Stakes bahis kaybı. All In seri 0-2'de kazanırsa seri 3'e dolar (Ömer 2026-11-19). Seri 3'teyken 2., 3. ya da 4. skill atılırsa seri harcanır (0) ve o skill'in seri etkisi çalışır; hangisi oyuncunun seçimi. 1., 2. ve 3. skill %25 ihtimalle bir kez daha atılır (tekrar MP ödemez, beklemeye dokunmaz, seriyi değiştirmez); All In tekrar etmez. | - | `effect: {type: luckyStreak, chance: 0.25, max: 3, skills: [0,1,2]}` |
| 1 | Loaded Dice (`loaded_dice`) | Tek hedef fiziksel LUCK vuruşu. İki zar atar: hasar x (toplam / 7) (x0,29 ile x1,71 arası, ortalama x1). Çift gelirse seri +1. Tekrar atışta zarlar yeniden atılır (çift yine sayılır). Seriyi harcamaz. | 0 / yok | power 0,794 (Ömer 2026-11-19, +%8; önce 0,735); `dice: {count 2, sides 6, mean 7, doubleGain 1}` |
| 2 | High Stakes (`high_stakes`) | Tek hedef; maks canın %15'ini bahse sokar: kazanırsa x2, kaybederse x0,6 ve can gider. Kazanç seri +1, kayıp seri 0. **Seride:** bahis kesin kazanılır + verilen hasarın %50'si can emme (kesin kazanç seriyi artırmaz). Tekrar vuruşu ilk bahsin sonucunu kullanır (yeni bahis, can bedeli, seri değişimi yok). | 4 / 2 | power 1,074; bet {hp, 0,15, winChance 0,5, winMult 2, loseMult 0,6}; `streak: {betWinGain 1, betLoseReset, full: {betWin, lifesteal 0.5}}` |
| 3 | Card Trick (`card_trick`) | İki rastgele düşmana vurur; her birine rastgele durum (Hobbled / Wound / Stun). **Seride:** 3 rastgele düşman; isabet edenlerden biri (rastgele) kesin Stun 1 tur, diğerleri Hobbled ya da Wound 2 tur (eşit). Boss ccImmunity normal. Tekrar: yeni rastgele hedeflerle bedava ikinci kullanım (seride atıldıysa yine seri kuralıyla; seri yeniden harcanmaz). | 9 / 3 | power 0,686 (Ömer 2026-11-19, +%8; önce 0,635); randomStatus slow 2 (2) / wound 2 (2) / stun 1 (1); count 2; `streak: {repeat: recast, full: {count 3, sure stun 1, others slow 2 / wound 2}}` |
| 4 | All In (`all_in`) | "Her şey masaya": bedelden sonra kalan bütün MP ve bütün seri yatırılır. Kazanma ihtimali seriye göre %50 / %65 / %80 / %100 (seri 0 / 1 / 2 / 3). Kazanırsa x(2,2 + 0,0667 x yatırılan MP), MP geri kalır. Kaybederse hasar 0, MP 0, maks canın %10'u gider (en az 1 can), seri 0. **Seri ödülü (Ömer 2026-11-19):** seri 0 / 1 / 2'de kazanırsa seri 3'e (dolu) çıkar; seri 3'te atılırsa kesin kazanır, kazanç ayrıca x1,3 (skill'in kendi bonusu, ayrı "more" çarpanı, havuza girmez) ve seri 0'lanır (döngü kırılır). Tekrar etmez. | 8 / 3, ilk 3 | power 0,967; bet {mp, 1, winChance 0,5, winMult 2,2 (Ömer 2026-11-19, önce 1,8), loseMult 0, perStake 0,0667, loseHpRatio 0,1}; `streak: {winChanceByStreak [0.5, 0.65, 0.8, 1], winFillsStreak true, fullStreakMore 0.3}` (motor: dolu seri biçiminde `bet.winMore` 0,3) |

- Olay akışı (render ayrı iş): `dice` {actor, target, values, double} her zar atışında; `streak` {actor, before, after, max, reason: double / betWin / betLoss / spend / fill} her seri değişiminde (`fill` = All In kazanıp seriyi doldurdu; All In seri 1-2'de kaybedince `betLoss`, seri 3'te `spend`; skill başına tek olay). Card Trick tekrarı ikinci bir `skillUsed` olarak gelir; tekrarlar `passive gamble_double` ("Double Hit") yazısını kullanır.
- Önizleme ve YZ seriye bağlı biçimi görür (`Battle.skill` dolu seride / All In'de seri biçimini döndürür).

Geçerli sayı: `data/skills.json` > skill id ve `data/classes/gambler.json > passive`; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili testler (`tests/gambler.test.ts`, `tests/skill-tree-fx-gambler.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Veri: `data/skill-trees/gambler.json` (sürüm 2, bar "Streak Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`. 2026-11-18 uyarlaması (eski yankı / repeatChance bağları yeni sisteme) Ömer onayı bekliyor: `open-questions.md` > "Gambler ağaç uyarlaması".

- **Lucky Streak (pasif):** dolgu Hot Hand, Cornered Dog, Quick Shuffle, Scar Gambler; anahtar Chain Reaction; yön A Lucky Run (ödül Unbroken Run, uç All or Nothing); yön B Charmed Life (ödül Borrowed Time, uç Coin Toss Life); evrim Run It Back. Anahtar: "When you spend a full Streak, your other cooldowns drop by 1."
- **Loaded Dice:** dolgu Steady Wrist, Red Pips, Rolling Dice, Nimble Fingers; anahtar Endless Rattle; yön A Hot Dice (ödül Boxcars = çift 6, uç Fever Dice); yön B Loaded Corner (ödül Snake Eyes = çift 1, uç Spendthrift); evrim Dice Storm. Anahtar: "Loaded Dice's Double Hit can repeat again and again, each time with the same chance."
- **High Stakes:** dolgu Steady Stake, Cautious Wager, Read the Room, Let It Ride; anahtar Due for a Win; yön A Knockout Bet (ödül Haymaker, uç Dirty Fighting); yön B Hedged Bet (ödül Sure Thing, uç Penny Ante); evrim Called Game. Anahtar: "Each High Stakes Bust gives the next High Stakes +10% Jackpot chance, stacking until a Jackpot."
- **Card Trick:** dolgu Sharp Corners, Jack of Clubs, Swift Suit, Long Con; anahtar Crippling Ace; yön A Stacked Deck (ödül Double Deal, uç Cold Deck); yön B Distracting Fan (ödül Blinding Flurry, uç Smoke Cards); evrim Returning Cards. Anahtar: "Card Trick always deals Stun to a Slowed target."
- **Ult All In (tek kol seçilir):** u Fat Stack, Mortgage, High Roller; r Run the Table, Clean Sweep, Domino; d Ride the Wave (+%8 kazanma), Fast Break, Blitz; l Grudge Ledger, Heartbeat, Last Breath.
- **Bar Streak Mastery:** 5 Warm Hands, 10 On a Roll, 15 Blood Debt, 20 Winning Run, 25 Death Shrug.
- Ağaç tetikleri (motor): `streakGain` (seri arttı, miktar = yeni seri), `streakSpend` (dolu seri harcandı), `doubles` (çift zar, miktar = zar yüzü). Hepsinin YZ değeri var (`tests/ai-coverage.test.ts`).

## 4. YZ notları

- Profil: `data/ai.json > profiles.gambler`. Seri terimleri `value.aiCov.streak` (PROVİZYON): `streakSpend` (dolu seriyi harcayan skill'e ek: seri 3'te 2. / 3. / 4. skill öne geçer), `streakRisk` (seri varken High Stakes kaybı seriyi siler: kayıp ihtimali x seri / 3), `streakLoss` (All In seri 1-2'de kaybederse giden seri ilerlemesi: kayıp ihtimali x seri / 3 x brüt x `lossShare`), `streakFill` (2026-11-19: All In seri 0-2'de kazanınca dolan seri: kazanma ihtimali x (3 - seri) / 3 x brüt x `fillShare` 0,3, PROVİZYON; ağaçta `streakGain` miktar 3), `streakBuild` (çift zar / bahis kazancı ihtimali), `luckyRepeat` (Card Trick tekrar değeri). All In'in düşük seri ihtimali ve seri 3'teki x1,3 brüt değerin içinde (önizleme seri tablosunu görür; eski `streakLow` bunu ikinci kez sayıyordu, 2026-11-18 kalktı).
- All In bedeli (2026-11-18 YZ düzeltmesi, `ai-priorities.md` O7): kayıp ihtimali x (kalan MP x mpCostWeight + maks canın %10'u x hpCostWeight); can %50 altına indikçe can kaybı ağırlaşır (x2'ye kadar). %10 can bahis değil, öldürmez: düşük can kuralı (yalnız öldürüyorsa) All In'e uygulanmaz; High Stakes'e (gerçek can bahsi) uygulanır. Öldürme ihtimali dal dal (kazanç / kayıp; tekrar vuruşu ayrı).
- Ölçüm (2026-11-18, 600 hızlı savaş, 355 Gambler; betik, tam sim değil): All In hazır olanlardan en az bir kez atma %9,1 -> %41,2; hamle payı All In %1,3 -> %6,0, High Stakes %44,1 -> %34,1. Seri 3'e ulaşan Gambler %7,6 -> %2,3 (All In seri 2'de atılıyor). Kalan açık: seri 0'da ortalama MP ile All In'in dürüst beklenen hasarı High Stakes'ten (tekrar dahil) düşük, Card Trick (kontrol + tekrar) her seride önde; %80 hedefi YZ ile değil skill sayılarıyla (Lead / Ömer).
- Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

## 5. Açık işler / kararlar

- 2026-11-18 rework (Ömer onaylı): pasif Lucky Streak, 1-4 skill seri etkileri. Sayılar ve ağaç uyarlaması Ömer'in seçimini bekliyor; sim atılmadı.
- Render / UI (zar ve seri göstergesi, `dice` / `streak` olayları) ayrı iş (ui-dev / content-designer).
- Ağaçta "Let It Ride" düğümü Jackpot'ta hedefteki bir debuff'a +1 tur verir; takımda Hexer varsa Omen'e düşebilir (Doom +%25 / tur, bkz. `hexer.md`).

## 6. Tarihçe

- 2026-11-08: belge yalnız veriden yazıldı.
- 2026-11-19: All In winMult 1,8 -> 2,2; All In seri ödülü (kazanınca seri dolar, seri 3'te x1,3 + seri 0); Loaded Dice / Card Trick +%8 güç.
- 2026-11-18: Gambler rework. Eski pasif Double or Nothing ("cooldown'lu hasar skill'i %25 ihtimalle hemen yeniden hazır", `spellEcho`) ve Loaded Dice'ın kendi tekrar şansı (`repeatChance` 0,25) kalktı; yerine Lucky Streak. All In eskiden winChance 0,75 / loseMult 0,6 idi.
