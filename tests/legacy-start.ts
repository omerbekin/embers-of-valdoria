// Test yardımcısı: eski yapıdaki sefer (kayıtta `soloStart` yok; tutorial kahramanı, Mill Road katılımı, Ashford vedası). Yeni seferler data'daki yapıyı görür.
import { newCampaign, pickHero, type CampaignState } from '../src/campaign';

/** Kahraman seçilmemiş eski kayıt (debugTeleport bununla eski yapıda yürür). */
export function legacyBlank(o: Parameters<typeof newCampaign>[0]): CampaignState {
  const s = newCampaign(o);
  delete s.soloStart;
  return s;
}

/** Tutorial kahramanıyla başlamış eski kayıt (Warrior; Archer kayıtta kalır ama artık seçilemez). */
export function legacyHero(seed = 7, hero = 'warrior'): CampaignState {
  const s = pickHero(newCampaign({ mode: 'normal', seed }), 'warrior');
  delete s.soloStart;
  s.roster[0]!.tutorial = true;
  s.roster[0]!.class = hero;
  return s;
}
