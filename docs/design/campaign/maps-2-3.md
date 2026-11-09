# Harita 2 ve 3: The Drowned Reach / The Hollow Crown (özet)
> **Ne için / Güncel mi (2026-11-08):** Harita 2-3'ün bugün geçerli özeti: hikâye omurgası, bölgeler, boss'lar, özel kurallar, veri yolları. UYGULANDI ve `mapFlags` ile AÇIK. Düğüm / mob / boss tabloları, mekanik form soruları, ChatGPT prompt'ları, dilim bazlı uygulama kararları ve çalışma kopyası notları arşivde: `docs/archive/design/campaign/maps-2-3-plan.md`. Genel sefer kuralları: `campaign.md`; alan durumu: `docs/arch/areas/campaign.md`.

## Durum
- Harita 1-3 açık (`data/campaign/campaign.json > mapFlags`, drowned-reach ve hollow-crown `enabled: true`). Harita 1 sonunda "Continue to The Drowned Reach", Harita 2 sonunda "Continue to The Hollow Crown"; takım, kadro, item, altın, level taşınır, gün sürer.
- **Harita 2 = The Drowned Reach:** `drowned-reach.json` (92 düğüm, `stopsPerRun` 53; blurb 89 durak). Boss: The Weir Mouth (dr26), Gallows Cove (dr66), Throne of Brine (dr82). Kasabalar dr12 Reedgate, dr16 Eelwick, dr28 Saltmere, dr54 Fisher's Landing.
- **Harita 3 = The Hollow Crown:** `hollow-crown.json` (86 düğüm, `stopsPerRun` 59). Boss: The Snowfather's Hollow (hc24), The Hollow Throne (hc51), The First Hearth (hc84), The Ember (hc85; son iki düğüm art arda, aralarında dinlenme yok). Kasaba hc5 Hearthstead, hc30 Kharduin the Last Hall; tüccar hc54 The Deep Market.
- Geçerli sayı her zaman: `data/campaign/<harita>.json > nodes / stopsPerRun`. Düğüm kimlikleri `drNN` / `hcNN`.

## Hikâye omurgası: iki taç
Harita 1 (Kül) Crown of Ash'i bırakır: taç yanmaz ve kırılmaz, Morvane üçüncü Crownbearer'dı. Harita 2 (Tuz) nehirden denize iner, Drowned Queen (Crown of Salt) yenilir; taç yarıları birbirini kuzeye çeker. Harita 3 (Taş) dağa tırmanıp dağın içine iner; The First Hearth'te Hearthwarden ve Ember. Bitiş seçimi **Mend / Quench**: iki metin, iki unvan, mekanik fark yok. Metinler `*.json > intro / complete`, olaylar `*events.json`.

## Bölgeler (6'şar)
- **Harita 2:** Lower Valdren (nehir boğazı), Saltmarsh (delta), Saltmere (liman şehri), Wrecking Coast, Drowned Isles (deniz yolları, fırtına), Sunken Court. Level bandı L11-20.
- **Harita 3:** Snowline, Windwall (buzul), Dwarf Road (Kharduin), Deep Halls, Ashborn Warrens, Forge-Heart. Görsel dağın yandan kesiti; level L21-30.
- Bölge adları ve düğüm dağılımı: dosyalardaki `regions`; harita ekranında bölge görünümü `src/game/region-view.ts`.

## Geçerli mekanikler (kod ve test yolu)
| Mekanik | Özet | Kod / test |
|---|---|---|
| Battle conditions (M-A) | Karşılaşmada tek savaş koşulu: Tide, Storm, Blizzard, Darkness, Heat; HUD plakası + Codex metni | `src/engine/`, `tests/campaign-reach.test.ts`, `campaign-hollow-crown-rules.test.ts` |
| Tide + Flooded + Soaked (M-B) | Harita 2: Flooded zemin Soaked verir (ateş hasarı düşer, Burning söner) | `src/campaign/reach.ts` |
| Storm (M-C) | Menzilli isabet düşer (Drowned Isles) | aynı |
| Chilled / Frozen, Blizzard (M-D, M-E) | Harita 3 buz durumu. Geçerli kural: kit tablosu, Chill yığını yok; Snowfather'ın kendi bonusu `data/bosses/snowfather.json` | `src/campaign/hollow-crown.ts` |
| Darkness + Lantern (M-F) | Hedefleme kısıtı; ateş skill'i tahtayı aydınlatır; Lantern kırılınca kalkar | `data/bosses/lantern.json` |
| Cave-in, Heat, kapalı hücreler (M-G, M-H, M-I) | Telgraflı çöküş, Round başı Burning sırası, `blocked` hücreler (güverte) | `hollow-crown.ts`, `reach.ts` |
| Shocked, Live Water, Iron Draws the Bolt, Thunderflash, Shatter (A1-A6) | Şimşek etkileşimleri; Soaked/Flooded/Ice/Darkness ile birleşir | `data/campaign/*`, `src/engine/` |
| Sea lanes + Crossing (M-J) | `crossing` düğümü (güverte savaşı); deniz kenarı Charter olayına kadar kapalı | `reach.ts` |
| Black Caravel (M-K) | Gezici elit; her oyuncu hamlesinde ilerler; yenilince Gallows Cove açılır; düğümde madalyon + "The Black Caravel is here" | `reach.ts` |
| Faction Order / Guild (M-L) | Saltmere'de tek seçim, kayıtta bayrak | `reach.ts`, `save.ts` |
| Lighthouse (M-M) | Lantern Rock olayı: bu haritada `visibility` +1 | olay verisi |
| Yardımcı nesneler (M-N) | Harpoon Ballista, Boarding Hook, Tidewater Urn | `data/bosses/harpoon_ballista.json` |
| Görevler ve Crown Surge | Sınıf görevleri + Surge | `map2-quests-surge.md` |
| Mühürlü mezarlar, oath | `oathSealed` yalnız hc42 / hc44 / hc52 | `src/campaign/oath.ts`, `tests/campaign-pit-oath.test.ts` |
Tam kural metni ve eski karar tabloları arşivde. Her mekanik Codex > Mechanics'te ve bir testle durur.

## Mob ve boss içeriği
Tek kaynak: `data/mobs/*.json`, `data/bosses/*.json`, karşılaşmalar `drowned-reach-encounters.json`, `hollow-crown-encounters.json`. Tasarım tarihçesi: `mob-plan.md` ve arşiv. Harita ölçekleri `campaign.json > mapEnemyScale`, `mapLootScale`.

## Ömer kararları (2026-11-08 doğrulama: bugünkü davranış = karar)
- **Yelken rozeti:** Black Caravel düğümünün üstünde madalyon + "The Black Caravel is here" satırı; HUD'da ayrı satır yok.
- **Harita 2 kitleri:** Pull Beneath (Slow) ve Bilge Splash (Blinded) Soaked vermez; Mire Ghoul / Reed Witch ayrı birim kalır (Wreck Ghoul / Salt Hag'e katılmaz).
- **Harita 3 mezarları:** mühürlü (`oathSealed`) yalnız hc42 / hc44 / hc52; Old Mine (hc34), Vault of the First Kings (hc70), Forgemaster's Vault (hc78) listede değil. Mühürlü mezarın koruma savaşı kalır.
- **Harita 3 elit yerleşimi:** Shardwalker hc35'te; Clan Vaulter hc7 slot 0'da (Pack Rotation korunur, Snow Wolf aynı sıra bonusu yok); Frozen Crossbowman Ice Shot kullanır, ayrı Ice Bolt yok.

## X'i değiştirmek için
Düğüm / karşılaşma: ilgili `data/campaign/*.json` + `tests/campaign-drowned-reach.test.ts` ya da `campaign-hollow-crown.test.ts`. Ölçek: `campaign.json > mapEnemyScale` + `docs/balance.md`. Oyuncuya görünen değişiklik: `data/patch-notes.json`.
