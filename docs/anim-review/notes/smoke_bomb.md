# Smoke Bomb · `smoke_bomb` (Cutthroat)

Ömer'in sözü (2026-10-31): "smoke bomb deneyelim". Terra 6.1 (`gpt-6.1-terra`) ile yeni VFX çiziminin denemesi; bu tur yalnız çizim + ölçüm, oyuna kurulmadı.

## Tur 1 · Claude · yeni çizim isteği · 2026-10-31

Skill: `area_any`, 2x2 alan, menzil 4, hasar yok. Düşman alanına atılırsa Blinded, kendi alanına atılırsa Shrouded (2 tur). Atan Cutthroat açık elinden kil bombayı yay çizerek alanın ortasına atar; bomba kırılır, duman hücreleri kaplar. Sonrasında alanda soluk pus kalır (`src/game/linger-haze.ts`, ayrı katman, bu sheet'in işi değil).

İki sheet (Bone Throw düzeni: uçuş ayrı, varış ayrı; yay ve hedef noktası kodda):

| Sheet | Kare | Izgara | Hizalama (import-class-vfx) | Başlangıç, bitiş |
|---|---|---|---|---|
| `smoke_bomb.png` (varış) | 8 | 4x2 | `ground`, pivot [160, 301] | Alanın ortasında kırılan bomba, 2x2 alanı kaplayan alçak bulut, seyrelip soluk pusa bırakır |
| `smoke_bomb_fly.png` (uçuş) | 8 | 4x2 | `center`, pivot [160, 160] | Fitilli kil küre kendi merkezinde döner, döngü |

Kare 320x320 içe aktarma sonrası; ham çizim 2:1 sheet. Duruş: kukla/atan hep sağda ya da solda olabilir, efekt yönsüz çizildi. Vuruş karesi: varış sheet'inin 2. karesi (kırılma, durumlar burada işler). Renk gri-kömür (`fx` #9aa3ad), kıvılcım yalnız ilk iki karede. Sanat kuralları: ortaçağ, tek konu, gürültüsüz, siyah çerçeve yok, kareler akar, kenara taşma yok.

## Tur 2 · Claude · çizim sonucu · 2026-10-31

Model `gpt-6.1-terra`, Codex yerleşik görsel aracı. Üç çizim: varış 2 kez (ilkinde 6→7 ani kopuş, sert taban çizgisi), uçuş 1 kez. Gerçek saydam PNG geldi, magenta gerekmedi.

Dosyalar: `new-art/smoke_bomb/` altında `smoke_bomb.png` + `.json`, `smoke_bomb_fly.png` + `.json` (1280x640, 320 px kare, `import-class-vfx` kesimiyle), ham çizimler `*.raw.png`, şerit önizleme `preview.png`.

Kalan kusurlar:
- Varış s1→s2: bomba ~30 px sola atlıyor (göz ölçüsü); s2'de duman sağa yüklü, ağırlık merkezi s1-s3 arası ~18 px kayıyor.
- Varış s4→s5: genişlik %9 daralıyor (en geniş an s4, istenen s5).
- Uçuşta kil rengi varıştakinden daha turuncu, küre daha temiz; bomba çatlakları dikiş gibi okunabilir.
- Uçuş duman tutamı koyu zeminde çok soluk.
- s4-s6 ortalama alfa 204-232: birimleri kapatır, oyunda alfa ve derinlik ayarı gerekir.

Oyuna kurulmadı. Ömer'in görmesi bekleniyor.

## Tur 3 · Claude · oyuna kurulum · 2026-11-01

Sheet'ler `assets/vfx/cutthroat/01-smoke-bomb`, `02-smoke-bomb-fly`; efekt `vfx.ts > smokebomb` (Cutthroat sürüm seçicinin dışında kaldı). Panel: VFX frame test > Cutthroat > Smoke Bomb.

- s1→s2 sıçraması: `import-class-vfx > shift` ile s1 32 px sola; uçuş s1'in bombasının yerinde biter, boyu eşit.
- Bulut iki kopya: alandaki birimlerin arkasında 0,9, önünde 0,42 alfa. Bomba küçük başlar (0,7), kırılınca tam boya kabarır; bulut 0,8 basık (2x2 genişliğinde).
- 8 fps + `crossfade` x3, `SKILL_PREWARM`da. Eski kil kırıkları, halka, kıvılcım ve yumaklar kalktı (yalnız sheet yüklenemezse yedek).
- Mob skill'leri kendi mob sheet'lerini oynatır, değişmedi.

Durum `kontrol`: Ömer görecek. Kalan: s4→s5 hafif daralma, uçuş kili varıştan biraz turuncu.
