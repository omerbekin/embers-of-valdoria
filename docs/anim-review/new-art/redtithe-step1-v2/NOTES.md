## Redtithe step1 v2: dik duruş (content-designer, 2026-11-21)
Ömer (2026-11-21, step1 denemesi b5caed38 için): "new step pozunda boyun fıtığı gibi duruyor. Karakter birazcık dik dursun."

Yöntem: sıfırdan çizim yok. Taban = oyundaki step1 (b5caed38, `refs/base-step1-r2.png`); Codex imagegen EDIT (giriş taban, 2. görsel idle1 yalnız duruş referansı), istem `PROMPT.md`. 3 aday (`raw/step1-raw-1..3.png`).
`compose.mjs`: düzenlemeyi kemer altı + bacaklardan (maske dışı) tabana hizalar; maske içi (kemer üstü gövde, baş, örgü, iki kol + yumruklar, ön önkol kapsülü) TÜM pikselleri düzenlemeden alır, maske dışı tabanla bire bir aynı (outsideMaskDiff 0). Not: idle-v4'teki fark eşikli maske burada kullanılmadı (baş kendi üstüne kaydığı için yamalı sonuç verirdi). İlk maskede ön önkol kemer çizgisinde (y182) kesiliyordu, kapsül eklenince ek yeri kalktı.

Ölçüm (baş tepesi y; yüz önü x, baş tepesinden ~35 px aşağıda; idle1 = 25 / ~255):
- taban (eski deneme): 41 / ~280 (baş öne ve aşağı)
- aday 1: 37 / ~265; aday 2: 37 / ~261; aday 3: 30 / ~257
Yumruk kayması (şablon eşleme, tabana göre dx,dy): aday 1 arka (-1,3) ön (-3,3); aday 2 arka (0,3) ön (-2,2); aday 3 arka (-1,-1) ön (-4,-2).

Denetim (3x-4x kırpımlar: baş/boyun, iki kol, kemer ek yeri):
- Aday 3 SEÇİLDİ: baş 11 px yukarı, yüz 23 px geri; boyun görünür ve dik, baş omuz üstünde (idle1'e en yakın). Yüz 3/4, iki göz okunuyor. İki kol omuzdan yumruğa kesintisiz, yumruklar tabanla aynı boyda. Kemer/kese/kâse tabandan, ek yeri görünmüyor.
- Aday 1: temiz ama baş hâlâ biraz önde (yüz ~265).
- Aday 2: arka önkolun arkasından ikinci bir örgü kıvrımı çıkıyor (kalabalık), elendi.
Çapa noktaları (`data/poses.json` step1 anchor 111,191 / offhand 325,205) değişmedi: ön yumruk ~4 px kaydı, oyunda hançer yumrukta.
Oyunda: `assets/poses/antimage-v2/step1.png` = `step1.png` (= cand-3). İlk deneme yedeği `assets/poses/antimage-v2/_old-2026-11-21/step1-deneme1/`; mor paltolu asıl eski kare `_old-2026-11-21/step1.*` aynen duruyor.
Karşılaştırma `karsilastirma.png` (`karsilastirma.mjs`).
