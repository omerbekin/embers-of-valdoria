# Alan: Character VFX (sınıf efektleri, sınıf görselleri)
> **Ne için / Güncel mi (2026-11-08):** karakter VFX alanı canlı durumu ve kararlar. evet.


Agent buradan başlar: `.claude/skills/vfx/SKILL.md`, `docs/anim-review/README.md`, `docs/arch/codex-imagegen.md` (art-loop bölümü), `docs/design/art-v2.md`.

## Kapsam
Sınıf/hero skill efektleri (sheet, kod efekti, ses), sınıf görselleri (portre, idle, avatar, ikonlar, sınıf logosu). Bitenler: Druid efektleri, Vesper efekt/ses/ikon/sprite, Treant AB3 sprite (0.9.10.25).

## Döngü (Codex/vfx)
1. Tabloya satır (`docs/anim-review/board.md`), not `notes/<id>.md`.
2. Çizim: `tools/codex/art-loop.mjs` + job JSON (Terra çizer, Sol kontrol eder, geçme çizgisi 8/10; "KALDI + PUAN 8" geçer).
3. Anahtarlama/kesim: scratchpad scriptleri; kurulum `tools/import-class-vfx.mjs`, `data/audio-v2/<sınıf>.json`, `src/game/art-v2/<sınıf>/vfx.ts|icons.ts`, `asset-versions.ts`; `node tools/webp-assets.mjs --check`.
4. Yakala `node tools/anim-capture.mjs <id>`, kare kare bak, Sol'a ver. 8/10 altını BAĞLAMA.
5. Test: `--maxWorkers=3 --testTimeout=120000`; tam vitest yalnız arka planda; sonra `push-queue ready`.

## Kurallar
- **VFX kontrolü görünüşle yetinmez (Ömer 2026-11-08):** fps / kare zamanlaması (kare kare süre, takılma, siyah kare) ve her karede dayanak konumu (atanın eli/asası, hedef/zemin hücresi, kayma, sıçrama, flipX origin) ÖLÇÜLÜR; Codex kontrolünde de bu ikisi açıkça istenir (frames.json: kare başına sprite x/y/frame, ms). Oyundaki gerçek fps = sheet fps / skillSlowdown (1.2); 8 kareli sheet için `inbetween` (3x) kullan.

## Durum: Druid VFX (2026-11-08)
- Kayıt aracı düzeldi: `tools/anim-capture.mjs` `Date.now()`'u adım saatine bağlar (eskiden yükte ~2x hızlı sayıyordu; 2026-11-08 öncesi tüm yakalamaların zamanlaması şüpheli, konum ölçüleri geçerli).
- Druid/Treant sheet'lerine 3x ara kare (`IB`), efektif ~30-35 fps; Healing Rain zemin havuzu ~20 fps.
- Ömer: skill 1 (Thorn Whip), 2 (Nature's Wrath), 4 (Summon Treant) VFX %30 küçük; Thorn Whip yalnız inceldi (boy asa ucu -> hedef), `reachPad` 12 px. Skill 3 (Healing Rain) aynı.
- Codex: Thorn Whip 8/10, diğerleri 9/10. Açık: Vine Snare sheet 07/08 bağlı değil; 21:9 ve telefon bakılmadı.

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

## Kararlar (hafızadan taşındı 2026-11-08)
Tam metinler `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/` (dosya adı parantezde).
- **Skald görünüşü, Ömer 2026-11-08:** görünüş A (`docs/anim-review/new-art/skald-concept/skald-A.png`: yaşlı gri örgü sakallı destan ozanı, kurt kürkü pelerin). Idle'da davul sırtta (L1); pelerin aynen, inceltme YOK; davul skill'inde davulu eline alıp çalar; sprite skill'ler düşünülerek çizilir; animasyonlar Paladin'e benzemez; menzilli-yakın erişimini kullanır; bu kahramana özel. 1H topuz + kalkan ve 2H çekiçle de hantal görünmemeli; teçhizat yerleşim sayfası (L1 sırtta, L2 kalçada, L3 kalkan-davul) önce Ömer'e. Yaşlı olduğu ses ve VFX'te hafifçe görünür (daha kalın/kısık ses, ağır, yavaş vuruşlar). Idle'da şimşek yok; şimşek yalnız skill VFX'inde, kullandığı silah/aletin üstünde. Sıra: yerleşim seçimi → Codex (/vfx) sprite → skill + animasyon turu. (skald-art-picks)
- **Vesper sanatı** (2026-10-31): taban görünüş A5 (`A5-eyes-only.png`): çanda şimşek yok, tek büyü öğesi parlayan beyaz gözler. Ağaç/sayılar Character Design'da; `data/skill-trees/vesper.json`a dokunulmaz. Ömer başka bir yöntem belirleyecek diye BEKLEMEDEYDİ. Konsept klasörü ana `game/` kopyasında takipsiz: worktree'ye kopyala ya da oradan oku. (vesper-art-handoff)
- **Codex VFX sahibi denemesi** (Ömer 2026-11-01 "sistemi güzel kur. her şey yolunda giderse vfx işine tamamen chatgpt codex bakacak"): Claude yalnız istemi yollar; Terra 6.1 çizer + not tutar, Sol 6.1 şablona göre kontrol eder ve karar verir, geçme çizgisi 8/10. Vesper pozları 8/10 ile kabul (`vesper_v2`). Tüm VFX'in Codex'e geçmesi KARARLAŞMADI. Sol, Terra'nın Windows sandbox'ında başlayamaz: ayrı süreçler, karar vermeyen ince döngü betiği; Codex sandbox açık kalır. (codex-vfx-owner)
- **Mob VFX seçimi** (form C4CWKsRhpWXrK6yEWnbrHG, 0.9.8.1): 18 elle kod (`hand: true`), kalanı ChatGPT sheet + kod ara kareleri 3x (5x yalnız Chief's Cleaver, Toll Sweep, Billhook). Ayar `data/battle-layout.json > animation.mobVfx.skills`. Açık (Ömer karar vermedi): Pick of the Deep ve Dragon's Breath YENİ çizim ister (Pixel Lab yan yana deneme önerildi); gözle bakılmadı: Kiln Smoke konumu, Cudgel 90 ms gecikme, Raven's Peck asa ucu, karakteri örten duman, telefonda 5x; 5x herkese mi 3x mi açık. Ajan konumları kör tahmindi (Bite dx 10 → 75); diğer yakın dx'leri gözle doğrula. Gözle bakma: dev sunucuda `import('/src/ui/debug-vfx-battle.ts').then(m=>m.openVfxBattleTest(window.__game))`, `.vb-select`, Cast, impact karesinde `loop.sleep()`, zoom ekran görüntüsü, `loop.wake()`; yüklemeden sonra önce bir ekran görüntüsü al, yoksa tuval siyah kalır. (mob-vfx-choice-form)
- **Codex animasyon döngüsü** (2026-10-28, kalıcı): `docs/anim-review/README.md`, `board.md`, `notes/<id>.md`, `AGENTS.md` ("board'a bak"). Yakalama `node tools/anim-capture.mjs`, Codex `node tools/codex/run.mjs exec ...` (tarayıcısı yok, yakalamaları inceler; rol bilgisini her seferinde ver). Codex ayak/ön-arka konumunu küçük sheet'ten kaçırır: frame_NNN.png'yi kendin kes. Phaser flipX kareyi orijin etrafında değil kare içinde aynalar: çevrik sheet'te x = 1-ox (mob-vfx.ts fx() ile genel düzeltildi). npm install kaydedilmemiş bağımlılıkları siler. Kısayol `/vfx`. (anim-review-codex)
- **Araçlar:** Upscayl CLI (`"C:\Program Files\Upscayl\resources\bin\upscayl-bin.exe" -i in.png -o out.png -s 2 -n upscayl-standard-4x -m "C:\Program Files\Upscayl\resources\models" -f png`, RTX 4070 SUPER ~5 sn, alfa korunur; lite-4x bozuk). Yalnız Ashford büyütüldü (`tools/make-town-art.mjs` `assets/source/backgrounds-v2/upscaled/` tercih eder); diğer kasabalar Ömer görmeden girmez; Valdoria haritası az kazanç; AM pozları araştırma ister. Yerel AI: ComfyUI + SDXL `D:\AI`, Codex'e verildi 2026-11-01, LoRA eğitimi başlamadı, LoRA'sız piksel ikon tutmuyor. Higgsfield CLI oturum açık, 9 skill `-g`; Raise Dead denemesi: AutoSprite 3/3 başarısız, Seedance içerik uydurdu; Python burada `-E -P` ister. (upscayl, local-ai-comfyui, higgsfield-setup)
- Eski "Character vfx" sohbeti 2026-11-02 kapandı; sınıf VFX işi bu alanda. (character-vfx-chat)
- Taşınan hafıza: skald-art-picks, vesper-art-handoff, codex-vfx-owner, mob-vfx-choice-form, anim-review-codex, upscayl, local-ai-comfyui, higgsfield-setup, character-vfx-chat.

## Thunder Skald sanatı (2026-11-08)
- Yapıldı: kendi gövde pozları (`assets/source/poses/skald-v2`, 24 poz + drum_take / drum_a / drum_b), 7 VFX sheet (`assets/source/skald-vfx`), 5 ikon (`assets/icons-v2/skald`), 11 ses (`data/audio-v2/skald.json`). Kod `src/game/art-v2/skald/`. Hammer Spark / Thunder Strike / War Drum yakın dövüş görünümü (viewMotion melee), Stormcall büyücü duruşu KALIR (Ömer beğendi).
- **AÇIK (motor tarafı, engine-dev sonra):** Hammer Spark bölünmüş hasarı iki olay yazıyor (fiziksel, sonra şimşek yarısı); `syncHits` iki sayı arasına ~100-200 ms koyuyor, efekt 70 ms'de şimşeği çatlatsa da ikinci sayı geç çıkıyor. Codex Hammer Spark'ı bu yüzden `duzelt` tutuyor; efekt tarafında daha fazla sıkıştırılmadı.
- Bakılmadı: sesler kulakla dinlenmedi; 2H çekiçte throw/hit kavraması ve 1H kalkan konumu preview'da düzeltildi, oyunda her pozda gözle bakılmadı.
