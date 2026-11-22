# r41 örnek arka plan: Castle Morvane (Harita 1, düğüm 12, final boss)

Durum: HAZIRLIK. Görsel üretilmedi (Ömer 2026-11-21 kuralı: arka plan gibi tek seferlik görseller Brave'deki ChatGPT ile, Lead üretir; Codex kullanılmaz). Oyuna bağlı değil.

## Neden bu bölge
- Bugünkü arka plan `castle-hall`: güneşli, altın ışıklı, mavi gökyüzü görünen pencereli, kırmızı-altın aslan sancaklı bir kral salonu. Masalsı ve aydınlık.
- Lore: "From this black castle the Ash Curse spreads across Valdoria, and Lord Morvane waits beneath his crown of ash." Sinematik (`morvane_meets`): "Ash drifts through the great hall like snow. Beneath a crown of burning iron, Lord Morvane rises from his throne." Düşmanlar: Lord Morvane (ateş büyücüsü-şövalye, Crown of Ash), Morvane's Sworn Guard x2, Ember Hierophant.
- Harita 1'in finali; her oyuncu görür; aynı arka plan savaş sahnesinin varsayılan yedeği ve sinematik sahnesi. Başka bir arka plana atanarak çözülemez (oyunda karanlık kale içi yok). Fark en net burada görülür.

## (a) ChatGPT istemi (aynen yapıştır; iki referans görseli de yükle)

```
Create an image: ONE wide 3:2 landscape image, exactly 1536x1024 pixels, a battle backdrop for a side-view 2D medieval dark-fantasy RPG. Match the painting style, level of detail, pixel-art crispness and camera of the two attached reference images (they are backdrops from the same game): CLEAN PIXEL ART, crisp visible pixels, limited palette, flat shading, tidy and uncluttered; NOT photorealistic, NOT painterly, no film grain, no noisy texture. Use the first reference (a bright royal throne hall) only for composition and camera: keep the same straight-on eye-level view, symmetric hall, throne on steps at the centre back, pillars left and right. Use the second reference (a dark forge hall) for the dark ember palette and the clean floor treatment.

The image has two clearly separated zones with a sharp horizontal divide at 58 percent from the top (y = 594 px). UPPER 58 percent = the hall's back wall and mid-ground where all the scenic detail lives. LOWER 42 percent = the battle floor where characters will stand: one large, simple, flat, smooth surface of only 2 to 3 close tones, very low contrast, evenly lit, no scattered small objects, no rubble, no bones, no puddles, no cracks except a few thin straight joint lines, no debris, no foreground clutter at the corners (at most a very soft dark vignette). Crisp clean edge where the floor meets the scenery: a single low black basalt step / plinth running the full width at the 58 percent line. No characters, no creatures, no statues of people or armour stands, no text, no letters, no runes that look like writing, no watermark, no UI, no border. Camera straight-on at eye level.

SCENE: the great throne hall inside Castle Morvane, the black castle at the heart of the Ash Curse, at night. The castle of a fallen lord who rules a land of ash; grim, cursed and burning, not royal and not cheerful.
Upper part, from back to front:
- Back wall: tall black basalt Gothic architecture, pointed arches and ribbed vaults fading into smoky darkness near the top. Two or three tall narrow lancet windows with broken dark-red stained glass; through them a blood-red night sky and a distant burning ash plain with thin columns of smoke (no blue sky, no daylight, no sun).
- Centre back: a high stone dais with a few wide steps, and on it a massive dark iron throne whose back rises into a spiked crown shape of black iron with glowing orange cracks, like a crown of burning iron. Two large iron fire braziers burn on either side of the dais (the Ember Hierophant's fires), lighting the steps from below.
- Left and right: thick black stone pillars, chained iron chandeliers with low guttering flames, long tattered black and dark-crimson banners with a simple orange ember / flame sigil, edges burnt and frayed.
- Atmosphere: grey ash drifts slowly through the whole hall like falling snow, with a few tiny glowing embers; a thin layer of grey ash dusts the window ledges, the steps and the banner tops; faint smoke haze near the ceiling.
FLOOR: a flat smooth dark charcoal-grey basalt floor paved in large rectangular slabs with thin straight joints, very lightly dusted with pale ash so it reads slightly lighter than the walls; a faint warm orange glow from the braziers on the floor near the back edge only, fading to even neutral grey toward the bottom. Plain, calm, low contrast.
Palette: charcoal black, cold ash grey, deep ember orange, dull crimson; a little dirty-bronze on the iron; no gold, no bright white, no blue except a very cold grey in the ash.
The game crops the top 15 percent and the bottom 20 percent of the image on wide phone screens, so keep the throne, its crown back, the windows and the braziers between 15 and 58 percent of the height; nothing important above 15 percent. The throne sits at the horizontal centre (the gap between the two teams); left and right edges are not cropped.
```

Not: İlk sonuç zeminde dağınık nesne / çatlak / gürültü gösterirse aynı sohbette: "Regenerate: keep everything, but make the lower 42 percent floor plainer and flatter: only large slabs with thin straight joints, no objects, no cracks, very low contrast." (`docs/arch/assets.md` savaş arka planı kuralı: görsel başına en çok 3 deneme.)

## (b) Üslup referansı olarak yüklenecek dosyalar
1. `C:\Users\Omer\Projects\embers-of-valdoria\game\assets\source\backgrounds-v3\castle-hall.png` (bugünkü Castle Morvane arka planı; kompozisyon ve kamera, 1536x1024 kaynak)
2. `C:\Users\Omer\Projects\embers-of-valdoria\game\assets\backgrounds\forge-heart.webp` (koyu kor paleti + sade, düz zemin örneği; kaynağı PNG olarak yok, webp near-lossless)

## (c) Mevcut savaş arka planlarının teknik ölçüleri
- Boyut: hepsi 1536x1024 (3:2). Oyun `assets/backgrounds/<id>.webp` yükler (near-lossless; kayıplı değil, `docs/arch/assets.md`).
- Zemin çizgisi (`data/battle-layout.json > backgrounds.floor`, görsel yüksekliğinin kesri): Harita 1 bölgeleri 0,586-0,625 (castle-hall 0,601, border-road / grave-field / ruined-watchtower 0,586); Harita 2: 0,542-0,610; Harita 3: 0,563-0,571. Hedef: 0,58 (istemde %58). Yeni görselin gerçek değeri gelince ölçülür (çit / basamak dibi y / 1024) ve oyuna bağlanırken o tabloya yazılır.
- Yerleşim (`src/game/battle-background.ts > backgroundPlacement`): sahne 1920x1080; görsel "cover" ölçeklenir, zemin çizgisi ekran y 715'e (en arka sıranın ayağı 745 - 30 pay) oturur. Ayak çizgileri ekran y 745 / 802 / 859 (üç sıra).
- Kırpma payı (`backgroundPlacement` ile hesap, zemin 0,58): 16:9 (1920x1080) görselin y %2-%86,5'i görünür; telefon 844x390 (~2,16:1) y %12-%81; 21:9 y %15-%80. Yanlar kırpılmaz (16:9 ve daha geniş oranda görsel genişliği tam kaplar); kırpma yalnız üstten ve alttan. Ayak çizgileri (arka ve ön sıra) görselde y ~%60-%69 arasına düşer: o bant boş ve düz olmalı. (castle-hall 0,601 için: 16:9 %4-%89, telefon %14-%83,5, ayaklar %62-%71.)

## (d) Bugünkü görüntü
`ui-shots-mobil-masaustu/arkaplan/ornek-eski.jpg` (castle-hall tek başına), `ornek-eski-oyunda-1920x1080.jpg`, `ornek-eski-oyunda-844x390.jpg` (gerçek düğüm 12 savaşı, 1. dalga: Morvane's Sworn Guard x2 + Ember Hierophant; Lord Morvane son dalgada sahneye girer, boss karesi otomatik yakalanamadı, `BOSS=1` seçeneği deneysel).

## Oyuna bağlarken (Lead / Ömer onayından sonra)
- Yeni kimlik öner: `castle-morvane` (castle-hall'un üstüne yazma; castle-hall savaşın genel yedeği ve Quick Battle dışı varsayılan). Bağlantı: `data/campaign/encounters.json > castle_morvane.background` + `valdoria.json` düğüm 12 + `battle-layout.json > backgrounds.floor` ölçülen kesir + `cinematics.json` `morvane_meets` sahnesi isteğe bağlı.

## (e) Yeni görseli yerleştirme (commit YOK, oyuna bağlamaz)
1. ChatGPT'den indirilen PNG: `python -X utf8 docs/anim-review/new-art/backgrounds-r41/hazirla.py <indirilen.png> --floor 0.58`
   - 1536x1024'e cover kırpar: `castle-morvane-1536.png`; `ornek-yeni.jpg` + zemin çizgisi (kırmızı), 16:9 (sarı) ve telefon (camgöbeği) görünen bant kılavuzlu `ornek-yeni-kilavuz.jpg` yazar (bantlar `--floor`'dan hesaplanır). Kılavuzda kırmızı çizgi basamak dibine oturmuyorsa gerçek kesri ölç ve `--floor` ile yeniden çalıştır.
2. Kendi portunda dev sunucu (`npx vite --port <boş port> --strictPort`), sonra:
   `BG_FILE=docs/anim-review/new-art/backgrounds-r41/castle-morvane-1536.png BG_FLOOR=<kesir> node tools/ui-shot.mjs docs/anim-review/new-art/backgrounds-r41/oyunda-shot.mjs --url http://localhost:<port> --out <geçici> --view 1920x1080,844x390`
   Senaryo gerçek düğüm 12 savaşını açar, castle-hall dokusunu yalnız o sekmenin belleğinde yeni görselle değiştirir (zemin kesri de bellekte). Çıktıları `ornek-oyunda-1920x1080.jpg` / `ornek-oyunda-844x390.jpg` adıyla `ui-shots-mobil-masaustu/arkaplan/`a kopyala.
