// Telefonda (html.short) uc noktayla kesilen metne dokununca tam metin acilir, tekrar dokununca / baska yere dokununca kapanir.
// TEK ortak yardimci: kesilebilen metne `data-tap-expand` yazin ya da secici asagidaki listeye eklensin; stil a11y.css `.tx-open`.
// Kesilmemis metin hicbir sey yapmaz; masaustunde (html.short yok) kapalidir (orada hover ipucu var).
import './a11y.css';

export const TAP_EXPAND_SELECTOR = '[data-tap-expand], .gr-ms-fx, .gr-slot-name, .gr-slot-sub, .pl-ds, .pl-nm, .sbc-info, .sbc-chain, .ec-card p, .me-story, .er-t .n, .ec-hn, .dcn-next';

/** Metin kesilmis mi (satir siniri ya da tek satir tasmasi). */
export function isClipped(e: Pick<HTMLElement, 'scrollHeight' | 'clientHeight' | 'scrollWidth' | 'clientWidth'>): boolean {
  return e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1;
}

/** Dokunulan metin icin sonraki acik metin: acik olana tekrar = kapat; kesik metin = ac; baska yer = kapat. Saf (testli). */
export function nextExpanded<T>(open: T | null, hit: T | null, clipped: boolean): T | null {
  if (!hit || hit === open) return null;
  return clipped ? hit : null;
}

let installed = false;
export function installTapExpand(doc: Document = document): void {
  if (installed) return;
  installed = true;
  let open: HTMLElement | null = null;
  doc.addEventListener('click', (ev) => {
    if (!doc.documentElement.classList.contains('short')) return;
    const t = ev.target instanceof Element ? ev.target : null;
    const hit = t?.closest<HTMLElement>(TAP_EXPAND_SELECTOR) ?? null;
    const next = nextExpanded(open, hit, hit ? isClipped(hit) : false);
    if (open && open !== next) open.classList.remove('tx-open');
    if (next) next.classList.add('tx-open');
    open = next;
  });
}
