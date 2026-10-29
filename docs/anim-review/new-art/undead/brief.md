# Undead VFX seti (yeni, 2026-10-29)

Ömer: "undead'in animasyonları çok kötü. mevcut skill icon ve efektlerini referans alma. tamamen skillerin amacına ve
elementine göre 0'dan özgün düşünerek bir skill effect seti chatgptye çizdir, /vfx ile uygulayalım sonra."

Mevcut Undead efektleri (`src/game/art-v2/undead/vfx.ts`, kodla çizilmiş) ve ikonları REFERANS DEĞİLDİR; prompt'a
eklenmez, ChatGPT'ye gösterilmez.

## Ortak dil
- Element: karanlık (dark), ölüm ve mezar. Ortak palet: kemik fildişi (#e8e0c8), nekrotik mor (#b36bff) ve koyu mor
  (#3a1a5c), yalnız kan / ruh emme işlerinde koyu kızıl (#8a1f3d → #ff4a6a sıcak çekirdek), zehirli sis için hastalıklı
  yeşil-mor (#7fae5a ile #6a3a8a karışımı). Saf altın, saf mavi yok.
- Ortaçağ, mezarlık, eski kemik; neon ya da bilim kurgu yok. Kan yok (Dark Bond'un "kan bağı" damar/iplik biçiminde,
  sıçrayan kan değil).
- Biçim: 4x2 ızgara, 8 kare, kare başı 256x256, saydam zemin (değilse düz tek renk zemin; siyah çerçeve, ızgara çizgisi,
  kare numarası YOK). Soldan sağa, yukarıdan aşağıya oynar.

Her prompt'un başına (mob-plan.md 2.3 belirginlik kuralı):
> 2D game VFX sprite sheet, 4 columns x 2 rows, 8 frames, each frame 256x256, transparent background, no grid lines,
> no frame numbers, no border. EFFECT ONLY: no weapon, no hand, no character drawn; the effect itself fills most of each
> frame; bold, bright, high contrast, saturated accent colour plus near-white hot core, thick readable shapes that pop on
> a dark battlefield; little dust or debris; every frame shows visible effect (frame 1 already strong, frame 8 a clear
> fading remnant). Painterly medieval dark-fantasy style, consistent palette: bone ivory, necrotic violet (#b36bff),
> deep purple (#3a1a5c).

## Efektler (dosya: `assets/source/undead-vfx/<ad>.png`)

| # | Dosya | Skill (amaç · element) | Fikir | Prompt sonu |
|---|---|---|---|---|
| 1 | `01-grave-shard-fly.png` | Bone Throw: uzaktan tek hedef, karanlık büyü hasarı + 2 tur Slow | Kemik değil "mezar kıymığı": kırık, sivri bir kemik parçası mor nekrotik çekirdekle parlar, kendi ekseninde döner, arkasında ince mor duman şeritleri. Yatay, sağa doğru uçar. | "A single jagged splintered bone shard, ivory with a glowing violet necrotic core, spinning end over end while flying to the RIGHT, trailing two thin curling violet smoke ribbons behind it (to the left). Frames 1-8 show one full spin; the shard stays centred and the same size." |
| 2 | `02-grave-shard-hit.png` | Bone Throw vuruşu | Kıymık hedefte patlar: kemik kıymıkları dışa saçılır, mor flaş; sonra soluk mezar ayazı dalları aşağı doğru kıvrılıp yere çöker (Slow'un görüntüsü). | "Impact of a bone shard: frames 1-3 a violet necrotic flash with ivory bone splinters bursting outward in all directions; frames 4-8 pale frost-white grave-chill tendrils curl DOWNWARD from the centre and settle into a low clinging mist at the bottom of the frame, fading." |
| 3 | `03-wail-scream.png` | Wail of the Dead: kendi canından %20 öder, artı şeklinde alan, karanlık hasar + 2 tur zehirli zemin | Atanın önünde açılan hayalet çığlığı: soluk turkuaz-beyaz ektoplazmadan çarpık, çığlık atan bir yüz belirir, ağzından sağa doğru mor ses halkaları dalga dalga çıkar. | "A screaming spectral face made of pale teal-white ectoplasm forms in frames 1-2, its mouth opens wide in frames 3-4 and releases distorted concentric violet sound rings that travel to the RIGHT and widen (frames 4-7), the face tears apart into wisps in frame 8. Side view." |
| 4 | `04-wail-grave.png` | Wail of the Dead: vurulan her hücre | Her hücrede yerden çığlık atan bir hayalet yüzü fırlar, dağılır ve geriye yere yapışan hastalıklı yeşil-mor mezar sisi kalır (zehirli zemin). Zemine oturur. | "Ground effect seen from the side: a wailing ghost face shoots UP out of the ground (frames 1-3), dissolves at the top (frames 4-5), and leaves a low sickly green-violet grave miasma pooling flat on the ground across the frame bottom (frames 5-8). The miasma stays at the bottom quarter of the frame." |
| 5 | `05-blood-oath-sigil.png` | Dark Bond: müttefiği bağlar, 4 tur hasarın %96'sını paylaşır (yalnız kahramana özgü) | "Kan yemini": müttefiğin göğsünde dikenli damarlardan örülü bir mühür halkası kapanır, ortada kızıl bir kalp ışığı atar ve kilitlenir. | "A circular sigil of interlocking thorny crimson veins draws itself clockwise around a glowing crimson heart light (frames 1-4), the heart pulses brightly (frame 5), the ring locks with a small burst (frame 6) and settles into a faint crimson outline (frames 7-8). Front view, centred." |
| 6 | `06-blood-oath-thread.png` | Dark Bond: atan ile müttefik arasındaki bağ | Yatay, dikenli kızıl damar ipliği; boyunca nabız gibi atan ışık akar. Döngü (kod iki ucu arasında gerer). | "A single horizontal thorny crimson vein strand spanning the full frame width at mid height, with a bright pulse of light travelling along it from LEFT to RIGHT across frames 1-8 (seamless loop). Thin, readable, no background." |
| 7 | `07-raise-dead.png` | Raise Dead: cesedi tüketip iskelet çağırır | Toprak yarılır, mor mezar ateşinden rünler halka olur, iskelet elleri ve kemik parçaları soluk yeşil ruh ateşi sütunuyla yukarı fırlar, sonra toza döner. Zemine oturur. | "Ground eruption seen from the side: the earth cracks with violet grave-fire runes in a ring (frames 1-2), skeletal hands claw up and bone fragments burst upward inside a pillar of pale green soul-fire (frames 3-5), the pillar collapses into drifting bone dust (frames 6-8). Base of the effect sits at the bottom of the frame." |
| 8 | `08-soul-drain.png` | Vampiric Bite (pasif): vurduğu hedeften can emer | Hedeften kopan kıvrımlı kızıl ruh tutamı; kod onu hedeften Undead'e uçurur. Döngü. | "A small twisting crimson soul wisp with a bright pink-white core and a short fading tail, flowing to the LEFT, centred, same size in every frame, frames 1-8 a seamless loop of its flicker." |
| 9 | `09-bone-slash.png` | Bone Slash (çağrılan iskeletin saldırısı) | Çentikli, pürüzlü bir kesik yayı: kemik tozundan, kenarı mor nekrotik ışıklı. | "A ragged notched slash arc made of pale bone dust with a glowing violet edge, sweeping from upper-left to lower-right (frames 1-4), then breaking into drifting bone dust (frames 5-8)." |

## Teslim
- Ham dosyalar `assets/source/undead-vfx/` altına (yukarıdaki adlarla). İçe aktarma ve kod değişikliği YOK.
- Ömer onaylayınca kurulum: `/vfx` (content-designer + Codex kontrolü).
