> Ne için: `docs/design/art-v2.md` belgesinden 2026-11-08'de taşınan tarihçe (eski §7 Warrior örneği ve eski görsel rehber); güncel değil.

## 7. ÖRNEK (silinecek)

Altyapıyı uçtan uca kanıtlamak için Warrior'ın ilk skill'ine (Double Strike) çok basit bir örnek kondu; hepsi
`ÖRNEK (EXAMPLE)` yorumuyla işaretli. **Warrior'ın v2 tasarımcısı bunları siler ya da üzerine yazar:**
- `src/game/art-v2/warrior/icons.ts`: `ICONS.sword` (128x128 kılıç) ve `SPRITES.example_spark` (96x96 parıltı),
- `src/game/art-v2/warrior/vfx.ts`: `VFX.doublestrike` (v1 efektini oynatır + hedef üstünde v2 parıltı + `exampleClang` sesi),
- `data/audio-v2/warrior.json`: `axeChop` (v1 adıyla, biraz daha pes kopya) ve `exampleClang` (v2'ye özgü yeni ad), `_example` notu.
Testler örneğe bağlı DEĞİLDİR (kendi geçici içeriklerini enjekte eder); örneği silmek ya da üzerine yazmak hiçbir testi kırmaz.
Örneği görmek için: debug > Versions > Warrior = v2, sonra Double Strike (ya da `gallery.html?embed=1&skill=melee_attack&ver=v2`).

## Eski görsel rehber (eski art.md; palette.json henüz YOK, yalnız öneri)
- Stil: pixel art, yandan görünüm.
- Oyun çözünürlüğü **1920x1080 (HD)** (Ömer kararı, 2026-10-04). Karakterler ekranda yaklaşık 140x200 piksel yer kaplar (`data/battle-layout.json` > `characterSize`). Sprite kaynak boyutu açık soru (bkz. open-questions-archive 12).
- Palet: tek sabit palet kullanılır (öneri: 32 renk; ilk iş Ömer onayıyla `assets/palette.json` oluşturulur).
- Animasyon seti: `idle`, `attack`, `cast`, `hit`, `death`, `defend`. Hepsi yatay sprite sheet, kare başına sabit boyut.
- Arka planlar: 1920x1080; oranı farklı görsel ekranı kaplayacak şekilde ölçeklenir, taşan kenar kırpılır. Dosya: `assets/backgrounds/<id>.jpg/png`. 2-3 katman parallax (opsiyonel).
- Placeholder aşaması: class rengine boyalı basit blok karakter. Gerçek sprite aynı dosya adıyla gelince otomatik değişir.
- UI: pixel fontlu, büyük dokunma hedefleri, yatay ekrana göre yerleşim.
