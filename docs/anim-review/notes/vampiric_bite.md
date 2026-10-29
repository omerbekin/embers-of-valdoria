# Vampiric Bite (pasif) · `vampiric_bite` · Undead (sınıf)

Ömer 2026-10-29: "undeadin animasyonları çok kötü. mevcut skill icon ve efektlerini referans alma. tamamen skillerin amacına ve elementine göre 0dan özgün düşünerek bir skill effect seti chatgptye çizdirir misin /vfx ile uygulayalım sonra"
Sarma üstüne Ömer: "görsellerin tamamı ya karakterlerin üstünde ya da altında kalıyor. etrafını saramıyor" (çözüm: wrap + ghost; Ömer hayalet saydamlığı 0,45 seçti)
Tasarım: `new-art/undead/brief.md` (mevcut ikon/efektler referans DEĞİL). Skill: Undead hasar verip gerçekten iyileşince vurulandan can emer; Dark Bond varsa şifa bağlı dosta geçer.

## Tur 1 · Claude · yeni çizim isteği · 2026-10-29
Çizim Codex yerine ChatGPT ile yapıldı (art-pipeline; brief.md prompt'ları). Asıllar `assets/source/undead-vfx/` (4x2, 1774x887, ~443 px kare, gerçek alfa).

## Tur 1 · Claude · ekleme · 2026-10-29
İçe aktarma `node tools/import-class-vfx.mjs undead` -> `assets/vfx/undead/` (320x320 kare, 4x2, alfa korunur). Kesim çizgileri sabit
ızgaradan değil EN BOŞ satır/sütundan (ChatGPT satırları ortada bölünmüyor: ör. 04'te y=452, 05'te y=437); kenara değen küçük komşu
kırıntıları silindi. Ölçüm: hiçbir karede siyah çerçeve / ızgara çizgisi / boş kare yok, içerik kare kenarına değmiyor.
Oynatma `src/game/art-v2/undead/vfx.ts` (kodla çizilen eski efekt kaldırıldı, vuruş anları ve olay sırası aynı):
- `undead/08-vampiric-bite-wisp` (aslı 08-soul-drain): kızıl ruh tutamı (döngü) vurulanın göğsünden Undead'in göğsüne kavisle uçar (520 ms). Çizim SOLA akar; hedef sağdaysa aynalanır, çekirdek dayanağı 0,36 (aynalı tarafta 0,64). Varışta göğüste kızıl parlama. Bağ şifası: küçük tutam Undead'den bağlı dosta (250 ms).
- Test: Wail of the Dead atılır (önce can bedeli öder, sonra çaldığı canla iyileşir); yakalama yalnız tutam sheet'ini izler.
- Pasif efekt arka planda oynar, hiçbir vuruşu beklemez (eskisiyle aynı).
Aynalama: Phaser flipX karenin içinde aynalar; asimetrik dayanakta aynalı tarafta origin x = 1 - ox (`sheetAt`).
Yakalama: `node tools/anim-capture.mjs vampiric_bite` (atan sağda, düşman tarafı; kukla solda).

## Tur 2 · Claude · düzeltme · 2026-10-29
- Boş yakalamanın nedeni (229 kare, 0 sprite): tutam ÇIKIYORDU; araç sprite'ları `key.includes('/vampiric_bite')` ile süzüyordu, sheet anahtarı
  `vfxsheet:undead/08-vampiric-bite-wisp` (tire + numara) eşleşmiyordu. Araç artık sınıf sheet'lerinde tireyi alt çizgiye çevirip eşler
  (tools/anim-capture.mjs, başka bir oturumda düzeltildi); sonraki yakalamada 36 karenin 24'ünde tutam görünüyor.
- Yakın planda görülen asıl sorun: tutam (derinlik +36) Wail çığlık hayaletinin (03, +40) ALTINDA kalıyor, Undead'e varırken tamamen örtülüyordu;
  ayrıca 110 px'te küçük kırmızı bir leke gibi okunuyordu. Düzeltme (`src/game/art-v2/undead/vfx.ts`): `wispFly` varsayılan derinliği +46
  (çığlığın ve Bone Throw patlamasının +44 üstünde), `vampiricEcho` tutam boyu 180, varış parlaması +45 (önceden +20, çığlığın altındaydı).

## Tur 2 · Codex · kontrol · 2026-10-29
Yeni yakalamada tutam Wail çığlığının üstünde belirgin biçimde okunuyor. Kızıl parlak başı sağdaki Undead'e, kuyruğu geriye/sola bakıyor; uçuş kavisi göğüs hizasında bitiyor ve göğüsteki kızıl parıltı varışı destekliyor. Verilen r1 ve sheet-r2 karelerinde siyah çerçeve veya kesik görünmüyor. Karar: tamam.
