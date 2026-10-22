# Codex (wiki) ikonları: envanter ve Codex CLI promptları

content-designer, 2026-10-23. Durum: **Ömer'in örnek set (4 ikon) onayını bekliyor.** Kod ve asset değişmedi; bu belge yalnızca plan + hazır promptlar.
Stil kaynağı: `docs/design/art/skill-tree-icons-warrior.md` bölüm 3 (ortak blok) ve `docs/design/icon-redraw-plan.md` 3.4. Codex'te boyalı yerde duran arayüz ikonlarıyla (`assets/ui-icons/*.png`: pirinç, koyu deri, meşe, kalın koyu kontur) aynı aile olsun diye stil referansı `assets/ui-icons/codex.png` (Codex düğmesinin kendi kitabı). Kural (Ömer): tek kalın konu, az kırıntı, sade, sıkı ortaçağ.
Üretim: Codex CLI (`node tools/codex/imagegen.mjs`, `docs/arch/codex-imagegen.md`), en fazla 2 paralel, ~2 dk/görsel.

## 1. Sorun neden var (kısa)

Codex'teki ikonların çoğu boyalı PNG'dir (sınıf portreleri, skill ikonları, stat ikonları, durum/zemin/element ikonları). Ama sol menü, Getting Started, Lessons ve Stats & Mechanics makaleleri **çıplak ikon adı** kullanır (`'sword'`, `'book'`, `'hourglass'`...). Bu adlar `src/ui/dom-icons.ts > bindIcon` -> `src/game/art-registry.ts > resolveSprite` ile Shared sahibine çözülür; Shared'in o adda boyalı dosyası olmadığı için **kodla çizilen eski piksel ikon** (`src/game/pixel-icons.ts` 64x64 ya da `src/game/art-v2/shared/icons.ts` 128 piksel) çıkar. Boyalı satırların yanında "emoji / clip-art" gibi duranlar bunlar. Ayrıca bazı makaleler bir sınıfın skill ikon adını kullanır (`'radiance'`, `'backstab'`...) ama sahibi verilmediği için o sınıfın boyalı ikonu yerine piksel yedeği gösterilir.

## 2. Envanter

İşaretler: **YENİ** = yeni görsel üretilecek; **YENİDEN KULLAN** = oyunda zaten boyalı karşılığı var, yalnızca kod bağlantısı (ui-dev); **KALIR** = zaten oyun stilinde.

### 2.1 Sol menü (16 satır) — hepsi piksel, hepsi YENİ
Kaynak: bölümler `src/wiki/codex.ts > CODEX_SECTIONS`, Assets alt satırları `src/wiki/assets/nav.ts > ASSET_NAV`; çizim `src/wiki/view.ts` (`pic(item.icon, GOLD, 'cx-navicon', SHARED_KEY)`). Bugün tekrar eden ikonlar da var (frame x2, helm x2, sword x2, drop x2).

| Satır | Şimdiki ikon (piksel) | Yeni id |
|---|---|---|
| Getting Started | `sword` | `nav_start` |
| Lessons | `book` | `nav_lessons` |
| Classes | `helm` | `nav_classes` |
| Skills | `fireball` | `nav_skills` |
| Stats & Mechanics | `muscle` | `nav_mechanics` |
| Statuses & Grounds | `drop` | `nav_statuses` |
| Elements | `meteor` | `nav_elements` |
| Assets | `frame` | `nav_assets` |
| Sounds | `speaker` | `nav_sounds` |
| Animations | `wand` | `nav_animations` |
| Icons | `frame` | `nav_icons` |
| Character Art | `helm` | `nav_art` |
| Poses | `sword` | `nav_poses` |
| Palette & UI | `drop` | `nav_palette` |
| Versions | `swap` | `nav_versions` |
| Legacy | `skull` | `nav_legacy` |

### 2.2 Getting Started (`src/wiki/catalog.ts > buildGettingStarted`, `rangeArticle`)

| Madde | Şimdiki | Karar |
|---|---|---|
| The goal | `sword` (piksel) | YENİ `gs_goal` |
| Turn order and the SPD counter | `hourglass` (piksel) | YENİ `gs_turns` |
| Formation and rows | `team` (piksel) | YENİDEN KULLAN `ui:formation` (savaş/harita Formation bağlantısının boyalı dört kalkanı) |
| Range | `bow` (piksel) | YENİDEN KULLAN `ui:range` (boyalı pirinç ok) |
| MP and cooldowns | `stat:mp` (boyalı mana ikonu) | KALIR (istenirse `ui:cooldown` boyalı kum saati) |
| Reading the screen | `info` (piksel) | YENİ `gs_screen` |

### 2.3 Lessons (`buildLessons`)
Tüm dersler tek ikon `book` (piksel) kullanır. YENİ ikon gerekmez: hepsi sol menüdeki `nav_lessons` ikonunu kullanır.

### 2.4 Elements
- Element maddeleri (Fire, Ice...): boyalı `misc-icons/element/*` — KALIR.
- "Weakness table" (`src/wiki/codex.ts`): `meteor` (piksel) — YENİ `el_weakness`.

### 2.5 Stats & Mechanics (`buildMechanics` ve yardımcıları)

KALIR: 4 özellik + 11 türetilmiş stat + 4 primary bonus makalesi ve "Accuracy, evasion and hit chance" (hepsi boyalı `assets/stat-icons/*`).

| Madde | Şimdiki | Karar |
|---|---|---|
| Damage formula | `sword` | YENİ `mech_damage` |
| Ground effects | `flame` | YENİ `mech_ground` |
| Enemy passives | `skull` | YENİ `mech_enemy_passives` |
| Bets (Gambler) | `dice` | YENİ `mech_gamble` |
| Rage | `rage` (piksel) | YENİDEN KULLAN `ui:rage` (HUD Rage çipinin boyalı ikonu) |
| Area shapes | `blast` | YENİ `mech_area` |
| Actions: Rest, Skip Turn and Move | `boot` | YENİDEN KULLAN `ui:move` |
| Valor | `ankh` | YENİ `mech_valor` (Valor mangalı) |
| Levels and XP | `muscle` | YENİ `mech_levels` |
| Strikes from behind and sure crits | `backstab` | YENİDEN KULLAN Cutthroat boyalı `backstab` (sahip verilmeli) |
| Bonus damage against weakened targets | `opportunist` | YENİDEN KULLAN Cutthroat boyalı `opportunist` |
| Curses: Omen, Doom, Withering | `eye` | YENİDEN KULLAN Hexer boyalı `eye` (ya da boyalı `status:omen`) |
| Ready again immediately | `echo` | YENİDEN KULLAN Mage boyalı `echo` |
| Corpses | `skull` | YENİDEN KULLAN boyalı `fx:corpse` (savaştaki ceset işareti) |
| Summons | `treant` | YENİDEN KULLAN Druid boyalı `treant` |
| Resurrection | `ankh` | YENİDEN KULLAN Paladin boyalı `ankh` |
| Shields | `shield` | YENİDEN KULLAN boyalı `fx:barrier` (şu an kullanılmıyor) |
| Removing buffs and debuffs | `manabarrier` | YENİDEN KULLAN Mage boyalı `manabarrier` |
| Dark Bond and life steal | `darkbond` | YENİDEN KULLAN Undead boyalı `darkbond` |
| Skills that scale with two stats | `tremor2` | YENİDEN KULLAN Defender boyalı `tremor2` |
| Heals that favour the wounded | `radiance` | YENİDEN KULLAN Paladin boyalı `radiance` |
| Half-turn skills | `hourglass` | YENİ `mech_half_turn` |
| Taunt, guard and mana burn | `guardian` | YENİDEN KULLAN Defender boyalı `taunt2` |
| Silence and Drain Field | `manaburn` | YENİDEN KULLAN Anti-Mage boyalı `manaburn` |
| Multiplayer | `team` | YENİ `mech_multiplayer` |
| Campaign | `boot` | YENİ `mech_campaign` |
| Items and gear | `helm` | YENİDEN KULLAN `ui:gear` (Gear bağlantısının boyalı ikonu) |
| Item affixes | `rune` | YENİ `mech_affixes` |
| Legendary items | `burst` | YENİ `mech_legendary` |
| Endless | `skull` | YENİ `mech_endless` |
| Bosses (2 madde: Bridge Warden, Lord Morvane) | boss `logo` (`wardenlogo`, `ironmooring`, ...; piksel) | YENİDEN KULLAN `assets/avatars/<boss>.png` portresi |
| Enemies (9 aile) | ailenin ilk mobunun `logo`su (`skull`, `helm`, `bow`...; piksel) | YENİDEN KULLAN ilk mobun `assets/avatars/<mob>.png` portresi |

### 2.6 Diğer bölümler
- **Classes:** portre / avatar — KALIR.
- **Skills:** her skill kendi sınıfının boyalı ikonu (`assets/icons-v2/<sınıf>/`, mob skill'leri `assets/mob-icons/`) — KALIR.
- **Statuses:** 17 durum boyalı (`misc-icons/status/`) — KALIR. **Boyalısı olmayan 5 durum** piksel yedeğe düşüyor: Burning, Fleet, Exposed, Sunder, Weakened. Bunlar savaştaki can çubuğu rozetinde de aynı ikonla görünür.
- **Grounds:** 4 zemin boyalı — KALIR. **Boyalısı olmayan 6 zemin** skill ikonunun piksel yedeğine düşüyor: Quaking Ground, Field of Shafts, Root Field, Storm, Hall of Silence, Lingering Rain.
- Bu 11 ikon (bölüm 4.3) **isteğe bağlı**: Ömer'in istediği kapsamın (menü + genel ikonlu maddeler) dışında kalıyor, savaş ekranını da değiştirir; Ömer "evet" derse üretilir.

### 2.7 Sayım

| Grup | YENİ | YENİDEN KULLAN (kod) |
|---|---|---|
| Sol menü | 16 | 0 |
| Getting Started | 3 | 2 |
| Lessons | 0 (nav_lessons) | - |
| Elements | 1 | 0 |
| Stats & Mechanics | 13 | 17 madde + 2 boss + 9 aile |
| **Toplam (ana)** | **33** | 19 makale + 11 portre |
| İsteğe bağlı durum/zemin | 11 | - |

## 3. Örnek set (önce bunlar; Ömer onayı)

| id | Neden |
|---|---|
| `nav_start` (Getting Started) | menünün ilk satırı; en çok görünen ikon |
| `nav_mechanics` (Stats & Mechanics) | metal + ahşap, ince parçalı konu 24 px'te okunuyor mu testi |
| `nav_sounds` (Sounds) | Assets alt satırı; tek nesne, sade siluet |
| `gs_turns` (Turn order) | makale ikonu; mevcut boyalı `ui:cooldown` kum saatiyle aynı aileden mi |

Önizleme Ömer'e: koyu Codex zemini üzerinde 128, 48 ve 24 px; yanında mevcut boyalı `ui:formation` ve bir skill ikonu (aile uyumu). Onaydan sonra tam liste koşulur (hedef varsa atlandığı için örnekler yeniden üretilmez).

## 4. Promptlar

### 4.1 Ortak blok (ana 33 ikon)
Her prompt = bu blok + ` Subject (<Ad>): <konu>`. Stil referansı `-i assets/ui-icons/codex.png`.

```
Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.
```

İsteğe bağlı durum ikonları için blok aynı ama "status badge icon", doygun renkler, referans `assets/misc-icons/status/wound.png`; zeminler için "effect sitting on a small irregular patch of earth seen from slightly above", referans `assets/misc-icons/ground/poison.png` (birleşik metinler JSON'da).

### 4.2 Konular (ana 33)

| id | Ad | Konu (Subject) |
|---|---|---|
| `nav_start` | Getting Started | a weathered oak signpost on a short post with two blank arrow-shaped boards pointing left and right, iron nails, no writing on the boards. |
| `nav_lessons` | Lessons | a half-unrolled parchment scroll with a red wax seal, a white feather quill lying across it. |
| `nav_classes` | Classes | a steel knight's great helm with brass trim and a short crimson plume, seen from the front-left. |
| `nav_skills` | Skills | a steel longsword and a gnarled wooden mage staff crossed in an X, a small warm ember glow where they cross. |
| `nav_mechanics` | Stats & Mechanics | a brass balance scale with two hanging pans, one pan slightly lower, on a dark oak base. |
| `nav_statuses` | Statuses & Grounds | a small round glass potion flask with a cork stopper, filled with swirling glowing violet liquid. |
| `nav_elements` | Elements | a round brass amulet set with four cut gems in a cross: fire red, ice blue, nature green and holy gold, each with a tiny glint. |
| `nav_assets` | Assets | a small iron-bound oak treasure chest with its lid half open, a soft warm golden light inside. |
| `nav_sounds` | Sounds | a curved brass hunting horn with a dark leather strap, mouth of the horn facing right. |
| `nav_animations` | Animations | a lit beeswax candle in a small brass holder, its flame bending into one bold swirling motion trail. |
| `nav_icons` | Icons | a square brass-framed oak plaque with a simple painted sword emblem on it, like a heraldic tile. |
| `nav_art` | Character Art | a wooden painter's palette with a thumb hole and five dabs of paint (red, blue, ochre, green, white), one brush resting on it. |
| `nav_poses` | Poses | a jointed wooden artist's lay figure (mannequin) standing with one arm raised as if holding a sword. |
| `nav_palette` | Palette & UI | three small clay pigment pots in a row, filled with crimson, deep blue and gold pigment powder. |
| `nav_versions` | Versions | two overlapping parchment pages, the back one old, yellowed and torn at the edge, the front one fresh and clean, tied together with a red ribbon. |
| `nav_legacy` | Legacy | an old cracked leather tome with frayed pages and a rusted iron clasp, a little dust on its cover. |
| `gs_goal` | The goal | an upright steel longsword with a brass crossguard inside a golden laurel victory wreath. |
| `gs_turns` | Turn order and the SPD counter | a brass and oak hourglass with small white feathered wings on both sides, sand running. |
| `gs_screen` | Reading the screen | a round glass reading lens with a brass rim and a short turned-oak handle, held over the corner of a parchment sheet. |
| `el_weakness` | Weakness table | a battered steel heater shield with one glowing ember-orange crack running through it. |
| `mech_damage` | Damage formula | a steel sword edge striking a small black iron anvil, a few bright sparks. |
| `mech_ground` | Ground effects | a cracked grey flagstone with a small low flame and a thin curl of smoke rising from the crack. |
| `mech_enemy_passives` | Enemy passives | a dark iron horned helm with two glowing red eye slits. |
| `mech_gamble` | Bets (Gambler) | two carved bone dice with dark pips, one tumbling in the air above the other. |
| `mech_area` | Area shapes | a 3x3 square of stone floor tiles seen from slightly above, the centre tile and the four tiles around it glowing warm orange. |
| `mech_half_turn` | Half-turn skills | a medieval candle clock: a tall wax candle burnt down exactly halfway, a brass ring marking the middle, a small flame on top. |
| `mech_multiplayer` | Multiplayer | two steel plate gauntlets clasping each other in a firm handshake. |
| `mech_campaign` | Campaign | an unrolled parchment map with a dashed red route line ending at a small red pennant flag pin. |
| `mech_legendary` | Legendary items | an ornate gold-hilted sword with a large glowing amber gem in its pommel, a soft golden glow. |
| `mech_affixes` | Item affixes | a single smooth blue-grey runestone with one simple angular carved glyph glowing pale blue (a symbol, not a letter). |
| `mech_levels` | Levels and XP | a short crimson cloth pennant hanging from a spear tip, three stacked gold chevrons embroidered on it. |
| `mech_endless` | Endless | a dark stone archway with a swirling ember-orange void inside it. |
| `mech_valor` | Valor | a black iron brazier on three legs burning with a warm golden flame. |

### 4.3 Konular (isteğe bağlı 11: durum + zemin)

| id | Ad | Konu (Subject) |
|---|---|---|
| `status/burning` | Burning | a bold cluster of orange-yellow flames rising from one charred black ember. |
| `status/fleet` | Fleet | a light leather boot with a small white feathered wing at the heel, a short motion streak behind it. |
| `status/exposed` | Exposed | a steel breastplate with a snapped leather strap hanging loose and one dark crack across the chest. |
| `status/sunder` | Sunder | a steel heater shield split down the middle by a jagged crack, two small steel chips falling. |
| `status/weakened` | Weakened | a dull grey steel sword bent and drooping in the middle, its tip pointing down. |
| `ground/quaking_ground` | Quaking Ground | cracked dry earth with jagged stone slabs heaving up out of the cracks. |
| `ground/field_of_shafts` | Field of Shafts | five wooden arrows with grey fletching stuck upright at slight angles in the earth. |
| `ground/root_field` | Root Field | thick gnarled brown roots curling up out of the earth like grasping fingers, a few green leaves. |
| `ground/storm` | Storm | the earth covered in white frost and pale blue ice shards, a small swirl of sleet just above. |
| `ground/hall_of_silence` | Hall of Silence | a dark stone floor patch with one faint glowing violet arcane circle on it (simple shapes, no letters). |
| `ground/lingering_rain` | Lingering Rain | muddy earth with a few arrows falling diagonally from above and two already stuck in the mud, small splashes. |

## 5. Dosya yolları ve bağlama (ui-dev işi; bu belgenin kapsamı dışında)

- **Ham çıktı scratch'e:** `C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/<id>.png` (repo dışı; `.codex.log` / `.last.txt` orada kalır).
- **Asıl kaynak:** kontrol (gerçek alfa, dama deseni yok, koyu hale yok) sonrası JSON'daki `target`: `assets/source/misc-icons/codex/<id>.png` (1024). `target` alanını `imagegen.mjs` okumaz; kopyalayan kişi için not.
- **Oyun dosyası:** yeni misc-icons grubu `codex`: `assets/misc-icons/codex/<id>.png` (128) + `small/` (64) + `.webp` (`tools/make-misc-icons.mjs` + `node tools/webp-assets.mjs`). Ad `codex:<id>` (`src/ui/misc-icons.ts` grup listesine `codex` eklenmeli; şu an gruplar status | fx | element | ground | relic | emblem | class | node).
- **Kod değişiklikleri (ui-dev):** `CODEX_SECTIONS` ve `ASSET_NAV` ikonları -> `codex:nav_*`; `buildGettingStarted` / `buildMechanics` / `buildLessons` / Weakness table ikonları -> `codex:*`; bölüm 2'deki YENİDEN KULLAN maddeleri -> `ui:<ad>`, `fx:<ad>` ya da sahibi verilmiş skill ikonu; Bosses / Enemies makaleleri avatar portresi. Dosya yoksa eski piksel ikona düşmeli (`paintedOr` mantığı). `tests/misc-icons.test.ts`, `tests/wiki.test.ts`, `tests/wiki-assets.test.ts` güncellenir.
- **İsteğe bağlı 11:** `target` = mevcut gruplar (`assets/source/misc-icons/status/<id>.png`, `.../ground/<id>.png`); kesildiklerinde `statusBadge` ve `paintedOr('ground', ...)` onları kendiliğinden her yerde (savaş dahil) kullanır.

## 6. Ömer'e sorular
1. Örnek set (bölüm 3) stil olarak tamam mı? Pirinç/deri/meşe "Codex kitabı" ailesi mi, yoksa skill ikonları gibi daha renkli/ışıklı mı olsun?
2. YENİDEN KULLAN kararları uygun mu (Formation, Range, Rage, Move, Gear boyalı arayüz ikonları; skill'e bağlı makalelerde o sınıfın boyalı skill ikonu; boss/düşman makalelerinde portre)? Yoksa hepsine Codex'e özel yeni ikon mu?
3. Boyalısı olmayan 5 durum + 6 zemin (bölüm 4.3) de üretilsin mi? (Savaştaki rozetleri de değiştirir.)

## 7. Kullanım
Repo kökü `game/` içinden; listeyi scratch klasöre kaydet:
`node tools/codex/imagegen.mjs --list <liste.json> --parallel 2`
Süre: örnek 4 görsel ~4-5 dk; ana 33 ~35-40 dk; isteğe bağlı 11 ~12 dk.

## 8. Hazır Codex listeleri

### 8.1 Örnek set (4)

```json
[
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_start.png",
    "target": "assets/source/misc-icons/codex/nav_start.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Getting Started): a weathered oak signpost on a short post with two blank arrow-shaped boards pointing left and right, iron nails, no writing on the boards."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_mechanics.png",
    "target": "assets/source/misc-icons/codex/nav_mechanics.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Stats & Mechanics): a brass balance scale with two hanging pans, one pan slightly lower, on a dark oak base."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_sounds.png",
    "target": "assets/source/misc-icons/codex/nav_sounds.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sounds): a curved brass hunting horn with a dark leather strap, mouth of the horn facing right."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/gs_turns.png",
    "target": "assets/source/misc-icons/codex/gs_turns.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Turn order and the SPD counter): a brass and oak hourglass with small white feathered wings on both sides, sand running."
  }
]
```

### 8.2 Ana liste (33; örnekler dahil, hedef varsa atlanır)

```json
[
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_start.png",
    "target": "assets/source/misc-icons/codex/nav_start.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Getting Started): a weathered oak signpost on a short post with two blank arrow-shaped boards pointing left and right, iron nails, no writing on the boards."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_lessons.png",
    "target": "assets/source/misc-icons/codex/nav_lessons.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Lessons): a half-unrolled parchment scroll with a red wax seal, a white feather quill lying across it."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_classes.png",
    "target": "assets/source/misc-icons/codex/nav_classes.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Classes): a steel knight's great helm with brass trim and a short crimson plume, seen from the front-left."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_skills.png",
    "target": "assets/source/misc-icons/codex/nav_skills.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Skills): a steel longsword and a gnarled wooden mage staff crossed in an X, a small warm ember glow where they cross."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_mechanics.png",
    "target": "assets/source/misc-icons/codex/nav_mechanics.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Stats & Mechanics): a brass balance scale with two hanging pans, one pan slightly lower, on a dark oak base."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_statuses.png",
    "target": "assets/source/misc-icons/codex/nav_statuses.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Statuses & Grounds): a small round glass potion flask with a cork stopper, filled with swirling glowing violet liquid."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_elements.png",
    "target": "assets/source/misc-icons/codex/nav_elements.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Elements): a round brass amulet set with four cut gems in a cross: fire red, ice blue, nature green and holy gold, each with a tiny glint."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_assets.png",
    "target": "assets/source/misc-icons/codex/nav_assets.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Assets): a small iron-bound oak treasure chest with its lid half open, a soft warm golden light inside."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_sounds.png",
    "target": "assets/source/misc-icons/codex/nav_sounds.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sounds): a curved brass hunting horn with a dark leather strap, mouth of the horn facing right."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_animations.png",
    "target": "assets/source/misc-icons/codex/nav_animations.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Animations): a lit beeswax candle in a small brass holder, its flame bending into one bold swirling motion trail."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_icons.png",
    "target": "assets/source/misc-icons/codex/nav_icons.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Icons): a square brass-framed oak plaque with a simple painted sword emblem on it, like a heraldic tile."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_art.png",
    "target": "assets/source/misc-icons/codex/nav_art.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Character Art): a wooden painter's palette with a thumb hole and five dabs of paint (red, blue, ochre, green, white), one brush resting on it."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_poses.png",
    "target": "assets/source/misc-icons/codex/nav_poses.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Poses): a jointed wooden artist's lay figure (mannequin) standing with one arm raised as if holding a sword."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_palette.png",
    "target": "assets/source/misc-icons/codex/nav_palette.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Palette & UI): three small clay pigment pots in a row, filled with crimson, deep blue and gold pigment powder."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_versions.png",
    "target": "assets/source/misc-icons/codex/nav_versions.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Versions): two overlapping parchment pages, the back one old, yellowed and torn at the edge, the front one fresh and clean, tied together with a red ribbon."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/nav_legacy.png",
    "target": "assets/source/misc-icons/codex/nav_legacy.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Legacy): an old cracked leather tome with frayed pages and a rusted iron clasp, a little dust on its cover."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/gs_goal.png",
    "target": "assets/source/misc-icons/codex/gs_goal.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (The goal): an upright steel longsword with a brass crossguard inside a golden laurel victory wreath."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/gs_turns.png",
    "target": "assets/source/misc-icons/codex/gs_turns.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Turn order and the SPD counter): a brass and oak hourglass with small white feathered wings on both sides, sand running."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/gs_screen.png",
    "target": "assets/source/misc-icons/codex/gs_screen.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Reading the screen): a round glass reading lens with a brass rim and a short turned-oak handle, held over the corner of a parchment sheet."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/el_weakness.png",
    "target": "assets/source/misc-icons/codex/el_weakness.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Weakness table): a battered steel heater shield with one glowing ember-orange crack running through it."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_damage.png",
    "target": "assets/source/misc-icons/codex/mech_damage.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Damage formula): a steel sword edge striking a small black iron anvil, a few bright sparks."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_ground.png",
    "target": "assets/source/misc-icons/codex/mech_ground.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Ground effects): a cracked grey flagstone with a small low flame and a thin curl of smoke rising from the crack."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_enemy_passives.png",
    "target": "assets/source/misc-icons/codex/mech_enemy_passives.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Enemy passives): a dark iron horned helm with two glowing red eye slits."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_gamble.png",
    "target": "assets/source/misc-icons/codex/mech_gamble.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Bets (Gambler)): two carved bone dice with dark pips, one tumbling in the air above the other."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_area.png",
    "target": "assets/source/misc-icons/codex/mech_area.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Area shapes): a 3x3 square of stone floor tiles seen from slightly above, the centre tile and the four tiles around it glowing warm orange."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_half_turn.png",
    "target": "assets/source/misc-icons/codex/mech_half_turn.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Half-turn skills): a medieval candle clock: a tall wax candle burnt down exactly halfway, a brass ring marking the middle, a small flame on top."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_multiplayer.png",
    "target": "assets/source/misc-icons/codex/mech_multiplayer.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Multiplayer): two steel plate gauntlets clasping each other in a firm handshake."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_campaign.png",
    "target": "assets/source/misc-icons/codex/mech_campaign.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Campaign): an unrolled parchment map with a dashed red route line ending at a small red pennant flag pin."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_legendary.png",
    "target": "assets/source/misc-icons/codex/mech_legendary.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Legendary items): an ornate gold-hilted sword with a large glowing amber gem in its pommel, a soft golden glow."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_affixes.png",
    "target": "assets/source/misc-icons/codex/mech_affixes.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Item affixes): a single smooth blue-grey runestone with one simple angular carved glyph glowing pale blue (a symbol, not a letter)."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_levels.png",
    "target": "assets/source/misc-icons/codex/mech_levels.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Levels and XP): a short crimson cloth pennant hanging from a spear tip, three stacked gold chevrons embroidered on it."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_endless.png",
    "target": "assets/source/misc-icons/codex/mech_endless.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Endless): a dark stone archway with a swirling ember-orange void inside it."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/mech_valor.png",
    "target": "assets/source/misc-icons/codex/mech_valor.png",
    "refs": [
      "assets/ui-icons/codex.png"
    ],
    "prompt": "Single game icon for a medieval fantasy turn-based RPG codex (in-game encyclopedia), square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, realistic medieval materials: aged brass, dark oiled leather, worn oak, parchment, steel, with a small warm ember accent) but do NOT copy its subject. ONE bold, clear subject with a simple strong silhouette that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris: at most a few small sparks or chips. Strictly medieval, nothing modern. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. Light effects stay on and close to the subject. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Valor): a black iron brazier on three legs burning with a warm golden flame."
  }
]
```

### 8.3 İsteğe bağlı durum + zemin (11)

```json
[
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/status_burning.png",
    "target": "assets/source/misc-icons/status/burning.png",
    "refs": [
      "assets/misc-icons/status/wound.png"
    ],
    "prompt": "Single status badge icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, saturated readable colours) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Burning): a bold cluster of orange-yellow flames rising from one charred black ember."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/status_fleet.png",
    "target": "assets/source/misc-icons/status/fleet.png",
    "refs": [
      "assets/misc-icons/status/wound.png"
    ],
    "prompt": "Single status badge icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, saturated readable colours) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Fleet): a light leather boot with a small white feathered wing at the heel, a short motion streak behind it."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/status_exposed.png",
    "target": "assets/source/misc-icons/status/exposed.png",
    "refs": [
      "assets/misc-icons/status/wound.png"
    ],
    "prompt": "Single status badge icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, saturated readable colours) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Exposed): a steel breastplate with a snapped leather strap hanging loose and one dark crack across the chest."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/status_sunder.png",
    "target": "assets/source/misc-icons/status/sunder.png",
    "refs": [
      "assets/misc-icons/status/wound.png"
    ],
    "prompt": "Single status badge icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, saturated readable colours) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Sunder): a steel heater shield split down the middle by a jagged crack, two small steel chips falling."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/status_weakened.png",
    "target": "assets/source/misc-icons/status/weakened.png",
    "refs": [
      "assets/misc-icons/status/wound.png"
    ],
    "prompt": "Single status badge icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style of the attached reference icon exactly (hand-painted, bold dark outline, rich but clean shading, saturated readable colours) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Weakened): a dull grey steel sword bent and drooping in the middle, its tip pointing down."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/ground_quaking_ground.png",
    "target": "assets/source/misc-icons/ground/quaking_ground.png",
    "refs": [
      "assets/misc-icons/ground/poison.png"
    ],
    "prompt": "Single ground-effect icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style AND the layout of the attached reference icon exactly (hand-painted, bold dark outline, the effect sitting on a small irregular patch of earth seen from slightly above) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery beyond the small patch, no frame, no border, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Quaking Ground): cracked dry earth with jagged stone slabs heaving up out of the cracks."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/ground_field_of_shafts.png",
    "target": "assets/source/misc-icons/ground/field_of_shafts.png",
    "refs": [
      "assets/misc-icons/ground/poison.png"
    ],
    "prompt": "Single ground-effect icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style AND the layout of the attached reference icon exactly (hand-painted, bold dark outline, the effect sitting on a small irregular patch of earth seen from slightly above) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery beyond the small patch, no frame, no border, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Field of Shafts): five wooden arrows with grey fletching stuck upright at slight angles in the earth."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/ground_root_field.png",
    "target": "assets/source/misc-icons/ground/root_field.png",
    "refs": [
      "assets/misc-icons/ground/poison.png"
    ],
    "prompt": "Single ground-effect icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style AND the layout of the attached reference icon exactly (hand-painted, bold dark outline, the effect sitting on a small irregular patch of earth seen from slightly above) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery beyond the small patch, no frame, no border, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Root Field): thick gnarled brown roots curling up out of the earth like grasping fingers, a few green leaves."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/ground_storm.png",
    "target": "assets/source/misc-icons/ground/storm.png",
    "refs": [
      "assets/misc-icons/ground/poison.png"
    ],
    "prompt": "Single ground-effect icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style AND the layout of the attached reference icon exactly (hand-painted, bold dark outline, the effect sitting on a small irregular patch of earth seen from slightly above) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery beyond the small patch, no frame, no border, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Storm): the earth covered in white frost and pale blue ice shards, a small swirl of sleet just above."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/ground_hall_of_silence.png",
    "target": "assets/source/misc-icons/ground/hall_of_silence.png",
    "refs": [
      "assets/misc-icons/ground/poison.png"
    ],
    "prompt": "Single ground-effect icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style AND the layout of the attached reference icon exactly (hand-painted, bold dark outline, the effect sitting on a small irregular patch of earth seen from slightly above) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery beyond the small patch, no frame, no border, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Hall of Silence): a dark stone floor patch with one faint glowing violet arcane circle on it (simple shapes, no letters)."
  },
  {
    "out": "C:/Users/Omer/AppData/Local/Temp/claude/codex-icons/ground_lingering_rain.png",
    "target": "assets/source/misc-icons/ground/lingering_rain.png",
    "refs": [
      "assets/misc-icons/ground/poison.png"
    ],
    "prompt": "Single ground-effect icon for a medieval fantasy turn-based RPG, square 1024x1024. Match the painting style AND the layout of the attached reference icon exactly (hand-painted, bold dark outline, the effect sitting on a small irregular patch of earth seen from slightly above) but do NOT copy its subject. ONE bold, clear subject that still reads at 24 pixels, centered, filling about 70% of the canvas with about 12% empty margin on every side. Very little debris. Strictly medieval. No scenery beyond the small patch, no frame, no border, no text, no letters, no numbers, no blood. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Subject (Lingering Rain): muddy earth with a few arrows falling diagonally from above and two already stuck in the mud, small splashes."
  }
]
```
