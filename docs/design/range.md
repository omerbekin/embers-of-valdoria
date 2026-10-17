# Menzil sistemi (KARAR, Ömer 2026-10-17)

Kaynak: karar sayfası https://claude.ai/artifact/SrUJshshUCjRpyRkwcPykC (db `range/main`). Amaç: arka sıranın engelsiz vurulmasını bitirmek; dizilim, Move ve öne çıkma riski anlam kazansın.

## Tahta ve mesafe
- Her taraf 4 sıra x 3 şerit; iki taraf yan yana toplam 8 sıra.
- **Mesafe** = saldıranın kendi tarafındaki GERÇEK sıra derinliği (ön sıra 0 ... en arka 3) + hedefin derinliği + 1. Ön sıra ↔ ön sıra = 1; en arka ↔ en arka = 7.
- **Hedef tarafında boş ön sıralar sayılmaz** (hedefin derinliği, kendi tarafının en öndeki DOLU sırasından sayılır): düşman ön sırasını boşaltarak melee'den kaçamaz. Saldıranın tarafında boş sıralar sayılır: geride durmak menzil kaybettirir.

## Menzil kimde
- **Menzil temelde SINIFIN özelliğidir** (Ömer notu: "fundamental olarak sınıf"). Sınıfın taban menzili skill'lerine geçer; özel skill'ler istisna olarak kendi değerini taşıyabilir (ör. mızrak, gökten vuran). Skill kartında "Range N" yazar.
- İlk değerler (Ömer): melee 1, mızrak 2, **Archer 7**, **Mage 6**, Paladin 4 (1. ve 3. skill), Druid 4. Diğer sınıf ve skill'lerin değerleri tablo halinde Ömer'in onayına gelir (sınıf kimliği + sim).
- **Gökten / herkese vuran skill'ler** (Fist Crush, Radiance'ın düşman kısmı, Murder of Crows gibi) menzilsizdir; kartta "Global".
- **Charge ve Backstab da menzile bağlıdır** (Ömer: istisna yok).
- **Dost skill'leri (şifa, buff, kalkan) de menzil taşır**; bugünkü skill'lerde kısıtlanması gereken bir durum varsa öneri getirilir (Ömer'in tahmini: şimdilik yok).
- **Düşmanlar:** tüm mob skill'leri arketipe göre menzil alır (melee 1, mızrak 2, okçu/arbalet 6, büyücü 5, boss özel); tablo Ömer'in onayına gelir.
- **Tüm modlar** aynı kural (sefer, Endless, Quick Battle, çok oyunculu).

## Kural ayrıntıları
- **AoE:** menzil hedeflenen merkez hücreye bakar; alanın kenarı menzil dışına taşabilir.
- **Taunt:** yalnızca taunt eden menzildeyse zorlar; değilse saldıran menzildeki diğer hedefleri seçebilir.
- **Menzilde hedef yoksa:** skill gri olur; birim Move ile yaklaşır ya da başka skill seçer. YZ menzile girmek için konum almayı öğrenir.
- **Gösterge:** skill kartında "Range N" + skill seçilince ulaşılabilen düşman hücreleri parlar (ulaşılamayanlar soluk).

## Uygulama sırası
1. Motor kuralı + varsayılan menziller + testler.
2. YZ: menzile girmek için konum alma.
3. Gösterge ve skill kartı.
4. Sınıf/skill ve mob menzil tablosu (Ömer onayı).
5. TEK denge turu: menzil + level + item + Warrior + ulti değişiklikleri birlikte.
6. Sonra çağrılar (1 pasif + 2 aktif; "canlı kalkan" fikri pasif olarak).

## Onaylanan menzil tablosu (Ömer 2026-10-17, sayfa rangetable/main)
- **Sınıf tabanı:** Warrior 1, Defender 1, Cutthroat 1, Paladin 4, Druid 5 (Ömer 2026-10-17 denge denemesi: 4 -> 5), Anti-Mage 4, Gambler 5, Undead 5, Hexer 5, Mage 6, Archer 6 (Ömer 2026-10-17: 7 -> 6 after the first range test; Archer was untouchable at depth 3, 71% QB win).
- **Skill istisnaları:** Charge 4; Backstab **3** (Ömer: Cutthroat ön sırada olsun; ön sıradan zaten 3. sıraya ulaşır); Saltire Cut 3; Smoke Bomb 4 (**kendi tarafına atılırken de menzil 4**); Bone Throw 4; Drain Field **4** (merkez seçildiği için 2. sıradan bile en arkaya atar); **Mana Steal 4** (Ömer: Anti-Mage bu senaryoda uzak sınıf; tüm skill'leri 4); Treant skill'leri 4; Skeleton skill'leri 1. Rest / Skip Turn / Move / Valor Revive menzilsiz.
- **Global:** Fist Crush, Radiance, Card Trick, Murder of Crows, Breaking Span, Fall of King's Bridge, Pyre of Morvane. Meteor / Blizzard / Arrow Rain Global DEĞİL.
- **Dost skill'leri:** kısıt yok, **Guard hariç: Guard yalnızca yakındaki dostu korur (dost menzili 2)** (Ömer: "şimdilik böyle, duruma göre değiştiririz"). Diğerleri sınırsız.
- **Moblar:** arketip (yakın 1, teber/mızrak 2, okçu/arbalet 6, büyücü 5, kendine/dostuna menzilsiz) + istisnalar: Run Down 3, Burn the Field **5**, Peat Smoke 4, Rockfall 4, Drag Under 2, Chain Hook 4, Anchor Smash 2, Ashfall 6, Cinder Lash 5.
- **Geri dönüş hazırlığı (Ömer: en deneysel değişiklik):** tüm sistem tek veri bayrağı arkasında (`range.enabled`); kapalıyken eski hedefleme birebir. Kod ayrı modülde.

## YZ dizilimi (engine-dev 2026-10-17; Ömer: "Quick Battle'da YZ dizilimini menzile ve diğer etkenlere göre kursun")
- Menzil açıkken otomatik dizilimler (Quick Battle Randomize, oyuncunun Auto arrange'ı / sefer önerilen hücre, sim'in rastgele savaşları, Endless normal dalgaları) `src/engine/formation-ai.ts` ile kurulur; ağırlıklar `data/ai.json > formation`. Elle yerleştirilmiş sefer/boss karşılaşmaları DEĞİŞMEZ. Menzil kapalıyken eski dizilim birebir.
- Puan: ana menzil (sınıf tabanı) düşmanın ön sırasına ilk turdan ulaşmalı (ulaşamazsa büyük ceza), ne kadar derine ulaşırsa o kadar iyi; kendi ön sıradan geride durmak güvenlik (kırılgan birimde daha değerli); taunt'lu birim önde; Guard sahibi dostlarına menzilinde; düşmanın alan şekilleri (bilinmiyorsa Quick Battle havuzunun şekilleri; tahtanın yarısından büyük şekiller sayılmaz) iki kırılganı birlikte vuruyorsa ceza. Rastgele dizilimde seed'li küçük gürültü (çeşitlilik).
- Tipik sonuç: menzil 1 önde, mızrak (2) ikinci sırada önündeki yakın dövüşçünün arkasında, Paladin/Druid/Anti-Mage (4) ve 5'likler 1-2. sıra, Mage (6) 2. sıra, Archer (7) en arkada.


## Dizilim ipuçları (Ömer 2026-10-18)
- Dizilim ekranlarında (sefer Formation, Quick Battle, MP, Endless) uygunsuz hücredeki birime yalnızca ÖNERİ: `src/engine/formation-hints.ts` (kural formation-ai ile aynı), eşikler `data/ai.json > formationHints`. Varsayımlar: open-questions 349.
