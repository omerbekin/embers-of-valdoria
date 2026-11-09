> Ne için: docs/design/classes/vesper.md belgesinden 2026-11-08'de taşınan eski tam metin (karar günlüğü, ara değerler, eski tablolar); güncel değil. Güncel belge: docs/design/classes/vesper.md.

# Vesper: tasarım dökümanı (UYGULANDI: motor + veri, TASLAK değerler, 2026-10-28)

> **Durum:** engine-dev / content-designer (Opus), 2026-10-28; open-questions-archive madde 451. Sayılar **kesin** (Ömer 2026-11-08: PROVİZYON kaldırıldı; başta Mage'den türetilmişti; Ömer her sim'i onaylar). Skill ağacı **Ömer onaylı (2026-10-31), sayıları provizyon**. Efekt ve ses kendi (2026-11-01); ikon, logo, avatar ödünç. `tests/balance-checks.ts > PENDING_BALANCE` içinde.
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
| **Cracked Bell** | tek düşman | holy | 1,15 (2026-11-08, önce 1,083) | 10 | 3 | %50 Stun 1 tur (2026-11-08, önce %30) | hayır |
| **Great Bell of Valdoria** (ult) | tüm düşmanlar | holy 0,488 + lightning 0,329 | çan başına her biri +0,025 INT | 22 | 4 (ilk bekleme 2) | - | hayır |

Değerler 2026-11-01 denge turunun geçici sonucu (Ömer onayına kadar); önceki 0,28 / 0,60 / 0,80 / 0,30 + 0,20. Hasar ve zırh artışları 28,9 olan kazanma oranını 45,3'e çıkardı (`open-questions.md`, "Mage ve Vesper denge turu").

- Dört skill'in hasarı da `bell: true`: Pealing Bells hepsini güçlendirir; ama yalnız Toll ve Thunderpeal çan çalar.
- Great Bell ayrıca `powerPerBell: 0.025`: güç = taban + 0,025 x çan (iki hasar satırında ayrı ayrı), üstüne Pealing Bells çarpanı. Örnek 6 çanda: holy (0,46 + 0,15) x 1,42 = 0,866, lightning (0,31 + 0,15) x 1,42 = 0,653 INT.
- Mage'den türetme (Fire Bolt 1,02 / 4 MP; Blizzard 0,77 rect 3x2 / 14 MP / cd 2; Meteor 0,628 plus / 20 MP / cd 3): Toll Fire Bolt'un bedeli, gücü tüm tahtaya yayıldığı için ~%27'si (sayaç kurucusu); Thunderpeal Blizzard'dan dar alan (sıra) + Blind karşılığı biraz düşük; Cracked Bell Fire Bolt'tan düşük (Stun şansı + bekleme karşılığı); Great Bell tüm tahta, 0 çanda toplam 0,50 (Meteor'dan düşük), ~6 çanda ~1,04.
- İpucu metinleri `skill-info.ts`: pasif değerleri, "Rings a bell..." satırı, Great Bell için "5 çanda" örnek değer.

### YZ (`ai.json > vesper`)
Kalkansız büyücü kalıbı; öncelikler kill / aoe / tactic / damage, `aoeMinTargets 2`, ult için `reserveMp 2`. YZ çan büyümesini DEĞERLENDİRİR: `ringsBell` skill'i, bir çanın sonraki çan vuruşlarına katacağı hasar kadar değer alır (`bell.horizon` 2 kendi turu, `discount` 0,7; `open-questions.md` "Vesper çan büyümesi" maddesi). Ağaç kancaları da terazidedir (`ai.ts > bellValue`, `treeTriggerValue`, `treeProcStatusValue`, `armedCostValue`).

## 3. Skill ağacı (`data/skill-trees/vesper.json`, sürüm 3: yeniden kuruldu 2026-11-08)

- İlk ağaç Ömer onaylı 2026-10-31. 2026-11-08 Ömer: "çok generic". Ağaç aynı şekille yeniden yazıldı.
- Mantık: `docs/design/classes/skill-tree-logic.md`. Her düğüm Vesper'in kendi skill'inin oynanışını değiştirir.
- Yalnız mevcut fx kancaları. Sürüm 3 = kahramanlara bir kez bedava respec.
- Sayılar sim bekler (Ömer onayıyla; öneri: 300'lük Endless + sefer simi).
- Test: `tests/vesper.test.ts` (her düğüm), `tests/ai-coverage.test.ts` bölüm 7b (her tetik YZ'de).

### Pealing Bells (çan ritmi)

| Düğüm | Ad | Etki |
|---|---|---|
| f1 | Bronze Throat | Çan başı güç +%0,4/rank |
| f2 | Counted Strokes | Her 4. çan 1 MP/rank |
| f3 | Full Peal | 5+ çanda kritik +%2/rank |
| n0 | Matins | Savaşa 1 çanla başla |
| r | Prime | 3 çan ve altında +%4/rank hasar (savaş başı) |
| ea | Quickening Peal | Her 3. çan tur %10 erken |
| eb | Struck Bronze | Cracked Bell da çan çalar |
| ma | Call to Prayer | Her 5. çan tüm cooldown'lar -1 |
| fa | Racing Peal | Her 2. çan erken tur; çan başı güç -%1,5 |
| fb | Cracked Throat | Cracked Bell 2 çan; Stun şansı yarı |
| mb | Angelus | 8+ çanda üç skill -3 MP |
| v | Cathedral Choir | Her 5. çan bedava Toll |

### Toll (seri çalma, en zayıfı bitirme)

| Düğüm | Ad | Etki |
|---|---|---|
| f1 | Steady Stroke | Art arda her Toll +%2/rank |
| f2 | Ringing Ears | Shaken şansı %3/rank (1 tur) |
| f3 | Dread Peal | Shaken'a +%4/rank |
| n0 | Triple Peal | Her 3. Toll +1 çan |
| r | Lingering Ears | Toll'un Shaken'ı isabeti -%2/rank daha düşürür |
| ea | Unbroken Rope | 3. art arda Toll'dan itibaren herkese Shaken |
| eb | Knell | En düşük cana +%15 |
| ma | Endless Toll | 3. art arda Toll'dan itibaren Great Bell cooldown -1 |
| fa | Hammered Rope | Seri başına +%6 (Steady Stroke yerine); serinin ilk Toll'u -%25 |
| fb | Muffled Knell | En düşük cana +%40 (Knell yerine), öbürlerine -%15 |
| mb | Passing Bell | Öldürme başına 1 çan |
| v | Death Knell | +%25 güç; öldürürse kullanım başı bir bedava Toll |

### Thunderpeal (Blind ve sıra)

| Düğüm | Ad | Etki |
|---|---|---|
| f1 | Afterglare | Blind'lıya +%4/rank |
| f2 | Crowded Row | Vurulan düşman başına +%2/rank |
| f3 | Searing Flash | Blind isabeti -%2/rank daha düşürür |
| n0 | Lingering Flash | Blind +1 tur |
| r | Dazzled | Cracked Bell Blind'lıya +%4/rank |
| ea | Forked Peal | Arka sıraya %50 hasar |
| eb | Thunderstruck | Zaten Blind'lıya %30 Stun |
| ma | Storm Front | 3 düşmana isabet +1 çan |
| fa | Overcharged | Arka sıraya tam hasar; +6 MP |
| fb | Blinding Storm | Thunderstruck %60; güç -%30 |
| mb | White Flash | Blind'lıya kritik +%25 |
| v | Storm Tower | Sıradaki tur başında aynı hücrelere %60 güçle ikinci gök gürültüsü (kendi çanı) |

### Cracked Bell (Stun ve tek hedef)

| Düğüm | Ad | Etki |
|---|---|---|
| f1 | Bronze Memory | Çan başı +%0,5/rank |
| f2 | Jarring Note | Stun şansı +%3/rank |
| f3 | Bell-Breaker | %50 üstü cana +%4/rank |
| n0 | Ringing Skull | Stun tutunca 1 çan |
| r | Aftershock | Stun tutunca 2 MP/rank |
| ea | Resounding Crack | Stun tutunca Thunderpeal cooldown sıfır |
| eb | Toll for One | Elit / boss +%25 |
| ma | Death Bell | Stun tutunca %50 güçle bedava Toll |
| fa | Brittle Bell | Stun kesin; cooldown 5 |
| fb | Heavy Bronze | +%40 güç; Stun yok (Ringing Skull vb. susar) |
| mb | Bell-Toll Verdict | Elit / boss'a çan başı +%3 |
| v | Sundered Bell | +%30 güç; yanındakilere %50 hasar |

### Great Bell of Valdoria (ult, tek kol)

| Kol | 1 | 2 | 3 |
|---|---|---|---|
| u (çan) | Echoing Hall: çan çalar | Royal Peal: çan başı güç +0,01 | Peal of Ages: 10+ çanda cooldown -1 |
| r (Blind) | Crown of Lightning: Blind 1 tur | Glaring Peal: Blind'lıya +%20 | Judgement Peal: iki vuruşun her biri Blind'lıya %30 Stun |
| d (bitiriş) | Shaking Peal: Shaken 2 tur | Last Peal: %50 altı cana +%25 | Final Toll: öldürme başı çan + Cracked Bell cooldown sıfır |
| l (tempo) | Tower Watch: ilk bekleme -1 | Bell of Kings: sonraki Toll bedava | Evensong: sonraki tur %30 erken |

### Mastery "Belltower Mastery"

| Adım | Ad | Etki |
|---|---|---|
| 5 | First Toll | Savaşın ilk Toll'u +1 çan |
| 10 | Vigil | Dost düşünce 1 çan |
| 15 | Thunder After | Blind'lı düşman ıskalayınca 1 çan (2026-11-08; önce: savaşın ilk Blind'ı 1 çan) |
| 20 | Iron Rope | Çan başı güç +%1 |
| 25 | Vespers' Hour | 10+ çanda Great Bell bir kez 3 çan |

### Onay bekleyen öneriler (yapılmadı)

| Öneri | Neden bekliyor |
|---|---|
| Blind'lı düşman ıskalayınca çan | UYGULANDI (Ömer 2026-11-08 onay; yer Lead kararı): Mastery 15 Thunder After artık "When a Blinded enemy misses, ring 1 bell." (`enemyMissed`, eski 'ilk Blind = 1 çan' kalktı). YZ değeri + testler var; sim bekliyor |
| Thunderpeal'e `shocked` (yıldırım durumu) | Ömer 2026-11-08: HAYIR. Thunderpeal olduğu gibi kalır (Blind + çan) |
| YZ: isabet düşüren durum (Shaken / Blinded) tetikle verilince değer | `statusEffectWorth` isabet etkisini saymıyor |
| YZ: `cooldownDelta` (Peal of Ages) ve `statusPotency` (Lingering Ears, Searing Flash) | YZ'de ayrıca değerlenmiyor (Mage, Hexer ağaçlarında da aynı) |

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
