# Diyalog cevapları taslağı (Ömer görecek, oyuna henüz GİRMEDİ)

Durum: 2026-10-31 Ömer aşağıdaki 7 taslağı aynen onayladı, `data/` içinde `"reply"` olarak var. Lore soruları açık kaldı (iki warden, başka kurtulan). Sonuncu tablodaki 6 seçeneğin taslakları Form 7'de.

Görünüşü: oyuncu seçeneği seçer, NPC bu kısa cevabı söyler, altta tek "Continue" olur, ondan sonra sıradaki replik gelir. Beğeni sayısı ve hediye değişmez. `reply` olmayan seçeneklerde akış bugünkü gibidir.

Taranan hikâyeler (8, 3 harita): ash_on_the_wind, the_wardens_oath, dr_the_ferryman, dr_weir_warden, dr_harbor_master, dr_keepers_daughter, hc_old_ketil, hc_loremaster_dunwe (başka diyaloglu hikâye yok; adım numarası 0 tabanlı).

## Taslak cevaplar (7)

| Hikâye | Adım | Seçenek | Şu an sonra gelen replik | Taslak cevap |
|---|---|---|---|---|
| ash_on_the_wind | 0 | "Spare us the sob story. What do you want?" | "Men in ash masks walked into the forest with torches. They set it burning, tree by tree, and they sang while they did it." | "Nothing you'd miss. Only for someone to hear it." |
| ash_on_the_wind | 1 | "Did anyone else get out?" | "'Praise to the Ash Lord. The embers will rise.' Over and over. They're coming this way, past the moor. What will you do?" | "Not that I saw. I ran, and all I could hear behind me was the singing." |
| the_wardens_oath | 1 | "Every guardian has a weakness. Tell us what you've seen." | "And if you fall on that bridge, who carries word back to me?" | "What I have seen, I will tell to those who mean to come back." |
| dr_the_ferryman | 1 | "Who else crosses this river, besides us?" | "The water, same as the rest of us. Thirty years I've poled this ferry, and the river never ran backwards till this spring. Now the tide comes up as far as Reedgate, and some nights it brings the drowned with it. They climb the bank and stand there in the reeds, looking east. Will you still go on?" | "Few enough, since the monks shut the road. You'd do better to ask what they're afraid of." |
| dr_weir_warden | 1 | "What became of the two you pulled out?" | "Because something under the sea is reaching for what you carry. My gates have held the marsh for twenty years, and this spring they groan every night. If the weir goes, Eelwick goes under with it. Will you clear the gap, or only pass through it?" | "They are not your concern. Why the water's rising is." |
| hc_old_ketil | 1 | "Tell us about the hill clans." | "The clans, the wolves, and Morvane's lost legion in the ice. And under it all the dwarves, if they still live. Will you still go?" | "Their mountain, they call it. Strangers pay to walk it, in silver or in blood." |
| hc_loremaster_dunwe | 1 | "Tell us of the Stone Oath." | "At the bottom is the First Hearth, and the first king who would not leave it. Whatever you do there, do it once. Will you?" | "Every dwarf of Kharduin swore it, and their names are cut into the hall walls. An oath cut there is never uncut." |

Nereden geldiği (yeni bilgi yok): Ketil cevabı Harita 3'teki klan yol parası olayının sözü ("This is our mountain... in silver or in blood"), Dunwe cevabı Hall of Oaths metni, komutan cevabı beğenilince anlattığı zincir bilgisine hazırlık, ferryman cevabı "they like very few" sözünden.

## Lore soruları

1. **dr_weir_warden, kurtarılan iki warden yaşıyor mu?** Metin yalnızca "I pulled two of them out of the water" diyor. Taslak bu yüzden soruyu geçiştiriyor. Yaşıyorlarsa daha doğrudan bir cevap olur: "Alive, and neither will go near the water again. You'd do better to ask why it's rising."
2. **ash_on_the_wind, başka kurtulan var mı?** Metin söylemiyor. Taslak "Not that I saw" diyerek açık bırakıyor (kesin bilgi eklemiyor). Kesin bir şey istersen söyle.

## Cevap gerekmeyenler (soru var ama sonraki replik zaten cevaplıyor)

| Hikâye | Adım | Seçenek | Neden |
|---|---|---|---|
| ash_on_the_wind | 0 | "You're safe here. Tell us what happened." | Sonraki replik olanı anlatıyor |
| ash_on_the_wind | 1 | "What were they singing?" | Sonraki replik şarkının sözü |
| dr_the_ferryman | 1 | "What are they afraid of?" | "The water, same as the rest of us." |
| dr_weir_warden | 1 | "Tell us. We'd rather know than guess." | "Because something under the sea..." |
| dr_harbor_master | 1 | "What would the Guild want with a company like ours?" | "Harbor Fort, for a start." ve Caravel işi |
| dr_keepers_daughter | 0 | "Thank you. Who sails her?" | "Captain Marrow." |
| dr_keepers_daughter | 1 | "Where is your father now?" | "He rowed out to Lantern Rock..." |
| hc_old_ketil | 1 | "What else is up there?" | "The clans, the wolves, and Morvane's lost legion..." |

## Soru olmayan ama sonraki repliğin kopuk kaldığı seçenekler (taslak YAZILMADI, kapsam dışı, Ömer karar verir)

Bunlar soru değil, o yüzden görev kapsamına girmedi; ama aynı mekanizmayla çözülebilir.

| Hikâye | Adım | Seçenek | Sonraki replik | Sorun |
|---|---|---|---|---|
| ash_on_the_wind | 1 | "Forests burn. You of all people should know." | "'Praise to the Ash Lord...'" | Kimse sormadan şarkının sözü geliyor |
| dr_the_ferryman | 0 | "That's our business, old man." | "Morvane. So the ash lord is dead..." | Oyuncu Morvane adını hiç söylemedi |
| dr_the_ferryman | 1 | "We'll give them a reason. Steel is a good one." | "The water, same as the rest of us..." | "Korktukları şey" cevabı, soru sorulmadı |
| dr_weir_warden | 0 | "We've killed bigger things than an eel." | "Good. You think..." | Kaba cevaba övgü |
| dr_harbor_master | 0 | "Whatever pays." | "The Tide. Hah..." | Oyuncu Tide demedi |
| dr_keepers_daughter | 1 | "Then we'll find the Caravel first." | "He rowed out to Lantern Rock..." | Baba sorulmadan baba anlatılıyor |
