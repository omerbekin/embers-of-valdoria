# Archer: tasarım dökümanı

> Kaynak: `data/classes/archer.json`, `data/skills.json`, `data/skill-trees/archer.json` (sürüm 1), 2026-11-08. Ağaç mantığı: `skill-tree-logic.md`.

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `archer` / Marksman |
| Ön sıra önceliği, menzil | 8 (en arka), menzil 6 |
| Stat (str / int / dex / luck) | 13 / 13 / 26 / 8, primary DEX |
| Zırh | 10 zırh, 0 büyü zırhı |
| YZ | `sniper` |

- **Güçlü yan:** en uzun menzil; hedef ne kadar uzaksa o kadar çok hasar (Sharpshooter). Quick Shot bedava ve Haste verir.
- **Zayıf yan:** kırılgan, yakında zayıflar; MP'li skill'ler (Arrow Rain 16) sık atılamaz. Kazanma %48,0 / %48,8 (2026-11-08).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Sayı |
|---|---|---|---|
| Quick Shot | Tek hedef, fiziksel DEX; kendine Haste | 0 / yok | güç 0,42; Haste 2 tur |
| Piercing Arrow | Hedefin sütunu boyunca delip geçer, her düşmanda azalır | 3 / 2 | güç 0,605, düşüş 0,7 |
| Arrow Rain | Gökten 3x3 alana ok yağmuru | 16 / 3 | güç 0,4 |
| Aimed Shot (4. yuva, ult) | Tek hedef güçlü atış, zırhın yarısını yok sayar | 10 / 3 (ilk bekleme 3) | güç 1,455, ignoreDefense 0,5 |

## 3. Pasif ve skill ağacı

### Pasif: Sharpshooter
Etki `longshot`, hedefin her sıra uzaklığı için +%5 hasar (`perRow` 0,05). Veride `text` yazıldı (2026-11-08).

### Ağaç mantığı
Class kimliği: **uzaktan öldürmek**. Ağaç iki şeye dallanır: duruş ve nişan (hareket etmemek, mesafeyi tutmak) ve ok yoluna göre iş (yavaşlatma, zırh delme, alan).

| Satır | Ana fikir | ea / eb yönü | Evrim (v) |
|---|---|---|---|
| Sharpshooter | Mesafe = güç | **Patient Aim** (kimse vurmadıysa +kritik; ma Held Breath: Skip Turn ile garanti kritik) / **Long Pin** (5+ sıra uzakta Slow şansı; mb Range Keeper: yaklaşana bedava Quick Shot). Kan: Tunnel Vision (+%4/sıra, yakın -%25) / Exposed Perch (2 sıra fazla say, menzilli hasar +%12) | Dead Center: 4+ sıra uzaktakine ilk vuruş kesin kritik |
| Quick Shot | Yavaşlat ve kör et | **Cut the Tendon** (Slow uzar; ma Hobbled: 2+ tur Slow'a Stun) / **For the Eyes** (kritte Blind; mb Blind Panic: Blind'lı hedef Jinxed). Kan: Leg Shot Only (hep Slow, Haste yok) / Gouging Arrow (hep 2 tur Blind, bekleme 2) | Maiming Shot: Slow, Slow'luya Blind, ikisi de varsa Stagger |
| Piercing Arrow | Zırh deli, buff sök | **Sunder** (zırh -%20; ma Shattered Line: Aimed Shot, Sunder'lıda zırhı yok sayar) / **Strip Wards** (buff söker; mb Through the Guard: kalkan ve Fortified'ı yok sayar). Kan: Brittle Point (zırh -%40, 2. düşmanda durur) / Spent Quarrel (hepsini sök, bekleme 4) | Siege Bolt: tüm zırhı yok sayar, düşüş %10 |
| Arrow Rain | Alan kontrolü | **Spent Arrows** (2 tur Slow zemin; ma Killing Field: Blind + DEX hasarı) / **Lingering Hail** (Bleeding yağmur; mb Sky Full of Shafts: Piercing düşüşsüz). Kan: Choking Rain (zemin 4 tur, vuruş -%40) / Endless Hail (4 tur, bekleme 5) | Arrow Storm: 4 sıra, 2 tur Bleeding |

- **Ult kolları (Aimed Shot):** u = bitirici (Killing Shot, Heart Shot, Deathblow: düşük canlıya); r = öldürünce ödül (Trophy: sıfırla, Blood Rush: Haste, Next in Line); d = hız (Snap Shot, Quick Sight, Lightning Draw: iki atış); l = geri çekilme (Draw and Vanish: Fleet, Light Feet: Haste, Ghost Archer: Shrouded).
- **Mastery bar "Still Bow Mastery":** 5 Still Hands (hareket etmediysen ilk skill +%3 kritik), 10 Knee Shots (Slow +1 tur), 15 Wide Nock (Piercing düşüş -%5), 20 Full Quiver (Arrow Rain -2 MP), 25 Plate Reader (Aimed Shot +%5 zırh yok sayma).
- **Neden:** menzil sınıfının bedeli "yakına gelince zayıf" olduğu için ağaç, kontrolle (Slow, Blind, Stun) mesafeyi korumayı ödüllendirir.

## 4. Ömer kararları

- 2026-10-14, madde 326 (arşiv): yeni oyunda yalnız Warrior ve Archer başlangıç kahramanı ("ranger" = Archer); Archer seçilirse Ravenwood adayları Anti-Mage / Cutthroat / Undead.
- 2026-10-17, madde 340: "Archer en derinde"; dizilimde Archer en arkada, Guard menzili dışında kalabilir.
- 2026-11-01, madde 481: tutorial sınıf önerisi Hock Shot + Dexterity (Ömer onayı bekliyor).

## 5. Açıklar

- Sharpshooter pasif `text` alanı 2026-11-08de yazıldı (veri).
- Aimed Shot bekleme önerisi (4 -> 3) arşivde tartışıldı; güncel veri 3. Karar tarihi bulunamadı.
- Archer'a özel Ömer denge kararı yok; denge turlarında sayıya dokunulmadı (%48 civarı, bant içi).
