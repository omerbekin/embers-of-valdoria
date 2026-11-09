# Druid

> **Ne için / Güncel mi (2026-11-08):** Druid kahramanının kimlik, skill ve ağaç özeti. Sayılar `data/classes/druid.json`, `data/skills.json`, `data/statuses.json` ile birebir (veri değişince burası güncellenir). Çerçeve: `docs/design/classes.md`. Tarihçe arşivde (bölüm 6).

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `druid` / Nature Summoner |
| Ön sıra önceliği, menzil | 5, menzil 5 |
| Stat (STR / INT / DEX / LUCK) | 22 / 26 / 10 / 2, ana stat INT (toplam 60) |
| Zırh / büyü zırhı | 16 / 0 |
| YZ profili | `support` (`data/ai.json > profiles.support`) |
| Pasif | **Nature's Grudge**: "When an ally falls, its killer is gripped by roots: Slow and Wither for 3 turns." |

- Doğa çağırıcısı: tek sınıfta şifa, kontrol ve çağrı.
- **Güçlü:** şifa (Healing Rain), kontrol (Slow, Stun, Wither) ve çağrı (Treant); dost düşünce katili cezalandırır.
- **Zayıf:** MP'ye bağımlı (Summon Treant ve Nature's Wrath pahalı); mana baskısı bu tip sınıfları en çok düşürür.
- Denge muafiyeti: `tests/balance-checks.ts > PENDING_BALANCE` = ['druid']; görsel rework bitince 5000 savaşla yeniden bakılır, sayıya şimdilik dokunulmaz (Ömer 2026-11-08, `docs/arch/areas/character-design.md`).
- Görsel / VFX: `docs/arch/areas/character-vfx.md` > Druid VFX (kural, Ömer 2026-11-08: VFX'te fps ve kare dayanak konumu ölçülür).
- Denge ölçümü: `docs/balance.md` (kopya yüzde yazılmaz).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Menzil | Sayı (veri) |
|---|---|---|---|---|
| Thorn Whip (`thorn_whip`) | Tek hedef, doğa büyüsü + Wound | 0 / yok | sınıf (5) | hasar magic/nature INT 0,88; status: status=wound, turns=2 |
| Nature's Wrath (`natures_wrath`) | 2x3 alana sarmaşık, önce ön sıra; Soaked verir | 17 / 3 | sınıf (5) | hasar magic/nature INT 0,64; status: status=soaked, turns=1; area={shape:rect, rows:2, cols:3, anchor:bottom_left, stages:row} |
| Healing Rain (`rejuvenate`) | Tek hücreye (boş hücre de olur, yalnız kendi tahtası) şifa + 3 tur şifa zemini; su sayılır, ıslatmaz | 12 / 3 | sınıf (5) | heal: scale=int, power=0,675, side=allies; ground: ground=healing_rain, turns=3, scale=int, power=0,225, side=allies; area={shape:rect, rows:1, cols:1, emptyOwn:true} |
| Summon Treant (`summon_treant`) | Önde duran Treant çağırır | 18 / 5, ilk 1 | sınıf (5) | summon: unit=treant, lifespan=3 |

Geçerli sayı: `data/skills.json` > skill id; yukarıdaki sütun dökümdür. Sayı değişince veri, ilgili test (`tests/skill-tree-fx-druid.test.ts`) ve bu tablo birlikte güncellenir.

### Treant (`data/summons/treant.json`)
- Çağıranın item hariç INT'inden türer (INT, maks can, can yenilenmesi için çarpanlar summon dosyasında). Menzil 4, YZ `vinewarden`, etiket `nature`, MP yok.
- Skill'leri: Root Smash (kendi yumruğu, tek hedef, bedava) ve Vine Snare (zincir sıçrama, doğa büyüsü, düşüş, Stun şansı). Treant uzak menzilli (arşiv madde 222).

## 3. Ağaç

Ağaç Druid'i üç eksende ayırır: Wither (pasifin cezası, süreç içinde büyür), zemin ve alan kontrolü (Nature's Wrath, Healing Rain), Treant (ult kolları). Genel stat yok.

Veri: `data/skill-trees/druid.json` (sürüm 3, bar "Deep Roots Mastery"). Düğüm adları; metinler için dosyaya bak. Şekil kuralı: `skill-tree-logic.md`.

- **Nature's Grudge (pasif):** dolgu Bitter Sap, Spreading Spite, Choking Grip, Bitter Balm; anahtar Rot Remembers; yön A Creeping Blight (ödül Rot Bloom, uç Black Mold); yön B Gnawing Rot (ödül Rot to the Core, uç Grief's Toll); evrim Ever-Rot. Anahtar: "Nature's Grudge also triggers the first time an ally drops below 30% HP: that attacker starts Withering for 3 turns."
- **Thorn Whip:** dolgu Hooked Barbs, Nettle Sting, Charged Lash, Keen Thorns; anahtar Whip Crack; yön A Forked Thorn (ödül Third Lash, uç Wild Thorns); yön B Reaping Vine (ödül Endless Lash, uç Cutting Haste); evrim Thornstorm Lash. Anahtar: "Thorn Whip deals 25% increased damage to a target below 30% HP."
- **Nature's Wrath:** dolgu Grasping Earth, Tangleroot, Pollen Drift, Deep Tangle; anahtar Root Field; yön A Hushing Moss (ödül Overgrown Field, uç Mire); yön B Grasp and Drag (ödül Strangling Grove, uç Briar Prison); evrim Thicket Wave. Anahtar: "Nature's Wrath leaves a root field for 2 turns: enemies standing in it are Slowed while inside."
- **Healing Rain:** dolgu Tender Sap, Long Bloom, Soft Hands, Dewdrop Shield; anahtar Overflowing Cup; yön A Spreading Roots (ödül Grove Bloom, uç Thin Sap); yön B Emergency Bloom (ödül Lifebloom, uç Desperate Sap); evrim Verdant Link. Anahtar: "Healing from Healing Rain's first heal beyond full HP becomes a shield of the same size (the ground's healing does not)."
- **Ult Summon Treant (tek kol seçilir):** u Crashing Arrival, Oakfall, Falling Oak; r Heavy Boughs, Heavy Smash, Wrathful Oak; d Splinter Burst, Brittle Bark, Living Bomb; l Shieldbark, Thornbark, Guardian Oak.
- **Bar Deep Roots Mastery:** 5 Deep Rot, 10 Heart of the Wild, 15 Tight Weave, 20 Deep Spring, 25 Barkskin.

## 4. YZ notları

- Profil: `data/ai.json > profiles.support`. Her yeni skill / ağaç tetiği YZ değeri + test ile gelir (`tests/ai-coverage.test.ts`).
- Treant'ın YZ profili `vinewarden`.

## 5. Açık işler / kararlar

- Healing Rain: iç id `rejuvenate` kalır, görünen ad Healing Rain; tek hücre (boş hücre de olur, yalnız kendi tahtası), su sayılır, yeni durum yok (madde 505). Ağaç Thin Sap yenilenmeyi (hot) de yarıya indirir.
- Nature's Wrath 0,64 kalır (0,58 Druid'i düşürmedi, Ömer geri aldı); Soaked 1 tur (Ömer 2026-11-01).
- Kitinde MP harcayan olmayan birimde (Treant dahil) mana yok (madde 460).
- **Açık:** Living Bomb (4.d3): Treant dururken yeniden çağırma yalnız bekleme kısalırsa mümkün (madde 394 sorusu, cevabı teyit edilmedi).
- Healing Rain görseli: `src/game/vfx.ts` zemin rengi geçici. Tutorial sınıf önerisi (Hooked Barbs + Intelligence) Ömer onayı bekliyor (madde 481).

## 6. Tarihçe

Eski tam belge (karar günlüğü, ara değerler, eski ağaç tabloları): `docs/archive/design/classes/druid.md`.
