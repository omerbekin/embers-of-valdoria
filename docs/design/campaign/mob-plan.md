# Sefer mob planı (özet ve kalıcı kurallar)
> **Ne için / Güncel mi (2026-11-08):** Mob planının bugün geçerli kısmı: kalıcı kurallar ve "yeni mob nasıl eklenir" listesi. UYGULANDI (Bölge II 2026-10-16, Bölge III ve Harita 2-3 sonrası). Mob kartları, skill tabloları, ChatGPT prompt'ları, YM1-YM23 mekanik listeleri, kompozisyonlar ve tarihçe arşivde: `docs/archive/design/campaign/mob-plan.md`. Tek kaynak: `data/mobs/*.json`, `data/bosses/*.json`, `data/campaign/*encounters.json`; çelişirse veri geçerli.

## Kalıcı kurallar
- **Kit şekli:** sıradan mob = 1 pasif + 2 aktif; elit = pasif + 3 aktif; boss = pasif + 3 aktif + 1 ultimate. Aile pasif paylaşabilir, aktifler farklıdır. Pasifler class pasifi kopyası değil.
- **Caster** = MP havuzu + büyü hasarı. Bölge başına en çok 1 caster'sız savaş. Her savaşın kompozisyonu farklı.
- **Kahramana özel durumlar:** yalnız **Omen** (Hexer) ve **Dark Bond** (Undead) kahraman sınıflarına özeldir; hiçbir mob, elit ya da boss bunları vermez (`tests/mob-passives-map2.test.ts` denetler). Moblar Wither, Weakened, Wound, **Spellbound** ve **Saltbound** kullanabilir.
- **Risen Skeleton** ayrı düşman mobudur (`data/mobs/risen_skeleton.json`): pasifi yok, Grave Strike / Grave Sweep, kendi sprite, VFX ve sesi (Ömer 2026-11-01, 2026-11-08 doğrulandı).
- Motor kuralları ve mekanik listesi: `docs/arch/battle-engine.md`, `docs/design/combat.md`. Harita 3 mob kitleri: `data/ai.json > mobKit`.

## Yeni mob nasıl eklenir
1. `data/mobs/<id>.json` (kit, stat, ai profili); skill'ler `data/skills.json`.
2. Karşılaşmaya koy: `data/campaign/*encounters.json`.
3. YZ değeri: `data/ai.json` (`mobKit` ve profil). Her yeni skill/mob AI testi ister.
4. Ses: `data/audio-mobs.json`. İkon, sprite, VFX: `assets/` ve `docs/arch/assets.md`; mob görünümü `src/campaign/mob-looks.ts`.
5. Testler: `tests/mobs.test.ts`, `tests/mob-passives*.test.ts`, `tests/mob-art.test.ts`, `tests/mob-sfx.test.ts`, `tests/mob-looks.test.ts`.
6. `data/patch-notes.json` satırı (oyuncuya görünürse).
