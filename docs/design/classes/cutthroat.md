# Cutthroat

> **Ne için / Güncel mi (2026-11-08):** Cutthroat kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/cutthroat.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `cutthroat` / Assassin |
| Ön sıra önceliği, menzil | 3, menzil 1 |
| Stat (STR / INT / DEX / LUCK) | 17 / 11 / 26 / 6, ana stat DEX (toplam 60) |
| Zırh / büyü zırhı | 10 / 0 |
| YZ profili | `assassin` (`data/ai.json > profiles.assassin`) |
| Pasif | **Opportunist**: "Deal 25% more damage to targets suffering Wound, Slow, Stun or Wither." |

- Suikastçı: medieval haydut, hayvan teması yok, DEX ana stat, kırılgan ve hızlı.
- **Güçlü:** durumlu (yaralı, yavaş, sersem, zayıflamış) hedefe fazla hasar (Opportunist); Backstab arka sıraya bile garanti kritik.
- **Zayıf:** kırılgan, işini durum koşullarına bağlar; Backstab için hedefin arkası açık olmalı.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Venom Edge (`venom_edge`) | Yakın kesik, hedefi Wound'lar | 0 / yok | sınıf (1) | hasar physical DEX 1; status: status=wound, turns=2 |
| Saltire Cut (`x_cut`) | X şekli (merkez + 4 çapraz), merkez iki kez vurulur | 9 / 2 | 3 | hasar physical DEX 0,45; area={shape:x, hitsAtCenter:2} |
| Smoke Bomb (`smoke_bomb`) | 2x2 alan, iki tahtaya da atılır: düşman Blinded, dost Shrouded | 10 / 3 | 4 | status: status=blinded, turns=2, side=enemies; status: status=shrouded, turns=2, side=allies; area={shape:rect, rows:2, cols:2, anchor:bottom_left} |
| Backstab (`backstab`) | Hedefin arkasına geçip sırtından sapla; her vuruş kritik, kalkanla bloklanmaz; hedefin arkası boş olmalı | 14 / 4, ilk 3 | 3 | hasar physical DEX 1,525, guaranteedCrit=true, unblockable=true; ignoreFrontRow=true; requiresOpenBehind=true |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-cutthroat.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Ağaç iki soruyu yanıtlar: hedefi nasıl Opportunist yaparım (Wound, kan, düşük can) ve kaçıp saklanarak nasıl yaşarım (Shrouded, kaçınma, Smoke). Düz hasar çarpanı yok.

Veri: `data/skill-trees/cutthroat.json` (sürüm 1, bar "Ghost Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Opportunist (pasif):** dolgu Cold Read, Vein Finder, Feinting Step, Missed Chance; anahtar Smell of Blood; yön A Killer's Eye (ödül Bloodletter, uç Glass Knife); yön B Counter Cut (ödül Turned Blade, uç Reckless Grace); evrim Assassin's Instinct. Anahtar: "Opportunist also counts any enemy below 40% HP, status or not."
- **Venom Edge:** dolgu Balanced Blade, Seeking Tip, Twist the Knife, Honed Point; anahtar Coup de Grace; yön A Finishing Cut (ödül Clean Kill, uç Butcher's Haste); yön B Backhand Cut (ödül Carving Arc, uç Thirsty Edge); evrim Red Smile. Anahtar: "Venom Edge always crits against targets below 30% HP."
- **Saltire Cut:** dolgu Crossed Crit, Scissor Bite, Keen Pair, Bloody Saltire; anahtar Finishing Cross; yön A Double Lunge (ödül X Marks the Throat, uç Heavy Cross); yön B Extra Knife (ödül Endless Knives, uç Spent Belt); evrim Butcher's Cross. Anahtar: "If Saltire Cut kills any enemy, its cooldown resets."
- **Smoke Bomb:** dolgu Far Toss, Lungful of Ash, Gritty Ash, Coughing Fit; anahtar Choking Cloud; yön A Sulfur Cake (ödül Lost in Smoke, uç Sulfur Overload); yön B Exposed in Smoke (ödül Shrapnel Shell, uç Hard Clay); evrim Brimstone Jar. Anahtar: "Smoke Bomb on enemies also Silences them for 1 turn."
- **Ult Backstab (tek kol seçilir):** u Into the Smoke, Smoke Trail, Shadow Return; r Early Knife, First Blood, Opening Act; d Between the Plates, Sure Hand, Spine Splitter; l Thrown Stiletto, Weighted Stiletto, Death From Afar.
- **Bar Ghost Mastery:** 5 Ash Cloak, 10 Light Step, 15 Killer Instinct, 20 Notched Blade, 25 Reaper's Due.

## 4. YZ notları

- Profil: `data/ai.json > profiles.assassin`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

## 5. Açık işler / kararlar

- Backstab arka hücre kuralı: ceset engellemez (arşiv madde 225). Stat STR 17 / INT 11 (Ömer 2026-10-18, madde 350).
- Carving Arc: Wound zincirdeki her kesikte, isabet edince uygulanır (Ömer 2026-10-22, madde 394).
- Kampanya ve Endless varsayılanında ikinci el dolu gelir (Ömer 2026-10-23, madde 401). Silah tipleri reworkünde hançer kritik yerine başka bonus verir (madde 443; ayrıntı arşivde).
- **Ömer'e açık soru:** Blinded ve Jinxed CC sayılır mı (arşiv madde 271)? Cevap teyit edilmedi.
- Tutorial'da Cutthroat için sınıf önerisi yok.

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/cutthroat.md`.
