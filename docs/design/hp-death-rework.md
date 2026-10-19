# Can ve ölüm reworkü (Ömer 2026-10-19)

Durum: **KARAR, henüz UYGULANMADI.** Form: https://claude.ai/artifact/Y1bMNEr46cPRD79Ahcm5ef (db `canolum/main`). Sebep: can, düşme, şifa, dinlenme, geri çekilme ve yenilgi kuralları ayrı zamanlarda eklendi ve çelişti (zor zafer yenilgiden kötüydü, devriyeden çekilmek ölümü siliyordu, kasma kahraman öldürüyordu, sefer ve Endless farklı sayılar kullanıyordu).

## İlkeler
1. **Savaşta olan savaşta kalır.** Zafer de geri çekilme de can kaybını ve yaraları taşır. Yalnızca yenilgi geri sarar (son kayda dönüş).
2. **Düşmek ölmek değil.** Kazanılan savaşta düşen kahraman yaralı kalkar. Ölüm, yaralar birikip kahraman yine düşünce gelir.
3. **Her iyileştirme kaynağının tek işi var.** Zafer şifası can verir, kasaba dinlenmesi can verir ve yara siler, Valor ölüyü kaldırır.
4. **Sefer ve Endless aynı kuralları kullanır;** sayılar modun ritmine göre ayarlanabilir.

## Kararlar
| Konu | Karar |
|---|---|
| Düşen kahraman (fallen) | Kazanılan savaştan sonra **%10 canla kalkar ve 1 Yara alır** (yeni kural). |
| Yara (woundsize) | **Birikir: her yara maksimum can −%20.** 3 yaralı kahraman bir daha düşerse **ceset** olur; ceseti Valor kaldırır. |
| Devriye (patrol) | Her savaşta aynı kural (devriye ayrıcalığı yok). |
| Zafer şifası (victory) | Yaşayanlara: **normal %25, elit %50, boss tam** (Ömer'in notu; önerim 20/40/tam idi). |
| MP (mp) | İki modda da **her savaşta dolu**. |
| Dinlenme (rest) | **Kasaba:** ilk varış bedava tam şifa **ve yaraları siler**, sonrası ücretli (yine siler). **Kamp (Riverside Camp):** bedava %50 şifa, yara silmez. |
| Valor (valor) | Savaşta düşeni anında kaldırır (6), savaş dışında ceseti kaldırır (4). **Yara silmez.** |
| Devriyeden geri çekilme (retreat) | **Savaşta ne olduysa kalır:** kayıp can taşınır, savaşta düşenler yaralı kalkar (bugünkü rastgele 0–%30 kayıp ve "kimse ölmez" kalkar). |
| Geri çekilme yeri (where) | Yalnızca devriyede (bugünkü). |
| Yenilgi (defeat) | Son kayda dön (bugünkü). |
| Endless (endless) | Aynı kurallar; sayılar Endless'a göre. |
| Dalga arası (waves) | Değişmez (şifa yok, MP yok, cesetler sahadan kalkar). |

## Açık uygulama noktaları (agent varsayım yazıp sorar)
- Yaralı kahraman savaşta düşerse aynı savaş içinde Valor/Resurrection ile kalkabilir mi (evet varsayılır; yara yalnızca savaş SONUNDA hâlâ düşmüşse eklenir).
- Yara gösterimi (kart, takım şeridi, Gear): UI → mockup akışı (Ömer seçer).
- Boss tam şifası yaraları silmez (yalnızca dinlenme siler).
- Endless sayıları (elit %60 / boss %50 bugün) ve Endless'ta yara silen dinlenme karşılığı (kamp/ödül ekranı).
- Kayıt sürümü artışı (kahraman başına `wounds`).
- Kasmalı sim (`src/sim/campaign-grind.ts`) yeni kurallara göre güncellenir, tam ölçüm ondan sonra.
