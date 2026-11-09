# Dalgalı savaşlar
> **Ne için / Güncel mi (2026-11-08):** dalgalı savaş tasarımı (Ömer'in cevapları 2026-10-19): kural bölüm 0-1, şema bölüm 4; uygulandı ve açık (`data/waves.json`, `src/campaign/encounter-waves.ts`). Tarihçe (seçenekler S1-S9, ilk bölme önerisi, 0.9.2 düzeltme notu): `docs/archive/design/waves-history.md`. Motor mekaniği: `docs/arch/battle-engine.md` > Dalgalı savaş.

> Ömer'in kuralı (2026-10-19): "Dalgalı savaşlar: düşmanlar tek seferde gelmeyecek; bir dalga kesilince yeni dalga gelecek, savaş başına ortalama 2-3 dalga.
> Seferde tutorial'ın son haritasından itibaren, Endless'ta 6. dalgadan itibaren. Amaç: sefer savaşları düşmanları et duvarı yapmadan daha uzun sürsün.
> Denge buna göre yeniden ayarlanacak." (future-ideas.md 2026-10-19 satırı.)
>
> **Durum:** dalgalar gerçek oyunda AÇIK (sefer Watchtower'dan, Endless 6. savaştan). Ömer'in cevapları aşağıda (bölüm 0). Ekleme kuralı Ömer'in 2026-10-19 düzeltmesiyle bölme kuralının yerine geldi.

## 0. Ömer'in cevapları (2026-10-19) ve uygulanışı

| Soru | Cevap | Uygulama |
|---|---|---|
| Nerede | Sefer: tutorial'ın son haritası **Watchtower (düğüm 3)'ten itibaren**; Endless: **6. savaştan itibaren** | `data/waves.json > campaign.skipNodes` = Mill Road (1), Ravenwood (2) dalgasız; geri kalan her savaş (olay / hazine savaşları dahil; yeni eklenecek düğümler kendiliğinden) dalgalı. `endless.fromBattle` = 6 (5. savaşın eliti dalgasız). |
| S9 dalga sayısı | **A:** normal 2, elit 2, boss 3 | `campaign.count` / `endless.count`. Olay ve hazine savaşı normal sayılır. |
| S1 dalga arası yenilenme | **Yok** | `rules.healRatio` / `mpRatio` = 0. |
| S2 sıra | **Koru** (sıfırlama yok) | `rules.turnOrder` = `keep`; ayrıntı aşağıda "Sıra kuralı". |
| S3 cooldown / savaşta bir kez | **Sürer** (aynı savaş) | Değişiklik yok (zaten böyleydi). |
| S4 önceki dalganın cesetleri | **Kalkar** | `rules.clearCorpses` = true (Raise Dead / diriltme kullanamaz). |
| S5 dalga başına Valor | **Yok**; Valor yalnızca savaş sonunda | Değişiklik yok (dalga Valor vermez). |
| S8 adlandırma | Savaş içi dalga ekranda **"Round 2/3"** (sefer ve Endless'ta aynı) | Motor ve veri nötr ad kullanır (`wave`, `waveStart`, `waveIndex`, `waves`); ekrandaki yazıyı ui-dev değiştirir. Endless'ın "Wave 7" (koşunun kaçıncı savaşı) adı aynı kalır. |

**Sıra kuralı (keep):** yeni dalga gelince sıra yeniden kurulmaz; kahramanların (ve hayattaki her birimin) sıra sayacı olduğu gibi kalır. Yeni
dalganın düşmanları savaşa yeni giriyormuş gibi sayaç **0**'dan başlar (savaş başındaki gibi; Head Start pasifi de çalışır) ve her tikte
hızları kadar dolar: böylece mevcut sıraya **hızlarına göre** girerler. Pratikte: o an yarı dolu sayacı olan kahramanlar genelde yeni
düşmanlardan önce oynar, çok hızlı bir düşman yavaş bir kahramanın önüne geçebilir. Eşitlikte savaşın kendi eşitlik kuralı (sayaç > taraf > yuva).
Dalgayı bitiren kahramanın sayacı turunu bitirdiği için zaten düşmüştür; ek eylem hakkı (actionsPerTurn) dalga geçişinde biter.

**Ekleme kuralı (Ömer 2026-10-19 düzeltmesi; eski "bölme kuralı"nın yerine)** (karşılaşmanın kendi `waves` alanı yoksa; `src/engine/wave-split.ts > buildWaves`,
seferde `src/campaign/encounter-waves.ts`): karşılaşmanın düşman takımı **hiç değişmez**, ona **takviye dalgaları EKLENİR** (dalga sayısı = yukarıdaki sayı; ek dalga = sayı - 1).
- **Takviye grubu:** karşılaşmanın eşlikçilerinin (rütbesiz, sıra almayan yardımcı nesne olmayan birimler) kopyası: aynı mob türü, aynı güçlendirme /
  ad / yuva; boyu eşlikçi sayısı kadar, **en az 2** (`data/waves.json > reinforce.minSize`; az ise eşlikçi tekrar eder, aynı sıradaki boş yuvaya).
  Önder (elit / boss) **asla kopyalanmaz**; yardımcı nesne (Iron Mooring) takviyeye girmez.
- **Normal savaş:** 1. dalga = karşılaşmanın kendisi, 2. dalga = takviye.
- **Elit / boss savaşı:** takviye dalgaları **önce**, önder kendi asıl eşlikçileriyle **son dalgada** (boss savaşın doruğu). Elit: takviye, sonra
  asıl takım; boss: takviye, takviye, asıl takım.
- **Eşlikçisi olmayan karşılaşma (The Bridge Warden):** takviye = düğümün bölgesinin sıradan birimleri (`data/waves.json > reinforce.regionGroups`,
  bölge II: Stonebound Warden + Pass Crossbowman; bölge III: Morvane Halberdier + Siege Crossbowman; Iron Pass / Siege Line çarpanlarıyla).
  Bridge Warden seferde artık 3 dalga: 2 takviye, sonra boss + 2 Iron Mooring. Bölge grubu da yoksa tek dalga.
- **Veri önceliği:** karşılaşmaya `waves` yazılırsa tam dalga listesi = `units` + `waves` (sırasıyla, olduğu gibi); varsayılan üretici çalışmaz.
- Güçlendirme / zorluk / level / bölüm çarpanları takviyeye de aynı kuralla uygulanır (elit düğümde takviye elit ölçeğini alır).
- Örnekler (sefer): Windy Moor: 1) 2 Moor Raider + Ember Acolyte, 2) 3 zayıf Moor Raider + Ember Acolyte (elle yazılmış dalga, aşağıda "Dolgu savaşı çeşitliliği"). Watchtower: 1) Poacher + Acolyte, 2) Bandit Chief + Poacher + Acolyte.
  Castle Morvane: 1) 2 Sworn Guard + Hierophant, 2) aynısı, 3) Lord Morvane + 2 Sworn Guard + Hierophant.
- **Önizleme:** harita düşman önizlemesi ve "Start battle?" kartı tüm dalgaların düşmanlarını dalga sırasıyla gösterir (aynı ad birleşik, "4× Moor Raider";
  düğüm bağlamı haritadan bulunur: `encounterWavesById`). XP yedek sayımı (öldürme kaydı yoksa) da tüm dalgaları sayar.

**Dolgu savaşı çeşitliliği (Ömer 2026-10-21: "2 dalganın aynı olduğu senaryolar var, çeşitlendir"; campaign-dev):** dolgu savaşlarının (normal, hazine, olay
korumaları; elit / boss / tutorial hariç) 2. dalgası artık `encounters.json > waves` alanında elle yazılı; 1. dalga değişmedi. Kalıplar karışık:
az güçlü (2-3 birim, çarpan yukarı: Cairn Hill, Misty Marsh, Pilgrim Road, Ashen Plain, Gate of Cinders), çok zayıf (4-5 birim, çarpan aşağı: Windy Moor,
Grave Field, Siege Line, Riverhead, Witch's Hut), başka tür takviye / rol değişimi (Iron Pass: duvarsız okçu + rün büyücüsü yaylımı; Charcoal Camp: baskıncı
hücumu (D2 2026-10-23: Shieldwarden kalktı, 2. dalga 2 birim); Ember Road: tek atlının arkasında büyücüler; Dwarven Mine: muhafız + arbaletçiler (playtest 2026-10-23 D2, Ömer seçti: arbaletçiler silindi, 2. dalga tek muhafız; bu kalıbın 2 birim alt sınırına tek istisna); St. Brann's: büyücü ağırlıklı). Yalnızca bölgenin kendi mobları.
Bütçe (taban can x hpMult x powerMult toplamı) savaş başına eskisinin %±6'sı içinde: az güçlü dalgalar ~%12 fazla, çok zayıf ~%12 az bütçe alır (sayı
üstünlüğü / odak ateşi farkını dengelemek için). morwen_duel 2. dalgası Morwen'in kopyası olmasın diye yalnızca bataklık yaratıkları (PROVİZYON).
**Elit savaşlar (Ömer 2026-10-21 onayı):** Black Cathedral ve Thornwood Hollow da elle yazılı takviye aldı; elit kuralı korunur: takviye `units`
(1. dalga), liderli asıl takım `waves` (son dalga, doruk). Black Cathedral: 2 Risen Skeleton + 2 Grave Chanter ("koro", çok zayıf); Thornwood Hollow: güçlü
Grey Wolf + Charcoal Burner (az güçlü). Elit düğüm ölçeği (`enemyScale.elite`) ve zorluk eki `eliteEscort` rütbesiz birimlere eski takviyede olduğu gibi
yenisinde de aynen uygulanır (bütçe karşılaştırması bu yüzden ham çarpanlarla). Watchtower (tutorial) eski ekleme kuralında kalır.
Sayılar PROVİZYON: balance-tester sim:campaign ile doğrular.

**Endless:** normal savaş (6+): her dalga ayrı rastgele grup (`enemyCount` kadar; önceki dalgaların class'ları tekrar etmez, 1. dalga bugünküyle
birebir aynı); bu zaten ekleme kuralıdır, değişmedi. Elit / boss: seferle aynı kural: karşılaşma aynen son dalgada, önce eşlikçilerinin kopyası
takviye dalgaları (elit 1, boss 2). Eşlikçisiz boss (Bridge Warden; Endless'ta bölge yok): takviyeler rastgele grup. Düşman önizlemesi (`enemyNames`)
tüm dalgaların düşmanlarını sırayla verir.

**Kayıt / duraklatma:** seferde `suspend.ts > battleForPlan` dalgaları kurar, `resumeKey` dalgaları içerir (dalgasız planın anahtarı eskisiyle
aynı). Endless `planKey` dalgaları zaten içeriyordu. Dalgalar açılmadan ÖNCE duraklatılmış bir savaş, düğümü artık dalgalıysa sürdürülemez ve
baştan başlar (mevcut "could not be restored" yolu).

## 1. Motor kuralları (Ömer'in cevaplarıyla)

Tüm sayılar ve açma/kapama tek yerde: `data/waves.json > rules`.

| # | Kural | Varsayılan |
|---|---|---|
| K1 | Mevcut dalganın tüm **savaşan** düşmanları (sıra almayan yardımcı nesneler hariç; sahipsiz hazır çağrılar dahil) düşünce sıradaki dalga boş düşman tarafına dizilir. | açık |
| K2 | Kahramanların can, MP, Rage, cooldown'ları, durumları (buff/debuff), kalkanları, çağrıları **aynen sürer** (aynı savaş devam ediyor). Savaşta bir kez olan şeyler (Lucky Escape, Cut and Run, "ilk debuff yok sayılır" item'i, Valor) savaş boyu bir kez kalır, dalga başına yenilenmez. | açık |
| K3 | Önceki dalganın cesetleri kalkar: düşen düşmanlar savaştan çıkar, Raise Dead onları tüketemez, yeni dalganın diriltici düşmanı onları kaldıramaz (`clearCorpses`). | açık |
| K4 | Düşman tahtasındaki zemin etkileri ve düşmanların bıraktığı zemin etkileri silinir (`clearEnemyGrounds`); oyuncunun kendi tahtasındaki kendi zeminleri kalır. Düşmanın bekleyen telgrafları iptal olur (`cancelEnemyTelegraphs`). | açık |
| K5 | Sıra korunur (`turnOrder: "keep"`, Ömer): kimsenin sayacı değişmez, yeni düşmanlar 0'dan girer (bölüm 0 > Sıra kuralı). `reset` seçeneği motorda durur. | keep |
| K6 | Dalga arası küçük yenilenme (canlı oyuncu birimlerine maks can / MP oranı) (`healRatio`, `mpRatio`). | 0 / 0 (yok) |
| K7 | Savaş ancak SON dalga bitince kazanılır. Bir dalga ile oyuncu tarafı aynı anda biterse (sonraki dalga varken) düşman kazanır. Oyuncu herhangi bir dalgada tamamen düşerse kaybeder. | açık |
| K8 | XP / öldürme / ganimet her dalganın düşmanlarını sayar (savaş özeti tüm dalgaları içerir; sefer XP'si öldürme başına). | açık |
| K9 | Yeni dalganın düşmanları savaşa yeni giriyormuş gibi kurulur: ultimate başlangıç cooldown'u, boss fazı 1, Head Start pasifi, karşılaşma / zorluk / level / bölüm çarpanları ilk dalgadakiyle aynı kuralla. | açık |
| K10 | Dalga yuvası doluysa (ör. canlı yardımcı nesne) birim en yakın boş yuvaya dizilir. | açık |

Mevcut mekaniklerle çakışma (test edildi, `tests/waves.test.ts`):
- **Çağrılar:** oyuncunun çağrıları sonraki dalgaya geçer. Düşmanın sahipli çağrıları sahibiyle zaten ölür; sahipsiz hazır çağrı (Grave Field iskeletleri gibi) düşmeden dalga bitmez.
- **Cesetler / diriltme:** yalnızca yeni dalganın kendi ölüleri diriltilebilir / tüketilebilir; oyuncu kahramanlarının cesetleri savaş boyu kalır (Resurrection ile kaldırılabilir).
- **Boss:** dalgadaki boss faz 1 ve bağlı yardımcı rozetiyle gelir; yardımcılar (Iron Mooring) savaşın bitişinde sayılmaz.
- **İki savaş modu:** turns ve test modunda aynı geçiş; test modunda sıra yok.
- **Rastgelelik:** dalga geçişi rastgele sayı tüketmez; aynı seed = aynı savaş. Dalgasız savaş birebir eskisi (altın kayıtlar değişmedi).

## 4. Teknik şema (yapıldı)

- Motor: `BattleSetup.waves: WaveSetup[]` (ilk dalga `enemies`), `BattleSetup.waveRules` (= `data/waves.json > rules`). Ayrıntı `docs/arch/battle-engine.md > Dalgalı savaş`.
- Kurulum: `content.battleSetup(..., { party, enemies, units, waves: [{ enemies: hücreListesi, units?: { [yuva]: UnitSetup } }] })`.
- Karşılaşma verisi (sefer + Endless elit/boss, aynı dosya `data/campaign/encounters.json`):
  ```json
  "ornek_karsilasma": {
    "name": "...",
    "units": [ { "class": "moor_raider", "slot": 0, "mods": { "hpMult": 0.7 } } ],
    "waves": [
      { "units": [ { "class": "ember_acolyte", "slot": 6 }, { "class": "moor_raider", "slot": 1 } ] }
    ]
  }
  ```
  `units` = 1. dalga, `waves[i].units` = sonraki dalgalar (aynı birim şeması: class, slot, name, tier, mods, lockSkills, initialCooldownBonus).
- Sim: `npm run sim -- 2000 1 --waves=3` (rastgele savaşlara ek dalga), `npm run sim:campaign` / `npm run sim:endless` veride `waves` varsa kendiliğinden;
  denemek için `--encounter-id=<id> --encounter-file=<dosya.json>` (ör. `tests/fixtures/wave-encounter.json`; veri dosyası değişmez).
- **Hangi test:** `tests/waves.test.ts`, `tests/waves-sim.test.ts`, `tests/waves-enable.test.ts`, `tests/campaign-encounters.test.ts` (şema denetimi). Değer: `data/waves.json`; takviye / karşılaşma: `data/campaign/encounters.json > waves`; sayılar değişince balance-tester `sim:campaign --encounter-id=<id>`.
