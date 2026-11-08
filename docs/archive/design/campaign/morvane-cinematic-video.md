# Lord Morvane final sinematiği: video promptları

Durum: TASLAK (2026-10-21). Ömer'in seçimleri: hafif ipucu (Morvane sırrı açmaz; yalnızca taç kırılmaz ve korları hâlâ parlar), bölük lideri konuşur, yeni görsel. Seçim formu: https://claude.ai/artifact/CprM9eeoVef4RYd2VH52Ro (db `picks/main`).

## Nasıl kullanılır

- Her çekim **ayrı bir klip** olarak üretilir (çoğu video aracı tek seferde 5-10 sn üretir). Oyunda klipler sırayla oynar; her klibin son karesi, oyuncu dokunana kadar ekranda donup bekler. Diyalog yazılarını oyun kodu klibin üstüne koyar.
- Bu yüzden videoda **hiç yazı, altyazı ya da logo olmamalı**. Ses de kullanılmaz (müzik ve sesler oyunun kendi sentezinden gelir).
- Her klibe aşağıdaki referans görselleri ekle. Önce aşağıdaki "Ortak stil" paragrafını, sonra çekimin kendi metnini yapıştır.
- Kahramanlar videoda görünmez, çünkü oyuncu sınıflarını kendisi seçiyor; bölük lideri yalnızca yazıda konuşur.

## Referans görseller

| Dosya | Ne için |
|---|---|
| `game/assets/source/mob-poses/lord_morvane.png` | Morvane'ın tüm pozları; 3. sıra 3. kare **diz çökmüş**, 3. sıra 4. kare **yerde yatıyor, taç yanında** |
| `game/assets/avatars/lord_morvane.png` | Yakın plan: miğfer, alevli taç, zırh ayrıntısı |
| `game/assets/source/backgrounds-v3/castle-hall.png` | Taht salonu (videoda kararmış ve külle dolu hâli istenir) |
| `game/assets/source/backgrounds-v3/ashen-plain.png` | Küllü ova (4. çekim) |

## Ortak stil (her klibin başına yapıştır)

```
Painterly 2D fantasy game art, exactly matching the attached reference images: hand-painted texture with a subtle pixel-art grain, warm dramatic lighting, rich reds, burnt orange and dark iron tones. Strictly medieval. Keep Lord Morvane identical to the reference: dark spiked plate armour with gold trim, red tabard with a gold crown emblem, tattered crimson cape, closed great helm with a burning iron crown of spikes and flames. Side-on, slightly elevated game camera. Slow, calm, cinematic camera moves only. 16:9, 1920x1080, 24 fps. No text, no subtitles, no logos, no watermark, no UI, no other characters, no modern objects, no gore. The final second of the clip is a steady, almost still frame.
```

## Çekimler

Oyundaki yazılar parantez içinde; video bu satırlar okunurken ekranda durur.

### Çekim 1: Diz çöküş (5-6 sn)
(Yazı 1, anlatıcı: "The last blow lands. Lord Morvane sinks to one knee, and the ash in the hall hangs still.")
```
Inside the castle throne hall from the reference, but darkened and ruined: most torches are out, the banners are scorched, grey ash and tiny embers hang motionless in the air. Lord Morvane staggers and sinks onto one knee in the middle of the hall, both gauntlets on the hilt of his sword planted in the stone floor, head bowed, matching the kneeling pose in the reference sheet. The flames of his crown flicker lower. Slow push-in from a wide shot to a medium shot. Ends on him kneeling, still.
```

### Çekim 2: Son sözler (5-6 sn)
(Yazı 2, Morvane: "So it ends with strangers. I always thought it would." / Yazı 3, bölük lideri: "Your curse ends with you, Morvane.")
```
Medium close-up of the kneeling Lord Morvane, matching the helm and crown in the close-up reference. He slowly lifts his head toward the camera, as if looking at someone just off-screen. A thin breath of smoke escapes through the visor slits. The crown flames gutter and shrink. Ash still hangs in the air around him. Very slight camera drift. Ends on him looking up, still.
```

### Çekim 3: Taç (6-8 sn)
(Yazı 4, anlatıcı: "Lord Morvane falls silent. The Crown of Ash rolls across the stones. It does not break. Its embers still glow.")
```
Low camera at floor level on the dark stone flagstones of the hall. Lord Morvane collapses forward out of focus in the background, matching the fallen pose in the reference sheet. His burning iron crown slips free, rolls slowly across the stones toward the camera, wobbles and comes to rest upright, whole and unbroken. Its flames are gone, but the embers inside the iron crown keep glowing and pulse once, softly, like a heartbeat. The suspended ash begins to drift down. Ends on the glowing crown, still.
```

### Çekim 4: Ova (8-10 sn)
(Yazı 5, anlatıcı: "Across Valdoria the grey ash stops falling. For the first time in a year, the wind smells of rain." / sonra kapanış kartı: "The Ash Curse is broken. Valdoria is free again.")
```
The ashen plain from the reference: ruined towers, torn banners, cracked stone road. Grey ash is falling, then slows and stops. The fires on the horizon die down, the smoke thins and drifts away, the blood-red sky cools toward a soft grey-blue dawn. The first light raindrops darken the stones and ripple the puddles. The torn banners settle in a gentle wind. Very slow pan to the right. Ends on the calm, rain-touched plain, still.
```

## Notlar

- Morvane bir klipte referanstan farklı görünürse (zırh, taç, renk), o klibi yeniden ürettir; tutarlılık en önemli kural.
- Klipler geldikten sonra oyuna eklemek için video dosyası yeni bir asset türü olur (boyut: klip başına birkaç MB). Biçim (mp4/webm) ve sıkıştırma klipler gelince kararlaştırılır.
