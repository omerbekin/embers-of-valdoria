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

## Durum: Skald idle (2026-11-08)
- Ömer: Skald idle'ı Paladin gibi savaş duruşu olmalı (yandan, kollar aşağıda değil). Çekici aşağı sarkıtma denemesi geri alındı (test istisnası yok).
- Yeni `skald-v2/idle1` + `idle2` Codex art loop ile çizildi (Terra çizer, Sol 8 ve 9/10 GECTI; iş `docs/anim-review/new-art/skald-idle-v3/job.json`): 3/4 önden, bacaklar açık, iki yumruk göğüs önünde boş (idle1); idle2 = Paladin idle2 gibi çift el tutuşu (iki yumruk karın önünde birlikte; idle2 iki elli silah beklemesidir, nefes karesi değil). Eskiler `assets/poses/skald-v2/_old-2026-11-08/`.
- Ankrajlar (yeni görselden ölçüldü): idle1 ana el (164,176) açı 50 (22'de çekiç başı oyunda yüzün tam önüne düşüyordu, Ömer'in "surat görünmüyor" şikâyetinin asıl sebebi; 50 kuralın üst sınırı), ikinci el (250,141), kalkan `shields.idle1` dx6 dy42 (Paladin ile aynı); idle2 iki el (158,232) açı 40. Avatar + `sprites/skald/idle` yeni idle1'den (`HEADS.skald` (135,-6,140)).
- Yüz düzeltmesi (Ömer 2026-11-08 "skaldın suratı görünmüyor"): idle1 baş yeniden çizildi (yüz 3/4 izleyiciye, sıcak açık ten, ağız görünür; Sol 9/10, `docs/anim-review/new-art/skald-idle-v3/job-face.json`, yalnız baş değişti, ankrajlar aynı). idle2'de Terra gövdeyi de yeniden çizdi (4 tur KALDI, puan en çok 7), bu yüzden baş elle bindirildi: tur 4'ün başı eski idle2 gövdesine yumuşak maskeyle (`face/composite-idle2.png`). Kural `docs/design/art-v2.md` §7.
- Saldırı karelerine dokunulmadı: onlar hâlâ yandan profil ve oyun boyutunda yüzleri de zayıf (göz seçilmiyor), idle (3/4 önden) -> ilk saldırı karesi geçişinde gövde yönü değişir.

## Durum: Druid VFX (2026-11-08)
- Kayıt aracı düzeldi: `tools/anim-capture.mjs` `Date.now()`'u adım saatine bağlar (eskiden yükte ~2x hızlı sayıyordu; 2026-11-08 öncesi tüm yakalamaların zamanlaması şüpheli, konum ölçüleri geçerli).
- Druid/Treant sheet'lerine 3x ara kare (`IB`), efektif ~30-35 fps; Healing Rain zemin havuzu ~20 fps.
- Ömer: skill 1 (Thorn Whip), 2 (Nature's Wrath), 4 (Summon Treant) VFX %30 küçük; Thorn Whip yalnız inceldi (boy asa ucu -> hedef), `reachPad` 12 px. Skill 3 (Healing Rain) aynı.
- Healing Rain: zeminde halka yok, yalnız dolu kare (Ömer 2026-11-08); `02-healing-pool` sheet zeminde artık çizilmiyor.
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
- Vesper ikonları "şimdilik" onaylı; ileride değişebilir (dosyalar `assets/icons-v2/vesper/`, kaynaklar `assets/source/vesper-icons/`).

## Kararlar (geçerli kurallar; tam tarihçe `docs/archive/arch/areas/character-vfx.md`)
- **Skald görünüşü** A (`docs/anim-review/new-art/skald-concept/skald-A.png`): idle'da davul sırtta, pelerin aynen. **Vesper** taban görünüş A5 (çanda şimşek yok, parlayan beyaz gözler); `data/skill-trees/vesper.json`a dokunulmaz.
- **Codex animasyon döngüsü** kalıcı: `docs/anim-review/README.md`, `board.md`, `notes/<id>.md`; Codex VFX'in sahibidir, Claude istemi yollar ve oyuna kurar (`vfx` skill).
- **Mob VFX:** 18 elle kod (`hand: true`), kalanı ChatGPT sheet + kod ara kareleri; ayar `data/battle-layout.json > animation.mobVfx.skills`.
- Araçlar (Upscayl, ComfyUI, Higgsfield) ve eski "Character vfx" sohbeti ayrıntısı arşivde.

## Thunder Skald sanatı (2026-11-08)
- Yapıldı: kendi gövde pozları (`assets/source/poses/skald-v2`, 24 poz + drum_take / drum_a / drum_b), 7 VFX sheet (`assets/source/skald-vfx`), 5 ikon (`assets/icons-v2/skald`), 11 ses (`data/audio-v2/skald.json`). Kod `src/game/art-v2/skald/`. Hammer Spark / Thunder Strike / War Drum yakın dövüş görünümü (viewMotion melee), Stormcall büyücü duruşu KALIR (Ömer beğendi).
- **AÇIK (motor tarafı, engine-dev sonra):** Hammer Spark bölünmüş hasarı iki olay yazıyor (fiziksel, sonra şimşek yarısı); `syncHits` iki sayı arasına ~100-200 ms koyuyor, efekt 70 ms'de şimşeği çatlatsa da ikinci sayı geç çıkıyor. Codex Hammer Spark'ı bu yüzden `duzelt` tutuyor; efekt tarafında daha fazla sıkıştırılmadı.
- Bakılmadı: sesler kulakla dinlenmedi; 2H çekiçte throw/hit kavraması ve 1H kalkan konumu preview'da düzeltildi, oyunda her pozda gözle bakılmadı.

## Archer v3 sanatı (2026-11-09)
- Yapıldı: yeni Archer (seçilen `docs/anim-review/new-art/archer-v3/idle-g.png`) 26 gövde pozu `assets/poses/archer-v3/` (+ small/, webp, atlas), `data/poses.json > classes.archer_v3` (archer_v2 aynen duruyor; Pose Tester IV hâlâ archer_v2). Bağlantı: `src/game/poses.ts > v2BodyOf` `<id>_v3` varsa onu seçer. Hero kartı büstü poz sınıfının klasöründen (`src/ui/hero-bust.ts`). Avatar + idle sprite v3 idle1'den (`tools/import-characters-v2.py` HEADS archer; eskisi `assets/source/characters-v2/archer-old-2026-11-03.png`).
- Çizim: Codex art-loop, g-set `job-A..F.json`, sonuçlar `sonuc-B/E/F.json`; Terra çıktısını `g-set/normalize.py` ile 584x454 + gerçek alfa + v2 pozunun boyuna getirir. Yay/ok/okluk ayrı prop (pozlarda eller boş); `-bow` dosyaları yalnız referans, oyunda kullanılmıyor. ready/nock/draw_*/release/reach_quiver pozları çizildi ama v2 setinde yok, bağlı değil.
- El noktaları elle ölçüldü (v2 noktaları + kayanların düzeltmesi), okluk sırt noktaları `g-set/quiver-mounts.json`. idle1'deki kol-gövde arası beyaz cep saydam yapıldı (idle-g'de de var).
- Yay eli (Ömer 2026-11-09): yay hep ÖN elde (düşmana yakın el). v3 gövdesinde `anchor` (ana el) idle1/step1/overhead1/guard1/raise'de arka elde kalıyordu; `classes.archer_v3.itemPoses.bows` bu pozlarda `hand: "off"` (ön el) + yüzü kapatmasın diye açı: step1 30, overhead1 35/dx15, raise 30/dx15. bow_shot, bow_sky, slash1 zaten ön elde. Yeni idle çizimi (kol aşağı salık) denendi, gerek kalmadığı için durduruldu (`g-set/archive/idle-bow-unused/`, Sol'dan geçmedi).
- **AÇIK:** step2 Sol 7/10 (8 turda geçmedi: göğüs kayışı X düzeni, sol bracer, sağ eldiven), oyunda en iyi tur bağlı. 2H pozlarda (thrust2, spin2b) bir yumruk silahtan ayrı duruyor; çift el silahta bakılmadı. Okluk sırt noktaları yalnız idle1/bow_shot/step1(eski)/spin1a/guard1/raise için görselle denetlendi.
