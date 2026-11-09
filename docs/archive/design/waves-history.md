> Ne için: docs/design/waves.md belgesinden 2026-11-08'de taşınan tarihçe (0.9.2 sonrası düzeltme notu, bölüm 2 'Ömer'e sorulan seçenekler S1-S9', bölüm 3 'İlk bölme önerisi'); güncel değil. Güncel kural: waves.md bölüm 0, 1, 4.

> **Ömer'in düzeltmesi (2026-10-19, 0.9.2 sonrası):** "Var olan mobları dalgalara böldünüz; 1-2 dalga mob EKLEMENİZ gerekiyordu. Çok zorlaşırsa
> mob gücünü biraz düşürürüz." Bölme kuralı kalktı, yerine **ekleme kuralı** geldi (aşağıda bölüm 0). balance-tester'ın 0.9.2'de karşılaşmalara
> elle yazdığı `waves` ve ek mobları geri alındı (`data/campaign/encounters.json` 1b6719a sürümüne döndü). Genel ölçek / XP ayarları
> (`campaign.json > enemyScale`, `eliteEscort`, `levels.json > enemyXp.pow`) bölmeye göre yapılmıştı; ekleme kuralına göre yeniden ayarlandı (balance-tester 2026-10-19, open-questions-archive 367; `balance.json > _waves2`).

## 2. Ömer'e sorulan seçenekler (cevaplar bölüm 0'da; S6 ve S7 cevapsız, bugünkü hal sürer)

**S1. Dalga arası yenilenme**
- A) Yok (varsayılan): dalgalar gerçek yıpratma; savaş uzar, kaynak yönetimi önem kazanır.
- B) Küçük: canlılara maks canın %10'u + MP'nin %15'i.
- C) Yalnızca MP %20 (büyücüler tükenmesin, can yıpratması kalsın).
- Öneri: **A**, sim'de son dalgada kayıp çok artarsa C.

**S2. Sıra (turn order)**
- A) Sıfırla (varsayılan): yeni dalga savaş başı gibi; hızlı birim yine önce oynar.
- B) Kahramanlar sayaçlarını korur, yeni düşmanlar sıfırdan: dalgayı bitiren kahramanın "fazla" hızı boşa gitmez.
- C) Yeni düşmanlar bir tur geç gelir (ilk tur kahramanların; "nefes" anı).
- Öneri: **A** (en anlaşılır; sıra çubuğu yeniden kurulur).

**S3. Cooldown ve savaşta bir kez olan şeyler**
- A) Hepsi sürer (varsayılan; aynı savaş).
- B) Dalga başında kahramanların cooldown'ları 1 azalır (küçük ödül).
- C) Lucky Escape / Cut and Run gibi "savaşta bir kez"ler dalga başına yenilenir.
- Öneri: **A**.

**S4. Önceki dalganın cesetleri**
- A) Kalkar (varsayılan): yeni dalga temiz tahtaya dizilir; Raise Dead eski cesetleri kullanamaz.
- B) Kalır: Undead / Raise Dead dalgalı savaşta çok güçlenir (bol ceset), yeni dalga cesetlerin üstüne dizilir.
- C) Kalkar ama Raise Dead dalga geçişinden önce bir ceset "biriktirebilir" (yeni mekanik; sorulmadan yapılmaz).
- Öneri: **A**.

**S5. Dalgalar arası Valor / ödül**
- A) Yok (varsayılan): Valor savaş başına aynı kalır.
- B) Her dalga bitince +1 Valor (tavana kadar).
- C) Kusursuz dalga (kimse düşmeden) +1 Valor.
- Öneri: **A**, Valor dengesi sonra.

**S6. Sonraki dalgayı önceden görmek**
- A) "Start battle?" kartında ve savaşta "Wave 1/3" + sıradaki dalganın küçük portreleri (motor `battle.upcomingWaves()` hazır).
- B) Yalnızca dalga sayısı görünür, içerik sürpriz.
- C) Hiçbir şey görünmez.
- Öneri: **A** (taktik: kaynağı son dalgaya saklamak).

**S7. Düşman yapay zekası / oyuncu vekili dalgaları bilsin mi?**
- A) Bilmesin (bugün): YZ şu anki dalgaya göre oynar; ultimate'ı ilk dalgaya harcayabilir.
- B) Oyuncu tarafının YZ'si (sim vekili, otomatik oyna) kalan dalga sayısına göre ultimate / MP saklasın (YZ işi, ayrı görev).
- Öneri: önce **A** ile ölç; sim'de oyuncu vekili belirgin kötü oynarsa B.

**S8. Endless'ta adlandırma**
- A) Endless savaşı "Wave 7", savaş içi dalga "Group 1/2" (ya da "Assault 1/2").
- B) Endless savaşı "Stage 7"ye döner, savaş içi dalga "Wave 1/2".
- Öneri: **A** (kayıtlı skorlar ve ekranlar değişmez).

**S9. Dalga sayısı**
- A) Normal savaş 2, elit 2, boss 3 (ortalama ~2,2).
- B) Normal 2-3 (bölge ilerledikçe 3), elit 3, boss 3 (ortalama ~2,6).
- Öneri: **A** ile başla, Bölge III'te B.

## 3. İlk bölme önerisi (UYGULANMADI, ESKİ; Ömer 2026-10-19: bölme yok, bölüm 0'daki ekleme kuralı çalışır)

Genel ilke: bugünkü düşman listesi **bölünür ve az miktarda büyütülür**, tek düşmana can yığılmaz. Dalga başına can çarpanları **düşer**
(et duvarı yerine sayı), toplam düşman canı bugünkünün yaklaşık **1,2-1,4 katı** hedeflenir (dalga arası yenilenme olmadığı için). Sayılar
balance-tester'ın `npm run sim:campaign` ölçümüyle bulunur; aşağıdakiler başlangıç tahminidir.

### 3.1 Sefer (Valdoria; tutorial'ın son haritası = Watchtower'dan itibaren)

Mill Road (1) ve Ravenwood (2) dalgasız kalır (öğretici, tek ekran). Yeni eklenecek düğümler aynı kalıba girer.

| Düğüm | Karşılaşma (bugün) | Önerilen dalgalar | Can çarpanı notu |
|---|---|---|---|
| 3 Watchtower (elit, tutorial) | Bandit Chief + poacher + acolyte | D1: poacher + acolyte; D2: Bandit Chief (+1 yeni okçu) | eşlikçiler bugünkü kadar; şefin canı x0,85 |
| moor Windy Moor | 2 raider + acolyte | D1: 2 raider; D2: acolyte + 1 raider | hpMult ~%15 düşer |
| cairn Cairn Hill | raider + burner + acolyte | D1: raider + burner; D2: acolyte + burner | ~%15 düşer |
| 5B Iron Pass | warden + crossbowman + runecaller | D1: crossbowman + runecaller; D2: warden + crossbowman | warden'ın canı ~%20 düşer |
| charcoal Charcoal Camp | shieldwarden + burner + acolyte | D1: 2 burner; D2: shieldwarden + acolyte | ~%15 düşer |
| 5A Bog Ambush | drowned + witchling + wisp | D1: 2 drowned; D2: witchling + wisp | ~%15 düşer |
| grave Grave Field | ghoul + 2 skeleton + chanter | D1: 2 skeleton + ghoul; D2: chanter + 2 skeleton | iskeletler bugünkü; chanter ~%10 düşer |
| pilgrim Pilgrim Road | warrior, cutthroat, archer, mage | D1: warrior + archer; D2: cutthroat + mage | ~%20 düşer |
| 6B / 8A / 6A (hazine / olay korumaları) | 3 birim | dalgasız kalabilir (kısa ödül savaşı) ya da D1 2 + D2 1 | soru: S9 |
| 8C Black Cathedral (elit) | High Priest + chanter + witchling + ghoul | D1: ghoul + witchling; D2: High Priest + chanter | lider ~%15 düşer |
| 9 Bridge Warden (boss) | Warden + 2 Mooring | D1: 3 köprü haydudu (yeni eşlik); D2: 2 hafif eşlik; D3: Warden + 2 Mooring | Warden canı ~%15 düşer |
| 10 Ashen Plain | 2 hound + burner + chanter | D1: 2 hound; D2: burner + chanter + 1 hound | ~%15 |
| 11B Siege Line | 2 halberdier + warden + crossbowman | D1: halberdier + crossbowman; D2: halberdier + warden; (B seçeneğinde D3: 2 crossbowman) | ~%20 |
| thorn Thornwood Hollow (elit) | Drake Priest + 2 wolf + acolyte | D1: 2 wolf; D2: acolyte + 1 wolf; D3: Drake Priest | ~%15 |
| road Ember Road | 2 raider + hound + acolyte | D1: 2 raider; D2: hound + acolyte | ~%15 |
| head Riverhead | drowned + ghoul + witchling + wisp | D1: drowned + ghoul; D2: witchling + wisp | ~%15 |
| gate Gate of Cinders | 2 gatewarden + halberdier + runecaller | D1: gatewarden + halberdier; D2: gatewarden + runecaller | ~%20 |
| 12 Castle Morvane (boss) | Lord Morvane + 2 sworn guard + hierophant | D1: 2 sworn guard; D2: hierophant + 2 halberdier; D3: Lord Morvane + 1 sworn guard | Morvane canı ~%15 düşer |

Yeniden ayar adımları (balance-tester): (1) her bölgenin "ilk denemede kazanma" ve "taşınan can" bantları (`data/campaign/balance.json`) aynı kalır,
(2) önce bölünmüş dalgalar bugünkü çarpanla ölçülür, (3) can çarpanı düşürülerek bantlara oturtulur, (4) güç (powerMult) en son, (5) XP öldürme
başına olduğu için düşman sayısı artarsa level eğrisi kontrol edilir (gerekirse dalga başına XP çarpanı; soru).

### 3.2 Endless (6. savaştan itibaren)

Bugün normal savaş = 2 rastgele düşman (`data/endless.json > enemyCount`), zorluk dalga güçlenmesinden gelir.
- Savaş 1-5: dalgasız (bugünkü gibi; 5. savaş eliti dahil).
- Savaş 6-14: 2 dalga x 2 düşman (D2 ayrı seed'le aynı havuzdan, D1'le aynı sınıf tekrar etmez).
- Savaş 15+: 3 dalga x 2 düşman (S9-B) ya da 2 dalga x 3 düşman.
- Elit (her 5. savaş, 10 hariç): D1 eşlikçiler, D2 lider (karşılaşmanın `waves` alanı; aynı veri seferle ortak).
- Boss (her 10.): D1 2 rastgele düşman, D2 boss karşılaşması (yardımcıları dahil).
- Yeniden ayar: düşman sayısı ikiye katlandığı için `scaling.hpPerWave` / `powerPerWave` düşürülür (tahmin: x0,6), `bossMult` ayrı ölçülür; hedefler
  `data/endless.json > balance` (ilk 4 dalga %90-100, ulaşılan dalga 13-19) aynı kalır. Gerekli kod: `src/endless/waves.ts > wavePlan` normal
  savaşta `waves` üretir (endless-dev; veri `data/endless.json`'a `subWaves: [{ fromWave, count, size }]` gibi bir tablo).

