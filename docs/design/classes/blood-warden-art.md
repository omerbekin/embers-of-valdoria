# Blood Warden: konsept sanat promptları (v2)

Durum: konsept (2026-10-25). Ömer: "karakter artını ve skill ikonlarını tekrar oluştur". Oyuna içe aktarılmaz.
Çıktılar: `assets/source/concepts/blood-warden/v2/`. İlk tur (v1, eski poz + elde çizili falchion/balta): aynı klasörün kökü.

v2 değişiklikleri (Ömer 2026-10-25):
- İdle çevik, **hafif kambur, saldırmaya hazır**.
- **Silah çizilmez:** diğer kahramanlar gibi silah item çizimlerinden gelir; iki el boş ve yumruk hâlinde (silah tutacak gibi) çizilir. Önizlemede mevcut bir tek el silah çizimi kodla iki ele yerleştirilir. Silah üstü kan efekti ve idle nefesi sonra kodla.
- İkonlar 48 pikselde okunacak kadar sade (v1'de kadeh ve pasif küçükte okunmuyordu).
- Kadın, biraz gore (lekeler, sıçrama; uzuv/organ yok). Promptlarda "blood" kelimesi yok, "crimson" var (ChatGPT koruması).
- Palet: karartılmış demir + koyu şarap kırmızısı + kemik beyazı (Warrior'ın parlak çelik + kızıl atkısından farklı).

## 1. Karakter idle (1254x1254, tek görsel)

```
STYLE
Detailed high-resolution pixel-art look, same style as the existing character set: crisp pixel clusters, thick dark outline around the whole silhouette, soft cel shading with 3-4 tones per material, no blur, no anti-aliased painterly edges. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject. Canvas 1254x1254 px, character centered with a small margin, feet near the bottom edge.

POSE AND FRAMING
Full body, idle combat stance, three-quarter view, body and face turned toward the RIGHT side of the image. Agile and predatory: slightly hunched forward, shoulders rolled in, knees bent low, weight on the balls of the feet, ready to spring into an attack. BOTH HANDS ARE EMPTY and closed into fists as if gripping invisible one-handed weapon handles: the front hand held forward at waist height, the back hand drawn back near the hip. No weapons at all in the image. Face clearly visible and large enough to be cropped as a head avatar, no helmet covering the eyes.

CHARACTER
A medieval oath-bound warden duelist, human woman in her thirties, lean and wiry-muscular, pale skin, sharp jaw, a thin vertical ritual scar through one eyebrow, intense dark-red eyes with a hungry focused look, ash-blonde hair in one tight braid with loose strands. Grim and battle-soaked: streaks of dark crimson spatter across one cheek and the jaw, a fresh shallow cut on the cheekbone, a few stray hairs matted dark red.

OUTFIT
Light blackened dark-iron armor for mobility (gunmetal, nearly black, matte): gorget, a short breastplate, one small pauldron, articulated gauntlets, greaves. Under it a deep wine-red / oxblood padded gambeson. A long bone-white linen tabard split at the sides for movement, torn and heavily soaked dark crimson from the hem up to the knees, splashed across the chest, with a simple dark-red sigil of a single drop inside a ring. Dark crimson spatter and drips on the armor, gauntlets and boots. One forearm wrapped in a linen bandage seeping dark crimson. Dark-red oath cords knotted around both wrists. Wide dark leather belt with a small sealed glass vial of dark crimson liquid. Flat practical leather boots with iron toe caps.

COLOR PALETTE
Blackened iron / gunmetal, deep wine-red and oxblood, bone white, dark leather brown, small dull bronze rivets. Muted, grim, medieval, with the dark crimson stains as the strongest accent.

DO NOT include
Any weapon (no sword, axe, dagger, shield, staff), bright polished silver armor, a red scarf, a helmet covering the face, wings, horns, skulls, vampire fangs, exposed flesh or organs, severed body parts, bright cartoon-red paint, modern items, high heels, text, logos, frames, background scenery, ground shadows larger than the feet, a second character.
```

## 2. Aktif skill ikonları (tek 2x2 sayfa, 1024x1024)

```
Create ONE square image, 1024x1024, laid out as an invisible grid of 2 columns x 2 rows (four 512x512 cells) holding 4 separate icons for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline around the subject, clean simple shading, muted medieval palette of blackened iron, deep wine-red, bone white and dark leather. Grim tone with dark crimson accents. MUST stay readable at 48 pixels: ONE big simple subject with a strong silhouette, few shapes, large clear areas, at most two or three small drops, no fine filigree, no busy splashes. Each subject centered and filling about 65-70% of its cell. No scenery, no frame, no border, no round badge behind the subject, no text, no letters, no numbers, no body parts. Each icon stays fully inside its own cell with about 15% empty margin on every side; nothing crosses into a neighbouring cell; no grid lines. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.

Top-left (Rend): two identical one-handed swords crossed in an X, blades stained dark crimson, two short thick crimson slash marks beside them.
Top-right (Crimson Tide): a single low dark-crimson wave with one big curled crest rising from a flat pool.
Bottom-left (Blood Oath): a clenched blackened-iron gauntlet fist wrapped in thick dark-red cord, one large crimson drop hanging from the knuckles.
Bottom-right (Sanguine Feast): a simple dark-iron chalice, upright, a thick spiral of dark crimson liquid flowing down into it from above.
```

## 3. Pasif ikon: Crimson Retort (tek görsel, 1024x1024)

```
Create ONE square image, 1024x1024, holding ONE icon for a medieval fantasy turn-based RPG. Style: hand-painted fantasy game icon, bold dark outline, clean simple shading, muted palette of blackened iron, deep wine-red and bone white, grim tone. MUST stay readable at 48 pixels: one big simple subject with a strong silhouette, few shapes, no fine detail. Subject centered filling about 65% of the canvas with about 15% empty margin on every side, no scenery, no frame, no badge, no text, no body parts. REAL transparent background with alpha, no checkerboard pattern, no dark shadow, glow or halo around the subject.

Subject (Crimson Retort, a lightning-fast triple counter-attack): one one-handed sword thrusting diagonally up and to the right, with three parallel short dark-crimson speed slashes cutting across behind it, like three strikes in an instant.
```
