# Skill ağacı v2: 10 GERÇEK varyant (2026-10-20)

Ömer'in düzeltmesi (2026-10-20): "10 varyasyondan kastım skilleri değiştirmesiydi. Skill diziliminde de özgür bırakmıştım ama hepsi 5-1-3-orta büyük-evolve yapısında." Yani varyantlar **düğüm İÇERİĞİ** ve **DİZİLİŞ** bakımından farklı olmalı. Görsel sunum tek ve ortak (Classic görünüm). Yeni kural: **"Skiller tierla açılacak. Her skill her zaman verilemeyecek."** Düğümler tier'larla açılır, her düğüm her an alınamaz.

Eski tur (`skill-tree-mastery.md`, `mockups/skill-mastery.html`) referans olarak durur. Oradaki düğüm adları ve ilk turun beğenilmeyen Warrior adları (`skill-tree-structures.md`: Heavy Hands, Blood Rhythm, Bleeding Gale, Maelstrom, Frenzy, Juggernaut, Unbroken...) **tekrar kullanılmaz**. Sayılar provizyondur (balance-tester sonra bakar). Oyun içi metin İngilizce, notlar Türkçe.

## 1. Değişmez çerçeve (bütün varyantlar)
- Üstte **Mastery bar** var, ağaca harcanan toplam puanla dolar. **5 / 10 / 15 / 20 / 25** eşiklerinin her biri sabit bir bonus verir. Bonuslar sınıfa özeldir ve varyantın temasına göre yeniden yazılır.
- Altta **5 satır** var: pasif + 4 skill (Warrior: Berserker, Double Strike, Whirlwind, Charge, Headsman's Blow; Hexer: Ill Omen, Evil Eye, Withering Curse, Jinx, Doom Mark).
- Düğüm türleri: **Filler** (3 ya da 5 rank), **Edge** (hafif güçlü), **Major** (büyük), **Evolve**. Her rank / düğüm **1 puan**.
- Puan = level − 1 (L30 = 29). **Evolve yalnızca L30'da açılır, karakter başına 1 tane.** Skill değişmez, yeni aktif skill eklenmez; evolve mevcut skill'i yerinde evriltir.
- **Tier:** her düğümün bir tier'ı vardır. Tier'ın kilidi varyanta göre açılır: level / bar (toplam harcanan) / satır puanı / pasif puanı. Kilitli tier'daki düğüme puan konamaz.
- Ayrım kuralı: item = genel stat, set = pasif / kaynak sayısı, ağaç = skill davranışı. Ağaçta ve bar bonuslarında düz genel stat (HP, STR, Armor %) ve kaynak tavanı (+10 Rage cap gibi) **yoktur**. Skill'e özel sayı olabilir (ör. "Whirlwind +3% power").
- Yeni stat tavanı konmaz (organik denge, bedel ile). Motorda yeni kural gerektiren düğüm `[NEW]` rozetini taşır. Mümkünse mevcut mekanik ve durumlar kullanılır (`data/statuses.json`).
- L50 sonra gelecek. Bu turda sadece not olarak durur.

## 2. 10 varyant
Notasyon: `id TÜR tier sütun şerit gerek`. Şerit: −1 üst, 0 orta, +1 alt (yarım değerler olabilir). `gerek`: liste VE ile bağlanır; `a|b` = a ya da b (en az 1 rank). `excl:G/x` = aynı satırda G grubunda yalnızca bir taraf (x) puan alabilir; seçilince diğerleri kilitlenir. Ayrıca tier kilidi her zaman geçerlidir.

### V1 Two Paths: İki Yol
- **İçerik:** her skill iki oyun tarzına ayrılır (ör. Double Strike: Rage yolu / Precision yolu; Evil Eye: Omen yolu / Crit yolu). Seçilen yol o satırın kimliği olur. Her yolun kendi Evolve'u vardır, ikisi de aynı skill'in farklı yönde evrimidir.
- **Tier (level):** I L1 · II L8 · III L16 · E L30
- **Satır:** `t F3 I c0 0 -` · `ua E II c1 -1 t excl:path/u` · `ub F3 II c2 -1 ua excl:path/u` · `um M III c3 -1 ub excl:path/u` · `uv V E c4 -1 um excl:path/u` · `la E II c1 1 t excl:path/l` · `lb F3 II c2 1 la excl:path/l` · `lm M III c3 1 lb excl:path/l` · `lv V E c4 1 lm excl:path/l`
- Bir yol dolu 9 puan, 5 satır 45. Şerit etiketleri içerikte verilir (`lanes: {u, l}`).

### V2 Bonds: Bağlar
- **İçerik:** skill'ler birbirini besler. Satırlar kısadır; asıl güç satırlar arasındaki **köprü** düğümlerindedir (ör. "Charge'ın sersemlettiği hedefe sonraki Double Strike..."). Bar bonusları "farklı skill'leri sırayla kullanma" temalıdır.
- **Tier (bar):** I bar 0 · II bar 4 · B (komşu köprü) bar 10 · III bar 15 · E L30
- **Satır:** `a F5 I c0 0 -` · `e E II c1 0 a` · `m M III c2 0 e` · `v V E c3 0 m`
- **Köprüler:** `b01 E B 0↔1 gerek 0.e,1.e` · `b12 E B 1↔2 gerek 1.e,2.e` · `b23 E B 2↔3 gerek 2.e,3.e` · `b34 E B 3↔4 gerek 3.e,4.e` · `b13 M III 1↔3 gerek 1.m,3.m` · `b24 M III 2↔4 gerek 2.m,4.m`
- Toplam 5×8 + 6 = 46. Komşu köprüler iki satırın arasındaki boşlukta, uzak köprüler sağdaki "Bonds" sütununda iki satıra çizgiyle bağlı durur.

### V3 Blood Price: Bedel
- **İçerik:** her Edge ve Major hem kazanç hem bedel taşır ("+35% damage, cooldown +1"; "no MP cost, costs 6% of max HP"). Omurga filler'ları bedelsiz ve küçüktür. Denge bedelle kurulur.
- **Tier (level):** I L1 · II L10 · III L20 · E L30
- **Satır (omurga + dikenler):** `s1 F3 I c0 0 -` · `p1 E I c0 -1 s1` · `s2 F3 II c1 0 s1` · `p2 M II c1 1 s2` · `s3 F3 III c2 0 s2` · `p3 E III c2 -1 s3` · `p4 M III c2 1 s3` · `v V E c3 0 s3,p2|p4`
- Satır 14, toplam 70.

### V4 Few Big Choices: Az ama Büyük
- **İçerik:** filler azdır. Her satırda büyük seçim var: 3 Major'dan 1'i, sonra 2 Edge'den 1'i. Her düğüm skill'i belirgin şekilde değiştirir. Kimlik seçimlerden gelir.
- **Tier (level):** I L1 · II L6 · III L15 · E L30
- **Satır:** `f F5 I c0 0 -` · `ma M II c1 -1 f excl:maj/a` · `mb M II c1 0 f excl:maj/b` · `mc M II c1 1 f excl:maj/c` · `ea E III c2 -0.5 ma|mb|mc excl:edg/a` · `eb E III c2 0.5 ma|mb|mc excl:edg/b` · `v V E c3 0 ea|eb`
- Satır 8 alınabilir, toplam 40.

### V5 Long Ladder: Uzun Merdiven
- **İçerik:** çok sayıda küçük adım var; bir skill'e derin giden oyuncu "uzman" olur. Her basamak küçüktür, her tier sonunda bir ödül gelir.
- **Tier (satır puanı = o satıra harcanan):** I 0 · II 4 · III 8 · IV 14 · E L30
- **Satır (düz zincir):** `n1 F3 I c0` · `n2 E I c1 n1` · `n3 F3 II c2 n2` · `n4 E II c3 n3` · `n5 F5 III c4 n4` · `n6 M III c5 n5` · `n7 F3 IV c6 n6` · `n8 M IV c7 n7` · `v V E c8 n8`
- Satır 19, toplam 95. 29 puanla bir satır sonuna kadar gider, kalan ~10 puan başkasına kalır.

### V6 Moments: Anlar
- **İçerik:** her düğüm belirli bir anda çalışır: savaşın ilk turu, can %50 altı, öldürme sonrası, müttefik düşünce, tek düşman kalınca, ön / arka sıra, hedefte durum varken. Her satır farklı anlara yayılır.
- **Tier (level):** I L1 · II L8 · III L18 · E L30
- **Satır (dallanan ağaç: 1 → 2 → 4):** `r F3 I c0 0 -` · `ea E II c1 -1 r` · `eb E II c1 1 r` · `ma M III c2 -1.5 ea` · `fa F3 III c2 -0.5 ea` · `fb F3 III c2 0.5 eb` · `mb M III c2 1.5 eb` · `v V E c3 0 ma|mb`
- Satır 14, toplam 70.

### V7 Momentum: İvme
- **İçerik:** savaş içinde birikir: aynı skill art arda kullanıldıkça güçlenir, tur sayısıyla büyür, yük harcayıp patlatır. Bar bonusları da yük temalıdır.
- **Tier (bar):** I bar 0 · II bar 5 · III bar 10 · IV bar 15 · E L30 (tier çizgileri barın eşik işaretleriyle aynı dili konuşur)
- **Satır (elmas):** `f1 F3 I c0 0 -` · `ea E II c1 -1 f1` · `eb E II c1 1 f1` · `m M III c2 0 ea|eb` · `f2 F5 IV c3 0 m` · `v V E c4 0 m`
- Satır 12, toplam 60.

### V8 Reach: Menzil ve Şekil
- **İçerik:** üst şerit hedeflemeyi değiştirir: alan büyür ya da şekil değişir, ek hedef, sıraya ulaşma, delme, itme / çekme, yer değiştirme, sekme. Alt şerit gücü artırır. İki şerit de alınabilir.
- **Tier (level):** I L1 · II L9 · III L18 · E L30
- **Satır (iki paralel şerit, tek Evolve):** `s1 E I c0 -1 -` · `s2 E II c1 -1 s1` · `sm M III c2 -1 s2` · `p1 F5 I c0 1 -` · `p2 F3 II c1 1 p1` · `pm M III c2 1 p2` · `v V E c3 0 sm|pm`
- Şerit etiketleri: `lanes: {u: 'Shape', l: 'Power'}`. Satır 13, toplam 65.

### V9 Marks: Damga (Uygula → Büyüt → Tüket)
- **İçerik:** durum ekosistemi. T1 durum uygular ya da uzatır, T2 durumu güçlendirir, T3 Major'ları durumu TÜKETİP büyük etki yapar. Warrior mevcut durumlar (Stun, zırh kırma vb.) üstünden, Hexer Omen / Wither / Jinx üstünden çalışır.
- **Tier (satır puanı):** I 0 · II 2 · III 5 · E L30
- **Satır (tier içinde serbest):** `a1 F3 I c0 -1 -` · `a2 E I c0 1 -` · `b1 F3 II c1 -1 -` · `b2 E II c1 1 -` · `c1 M III c2 -1 - excl:con/a` · `c2 M III c2 1 - excl:con/b` · `v V E c3 0 c1|c2`
- Satır 10 alınabilir, toplam 50.

### V10 Warband: Takım (pasif omurga)
- **İçerik:** skill'ler takıma da hizmet edebilir: müttefiki koruma, müttefike Rage / MP verme, hedefi takım için işaretleme, öldürünce takımı iyileştirme. Her skill satırında "kendin mi, takım mı" seçimi var.
- **Tier (pasif puanı = pasif satırına harcanan):** pasif satırı her zaman açık (tier P) · skill satırlarında I 0 · II pasif 3 · III pasif 6 · E L30
- **Pasif satırı:** `p1 F5 P c0 0 -` · `p2 E P c1 0 p1` · `p3 F3 P c2 0 p2` · `p4 M P c3 0 p3` · `pv V E c4 0 p4`
- **Skill satırı:** `f F3 I c0 0 -` · `es E II c1 -1 f excl:side/s` · `et E II c1 1 f excl:side/t` · `m M III c2 0 es|et` · `f2 F3 III c3 0 m` · `v V E c4 0 m`
- Şerit etiketleri: `lanes: {u: 'Self', l: 'Warband'}`. Pasif 11 + 4×9 = 47.

Tier kilidi dağılımı: level (V1, V3, V4, V6, V8), bar (V2, V7), satır puanı (V5, V9), pasif puanı (V10).

## 3. Veri biçimi (mockup)
Sayfa: `public/mockups/skill-mastery-v2.html` + `public/mockups/skill-mastery-v2/`. Şekiller (yukarıdaki notasyon) ui-dev'in `shapes.js` dosyasında. İçerik her varyant için ayrı dosyada: `skill-mastery-v2/data/vN.js`:

```js
(window.SMV_DATA = window.SMV_DATA || {})[1] = {
  w: {
    mastery: 'Fury Mastery',
    bar: [['Name', 'Effect'], ['Name', 'Effect'], ['Name', 'Effect'], ['Name', 'Effect'], ['Name', 'Effect']], // eşik 5,10,15,20,25
    rows: [ // 0 pasif, 1-4 skill (yukarıdaki sırada)
      { lanes: { u: 'Rage', l: 'Precision' },           // yalnızca şeritli varyantlarda (V1, V8, V10)
        n: { t: ['Name', 'Effect text'], ua: ['Name', 'Effect text', 1] /* 3. eleman 1 = [NEW] */ } },
      // ...
    ],
    bridges: { b01: ['Name', 'Effect'] /* ... yalnızca V2 */ },
  },
  h: { /* aynı biçim */ },
};
```
- Ad en çok ~22 karakter, etki metni en çok ~100 karakter, İngilizce, düz cümle. Filler metni rank başına değeri söyler ("+4% power per rank").
- Satırdaki her şekil id'si için içerik bulunur. Eksik içerik sayfada yer tutucu olarak görünür.
