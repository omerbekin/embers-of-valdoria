# Alan: UI-UX Design (2026-11-02)
> **Ne için / Güncel mi (2026-11-08):** UI-UX alanı canlı durumu, açık işler. Güncel; UI kuralı `ui-global-rules.md`'de.


Alan: mevcut arayüzlerin elden geçirilmesi, yeni arayüz tasarımı, kullanıcı deneyimi. Agent buradan başlar: `docs/design/ui-design-language.md`, `docs/design/ui-reference.md`, `docs/arch/ui-and-stage.md`.

## Kurallar
- UI isteği akışı: Sonnet mockup (3 ekran boyu, gerçek görünüm) → Pages/localhost linki → Ömer seçer → uygula. Mockup tam boy doğrudan sayfa, seçenek başına hash (`#a`, `#1`), tıklama/hover gerektirmez. Mockup ayrı commit, kodla aynı commit'e girmez.
- Üç ekran boyu, dokunma alanı (44 px), telefon düğme yüksekliği (30 px, `PHONE_BTN_PX`), italik yok: tek sahip `docs/arch/ui-global-rules.md`; ayrıntı `docs/arch/ui-and-stage.md` > Telefon düğme kuralı.
- İpuçları: yerel `title=` değil `attachBandTip` (`src/ui/band-tip-attach.ts`). Skill ipucu kısa görünüm satır sınırı 70 karakter (`src/ui/skill-tip-rule.ts`).
- Ömer onayı olmadan yeni mekanik/stat yok; motor kuralı ve kayıt şeması Combat Design'ın.

## Biten iş
Biten tur listesi arşivde: `docs/archive/arch/areas/ui-ux.md`. Oyun imleci (8 imleç + System, Ayarlar > UI): `docs/arch/ui-and-stage.md` > Oyun imleci; kod `src/ui/cursor-theme.ts`, `cursor-settings.ts`.


## Açık işler
- Gönderim sonrası Pages kontrolü: kart üst konumu 126/150, durum ikonları, zemin ipucu, hasar renkleri, 30 px düğmeler, üç ekran boyu, Ayarlar > UI. Skill ipucunda More tek tıkta genişlemiyor şüphesi (tekrar denenmedi).
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

## Kararlar (hafızadan taşındı 2026-11-08)
Tam metinler `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/` (ui-ux-design-chat, ui-design-language).
- UI dili tek yerde: `docs/design/ui-design-language.md` (Ömer "global"/"kural" deyince oraya eklenir). Lead'in çalışma özeti hafızada `art-rules`.
- Battle #38: Ömer üç savaş HUD seçeneğini reddetti ("alt bardaki arayüzüm çok iyi zaten"), alt bar aynen kalır, yeniden önerme. Telefonda regen çipi Regen rozetine biniyordu (2026-11-02, doğrula).
- Mockup bir gönderimden önce açılmalıysa Artifact olarak düz hash (`#a-169`) ile yayınla; yerleşik tarayıcıda claude.ai oturumu yok, aynı dosyayı dev sunucuda kontrol et ve söyle. Yük altında tam `npm test` dinamik import testlerinde zaman aşar: `--testTimeout=300000` ile yeniden koş.
- Ana menü kartları (Ömer 2026-11-08): Quick Battle kartının üstündeki Endless sekmesi kaldırıldı (seçim defterdeki Quick Battle / Endless satırlarından, klavyede E). Ayrı Multiplayer sütunu (Your name / Host a lobby / Join with code) kaldırıldı: Multiplayer kartının defterinde Host (birincil) / Join; ad kayıtlı ad, değiştirme lobideki "Change name"de; IP uyarısı Join kod kutusunda (`mp-overlay.ts > IP_NOTE`) ve lobide. Eski `mp` görünüm isteği Play kartlarına düşer; MP hata ekranından Back ana menü kartlarına döner. Kart defteri + hover görünümü: 3 mockup'tan **B seçildi** (Ömer 2026-11-09): üç kartta da aynı parça (`menu-ledger.ts`), kutusuz satırlar, aralarında uçları sönen ince altın çizgi, satır hover'ında ve klavye seçiminde soldan kor ışık + elmas; kart hover/odakta görselin kendi ışık kaynağından çapraz parıltı (`MainMenuScene.ts > CARD_LIGHT`: Campaign kale yangını, Quick Battle gökyüzü, Multiplayer ay). Klavye: sol/sağ kart, yukarı/aşağı satır, Enter çalıştırır.
- Düşman turu skill plakaları + Rest/Skip/Move sönük ('off') ve tıklanmaz (Ömer 2026-11-08); 0.9.11 (c5d5c7d9) `foe` bayrağıyla yanlışlıkla parlak yapmıştı; `foe` artık 'foe off' + imleç ipucu. Test: tests/skill-plate-dir.test.ts.
