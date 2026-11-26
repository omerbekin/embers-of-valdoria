// Harita sonu kartı "Endless" düğmesi (Ömer 2026-11-23, form n_endcard): yalnız sefer finalinde; sefer kaydı kalır.
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DROWNED_REACH, HOLLOW_CROWN, CONFIG, continueToMap, debugFinishMap2, debugFinishMap3, endCardOffersEndless, memoryKV, newCampaign, nextMapFor, nextStep, readSaves, setMapOverride, writeSave } from '../src/campaign';

afterEach(() => {
  setMapOverride(DROWNED_REACH, null);
  setMapOverride(HOLLOW_CROWN, null);
});

describe('end card Endless button', () => {
  it('yalnız son haritanın finalinde (sıradaki harita yok); ara harita kartlarında yok', () => {
    setMapOverride(DROWNED_REACH, true);
    setMapOverride(HOLLOW_CROWN, true);
    const m2 = debugFinishMap2(newCampaign({ mode: 'normal', seed: 77, slot: 1 }));
    expect(nextStep(m2).kind).toBe('complete');
    expect(endCardOffersEndless(m2, nextMapFor(m2))).toBe(false); // Harita 2 sonu: Continue to Hollow Crown
    const end = debugFinishMap3(continueToMap(m2, HOLLOW_CROWN), 'mend');
    expect(nextStep(end).kind).toBe('complete');
    expect(endCardOffersEndless(end, nextMapFor(end))).toBe(true);
    expect(CONFIG.maps.at(-1)).toBe(HOLLOW_CROWN);
    // bitmiş sefer kaydı Endless'a gidince de durur (düğme yalnız checkpoint + sahne geçişi)
    const kv = memoryKV();
    writeSave(kv, end, 'auto');
    expect(readSaves(kv).file.slots[1]!.saves.at(-1)!.state.mapId).toBe(HOLLOW_CROWN);
  });

  it('düğme sahnede kapılı ve Endless ana menüdekiyle aynı sahneyi açar (kilit yok)', () => {
    expect(readFileSync('src/game/lazy-scenes.ts', 'utf8')).toContain('EndlessScene: () => import');
    const src = readFileSync('src/game/scenes/CampaignMapScene.ts', 'utf8');
    expect(src).toMatch(/endCardOffersEndless\(s, null\) \? \[\{ label: 'Endless', run: \(\) => \{ checkpoint\(\); elGo\(this, 'EndlessScene', undefined, \{ loading: true \}\); \} \}\]/);
    const menu = readFileSync('src/game/scenes/MainMenuScene.ts', 'utf8');
    expect(menu).toContain("const ENDLESS_SCENE: LazySceneKey = 'EndlessScene'");
    expect(menu).not.toMatch(/endless[^\n]*(locked|unlock)/i);
  });

  it('üç düğme sığar: şerit sarar ve dar telefonda aralık küçülür', () => {
    const css = readFileSync('src/ui/map-end.css', 'utf8');
    expect(css).toMatch(/\.me-acts \{[^}]*flex-wrap: wrap/);
    expect(css).toMatch(/html\.short \.me-acts/);
  });
});
