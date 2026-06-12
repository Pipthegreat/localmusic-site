// tubular hack — glitch noir takeover (oxblood + persimmon, italic Georgia).
// Adapted from the Checklist Supreme "Tubular" theme world. CSS-only;
// the html.dp-tubular-on class boosts every rule's specificity so the
// recolor beats most sites' own styles.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });
  const STYLE_ID   = '__dp-tubular-style';
  const HTML_CLASS = 'dp-tubular-on';
  let styleEl = null;

  async function init() {
    if (document.getElementById(STYLE_ID)) return;
    const url = NS.getCSSURL('hacks/tubular.css');
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

  NS.hacks['tubular'] = { init, teardown };
})();
