# Alan: gönderim kuyruğu ve yayın (`tools/push-queue.mjs`)

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
