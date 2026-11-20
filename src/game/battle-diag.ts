/**
 * Savaş sonu hata raporu izi (docs/arch/diagnostics.md): sonuç + Round + atılan tur sayısı. Savaş başlangıcı ayrı iz
 * (campaign-session.ts > startCampaignBattle). Yalnız kısa kod ve sayı; kahraman / takım adı yok.
 */
import { logEvent } from '../diag/diag';

export type BattleEndKind = 'victory' | 'defeat' | 'retreat' | 'patrol-retreat' | 'pit-yield';

export function logBattleEnd(kind: BattleEndKind, b: { round: number; turnsTaken: number } | null | undefined): void {
  logEvent('battle', `end ${kind}${b ? ` round ${b.round} turns ${b.turnsTaken}` : ''}`);
}
