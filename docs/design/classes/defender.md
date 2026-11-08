# Defender: tasarım dökümanı

> Kaynak: `data/classes/defender.json`, `data/skills.json`, `data/skill-trees/defender.json` (sürüm 1), 2026-11-08. Ağaç mantığı: `skill-tree-logic.md`. Sayılar sim ile oturur; bu belge yazıldığı günün verisini anlatır.

> **Erişim (Ömer 2026-11-08):** Defender artık sefer başlangıç kahramanı değil (yerine Skald girdi); `companyPool` ve `recruitPool`'da kalır, yani aday/bölük olarak gelir.

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `defender` / Tank |
| Ön sıra önceliği, menzil | 0 (en önde), menzil 1 |
| Stat (str / int / dex / luck) | 24 / 24 / 6 / 6, primary STR |
| Zırh, can | 38 zırh, 0 büyü zırhı, can 140 (override) |
| YZ | `tank` |

- **Güçlü yan:** takımın en yüksek zırhı (38). Bulwark Aura yanındaki dostlara da zırh verir; Taunt ve Close Ranks hasarı kendine çeker.
- **Zayıf yan:** kendi hasarı düşük, büyü zırhı yok. Kazanma oranı sınıflar arasında en altlardan (2026-11-08: %46,2 / %45,8).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Sayı |
|---|---|---|---|
| Tremor Slam | Hedef sırayı (row) vurur, Slow verir. Fiziksel, STR + zırh payı | 0 / yok | güç 0,221 + zırhın %10,5'i; Slow 2 tur |
| Taunt | Kendine; düşmanları kendine vurmaya zorlar. Kaybedilen can eşiği geçince kırılır | 16 / 4 | 2 tur; kırılma 0,30 maks can; dostlara gelen hasar x0,9 |
| Close Ranks | Seçilen dost + sırasındaki dostlar (Defender hariç) Guard alır: aldıkları hasarın yarısı Defender'a geçer | 8 / 5 | 3 tur, pay 0,5 |
| Fist Crush (4. yuva, ult) | Gökten 3 rastgele düşmana yumruk, fiziksel | 22 / 4 (ilk bekleme 3) | güç 0,71 + zırhın %5'i |

## 3. Pasif ve skill ağacı

### Pasif: Bulwark Aura
"You and the allies right next to you (front, back, left, right) gain bonus armor equal to 40% of your own armor." (`armorAura`, pct 0,4, maxStacks 2). Metni veride var.

### Ağaç mantığı
Class kimliği: **zırh ve hasar emmek**. Ağaç iki soruya bölünür: "ne kadar sıkı dururum" (aura, Close Ranks) ve "düşmanı nasıl yavaşlatıp kontrol ederim" (Tremor Slam, Taunt). Hasar ağacı değil; zırh payı, kalkan ve CC.

| Satır | Ana fikir | ea / eb yönü | Evrim (v) |
|---|---|---|---|
| Bulwark Aura | Duruş + aura büyüklüğü | **Rooted Stance** (hareket etmedikçe aura büyür; ma Unyielding: Stun'a ve çekmeye bağışık) / **Diagonal Guard** (çapraza da yayılır; mb Living Rampart). Kan: Anchored Stone (hiç hareket yok, aura +%50) / Pledged Plate (dostlara tam zırh, kendi zırhın -%30) | Fortress Aura: her turda aura kadar kalkan |
| Tremor Slam | Slow + Stun zinciri | **Skull Rattler** (Slow'lu hedefe Stun şansı; ma Third Quake: her 3. vuruş Stun) / **Aftershock Ground** (sallanan zemin; mb Sinking Earth: zeminde tur başı hasar). Kan: Heavy Landing (Slow 3 tur ama zırh ölçeği yok) / Endless Tremor (zemin 4 tur, hasar -%40) | Earthsplitter: haç şekli, 3 tur Slow |
| Taunt | Süre ve kırılma | **Stand Fast** (3 tur; ma Weathered the Storm: kırılmadan biterse Fortified) / **Brief Defiance** (bekleme 3; mb Refused to Fall: kırılınca bekleme -1 + kalkan). Kan: Ironbound Oath (kırılmaz, dost indirimi yok) / Hollow Roar (4 MP, bekleme 2, kırılma %10) | Bastion Cry: Taunt boyunca Fortified |
| Close Ranks | Guard payı ve koruma | **Hold Their Weight** (pay %65; ma Final Shield: ölümcül vuruşu sen yersin) / **Shield Toss** (korunana kalkan; mb Steady Them: Stun/Slow temizler). Kan: Chained to Them (pay %80, Move ve Taunt yok) / Loose Chain (bekleme 3, pay %35) | Phalanx: hasar bütün Guard'lılar + sana eşit bölünür |

- Dolgu (f1-f3, r) hep skill'in kendi mekaniğine bağlı: Braced Stance (hareket etmediysen aura), Shockwave (Slow'lu hedefe güç), Second Breath (Taunt bitince can), Linked Plates (paylaşılan hasar azalır). Koşulsuz "+%X hasar" yok.
- **Ult kolları (Fist Crush):** u = "bana vuranı cezalandır" (Payback Fist, Bitter Knuckles, Settle the Score); r = zırh ölçeği (Plated Gauntlet, Heavier Fall, Iron Meteor); d = zırhlı hedef avı (Plate Hunter, Can Opener, Breaker of Walls); l = döngü (Swift Iron bekleme 3, Pain Into Iron, Forge Again: öldürürse sıfırlanır). Tek kol seçilir.
- **Mastery bar "Rampart Mastery":** 5 Iron Morning (ilk turda zırhın %10'u kadar kalkan), 10 First Tremor (ilk Slow +1 tur), 15 Formed Up (ilk Close Ranks bedava), 20 Fault Line (Stun biten düşman 1 tur Slow), 25 Last Wall Standing (dost ölünce 1 tur Fortified).
- **Neden:** ağaç Defender'ı "zırh = güç" sınıfı yapar (zırh payı hasara ve kalkana döner); kimlik dışı yöne (saf hasar) itmez.

## 4. Ömer kararları

- 2026-10-17, madde 340: "Archer en derinde"; Archer, Close Ranks (Guard) menzili dışında kalabilir.
- 2026-10-18, madde 350: Defender canı 145 -> 140 (t4 ölçümü, Defender 4 seed'de %55,9-56,6).
- 2026-10-18, madde 350: "Defender'da puanlar INT yerine şansa gitsin": STR 26 -> 24, LUCK 4 -> 6.
- 2026-10-18, madde 350: Defender zırhı 38 -> 36 (sonra 2026-11-03'te tekrar 38, aşağıya bak).
- 2026-10-20, madde 375: Close Ranks, Guard'ın yerine geldi (pay %50, bekleme 5).
- 2026-10-22, madde 398 (Faz 7 ikinci tur): "Defender Taunt b kolunu kırp".
- 2026-10-23, madde 401: kampanya ve Endless varsayılanlarında Defender'ın ikinci eli dolu gelir (Iron Buckler, %15 blok, +2 zırh).
- 2026-11-01, madde 506 (5): Taunt kırılma oranı 0,25 -> 0,30 (Ömer 5 puan seçti); Tremor Slam 0,221 + zırh payı 0,105.
- 2026-11-03 (`docs/arch/areas/character-design.md`): Defender zırhı 38, Taunt kırılma 0,30.

## 5. Açıklar

- Pasif metni var; metinsiz pasif yok.
- Close Ranks bedeli veri ve belgede 8 MP (madde 375 ilk yazımı 10 MP idi; skills.json `_not` metni hâlâ 10 diyor, bayat not).
- Defender ölçümde en alt sınıflardan (%46,2 / %45,8; bant 44-56 içinde). Sayıya dokunulmadı.
- Tutorial sınıf önerisi (Bellow + Strength) Ömer onayı bekliyor (madde 481).
