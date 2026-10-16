/**
 * Debug > Data > Error reports (hata raporu sistemi; src/diag/, docs/arch/diagnostics.md): durum, son izleri görüntüle, günlüğü kopyala,
 * deneme raporu gönder (onay açıksa), ilk açılış bildirimini yeniden göster, sahte hata / çökme işareti.
 */
import { debugButton, debugHeading, type DebugMenu } from './debug-menu';
import { captureError, copyDiagLog, debugMarkCrash, diagCrumbs, diagEndpoint, diagPrefs, resetDiagNotice, sendTestReport, setDiagConsent } from '../diag/diag';
import { openDiagNotice } from '../diag/diag-notice';

let note = '';
let showLog = false;

export function registerDiagDebug(debug: Pick<DebugMenu, 'registerPanel'>): void {
  debug.registerPanel({
    id: 'panel.diag',
    tab: 'Data',
    render: (el, refresh) => {
      el.append(debugHeading('Error reports'));
      const p = diagPrefs();
      const info = document.createElement('div');
      info.className = 'debug-note dim';
      info.textContent = `Reporting ${p.consent ? 'ON' : 'OFF'} · device ${p.device ?? '-'} · ${diagCrumbs().length} events kept · server ${diagEndpoint() ?? 'none'}`;
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
      const grid = document.createElement('div');
      grid.className = 'debug-grid';
      grid.append(
        debugButton(p.consent ? 'Reports: ON' : 'Reports: OFF', () => {
          setDiagConsent(!p.consent);
          set(`Error reports turned ${p.consent ? 'off (device id reset)' : 'on'}`);
        }, { icon: 'info', on: p.consent, title: 'Same switch as Settings > Privacy > Error reports' }),
        debugButton(showLog ? 'Hide log' : 'View log', () => {
          showLog = !showLog;
          refresh();
        }, { icon: 'eye', on: showLog, title: 'Show the last 60 recorded events (kept on this device)' }),
        debugButton('Copy log', () => void copyDiagLog().then((ok) => set(ok ? 'Log copied to the clipboard' : 'Could not copy the log')), { icon: 'clipboard', title: 'Copy the event log as text (works with reporting off)' }),
        debugButton('Send test report', () => {
          set('Sending...');
          void sendTestReport().then(set);
        }, { icon: 'next', title: 'Send a test report to the server now (only when reporting is on)' }),
        debugButton('Show notice', () => {
          resetDiagNotice();
          openDiagNotice('first');
        }, { icon: 'book', title: 'Show the first-launch "Error reports" notice again' }),
        debugButton('Fake error', () => {
          captureError(new Error('Debug fake error'), 'debug');
          set('Fake error recorded (sent only if reporting is on; once per session)');
        }, { icon: 'burst', title: 'Record a fake error like a real one' }),
        debugButton('Fake crash', () => {
          debugMarkCrash();
          set('This session will count as crashed: reload the page. With reporting on, a "previous session crashed" report is sent about 50 s after the reload (the old tab must look dead first)');
        }, { icon: 'skull', title: 'Mark this session as not closed cleanly (reload to test crash detection)' }),
      );
      el.append(grid);
      if (showLog) {
        const pre = document.createElement('pre');
        pre.className = 'debug-note';
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.maxHeight = '260px';
        pre.style.overflowY = 'auto';
        pre.style.userSelect = 'text';
        pre.textContent = diagCrumbs()
          .slice(-60)
          .map((c) => `${new Date(c.t).toLocaleTimeString()} [${c.k}] ${c.m}`)
          .join('\n');
        el.append(pre);
      }
    },
  });
}
