/* ortak yerlesim: sahne mantiksal genisligi W = clamp(vw/vh*1080, 1920, 2580), olcek = vh/1080 */
window.KIT = (function () {
  const q = {}; location.hash.replace(/^#/, '').split('&').forEach((t, i) => { const k = t.split('='); if (i === 0) q.v = k[0]; else q[k[0]] = k[1] === undefined ? true : decodeURIComponent(k[1]); });
  function layout(cb) {
    const vw = innerWidth, vh = innerHeight, s = vh / 1080, W = Math.max(1920, Math.min(2580, vw / vh * 1080));
    document.documentElement.classList.add('v-' + (q.v || 'a')); const st = document.getElementById('stage'), de = document.documentElement;
    st.style.width = W + 'px'; st.style.transform = 'scale(' + s + ')'; st.style.left = Math.max(0, (vw - W * s) / 2) + 'px';
    de.classList.toggle('short', vh <= 520); de.classList.toggle('compact', vh <= 720);
    de.style.setProperty('--bh-inv', String(1 / s));
    window.KIT.W = W; window.KIT.s = s; if (cb) cb(W, s);
  }
  function start(cb) { layout(cb); addEventListener('resize', () => layout(cb)); }
  addEventListener('hashchange', () => location.reload());
  return { q, start, W: 1920, s: 1 };
})();
