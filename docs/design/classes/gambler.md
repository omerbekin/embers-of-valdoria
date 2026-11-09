# Gambler

> **Ne için / Güncel mi (2026-11-08):** Gambler kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/gambler.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `gambler` / Risk Taker |
| Ön sıra önceliği, menzil | 4.5, menzil 5 |
| Stat (STR / INT / DEX / LUCK) | 16 / 6 / 14 / 24, ana stat LUCK (toplam 60) |
| Zırh / büyü zırhı | 24 / 0 |
| YZ profili | `gambler` (`data/ai.json > profiles.gambler`) |
| Pasif | **Double or Nothing**: "Damaging skills with a cooldown have a 25% chance to be ready again immediately." |

- Risk alan: can ve MP'sini şansa bahse sokup büyük vurur ("Reckless risk taker who wagers HP and mana on fate for huge hits", `data/classes/gambler.json > blurb`).
- Bu belge yalnız veriden yazıldı (Lead kararı 2026-11-08); güçlü / zayıf yan ve tasarım gerekçesi yazılmadı, karar kaydı eski maddelerde dağınık.
- Hexer ile ilişki: aynı stat, zıt felsefe; Gambler kendi şansıyla kumar oynar, Hexer rakibin şansını bozar (`hexer.md`). Pasif `spellEcho` etkisi Gambler ve test sınıflarında sürüyor.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Loaded Dice (`loaded_dice`) | Tek hedef, fiziksel LUCK vuruşu; belli ihtimalle bir kez daha atılır (`repeatChance`). | 0 / yok | sınıf (5) | hasar physical LUCK 0,735, repeatChance=0,25 |
| High Stakes (`high_stakes`) | Tek hedef; canın bir kısmını bahse sokar: kazanırsa hasar çarpanı büyür, kaybederse küçülür (`bet`). | 4 / 2 | sınıf (5) | hasar physical LUCK 1,074, bet={resource:hp, ratio:0.15, winChance:0.5, winMult:2, loseMult:0.6} |
| Card Trick (`card_trick`) | İki rastgele düşmana vurur; her birine rastgele durum (Slow, Wound ya da Stun). | 9 / 3 | sınıf (5) | hasar physical LUCK 0,635; randomStatus: options=[{status:slow, turns:2, weight:2}, {status:wound, turns:2, weight:2}, {status:stun, turns:1, weight:1}]; count=2 |
| All In (`all_in`) | Tek hedef; mevcut MP'yi bahse sokar: kazanırsa büyük, kaybederse küçük çarpan (`bet`). | 8 / 3, ilk 3 | sınıf (5) | hasar physical LUCK 0,967, bet={resource:mp, ratio:1, winChance:0.75, winMult:1.8, loseMult:0.6, perStake:0.0667} |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-gambler.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Veri: `data/skill-trees/gambler.json` (sürüm 1, bar "Streak Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Double or Nothing (pasif):** dolgu Hot Hand, Cornered Dog, Quick Shuffle, Scar Gambler; anahtar Chain Reaction; yön A Streak (ödül Unbroken Run, uç All or Nothing); yön B Charmed Life (ödül Borrowed Time, uç Coin Toss Life); evrim Run It Back. Anahtar: "When Double or Nothing triggers, your other cooldowns drop by 1 too."
- **Loaded Dice:** dolgu Steady Wrist, Red Pips, Rolling Dice, Nimble Fingers; anahtar Endless Rattle; yön A Hot Dice (ödül Boxcars, uç Fever Dice); yön B Loaded Corner (ödül Snake Eyes, uç Spendthrift); evrim Dice Storm. Anahtar: "Loaded Dice's Double Hit can repeat again and again, each time with the same chance."
- **High Stakes:** dolgu Steady Stake, Cautious Wager, Read the Room, Let It Ride; anahtar Due for a Win; yön A Knockout Bet (ödül Haymaker, uç Dirty Fighting); yön B Hedged Bet (ödül Sure Thing, uç Penny Ante); evrim Called Game. Anahtar: "Each High Stakes Bust gives the next High Stakes +10% Jackpot chance, stacking until a Jackpot."
- **Card Trick:** dolgu Sharp Corners, Jack of Clubs, Swift Suit, Long Con; anahtar Crippling Ace; yön A Stacked Deck (ödül Double Deal, uç Cold Deck); yön B Distracting Fan (ödül Blinding Flurry, uç Smoke Cards); evrim Returning Cards. Anahtar: "Card Trick always deals Stun to a Slowed target."
- **Ult All In (tek kol seçilir):** u Fat Stack, Mortgage, High Roller; r Run the Table, Clean Sweep, Domino; d Ride the Wave, Fast Break, Blitz; l Grudge Ledger, Heartbeat, Last Breath.
- **Bar Streak Mastery:** 5 Warm Hands, 10 On a Roll, 15 Blood Debt, 20 Winning Run, 25 Death Shrug.

## 4. YZ notları

- Profil: `data/ai.json > profiles.gambler`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

## 5. Açık işler / kararlar

- Tasarım gerekçesi ve Ömer kararları bu belgeye taşınmadı; varsa `docs/archive/design/open-questions-archive.md` içinde "Gambler" aranarak eklenmeli.
- Ağaçta "Let It Ride" düğümü Jackpot'ta hedefteki bir debuff'a +1 tur verir; takımda Hexer varsa Omen'e düşebilir (Doom +%25 / tur, bkz. `hexer.md`).

## 6. Tarihçe

Eski belge yok: bu belge 2026-11-08'de yalnız veriden yazıldı.
