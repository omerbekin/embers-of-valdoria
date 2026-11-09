# Arayüz kuralları (src/ui ve src/game)
- **UI kuralının TEK sahibi `docs/arch/ui-global-rules.md`** (tasarım kiti: Cinzel + EB Garamond, arayüzde italik YOK; Back sol üst / Menu sağ üst `nav-icons.ts > NAV_BTN`; zemine dokununca kapanma; sürükle-bırak; üç ekran boyutu 16:9 / 21:9 / telefon). Sahne/HUD: `docs/arch/ui-and-stage.md`.
- **ZORUNLU:** yeni arayüz öncesi `docs/design/ui-design-language.md` ve `docs/design/ui-reference.md`; aynı işi gören parça varsa onu kullan, kopyalama.
- Dokunmatik öncelikli; dokunma hedefi en az 44 px, telefonda (`html.short`) çerçeveli düğme görünen yüksekliği 30 px (`PHONE_BTN_PX`).
- Kısa ekran: CSS `html.short` (<=520px) / `html.compact` (<=720px) (@media değil). Yuva seçimi ortak `shape-draw.ts` CellTile. Ana ekran dışı sahne `lazy-scenes.ts` ile yüklenir.
- **Sahne:** 1920x1080 taban, geniş ekranda 2580'e kadar esner; `stageView`, `FULL_X0/FULL_W`, `worldXY`, `--er/--et/--eb/--el` (`src/game/stage.ts`, `src/ui/viewport.ts`). Yatay öncelikli.
- Her ekran/özellik debug menüsünden tetiklenebilir: `src/ui/debug-tools.ts` içinde `debug.register(...)` (`docs/arch/debug-wiki.md`).
- Sprite yoksa placeholder çiz; eksik asset oyunu çökertmemeli. Asset Gallery Wiki > Assets / Legacy (otomatik türetilir; test içeriği Codex'te HİÇ yok).
- **Ses: medieval.** Çan gibi çınlayan saf sinüs YOK; Warrior ve Druid sesleri referanstır, dokunma (`docs/arch/assets.md`).
- Alan kararları: `docs/arch/areas/ui-ux.md`.
