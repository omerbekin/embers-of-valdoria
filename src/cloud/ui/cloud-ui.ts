/**
 * Bulut kaydı olaylarını pencerelere bağlar (main.ts, initCloud'dan ÖNCE: ?auth= olayı init sırasında yayılır). Hafif: pencerelerin kodu
 * (dialogs.ts + css) yalnızca bir olay gelince iner. Sıra: ilk girişte ad sorusu -> çakışma kararı -> yeni sürüm bildirimi (tek tek).
 *  - auth ok:false   -> "Sign-in failed" bildirimi
 *  - auth ok:true + hesapta ad yok -> zorunlu "Choose a name" (Ömer kararı 5: oyuncu kendi seçer, ilk girişte sorulur)
 *  - pending         -> "Progress conflict" (null gelirse açık pencere kapanır)
 *  - status newer-version -> "Newer version" (oturumda bir kez)
 */
import { getPendingDecision, subscribe, type AccountState, type PendingDecision } from '../cloud';
import { whenBootReady } from '../../ui/boot-loader';
import type { ElDialog } from '../../ui/el-dialog';

type Dialogs = typeof import('./dialogs');
const loadDialogs = (): Promise<Dialogs> => import('./dialogs');

interface ConflictEntry {
  pending: PendingDecision;
  dialog: ElDialog | null;
  /** Pencere kapanınca sıradakine geçiş. */
  done: () => void;
}

let installed = false;

export function installCloudUi(): void {
  if (installed) return;
  installed = true;
  let justSignedIn = false;
  let nameAsked = false;
  let newerShown = false;
  let conflict: ConflictEntry | null = null;
  // Pencereler sırayla: biri kapanınca sıradaki açılır
  let chain: Promise<void> = Promise.resolve();
  const queue = (open: (m: Dialogs, done: () => void) => void): void => {
    chain = chain.then(
      () =>
        new Promise<void>((resolve) => {
          whenBootReady(() => {
            loadDialogs().then(
              (m) => open(m, resolve),
              () => resolve(),
            );
          });
        }),
    );
  };

  const askName = (a: AccountState): void => {
    if (!justSignedIn || nameAsked || !a.signedIn || a.displayName) return;
    nameAsked = true;
    queue((m, done) => void m.openNamePrompt({ required: true, onClosed: done }));
  };

  const showConflict = (p: PendingDecision): void => {
    if (conflict?.pending === p) return;
    const entry: ConflictEntry = { pending: p, dialog: null, done: () => undefined };
    conflict = entry;
    queue((m, done) => {
      if (conflict !== entry || getPendingDecision() !== p) return done(); // bu arada çözüldü / değişti
      entry.done = () => {
        if (conflict === entry) conflict = null;
        done();
      };
      entry.dialog = m.openConflictDialog(p, { onClosed: entry.done });
    });
  };

  subscribe((e) => {
    if (e.type === 'auth') {
      if (e.ok) justSignedIn = true;
      else {
        const reason = e.reason;
        whenBootReady(() => void loadDialogs().then((m) => m.showSignInError(reason)));
      }
    } else if (e.type === 'account') askName(e.account);
    else if (e.type === 'pending') {
      if (e.pending) showConflict(e.pending);
      else if (conflict) {
        // Karar başka yoldan düştü (çıkış, oturum sonu): açık pencere kapanır
        const c = conflict;
        conflict = null;
        if (c.dialog && !c.dialog.closed) c.dialog.close(c.done);
      }
    } else if (e.type === 'status' && e.status === 'newer-version' && !newerShown) {
      newerShown = true;
      queue((m, done) => void m.openNewerVersionNotice({ onClosed: done }));
    }
  });
}
