# Skill ağacı: 10 YAPI önerisi (mockup brief'i, 2026-10-20, ÖNERİ)

Ömer'in çerçevesi (2026-10-20):
- Her sınıfın **2 ağacı** var (sekme). Oyuncu puanları ikisine bölüştürür.
- **Skill değişimi / yeni aktif skill YOK** (ileride 3. ya da 5. mapte ayrı mekanik olabilir). 4 skill + pasif aynen kalır; ağaç bunların **sayılarını ve davranışını** büyütür.
- **Evolve:** skill yerinde evrilir: adı ek alır ("Whirlwind: Maelstrom"), ikon çerçevesi değişir, yeni bir davranış kazanır. Slot, ikon ve temel iş aynı.
- **Set / item çakışması yok:** item = genel stat (can, zırh, kritik, hız, element); set = sınıf pasifinin ve kaynağın SAYISI (Rage/Omen/MP); **ağaç = tek tek skill'lerin sayıları ve davranışı + sınıfa özel pasif davranış**. Ağaçta genel "+can / +kritik" düğümü yok.
- **Puan:** L2'den itibaren 1 puan/level. L30 = 29 puan, L50 = 49 puan. Her yapı "L50'de ne eklenir" satırı taşır; mevcut düğümler yerinden oynamaz, üstüne eklenir.
- **Sıfırlama:** kasaba ve dinlenme duraklarında 15 + 4 x level altın (Endless'ta tüccar dalgası). Şimdilik böyle.
- QB/MP'de ağaç yok; Endless'ta puanlar koşuya ait (dalga başına 1).
- `[YENİ]` işaretli düğümler motora yeni kural ister; Ömer onayı olmadan uygulanmaz (onay sorusu ayrı).

Sayılar PROVİZYON (balance-tester). Oyun içi metin İngilizce, notlar Türkçe.

---

## Düğüm havuzu (10 yapının hepsi bu havuzdan kurulur)

### WARRIOR
Skill'ler: Double Strike (DS, temel, Rage üretir), Whirlwind (WW, ön sıra süpürme + lifesteal, cd 3), Charge (CH, arka sıraya dalış + Stun, cd 3), Headsman's Blow (HB, ultimate, tüm Rage'i harcar, cd 5). Pasif Berserker (az can = sert vuruş + can kaybı Rage verir).

**Ağaç A: CARNAGE** (DS + WW + Rage akışı)
| Kod | Ad | Tür | Etki |
|---|---|---|---|
| A1 | Heavy Hands | filler, 3 rank | Double Strike power +6% per rank |
| A2 | Blood Rhythm | filler | Double Strike grants +2 Rage per hit |
| A3 | Wide Arc | filler, 2 rank | Whirlwind power +8% per rank |
| A4 | Red Harvest | filler | Whirlwind lifesteal +6% |
| A5 | Spinning Momentum | davranış | Whirlwind cooldown -1 when it kills |
| A6a | Bleeding Gale | çatal (A5'le aynı kademede, A6b ile biri) | Whirlwind applies Bleed (2 turns, 15% STR per turn) |
| A6b | Iron Cyclone | çatal | After Whirlwind, +4 Armor for 2 turns |
| A7 | **Evolve: Double Strike → Triple Strike** | evolve | Third blow (50% power) if the target is below half HP |
| A8 | **Evolve: Whirlwind → Maelstrom** | evolve | Whirlwind strikes the front row twice; second sweep at 40% |
| A9 | **Frenzy** | kapstone | Above 30 Rage: all skills +15% power, +5% lifesteal |

**Ağaç B: VANGUARD** (CH + HB + dayanma)
| Kod | Ad | Tür | Etki |
|---|---|---|---|
| B1 | Long Stride | filler, 3 rank | Charge power +6% per rank |
| B2 | Shoulder Check | davranış | Charge Stun lasts 2 turns on a critical hit |
| B3 | Battering Ram | davranış | Charge also hits one adjacent enemy for 40% |
| B4a | Spear Point | çatal | Charge ignores 30% of Armor |
| B4b | Shieldbreaker | çatal | Charge target loses 20% Armor for 2 turns |
| B5 | Executioner's Eye | filler, 2 rank | Headsman's Blow +10% per rank vs targets below 30% HP |
| B6 | Clean Cut | davranış | Headsman's Blow refunds 10 Rage on a kill |
| B7 | Blood Fuel | pasif davranış | Healing received below 50% HP also grants 5 Rage |
| B8 | **Evolve: Charge → Juggernaut** | evolve | Charge grants a shield worth 15% max HP for 2 turns |
| B9 | **Evolve: Headsman's Blow → Verdict** | evolve | A kill resets Charge's cooldown; overkill damage splashes adjacent enemies at 30% `[YENİ: overkill]` |
| B10 | **Unbroken** | kapstone | Once per battle, a lethal hit leaves you at 1 HP `[YENİ]` |

### HEXER
Skill'ler: Evil Eye (EE, temel, Omen yükler), Withering Curse (WC, DoT, cd 3), Jinx (JX, Jinxed durumu: ıska/şans, cd 3), Doom Mark (DM, ultimate, Omen'leri patlatır, cd 4). Pasif Ill Omen (lanetli ölünce Omen komşuya geçer).

**Ağaç A: MALICE** (EE + JX + Omen yükleme)
| Kod | Ad | Tür | Etki |
|---|---|---|---|
| A1 | Baleful Gaze | filler, 3 rank | Evil Eye power +6% per rank |
| A2 | Lingering Stare | davranış | Evil Eye critical hits apply +1 Omen |
| A3 | Crooked Luck | filler, 2 rank | Jinx duration +1 turn per rank |
| A4 | Cheap Trick | filler | Jinx costs 3 less MP |
| A5a | Hex Knot | çatal | When Jinxed expires it jumps to an adjacent enemy `[YENİ]` |
| A5b | Crooked Fate | çatal | Each miss by a Jinxed enemy restores 4 MP to you |
| A6 | Unlucky Number | davranış | A Jinxed enemy that misses gains 1 Omen |
| A7 | **Evolve: Evil Eye → Twin Gaze** | evolve | Evil Eye also hits a second enemy in the same row at 50% |
| A8 | **Evolve: Jinx → Bad Star** | evolve | Jinxed enemies take +15% damage from all sources |
| A9 | **Witching Hour** | kapstone | Omen cap +1 on all enemies `[YENİ]` |

**Ağaç B: BLIGHT** (WC + DM + Omen patlatma)
| Kod | Ad | Tür | Etki |
|---|---|---|---|
| B1 | Deeper Rot | filler, 3 rank | Withering Curse damage +8% per rank |
| B2 | Creeping Doom | davranış | Each Withering tick has 20% chance to add 1 Omen `[YENİ]` |
| B3a | Contagion | çatal | When a withered enemy dies, the curse spreads to an adjacent enemy |
| B3b | Famine | çatal | Withered enemies deal 15% less damage |
| B4 | Mark of Ruin | filler, 2 rank | Doom Mark +4% damage per Omen on the target, per rank |
| B5 | Early Doom | filler | Doom Mark cooldown 4 → 3 |
| B6 | Grave Echo | pasif davranış | Ill Omen passes up to 3 Omens instead of 2 |
| B7 | **Evolve: Withering Curse → Grave Wick** | evolve | Withered enemies receive 50% less healing |
| B8 | **Evolve: Doom Mark → Seventh Night** | evolve | A Doom kill Jinxes adjacent enemies for 2 turns |
| B9 | **Harbinger** | kapstone | When Doom triggers, allies gain +10% power for 2 turns |

---

## 10 YAPI

Her yapıda: 2 sekme (Warrior: Carnage | Vanguard; Hexer: Malice | Blight), 29 puanla "tipik yapı" örneği, L50 satırı. Mockup her yapıyı 4 ağaçla (W-A, W-B, H-A, H-B) gösterir; ağaç içindeki düğümler yukarıdaki kodlarla yerleştirilir.

### 1. Skill Rows (satırlar)
- Her sekme = 2 skill satırı + 1 ortak pasif satırı. Satır soldan sağa: Filler → Filler → **Çatal (A/B)** → Davranış → **Evolve**. Düğümler sırayla açılır. Sekme kapstone'u iki satırın evolve'u alınınca açılır.
- Bedel: filler 1, çatal 2, davranış 2, evolve 4, kapstone 3. Sekme ~26 puan; 29 puan = bir sekme tam + diğerinde 1 satırın yarısı.
- L50: her satıra 6. düğüm **Evolve II** (4 puan) + sekme kapstone II eklenir (+~14 puan/sekme).
- Artı: telefonda en okunaklı, "bu skill'imi büyütüyorum" hissi. Eksi: dallanma az.
- Örnek Warrior Carnage: DS satırı A1→A2→(çatal yok: A1 rank'ları)→A7; WW satırı A3→A4→A6a/A6b→A5→A8; pasif satırı A9.

### 2. Tier Columns (kademe sütunları)
- Sekmede 5 sütun; sütun o sekmeye harcanan puanla açılır: **0 / 3 / 6 / 10 / 15**. Açık sütundaki her düğüm alınabilir (zincir yok). Evolve'lar T4, kapstone T5.
- L50: T6 (20) ve T7 (25) sütunları eklenir; Evolve II T7'de.
- Artı: serbest seçim, Grim Dawn hissi, ölçeklemesi en kolay. Eksi: sütun kilidi "boşa puan" hissi verebilir.

### 3. Branching Tree (dallanan ağaç, D2 tarzı)
- Kökten yukarı dallanan grafik; düğümün önkoşulu altındaki düğüm + level kapısı (L2 / 6 / 12 / 18 / 24 / 30). Çatal = iki koldan birine girince diğeri kilitlenmez ama puan yetmez.
- L50: L36 / 42 / 50 katmanları üste eklenir (Evolve II ve kapstone II).
- Artı: klasik, "yol seçme" hissi güçlü. Eksi: ekranda en kalabalık, telefonda kaydırma ister.

### 4. Mastery Bar + Evolve Stages (ustalık barı)
- Her sekmenin bir **barı** (0-15) var; bara konan puan sütun açar ve o sekmenin skill'lerine küçük sabit bonus verir (+1% power/puan; genel stat değil, skill'e özel). Evolve'lar bar eşiğinde açılır (bar 6: Evolve I şartı, bar 12: Evolve II hakkı). Düğümler bar dışı puanla alınır.
- L50: bar 25'e çıkar, yeni eşikler 20/25.
- Artı: "bara mı skill'e mi" kararı. Eksi: iki havuz anlatması zor.

### 5. Rank Ladder (basamak)
- Her skill'in 10 basamağı: 1-4 küçük sayı, **5 = çatal**, 6-9 davranış/sayı, **10 = Evolve**. Sekme = 2 skill merdiveni + pasif düğümü. Her basamak 1 puan; sıra zorunlu.
- 29 puan = bir skill tam evolve (10) + ikinci skill çatala kadar (5) + üçüncü skill 9 + pasif 3 vb.
- L50: basamak 11-15 (15 = Evolve II).
- Artı: en basit, tek kural ("bir sonraki basamak"). Eksi: seçim azlığı; dallanma yalnızca 5. basamakta.

### 6. Constellations (takımyıldızlar)
- Sekme = 3 küçük takımyıldız (3-5 yıldız). Yıldız = küçük düğüm (1 puan), herhangi sırayla. Takımyıldız **tamamlanınca** Evolve'u açar (bedelsiz, ödül). Kapstone = iki takımyıldız tam olunca.
- L50: sekmeye 4. ve 5. takımyıldız (Evolve II'ler).
- Artı: "tamamlama" ödülü, görsel olarak güzel. Eksi: filler ağırlıklı, her yıldız küçük.

### 7. Hex Grid (petek)
- Sekme = petek ızgara; merkez açık, komşusu açık olan hücre alınabilir. Köşelerde Evolve, dış halkada kapstone. Çatal yok; yol seçimi hücre komşuluğuyla.
- L50: dış halka eklenir (Evolve II köşeleri).
- Artı: keşif hissi, yollar doğal. Eksi: dokunmatikte küçük hücreler; dengesi zor.

### 8. Choice Rows (seçim satırları, D4/WoW tarzı)
- Puan yok: her **3 level'da bir satır** açılır, satırda 2-3 seçenekten 1'i seçilir (çatal her satırda). L10 / L20 / L30 satırları Evolve seçimi (hangi skill evrilsin). Sekme = satırların yarısı (A sekmesi tek level'lar, B çift). Sıfırlama = satır değiştirme ücreti.
- L50: L33 ... L48 satırları + L40 / L50 Evolve II satırları.
- Artı: her level'da anlamlı seçim, hiç "boş puan" yok. Eksi: puan biriktirme hissi yok; 29 puan kuralını bırakır (satır = level).

### 9. Rune Slots (rün yuvaları)
- Her skill'in **2 rün yuvası** var (evolve değil). Sekme = o skill'lerin rün havuzu (kademe T1/T2/T3, puanla satın alınır, Gear'da yuvaya takılır; takılı olmayan rün bekler). **Evolve = 2 yuvası dolu skill** evolve düğümünü alabilir (4 puan). Rün değişimi bedava, satın alma puanla.
- L50: 3. yuva (L40) ve T4 rünler.
- Artı: yükleme esnekliği, Grim Dawn dönüştürücü hissi, sıfırlama ihtiyacı az. Eksi: yeni ekran (rün takma), en çok motor işi.

### 10. Spiral Ring (halka, FF12 lisans tahtası hafif)
- Sekme = iç içe 3 halka. İç halka (6 düğüm, filler) tamamen alınmadan orta halkaya geçilmez; orta halka (çatal + davranışlar); dış halka (2 Evolve + kapstone). Halka içinde serbest sıra.
- L50: 4. halka (Evolve II, kapstone II).
- Artı: net ilerleme hissi, telefonda tek ekran. Eksi: iç halka zorunlu olduğu için ilk 6 puan seçimsiz.

---

## Mockup isteği (ui-dev, Sonnet)
`public/mockups/skill-trees.html` (+ `skill-trees/` klasörü): üstte 10 sekme (1-10), her sekmede yapı adı + 2 satırlık Türkçe not + 4 ağaç (Warrior Carnage / Vanguard, Hexer Malice / Blight) gerçek oyun görünümünde (Gear ekranındaki Skills sekmesi gibi: Cinzel başlık, ince altın çizgiler, kor elmas düğümler, A Plates skill ikonları). Düğüm üstüne gelince A Band ipucu: ad, etki, bedel. Örnek "29 puanlık tipik yapı" alınmış düğümler dolu, diğerleri soluk; L50 eklentileri kesikli çerçeveyle "L50" etiketiyle görünür. Telefon yatay (844x390) ve masaüstünde çalışsın.
