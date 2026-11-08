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
- **Ölçen iş, ölçtüğü kodu değiştiren işle aynı anda koşmaz (Ömer 2026-11-08).** Motor/YZ/veri değiştiren agent (ör. skill ağacı YZ değeri) bitmeden denge sim'i başlatılmaz; aynı anda başlarsa sim boşa gider, tekrar ölçülür. Sıra: önce değiştiren iş biter, sonra ölçüm. Brief'te "bu iş YZ/motora dokunur mu" yazılır; dokunuyorsa sim ondan sonra sıraya girer.
- Durum dosyada tutulur: açık işler hafızadaki Lead devir kaydı, alan bilgisi `docs/arch/areas/<alan>.md`. Sohbet kısalsa da iş sürer.

## Agent brief (4 satır)
1. Amaç. 2. Dokunacağı dosyalar (ve dokunmayacakları). 3. Bitti ölçütü. 4. Dönüş: en çok 10 satır; büyük çıktı (sim, log) dosyaya, yalnız yol.
Agent kendi çalışma ağacında çalışır (`CLAUDE.md` > Worktree modu), alan dosyasını okuyarak başlar. Model rolünün tanımındadır; kritik iş `model: opus`.
5. Ağır komutlar (vitest, sim, anim-capture, codex) `node tools/agent-tag.mjs <agent> -- <komut>` ile çalıştırılır; yük izleyici (port 5199) CPU/RAM'i agent adına yazar.
6. **Süre ve kapsam (Ömer 2026-11-08, Druid VFX 3+ saat dersi):** düzeltme işi "tümünü denetle" diye verilmez; bozuk olan tek tek yazılır (hangi skill, ne yanlış). Brief'e süre sınırı yazılır (çoğu iş 1 saat). Lead, agent'ı ~30 dakikada bir kontrol eder; süre dolunca agent kapatılır, kalan iş kısa brief'le TAZE küçük agent'a verilir. Uzun yaşayan agent bağlamı şiştikçe yavaşlar (Skald art: eski agent 4+ saat takıldı, taze agent kalanı 25 dakikada bitirdi).

## Gönderim
Kuyruk aynı (`tools/push-queue.mjs`, `docs/arch/areas/push-queue.md`). Lead agent işlerini kendi dalında toplar, `ready` verir, `push` ile gönderir. Kuyruk komutları oturum kimliğiyle çalışır, sahibi kapanmış dal için de `ready <eski-oturum>` verilir.

## Yeni Lead açılışı
Ömer sohbeti değiştirince yeni sohbet, kuyruk raporları ona gelsin diye bir kez çalıştırır (oturum kimliği her istemdeki kuyruk satırında yazar):
`node <game>/tools/push-queue.mjs coordinator <oturum>`
Araç bu role hâlâ "Koordinatör" der; aynı şeydir.

## Not düzeni (Ömer 2026-11-08)
- Ömer'in "unutma / not al" dediği her karar o konunun sahibi belgeye yazılır (sahiplik `docs-map.md`): alan durumu `areas/<alan>.md`, oyun kuralı `docs/design/`, çalışma kuralı bu dosya veya `workflow-rules.md`.
- Katmanlar: kök `CLAUDE.md` = her sohbette gereken çekirdek; klasör `CLAUDE.md`'leri (`src/engine`, `src/game`, `src/ui`, `data`) = o klasörde çalışınca; alan belgesi = canlı durum + kararlar; `docs/design` = oyunun kuralları; Lead hafızası = yalnız Ömer'le çalışma biçimi + açık iş listesi (`lead-handoff`).
- Bir bilgi tek yerde; başka yerde bağlantı. Eskiyen belge `docs/archive/`e taşınır (Lead hafıza arşivi depoya DEĞİL `memory/archive/`e), silinmez; yeni belge `docs-map.md`'ye yazılır.
- Agent brief'i alan belgesini okutur; agent bitince o belgenin "Durum" ve "Açık işler" bölümünü günceller. Lead raporu okuyunca alan belgesinde iz var mı bakar.

## Alanlar (eski chat-owners.md)
Ömer 2026-11-02: alt sohbetler kapandı, tek sohbet Lead (`docs/arch/lead.md`). İş alana göre agente verilir; agent `docs/arch/areas/<dosya>` okuyarak başlar. Eski sohbet adları hafızada ve belgelerde geçerse bu alanları kastediyor.

| Alan (eski sohbet) | Dosya | Kapsam |
|---|---|---|
| Character Design | character-design.md | karakter tasarımı, tek karakterin yetenek ağacı ve sayıları |
| Campaign | campaign.md | sefer, Map 3, kasabalar |
| Character vfx | character-vfx.md | karakter efektleri |
| Item Design | item-design.md | yeni itemler, item türleri, item dengesi ve reworkleri, affixler |
| Minor Fixes | minor-fixes.md | küçük ve sahipsiz işler |
| Combat Design | combat-design.md | genel savaş kuralları: etkiler, durumlar, buff ve debufflar, turlar, genel denge, savaşla ilgili mekanikler |
| UI-UX Design | ui-ux.md | mevcut arayüzlerin elden geçirilmesi, yeni arayüz tasarımı, kullanıcı deneyimi |
| Gönderim | push-queue.md | gönderim kuyruğu ve yayın |

Koordinatör düzeni 2026-11-02'de kalktı, yerini tek sohbet Lead aldı (eski `coordinator.md` yalnız bu yönlendirmeydi). Kuyruk aracının "Koordinatör" dediği rol Lead'dir.
