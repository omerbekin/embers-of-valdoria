## Redtithe step1 v3: ortası (content-designer, 2026-11-21)
Ömer (2026-11-21, step1 v2 41344805 için): "Sopa yutmuş gibi oldu şimdi. ikisinin ortası olsun. diğer karakterlerin aynı pozunu referans al".

### Referans ölçüsü (`_meas.mjs`, `_meas2.mjs`; step1 eksi idle1)
Eğim = baş bandı (figürün üst %10'u) ağırlık merkezi ile kalça (figürün %42-48'i, en uzun opak koşu) arasındaki açı. Mutlak değerler pelerin/çan yüzünden kirli, yalnız FARK kullanıldı.

| Sınıf | Gövde eğimi farkı | Baş, kalçaya göre öne (px) | Baş tepesi (px, + = alçalır) | Omuzlar |
|---|---|---|---|---|
| Warrior | +7,5° | +20 | +6 | ön omuz öne döner, arka kol geri |
| Cutthroat | +7,6° | +26 | -14 | aynı |
| Defender | +6,7° | +21 | -22 | aynı |
| Paladin | +9,4° | +28 | -21 | aynı |
| Archer | +11,2° | +34 | +1 | aynı, en koşucu |
| Redtithe ilk deneme | +8,4° | +21 | +16 (baş çöküyor) | |
| Redtithe v2 | -0,3° | -1 | +5 | |
| **Redtithe v3** | **+5,4°** | **+14** | **+5 (v2 ile aynı)** | |
Sonuç: öbürleri gövdeyi kalçadan öne verir, baş tepesi alçalmaz. İlk denemenin eğimi doğruydu, kusuru başın çökmesiydi; v2 eğimi tümden sildi. Hedef: +4..+7°, baş v2 yüksekliğinde, boyun omurgayla aynı çizgide.

### Adaylar (`raw/`, birleştirme `compose.mjs`)
- A (girdi ilk deneme, "eğimi koru, başı kaldır"; PROMPT-A.md): baş tepesi 39-41, ilk denemeyle neredeyse aynı, elendi.
- B (girdi v2, "kalçadan ~6° öne"; PROMPT-B.md): B-1 +12,6° (üst sınır, baş tepe 40), B-2 kambur, elendi.
- C (girdi v2, "~4°, baş yüksekliği aynı, ilk denemenin tersi"; PROMPT-C.md): **C-1 SEÇİLDİ**: +5,4°, baş tepesi 30 (v2), yüz önü 276 (v2 258, ilk deneme 281); boyun görünür ve eğimle aynı çizgide; yumruklar v2'ye göre (1,1) / (0,0) kaydı, çapa noktaları değişmedi. C-2 temiz, +9,6° / baş kalçaya göre +25 px / baş tepe 34 (öbür sınıflar aralığında); baş ölçüsü C-1 ile aynı (bant genişliği +4 px). Ömer v3'ü hâlâ dik bulursa hazır bir adım ileri seçenek. v3 bilerek referans aralığının altında ("ikisinin ortası").
- D (girdi A-2, "başı 6 px kaldır"; PROMPT-D.md): D-2 iyi ama baş tepe 34, ön yumruk (-4,5) kaydı; yedek.
Denetim (2-5x kırpımlar): baş/boyun, iki kol, kemer ek yeri, kuşak ucu. compose.mjs v3 farkı: arka kol kutusu kuşak ucunu almaz (x>=135, y>=212), C-1'de kuşak kenarında çentik bırakıyordu.

Oyunda: `assets/poses/antimage-v2/step1.png` = `step1.png` (= cand-C-1). v2 yedeği `_old-2026-11-21/step1-v2/`.
Karşılaştırma `karsilastirma.png` (`karsilastirma.mjs`); oyunda yakalama `capture.mjs` (gerçek BattleScene, sessiz, idle1 > step1 geçişi 1/60 sn adımlarla).
