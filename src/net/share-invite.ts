/**
 * Lobi davetini paylaşma (saf, DOM'suz): davet mesajı metni ve WhatsApp / Discord adresleri.
 * WhatsApp hazır metinli link destekler (`wa.me/?text=`); Discord desteklemez: mesaj panoya kopyalanır, Discord açılır.
 */
import { formatLobbyCode } from './lobby-code';

export const DISCORD_APP_URL = 'https://discord.com/app';

/** Kısa İngilizce davet: oyunun adı, okunur kod ve (varsa) tek dokunuşla katılma linki. */
export function inviteMessage(code: string, link: string | null): string {
  const head = `Join my Quick Battle in Embers of Valdoria! Lobby code: ${formatLobbyCode(code)}`;
  return link ? `${head}\nTap to join: ${link}` : head;
}

/** WhatsApp paylaşımı: kişi seçme ekranı mesaj hazır açılır. */
export const whatsappShareUrl = (message: string): string => `https://wa.me/?text=${encodeURIComponent(message)}`;
