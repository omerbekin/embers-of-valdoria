# Tek sohbet düzeni (Ömer 2026-11-02)

Ömer > **Lead** (tek sohbet; eski adı Koordinatör) > agentlar. Alt sohbetler kapanır. Amaç: token en düşükte.

## Lead'in kuralları
- İnce kalır: iş yapmaz, büyük dosya/log okumaz. Dağıtır, birleştirir, gönderir, Ömer'e konuşur.
- Bağlam ~150k'ya gelince özetlenir (`/compact`); durum dosyada tutulur (`docs/arch/coordinator.md` tahtası, `docs/arch/areas/<alan>.md`).
- Aynı anda en çok 3-4 agent. Bir dosyaya tek yazar. Ortak dosyalar (golden, `catalog.ts`, `content.ts`, `patch-notes.json`, `open-questions.md`) tek agentta toplanır ya da sırayla verilir.
- Birleştirme sırayla, tek noktadan; golden bir kez üretilir.

## Agent brief (4 satır)
1. Amaç. 2. Dokunacağı dosyalar (ve dokunmayacakları). 3. Bitti ölçütü. 4. Dönüş: en çok 10 satır; büyük çıktı (sim, log) dosyaya, yalnız yol.
Agent kendi çalışma ağacında çalışır (`CLAUDE.md` > Worktree modu), alan dosyasını (`docs/arch/areas/<alan>.md`) okuyarak başlar. Model rolünün tanımındadır; kritik iş `model: opus`.

## Gönderim
Kuyruk aynı (`tools/push-queue.mjs`). Lead agent işlerini kendi dalında toplar, `ready` verir, `push` ile gönderir. Sohbet başına çalışma ağacı/sahip listesi bitince gereksiz.

## Geçiş adımları
1. Her sohbet: işini bitirir, son `ready`'sini verir, `docs/arch/areas/<alan>.md` yazar (en çok 40 satır: alanın kuralları, açık işler, tuzaklar, dosya yolları, "agent buradan başlar"), Lead'e tek mesajla bildirir, durur.
2. Lead hepsini tek son gönderimle çıkarır; canlı + Pages doğrulanır.
3. Lead `CLAUDE.md`, hafıza ve `chat-owners.md`'yi tek-sohbet düzenine göre günceller; sohbetler arşivlenir (Ömer onayıyla).
