> Ne için: design/skill-tree-moments.md belgesinden 2026-11-08'de taşınan eski "7. Mockup" bölümü (2026-10-21 varyant seçimi tarihçesi); güncel değil.

## 7. Mockup
`public/mockups/skill-tree-moments.html` (+ `skill-tree-moments/`). Ev sahibi sayfa: **11 class × 5 varyant** (sıra: warrior, defender, paladin, archer, cutthroat, mage, druid, undead, hexer, antimage, gambler; Warrior'da ek olarak "Ömer's pick" sekmesi ve varsayılan). Class ve varyant seçilince puanlar sıfırlanır. İçerik `variants/<class>.js` dosyalarından gelir (sözleşme: `skill-tree-moments-variants.md` bölüm 3), class seçilince yüklenir; dosya yoksa ya da bozuksa sayfa "Variants coming" gösterir. Satır adları dosyadaki `rows[]` / `ult`ten, ikonlar `classes.js` + `ic/<class>/` (oyundaki v2 ikonlar ve portreler, sıraya göre: pasif, 3 aktif, ult).
- Adres: `#c=<class>&v=<1-5|pick>&lv=30` (+ `&focus=A-B`, `&clean`). Eski adresler: `#c=w` = Warrior (Ömer'in seçimi), `#c=h` = Hexer v1.
- Ekran (Ömer düzeltmeleri 2026-10-21 gece): tier başlık bandı (Tier I … Evolve I) yalnızca ağacın en üstünde TEK sefer, kolonlar tüm satırlarla hizalı; Mastery bar altında tier yazısı ve evolve çentiği yok (yalnızca bonus elmasları + hover ipucu); sayaç ve bar = pasif + 3 aktif (ult ayrı).
- Warrior "Ömer's pick": `picks-warrior.js` (boş yuva = "Open slot"), Mastery adı ve bar eski V6 Moments'tan (`content.js` içinde sabit).
- Eski geçici Hexer eşlemesi (V3/V5/V6/V7/V8) kaldırıldı; Hexer artık kendi 5 varyantıyla gelir.
- Test (scratchpad, teste eklenmez): `node moments-test.js [--dir <variants klasörü>]`.
