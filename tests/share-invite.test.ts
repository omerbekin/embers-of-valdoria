import { describe, expect, it } from 'vitest';
import { inviteLink } from '../src/net/lobby-code';
import { DISCORD_APP_URL, inviteMessage, whatsappShareUrl } from '../src/net/share-invite';

describe('lobi davetini paylaşma (WhatsApp / Discord)', () => {
  const link = inviteLink('https://omerbekin.github.io/protomedi/?debug=1#x', 'ACDEFG');

  it('mesaj: okunur kod + katılma linki', () => {
    expect(inviteMessage('ACDEFG', link)).toBe(
      'Join my Quick Battle in Embers of Valdoria! Lobby code: ACD EFG\nTap to join: https://omerbekin.github.io/protomedi/?lobby=ACDEFG',
    );
  });

  it('link yoksa yalnızca kod', () => {
    expect(inviteMessage('ACDEFG', null)).toBe('Join my Quick Battle in Embers of Valdoria! Lobby code: ACD EFG');
  });

  it('WhatsApp adresi: wa.me + kodlanmış metin; geri çözülünce mesajın aynısı', () => {
    const msg = inviteMessage('ACDEFG', link);
    const url = whatsappShareUrl(msg);
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(url).not.toMatch(/\s/);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('text')).toBe(msg);
    // linkin kendi ?lobby= / & işaretleri wa.me parametresini bölmez
    expect([...parsed.searchParams.keys()]).toEqual(['text']);
  });

  it('Discord: hazır mesaj linki yok, uygulama adresi sabit', () => {
    expect(DISCORD_APP_URL).toBe('https://discord.com/app');
  });
});
