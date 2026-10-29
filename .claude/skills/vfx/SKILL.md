---
name: vfx
description: Animasyon / VFX işini Codex (Luna 6) ile ortak döngüde yapar. Yeni skill efekti oluştururken de, bozuk efekti düzeltirken de kullan. Codex inceler ve çizer, Claude oyuna kurar ve düzeltir, Codex oyundan yakalanan karelerle kontrol eder. Ömer "/vfx <iş>" dediğinde, "Codex'le yap" dediğinde ya da bir skill efektinin kaydığını / zıpladığını / yanlış yerden çıktığını söylediğinde kullan.
---

# Codex ile ortak çalışma (animasyon / VFX)

Argüman: yapılacak iş. Ör. `Run Down kayıyor`, `Bellwarden'ın yeni skill efektleri`, `pick_of_the_deep`.

Ortak dosyalar: `docs/anim-review/` (süreç `README.md`, durum tablosu `board.md`, skill başına not `notes/<id>.md`, yeni çizimler `new-art/<id>/`). Codex'in girişi `AGENTS.md` ("board'a bak" = Codex sırası gelen her işi yapar).

**Roller:** Codex inceler (kare kare not) ve yeni dizi çizer. Claude oyuna kurar, ayarlar, düzeltir. Codex kontrol eder. Tablodaki durum: `incele` → `duzelt` → `kontrol` → `tamam`; çizim gerekirse `yeni-cizim` → `ekle` → `kontrol`.

## Ana sohbet ne yapar
1. İşi anla: yeni efekt mi, düzeltme mi; hangi skill'ler (id: `data/skills.json` > name). Ömer'in sözünü aynen not al.
2. İşi **bir agent'a ver**: `content-designer` (Opus), açıklaması `content-designer: <iş> (Codex ile)`. Agent'a bu dosyayı, skill id'lerini ve Ömer'in sözünü ver. Ana sohbet koordine eder ve Ömer'e Türkçe rapor verir.
3. Agent bitince yakın plan karelere kendin de bak ("Codex'in kaçırdıkları"). Sonra `node tools/push-queue.mjs ready <oturum> --fixes "<İngilizce oyuncu satırı>"`.

## Ortak araçlar (agent)
Geliştirme sunucusu 5173 açık olmalı. Oyun hep sessiz (araç sessiz açar). Tarayıcı ya da uygulama açma.
- **Yakala:** `node tools/anim-capture.mjs <id...>` → `docs/anim-review/captures/<id>/` (sheet.png: 50 px ızgaralı kareler; frame_NNN.png: tam ekran; frames.json: atan/hedef konumu, her karede sprite konumu). Sunucu yenilenirse araç 3 kez dener.
- **Codex'i çalıştır (arka planda):**
  `echo "board'a bak. <ne istendiği>" | node tools/codex/run.mjs exec -C . --skip-git-repo-check -s workspace-write --color never -i <sheet.png> [-i ...] -o <scratchpad>/codex-last.txt -`
  Codex exec'te tarayıcı yok: hep yakalama görsellerini `-i` ile ver. Rolleri her seferinde hatırlat (README > "Kim kime atıyor").
- Her turda notun altına `## Tur N · Claude · <düzeltme|ekleme>` yaz, tabloyu güncelle.

## A. Yeni efekt oluşturma
1. Tabloya satır: durum `yeni-cizim`, Not: istenen efekt.
2. Notta çizim isteği yaz (README > "Yeni çizim isteği"): kare sayısı, boyut, ızgara, efektin başladığı ve bittiği yer, karakterin duruşu (el, silah, yön), vuruş karesi. Codex `new-art/<id>/<id>.png` + `.json` çizer. (ChatGPT ile çizim istenirse `art-pipeline` agent'ı; tek agent, kuralları `.claude/agents/art-pipeline.md`.)
3. Oyuna kur: mob efekti `assets/source/mob-vfx/<mob>-<id>.png` → `node tools/import-mob-art.mjs vfx`, `src/game/mob-vfx.ts > MOB_VFX_SPECS` satırı, ayar `data/battle-layout.json > animation.mobVfx.skills.<id>`. Sınıf efekti `docs/arch/assets.md` > sanat sürümleri. Siyah çerçeve yok, kareler akmalı (VFX kuralları).
4. Yakala, tabloyu `kontrol` yap, Codex'e kontrol ettir. `tamam` olana kadar düzelt ya da yeniden çizdir.

## B. Bozuk efekti düzeltme
1. Tabloya satır: durum `incele`, Not: Ömer'in gördüğü sorun.
2. Yakala → Codex inceler (`duzelt` yapar).
3. Düzelt: önce `data/battle-layout.json > animation.mobVfx.skills.<id>` (dx/dy, srcDx/srcDy, size, speed, alpha, flashScale, fadeOut, travel...); yetmezse `src/game/mob-vfx.ts`. Ayarla çözülmüyorsa A'daki gibi yeni çizim iste.
4. Yeniden yakala → Codex kontrol → `tamam` olana kadar.

## Codex'in kaçırdıkları / bilinen tuzaklar
- **Ayak / yükseklik, ön / arka:** sheet.png küçük, Codex kaçırabilir. Sonunda frame_NNN.png'den atanın ve hedefin çevresini büyük kırpıp kendin bak (Run Down "ayağından çıkıyor").
- **Aynalama:** Phaser `flipX` dokuyu karenin içinde aynalar, origin'i aynalamaz. Düşman tarafında (flip) sabit origin x'i `1 - ox` olmalı (mob-vfx.ts artık anchor origin'lerinde bunu yapıyor).
- **Çizimde satır kayması:** içerik satırdan satıra farklı yükseklikte olabilir; `stabilize` (ref kare) ile sabitle.
- **İki parçalı skill** (`bite`: Run Down = kendi izi + Scorch Bite ısırması): yakalama ikisini de kaydeder; frames.json `key` hangisi olduğunu söyler.
- **dx bütün diziyi kaydırır** (Pick of the Deep'te patlama atana kaydı); yalnız çıkışı oynatmak için srcDx/srcDy.
- Roller: atan sağdaki mob, hedef soldaki kukla; hasarın ve parlamanın kuklada çıkması doğrudur.
