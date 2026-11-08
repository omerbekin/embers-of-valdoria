# Alan: gönderim kuyruğu ve yayın (`tools/push-queue.mjs`)
> **Ne için / Güncel mi (2026-11-08):** gönderim kuyruğu aracı (tools/push-queue.mjs) alanı. evet; araç var.


Agent buradan başlar: `docs/arch/sims-and-deploy.md` + bu dosya; aracı baştan okuma, komutu çalıştırıp `status` bak.

## Komutlar
`status`, `ready <oturum> --fixes "..."|--internal`, `push <oturum> --bg` (hazır hepsini gönderir), `seal <oturum> <commit> ...` (dalı o commit'e mühürler, çalışma ağacındaki sonrası gitmez), `retry` (durmuş gönderimi yeniden), `hold on|off` (otomatik gönderimi kalıcı kapatır/açar; kapalıyken yalnız elle push), `notes`, `legacy-merged`, `add`, `drop`.
Gönderim ~25-35 dk (temiz kopyada tam test+build); bitince 5000, Pages, canlı (`npm run deploy:cf`), sonra 300 savaşlık sim `.git/push-queue-sims/<sürüm>.txt`.

## Kurallar
- Sürüm notu: tek iş tek satır, en çok 140 karakter, 8 satır; fazlasını kuyruk kendisi ayıklar, gönderim durmaz. Tam metin commit gövdesinde ve `.git/push-queue-notes/<sürüm>.json`.
- Yalnız docs/araç ise `--internal` (not girmez). Mockup-only commit sürüm almaz.
- Golden: birden çok dal birleşince ya da çakışınca kuyruk yeniden üretir (`tests/golden/record.ts`).
- Kırmızıda gönderim durur ve haber verir; süre aşımı kırmızıları yük kaynaklı olabilir (dev sunucuları, paralel sim), kapatma kararı sahibinin.
- Canlı yayın: 4 deneme, aralar 20/60/120 sn; hâlâ olmazsa canlı bu derlemeyi sunuyorsa başarılı sayılır; olmazsa temiz kopyadan elle `npm run deploy:cf`.
- Mockup-only GitHub test atlama: `deploy.yml` > `scope` işi (Ömer onayladı 2026-11-02); deneme bekliyor, kural sonuç iyi olursa dokümana yazılacak.

## Tuzaklar
- `ready` `assets/source/` klasörlerini eklemez: `assets/source/<sahip>-vfx` git'te yoksa wiki-assets 30 dk sonra kırmızı (druid-vfx, vesper-vfx). `ready` artık uyarır; çözüm `git add` + commit + yeniden ready.
- Worktree kopyası silinmeden önce `node_modules` bağlantısı (junction) silinir, yoksa asıl `node_modules` gider.
- GitHub Actions: `cancel-in-progress`; yeni push eskisinin Pages koşusunu keser, Pages son YEŞİL koşuda kalır. Mockup URL'si Pages'te `.html` ile, canlıda uzantısız.
- Pages'e `gh` yok; PowerShell `Invoke-RestMethod` ile api.github.com (iş günlüğü yetki ister, check-run notları açık).
- Bekleyici betikler log'u baştan okursa eski "durdu" satırına takılır; başlangıç satır sayısını al.
- Ağ/DNS bazen kopar (github.com, wrangler); kuyruk yeniden dener, elle müdahale gerekirse önce `status`.

## Kararlar (hafızadan taşındı 2026-11-08)
Tam metinler `~/.claude/projects/C--Users-Omer-Projects-embers-of-valdoria/memory/archive/2026-11-08/` (push-queue, push-workflow-v2, coordinator-setup). Ömer'in kelimeleri ve gönderim zamanı Lead hafızasında `shipping`.
- **Modlar (2026-10-24):** sohbetin ilk mesajındaki etiketle (`mode <id> <mod>`): [kritik] bitince "GitHub'a gönderiyorum" deyip onaysız `push`; [eşlik] varsayılan, yalnız `ready`; [gün sonu] artık eşlik (03:00 görevi 2026-11-01'de silindi; `eod` yalnız elle "hepsini gönder"). Bekleme ilk `ready`den 3 saat; sonraki ready'ler ve erken gönderim hazır olan her şeyi alır. Otomatik gönderim `hold on` ile kapalı (kalıcı `autoHold`, açmak `hold off`).
- **Mekanik:** UserPromptSubmit kancası oturum kimliği + mod + tek seferlik RAPOR bildirimlerini ekler (Ömer'e ilk iş ilet); Edit/Write ve Bash git-status kancaları değişen game/ dosyalarını oturuma yazar (`game/.git/push-queue.json`; kancalar dış `.claude/settings.local.json`; başka oturumun dosyası alınmaz). `add <id> <dosyalar>` yalnız artıklar için. Ömer "kuyruk" yazarsa durum tablosu gelir. Dosyasız / ready olmayan / 2 gün sessiz kayıt düşer. Log `game/.git/push-queue.log`, `.git/push-queue.out.log`.
- **Akış:** `push`/`eod` kendini ayırır; sıra tsc → `vitest related` ön kontrol (en çok 2 dk, sonra tam test devralır) → tam test + build → 5000 → push → canlı → pages-check (TAM sha ister; kısa sha yanlış "25 dakikada sonuçlanmadı" verir). `doctor`: eski index.lock (10 dk+), artık eov-push-* kopyaları (önce junction), tmp_obj, yalnız klasörü artık olmayan öksüz süreçler. Kırmızı rapor düşen dosyayı + sahibini yazar. Ölü sahibin kilidi hemen alınır, ağ hatasında yeniden test etmeden tekrar dener.
- **Worktree modu (faz 2, canlı 2026-10-31, commit 33e44d70):** `wt-open <id> <ad>` → `.claude/worktrees/chat-<ad>`, dal `chat/<ad>`, kendi `npm ci`, port 5174+, launch.json girdisi; ana `game/` yazmaya kapalı (hook-edit-pre). Kuyruk dalları taze origin/main üstünde squash eder; Q-NEW numaraları gönderimde verilir; `legacy-merged`, `wt-close`. İlk gerçek dal gönderimi 0.9.10.5 (93dd306) tamam; çakışan dal düşer (0.9.10.6'da vesper-tree, mob-mana). Uzun ömürlü alan dalı her gönderimden sonra yeni main'e taşınır. Masaüstü uygulamasının kendi worktree seçeneği kullanılmaz; agent `isolation:"worktree"` dış boş repoda çalışmaz, worktree'yi komutla aç.
- **Seçimler 2026-10-30** (form 6yh5t8u2vprgE52qH5dywE): A (kod yazan her sohbet kendi worktree'si), N1, G1, V1 (5173 = ana kopya = son gönderilen), P1; onarımlar F1-F5, F7, F8; F6 (elle push'u engelle) SEÇİLMEDİ.
- **Sürüm notu (Ömer 2026-11-01 "sürüm notu işine kalıcı bir çözüm"):** sınır gönderimi durdurmaz; kuyruk yalnız seçer, cümle yeniden yazmaz/kesmez (bilerek AI özeti yok).
- **Devir (2026-11-01, Ömer "eğer her chat birbirinin işine dokunan bir şey yapıyorsa oraya teslim etsin"):** başka alanın dosyasına dokunan iş o sahibe verilir; başkasının yarım işi gönderimi engellerse ona sor, Ömer'e söyle, parçasını kendin ayırma. Gönderim sonrası 300 savaş simi sormadan koşar, gönderimi engellemez, ±2 puan gürültü (denge=oto).
- Bilinen zayıflık: `ready`den sonraki commit'ler de gider (gönderim başındaki dal ucu); `seal` bunu çözer.
