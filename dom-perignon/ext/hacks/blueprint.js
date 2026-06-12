// blueprint hack — architect's drafting, cyan on navy with grid sheet.
// Adapted from the Checklist Supreme "Blueprint" theme world. CSS-only.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });
  const STYLE_ID   = '__dp-blueprint-style';
  const HTML_CLASS = 'dp-blueprint-on';
  let styleEl = null;

  async function init() {
    if (document.getElementById(STYLE_ID)) return;
    const url = NS.getCSSURL('hacks/blueprint.css');
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

  NS.hacks['blueprint'] = { init, teardown };
})();
