# Karakter tier'ları ve açılma (KONSEPT)

Durum: **konsept, uygulanmadı** (2026-10-24). Ömer'in fikri, Claude'un taslak kararları. Uygulamaya geçmeden önce Ömer'le yeniden konuşulacak. Yeni mekanik içeren kısımlar (MP cost ve bütçe, Endless açılma eşikleri) **onaylanmış mekanik değil**.

## Ömer'in kararları
1. Tier'lar ham stat ile değil, **karmaşıklık ve combo tavanı** ile ayrılır. Yüksek tier iyi oynanırsa daha güçlüdür, kötü oynanırsa T1'in gerisinde kalır. Böylece power creep olmaz.
2. Seferde (campaign) açılan karakterler **o save için** açık kalır.
3. Endless'ın kendi açılma mantığı olacak (tasarımı Claude yapacak). Quick Battle'da herkes açık. Multiplayer'da her karakterin bir **cost**'u olacak, pick buna göre yapılacak.
4. Tier dağılımına Claude karar verecek (aşağıda).
5. Amaç oyunu karakterle şişirmek değil. Yeni karakterler aşağıdaki şablonla eklenir.

## Tier dağılımı (Claude taslağı)

| Tier | Ne zaman (sefer) | Karakter | Neden |
|---|---|---|---|
| T1 | Başlangıç | Warrior, Archer, Mage | Basit: vur, uzaktan vur, büyü. Temeli öğretir. |
| T1+ | Map 1 ortası | Paladin | 4. slot; iyileştirme ve destek. |
| T1+ | Map 1 boss sonrası | Defender | Tank ve koruma. Map 2'ye hazırlık. |
| T2 | Map 2 girişi | Anti-Mage | Mana avı, düşmanı okumak. |
| T2 | Map 2 ortası | Cutthroat | Hedef seçimi, pozisyon. |
| T2 | Map 2 boss sonrası | Druid | Summon yönetimi. |
| T3 | Map 3 girişi | Hexer | Curse/debuff combo'ları, en yüksek tavanlardan. |
| T3 | Map 3 ortası | Undead | Karanlık büyü, Hexer'la sinerji. |
| T3 | Map 3 sonu (gizli/opsiyonel) | Gambler | Risk ve şans; en oynak karakter. |

Bağlantı: maps 2-3 planı onaylı ama 1.0 sonrası yapılacak (`docs/design/campaign/maps-2-3.md`). Şu an yalnızca map 1 var, bu yüzden tier sistemi o planla birlikte ele alınmalı. Açılma anı bir kurtarma savaşı ya da "misafir karakter" denemesi olabilir. Sefer takımı en fazla 4 kişilik.

## Endless (Claude taslağı)
- Kendi ilerlemesini tutar, sefer save'inden bağımsızdır.
- Başlangıçta T1 açık. Wave eşikleri ilk kez geçildikçe açılır: örneğin wave 10'da T1+, 20'de T2, 35'te T3'ten birer karakter. Sayılar sim ile belirlenir.

## Quick Battle
Herkes açık.

## Multiplayer cost (Claude taslağı, yeni mekanik, onaysız)
- Takım bütçesi var, örneğin 4 karakter için 12 puan.
- Cost tier'dan değil, **ölçülen güçten** gelir (sim kazanma oranı).
- "2 ucuz + 1 pahalı" ya da "4 orta" gibi farklı stratejiler doğar.

## Yeni karakter şablonu
```
İsim / Rol:
Tier: T1 / T1+ / T2 / T3
Karmaşıklık: 1-5 (oyuncudan ne istiyor)
Seferde açılma: hangi map, hangi nokta, nasıl (kurtarma / misafir / hikâye)
Endless'ta açılma: wave eşiği
MP cost: (sim ile belirlenir)
Sinerji ortakları: en iyi hangi 1-2 karakterle çalışır
Neden bu tier'da: tek cümle
```

## Açık sorular
- Tier dağılımı Ömer'den onay bekliyor.
- Endless eşik sayıları ve MP bütçe/cost değerleri sim ister (her sim öncesi Ömer'e sorulur).
- Skill ağacı geldiğinde erken karakterlerin büyümesi buna nasıl bağlanacak?
