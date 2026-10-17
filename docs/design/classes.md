# Class'lar (TASLAK — Ömer'in vereceği çerçeveye göre yeniden yazılacak)

İlk dikey dilim için **Warrior** ve **Paladin** yeterli. Diğerleri sonra eklenir.

| Class | Rol | Kimlik (öneri) | Kaynak |
|---|---|---|---|
| Warrior | Ön saf, hasar + dayanıklılık | Yüksek HP/DEF, taunt, güçlü tek hedef | Öfke |
| Paladin | Destek-tank | Şifa, kalkan/koruma, undead'e karşı bonus | Kutsal güç (MP) |
| Undead | Lanet/yıpratma | Düşük HP, zehir/lanet, kendi canını kaynak yapar | Can/lanet |
| (4. class) | ? | Ömer'e sorulacak: okçu/büyücü/hırsız? | ? |

## Kurallar
- Her class `data/classes/<id>.json` dosyasıdır: baz statlar, level başı büyüme, skill listesi, sprite id.
- Her class'ın 1 net güçlü yanı, 1 net zayıf yanı olmalı.
- Hız değerleri class kimliğinin parçasıdır (ör. Warrior orta, Undead yavaş ama hız-manipülasyonu yapabilir).

## Warrior: "Berserker" (Ömer onayı 2026-10-17, wr1; open-questions madde 338)
- **Kimlik:** kalkansız, iki elli baltayla dalan, kanla beslenen gözü kara savaşçı. Dalar, kan kaybeder, kanla geri döner ve bitirir.
- **Pasif - Berserker:** canı azaldıkça daha sert vurur (eski kural) **ve** can kaybettikçe Rage kazanır (Rage artık yalnızca vurarak gelmiyor).
- **Double Strike:** aynı (Rage üretir). **Charge:** aynı (arka sıraya atılma + Stun).
- **Whirlwind:** ön sırayı süpürür; verdiği hasarın bir kısmı Warrior'a can olarak döner (lifesteal). (Ömer notu: skill'ler değiştirilmedi, Whirlwind'e ek yapıldı.)
- **Ultimate - Headsman's Blow (Abyssal Cry'ın yerine):** yakın dövüş tek hedef; bütün Rage'i (en az 30) tek dev balta darbesine harcar. Hasar harcanan Rage ile ve hedefin eksik canıyla büyür: "şimdi 30 Rage ile mi vursam, 50'ye kadar bekleyip kafasını mı alsam?"
- Görsel/ses şimdilik yer tutucu (Double Strike animasyonu, Warrior'ın balta/zırh sesleri); gerçekleri content-designer yapacak. Sayılar balance-tester'ın.

Bu dosyadaki tüm sayılar ve rol önerileri Ömer onaylayana kadar **geçicidir**.
