// Easter-egg theme: chatgpt.com - apocalyptic dread, blood and ember.
//
// Lifted verbatim from the original ui-updater-2 project (sites/chatgpt.css).
// CSS-only, no DOM injection. Only activates when the user has flipped the
// hidden ">_" easter-egg toggle in the popup AND is on chatgpt.com.
// Bypasses the normal hijink selection and the master Active toggle (see
// inject.js pickTheme()).

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });
  let styleEl = null;

  async function init(/* root */) {
    if (document.getElementById('__dp-ezr-chatgpt-style')) return;
    const url = NS.getCSSURL('hacks/ezr-chatgpt.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-ezr-chatgpt-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  function teardown() {
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks['ezr-chatgpt'] = { init, teardown };
})();
