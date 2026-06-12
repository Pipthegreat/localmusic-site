// arcade hack — 1985 cabinet, neon CRT, INSERT COIN.
// Adapted from the Checklist Supreme "Arcade" theme world. CSS-only.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });
  const STYLE_ID   = '__dp-arcade-style';
  const HTML_CLASS = 'dp-arcade-on';
  let styleEl = null;

  async function init() {
    if (document.getElementById(STYLE_ID)) return;
    const url = NS.getCSSURL('hacks/arcade.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
    document.documentElement.classList.add(HTML_CLASS);
  }

  function teardown() {
    document.documentElement.classList.remove(HTML_CLASS);
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks['arcade'] = { init, teardown };
})();
