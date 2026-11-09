> Ne için: docs/design/classes/paladin.md belgesinden 2026-11-08'de taşınan eski tam metin (karar günlüğü, ara değerler, eski tablolar); güncel değil. Güncel belge: docs/design/classes/paladin.md.

# Paladin

Sayılar: `data/classes/paladin.json`, `data/skills.json`, ağaç `data/skill-trees/paladin.json` (sürüm 2, "Crusade Mastery"). Çerçeve: `docs/design/classes.md`. Ağaç kuralı: `skill-tree-logic.md`. Son güncelleme 2026-11-08.

## 1. Kimlik
- **Holy Healer**, menzil 4, ana stat INT. Statlar STR 24 / INT 26 / DEX 4 / LUCK 6. Zırh 30, büyü zırhı 0. Kaynak: MP.
- Fikir: yaralıyı iyileştiren, düşeni diriltip düşmanı kutsal ateşle yakan kutsal şövalye.
- **Güçlü:** takımı ayakta tutar (her tur otomatik şifa, Resurrection, Radiance); kutsal hasarı tek hedef ve alan olarak taşır.
- **Zayıf:** DEX / LUCK çok düşük (kritik ve kaçınma yok); şifa MP ve bekleme ister; mana reworkü sonrası MP havuzu dar, ölçümde bant altı (%48,5 / %46,9, 2026-11-08).

## 2. Skill'ler
| Skill | Ne yapar | MP / bekleme | Sayı |
|---|---|---|---|
| Holy Strike | Tek düşmana gökten çekiç, kutsal büyü hasarı | 0 / yok | INT 0,627 |
| Resurrection | Ölü dostu diriltir | 14 / 5 | %30 can ve MP, ardından 2 tur %10 yenilenme |
| Judgment | Tek hücre, iki tahtaya da atılır. Düşman hücresi: kutsal hasar + 2 tur Holy Fire. Dost hücresi: şifa + 2 tur Holy Ground | 16 / 3 | hasar INT 0,315, holy_fire 0,399/tur; şifa 0,3, holy_ground 0,38/tur |
| Radiance (ult) | Tüm dostlara şifa (eksik cana göre +%50'ye kadar) + tüm düşmanlara kutsal hasar, zemin yok | 18 / 4, ilk bekleme 2 | şifa INT 0,405, hasar 0,394 |

Ömer 2026-11-08: Radiance 18 MP ve Resurrection 14 MP kaldı; Judgment'ın düşman hasarı +%5 oldu (0,315 / holy_fire 0,399), şifa aynı.

## 3. Pasif ve ağaç mantığı
**Pasif Divine Light:** tur başında en yaralı dosta INT 0,27 şifa (2026-10-24 kararında %35'ti; veri şimdi 0,27).

Ağaç = "şifa mı, kutsal hasar mı?" gerilimi. Divine Light çift yüzlü: yaralı yoksa en zayıf düşmana smite eder. Her satır bu iki yüzü başka açıdan işler.

| Satır | n0 (anahtar) | ea yönü | eb yönü | Evrim (v) |
|---|---|---|---|---|
| Divine Light | No Rest for Evil: yaralı yokken en zayıf düşmana smite | Twofold Light: her zaman smite (INT %10). Ödül Chain of Light (smite öldürürse tekrar). Uç Vengeful Light (smite 2 kat, şifa -%40) | Anointed Arms: şifa alan dost sonraki skill'inde +%15. Ödül Banner of Dawn (%50 altındaysa Haste). Uç Fervent Oath (bonus +%30, şifa -%25) | Crusader's Dawn: hem şifa hem smite her tur, ikisi +%25; öldürünce 5 MP |
| Holy Strike | First Smite: savaşın ilk Holy Strike'ı kesin kritik | Rising Fervor: art arda her vuruş +%5. Ödül Hammer Rhythm (üçüncü vuruş iki kez). Uç Blind Zeal (+%10 adım, birikim varken Divine Light -%30) | Holy Burst: yandakilere %30 sıçrama. Ödül Hammerfall Quake (öldürünce sıraya %20). Uç Heavy Hammer (+%15 hasar, 6 MP) | Hammer of the Heavens: ikinci çekiç en düşük canlıya %30 |
| Resurrection | Soul Exchange: MP yerine mevcut canın %25'i | Untouchable Rise: dirilen Fortified. Ödül Risen in Glory. Uç Heavy Absolution (kalkan %15 can, bekleme 7) | Quick Absolution: bekleme 4. Ödül Not Yet (yeni ölene MP'siz). Uç Hasty Rite (bekleme -2, %15 canla) | Martyr Rising: sen düşersen, hazırsa, %40 canla kalkarsın (savaşta bir kez) |
| Judgment | Sanctified Earth: Holy Fire / Ground 3 tur | Undying Flame: ölen düşmanın hücresi savaş boyu yanar. Ödül Fire on Fire. Uç Scorched Earth (+2 tur, bekleme 5) | Wildfire Verdict: yangındaki düşman her kaynaktan +%15 alır. Ödül Broad Sentence (yanlara da vurur). Uç Scattered Flame (alt-üst hücre, hasar / şifa -%30) | Day of Judgment: Holy Fire bitince patlar, INT %30 |

- **Neden böyle:** Paladin hem takım direği hem alan yakıcı. Divine Light satırı bu ana kararı verir. Holy Strike "seri çekiç" ya da "sıçrama" olur. Resurrection ucuz-sık diriltme ya da pahalı-kalkanlı dönüş arasında seçtirir. Judgment alan / yangın kontrolü verir; bar'daki Holy Soil ve Kindled Path bu satıra bağlanır.
- **Ult kolları (Radiance):** u = hasar (Searing Dawn, Scorching Light, Wrath of Heaven); r = öldürme ödülü (Final Light, Reaping Dawn, Sunstrike); d = tek hedef ışın (Focused Beam, Pillar of Wrath, Lance of Dawn); l = döngü (Hallowed Steps, Frugal Glory, Second Sunrise).
- **Bar (Crusade Mastery):** 5 Battle Hymn (ilk tur Holy Strike +%15), 10 Holy Soil (Holy Fire'daki düşmana +%4), 15 Charging Faith (her öldürme 1 tur Haste), 20 Kindled Path (Holy Fire'da ölen düşman Judgment beklemesini 1 düşürür), 25 Crusader's Oath (%30 altına düşünce sonraki skill kesin kritik, savaşta bir kez).
- Her düğüm YZ değeri + testle gelir (`skill-tree-logic.md`).

## 4. Ömer kararları
- **Paladin (Ömer 2026-10-24; open-questions-archive madde 416):**
  - Ult Radiance: 0.9.8 öncesi davranışa dönüş: TÜM dostlara şifa (eksik cana göre +%50'ye kadar) + TÜM düşmanlara kutsal hasar, zemin yok. D11 tek hücre / Holy Ground sürümü (madde 406) geri alındı.
  - Judgment: TEK hücre, iki tahtaya da atılabilir (madde 416/8). Düşman hücresine anlık kutsal hasar (INT 0,35) + 2 tur Holy Fire (INT 0,45/tur); dost hücresine anlık şifa (INT 0,35) + 2 tur Holy Ground şifa zemini (INT 0,45/tur). Sayılar o gün provizyondu.
  - Divine Light: şifa %35 INT. Evolve Crusader's Dawn: her tur hem en yaralı dosta şifa hem en zayıf düşmana smite, ikisi %25 güçlü (smite şifadan bağımsız); öldürünce 5 MP.
- **2026-11-08 (Ömer):** mana reworkü sonrası MP havuzu 56 -> 35; Radiance 24 -> 18 MP. Resurrection 14 MP kaldı. Judgment düşman hasarı +%5.

## 5. Açıklar
- Divine Light veri değeri 0,27; eski karar %35 diyor. Hangisinin kasıtlı olduğu belgelenmemiş; Ömer'e sorulmalı.
- Judgment şifa 0,3 / holy_ground 0,38: 2026-10-24 kararındaki 0,35 / 0,45'ten farklı; sonradan değişmiş, karar kaydı bulunamadı.
- Paladin bant altı; sonraki denge turu bekliyor.
- Ağaç sayıları sim ile oturmadı.
