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
- **Whirlwind:** ilk iki düşman sırasını süpürür (ön sıra + arkasındaki; Ömer 2026-10-20, rect 2x3); verdiği hasarın bir kısmı Warrior'a can olarak döner (lifesteal). (Ömer notu: skill'ler değiştirilmedi, Whirlwind'e ek yapıldı.)
- **Ultimate - Headsman's Blow (Abyssal Cry'ın yerine):** yakın dövüş tek hedef; bütün Rage'i (en az 30) tek dev balta darbesine harcar. Hasar harcanan Rage ile ve hedefin eksik canıyla büyür: "şimdi 30 Rage ile mi vursam, 50'ye kadar bekleyip kafasını mı alsam?"
- Görsel/ses şimdilik yer tutucu (Double Strike animasyonu, Warrior'ın balta/zırh sesleri); gerçekleri content-designer yapacak. Sayılar balance-tester'ın.

## Paladin (Ömer 2026-10-24; open-questions madde 416)
- **Ultimate - Radiance:** yeniden 0.9.8 öncesi davranış: TÜM dostlara şifa (eksik cana göre +%50'ye kadar) + TÜM düşmanlara kutsal hasar, zemin yok. D11 tek hücre / Holy Ground sürümü (madde 406) geri alındı. Sayılar `data/skills.json > radiance`.
- **Judgment:** TEK hücre, iki tahtaya da atılabilir (Ömer 2026-10-24, madde 416/8). Düşman hücresine: anlık kutsal hasar (INT 0,35) + 2 tur Holy Fire (INT 0,45/tur). Dost hücresine: anlık şifa (INT 0,35) + 2 tur Holy Ground şifa zemini (INT 0,45/tur). Sayılar provizyon.
- **Divine Light:** şifa %35 INT. Evolve **Crusader's Dawn:** her tur hem en yaralı dosta şifa hem en zayıf düşmana smite, ikisi de %25 güçlü (smite gerçekleşen şifadan bağımsız); öldürünce 5 MP.

## Anti-Mage: Ley Brand (Ömer 2026-10-27; open-questions madde 444)
- **Ley Brand (2. skill, Drain Field'ın yerine; skill id `drain_field` AYNI kaldı):** aynı 3x3 alan, menzil 4, 14 MP, 3 tur bekleme; hasar ve isabet zarı yok. Alandaki her düşman 3 tur **Branded** olur.
  - MP havuzu OLMAYAN düşman (maks MP 0) maks canının %20'si kadar **tainted mana** alır, dolu başlar. Bu manayı harcayamaz, MP yenilenmesi almaz. Mana Steal çalar, Spell Ward yakar, Void Strike eksik manayı sayar. Brand bitince (süre, dispel, ölüm) havuz silinir.
  - MP havuzu OLAN düşmanın MP bedelleri %50 daha yüksek (yukarı yuvarlanır); mana eklenmez. MP'si 0'da duran MP'li düşman da tainted mana ALMAZ.
  - Branded birimin yakılan / çalınan her MP'si, kaybedilen MP'nin %50'si kadar büyü hasarı verir (kaynak yakan; kritik ve isabet zarı yok, büyü zırhı işler).
  - Süre doğal bitince kalan tainted mana'nın %50'si damgalayandan patlar (damgalayan ölmüş olsa da).
  - Boss'lar da Branded olur (CC değil). Yeniden atış süreyi tazeler, havuzu doldurmaz.
- **Silence** artık skill'de yok; ağaçta **Hush of the Brand** düğümüyle geri gelir (manası yakımla 0'a inen Branded düşman 1 tur Silence).
- **Ağaç satırı (sürüm 2, bedava respec):** Deep Taint (havuz rank başına +maks canın %2'si), Searing Brand (yakım hasarı +%5 / rank), Heavy Toll (bedel +%5 / rank), Hush of the Brand, Bitter Burst (patlama +%10 / rank), Focused Brand (merkez hücredeki düşmanın havuzu %50 büyük), Wider Brand (alan 3x4), Lasting Brand (+1 tur), Narrow Brand (yalnızca merkez hücre; havuz %40, bedel 2 katı), Thin Brand (6 MP ucuz, 1 tur kısa), Searing Grasp (Brand maks MP'nin %15'ini de yakar), kapanış **Spreading Brand** (doğal bitişte Brand bitişikteki Brand'siz düşmana bir kez sıçrar). Bar: Wide Basin (damgalanan düşman başına takıma 1 MP).
- Tüm sayılar `data/skills.json > drain_field` ve `data/skill-trees/antimage.json` içinde, PROVİZYON, sim yapılmadı. Görsel / ses Drain Field'ınki; durum ikonu yer tutucu.

Bu dosyadaki tüm sayılar ve rol önerileri Ömer onaylayana kadar **geçicidir**.
