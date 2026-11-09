> Ne için: docs/design/classes/druid.md belgesinden 2026-11-08'de taşınan eski tam metin (karar günlüğü, ara değerler, eski tablolar); güncel değil. Güncel belge: docs/design/classes/druid.md.

# Druid: tasarım dökümanı

> Kaynak: `data/classes/druid.json`, `data/skills.json`, `data/summons/treant.json`, `data/skill-trees/druid.json` (sürüm 3), 2026-11-08. Ağaç mantığı: `skill-tree-logic.md`.

## 1. Kimlik

| Alan | Değer |
|---|---|
| id / rol | `druid` / Nature Summoner |
| Ön sıra önceliği, menzil | 5, menzil 5 |
| Stat (str / int / dex / luck) | 22 / 26 / 10 / 2, primary INT |
| Zırh | 16 zırh, 0 büyü zırhı |
| YZ | `support` |

- **Güçlü yan:** tek sınıfta şifa (Healing Rain), kontrol (Slow, Stun, Wither) ve çağrı (Treant); dost düşünce katili cezalandırır.
- **Zayıf yan:** MP'ye bağımlı (Summon Treant 18, Nature's Wrath 17); mana baskısı en çok bu tip sınıfları düşürür (Rest %10,0). Kazanma %52,4 / %52,9; Druid denge muafiyeti `PENDING_BALANCE`'ta (bir grup 56,5).

## 2. Skill'ler

| Skill | Ne yapar | MP / bekleme | Sayı |
|---|---|---|---|
| Thorn Whip | Tek hedef, doğa büyüsü + Wound | 0 / yok | INT güç 0,88; Wound 2 tur |
| Nature's Wrath | 2x3 alana sarmaşık, önce ön sıra; Soaked verir | 17 / 3 | güç 0,64; Soaked 1 tur |
| Healing Rain (iç id `rejuvenate`) | Tek hücreye (boş hücre de olur, yalnız kendi tahtası) şifa + 3 tur şifa zemini; su sayılır, ıslatmaz | 12 / 3 | şifa 0,675; zemin 0,225 x 3 tur; Hallowed verir |
| Summon Treant (4. yuva) | Önde duran Treant çağırır | 18 / 5 (ilk bekleme 1) | ömür 3 tur |

### Treant (`data/summons/treant.json`)
- Çağıranın item hariç INT'inden türer: INT = çağıran INT x 1,04, maks can = çağıran INT x 4,04, can yenilenmesi INT x 0,1298. L1 Druid (INT 26): INT 27, can 105.
- Menzil 4, zırh 10, hız 10, MP 0, YZ `vinewarden`, etiket `nature`.
- Skill'leri: **Root Smash** (kendi yumruğu, tek hedef, fiziksel INT güç 0,575, bedava) ve **Vine Snare** (zincir 4 sıçrama, güç 0,225 doğa büyüsü, düşüş 0,8, %25 Stun 1 tur, bekleme 3).
- Thorn Shield kaldırıldı (madde 222).

## 3. Pasif ve skill ağacı

### Pasif: Nature's Grudge
"When an ally falls, its killer is gripped by roots: Slow and Wither for 3 turns." (`naturesGrudge`, güç 0,15 INT ölçekli, 3 tur). Metni veride var.

### Ağaç mantığı
Class kimliği: **bakım ve intikam**. Ağaç Druid'i üç eksende ayırır: Wither (pasifin cezası, süreç içinde büyür), zemin ve alan kontrolü (Nature's Wrath, Healing Rain), Treant (ult kolları).

| Satır | Ana fikir | ea / eb yönü | Evrim (v) |
|---|---|---|---|
| Nature's Grudge | Wither'ı yaymak ve büyütmek | **Creeping Blight** (ölünce Wither en yakına atlar; ma Rot Bloom: ölünce patlar) / **Gnawing Rot** (her tikte büyür; mb Rot to the Core). Kan: Black Mold (Wither +%30, Slow yok) / Grief's Toll (çift hasar, her tetik maks canın %10'u) | Ever-Rot: her turda en çok canlıya Wither |
| Thorn Whip | Tek hedefi bitirme | **Forked Thorn** (2. düşmana zincir; ma Third Lash: her 3. kırbaç) / **Reaping Vine** (öldürünce MP; mb Endless Lash: öldürünce sıra erken). Kan: Wild Thorns (+%15 ama kritik yok) / Cutting Haste (öldürünce 8 MP, sağlam hedefe -%15) | Thornstorm Lash: üç kırbaç, kritlerde MP |
| Nature's Wrath | Kök alanı | **Hushing Moss** (alan Silence; ma Overgrown Field: 2 tur uzun + hasar) / **Grasp and Drag** (arka sırayı öne çeker; mb Strangling Grove: Slow'lu hepsi Stun). Kan: Mire (alan 4 tur, +%15, bekleme 5) / Briar Prison (ilk sırayı Stun'lar, hasar yok) | Thicket Wave: aynı hücrelere bir sonraki turda tekrar, Stun |
| Healing Rain | Şifa şekli | **Spreading Roots** (zemin komşu hücrelere de; ma Grove Bloom: sıradaki herkese) / **Emergency Bloom** (%30 altına +%25; mb Lifebloom: zemindekine +%50). Kan: Thin Sap (herkese ama %50 zayıf, bekleme 4) / Desperate Sap (zemin yok, ilk şifa +%125, bekleme 4) | Verdant Link: en düşük canlı ikinci dosta da tam şifa |

- **Ult kolları (Summon Treant):** u = iniş hasarı (Crashing Arrival, Oakfall, Falling Oak: Stun); r = Root Smash (Heavy Boughs, Heavy Smash, Wrathful Oak: iki kez oynar, 2 tur yaşar); d = patlama (Splinter Burst, Brittle Bark, Living Bomb: Treant dururken yeniden çağırınca patlar); l = savunma (Shieldbark: Taunt, Thornbark, Guardian Oak: arkadaki dostu Guard'lar).
- **Mastery bar "Deep Roots Mastery":** 5 Deep Rot (Wither +1 tur), 10 Heart of the Wild (doğa kritinde 4 MP), 15 Tight Weave (Nature's Wrath +%3), 20 Deep Spring (Healing Rain +%15), 25 Barkskin (Treant -%15 hasar).
- **Neden:** her kol Druid'in üç kimlik parçasından birine bağlı (intikam, kontrol alanı, şifa/zemin) ve genel statı kimseye vermez.

### Görsel / VFX notu (2026-11-08)
- Druid efektleri, Healing Rain görseli ve Treant (AB3 sprite) Character vfx alanında (`docs/arch/areas/character-vfx.md`). Kural (Ömer 2026-11-08): VFX'te fps ve kare dayanak konumu ölçülür.
- Düzeltme (2026-11-08): fps düzeltildi (3x ara kare); skill 1, 2 ve 4 efektleri %30 küçük. Ayrıntı: `docs/arch/areas/character-vfx.md` > Durum: Druid VFX.
- Treant ölme efekti (`summondeath_treant`) 8/10, bağlı; savaşta, 21:9 ve telefonda bakılmadı. Druid efektleri telefonda bakılmadı.

## 4. Ömer kararları

- 2026-10-18, madde 350: "Druid 1. ve 2. skillin damage'i %5 artsın" (Thorn Whip 0,86 -> 0,903, Nature's Wrath 0,63 -> 0,662); Druid STR 22 / LUCK 2 kaldı (can 96). Güncel veri 0,88 / 0,64: sonraki turlarda değişti.
- 2026-10-18, madde 351: summon yeniden tasarımı (Treant gücü çağıranın INT'inden türer; Treant canı / tank rolü / önde dizilme aynı).
- Arşiv madde 222: Treant uzak menzilli oldu, Vine Snare eklendi, Thorn Shield kaldırıldı (Ömer kararları; tarih arşivde net değil).
- 2026-10-22, madde 394 (19): Thin Sap yenilenmeyi (hot) de yarıya indirir.
- 2026-10-22, madde 398 (5): Druid 1.a çelişkisi çözüldü: 1.ma "Third Lash" oldu (her 3. Thorn Whip).
- 2026-10-31, madde 460: kitinde MP harcayan olmayan birimde (Treant dahil) mana yok.
- Madde 505 (Healing Rain varsayımları): iç id `rejuvenate` kalır, görünen ad Healing Rain; tek hücre, su sayılır, yeni durum yok. Ağaç sürümü 3.
- 2026-11-01/02, madde 506 (7): Nature's Wrath 0,64 kalır (0,58 Druid'i düşürmedi, Ömer geri aldı); Soaked 2 -> 1 tur (Ömer); Druid muaf, 5000 savaşla doğrulanınca kalkar.
- 2026-11-08 (`docs/arch/areas/character-design.md`): Druid muafiyeti, görsel rework bitince 5000 ile yeniden bakılır; sayıya şimdilik dokunulmaz (Ömer).

## 5. Açıklar

- Pasif ve tüm skill metinleri veride var; metinsiz pasif yok.
- Living Bomb (4.d3): Summon Treant bekleme 5, Treant ömrü 3; Treant dururken yeniden çağırma yalnız bekleme kısalırsa mümkün (madde 394 sorusu; cevabı bu belgede teyit edilmedi).
- Healing Rain görseli: `src/game/vfx.ts` zemin rengi geçici.
- Tutorial sınıf önerisi (Hooked Barbs + Intelligence) Ömer onayı bekliyor (madde 481).
