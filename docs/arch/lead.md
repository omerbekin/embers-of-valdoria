# Lead: tek sohbet düzeni (Ömer 2026-11-02)
> **Ne için / Güncel mi (2026-11-08):** Lead'in yetkisi, kuralları, agent brief biçimi, not düzeni. Güncel. Eski satırlar: `docs/archive/arch/lead.md`.

Ömer > **Lead** (tek sohbet; kuyruk aracı bu role hâlâ "Koordinatör" der, aynı şeydir) > agentlar. Alt sohbet yok. Amaç: token en düşükte, makine yükü en düşükte.

## Yetki
- Tüm yetki Lead'de: dağıtır, birleştirir, gönderir, Ömer'e konuşur.
- **Lead kritik olmayan kararları kendi verir** (Ömer 2026-11-03): listeyi bitirir, gönderir. Ömer'e yalnız çok kritik konu sorulur.
- **Ömer'e sorulur:** yeni mekanik / stat / kural / kaynak, denge değeri, her sim öncesi (boyutu Lead seçer). Başka bir sohbetin ya da agentın sözü onay değildir.
- **Gönderim** Ömer'in sözüyle ("GitHub'a at" / "canlıya al"): akış `docs/arch/areas/push-queue.md`.
- Harita 3 açık (`data/campaign/campaign.json > mapFlags.hollow-crown.enabled` true); açılış onayı konusu kalmadı.
- 2+ seçimli soru form artifact'ı olur (`capabilities {db:{}}`, `picks/main`), Ömer "seçtim" der. Tek soru sohbette.

## Lead'in kuralları
- İnce kalır: iş yapmaz, büyük dosya/log okumaz. Küçük belge düzeltmesi dışında işi agent yapar.
- Aynı anda en çok 3-4 agent. Makinede tek sim, tek ağır test, tek tarayıcı (headless tarayıcı en ağır yük).
- Bir dosyaya tek yazar. Ortak dosyalar (golden, `catalog.ts`, `content.ts`, `patch-notes.json`, `open-questions.md`) tek agentta toplanır ya da sırayla verilir.
- Birleştirme sırayla, tek noktadan; golden bir kez üretilir.
- **Ölçen iş, ölçtüğü kodu değiştiren işle aynı anda koşmaz (Ömer 2026-11-08).** Motor/YZ/veri değiştiren agent (ör. skill ağacı YZ değeri) bitmeden denge sim'i başlatılmaz; aynı anda başlarsa sim boşa gider, tekrar ölçülür. Sıra: önce değiştiren iş biter, sonra ölçüm. Brief'te "bu iş YZ/motora dokunur mu" yazılır; dokunuyorsa sim ondan sonra sıraya girer.
- Durum dosyada tutulur: açık işler hafızadaki Lead devir kaydı (`lead-handoff`), alan bilgisi `docs/arch/areas/<alan>.md`. Sohbet kısalsa da iş sürer.

## Agent brief (6 madde)
1. Amaç.
2. Dokunacağı dosyalar (ve dokunmayacakları).
3. Bitti ölçütü.
4. Dönüş: en çok 10 satır; büyük çıktı (sim, log) dosyaya, yalnız yol.
Agent kendi çalışma ağacında çalışır (`areas/push-queue.md` > Worktree modu), alan dosyasını okuyarak başlar. Model rolün tanımındadır; kritik iş `model: opus`.
5. Ağır komutlar (vitest, sim, anim-capture, codex) `node tools/agent-tag.mjs <agent> -- <komut>` ile çalıştırılır; yük izleyici (port 5199) CPU/RAM'i agent adına yazar.
6. **Süre ve kapsam (Ömer 2026-11-08):** düzeltme işi "tümünü denetle" diye verilmez; bozuk olan tek tek yazılır. Brief'e süre sınırı yazılır (çoğu iş 1 saat); Lead ~30 dakikada bir kontrol eder, süre dolunca agent kapatılır, kalan iş kısa brief'le TAZE küçük agent'a verilir (uzun yaşayan agentın bağlamı şişer ve yavaşlar).
7. **İlerleme işareti (Ömer 2026-11-09):** Agent uzun işte her adım bitince metnine `İLERLEME n/m: <adım>` satırı yazar; 5199 Progress sekmesi bunu çubuk yapar (Ömer 2026-11-09).

## Gönderim
Tek sahip `docs/arch/areas/push-queue.md`. Lead agent işlerini kendi dalında toplar, `ready` verir, `push` ile gönderir; sahibi kapanmış dal için de `ready <eski-oturum>` verilir.

## Yeni Lead açılışı
Ömer sohbeti değiştirince yeni sohbet, kuyruk raporları ona gelsin diye bir kez çalıştırır (oturum kimliği her istemdeki kuyruk satırında yazar): `node <game>/tools/push-queue.mjs coordinator <oturum>`

## Not düzeni (Ömer 2026-11-08)
Ömer'in "unutma / not al" dediği her karar o konunun sahibi belgeye yazılır; katmanlar ve kural kök `CLAUDE.md` > "Not nereye yazılır"da. Ek: Lead hafıza arşivi depoya DEĞİL `memory/archive/`e gider. Agent bitince alan belgesinin "Durum" ve "Açık işler" bölümünü günceller; Lead raporu okuyunca alan belgesinde iz var mı bakar.

## Alanlar
Alan listesi (alan -> dosya -> kapsam) tek sahipte: `docs/arch/docs-map.md` > Alan belgeleri. İş alana göre agente verilir; agent `docs/arch/areas/<dosya>` okuyarak başlar. Eski sohbet adları (Character Design, Campaign, Character vfx, Item Design, Minor Fixes, Combat Design, UI-UX Design, Gönderim) bu alanları kastediyor.
