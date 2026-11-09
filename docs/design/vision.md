# Embers of Valdoria: Vizyon

> **Ne için / Güncel mi (2026-11-08):** oyunun tek sayfalık vizyonu: ne oyun, modlar, çekirdek, ilerleme, kapsam dışı. Ömer onaylı (2026-11-08).
> Eski taslak (2026-10-08, "2 class dikey dilim"): `docs/archive/design/vision-2026-10-08.md`.
> Sürüm numarası burada yazılmaz (sürekli eskir): `package.json` ve patch notes. Detaylar ilgili belgelerde; burası tek sayfalık özet.

## Ne bu oyun
Yandan görünümlü, sıra tabanlı, taktiksel parti RPG'si. Pixel art, ortaçağ. Web'de oynanır; telefonda da.

Ömer'in özgün niyeti (2026-10-08, hâlâ geçerli):
- "Kısa, taktiksel savaşlar; parti kompozisyonu ve hız yönetimi öne çıkar."
- Parti: 4 karakter, hepsini oyuncu kontrol eder.
- Sıra: hız statına bağlı, savaş içinde dinamik değişir.
- Platform: web, mobil tarayıcıda yatay oyun öncelikli.
- Görsel: pixel art.
- Başarı ölçütü: telefondan açıp bir savaşı baştan sona oynayıp "eğlenceli mi" diyebilmek.

Değişenler: "2 class dikey dilim" aşıldı (13 kahraman). "Co-op yok" kararı değişti: çevrimiçi 2 kişilik Quick Battle var.

## Modlar
| Mod | Ne | Belge |
|---|---|---|
| Sefer (Campaign) | Tek oyunculu. Valdoria haritası, düğümler (savaş, elit, boss, olay, hazine, kasaba). Harita 1, 2 ve 3 (Hollow Crown) açık; Harita 4 ve 5 1.0 sonrası planda (`future-ideas/campaign.md`). Normal ve Ironman kayıt. | `campaign/campaign.md`, `campaign/maps-2-3.md` |
| Tutorial | Sefer içinde: Mill Road + Garrick'in durum dersleri. Tek kahramanla başlanır. | `tutorial.md` |
| Quick Battle | Takım seç, tek savaş. Herkes açık. Çevrimiçi 2 kişilik mod: lobi kodu/davet linki, lockstep, seed iki taraflı. | `multiplayer.md` |
| Endless | Art arda dalgalar, dalga arası ödül kartı, 5 dalgada dükkân; skor = ulaşılan dalga. | `docs/archive/design/progression/roadmap-2026-10.md` bölüm 3 (arşiv), `waves.md` |

## Savaş çekirdeği
- Tahta: her taraf 4 sıra x 3 şerit. Parti solda, düşman sağda.
- Sıra: sayaç (ATB benzeri). Her tikte hız kadar dolar, eşiğe varan oynar. Hız her turda küçük zarla oynar. Sıra çubuğu canlı.
- Menzil sınıfın özelliği; mesafe sıra derinliğinden hesaplanır. Aynı kural her modda. (`range.md`)
- Dalgalar: sefer Watchtower'dan, Endless 6. savaştan; ekranda "Round 2/3". (`waves.md`)
- Durumlar, elementler, zeminler: Slow, Chilled, Frozen, Burning, Shocked, Wound, Stun, Omen ve daha fazlası. (`combat.md`, `data/statuses.json`)
- 4 temel stat (STR, INT, DEX, LUCK); her sınıfın bir primary'si ve bonusu.
- Kaynaklar: MP (INT'ten), Warrior'da Rage; Undead'in bazı skill'leri can harcar, Gambler can ve MP'yi bahse sokar. Kahraman listesi: `classes.md`.
- Yapay zeka: sınıf ve mob başına profil. (`ai-priorities.md`)

## İlerleme
| Katman | Özet |
|---|---|
| Level | Tavan L50; level başına 3 stat puanı + 1 skill puanı. (`progression/levels.md`) |
| Skill ağacı | Sınıf başına bir ağaç; ağaç skill'in oynanışını değiştirir, genel stat vermez. (`classes/skill-tree-logic.md`) |
| Item | Silah türleri, 1 el + off-hand ya da 2 el; zırh, tılsım, set, affix. (`progression/items.md`) |
| Ekonomi | Altın, dükkân, kasaba, Valor korları. (`docs/archive/design/economy-d8-proposal.md`, arşiv) |
| Kahraman açılışı | Seferde katılımla açılır; Quick Battle'da açık. Tier konsepti onaysız. (`progression/character-tiers.md`) |

## Sanat ve ses
- Pixel art, katı ortaçağ; ikon başına tek iri nesne, temiz zemin. (`art-v2.md`, `ui-design-language.md`)
- Sprite, poz, ikon, VFX oyunun kendisinin; ödünç sanat hedeflenmez ("tamamla" = hepsi kendi).
- Ses ve müzik tümüyle WebAudio sentezi, ses dosyası yok. (`audio-map.md`)
- Arayüz üç ekranda tasarlanır: 16:9, 21:9, telefon.

## Platform
Web (GitHub Pages + embersofvaldoria.com), telefon tarayıcısı dahil. Hesap ve bulut kaydı canlı, çok oyunculu signaling Cloudflare Worker üzerinde.

## Kapsam dışı (şimdilik)
- Seferde co-op (Ömer 2026-11-08: kapsam dışı); çok oyunculu yalnız Quick Battle.
- Blood Warden (yalnız konsept), karakter tier/cost sistemi (konsept).
- Yeni mekanik/stat/kaynak: Ömer sormadan eklenmez. "Not al" fikirleri `future-ideas.md`.

## Doğrulanamayanlar
Endless'ın güncel açılma kuralı, tam element listesi ve Harita 3'ün bitmişlik durumu koda bakılarak ölçülmedi; belgelerden alındı.
