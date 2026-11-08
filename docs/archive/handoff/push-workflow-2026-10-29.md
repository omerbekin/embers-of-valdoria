# Handoff: GitHub gönderim akışı → worktree'de çalışıp merge (2026-10-29)

Ömer: "bu githuba atma sorunları artmaya başladı. ayrı bir worktreede çalışıp sonradan mergelemek belki daha faydalı
olabilir artık. proje büyüyor." Bu konu yeni bir sohbette konuşulacak; bu belge o sohbetin başlangıcı.
Henüz HİÇBİR karar yok; önce seçenekler Ömer'e sunulacak, seçmeden uygulanmayacak.

## Şu anki düzen (özet)
- Bütün sohbetler aynı checkout'ta çalışıyor: `C:\Users\Omer\Projects\embers-of-valdoria\game` (branch master/main,
  dış klasör `embers-of-valdoria` boş bir dış repo). Tek geliştirme sunucusu 5173; yayın kopyası 5000 (play-build).
- Gönderim kuyruğu `tools/push-queue.mjs` (bellek: push-queue). Her sohbetin modu var: kritik (kendi gönderir),
  eşlik (`ready`, bir sonraki gönderime biner), gün sonu (03:00 görevi). Hook'lar her sohbetin değiştirdiği dosyaları
  `.git/push-queue.json`'a yazar. Gönderim: geçici index ile yalnız kuyruktaki dosyalardan commit → geçici temiz
  worktree'de TAM `npm test` + build → push sha:main → yerel main ileri alınır → 5000 yeniden derlenir → Pages izlenir.
- İlgili bellek kuralları: release-worktree-junction (worktree silmeden önce node_modules junction'ı sil, yoksa
  game/node_modules boşalır), no-side-sessions (ayrı oturum açma; 2026-10-18'de yan oturum node_modules'u sildi),
  push-queue (başka sohbetin yarım işi gönderimi engellerse o sohbete kontrol ettir), deploy-keywords, versioning.

## Son günlerde yaşanan sorunlar (somut)
1. **Kalmış git kilidi:** 2026-10-29 03:52'de bir git işlemi çöktü, boş `.git/index.lock` kaldı. 06:08'deki 0.9.10.2
   gönderimi gerçek index'i güncelleyemedi (push-queue.mjs ~444 `git reset -- <yollar>`); index 0.9.10.1'de takılı
   kaldı, sonradan eklenen 63 dosya (`/vfx` skill'i, 55 anim-review notu, push-pick.ts, testler) "silinmiş" görünüyordu.
   22:59'da elle düzeltildi (19 saatlik boş kilit silindi, `git reset`). Kuyruk kilit hatasını fark etmedi/raporlamadı.
2. **Başka sohbetin yarım işi ortak dosyada:** `tests/fixtures/golden/items.json` 839e43ba (kritik, yarım) sohbetine
   bağlı; aynı dosyaya dokunan herkesin gönderimi onun durumuna bağlanıyor. Daha önce test:fast'te diğer sohbetlerin
   yarım işinden (Mage reworkü vb.) 13 kırmızı test vardı.
3. **Tek 5173 + ortak çalışma alanı yükü:** Diğer sohbetler sürekli dosya değiştirdiği için 5173 ~20 sn'de bir tam
   yenileniyor; Playwright yakalamaları (`tools/anim-capture.mjs`) yarıda "Execution context was destroyed" ile
   bölünüyor. Geçici HMR'siz sunucu (5187) açıldı ama paralel agent'larla işlemci %100'e çıktı; tek yakalama ~50 dk,
   `page.goto` 120 sn zaman aşımı. Asıl yük 5173'ün sürekli yeniden derlemesi.
4. **Yetim süreçler:** durdurulan agent'ların test çalıştırmaları / geçici sunucuları açık kalıyor, işlemci yiyor.
   Bazı sohbetlerde süreç kapatma izni otomatik modda reddediliyor.
5. **Gönderim süresi:** her kritik gönderim tam test + build ile ~8+ dk; eşlikler birbirinin kırmızısına takılıyor.

## Konuşulacak seçenekler (taslak, Ömer seçecek)
- **A. Sohbet başına worktree + branch:** her sohbet `game/.claude/worktrees/<oturum>` (ya da dışarıda) kendi
  branch'inde çalışır; iş bitince main'e rebase/merge + test → push. Artı: yarım iş başkasını bozmaz, index/kilit
  paylaşılmaz. Eksi: node_modules (junction riski → her worktree'ye ayrı `npm ci` ya da pnpm/hardlink), her
  worktree'nin kendi dev sunucusu/portu, Ömer 5173'te neyi göreceği (hangi branch?), birleşme çakışmaları
  (data/*.json, board.md gibi sık ortak dosyalar), sürüm numarası ve patch-notes çakışması.
- **B. Konu başına uzun ömürlü branch + entegrasyon:** büyük işler (Map 3, Mage reworkü, Undead VFX) kendi
  branch/worktree'sinde; küçük düzeltmeler ana checkout'ta kalır. Kuyruk sadece main'e merge edilenleri gönderir.
- **C. Mevcut düzeni sağlamlaştır:** kuyruk index.lock/yarım reset'i yakalayıp raporlasın, yetim süreç temizliği,
  5173'ü HMR'siz/yalnız istekle yenilenen yapma, ortak "yarım iş" dosyalarını önceden işaretleme.
- Ortak sorular: Ömer'in 5173'te test ettiği kopya hangisi olacak (main mı, entegrasyon branch'i mi)?
  Worktree'ler nerede durur (`.claude/worktrees` kuyruktan zaten hariç)? Mevcut push-queue mantığı (modlar,
  03:00 görevi, sürüm atlama, Pages kontrolü) nasıl korunur? no-side-sessions kuralıyla ilişkisi
  (worktree ≠ yan oturum, ama node_modules dersi geçerli).

## Şu an açık olan / dikkat
- Bu handoff'u yazan sohbet (c07f3953, "Detailed Animation w/ Codex", mod eşlik) Undead VFX setini kuruyor:
  6 efektten 4'ü `tamam` (bone_throw, vampiric_bite, skeleton_slash, wail_of_the_dead), dark_bond ve raise_dead
  agent'ları hâlâ çalışıyor. Geçici yakalama sunucusu 5187 hâlâ açık (o sohbet iş bitince kapatacak).
- Kuyrukta o sohbetin ~48 dosyası `hazır`.
- Bu konu konuşulurken çalışan diğer sohbetlerin işi yarıda bırakılmamalı; geçiş planı aşamalı olmalı.

## Bakılacak dosyalar
`tools/push-queue.mjs` (özellikle ~391-475 gönderim ve worktree temizliği), `.claude/settings.local.json` (dış
klasörde, hook'lar), `game/.git/push-queue.log`, `vite.config.ts`, `tools/anim-capture.mjs` (`--url` seçeneği),
bellek: push-queue.md, release-worktree-junction.md, no-side-sessions.md, deploy-keywords.md, versioning.md.
