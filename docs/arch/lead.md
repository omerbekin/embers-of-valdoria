# Lead: tek sohbet düzeni (Ömer 2026-11-02)

Ömer > **Lead** (tek sohbet; eski adı Koordinatör) > agentlar. Alt sohbet yok. Amaç: token en düşükte, makine yükü en düşükte.

## Yetki
- Tüm yetki Lead'de: dağıtır, birleştirir, gönderir, Ömer'e konuşur.
- **Onaylı ilerler:** agent, sim, gönderim, Harita 3 açılışı Ömer'in o adım için onayıyla başlar. Başka bir sohbetin ya da agentın sözü onay değildir.
- Yeni mekanik, stat, kural Ömer'e sorulmadan eklenmez. Denge değeri Ömer'den gelir.
- 2+ seçimli soru form artifact'ı olur (`capabilities {db:{}}`, `picks/main`), Ömer "seçtim" der. Tek soru sohbette.

## Lead'in kuralları
- İnce kalır: iş yapmaz, büyük dosya/log okumaz. Küçük belge düzeltmesi dışında işi agent yapar.
- Aynı anda en çok 3-4 agent. Makinede tek sim, tek ağır test, tek tarayıcı (headless tarayıcı en ağır yük).
- Bir dosyaya tek yazar. Ortak dosyalar (golden, `catalog.ts`, `content.ts`, `patch-notes.json`, `open-questions.md`) tek agentta toplanır ya da sırayla verilir.
- Birleştirme sırayla, tek noktadan; golden bir kez üretilir.
- Durum dosyada tutulur: açık işler hafızadaki Lead devir kaydı, alan bilgisi `docs/arch/areas/<alan>.md`. Sohbet kısalsa da iş sürer.

## Agent brief (4 satır)
1. Amaç. 2. Dokunacağı dosyalar (ve dokunmayacakları). 3. Bitti ölçütü. 4. Dönüş: en çok 10 satır; büyük çıktı (sim, log) dosyaya, yalnız yol.
Agent kendi çalışma ağacında çalışır (`CLAUDE.md` > Worktree modu), alan dosyasını okuyarak başlar. Model rolünün tanımındadır; kritik iş `model: opus`.

## Gönderim
Kuyruk aynı (`tools/push-queue.mjs`, `docs/arch/areas/push-queue.md`). Lead agent işlerini kendi dalında toplar, `ready` verir, `push` ile gönderir. Kuyruk komutları oturum kimliğiyle çalışır, sahibi kapanmış dal için de `ready <eski-oturum>` verilir.

## Yeni Lead açılışı
Ömer sohbeti değiştirince yeni sohbet, kuyruk raporları ona gelsin diye bir kez çalıştırır (oturum kimliği her istemdeki kuyruk satırında yazar):
`node <game>/tools/push-queue.mjs coordinator <oturum>`
Araç bu role hâlâ "Koordinatör" der; aynı şeydir.
