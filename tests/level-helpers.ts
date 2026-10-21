// Test yardımcısı (Item Güçlendirme x6, 2026-10-17): item seviye şartı (ilvl - 3) testin konusu değilse kahramanlar yüksek seviyeye alınır.
// Level sistemi gelene kadar oyunda herkes L1'dir; bu yardımcı yalnızca eski item testlerinin (ilvl 5+ item takan) niyetini korur.
import type { EndlessRun } from '../src/endless';
import type { CampaignState } from '../src/campaign';
import { LEVELS } from '../src/progression/levels';

export const TEST_LEVEL = 50;

/** Level'ın skill puanı (Faz 1b değişmez kuralı: harcanmamış + ağaçta harcanan = (level - 1) x skillPointsPerLevel; kayıt okuması bunu onarır). */
const skillPointsOf = (level: number): number => (Math.max(1, Math.floor(level)) - 1) * LEVELS.skillPointsPerLevel;

/** Endless koşusunun kahramanları TEST_LEVEL seviyesinde. */
export const leveledRun = <T extends Pick<EndlessRun, 'heroes'>>(run: T, level = TEST_LEVEL): T => ({ ...run, heroes: run.heroes.map((h) => ({ ...h, level, skillPoints: skillPointsOf(level) })) });

/** Sefer kadrosu TEST_LEVEL seviyesinde. */
export const leveledCampaign = <T extends Pick<CampaignState, 'roster'>>(s: T, level = TEST_LEVEL): T => ({ ...s, roster: s.roster.map((h) => ({ ...h, level, skillPoints: skillPointsOf(level) })) });
