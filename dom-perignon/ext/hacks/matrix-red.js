// matrix-red hack — blood-red counterpart to matrix-green. Activated
// when the red ">_" toggle is on. On chatgpt.com the red toggle
// activates the full ezr-chatgpt theme instead (routed by pickTheme).
// Same shape as matrix-green.js; only HTML_CLASS and the companion
// CSS palette differ.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });
  const STYLE_ID    = '__dp-matrix-red-style';
  const RAIN_ID     = '__dp-matrix-red';
  const HTML_CLASS  = 'dp-matrix-red-on';

  let styleEl = null;
  let rootEl  = null;

  async function init() {
    if (document.getElementById(STYLE_ID)) return;

    const url = NS.getCSSURL('hacks/matrix-red.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);

    document.documentElement.classList.add(HTML_CLASS);

    rootEl = document.createElement('div');
    rootEl.id = RAIN_ID;
    rootEl.setAttribute('aria-hidden', 'true');
    rootEl.innerHTML = '<div class="dp-matrix-rain"></div>';
    (document.body || document.documentElement).appendChild(rootEl);

    seedRain(rootEl.querySelector('.dp-matrix-rain'));
  }

  function teardown() {
    document.documentElement.classList.remove(HTML_CLASS);
    if (styleEl) { styleEl.remove(); styleEl = null; }
    if (rootEl)  { rootEl.remove();  rootEl  = null; }
  }

  function seedRain(host) {
    const GLYPHS = 'ﾋﾘｱｾﾜﾗﾇﾈﾏﾜﾓｴﾆﾃﾂﾐｼﾎｵﾖﾅﾑﾌｺｿﾅκλμπσχθαβγδ01:_>/';
    const cols    = 32;
    const spacing = 100 / cols;
    const vh      = Math.max(window.innerHeight, 720);
    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const minOp = isMobile ? 0.45 : 0.55;
    const maxOp = 0.70;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < cols; i++) {
      const col = document.createElement('div');
      col.className = 'dp-matrix-col';
      const x = i * spacing + (Math.random() - 0.5) * spacing * 0.6;
      col.style.left = `${x.toFixed(2)}%`;
      col.style.animationDuration = (10 + Math.random() * 14).toFixed(2) + 's';
      col.style.animationDelay   = (-Math.random() * 24).toFixed(2) + 's';
      col.style.opacity = (minOp + Math.random() * (maxOp - minOp)).toFixed(2);
      const fontSize = 13 + Math.random() * 5;
      col.style.fontSize = fontSize.toFixed(1) + 'px';

      const lineHeight = fontSize * 1.3;
      const perHalf    = Math.ceil(vh / lineHeight) + 2;
      let half = '';
      for (let g = 0; g < perHalf; g++) {
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        if (g === 0)      half += `<span class="head">${ch}</span>\n`;
        else if (g < 4)   half += `<span class="mid">${ch}</span>\n`;
        else              half += ch + '\n';
      }
      col.innerHTML = half + half;
      frag.appendChild(col);
    }
    host.appendChild(frag);
  }

  NS.hacks['matrix-red'] = { init, teardown };
})();
