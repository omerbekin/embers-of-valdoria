/**
 * Debug > Data > Cloud (bulut kaydı; src/cloud/cloud.ts, docs/arch/accounts-plan.md): yerel meta (eov.cloud.v1) ve bulut kaydı üst bilgisi,
 * zorla yükle / indir, çakışma benzet, yerelde sahte girişle (yalnızca localhost; wrangler dev DEV_AUTH=1).
 * Screens: hesap ekranlarını açar (Settings > Account; örnek veriyle girişli önizleme, çakışma diyaloğu, ad sorusu, silme, yeni sürüm, giriş hatası;
 * src/cloud/ui/). Örnek veri ağ çağrısı ve kayıt yazımı yapmaz.
 */
import type Phaser from 'phaser';
import { debugButton, debugHeading, type DebugMenu } from './debug-menu';
import { cloud } from '../cloud/cloud';
import { accountPreviewOn, setAccountPreview } from '../cloud/ui/api';
import { setSettingsPage } from './settings-pages';

let note = '';

/** Ana menüyü Settings > Account açık başlatır. */
function openAccountPage(game: Phaser.Game): void {
  setSettingsPage('account');
  game.scene.getScenes(true)[0]?.scene.start('MainMenuScene', { view: 'settings' });
}

const screens = () => Promise.all([import('../cloud/ui/dialogs'), import('../cloud/ui/sample')]);

export function registerCloudDebug(game: Phaser.Game, debug: Pick<DebugMenu, 'registerPanel' | 'setOpen'>): void {
  debug.registerPanel({
    id: 'panel.cloud',
    tab: 'Data',
    render: (el, refresh) => {
      const c = cloud();
      el.append(debugHeading('Cloud'));
      const info = document.createElement('div');
      info.className = 'debug-note dim';
      info.style.whiteSpace = 'pre-wrap';
      info.textContent = Object.entries(c.debugInfo())
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      el.append(info);
      if (note) {
        const n = document.createElement('div');
        n.className = 'debug-note';
        n.textContent = note;
        el.append(n);
      }
      const set = (text: string): void => {
        note = text;
        refresh();
      };
      const run = (label: string, p: Promise<unknown>): void => {
        set(`${label}...`);
        void p.then((r) => set(`${label}: ${typeof r === 'string' ? r : JSON.stringify(r)}`));
      };
      const signedIn = c.getAccount().signedIn;
      const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const grid = document.createElement('div');
      grid.className = 'debug-grid';
      grid.append(
        debugButton('Refresh', () => run('Sync now', c.syncNow()), { icon: 'restart', title: 'Re-read the account and cloud save (GET /auth/me), then sync' }),
        debugButton('Force upload', () => run('Upload', c.forceUpload()), { icon: 'next', title: 'Upload this device now (no 15 s wait)' }),
        debugButton('Force download', () => run('Download', c.forceDownload()), { icon: 'swap', title: 'Write the cloud save here now (this device is backed up first; ignores the main-menu rule)' }),
        debugButton('Simulate conflict', () => run('Conflict', c.simulateConflict()), { icon: 'burst', title: 'Upload with a wrong revision: the server answers 409 and the client re-decides' }),
      );
      if (local) {
        grid.append(
          debugButton(signedIn ? 'Dev login (switch)' : 'Dev login', () => set(JSON.stringify(c.devLogin('dev'))), { icon: 'info', title: 'Sign in with the fake provider (localhost only; wrangler dev with DEV_AUTH=1)' }),
          debugButton('Dev login #2', () => set(JSON.stringify(c.devLogin('dev2'))), { icon: 'info', title: 'Sign in as a second fake account' }),
        );
      }
      if (signedIn) grid.append(debugButton('Sign out', () => run('Sign out', c.signOut()), { icon: 'skull', title: 'Sign out (progress stays on this device)' }));
      el.append(grid);

      // Hesap ekranları (Faz 1d): açılınca debug menüsü kapanır
      el.append(debugHeading('Account screens'));
      const go = (fn: () => void): void => {
        debug.setOpen(false);
        fn();
      };
      const preview = accountPreviewOn();
      const sg = document.createElement('div');
      sg.className = 'debug-grid';
      sg.append(
        debugButton('Open account page', () => go(() => openAccountPage(game)), { icon: 'info', title: 'Main menu > Settings > Account (real account, or the sample while the preview is on)' }),
        debugButton(preview ? 'Sample account: on' : 'Sample account: off', () => {
          void import('../cloud/ui/sample').then((m) => {
            setAccountPreview(preview ? null : m.sampleAccountApi());
            if (preview) refresh();
            else go(() => openAccountPage(game));
          });
        }, { icon: 'swap', on: preview, title: 'Preview the ENABLED screens while accounts are off (data/cloud.json): account page with sample data (signed in as "Ashen Wanderer"; no network, nothing saved). Sign out / Sign in switch the sample state.' }),
        debugButton('Conflict dialog (sample)', () => go(() => void screens().then(([d, s]) => d.openConflictDialog(s.samplePending()))), { icon: 'burst', title: 'Progress conflict with sample slots (slot 2 Ironman is further in the cloud). Confirm does nothing to your saves.' }),
        debugButton('Name prompt (sample)', () => go(() => void screens().then(([d, s]) => d.openNamePrompt({ required: true, api: s.sampleAccountApi() }))), { icon: 'info', title: 'First sign-in "Choose a name" (required; Confirm saves nothing)' }),
        debugButton('Delete dialog (sample)', () => go(() => void screens().then(([d, s]) => d.openDeleteDialog({ api: s.sampleAccountApi() }))), { icon: 'skull', title: 'Delete account confirm (type DELETE; deletes nothing)' }),
        debugButton('Newer version notice', () => go(() => void screens().then(([d]) => d.openNewerVersionNotice())), { icon: 'restart', title: 'Cloud save from a newer game version (Reload reloads the page)' }),
        debugButton('Sign-in error toast', () => go(() => void screens().then(([d]) => d.showSignInError('denied'))), { icon: 'skull', title: 'The notice shown after a failed or cancelled sign-in' }),
      );
      el.append(sg);
    },
  });
}
