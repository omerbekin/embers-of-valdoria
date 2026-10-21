# Skill ağacı: MOMENTS şeması (Ömer seçimi 2026-10-21)

2. turdaki 10 varyanttan (`skill-tree-mastery-v2.md`) Ömer **V6 Moments** yapısını seçti ve şunları istedi:
1. Moments olsun ama daha uzun: başa ekleme yapılacak. Mevcut başlangıç noktasının önünde (−1) bir **notable** (orta boy düğüm), onun önünde de **3 filler** olacak.
2. Evolve öncesinde notable'ın yanındaki, devamı olmayan (dead end) düğümler **Blood Price** düğümleri olacak.
3. Düğümlerin açılması yalnızca o satıra bağlı olmayacak: hangi skill'e verilirse verilsin yeterli puan toplanınca sıradaki kademe açılacak.
4. Tek skill'e tam odaklanan oyuncu **1. evolve'u L25'te, 2. evolve'u L40'ta** açacak şekilde puan ihtiyacı hesaplanacak.
5. Ult'ta (Warrior: Headsman's Blow) evolve olmayacak. Onun yerine **+ şeklinde küçük özel ağaç** olacak: seçimler ortadan kenara gider, 1. düğüm L5'te, 2. düğüm L10'da, 3. düğüm L15'te açılır, 3. düğüm notable'dır.

Değişmeyenler: Mastery bar üstte (sayaç = pasif + 3 aktif satıra harcanan puan, **ult sayılmaz**; 5/10/15/20/25 sabit bonus; L50'de 30/35/40/45). Her rank 1 puan. Puan = level − 1. Skill değişmez, evolve yerinde evrim. Item = genel stat, set = pasif / kaynak sayısı, ağaç = skill davranışı.

## 1. Satır şekli (pasif + 3 aktif skill: Berserker, Double Strike, Whirlwind, Charge)
| Sütun | id | Tür | Rank | Gerek | Tier | Şerit |
|---|---|---|---|---|---|---|
| 0 | f1 | Filler | 3 | – | I | 0 |
| 1 | f2 | Filler | 5 | f1 | I | 0 |
| 2 | f3 | Filler | 5 | f2 | I | 0 |
| 3 | n0 | **Notable** (yeni, −1) | 1 | f3 | II | 0 |
| 4 | r | Filler (eski başlangıç) | 3 | n0 | III | 0 |
| 5 | ea / eb | Edge | 1 | r | III | −1 / +1 |
| 6 | ma | **Notable** → evolve yolu | 1 | ea | IV | −1,5 |
| 6 | fa | **Blood Price** (dead end) | 1 | ea | IV | −0,5 |
| 6 | fb | **Blood Price** (dead end) | 1 | eb | IV | +0,5 |
| 6 | mb | **Notable** → evolve yolu | 1 | eb | IV | +1,5 |
| 7 | v | **Evolve** | 1 | ma ya da mb | E | 0 |

Bir satır tam dolu = 23 puan + evolve = **24**. Gerek = önceki düğümde en az 1 rank.

## 2. Kilit kuralı (madde 3)
- **Sayaç = pasif + 3 aktif skill satırına harcanan toplam puan** (Mastery bar ile aynı sayı). **Ult puanları sayılmaz** (Ömer 2026-10-21): ult ağacı ayrıdır, kendi level kilidi (5 / 10 / 15) ve 3 puan tavanı vardır. Puanın hangi satırdan geldiği önemli değil. Focus check sonuçları değişmez (Evolve I L25, Evolve II L40); ama ult'a puan harcayan odaklı oyuncu evolve'ları 3 level geç açar (L28 / L43), çünkü ult puanı da level havuzundan düşer.
- Tier I: 0 · Tier II: 5 · Tier III: 10 · Tier IV: 15 · **Evolve I: 23** · **Evolve II: 38**.
- Evolve için o satırın notable'ı (ma ya da mb) ve sayaç şartı gerekir. Karakter başına **en çok 2 evolve**: birincisi için sayaç 23, ikincisi için sayaç 38 olmalı.

## 3. Hesap (madde 4)
Tek satıra tam odaklanan oyuncu:
| Level | Ne olur |
|---|---|
| L2-L6 | Filler'lar (Tier I, 13 rank) |
| L7'den | n0 notable alınabilir (sayaç 5) |
| L12'den | r + Edge'ler (sayaç 10) |
| L17'den | Notable + Blood Price (sayaç 15) |
| L24 | Satır dolu (23 puan) |
| **L25** | **Evolve I** (24. puan, sayaç 23 şartı) |
| L25-L39 | İkinci satır: yol (f1, f2, f3, n0, r, Edge, notable = en az 7 puan) + 7 rank daha |
| **L40** | **Evolve II** (39. puan, sayaç 38 şartı) |

Hiçbir level'da puan boşta kalmaz, her an açık bir düğüm vardır (betikle denendi). L30 tavanında (29 puan): 1 evolve + 5 puan. L50'de (49 puan): 2 evolve + 10 puan.

Not: sayaç toplam olduğu için puanını dağıtan oyuncu da L25'te evolve açabilir; yeter ki bir satırda notable'a ulaşmış olsun (en az 7 puan). Odak zorunlu olsun istenirse ek şart konabilir: "o satırda en az 14 puan".

## 4. Ult + ağacı (madde 5)
- Ortada ult'un ikonu durur, kendisi düğüm değildir. 4 kol vardır (yukarı, sağ, aşağı, sol). Her kolda ortadan dışa 3 düğüm sıralanır: 1. düğüm **L5**, 2. düğüm **L10**, 3. düğüm **L15** ve **Notable**. 1. ve 2. düğüm küçüktür (Edge boyu), her biri 1 puan.
- **Tek kol (Ömer 2026-10-22, tüm class'lar):** karakter ult'ta TEK kol kullanır; herhangi bir kolun herhangi bir düğümünde puan varsa diğer üç kolun düğümleri alınamaz ("One ult path only"). Puan (mockup'ta doğrudan, oyunda onaylanmamış bekleyen puan) geri alınınca seçim yeniden serbest; oyunda onaylı kol yalnızca respec ile değişir. Ult'a toplam en çok 3 puan (Ömer 2026-10-21); ikisi birlikte: en fazla tek kolun 3 düğümü. Evolve yoktur. Ult puanları kilit sayacına ve Mastery bar'a girmez (Ömer 2026-10-21); ult düğümleri kendi level kilidini kullanır.

## 5. Düğüm türleri
Filler (küçük, rank'lı) · Edge (küçük ama güçlü) · **Notable** (orta boy, ikonlu) · **Blood Price** (kazanç + bedel, notable'ın yanında dead end) · Evolve (büyük, altın).

## 6. Varsayımlarım (Ömer onayı bekliyor)
1. Madde 3'teki "sıradaki row" ifadesini **sıradaki tier sütunu** olarak okudum (WoW tarzı: ağaca toplam X puan verilince sıradaki sütun açılır). L40 hesabı ancak böyle tutuyor: ikinci satırın kademeleri birinci satırın puanıyla zaten açık olur.
2. Sayaç: Ömer "aktif skill" dedi. **Ömer kararı (2026-10-21): pasif sayılır, ult sayılmaz** (pasife odaklanan oyuncu da evolve açabilir; ult ağacı sayaçtan ayrı).
3. Ult'ta her düğüm 1 puan; ult'a en çok 3 puan verilir (Ömer 2026-10-21). **Ömer kararı (2026-10-22): tek kol**; bir kola puan verilince öbür üç kol kapanır (eski "kollar serbest" kuralının yerine). L5 / L10 / L15 kilitleri ve "iç düğüm gerek" kuralı aynı.
4. Notable = orta boy düğüm (eski Major). Edge'ler (ea / eb) yerinde kaldı.
5. Yeni 3 filler 3-5-5 rank; satır böylece 24 puana geliyor ve L25 hesabı tutuyor.

## 7. Mockup
`public/mockups/skill-tree-moments.html` (+ `skill-tree-moments/`). Ev sahibi sayfa: **11 class × 5 varyant** (sıra: warrior, defender, paladin, archer, cutthroat, mage, druid, undead, hexer, antimage, gambler; Warrior'da ek olarak "Ömer's pick" sekmesi ve varsayılan). Class ve varyant seçilince puanlar sıfırlanır. İçerik `variants/<class>.js` dosyalarından gelir (sözleşme: `skill-tree-moments-variants.md` bölüm 3), class seçilince yüklenir; dosya yoksa ya da bozuksa sayfa "Variants coming" gösterir. Satır adları dosyadaki `rows[]` / `ult`ten, ikonlar `classes.js` + `ic/<class>/` (oyundaki v2 ikonlar ve portreler, sıraya göre: pasif, 3 aktif, ult).
- Adres: `#c=<class>&v=<1-5|pick>&lv=30` (+ `&focus=A-B`, `&clean`). Eski adresler: `#c=w` = Warrior (Ömer'in seçimi), `#c=h` = Hexer v1.
- Ekran (Ömer düzeltmeleri 2026-10-21 gece): tier başlık bandı (Tier I … Evolve I) yalnızca ağacın en üstünde TEK sefer, kolonlar tüm satırlarla hizalı; Mastery bar altında tier yazısı ve evolve çentiği yok (yalnızca bonus elmasları + hover ipucu); sayaç ve bar = pasif + 3 aktif (ult ayrı).
- Warrior "Ömer's pick": `picks-warrior.js` (boş yuva = "Open slot"), Mastery adı ve bar eski V6 Moments'tan (`content.js` içinde sabit).
- Eski geçici Hexer eşlemesi (V3/V5/V6/V7/V8) kaldırıldı; Hexer artık kendi 5 varyantıyla gelir.
- Test (scratchpad, teste eklenmez): `node moments-test.js [--dir <variants klasörü>]`.

## 8. Oyuna eklerken (Ömer kararı 2026-10-22)
- **Edge'ler (ea / eb) birbirini dışlar:** satırda yalnızca bir yön seçilir; biri alınınca öbür yön (edge + notable + blood price) kilitlenir, geri alınınca açılır. Mockup'a uygulanmadı, yalnızca oyunda böyle olacak.
- Hesap: tek yönle satır evolve öncesi 20 puan (3+5+5+1+3+1+1+1). Evolve I için sayaç 23 kalır; odaklı oyuncu 3 puanı başka satırın Tier I filler'larına koyar, evolve yine L25. Evolve II yine L40. Kilit sayıları değişmez; Focus check ve testler bu kurala göre yazılır.
