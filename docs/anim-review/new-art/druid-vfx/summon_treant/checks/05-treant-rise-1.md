KALDI
PUAN: 6

- **Hücre sınırları:** 3–4. karelerin tabanı alt sıraya taşıyor; 7–8. hücrelerin üst kenarında önceki sıranın pikselleri görünüyor. Her kareyi kendi hücresine tamamen sığdır; dört yanında en az 12 px tam şeffaf boşluk bırak.
- **Zemin sabitliği:** 4→5 geçişinde taban hücre içinde yaklaşık 38 px yukarı sıçrıyor. Sekiz karenin zemin temasını aynı yerel Y koordinatına hizala.
- **Son kare:** 8. karede kökler ve toprak hâlâ belirgin ve opak; sönmekte olan kalıntı görünümü oluşmuyor. 6→7→8 boyunca köklerin, toprağın ve ışığın opaklığını kademeli azalt; son kareyi ince, yarı saydam kalıntıya dönüştür.
- **Alfa temizliği:** Hücre kenarlarında çok düşük opaklıklı artık pikseller var; sağ alt köşe de tamamen şeffaf değil (alfa 1). Boşlukları ve bütün köşeleri alfa 0 yap.