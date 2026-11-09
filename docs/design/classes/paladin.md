# Paladin

> **Ne için / Güncel mi (2026-11-08):** Paladin kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/paladin.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `paladin` / Holy Healer |
| Ön sıra önceliği, menzil | 2, menzil 4 |
| Stat (STR / INT / DEX / LUCK) | 24 / 26 / 4 / 6, ana stat INT (toplam 60) |
| Zırh / büyü zırhı | 30 / 0 |
| YZ profili | `healer` (`data/ai.json > profiles.healer`) |
| Pasif | **Divine Light**: "At the start of your turn, heal the most wounded ally." |

- Kutsal şövalye: yaralıyı iyileştiren, düşeni diriltip düşmanı kutsal ateşle yakan. Kaynak MP.
- **Güçlü:** takımı ayakta tutar (her tur otomatik şifa, Resurrection, Radiance); kutsal hasarı tek hedef ve alan olarak taşır.
- **Zayıf:** DEX / LUCK çok düşük (kritik ve kaçınma yok); şifa MP ve bekleme ister; mana reworkü sonrası MP havuzu dar, ölçümde bant altı.
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Holy Strike (`holy_strike`) | Tek düşmana gökten çekiç, kutsal büyü hasarı | 0 / yok | sınıf (4) | hasar magic/holy INT 0,627 |
| Resurrection (`resurrection`) | Ölü dostu diriltir | 14 / 5 | sınıf (4) | revive: hpRatio=0,3, mpRatio=0,3, regen={turns:2, ratio:0.1} |
| Judgment (`judgment`) | Tek hücre, iki tahtaya da atılır. Düşman hücresi: kutsal hasar + 2 tur Holy Fire. Dost hücresi: şifa + 2 tur Holy Ground | 16 / 3 | sınıf (4) | hasar magic/holy INT 0,315, side=enemies; heal: scale=int, power=0,3, side=allies; ground: ground=holy_fire, turns=2, scale=int, power=0,399, side=enemies; ground: ground=holy_ground, turns=2, scale=int, power=0,38, side=allies; area={shape:rect, rows:1, cols:1, emptyOwn:true} |
| Radiance (`radiance`) | Tüm dostlara şifa (eksik cana göre +%50'ye kadar) + tüm düşmanlara kutsal hasar, zemin yok | 18 / 4, ilk 2 | sınıf (4) | heal: scale=int, power=0,405, missingHpBonus=0,5; hasar magic/holy INT 0,394 |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-paladin.test.ts`) ve bu tablo birlikte güncellenir.

## 3. Ağaç

Ağaç "şifa mı, kutsal hasar mı?" gerilimi: Divine Light çift yüzlü (yaralı yoksa en zayıf düşmana smite eder), her satır bu iki yüzü başka açıdan işler.

Veri: `data/skill-trees/paladin.json` (sürüm 2, bar "Crusade Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Divine Light (pasif):** dolgu Wrathful Glow, Kindled Resolve, Bedside Watch, Sun-Forged Will; anahtar No Rest for Evil; yön A Twofold Light (ödül Chain of Light, uç Vengeful Light); yön B Anointed Arms (ödül Banner of Dawn, uç Fervent Oath); evrim Crusader's Dawn. Anahtar: "When no ally is wounded, Divine Light smites the weakest enemy for 27% INT holy damage."
- **Holy Strike:** dolgu Relentless Hammer, Piercing Light, Sparking Hammer, Unyielding Swing; anahtar First Smite; yön A Rising Fervor (ödül Hammer Rhythm, uç Blind Zeal); yön B Holy Burst (ödül Hammerfall Quake, uç Heavy Hammer); evrim Hammer of the Heavens. Anahtar: "Your first Holy Strike each battle is a guaranteed critical hit."
- **Resurrection:** dolgu Life for Life, Shielded Return, Desperate Rite, Iron Return; anahtar Soul Exchange; yön A Untouchable Rise (ödül Risen in Glory, uç Heavy Absolution); yön B Quick Absolution (ödül Not Yet, uç Hasty Rite); evrim Martyr Rising. Anahtar: "Resurrection can be paid with 25% of your current HP instead of MP."
- **Judgment:** dolgu Deep Coals, Kindling, Spark of Wrath, Ash Upon Ash; anahtar Sanctified Earth; yön A Undying Flame (ödül Fire on Fire, uç Scorched Earth); yön B Wildfire Verdict (ödül Broad Sentence, uç Scattered Flame); evrim Day of Judgment. Anahtar: "Judgment's holy fire and holy ground last 3 turns instead of 2."
- **Ult Radiance (tek kol seçilir):** u Searing Dawn, Scorching Light, Wrath of Heaven; r Final Light, Reaping Dawn, Sunstrike; d Focused Beam, Pillar of Wrath, Lance of Dawn; l Hallowed Steps, Frugal Glory, Second Sunrise.
- **Bar Crusade Mastery:** 5 Battle Hymn, 10 Holy Soil, 15 Charging Faith, 20 Kindled Path, 25 Crusader's Oath.

## 4. YZ notları

- Profil: `data/ai.json > profiles.healer`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).

## 5. Açık işler / kararlar

- Radiance: TÜM dostlara şifa + TÜM düşmanlara kutsal hasar, zemin yok (Ömer 2026-10-24; tek hücre / Holy Ground sürümü geri alındı). Judgment tek hücre, iki tahtaya da atılır; düşman hücresine hasar + Holy Fire, dost hücresine şifa + Holy Ground.
- 2026-11-08 (Ömer): mana reworkü sonrası MP havuzu daraldı; Radiance ve Resurrection MP'si, Judgment düşman hasarı (+%5) veride.
- **Ömer'e açık soru:** Divine Light veri değeri 2026-10-24 kararındaki %35'ten düşük; Judgment şifa / zemin sayıları da karardakinden farklı. Hangisi kasıtlı, karar kaydı bulunamadı.
- Paladin ölçümde bant altıydı; sonraki denge turu bekliyor (`docs/balance.md`). Ağaç sim'i yok.

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/paladin.md`.
