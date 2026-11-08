# Kahramanlar (Class'lar)

> Güncellendi 2026-11-08, sürüm 0.9.11. **Ömer onayı bekliyor** (vision.md taslağıyla birlikte).
> Eski sürüm (3 class; Warrior "Berserker", Paladin, Anti-Mage "Ley Brand" kararları dahil): `docs/archive/design/classes-old.md`. O kararlar kod ve veriye işlendi.

## Nerede ne var
| Ne | Yer |
|---|---|
| Kahraman verisi | `data/classes/<id>.json` (yalnız oynanabilir kahramanlar; mob'lar `data/mobs/`) |
| Skill ağacı verisi | `data/skill-trees/<id>.json`, kurallar `_rules.json` |
| Ağaç düğümü nasıl yazılır | `docs/design/classes/skill-tree-logic.md` |
| Denge bandı | `data/balance.json` (+ `docs/balance.md`) |
| Yeni kahraman şablonu | `docs/design/element-class-template.md` |
| Tier/açılış konsepti | `docs/design/progression/character-tiers.md` |

`data/classes/` içinde ayrıca test kahramanları var (`*_tester`, `pose_tester_1..11`; `testOnly`/`hidden`). Oyunda görünmezler, listeye alınmadı.

## Oynanabilir kahramanlar (13)
Durum: **bitti** = motor + veri + ağaç dosyası var; **geçici** = bir parçası provizyon ya da yer tutucu.

| id | Ad | Rol | Primary / menzil | İmza (pasif) | Durum | Belge |
|---|---|---|---|---|---|---|
| warrior | Warrior | Melee Bruiser | STR / 1 | Berserker: canı azaldıkça sert vurur, can kaybı Rage verir | bitti | `classes/warrior.md` |
| defender | Defender | Tank | STR / 1 | Bulwark Aura: yanındakilere zırh | bitti | `classes/defender.md` |
| paladin | Paladin | Holy Healer | INT / 4 | Divine Light: tur başı en yaralıyı iyileştirir | bitti | `classes/paladin.md` |
| mage | Mage | Elemental Mage | INT / 6 | Heat Mirage; ateş + buz, Frozen | bitti | `classes/mage.md` |
| archer | Archer | Marksman | DEX / 6 | Sharpshooter | bitti | `classes/archer.md` |
| cutthroat | Cutthroat | Assassin | DEX / 1 | Opportunist | bitti | `classes/cutthroat.md` |
| antimage | Anti-Mage | Mana Hunter | INT / 4 | Spellbreaker's Instinct; Ley Brand | bitti | `classes/antimage.md` |
| druid | Druid | Nature Summoner | INT / 5 | Nature's Grudge; Treant çağrısı | bitti | `classes/druid.md` |
| hexer | Hexer | Curse Caster | LUCK / 5 | Ill Omen: Omen biriktirir, Doom | bitti | `classes/hexer.md` |
| undead | Undead | Dark Mage | INT / 5 | Vampiric Bite; Dark Bond | bitti | `classes/undead.md` |
| gambler | Gambler | Risk Taker | LUCK / 5 | Double or Nothing | bitti | yok |
| vesper | Vesper (ilk adı Bellwarden) | Bell Caster | INT / 6 | Pealing Bells: her çan sonrakileri güçlendirir; kutsal + şimşek, şifa yok | bitti; ağaç sayıları geçici | `classes/vesper.md` |
| skald | Thunder Skald | Storm Hammer | STR / 3 | Conductor: şimşek yavaş/sersem/şoklu hedefe +%25; War Drum hız verir | bitti: kendi sanatı (Thunder Skald v2 pozlar, ikonlar, vfx), skill ağacı tamam (60 düğüm, `data/skill-trees/skald.json`), denge bandında (2026-11-08) | `classes/skald.md` |

Yalnız Omen (Hexer) ve Dark Bond (Undead) kahramana özgü mekaniktir; hiçbir mob almaz.

## Pasif ve ağaç tasarım mantığı (tüm sınıflar)
- Pasif = sınıfın imza mekaniği; sınıf kimliğini tek cümlede taşır (Berserker, Divine Light, Conductor...).
- Ağaç = skill başına dallar; her düğüm o skill'in nasıl oynandığını değiştirir. Koşulsuz "+%X hasar" yazılmaz; her güç ekinin koşulu, ölçeği ya da bedeli vardır.
- Satır şekli: küçük dolgular, anahtar düğüm (n0), iki yön + ödül, bedelli uç, evrim. Ult'ın kolları ve mastery bar sınıf kimliğine hizmet eder.
- Her düğüm YZ değeri ve testle gelir.
- Sahip belge ve tüm kurallar: `classes/skill-tree-logic.md` (burada tekrarlanmaz).

## Konsept (motorda yok)
| Ad | Rol | Durum | Belge |
|---|---|---|---|
| Blood Warden | Ön saf düellocu; kaynak can, lifesteal, counter pasifi, çift silah | Yalnız konsept; motora/veriye hiçbir şey eklenmez; v2 sanat onayı açık | `classes/blood-warden.md`, `classes/blood-warden-art.md` |

## Kurallar
- Her kahraman: 1 net güçlü, 1 net zayıf yan; dört stat toplamı 30; en yüksek temel stat diğer üçün toplamının en çok %80'i.
- Menzil sınıfın özelliğidir (`range.md`).
- Off-hand affix'leri sınıfa bağlanmaz; her sınıf 1 el + off-hand ya da 2 el kullanabilir.
- Her yeni skill/kahraman/durum, YZ değerlemesi + testiyle gelir.
- Yeni stat, kaynak veya mekanik Ömer'e sorulmadan eklenmez.
- Ağaç skill'in oynanışını değiştirir; koşulsuz "+%X hasar" düğümü yazılmaz.

## Doğrulanamayanlar
- Archer, Cutthroat, Gambler, Undead pasifleri veride `text`siz; imza satırı pasif adından yazıldı.
- Element sütunu yok: `data/classes` içinde element alanı yok, elementler skill'lerde. Belgelerden: Mage ateş/buz, Vesper kutsal/şimşek, Skald şimşek, Paladin kutsal.
- "Bitti" etiketi ağaç dosyası + veri varlığından çıkarıldı; sanatın eksiksizliği tek tek kontrol edilmedi.
- Vesper'ın seferdeki açılışı (Sunken Chapel) `areas/character-design.md` notundan, kodla doğrulanmadı.
