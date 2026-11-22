## Redtithe step1 v4: tam beden koşu adımı (content-designer, 2026-11-21)
Ömer (v3 için): "Öbürleri gibi koşu adımı olarak baştan çiz". Kemer altı kısıtı kalktı.

Yöntem: image-edit, girdi R2 idle1 (`refs/redtithe-idle1.png`) + poz örneği Archer step1 / Cutthroat step1 (yalnız poz). İstem `PROMPT.md`, iş listesi `list.json` (4 aday, ilk deneme kota yüzünden 5 saat bekledi). `fit.mjs`: figür boyu 380 (idle1 ile aynı), ayak tabanı y405 (box alt = footY 406), kutu ortası tuval ortası +15 (öbür sınıfların step1 kutusu 15-25 px önde). Yüz boyu ölçüsü (deri bölgesi) idle1 98 px, adaylar 95-99: ölçek tutuyor.

Ölçü (`../redtithe-step1-v3/_meas.mjs`, mutlak eğim baş-kalça): idle1 2,2°; Archer step1 26,7°, Cutthroat 27°; adaylar 23,8-26,7°. Baş tepesi 26 (idle1 25): baş çökmüyor. Baş kalçanın 67-76 px önünde (Archer 77, Cutthroat 80).

Adaylar (kırpımlar: baş/boyun, iki kol, kol-gövde, iki bacak, ayak-zemin):
- **arc-2 SEÇİLDİ** (Archer örneği): iki yumruk açıkta ve net (ön yumruk göğüs önünde dik, arka yumruk geride), arka çizme havada, ön diz bükülü, ön çizme tabanı düz yerde; yüz/örgü/kıyafet/kâse R2 ile aynı.
- arc-1: ön yumruk yeleğin üstüne biniyor (hançer gövdeye girer), elendi.
- cut-1, cut-2 (Cutthroat örneği): temiz, yedek; cut-2'de ön yumruk tuval kenarına yakın.
Çapa (`data/poses.json > antimage_v2.step1`): anchor (arka yumruk ortası) 140,165 açı 35; offhand (ön yumruk ortası) 351,144 açı 10; box 111,26,258,380.
Oyunda (`capture.mjs`, gerçek BattleScene, sessiz, 1/60 sn adım): idle1 > step1 > idle1; hançerler iki yumrukta, ayak halkada, sıçrama yok (geçişte oyunun kısa hayalet karesi var).
Karşılaştırma `karsilastirma.png` (`karsilastirma.mjs`).
