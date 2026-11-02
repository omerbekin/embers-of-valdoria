# Vesper: tasarım dökümanı (UYGULANDI: motor + veri, TASLAK değerler, 2026-10-28)

> **Durum:** engine-dev / content-designer (Opus), 2026-10-28; open-questions madde 451. Tüm sayılar **PROVİZYON** (Mage'den türetildi, sim YOK; Ömer her sim'i onaylar). Skill ağacı **Ömer onaylı (2026-10-31), sayıları provizyon**. Efekt ve ses kendi (2026-11-01); ikon, logo, avatar ödünç. `tests/balance-checks.ts > PENDING_BALANCE` içinde.
> Ad / id: brifte "Bellwarden" idi, Ömer kararıyla **Vesper**, id `vesper` (Blood Warden ile karışmasın; o başka sohbetin tasarımı, dokunulmadı).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id | `vesper` |
| Oyun içi ad | **Vesper** (zamir: she) |
| Rol (`role`) | **Bell Caster** |
| Primary | **INT** |
| Silah ailesi | **staves** (asa; başlangıç silahı `ash_staff`, Mage ile aynı) |
| Menzil | 6 (Mage gibi arka sıra; `frontPriority` 7) |
| Nitelikler | STR 21 / INT 26 / DEX 5 / LUCK 8 |
| Zırh | 22 (2026-11-01 denge turu, Ömer onayına kadar geçici; önce 14) |
| YZ profili | `vesper` (`data/ai.json`) |
| Görünüş (yön A, "Bronze Abbess") | Uzun boylu yaşlı başrahibe, beyaz-altın cüppe, sırtında zincirli kocaman yeşil pas tutmuş (verdigris) bronz çan, elinde asa olarak çanın demir tokmağı |

Arketip: batık bir katedralin çan kulesinin bekçisi. Çan sesi = **holy**, gök gürültüsü = **lightning**. Arka sıradan ALAN hasarı veren, savaş uzadıkça güçlenen büyücü. Şifa YOK.

**Sanat durumu (2026-11-01):** gövde kendi pozları (`vesper_v2`). Efektler kendi: `src/game/art-v2/vesper/vfx.ts`, sheet'ler `assets/vfx/vesper/` (çizen Terra 6.1, kontrol eden Sol 6.1; notlar `docs/anim-review/notes/toll.md`, `thunderpeal.md`, `cracked_bell.md`, `great_bell_of_valdoria.md`). Sesler kendi: `data/audio-v2/vesper.json` (bronz çan kısmi sesleri, gök gürültüsü; Ömer henüz dinlemedi). **Hâlâ ödünç:** ikonlar `radiance` / `bolt` / `judgehammer` / `divine`, logo `divine`, savaş dışı sprite `mage`, avatar / büst Mage yedeği (Ömer bu işte istemedi). Sürüm seçicide efekt + ses satırı var, ikon kapsam dışı (`asset-versions.ts > V2_SCOPE`).

## 2. Kit

### Pasif: Pealing Bells
Çalınan her **Toll** ya da **Thunderpeal** sonraki çan skill'lerini **%7** güçlendirir (2026-11-01 denge turu, geçici; önce %5); üst sınır yok, savaş boyunca birikir.
- Motor: yeni pasif tipi `{ type: 'pealingBells', perBell: 0.07 }`; savaşçıda yeni sayaç `bells` (savaş başında 0).
- `ringsBell: true` taşıyan skill kullanılınca sayaç +1 (`battle.ts > cast`, Spell Echo bloğundan önce; debug kullanımı saymaz). Pasif olayı yayılır (savaş günlüğü).
- Çarpan: `bell: true` taşıyan hasar etkileri `1 + perBell x bells` ile çarpılır (`spec.ts > damageSpecFor`; motor, önizleme ve YZ aynı fonksiyonu kullanır). Sayaç, skill'in KENDİ hasarından sonra artar (ilk Toll x1,00 vurur).

### Skill'ler

| Skill | Hedef | Element | Güç (INT) | MP | Bekleme | Ek | Çan çalar? |
|---|---|---|---|---|---|---|---|
| **Toll** | tüm düşmanlar | holy | 0,467 | 4 | yok | - | evet |
| **Thunderpeal** | bir düşman SIRASI (`area_enemies`, şekil row) | lightning | 0,764 | 12 | 2 | Blinded 1 tur | evet |
| **Cracked Bell** | tek düşman | holy | 1,083 | 10 | 3 | %30 Stun 1 tur | hayır |
| **Great Bell of Valdoria** (ult) | tüm düşmanlar | holy 0,488 + lightning 0,329 | çan başına her biri +0,025 INT | 22 | 4 (ilk bekleme 2) | - | hayır |

Değerler 2026-11-01 denge turunun geçici sonucu (Ömer onayına kadar); önceki 0,28 / 0,60 / 0,80 / 0,30 + 0,20. Hasar ve zırh artışları 28,9 olan kazanma oranını 45,3'e çıkardı (`open-questions.md`, "Mage ve Vesper denge turu").

- Dört skill'in hasarı da `bell: true`: Pealing Bells hepsini güçlendirir; ama yalnız Toll ve Thunderpeal çan çalar.
- Great Bell ayrıca `powerPerBell: 0.025`: güç = taban + 0,025 x çan (iki hasar satırında ayrı ayrı), üstüne Pealing Bells çarpanı. Örnek 6 çanda: holy (0,46 + 0,15) x 1,42 = 0,866, lightning (0,31 + 0,15) x 1,42 = 0,653 INT.
- Mage'den türetme (Fire Bolt 1,02 / 4 MP; Blizzard 0,77 rect 3x2 / 14 MP / cd 2; Meteor 0,628 plus / 20 MP / cd 3): Toll Fire Bolt'un bedeli, gücü tüm tahtaya yayıldığı için ~%27'si (sayaç kurucusu); Thunderpeal Blizzard'dan dar alan (sıra) + Blind karşılığı biraz düşük; Cracked Bell Fire Bolt'tan düşük (Stun şansı + bekleme karşılığı); Great Bell tüm tahta, 0 çanda toplam 0,50 (Meteor'dan düşük), ~6 çanda ~1,04.
- İpucu metinleri `skill-info.ts`: pasif değerleri, "Rings a bell..." satırı, Great Bell için "5 çanda" örnek değer.

### YZ (`ai.json > vesper`)
Kalkansız büyücü kalıbı; öncelikler kill / aoe / tactic / damage, `aoeMinTargets 2`, ult için `reserveMp 2`. YZ çan büyümesini DEĞERLENDİRİR: `ringsBell` skill'i, bir çanın sonraki çan vuruşlarına katacağı hasar kadar değer alır (`bell.horizon` 2 kendi turu, `discount` 0,7; `open-questions.md` "Vesper çan büyümesi" maddesi). Ağaç kancaları da terazidedir (`ai.ts > bellValue`, `treeTriggerValue`, `treeProcStatusValue`, `armedCostValue`).

## 3. Skill ağacı (`data/skill-trees/vesper.json`, Ömer onaylı 2026-10-31, sayılar provizyon, sim yok)

Var olan ağaç yapısında (rows: pasif + 3 skill, ult, mastery). **Tüm düğümler çalışır** (`fx: null` kalmadı). 2026-10-31'de eklenen genel kancalar: tetik olayı `bellRung`, tetik eylemi `bell`, koşullar `selfBells` / `targetTier` / `targetLowestHp` / `targetFrontAtCast`, ölçek `selfBells`, tetik hedefi `rowBehind`, skill alanı `ringsBell` sayı olabilir (kaç çan), hedef yaması `bellOnly`, stat `spdMult`, Rage kancası `costMul`, yeni durum `shaken` (isabet düşürür, ikonu yer tutucu `blinded`).

- **Pealing Bells:** perBell +%0,5/rank (2 düğüm), genel güç +%2/rank; Long Echo (ilk çan bir çan daha), Matins (savaşa 1 çanla), Quickening Peal (3 çanda bir erken tur), Deep Peal (yalnız Toll çalar, perBell artar), Angelus (5+ çanda çan skill'leri -2 MP), Fraying Rope (perBell artar, alınan hasar +%10), Heavy Bronze (perBell artar, hız -%10), Compline (müttefik düşünce çan), Cathedral Choir (evrim: çan başına kritik +%1).
- **Toll:** güç +%3/rank (3), MP -1/rank, Cracked Rim (+%20 güç, +3 MP), Muffled Toll (bedava, -%25), evrim Death Knell (+%30, kesin isabet), Funeral Toll (%50 altı cana +%25), Knell (en düşük cana +%15), Wide Toll (ön sırayı Slow), Passing Bell (öldürme başına çan), Shaken Ranks (Shaken 1 tur).
- **Thunderpeal:** güç +%3/rank (3), kritik +%2/rank, Blinded +1 tur, Stormbell (bekleme -1), Overcharged (+%25, bekleme +1), Dull Flash (-4 MP, Blind yok), Thunderstruck (%15 Stun), Forked Peal (arka sıraya yarı hasar), Single Bolt (tek hücre, +%60), Storm Tower (evrim: +%30, 2 çan).
- **Cracked Bell:** güç +%3/rank (3), Stun şansı +%3/rank, Shatter (büyü zırhının %20'si yok), Brittle Bell (+%25, Stun yok), Gentle Ring (bekleme -1, -%20), Deafened (+Blind 1 tur), Ringing Skull (Stun tutunca çan), Shards (yan hücrelere yarı hasar), Toll for One (elit / boss +%30), Sundered Bell (evrim: +%30, Stun şansı 2 kat).
- **Great Bell (ult):** +%8 güç (3 düğüm), çan başına +0,005 INT, Crown of Bells (Blind 1), -3 MP, ilk bekleme -1, bekleme -1, kritik +%10, Last Peal (%50 altı cana +%30), Echoing Hall (ult de çan çalar), Bell of Kings (ulttan sonraki Toll bedava).
- **Mastery "Belltower Mastery":** 5 adım: +%4 hasar, Toll -1 MP, Tower Stance (savaşa 1 çanla başla; Matins ile 2 çan, üst sınır yok), perBell +%1, +%6 hasar.

## 4. Kampanya buluşması: dr19 Sunken Chapel (`drowned-reach.json`)

Sandık (treasure) aynen kalır; düğüme `"event": "dr_vesper"` eklendi, sandıktan sonra açılır.

**The Bell of the Sunken Chapel**
> The chest is barely open when the bell above you speaks. High in the drowned tower, a tall old abbess in white and gold hauls on the rope, and the toll rolls out over the flooded nave like thunder over the sea.
>
> She comes down when the last note fades: a great bronze bell, green with age, chained to her back, and its iron clapper in her hand for a staff. "I am Vesper, the last of the sisters who rang for the drowned. The water is still rising. You march toward the Crown. Take me with you, and let the bell ring where it is needed."

- **Take Vesper into the company** (`join: vesper`): katılır; bölük 4 kişiyse kışlada YEDEK bekler. Sonuç: "Vesper ties off the tower rope and shoulders her bell. 'Let the chapel keep its own vigil now.' ..."
- **Leave her to her vigil** (`relic: clapper_of_the_sunken_bell`): tokmağı verir. Sonuç: "...She returns with the chapel bell's old iron clapper, cracked along its length. 'This one has rung enough for the drowned. Let it ring for the living.' ..."
- Bölükte / kışlada / Inn'de zaten bir Vesper varsa kabul seçeneği gizlenir (yalnız ret kalır).

### Emanet: Clapper of the Sunken Bell (Ömer onaylı 2026-10-31)
| Alan | Değer |
|---|---|
| Yuva | trinket (her sınıf takar) |
| Nadirlik | Legendary, ilvl 14, minChapter 2 |
| Sabit affix'ler | C Holy damage, C Lightning damage, B Magic penetration, A Elemental damage |
| Etki | **Toll of the Deep:** "Your critical hits leave the target Blinded for 1 turn: the toll still rings in its ears." (kanca `critStatuses`, ip 2,5) |
| Flavor | "Forty years it rang for the drowned. It has not forgotten how." |
| Kısıt | `eventOnly: true` (yeni alan): Legendary rastgele havuzuna, tüccara ve Endless'a hiç girmez; yalnız bu olaydan |

Not: C Holy / C Lightning / B Magic pen rastgele çekilişte yalnız silah yuvasında çıkar; sabit Legendary affix'leri yuva kuralına bağlı değil (doğrulayıcı temiz).

## 5. Kışla-yedek kuralı (yeni katılan, bölük doluyken)

`state.ts`: `COMPANY_MAX = 4`, yeni `joinHero()`: bölük 4 ise kahraman `reserve`e (kışla) gider, yerleşmez; 4'ten azsa bugünkü gibi katılır. Değişen akışlar:
1. `recruit()`: savaş sonrası / gezgin gönüllü (ör. Valdren düğüm 7) artık doluyken yedeğe.
2. `recruitInTown()`: şehir kışlası / ilan tahtası işe alımı doluyken yedeğe.
3. Yeni olay seçeneği `join` (`chooseEvent`): dr_vesper kabulü.
4. `recruitOffer`: sahip olunan sınıflara yedektekiler de sayılır (aynı sınıf iki kez önerilmez). Yeni yardımcı `ownsClass()` (bölük + yedek + Inn).
Yedekteki kahraman var olan takas kuralıyla alınır: kışla değişimi (`swapHero`, Harita 2'de Saltmere) ya da Inn `recruitFromReserve`. Harita 1'de Valdren Keep Barracks yalnız yedektekilerle takas yapar (`barracksSwap: { offer: 0 }`, yeni aday yok; Ömer 2026-10-31).

## 6. Havuzlar (her zaman açık)
Quick Battle / MP rastgele havuzu (`random-battle.json`), Endless (aynı havuz), kampanya `companyPool` + `recruitPool`. Havuz karışımları değişti: **golden kayıtları yeniden kaydedilmeli** (koordinatör).

## 7. Varsayımlar
1. Silah ailesi staves (Mage'le aynı başlangıç asası).
2. Pasif dört çan skill'inin hepsini güçlendirir; ağaçsız yalnız Toll ve Thunderpeal çalar (ağaç seçimleri ek çan çaldırabilir: bölüm 3).
3. Debug kullanımı çan çalmaz; ağaçtan gelen bedava kullanımlar çalar.
4. Emanet trinket, etkisi kritikte Blind; eventOnly.
5. Yer tutucu görünüş Mage; logo `divine`; ikon / vfx / ses ödünç.
6. Thunderpeal ilk lightning KAHRAMAN skill'i (Ömer brifi); `tests/lightning-element.test.ts` Vesper istisnasıyla güncellendi.
7. YZ çan büyümesini değerlendirir (`bell.horizon` 2, `discount` 0,7; bölüm 2).

## 8. Kesin kural: çan sayacı ve Endless (Ömer 2026-10-31)
Çan sayacı Endless'ta dalga arasında **sıfırlanır**: her Endless dalgası ayrı savaştır (yeni Combatant, `carry` çan taşımaz), Endless simi de aynı `fightWave` yolunu kullanır. Başlangıç çanları (Matins, Tower Stance) her dalgada yeniden verilir. `tests/vesper.test.ts` kilitler. **Ömer 2026-10-31: savaş içi Round 2/3 dalgalarında (`BattleSetup.waves`, aynı savaşçılar) çan sayacı sürer.**
