# Defender

> **Ne için / Güncel mi (2026-11-08):** Defender kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/defender.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `defender` / Tank |
| Ön sıra önceliği, menzil | 0, menzil 1 |
| Stat (STR / INT / DEX / LUCK) | 24 / 24 / 6 / 6, ana stat STR (toplam 60) |
| Zırh / büyü zırhı | 38 / 0, can 140 (override) |
| YZ profili | `tank` (`data/ai.json > profiles.tank`) |
| Pasif | **Bulwark Aura**: "You and the allies right next to you (front, back, left, right) gain bonus armor equal to 40% of your own armor." |

- Tank: önde durur, hasarı emer. Sınıf hasarı düşük, zırh ve kontrol (Slow, Taunt, Guard) işi yapar.
- **Güçlü:** takımın en yüksek zırhı; Bulwark Aura yanındaki dostlara da zırh verir; Taunt ve Close Ranks hasarı kendine çeker.
- **Zayıf:** kendi hasarı düşük, büyü zırhı yok; ölçümde alt sınıflardan.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

**Erişim (Ömer 2026-11-08):** Defender sefer başlangıç kahramanı değil (yerine Skald girdi); `companyPool` ve `recruitPool`'da kalır, aday/bölük olarak gelir.

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Tremor Slam (`tremor_slam`) | Hedef sırayı (row) vurur, Slow verir. Fiziksel, STR + zırh payı | 0 / yok | sınıf (1) | hasar physical STR 0,221, bonusScale=[{stat:armor, pct:0.105}]; status: status=slow, turns=2; area={shape:row} |
| Taunt (`taunt`) | Kendine; düşmanları kendine vurmaya zorlar. Kaybedilen can eşiği geçince kırılır | 16 / 4 | sınıf (1) | taunt: turns=2, breakRatio=0,3, allyDamageMult=0,9 |
| Close Ranks (`close_ranks`) | Seçilen dost + sırasındaki dostlar (Defender hariç) Guard alır: aldıkları hasarın yarısı Defender'a geçer | 8 / 5 | 2 | guard: turns=3, share=0,5; splash={pattern:row}; turnCost=0,5 |
| Fist Crush (`fist_crush`) | Gökten 3 rastgele düşmana yumruk, fiziksel | 22 / 4, ilk 3 | sınıf (1) | hasar physical STR 0,71, bonusScale=[{stat:armor, pct:0.05}]; count=3 |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-defender.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Ağaç Defender'ı "zırh = güç" sınıfı yapar (zırh payı hasara ve kalkana döner): ne kadar sıkı dururum (aura, Close Ranks) ve düşmanı nasıl yavaşlatırım (Tremor Slam, Taunt). Koşulsuz "+%X hasar" yok.

Veri: `data/skill-trees/defender.json` (sürüm 1, bar "Rampart Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Bulwark Aura (pasif):** dolgu Braced Stance, Drilled Ranks, Tight Formation, Weathered; anahtar Shield Brothers; yön A Rooted Stance (ödül Unyielding, uç Anchored Stone); yön B Diagonal Guard (ödül Living Rampart, uç Pledged Plate); evrim Fortress Aura. Anahtar: "At battle start, allies in Bulwark Aura gain a shield worth 5% of your max HP."
- **Tremor Slam:** dolgu Deep Stomp, Shockwave, Ringing Earth, Fault Strike; anahtar Rolling Quake; yön A Skull Rattler (ödül Third Quake, uç Heavy Landing); yön B Aftershock Ground (ödül Sinking Earth, uç Endless Tremor); evrim Earthsplitter. Anahtar: "Tremor Slam also hits the row behind for 25% damage, without Slow."
- **Taunt:** dolgu Bellow, Second Breath, Thick Skull, Rally Cry; anahtar Cover Them; yön A Stand Fast (ödül Weathered the Storm, uç Ironbound Oath); yön B Brief Defiance (ödül Refused to Fall, uç Hollow Roar); evrim Bastion Cry. Anahtar: "When an ally drops below 30% HP, Taunt's cooldown resets."
- **Close Ranks:** dolgu Interlocked, Shield Chain, Linked Plates, Linked Shields; anahtar Second Chain; yön A Hold Their Weight (ödül Final Shield, uç Chained to Them); yön B Shield Toss (ödül Steady Them, uç Loose Chain); evrim Phalanx. Anahtar: "Close Ranks also guards the allies in your own row."
- **Ult Fist Crush (tek kol seçilir):** u Payback Fist, Bitter Knuckles, Settle the Score; r Plated Gauntlet, Heavier Fall, Iron Meteor; d Plate Hunter, Can Opener, Breaker of Walls; l Swift Iron, Pain Into Iron, Forge Again.
- **Bar Rampart Mastery:** 5 Iron Morning, 10 First Tremor, 15 Formed Up, 20 Fault Line, 25 Last Wall Standing.

## 4. YZ notları

- Profil: `data/ai.json > profiles.tank`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

## 5. Açık işler / kararlar

- Son hâl (Ömer): can override, zırh, Taunt kırılma oranı, Close Ranks payı ve beklemesi veride; ara değerler (zırh 38 -> 36 -> 38, can 145 -> 140) arşivde.
- Close Ranks Guard'ın yerine geldi (Ömer 2026-10-20); Defender hariç dostlar Guard alır. `data/skills.json > close_ranks._not` metni 10 MP diyor, veri 8 MP: veri notu bayat, düzeltilmeli (veri işi).
- Kampanya ve Endless varsayılanında Defender'ın ikinci eli dolu gelir (Iron Buckler; Ömer 2026-10-23).
- Tutorial sınıf önerisi (Bellow + Strength) Ömer onayı bekliyor (arşiv madde 481).

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/defender.md`.
