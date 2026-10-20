# Skill ağacı: MASTERY BAR tasarımı (Ömer çerçevesi 2026-10-20) + 10 mockup varyantı

Önceki 10 yapı turundan (skill-tree-structures.md) Ömer 4. yapıyı (Mastery Bar) seçti ve çerçeveyi verdi. Bu belge o çerçeveyi doldurur. Sayılar PROVİZYON (balance-tester). Oyun içi metin İngilizce, notlar Türkçe. `[YENİ]` = motora yeni kural, Ömer onayı ister.

## 1. Ömer'in çerçevesi (değişmez)
- Üstte **Mastery bar**; eşikleri geçmek **sabit bonus** verir.
- Altta **5 satır**: pasif + 4 skill, her biri ayrı satır.
- Düğüm türleri: **Filler** (rank'lı, en çok 3 ya da 5 puan), **Edge** (hafif güçlü), **Major** (büyük), **Evolve**.
- **Her düğüm 1 puan.** L30'da 29 puan; oyuncu L30'da evolve'unu açabilmeli; **karakter başına yalnızca 1 evolve**.
- Skill değişimi yok; evolve yerinde evrilir. Item = genel stat, set = pasif/kaynak sayısı, ağaç = skill davranışı.

## 2. Ortak kurallar (benim doldurduğum)
- **Bar = ağaca harcanan toplam puan** (varyant 2 ve 6 hariç; orada farklı). Eşikler **5 / 10 / 15 / 20 / 25**; L50'de 30 / 35 / 40 / 45 eklenir. Her eşik sınıfa özel sabit bir bonus verir (aşağıda).
- **Satır düzeni (soldan sağa):** Filler A (5 rank) → Edge → Filler B (3 rank) → Major → Evolve. Satır tam = 11 puan; 5 satır = 55 puan. 29 puan ≈ 2,5 satır: oyuncu neyi büyüteceğini seçer.
- **Sıra:** satır içinde soldan sağa; Filler A'da en az 1 rank Edge'i açar, Edge Filler B'yi, Filler B'de en az 1 rank Major'ı açar. (Rank'ları tamamlamak zorunlu değil.)
- **Evolve şartı:** satırın Major'ı alınmış **ve bar ≥ 25**. Yani en erken 26. puan evolve olur (L27). Karakter başına 1; alınınca diğer satırların evolve'u kilitlenir ("Evolved: X").
- **Pasif satırı** aynı şekle sahiptir; pasifin evolve'u da sayılır (1 evolve kuralı).
- **L50:** her satırın sağına **Tier II** (Filler C 5 rank + Major II) ve bar eşikleri 30-45; 2. evolve hakkı bar 45'te (öneri, ayrı karar). Mockup'ta kesikli "L50" alan, içerik "design TBD".
- Sıfırlama: kasaba/dinlenme, 15 + 4 x level altın. Endless: aynı ağaç, puan koşuya ait.
- Tavanlar: skill'e özel kritik düğüm başına +%10 en çok; can çalma toplam +%25; "bir kullanım = bir tetik".

## 3. WARRIOR (Berserker: az can = sert vuruş, can kaybı Rage verir; Rage 0-50)

### Fury Mastery (bar bonusları)
| Eşik | Bonus |
|---|---|
| 5 | **Hot Blood:** start every battle with 10 Rage |
| 10 | **Deep Well:** Rage cap 50 → 60 |
| 15 | **Taste of Iron:** your critical hits grant +5 Rage |
| 20 | **Thick Skin:** while above 40 Rage, damage taken -10% |
| 25 | **Evolve unlocked** (one skill) |
| 30/35/40/45 | L50: design TBD |

### Satır 0: Berserker (pasif)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Thick Blood | Rage gained from losing HP +10% per rank |
| Edge | Smell of Iron | The first time you drop below 50% HP in a battle, gain 15 Rage |
| Filler B (3) | Bloodlust | While below 50% HP, +4% lifesteal on all attacks per rank |
| Major | Death Wish | While below 25% HP you cannot be Stunned and your attacks cannot miss |
| Evolve | **Berserker → Crimson Pact** | The Berserker bonus also reduces damage taken (half its value, up to -40%); at the brink of death all cooldowns are 1 shorter |

### Satır 1: Double Strike (2 vuruş x %40 STR, 0 MP, Rage üretir)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Axe Drill | Each hit +4% power per rank |
| Edge | Follow-Through | If the first hit kills, the second hit strikes the next enemy in that row |
| Filler B (3) | Grip of Fury | +1 Rage per hit per rank |
| Major | Hack and Hew | Both hits are critical against a Stunned target |
| Evolve | **Double Strike → Reaper's Rhythm** | Each consecutive Double Strike on the same target adds one more hit (up to 4); switching target resets it |

### Satır 2: Whirlwind (tüm düşmanlar %87 STR, %20 can çalma, 8 MP, cd 3)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Wider Swing | +3% power per rank |
| Edge | Blood Tithe | Grants 3 Rage per enemy hit |
| Filler B (3) | Keen Edge | Lifesteal +5% per rank |
| Major | Scything Arc | Also hits the back row at 50% |
| Evolve | **Whirlwind → Harvest Moon** | While below 50% HP Whirlwind has no cooldown, but costs 15 Rage instead of MP |

### Satır 3: Charge (arka sıraya dalış, %67,5 STR + Stun 1, 10 MP, cd 3)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Running Start | +4% power per rank |
| Edge | Headlong | Costs no MP while you are below 50% HP |
| Filler B (3) | Opening Blow | +8% damage per rank against targets at full HP |
| Major | Marked Prey | The Charged target takes +20% damage from you for 2 turns |
| Evolve | **Charge → Avalanche** | Strikes every enemy between you and the target for 50%, and the Stun lasts 2 turns |

### Satır 4: Headsman's Blow (tüm Rage'i harcar, min 30; Rage ve eksik canla büyür; cd 5)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Heavier Axe | +3% power per rank |
| Edge | Patience | Minimum Rage 30 → 20 |
| Filler B (3) | Executioner's Habit | On a kill, refund 5 Rage per rank |
| Major | Head on a Pike | A kill frightens the remaining enemies: -15% damage dealt for 2 turns `[YENİ: korku durumu]` |
| Evolve | **Headsman's Blow → Judgement** | Never misses, ignores Armor; a kill resets its cooldown |

## 4. HEXER (Ill Omen: lanetli ölünce Omen'ler en yakın düşmana geçer, en çok 2; geçen Omen Doom tetiklemez. Omen 0-3, 3'te Doom; Misfortune: Omen başına -%3 kritik)

### Hex Mastery (bar bonusları)
| Eşik | Bonus |
|---|---|
| 5 | **First Portent:** your first curse each battle applies +1 Omen |
| 10 | **Long Shadow:** Omen lasts 4 turns instead of 3 |
| 15 | **Dread Certainty:** Doom +10% critical chance |
| 20 | **Deeper Misfortune:** Misfortune also -2% hit per Omen |
| 25 | **Evolve unlocked** (one skill) |
| 30/35/40/45 | L50: design TBD |

### Satır 0: Ill Omen (pasif)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Black Candle | Doom damage +4% per rank |
| Edge | Second Shadow | Passed Omens split between the two nearest enemies |
| Filler B (3) | Evil Hour | Misfortune -1% more crit per Omen per rank |
| Major | Funeral Toll | When Doom kills, you regain 8 MP |
| Evolve | **Ill Omen → Plague of Crows** | Passed Omens can now trigger Doom |

### Satır 1: Evil Eye (0 MP, %86 LUCK dark, +1 Omen, kritikte +2)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Sharper Gaze | +4% power per rank |
| Edge | Unblinking | Cannot miss a target that carries an Omen |
| Filler B (3) | Nazar | +4% critical chance per rank |
| Major | Gaze of the Gallows | +40% damage against a target with 2 Omens |
| Evolve | **Evil Eye → Eye of the Abyss** | Also strikes a second Omen-bearing enemy at 60% |

### Satır 2: Withering Curse (2x3 alan, Wither 3 tur, +1 Omen, 14 MP, cd 3)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Rank Soil | Initial hit +4% power per rank |
| Edge | Cheap Spell | Costs 14 → 10 MP |
| Filler B (3) | Long Winter | Wither lasts +1 turn per rank |
| Major | Blighted Ground | Area grows to 3x3 |
| Evolve | **Withering Curse → Pestilence** | Each Wither tick has a 25% chance to add an Omen `[YENİ]` |

### Satır 3: Jinx (2 MP, cd 3; Jinxed 2 tur: -%20 isabet, kritik yok; +%25 kritik)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Knotted Thread | +4% power per rank |
| Edge | Tangled | Jinxed lasts +1 turn |
| Filler B (3) | Lucky Pin | +5% critical chance per rank |
| Major | Shared Fate | When a Jinxed enemy misses, the nearest other enemy gains 1 Omen |
| Evolve | **Jinx → Hex of Mirrors** | A Jinxed enemy's miss hurts itself for 30% of the intended damage `[YENİ]` |

### Satır 4: Doom Mark (14 MP, cd 4; vurur, +1 Omen, Doom x1,5; öldürürse Omen geçmez)
| Tür | Ad | Etki |
|---|---|---|
| Filler A (5) | Heavier Doom | Its Doom +5% per rank |
| Edge | Hasty Verdict | Cooldown 4 → 3 |
| Filler B (3) | Grim Harvest | On a kill, refund 4 MP per rank |
| Major | Omen Thief | Also pulls the Omens of adjacent enemies into the blast |
| Evolve | **Doom Mark → Final Hour** | A kill passes its Omens on after all, and the Doom echoes on the next enemy at 50% |

## 5. 10 mockup varyantı (hepsi aynı içerik ve 2. bölümdeki kurallar; farklılık şekil / bar / sıra kuralı)
Her varyant **tıklanabilir**: 29 puanlık havuz, düğüme tıkla = puan harca (kurala uymuyorsa neden yazısı), tekrar tıkla = geri al (bağlı düğümler varsa önce onlar), bar canlı dolar, eşik bonusları canlanır, 1 evolve kuralı uygulanır, Reset düğmesi, "L50" anahtarı (49 puan + Tier II alanı kesikli).

| # | Ad | Fark |
|---|---|---|
| 1 | Classic | Bar yatay üstte (harcanan toplam). 5 satır soldan sağa zincir. Referans varyant. |
| 2 | Manual Bar | Bar'a puan **elle** konur (en çok 15; eşikler 3/6/10/15, sabit bonuslar aynı). Satırdaki düğüm kademeleri bara bağlı: Filler A her zaman, Edge bar 3, Filler B bar 6, Major bar 10, Evolve bar 15. Grim Dawn kararı: bara mı skill'e mi. |
| 3 | Forked Rows | Her satırda Edge iki seçenekli (A/B; biri alınınca diğeri kilitli). İkinci Edge seçenekleri: Warrior 0 "Iron Will: Stun on you lasts 1 turn less", 1 "Sure Hand: first hit cannot miss", 2 "Low Sweep: hit enemies lose 1 Speed for 1 turn" `[YENİ]`, 3 "Shield Splinter: target loses 3 Armor for 2 turns", 4 "Mercy Stroke: if the target survives, refund 10 Rage"; Hexer 0 "Mourning Veil: passed Omens last 1 turn longer", 1 "Cold Stare: +1 Omen on a kill to the nearest enemy", 2 "Creeping Edge: area shifts one row deeper", 3 "Ill Luck: Jinxed target's crit is yours (+5%)", 4 "Quiet Verdict: no initial cooldown". |
| 4 | Spine | Bar **dikey** ortada; sol tarafta 2 satır, sağ tarafta 3 satır (pasif ortada barın altında). Eşik işaretleri iki tarafa çizgi atar. |
| 5 | Free Order | Satır içinde sıra yok: Filler ve Edge her zaman; Major o satırda ≥3 puan ister; Evolve Major + bar 25. |
| 6 | Milestone Choice | Bar eşiklerinde bonus **2 seçenekten 1** (ikinci seçenekler: Warrior 5 "Cold Fury: start with 0 Rage but +10% power turn 1", 10 "Rage decays never" `[YENİ]`, 15 "Kills grant 10 Rage", 20 "Below 25% HP, +1 Armor per 10 Rage"; Hexer 5 "Start with 10 extra MP", 10 "Omen lasts 2 turns but Doom +20%", 15 "Doom cannot be dodged", 20 "Misfortune also -1 Speed at 3 Omens" `[YENİ]`). Satırlar Classic. |
| 7 | Tiered Grid | Satırlar 3 kademe sütunu: T1 (Filler A + Edge), T2 (Filler B + Major), T3 (Evolve). T2 bar 10, T3 bar 25 ile açılır; kademede sıra yok. |
| 8 | Phone Cards | Her satır bir kart; başlıkta ikon + ad + harcanan; dokununca kart açılır, düğümler yatay kayar. Bar halka olarak sol üstte. 844x390 odaklı. |
| 9 | Medallions | Bar dikey solda, satırlar sağda; Major ve Evolve büyük madalyon (ikonlu), filler'lar madalyonun altında küçük çentik sayacı (●●●○○). |
| 10 | Sigil Wheel | Pasif ortada, bar halka olarak etrafında; 4 skill satırı dört yöne ışın gibi uzanır (Filler → Edge → Filler → Major → Evolve dışa doğru). |

## 6. Ömer'e sorulacaklar (uygulama öncesi)
1. Bar harcanan toplamla mı dolsun (1, 3-5, 7-10) yoksa elle mi (2)? Eşik bonusu sabit mi (1), seçimli mi (6)?
2. `[YENİ]` düğümler: korku durumu (Head on a Pike), Pestilence Omen tick'i, Hex of Mirrors, Low Sweep / Speed kaybı, Rage çürümesi.
3. L50'de 2. evolve hakkı (bar 45) olsun mu?
4. Evolve'un bar 25 şartı uygun mu (L27'de açılır)?
