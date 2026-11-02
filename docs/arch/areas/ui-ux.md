# Alan: UI-UX Design (2026-11-02)

Alan: mevcut arayüzlerin elden geçirilmesi, yeni arayüz tasarımı, kullanıcı deneyimi. Agent buradan başlar: `docs/design/ui-design-language.md`, `docs/design/ui-reference.md`, `docs/arch/ui-and-stage.md`.

## Kurallar
- UI isteği akışı: Sonnet mockup (3 ekran boyu, gerçek görünüm) → Pages/localhost linki → Ömer seçer → uygula. Mockup tam boy doğrudan sayfa, seçenek başına hash (`#a`, `#1`), tıklama/hover gerektirmez. Mockup ayrı commit, kodla aynı commit'e girmez.
- Üç ekran boyu: 16:9, 21:9, telefon 844x390 (`html.short`). Dokunma alanı >= 44 px; telefonda görünen düğme yüksekliği 36 px (`src/ui/phone-buttons.css`, `.ts` tık yönlendirme). Arayüzde italik yok, yazılar İngilizce.
- Ip uçları: yerel `title=` değil `attachBandTip` (`src/ui/band-tip-attach.ts`). Skill ipucu kısa görünüm satır sınırı 70 karakter (`src/ui/skill-tip-rule.ts`).
- Ömer onayı olmadan yeni mekanik/stat yok; motor kuralı ve kayıt şeması Combat Design'ın.

## Bu turda biten (hepsi main'de ya da ready)
- Birim kartı yukarı (üst 126, telefonda 150) + zemin ipucu karta bitişik; STATS paneli açıkken telefonda bağlam ipucu panelin üstüne çıkar (`ctipAboveStatsPlace`).
- Kamp dar şerit, Endless telefon yazı boyu, skill ipucu A (More), kasaba kartı A (Enter town, Blacksmith), 24 boyalı durum ikonu, hasar rengi A (`data/battle-layout.json`), şifa tikleri HP yanında (zemin şifaları dahil; büyük şifalar ve kritik yüzmeye devam).
- Oyun imleci: 8 imleç + System, 4 hâl (normal/tıklanabilir/basılı/yasak), uç (5,3), hat 110,4°; Ayarlar > UI (seçim, boyut %75-200, Press change, önizleme). Kod: `src/ui/cursor-theme.ts`, `cursor-settings.ts`. Ayar anahtarı `eov.settings.v1` (`cursor`, `cursorSize`, `cursorPress`).

## Açık işler
- Gönderim sonrası Pages kontrolü: kart üst konumu 126/150, durum ikonları, zemin ipucu, hasar renkleri, 36 px düğmeler, üç ekran boyu, Ayarlar > UI. Skill ipucunda More tek tıkta genişlemiyor şüphesi (tekrar denenmedi).
- Gear halka/trinket yerleşimi mockup'ı (`public/mockups/gear-ring-trinket.html`) Item Design'ın slot işi main'e girince.
- Kama imlecinde basılıyken çizim ucu tıklama noktasını 1-2 px aşar (Ömer kabul etti).
- Ana menü Ayarlar'da "Developer tools" bağlantısı alt kenara yakın (Account ile ölçülmedi). Ayarlar'ın savaş/sefer içinden açılan gerçek hâli denenmedi.
- Telefon dost STATS paneli: 16:9/21:9 ve düşman tarafı kontrol edilmedi; çok uzun ipucu panele taşabilir.
- Eski tur: mobil telefon/sonuç/MP lobi/patch notes ekranları, 6 eski denetim önerisi yeniden kontrol edilmedi.

## Tuzaklar
- Gizli tarayıcı paneli kareyi durdurur: `requestAnimationFrame` kıs + `__game.step` döngüsü; ekran görüntüsünden önce `tabs_select`; sayfa önbelleği için `?v=N`.
- Ses kapat: `localStorage.setItem('eov.settings.v1', JSON.stringify({volume:0, steps:20}))` (cursor alanlarını siler, test sonrası yeniden yaz).
- CRLF: dosyaları Edit ile değiştir; betikle satır eşleştirirken `\r` ayıkla. Tüm dosyayı HEAD'e geri alma (yalnız kendi parçanı).
- Dev'de `__game`/`launchBattle` var, Pages üretim sürümünde yok; savaşı haritadan gerçek akışla başlat.
- `assets/source/ui-icons/lock-sheet.png` takipsiz kalır (başka sohbetin sanatı), gönderim uyarısı verir.
