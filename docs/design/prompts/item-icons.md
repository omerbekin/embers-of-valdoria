# Item ikonları: ChatGPT prompt'ları

Oyundaki 52 item'in ikonları 7 sayfa halinde üretilecek; her sayfada 8 ikon (4 sütun x 2 satır, her hücre 256x256, toplam 1024x512). Tek sayfada 52 ikon istemek kaliteyi düşürür; 8'lik paketler en iyi sonucu verir.

**Her pakette ChatGPT'ye eklenecek referanslar** (`C:\Users\Omer\Projects\embers-of-valdoria\game\` altında):
- `assets/sprites/warrior/idle.png` ve `assets/sprites/defender/idle.png` (stil ve palet)
- `assets/vfx/defender/01-gauntlet-fist.png` (aynı üreticiyle yapılmış, oyuna oturan bir nesne örneği)
- İlk paket bittikten sonra: **ilk paketin sonucu** da referans eklensin (sonraki paketler aynı ışık ve kalınlıkta kalsın)

---

## Ana prompt (her paketin başına aynen yapıştır)

> Create a sprite sheet of 8 item icons for a medieval side-view pixel-art RPG, matching the attached references exactly (same palette, same outline weight, same lighting).
> Output ONE image, 1024x512: a 4x2 grid, each icon in its own 256x256 cell, row by row left to right, centred, with at least 16 px of empty transparent space around each object, nothing touching the cell edges, transparent background, no grid lines, no text, no labels.
> Style: crisp hand-placed pixel art, dark 1px outline, warm muted medieval palette, light from the top-left, a single object per cell shown at a slight 3/4 angle, realistic proportions, readable when shrunk to 48x48. Grounded and medieval: real materials (iron, steel, leather, wood, cloth, bone, brass), no neon, no glowing magic unless stated.
> Rarity must show through the object itself, never through a coloured background:
> - Common: plain, worn, simple materials, a little dirt or rust.
> - Uncommon: well made, clean, a small decorative detail.
> - Rare: fine craftsmanship, engraved or riveted details, a small blue-steel or blue gem accent.
> - Epic: masterwork, ornate gold or brass trim, a purple gem or purple cloth accent, faint dignified sheen (no glow halo).
> Icons in this sheet, cell 1 to 8:

(Aşağıdaki paketlerden birinin listesini bu satırın altına yapıştır.)

---

## Paket 1: Balta ve kılıç, gürz ve kalkan

> 1. Woodcutter's Axe (common): a simple wood-chopping axe, worn ash handle, slightly chipped iron head.
> 2. Bearded Axe (uncommon): a Norse-style bearded axe with a long hooked lower blade, leather-wrapped grip.
> 3. Arming Sword (rare): a knightly one-handed straight sword, cruciform guard, wheel pommel, engraved fuller, small blue gem in the pommel.
> 4. Dane Axe of the Bear (epic): a huge two-handed long axe, blade engraved with a bear head, gold-trimmed langets, purple cloth wrap below the head.
> 5. Flanged Mace (common): a plain iron flanged mace on a wooden haft.
> 6. Oak Tower Shield (uncommon): a tall wooden tower shield, oak planks, iron rim and central iron boss.
> 7. Morning Star (rare): a spiked iron ball mace on a riveted steel haft, blue-steel spikes.
> 8. Short Bow (common): a short simple wooden bow with a plain string.

## Paket 2: Yay, hançer, asa

> 1. Hunting Bow (uncommon): a recurve hunting bow with a leather grip and a feathered arrow nocked loosely.
> 2. Yew Longbow of the Fox (rare): a tall yew longbow, a carved fox head at the grip, russet fletching tassel, small blue gem.
> 3. Rondel Dagger (common): a plain rondel dagger with disc guard and disc pommel.
> 4. Keen Misericorde (uncommon): a slim, needle-pointed mercy dagger, polished steel.
> 5. Twin Stilettos (rare): two crossed thin stilettos, engraved blades, blue-steel accents.
> 6. Ash Staff (common): a straight, plain ash walking staff with an iron ferrule.
> 7. Pilgrim's Oak Staff (uncommon): a gnarled oak staff with a small cloth pilgrim pennant and a scallop shell tied on.
> 8. Bone Staff of the Owl (rare): a staff of pale bone and dark wood, topped with a carved owl skull and feathers, blue gem eye.

## Paket 3: Asa, tılsım, gövde zırhı

> 1. Rune Staff (epic): a dark wood staff wrapped in gold bands, carved runes along the shaft, a purple crystal held by gold claws at the top.
> 2. Worn Deck (common): a small stack of worn, dog-eared playing cards tied with string.
> 3. Loaded Bones (uncommon): a pair of carved bone dice beside a small leather dice cup.
> 4. Hex Doll of the Crow (rare): a small sackcloth hex doll with button eyes, crow feathers stitched on, red thread, a blue bead.
> 5. Padded Gambeson (common): a quilted cloth padded jacket, off-white linen, laced front.
> 6. Quilted Jack (common): a darker quilted brown jacket with simple stitching.
> 7. Leather Jerkin (uncommon): a sleeveless hardened leather jerkin with buckles.
> 8. Riveted Mail (uncommon): a riveted chainmail shirt with short sleeves.

## Paket 4: Gövde zırhı ve miğfer

> 1. Brigandine (rare): a cloth-covered brigandine with rows of brass rivets, blue fabric.
> 2. Warded Hauberk (rare): a long mail hauberk with a tabard bearing a protective sigil, blue-steel rings at the hem.
> 3. Coat of Plates (epic): a coat of steel plates riveted to purple velvet, gold-trimmed edges.
> 4. Leather Coif (common): a simple leather hood-cap with a neck flap.
> 5. Iron Cap (common): a plain round iron skullcap.
> 6. Padded Hood (uncommon): a quilted cloth arming hood.
> 7. Nasal Helm (uncommon): a conical steel helm with a nose guard and mail neck.
> 8. Kettle Hat of the Hawk (rare): a wide-brimmed kettle hat with a hawk feather on the side, blue-steel brim edge.

## Paket 5: Miğfer, eldiven

> 1. Great Helm (epic): a flat-topped knight's great helm with eye slits and breathing holes, gold cross trim, a purple crest plume.
> 2. Work Gloves (common): a pair of rough leather work gloves.
> 3. Leather Gloves (common): a pair of fitted brown leather gloves.
> 4. Archer's Bracer (uncommon): a leather forearm bracer with laces and a shooting glove.
> 5. Studded Gauntlets (uncommon): leather gauntlets studded with iron rivets.
> 6. Keen Gauntlets (rare): articulated steel finger gauntlets, polished, blue-steel knuckles.
> 7. Hawkeye Gloves (epic): fine archer's gloves with gold thread, a small hawk emblem, purple gem on the cuff.
> 8. Bracers of the Fox (rare): a pair of leather bracers with a fox engraving and russet fur trim, blue bead.

## Paket 6: Çizme

> 1. Turnshoes (common): simple soft medieval turnshoes of plain leather.
> 2. Soft Boots (common): ankle boots of soft brown leather.
> 3. Hobnailed Boots (uncommon): sturdy boots with visible iron hobnails on the sole and a buckle.
> 4. Riding Boots (uncommon): tall leather riding boots with a spur.
> 5. Ranger Boots of Shadows (rare): dark green-grey leather boots wrapped with straps, a hooded-ranger look, small blue clasp.
> 6. Swift Sabatons (epic): articulated steel foot armour with gold trim and a small purple gem, sleek and pointed.
> 7. (boş bırak)
> 8. (boş bırak)

## Paket 7: Takı ve muska

> 1. Copper Ring (common): a plain copper band ring.
> 2. Rabbit's Foot (common): a lucky rabbit's foot charm on a leather cord.
> 3. Wolf-Tooth Charm (uncommon): a large wolf fang on a braided cord with two small beads.
> 4. Pilgrim's Token (uncommon): a lead pilgrim badge with a scallop shell, on a cord.
> 5. Saint's Medal (rare): an engraved silver medal of a saint on a fine chain, blue enamel.
> 6. Ashen Locket (epic): an ornate gold locket, ash-grey enamel with a small ember-like purple gem, slightly open.
> 7. (boş bırak)
> 8. (boş bırak)

---

**Sonra:** 7 sayfayı (Paket 1-7) bana gönder. Hücreleri kesip her item'e kendi ikonunu bağlarım; Gear ekranı, torba, ödül kartları, merchant ve Codex aynı ikonları kullanır. Şimdiki kod çizimi ikonlar yedek olarak kalır.

---

## Paket 8: Çift el yakın dövüş tabanları (Greataxe, Greatsword, War Maul; Ömer 2026-10-17)

**Kural (Ömer):** taban başına TEK çizim. Bu üç taban Common, Uncommon, Rare ve Epic olarak düşer; nadirlik farkı yalnızca elde tutulan silah çiziminin renk / parlaklık tonudur (`data/poses.json > rarityTone`: Common mat ve soluk, Uncommon biraz soluk, Rare çizimin kendisi, Epic parlak ve cilalı). İkonda nadirliği çerçeve / parıltı gösterir (ekranın işi). Bu yüzden iki çizim de **nötr, "iyi yapılmış ama süssüz"** olmalı: değerli taş, renkli kumaş, altın süs YOK (ton bunları bozar). Çizimler gelene kadar oyunda yer tutucu kullanılır: Greataxe = mevcut çift el sakallı balta (`greataxes/bearded`), War Maul = mevcut çift el gürz (`mauls/maul`), Greatsword = tek el kılıç çizimi (`swords/plain`); ikon yerine kod çizimi piksel ikon (balta / kılıç / gürz).

### A) 3 item ikonu (tek sayfa)

- Dosya: `assets/source/item-icons/pack8.png`, **768x256**: 3 sütun x 1 satır, hücre 256x256, soldan sağa: 1 `greataxe`, 2 `greatsword`, 3 `war_maul`. Gerçek saydamlık.
- Alternatif: her biri tek nesneli ayrı görsel `assets/source/item-icons/overrides/<item-id>.png` (araç bunları da okur).
- İçe aktarma: `tools/make-item-icons.mjs > GRIDS` listesine `{ label: 'pack8 two-handed', file: join(SRC, 'pack8.png'), cols: 3, rows: 1, ids: ['greataxe', 'greatsword', 'war_maul'] }` eklenir, sonra `node tools/make-item-icons.mjs` -> `assets/items/<id>.webp` (256x256, saydam). Kod başka değişiklik istemez (ikon id'den bulunur).
- Referans ekle: `assets/items/dane_axe.webp`, `assets/items/arming_sword.webp`, `assets/items/flanged_mace.webp` (aynı ışık, kontur, palet).

> Create a sprite sheet of 3 item icons for a medieval side-view pixel-art RPG, matching the attached reference icons exactly (same palette, same outline weight, same lighting, same scale feel).
> Output ONE image, 768x256: a 3x1 grid, each icon in its own 256x256 cell, left to right, centred, with at least 16 px of empty transparent space around each object, nothing touching the cell edges, transparent background, no grid lines, no text, no labels.
> Style: crisp hand-placed pixel art, dark 1px outline, warm muted medieval palette, light from the top-left, a single object per cell shown diagonally (head / tip to the upper right, handle to the lower left), realistic proportions, readable when shrunk to 48x48. Grounded and medieval: real materials (iron, steel, leather, wood), no gems, no gold trim, no coloured cloth, no glow. Each weapon must look like a solid, well-made but plain soldier's weapon: one drawing is used for every rarity, so keep it neutral.
> 1. Greataxe: a large two-handed battle axe, one broad crescent steel blade on a long ash haft (clearly longer than a one-handed axe), iron langets below the head, leather-wrapped lower grip.
> 2. Greatsword: a long two-handed straight sword (longsword / zweihander proportions), long plain steel blade with a simple fuller, wide straight crossguard, long leather-wrapped two-hand grip, round iron pommel.
> 3. War Maul: a heavy two-handed war hammer / maul, a big blocky iron head with a flat striking face and a short back spike, long iron-banded wooden haft, leather grip at the bottom.

### B) 3 elde tutulan silah çizimi (poz katmanı)

- Dosya: `assets/source/poses/weapons-v2/twohanded-2.png`, **1536x1024**, 3 sütun x 2 satır (diğer silah sayfalarıyla aynı düzen: `tools/make-poses-v2.mjs > WEAPON_SHEETS`). Yalnızca ÜST satır dolu: 1 Greataxe, 2 Greatsword, 3 War Maul; alt satır boş. Düz koyu zemin (araç arka planı siler) ya da gerçek saydamlık.
- Çizim kuralı (içe aktarıcı bunu varsayar): eşya **tam dikey**, baş / uç **YUKARIDA**, kabza ve sap ucu AŞAĞIDA, yandan (profil) görünüm, hücreyi dikeyde ~%85 doldurur, hücre kenarına değmez. Balta ağzı ve çekiç yüzü SOLA baksın (mevcut `greataxes/dane`, `bearded` ve `mauls/hammer` gibi: `poses.json > weapons.<aile>.edge = "left"`). Tutma noktası araçta ölçülür: sapın üstten ~%76-78'i (balta / gürz), kılıçta balçağın hemen altı; bu yüzden elin tuttuğu alt sap düz ve okunur olmalı.
- İçe aktarma (art-pipeline): `WEAPON_SHEETS`e `{ file: 'twohanded-2.png', cells: [[['greataxes', 'greataxe'], ['greatswords', 'greatsword'], ['mauls', 'warmaul']]] }`; `WEAPON_SPEC`e `greatswords: { length: 340, grip: 'sword', hold: 'two' }` (yeni aile; greataxes / mauls zaten var). Sonra `data/poses.json`: `itemArt.greatsword = "greatswords"`, `itemLook` -> `greataxe: "greataxe"`, `greatsword: "greatsword"`, `war_maul: "warmaul"`; `weapons.greataxes.edge.greataxe` ve `weapons.mauls.edge.warmaul` = `"left"`. **Dikkat:** araç `order` dizisini yalnızca o sayfada görülen görünümlerle yeniden yazar; greataxes / mauls için mevcut görünümler (`dane, bearded, double` / `maul, hammer`) `order` başında korunmalı, yeni görünüm sona eklenmeli (yoksa Legendary Avenger's Maul'ün görünümü kayar). Kontrol: `node tools/make-poses-v2.mjs --preview=<klasör>` + `npx vitest run tests/poses.test.ts`.
- Referans ekle: `assets/source/poses/weapons-v2/twohanded-coin.png` (aynı sayfa düzeni ve çizim dili) ve `assets/weapons/greataxes/dane.png`.

> Create ONE image, 1536x1024, a 3-column x 2-row layout of weapon sprites for a medieval side-view RPG character rig, matching the attached weapon sheet exactly (same painted pixel-art style, same outline, same lighting, same scale and layout). Only the TOP row is used: three weapons, one per cell, left to right; leave the bottom row completely empty. Plain flat dark background, no text, no labels, no grid lines, no hands, no characters.
> Every weapon stands perfectly VERTICAL in strict side profile: head / blade tip at the TOP, handle end at the BOTTOM, centred in its cell, filling about 85% of the cell height, not touching the cell edges. Axe blades and hammer faces point to the LEFT. The lower haft / grip is straight, plain and clearly readable (a hand will hold it there).
> Neutral, plain but well-made materials: steel, iron, ash wood, leather wraps. No gems, no gold or brass trim, no coloured cloth, no glow, no engraving (one drawing is recoloured in game for every rarity).
> 1. Greataxe: a large two-handed battle axe, single broad crescent blade, long ash haft, iron langets under the head, leather wrap on the lower grip.
> 2. Greatsword: a long two-handed straight sword, long plain blade with a simple fuller, wide straight crossguard, long leather two-hand grip, round iron pommel, blade pointing up.
> 3. War Maul: a heavy two-handed maul, big blocky iron head with a flat striking face on the left and a short spike on the right, long iron-banded wooden haft, leather grip at the bottom.
