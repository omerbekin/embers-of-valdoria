# Harita 3 (Hollow Crown) sanat durumu (2026-11-02)

Kural (Ömer): tamam = hiçbir şey ödünç değil. Üretim: Codex imagegen (`tools/codex/imagegen.mjs`, tarayıcı açılmadı), en çok 2 paralel iş. Her sayfa gözle kontrol edildi; Codex bir kez yanlış görseli kopyaladı (paralel iş karışması: aynı md5), o ikisi silinip yeniden çizildi.

## A. Çizimler (idle + avatar) — TAMAM
clan_vaulter, shardwalker, frozen_halberdier, frozen_crossbowman, clan_slinger, cinderleaper, gloamstalker, hollow_delver, slagcart_golem: kendi çizimi (magenta zemin -> `tools/key-chroma.mjs` + kalan magenta temizliği -> `tools/import-mobs.py`; `HEADS` girdileri eklendi). Mob json `spriteId` kendi id'si. Kaynaklar `assets/source/mobs/<id>.png`. Önizleme: `docs/design/campaign/art-review-map3-new-sprites.png`.
Elit/boss pozları: snowfather, hollow_king, hearthwarden, ember_of_the_first_hearth, pack_mother, oathkeeper, clan_chief_brannoc, frozen_standard_bearer, pyre_matriarch, forge_master_golem hepsinde `poses.png` zaten var; eksik yok.

## B + C. Skill ve pasif ikonları — TAMAM (97 ikon, 25 sayfa)
`assets/source/mob-icons/map3_*-sheet.png` (siyah zemin 2x2) -> `node tools/import-mob-art.mjs icons` (`ICON_SHEETS` + `FIXED_GRID_SHEETS`; tek sayısı tek olan sayfalarda ızgara taşması düzeltildi). Pasifler dahil: shepherd_of_ash, tempering, highland_fury, war_chant(_highland_fury), eye_of_the_storm, frozen_ranks, stone_oath, pack_rotation, greater_kindling, kindling, overheat, stormhide, iron_draws_the_bolt, everburning, forge_heat, frostbound, hollow_crown, hollow, hoarfrost, furnace_core, blind_hunger, grave_cold.
Not: whiteout / avalanche / icy_grasp ikonlarının zemini karla dolu (kare dolgulu görünür), kenarı saydam değil.

## D. Skill VFX — TAMAM (74 skill, 74 sheet, 8 kare)
`tools/black-sheet-to-alpha.mjs` (siyah zemin -> gerçek alfa, hücre kenarı 3 px silinir) -> `assets/source/mob-vfx/<mob>-<skill>.png` -> `node tools/import-mob-art.mjs vfx`. `MOB_VFX_SPECS` satırları + `GROUND` eklendi; test paneli için `mob-vfx-hand.ts > HOLLOW_CROWN_STANDIN`. Yeni: fork, rolling_thunder, ring_the_anvil, long_sermon, flare, kingsmaul, call_the_vault, icy_grasp, whiteout dahil hepsi. 8 karenin akışı montaj üzerinden elle bakıldı (örnekleme: 8 sayfadan 6'sı, hepsi akıyor). `data/skills.json`: Harita 3 skill'lerinden `artOf` kaldırıldı (kendi ikon + kendi efekt var). Oyun içi (savaşta) ekran görüntüsüyle konum/boyut DENENMEDİ: boyutlar Harita 2 satırlarına göre varsayım (`size`, `impact`); `data/battle-layout.json > animation.mobVfx.skills` ince ayarı yapılmadı.

## E. Harita arka planı — YENİDEN ÇİZİLDİ (Ömer görmedi)
Eski `hollow-crown-bg.webp` zaten boyalı bir dağ kesitiydi (maps-2-3 kararı M-P "kesit harita"); koordinatörün isteğiyle Codex ile aynı kompozisyonda daha zengin, basamaklı (yol yürünebilir teraslar, göl, lav tüpleri, forge-heart) hâli çizildi. Landmark konumları aynı (kapı sol-orta, göl sağ, lav altta), düğüm `pos` değerleri değişmedi. `assets/campaign/hollow-crown-bg.webp` (454 KB) + `-ext.webp` (`node tools/make-map-ext.mjs hollow-crown-bg`, `backgroundExt` değerleri aynı). Kaynak: `assets/source/campaign/hollow-crown-bg-final.png`; eski/yeni karşılaştırma `art-review-map3-bg-old.png` / `art-review-map3-bg-new.png`. Geri almak: eski dosyalar git'te. Düğümlerin yeni görselde yola/zemine denk gelip gelmediği ekran görüntüsüyle DENENMEDİ.

## F. Hollow Runecaller + Ashborn Acolyte (2. tur, 2026-11-02) — TAMAM
Combat Design'ın iki yeni moblu için ödünç sanat kaldırıldı. Aynı boru hattı (Codex imagegen, en çok 2 paralel, md5 farklı).
- Çizim + avatar: `hollow_runecaller` (soluk taş-gri, turuncu kor runeleri, Hollow ailesi paleti) ve `ashborn_acolyte` (küllü gri cüppe, kor sigilleri; kırmızı Ember Acolyte'ten ayrı). Kaynak `assets/source/mobs/<id>.png` (magenta -> key-chroma + kalan magenta temizliği), `HEADS` girdileri `tools/import-mobs.py`. `spriteId` ikisinde de kendi id'si. Önizleme: `art-review-map3-round2-sprites.png`.
- İkonlar: `map3_new_a-sheet` (2x2) -> `hollow_rune_spark`, `hollow_glyph`, `ashborn_ember_toss`, `ashborn_burn_the_ground` (`ICON_SHEETS` + `FIXED_GRID_SHEETS`). Pasifler `ward_etcher` ve `last_ember` zaten kendi ikonlarına sahip (eski mob sayfalarından), paylaşılan kaldı. Önizleme: `art-review-map3-round2-icons.png`.
- VFX: 4 sheet x 8 kare (`<mob>-<skill>.png`, black-sheet-to-alpha). `MOB_VFX_SPECS` 4 satır, `GROUND`: `hollow_runecaller-hollow_glyph`, `ashborn_acolyte-ashborn_burn_the_ground`; test paneli için `HOLLOW_CROWN_STANDIN` 4 satır. Dört skill'den `artOf` kaldırıldı. Önizleme: `art-review-map3-round2-vfx.png`.
- Savaşta konum/boyut ekran görüntüsüyle DENENMEDİ (boyutlar eski Deep Runecaller / Ember Acolyte satırlarından kopya).
