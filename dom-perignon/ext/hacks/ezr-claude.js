// Easter-egg theme: claude.ai - phosphor green hacker terminal aesthetic.
//
// Lifted verbatim from the original ui-updater-2 project (sites/claude.css).
// CSS-only, no DOM injection. Only activates when the user has flipped the
// hidden ">_" easter-egg toggle in the popup AND is on claude.ai. Bypasses
// the normal hijink selection and the master Active toggle (see
// inject.js pickTheme()).

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });
  let styleEl = null;

  async function init(/* root */) {
    if (document.getElementById('__dp-ezr-claude-style')) return;
    const url = NS.getCSSURL('hacks/ezr-claude.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-ezr-claude-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  function teardown() {
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks['ezr-claude'] = { init, teardown };
})();
