# Cutthroat: tasarım dökümanı

> Kaynak: `data/classes/cutthroat.json`, `data/skills.json`, `data/skill-trees/cutthroat.json` (sürüm 1), 2026-11-08. Ağaç mantığı: `skill-tree-logic.md`.

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `cutthroat` / Assassin |
| Ön sıra önceliği, menzil | 3, menzil 1 (Saltire Cut ve Smoke Bomb kendi menzilini taşır) |
| Stat (str / int / dex / luck) | 17 / 11 / 26 / 6, primary DEX |
| Zırh | 10 zırh, 0 büyü zırhı |
| YZ | `assassin` |

- **Güçlü yan:** yaralı, yavaş, sersem ya da zayıflamış hedefe +%25 hasar; Backstab ile arka sıraya bile garanti kritik.
- **Zayıf yan:** kırılgan, işini durum koşullarına bağlıdır; Backstab için hedefin arkası açık olmalı. Kazanma %48,8 / %47,0 (2026-11-08).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Sayı |
|---|---|---|---|
| Venom Edge | Yakın kesik, hedefi Wound'lar | 0 / yok | DEX güç 1,0; Wound 2 tur |
| Saltire Cut | X şekli (merkez + 4 çapraz), merkez iki kez vurulur | 9 / 2 | güç 0,45; menzil 3 |
| Smoke Bomb | 2x2 alan, iki tahtaya da atılır: düşman Blinded, dost Shrouded | 10 / 3 | 2 tur; menzil 4; hasar yok |
| Backstab (4. yuva, ult) | Hedefin arkasına geçip sırtından sapla; her vuruş kritik, kalkanla bloklanmaz; hedefin arkası boş olmalı | 14 / 4 (ilk bekleme 3) | güç 1,525; menzil 3, ön sıra ve erişim sınırı yok |

## 3. Pasif ve skill ağacı

### Pasif: Opportunist
Etki `bonusVsStatus`: hedef Wound, Slow, Stun ya da Wither altındaysa +%25 hasar (0,25). Veride `text` yazıldı (2026-11-08).

### Ağaç mantığı
Class kimliği: **zayıflamış hedefi bitirmek**. Ağaç iki soruyu yanıtlar: "hedefi nasıl Opportunist yaparım" (Wound, kan, düşük can) ve "kaçıp saklanarak nasıl yaşarım" (Shrouded, kaçınma, Smoke).

| Satır | Ana fikir | ea / eb yönü | Evrim (v) |
|---|---|---|---|
| Opportunist | Kritle ve kaçınmayla beslenen bonus | **Killer's Eye** (kritte +%15; ma Bloodletter: kritler Wound'lar) / **Counter Cut** (ıskalayana karşı kesik; mb Turned Blade). Kan: Glass Knife (kritte +%30 ama kritsizde -%15) / Reckless Grace (karşı kesik x2, Shrouded biter) | Assassin's Instinct: eksik cana göre büyüyen bonus |
| Venom Edge | Düşük can bitirici | **Finishing Cut** (%30 altı +%40; ma Clean Kill: öldürünce MP + Backstab -1) / **Backhand Cut** (yandakine de, mb Carving Arc: 3 kesiğe kadar zincir). Kan: Butcher's Haste (%50 altı +%35, üstü -%25) / Thirsty Edge (öldürünce can, Wound yok) | Red Smile: %50 altı çift hasar + kesin kritik |
| Saltire Cut | Merkez vuruş sayısı | **Double Lunge** (merkez +%20) / **Extra Knife** (3. merkez vuruşu; ma X Marks the Throat; mb Endless Knives). Kan: Heavy Cross (merkez +%30, çapraz -%50) / Spent Belt (4 merkez vuruşu, 14 MP) | Butcher's Cross: X'teki herkese iki kez, güç 0,35 |
| Smoke Bomb | Kontrol ve kaçış | **Sulfur Cake** (Silence 2 tur; ma Lost in Smoke: Blind iken ıskalayan Stagger) / **Exposed in Smoke** (en düşük canlı Overextended; mb Shrapnel Shell: hasar + Wound). Kan: Sulfur Overload (-%45 isabet, dostu Shrouded yapmaz) / Hard Clay (rastgele düşmana Stun, Blind yok) | Brimstone Jar: Blind + Silence 2 tur, Slow 1 |

- **Ult kolları (Backstab):** u = sonrası kaçış (Into the Smoke, Smoke Trail, Shadow Return: ekip Shrouded + Fleet); r = ilk bıçak (Early Knife bekleme 3 -> 1, First Blood, Opening Act); d = zırh deliciliği (Between the Plates, Sure Hand, Spine Splitter); l = menzil (Thrown Stiletto: arkası kapalı hedefe -%30 hasar, Weighted Stiletto, Death From Afar).
- **Mastery bar "Ghost Mastery":** 5 Ash Cloak (Shrouded +1 tur), 10 Light Step (kaçınılan saldırı 2 MP), 15 Killer Instinct (%50 altı hedefe +%5 kritik), 20 Notched Blade (her öldürme kritik hasarı +%3), 25 Reaper's Due (ilk öldürme diğer bekleme sürelerini sıfırlar).
- **Neden:** ağaç, pasifin "durumlu hedef" koşulunu besler ve Cutthroat'ı hem bitirici (Venom, Backstab) hem kaçan (Smoke, Shrouded) iki oyun tarzına ayırır; düz hasar çarpanı yok.

## 4. Ömer kararları

- Madde 225 (arşiv, tarih arşivde net değil): Cutthroat tasarım kararları: medieval haydut-suikastçı, hayvan teması yok, DEX primary, kırılgan-hızlı; Backstab arka hücre kuralı (ceset engellemez).
- 2026-10-18, madde 350: Cutthroat STR 17 / INT 11 (can 81; ilk denemenin yarısı geri alındı).
- 2026-10-22, madde 394 (20): Carving Arc'ta Wound zincirdeki her kesikte (isabet edince) uygulanır.
- 2026-10-23, madde 401: kampanya ve Endless varsayılanlarında Cutthroat'ın ikinci eli dolu gelir.
- 2026-10-27, madde 443: silah tipleri reworkü; Cutthroat hançeri kritik yerine başka bonus verir (ayrıntı maddede).
- Madde 271 (arşiv): Blinded ve Jinxed CC sayılmaz (Cutthroat/Hexer karşı oyunu korunur); bu Ömer'e soru olarak sorulmuştu, cevabı bu belgede teyit edilmedi.

## 5. Açıklar

- Opportunist pasif `text` alanı 2026-11-08de yazıldı (veri).
- Tutorial'da Cutthroat için sınıf önerisi yok.
- Ölçümde bant alt yarısı (%47-48,8); sayıya dokunulmadı.
