# Kahramanlar (Class'lar)

> **Ne için / Güncel mi (2026-11-08):** 13 oynanabilir kahramanın listesi ve ortak kurallar; her kahramanın ayrıntısı kendi sınıf belgesinde. Tablodaki her değer `data/classes/<id>.json` ve `data/skill-trees/<id>.json` ile elle karşılaştırıldı (sürüm 0.9.11.2 verisi). Veri değişince bu tablo da güncellenir.
> Eski sürüm (3 class; Warrior "Berserker", Paladin, Anti-Mage "Ley Brand" kararları dahil): `docs/archive/design/classes-old.md`. O kararlar kod ve veriye işlendi.

## Nerede ne var
| Ne | Yer |
|---|---|
| Kahraman verisi | `data/classes/<id>.json` (yalnız oynanabilir kahramanlar; mob'lar `data/mobs/`) |
| Skill verisi, durumlar | `data/skills.json`, `data/statuses.json` |
| Skill ağacı verisi | `data/skill-trees/<id>.json`, kurallar `_rules.json` |
| Ağaç düğümü nasıl yazılır | `docs/design/classes/skill-tree-logic.md` |
| Denge bandı | `data/balance.json` (+ `docs/balance.md`) |
| Element / hal planı (uygulanmadı) | `docs/design/element-class-template.md` |
| Tier / açılış konsepti | `docs/design/progression/character-tiers.md` |

`data/classes/` içinde ayrıca test kahramanları var (`*_tester`, `pose_tester_1..11`; `testOnly`/`hidden`). Oyunda görünmezler, listeye alınmadı.

## Oynanabilir kahramanlar (13)
Sıra: `data/classes` (id), ana stat / menzil, stat (STR/INT/DEX/LUCK), pasif (veri metni), ağaç sürümü, sınıf belgesi.

| id | Ad | Rol | Ana stat / menzil | Stat | Pasif (veri metni) | Ağaç sürümü | Belge |
|---|---|---|---|---|---|---|---|
| warrior | Warrior | Melee Bruiser | STR / 1 | 26/12/8/14 | Berserker: The lower your HP, the harder you hit: up to 80% more damage at the brink of death. Losing HP also gives Rage. | 1 | [`classes/warrior.md`](classes/warrior.md) |
| defender | Defender | Tank | STR / 1 | 24/24/6/6 | Bulwark Aura: You and the allies right next to you (front, back, left, right) gain bonus armor equal to 40% of your own armor. | 1 | [`classes/defender.md`](classes/defender.md) |
| paladin | Paladin | Holy Healer | INT / 4 | 24/26/4/6 | Divine Light: At the start of your turn, heal the most wounded ally. | 2 | [`classes/paladin.md`](classes/paladin.md) |
| mage | Mage | Elemental Mage | INT / 6 | 20/26/6/8 | Heat Mirage: When an enemy hits the Mage in melee, Burning Ground appears under it for 1 turn (once per round). The Mage takes 10% less Fire and Ice damage. | 5 | [`classes/mage.md`](classes/mage.md) |
| archer | Archer | Marksman | DEX / 6 | 13/13/26/8 | Sharpshooter: The farther the target, the harder you hit: 5% more damage for every row of distance. | 1 | [`classes/archer.md`](classes/archer.md) |
| cutthroat | Cutthroat | Assassin | DEX / 1 | 17/11/26/6 | Opportunist: Deal 25% more damage to targets suffering Wound, Slow, Stun or Wither. | 1 | [`classes/cutthroat.md`](classes/cutthroat.md) |
| antimage | Anti-Mage | Mana Hunter | INT / 4 | 8/26/12/14 | Spellbreaker's Instinct: When an enemy uses a skill that costs MP on your team, your next turn comes 10% sooner (once per round). | 5 | [`classes/antimage.md`](classes/antimage.md) |
| druid | Druid | Nature Summoner | INT / 5 | 22/26/10/2 | Nature's Grudge: When an ally falls, its killer is gripped by roots: Slow and Wither for 3 turns. | 3 | [`classes/druid.md`](classes/druid.md) |
| hexer | Hexer | Curse Caster | LUCK / 5 | 18/10/6/26 | Ill Omen: When a cursed enemy dies, its Omens pass to the nearest enemy (at most 2). If Doom or Doom Mark kills it, nothing passes on. Passed Omens never trigger Doom. | 1 | [`classes/hexer.md`](classes/hexer.md) |
| undead | Undead | Dark Mage | INT / 5 | 26/26/4/4 | Vampiric Bite: Heal for 50% of the damage you deal. Your Skeleton's hits heal you the same way. | 1 | [`classes/undead.md`](classes/undead.md) |
| gambler | Gambler | Risk Taker | LUCK / 5 | 16/6/14/24 | Double or Nothing: Damaging skills with a cooldown have a 25% chance to be ready again immediately. | 1 | [`classes/gambler.md`](classes/gambler.md) |
| vesper | Vesper | Bell Caster | INT / 6 | 21/26/5/8 | Pealing Bells: Every Toll or Thunderpeal you ring makes your bells 7% stronger for the rest of the battle (no limit). | 3 | [`classes/vesper.md`](classes/vesper.md) |
| skald | Thunder Skald | Storm Hammer | STR / 2 | 24/10/8/18 | Conductor: Your lightning deals 25% more damage to targets that are Slowed, Stunned or Shocked, or that your own hit Shocks, Slows or Stuns. | 1 | [`classes/skald.md`](classes/skald.md) |

Yalnız Omen (Hexer) ve Dark Bond (Undead) kahramana özgü mekaniktir; hiçbir mob almaz.

**Seferdeki erişim** (`data/campaign/campaign.json`): başlangıç kahramanı (`starterPool`) warrior, skald, paladin, druid; bölük ve aday havuzunda (`companyPool`, `recruitPool`) 13 kahramanın hepsi. Vesper'ın seferdeki açılışı (Sunken Chapel olayı): `classes/vesper.md` bölüm 5.

## Sınıf belgesi şablonu (tek biçim)
Her `classes/<id>.md` aynı sırada: başta "Ne için / Güncel mi" satırı; **1 Kimlik** (rol, stat, pasif), **2 Skill'ler** (tablo: Skill | Ne yapar | MP / bekleme | menzil | sayı), **3 Ağaç** (`data/skill-trees/<id>.json` özeti: satır başına düğüm adları + bir cümle; uzun düğüm metni kopyalanmaz), **4 YZ notları**, **5 Açık işler / kararlar** (kısa), **6 Tarihçe** (yalnız arşiv bağlantısı: `docs/archive/design/classes/<id>.md`). Sayılar veriden alınır; elle yazılmaz.

## Pasif ve ağaç tasarım mantığı (tüm sınıflar)
- Pasif = sınıfın imza mekaniği; sınıf kimliğini tek cümlede taşır (Berserker, Divine Light, Conductor...).
- Ağaç = skill başına dallar; her düğüm o skill'in nasıl oynandığını değiştirir. Koşulsuz "+%X hasar" yazılmaz; her güç ekinin koşulu, ölçeği ya da bedeli vardır.
- Satır şekli: küçük dolgular, anahtar düğüm (n0), iki yön + ödül, bedelli uç, evrim. Ult'ın kolları ve mastery bar sınıf kimliğine hizmet eder.
- Her düğüm YZ değeri ve testle gelir.
- Sahip belge ve tüm kurallar: `classes/skill-tree-logic.md` (burada tekrarlanmaz).

## Konsept (motorda yok)
| Ad | Rol | Durum | Belge |
|---|---|---|---|
| Blood Warden | Ön saf düellocu; kaynak can, lifesteal, counter pasifi, çift silah | Uygulanmadı, fikir; motora/veriye hiçbir şey eklenmez; v2 sanat onayı açık | `future-ideas/blood-warden.md`, `future-ideas/blood-warden-art.md` |

## Kurallar
- Her kahraman: 1 net güçlü, 1 net zayıf yan; dört stat toplamı 60 (13 kahramanın hepsinde böyle, veriyle doğrulandı); en yüksek temel stat diğer üçün toplamının en çok %80'i (bugün en yüksek oran 0,76).
- Menzil sınıfın özelliğidir (`range.md`); skill kendi `range` değerini taşıyabilir (Skald taban 2, Stormcall 3).
- Off-hand affix'leri sınıfa bağlanmaz; her sınıf 1 el + off-hand ya da 2 el kullanabilir.
- Her yeni skill/kahraman/durum, YZ değerlemesi + testiyle gelir.
- Yeni stat, kaynak veya mekanik Ömer'e sorulmadan eklenmez.
- Ağaç skill'in oynanışını değiştirir; koşulsuz "+%X hasar" düğümü yazılmaz.
- Denge ölçümü ve bant: `docs/balance.md`; muaf sınıf: `tests/balance-checks.ts > PENDING_BALANCE` (bugün druid).

## Doğrulanamayanlar
- Element sütunu yok: `data/classes` içinde element alanı yok, elementler skill'lerde (Mage ateş/buz, Vesper kutsal/şimşek, Skald şimşek, Paladin kutsal).
- Sanatın eksiksizliği (ikon, vfx, ses kendi mi ödünç mü) tek tek kontrol edilmedi; sahibi `docs/arch/areas/character-vfx.md`.
