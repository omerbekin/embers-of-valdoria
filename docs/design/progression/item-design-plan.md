# Item Design planı ve kararlar (Ömer 2026-11-01)

Sahip: Item Design sohbeti. Form: https://claude.ai/artifact/4NRvdHvZtQZEesdVuYU4J2 (db `picks/main`). Bu belge `items.md` ile çelişirse bu belge geçerlidir; iş bitince `items.md` güncellenir.

## Sıra (A1)

1. Affix ölçüm aracı (her affix'in gerçek güç değeri)
2. Trinket yuvası
3. Affix dağılımı
4. Affix dengesi
5. Set sistemi ve iki pilot set
6. Kalan setler, yeni tabanlar, sanat
7. Son denge, mob telafisi

## Trinket yuvası

- **T1:** Ring kalıcı güç verir (ana stat, MP, regen, hasar). Trinket koşullu güç verir (savaş başı, öldürme, düşük can, destek). Yeni kural yok, mevcut affixler paylaşılır.
- **T2:** Cursed item'ler 1.0 sonrasına kaldı.
- **T3 (2026-11-01 güncel):** Yuvalar Ring ve Trinket, ayrı Kolye yuvası yok. Bugünkü item'lerin görselleri yeniden hazırlanıp Ring olarak düzenlenir, uygun olanlar Trinket'te kullanılır. Hangisinin nereye gideceği dağılım formunda: https://claude.ai/artifact/M3NZHgxKLbjCAuLpp9SC3g. Eski kayıtlardaki takılar aynı kurala göre taşınır, hiçbir item kaybolmaz.
- **T4:** Fazladan yuvanın gücü ölçülür, mob can ve hasarıyla telafi edilir.
- **T5 (yeni kural onaylı):** Yuva baştan açık değil, seferde Harita 2'de bir yerde açılır; yer dağılım formunda bekliyor. Harita 1'de Trinket düşmez, tüccarda da çıkmaz. Endless'ta yuva baştan açıktır.

## Bekleyen kararlardan gelenler (2026-11-01)

- **Yetişme bonusu:** Şimdi yok. Set düşüş oranları ölçülünce gerekirse eklenir.
- **Oynanmayan sınıf:** Yalnız kadrodaki sınıfların setleri düşer.
- **Sadak ve Focus Orb:** 6. adımda yeni eşya olarak yapılır; imza stat'ları da onlarla gelir.
- **Warrior çift el:** Maces ailesine Legendary olmayan çift el silahlar eklenir, yeni ikonlarla. Ölçüm: seviye 4'ten sonra Warrior silah düşüşlerinin %36'sı çift el.

## Affix dağılımı

- **D1:** Yuva kimlikleri formdaki tablodaki gibi; tam tablo adım 3'te Ömer'in onayına gelir.
- **D2:** 6 element direnci tek çekiliş hakkı: önce "direnç" çıkar, sonra element seçilir.
- **D3:** Her yuvada çıkan 6 A affix (Primary, All attributes, Recovery, Swift ultimate, Immunity, Endurance) 2-3 yuvaya iner. Ömer'in 2026-10-13 "her yuvada" kararının yerine geçer.
- **D4:** Sınıfa uygun affix ağırlığı (2 kat) B ve A kademelerine de yayılır, hiçbir affix tamamen kapanmaz.

## Affix dengesi

- **B1:** İki tur ölçüm: 75 affix'in hepsi ön saf, arka hasar ve destek kahramanında kaba tarama, sonra uçlara uzun ölçüm; sefer ve Endless. Her simden önce Ömer'e sorulur.
- **B2:** Seviyeyle büyümede yalnız ölçümde uç çıkanların eğimi kısılır.
- **B3:** Yeni tavan yok, eski tavanlar kalır. Fazla güçlü olanın değeri ve ödünleşmesi değişir.
- **B4:** Gold find (`c_gold`) ve Experience (`c_xp`) item'lerden kalkar. Altın ve XP artışı ileride başka bir kaynaktan gelebilir (`future-ideas.md`).

## Set kuralları

- **S1:** 4 sınıf grubu seti ve 2 nötr set; önce 1 sınıf ve 1 nötr pilot oyunda denenir, sonra gerisi.
- **S2:** 3-4 parçalı setler olur, nötrler genelde daha az parçalı. Sınıf setleri 4 parça, iki nötr set 3 parça.
- **S3:** Set parçasının affixleri sabit C, C, B. Epic'in A'sı yok, yerine set bonusu var. Değerler seviye ve zarla.
- **S4 (yeni kural onaylı):** Küçük bonus ortak stat. Tam set bonusu sınıfa göre ayrı satır; ipucunda takana ait satır parlak.
- **S5 (yeni kural onaylı):** Belirli boss ya da elit belirli seti düşürür (asıl kaynak). Ek olarak normal savaşlarda, Legendary şansının %50'si kadar, o haritanın setinden bir parça düşebilir. Böylece parça için boss ya da eliti kesmek zorunlu değildir.
- **S6:** Temper olur, Reforge ve Combine olmaz.
- **S7:** Legendary ile set aynı kahramanda serbest. Kahraman başına 1 Legendary kuralı aynen.
- **S8:** Set item'leri Endless'ta düşmez; Endless'ta geriye dönük farm yok.

## Set içeriği (2. tur bekliyor)

Altı set de yapılacak: Ashguard Vigil, Raven's Shroud, Conclave of Embers, Gallows Pact, Kingsfall Regalia, Wayfarer's Oath. Ömer'in notları:

- Dört sınıf seti: parça sayısı 1 artar (3 yerine 4).
- Ashguard Vigil, Raven's Shroud: bonusların gücü artar.
- Gallows Pact: Hexer'in bonusu değişir.
- Kingsfall Regalia, Wayfarer's Oath: 3 parça bonusu değişir. Ömer: "tamamlanmış setler oyunda hiç olmayan eşsiz özellikler vermeli". Bu, sınıf setlerine de uygulanıp uygulanmayacağı 2. turda sorulur; önceki "set yalnızca pasif ve kaynak sayılarını büyütür" kuralı bununla birlikte yeniden yazılır.
