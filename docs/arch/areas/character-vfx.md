# Alan: Character VFX (sınıf efektleri, sınıf görselleri)

Agent buradan başlar: `.claude/skills/vfx/SKILL.md`, `docs/anim-review/README.md`, `docs/arch/codex-art-loop.md`, `docs/design/art-v2.md`.

## Kapsam
Sınıf/hero skill efektleri (sheet, kod efekti, ses), sınıf görselleri (portre, idle, avatar, ikonlar, sınıf logosu). Bitenler: Druid efektleri, Vesper efekt/ses/ikon/sprite, Treant AB3 sprite (0.9.10.25).

## Döngü (Codex/vfx)
1. Tabloya satır (`docs/anim-review/board.md`), not `notes/<id>.md`.
2. Çizim: `tools/codex/art-loop.mjs` + job JSON (Terra çizer, Sol kontrol eder, geçme çizgisi 8/10; "KALDI + PUAN 8" geçer).
3. Anahtarlama/kesim: scratchpad scriptleri; kurulum `tools/import-class-vfx.mjs`, `data/audio-v2/<sınıf>.json`, `src/game/art-v2/<sınıf>/vfx.ts|icons.ts`, `asset-versions.ts`; `node tools/webp-assets.mjs --check`.
4. Yakala `node tools/anim-capture.mjs <id>`, kare kare bak, Sol'a ver. 8/10 altını BAĞLAMA.
5. Test: `--maxWorkers=3 --testTimeout=120000`; tam vitest yalnız arka planda; sonra `push-queue ready`.

## Tuzaklar
- `assets/source/<yeni klasör>` `ready` ile commit OLMAZ: elle `git add`+commit, yoksa `tests/wiki-assets.test.ts` temiz kopyada kırılır.
- Her sheet bir `vfx.ts`'te kullanılmalı (wiki-assets); kullanılmayan sheet testi kırar.
- Karakter `spriteId`/pasif ikon değişince golden kaydı değişir: `npx tsx tests/golden/record.ts`, farkın yalnız bu alanlar olduğunu doğrula.
- Sürüm seçici kapsamı: `asset-versions.ts` V2_SCOPE ('vfx','sfx','icon').
- Aynı anda tek ajan, tek vite, tek tarayıcı (makine yükü). Başka sohbetlerin 5175 yakalamalarına dokunma.
- Alt ajan raporları bayat gelebilir: log/git ile doğrula.

## Açık işler
- Treant ölme (`summondeath_treant`, druid/vfx.ts): 8/10, bağlı. Gerçek savaşta öldürerek ve 21:9 + telefonda bakılmadı.
- Vine Snare: eski `vinesnare` oynuyor; `vinesnareChain` 7/10, bağlı değil. Yeni sheet 07 üç denemede de geçmedi (Sol 5, 4, 5 / 10; 2026-11-03), eski efekt oynuyor; denemeler repo dışında (eov-forms-archive/vine-snare-tries), not notes/vine_snare.md. Başka yaklaşım gerekir.
- Işıma taraması: `softTexture` + NEAREST glow (kademeli ışıma) tüm efektlerde; Bone Slash `smoothGlowTex` ile düzeltildi. Yarım düzeltmeler (Anti-Mage, Druid, Hexer, Mage, Undead, `src/game/vfx.ts`) DOĞRULANMADI, `wip/character-vfx-glow` dalında (c7728642); taramayı oradan ya da sıfırdan, sırayla yap.
- Bakılmadı: Treant AB3 savaşta (kafa okunurluğu, dış çizgi), 21:9 ve telefon (844x390) savaş ekranları, Druid efektleri telefonda, Vesper sesleri (ölçüldü, dinlenmedi) ve ölme efekti, Thunderpeal üst kenarı (yalnız önizleme).
- `docs/anim-review/new-art/vesper-art/portre.png` oyunda kullanılmıyor (yalnız avatar).
- Vesper ikonları "şimdilik" onaylı; ileride değişebilir (dosyalar `assets/icons-v2/vesper/`, kaynaklar `assets/source/vesper-icons/`).
