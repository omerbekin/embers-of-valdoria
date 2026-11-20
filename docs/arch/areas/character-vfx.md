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
- Karar (Ömer 2026-11-14, form r17): şimdilik kalsın, yeniden çizim yok.
- Saldırı karelerine dokunulmadı: onlar hâlâ yandan profil ve oyun boyutunda yüzleri de zayıf (göz seçilmiyor), idle (3/4 önden) -> ilk saldırı karesi geçişinde gövde yönü değişir.
- **Yandan idle + yumruk (Ömer 2026-11-09 büyük form, onaylı, bağlandı):** idle1/idle2 artık diğer 25 poz gibi YANDAN (sağa bakan, baş izleyiciye hafif dönük; Codex art-loop, idle1 Terra tur 3, idle2 Sol 8; idle1 ağzı ayrı turdan yalnız ağız kutusu bindirildi). slash1, overhead1, thrust1, spin1a, spin1c, guard1'de boş açık el YUMRUK (channel ve throw'da açık el kalır): Terra gövdeyi her turda yeniden çizdiği için slash1 turundan alınan tek yumruk her pozun bileğine döndürülerek bindirildi, gövdenin geri kalanı eski piksel. Yumruk boyu Ömer'in "aşırı büyük" uyarısıyla Warrior oranına indirildi (yumruk eni / yüz genişliği: Warrior 0,55, ilk bindirme 0,76, son ~0,57; ölçek 0,76). Taslaklar ve araçlar scratchpad'deydi (geçici); eski kareler kayıtlı değil, git geçmişinde.
- Noktalar (402x409): idle1 ana (200,217) / ikinci (282,147); idle2 iki el (265,218) açı 22, `itemPoses` idle2 greataxes/mauls 30, staves 28 (sap iki yumruktan geçer, baş yüzü kapatmaz); offhand slash1 (322,202), overhead1 (302,222), thrust1 (275,218), spin1a (297,216; eskiden gövde arkasındaki (208,225)'teydi, görünen ele taşındı), spin1c (318,200), guard1 (343,97). `box`'lar yeni alfa sınırı. Avatar + `sprites/skald/idle` yeni idle1'den, `HEADS.skald` (162,-4,130).
- **Dikkat:** skald-v2 karelerinin `make-poses-v2.mjs` kaynağı (`assets/source/poses/skald-v2/*.png` sayfaları) eski çizimler; araç skald için yeniden çalıştırılırsa bu 8 kare eskiye döner (önceki idle düzeltmesi de aynı durumdaydı).

## Durum: Redtithe idle (2026-11-17, dal agent/engine-dev-birlesim, push yok)
- Ömer (2026-11-17): "Concept de B olsun. Silahsız bir idle pozisyonu çizdir. Sonrasının devamını getirelim." Konsept B: `docs/anim-review/new-art/redtithe-concept/redtithe-B.png` (istem chat-r22-ship dalındaki `list.json`).
- Yapıldı: yalnız `antimage-v2/idle1` değişti (450x412 tuval, taban y406, boy 382 = eski idle1 ile aynı ölçek; `canvas`/`figure`/`heightFit` dokunulmadı). Codex art-loop: `new-art/redtithe-idle/job.json` tur 1 Sol 8 GECTI ama yüz neredeyse profil (uzak göz oyun boyunda seçilmiyordu); `job-face.json` yüz turu (Terra her turda bütün figürü yeniden çizdi, Sol "gövde değişti" diye 5/7/6 verdi); tur 2'nin figürü BÜTÜN olarak alındı, 450x412'ye normalleştirildi (`final/idle1.png`), ayrı Sol kontrolü (asıl kurallar) GECTI 9/10 (`final/checks/idle1-1.md`). Eski idle1 `assets/poses/antimage-v2/_old-2026-11-17/`.
- (ESKİ, aşağıdaki yeniden çizimle değişti) Noktalar: idle1 ana el (156,218) açı 15.78 (daggers `main:idle1` 45 aynen), ikinci el (278,129) açı 10, box (128,24,194,382). Avatar + `sprites/antimage/idle` yeni idle1'den (`assets/source/characters-v2/antimage.png`; eski `antimage-old-2026-11-17.png`), `HEADS.antimage` (104,-4,100). Hero kartı büstü `data/hero-bust.json` aynı kırpımla yeni figürü gösteriyor (değişmedi).
- Bilinen: diğer 25 poz (idle2, saldırı, hit, kneel...) hâlâ eski mor paltolu kadın; idle -> saldırı geçişinde görünüş değişir (sonraki tur). `tools/make-poses-v2.mjs` antimage için yeniden çalıştırılırsa idle1 eskiye döner (kaynak `antimage-v2/narrow.png`).
- Açık: Ömer onayı; yumruk eni / yüz eni ~0,65-0,70 (Warrior 0,55, Skald ~0,57); kemerde şişeler + pirinç ondalık kâsesi konseptten geldi (istenen görünüş listesinde yoktu).
- **Yeniden çizim (Ömer 2026-11-17: "Dagger elle aynı hizada değil... Sıfırdan yeni bir sohbette tekrar çizdirsene"):** yeni iş `docs/anim-review/new-art/redtithe-idle-v2/` (girdi yalnız konsept B + Warrior baş kırpımı; eski Redtithe/Anti-Mage çizimleri verilmedi). Sol hiçbir turu geçirmedi (iş 1: 5/6/5; iş `b/`, önkol yönüne göre yazılmış istem: 6/6). Aday: iş 1 tur 2, normalleştirilmiş `final/idle1.png` (382 boy, taban y406); `b/` tur 2 ön yumruğu bele indirdi ama yüz profile döndü (yedek).
- **Bağlandı (Ömer 2026-11-17: "ben kılıç için demişim abicim kuralı. kız hançer tutuyor"):** aday oyunda (idle1 + small + webp, atlas, avatar, idle sprite, `HEADS.antimage` (138,-4,100)); eski idle1 `assets/poses/antimage-v2/_old-2026-11-17b/`. Tutuş eksenleri (6x ızgarayla ölçüldü, 0 yukarı saat yönü): ana el = arka yumruk (131,225) açı 110 (önkol dikey -> dik eksen 90, parmak dizisi 110); ikinci el = ön yumruk (319,163) açı 30 (önkol yatay, parmak dizisi ~30). box (98,24,253,382). `daggers.main:idle1` 45 ayarı silindi; hançer ölçülen eksende.
- Kural (test `tests/poses.test.ts`): "yukarı ve hafif öne" (15..50) yalnız kılıç / balta / topuz / çekiç içindir; hançer istisnası "ucu öne", band 40..120 (eskiden 40..90).
- Tek elli ağızlı silahlar (swords, axes, maces, hammers) idle1'de arka yumruğun ekseni (110) bandın dışında olduğu için `itemPoses.<aile>.main:idle1 = { hand: "off" }`: ön yumrukta 30 (bandda, yumruğa hizalı). `back: true` denendi: kabza yumruktan yanlış yönde çıkıyor, seçilmedi.
- Yer değiştirme kuralı (Lead 2026-11-17, `poseItems` / `itemPlacement(..., swapped)` in `src/game/poses.ts`): ana eşya `hand: 'off'` ile ön ele geçtiyse ikinci el eşyası (hançer / kalkan) ANA ele (arka yumruk) geçer, açı eşyanın kendi ana-el ayarından (hançer 110). Yay/tılsım tutuşlarında ikinci eşya zaten çizilmez, Archer etkilenmez. Test: `tests/poses.test.ts` "yer değiştirme".
- Açık: kılıç/balta + ikinci el hançeri birlikteyken ikisi de ön yumrukta, hançer kılıcın arkasında kayboluyor, arka el boş kalıyor (kalkanla da aynı ön el). Arka hançer bıçağı kuşak/uyluk üstünden geçiyor (Sol: göze kötü). Ön yumruk göğüs altında (y163), istenen bel hizası değil. Sol hiçbir çizim turunu geçirmedi (5/6/5, b/ 6/6); bindirme Sol 7 (hizalı, yüz açık). `data/hero-bust.json` / `crown-anchor.json` antimage girdileri yeni baş konumuna göre bakılmadı. Diğer 25 poz hâlâ eski kadın. Ömer onayı bekleniyor; mantık notu onaydan sonra Lead yazar.

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
- **Sonra (Ömer 2026-11-12):** evolve olmuş skill'lerin animasyonu değişecek, daha görkemli olacak (ör. Fire Bolt > Sunfire). Her evolve kendi efektini alır; /vfx döngüsüyle yapılır. Henüz başlanmadı.

## Kararlar (geçerli kurallar; tam tarihçe `docs/archive/arch/areas/character-vfx.md`)
- **Silah tutuş standardı (Ömer 2026-11-18):** yalnız yeni karakterler; mevcutlar düzeltilmez. Kural `docs/design/art-v2.md` §8 (boy oranı, kalkan ön elde göğüs-bel, yumruk sapın alt üçte biri, açı bantları, katman).
- **Skald görünüşü** A (`docs/anim-review/new-art/skald-concept/skald-A.png`): idle'da davul sırtta, pelerin aynen. **Vesper** taban görünüş A5 (çanda şimşek yok, parlayan beyaz gözler); `data/skill-trees/vesper.json`a dokunulmaz.
- **Skald poz kararı (Ömer 2026-11-09, büyük form):** idle1 + idle2 yandan sete uyar, kafa izleyiciye hafif dönük (25 poz yandan kalır); boş el YUMRUK, yalnız channel ve throw pozlarında açık el (şarkı/büyü jesti). Çizim ayrı iş; yüz okunurluğu kuralı `art-v2.md` §7 geçerli.
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
