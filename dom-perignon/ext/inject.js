// DOM Perignon - hack router
//
// Each hack file (loaded BEFORE this script in manifest.json) registers
// itself on `window.__DOMPerignon.hacks` as `{ init, teardown }`. This file
// dispatches based on the user's current selection in chrome.storage.

(function () {
  const NS = window.__DOMPerignon = window.__DOMPerignon || { hacks: {}, current: null };
  const ROOT_ID = '__dom-perignon-root';

  // Make the runtime CSS-URL resolver available to hacks (so they can fetch
  // their own CSS file from the extension bundle).
  NS.getCSSURL = (relPath) => chrome.runtime.getURL(relPath);

  // Viewport-scale helper. Used by every hijink that draws fixed-size
  // visuals so they shrink gracefully in small viewports (mobile, iframe
  // previews, side panels). Linear from 0.4 at ≤512px to 1.0 at 1280px+.
  // Hijinks should call this on init AND react to window resize if they
  // care (most don't - a one-shot read at activation is sufficient).
  NS.getScale = () => {
    const w = window.innerWidth || 1280;
    if (w >= 1280) return 1.0;
    if (w <= 512)  return 0.4;
    // Linear interpolation between (512, 0.4) and (1280, 1.0)
    return 0.4 + (w - 512) * (0.6 / 768);
  };

  // Make a shared "root" div so each hack can hang DOM under it and we can
  // wipe everything atomically on teardown. Hacks may also append to body
  // directly if they need MutationObserver behavior on the page itself
  // (e.g. googly eyes). Cleanup is the hack's responsibility either way.
  function ensureRoot() {
    let el = document.getElementById(ROOT_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = ROOT_ID;
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483646;contain:strict;';
      (document.body || document.documentElement).appendChild(el);
    }
    return el;
  }
  NS.ensureRoot = ensureRoot;

  function activate(hackName) {
    // Nothing to do if already on the requested hack
    if (NS.current === hackName) return;

    // Teardown previous
    if (NS.current && NS.hacks[NS.current] && typeof NS.hacks[NS.current].teardown === 'function') {
      try { NS.hacks[NS.current].teardown(); } catch (e) { console.warn('[DOM Perignon] teardown failed:', e); }
    }
    // Always wipe the shared root regardless of whether previous hack used it
    const root = document.getElementById(ROOT_ID);
    if (root) root.remove();

    NS.current = null;

    if (!hackName || hackName === 'off') return;

    const hack = NS.hacks[hackName];
    if (!hack || typeof hack.init !== 'function') {
      console.warn('[DOM Perignon] unknown hack:', hackName);
      return;
    }
    try {
      const newRoot = ensureRoot();
      hack.init(newRoot);
      NS.current = hackName;
    } catch (e) {
      console.warn('[DOM Perignon] init failed for', hackName, e);
    }
  }
  NS.activate = activate;

  // Listen for hack-switch messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'setHack') {
      activate(msg.hack);
      sendResponse({ ok: true });
      return true;
    }
  });

  // On script load, read current selection + enabled flag, then activate
  (async () => {
    try {
      const { activeHack, enabled } = await chrome.storage.local.get({
        activeHack: 'off',
        enabled: true,
      });
      activate(enabled ? activeHack : 'off');
    } catch (e) {
      // chrome.storage unavailable - do nothing
    }
  })();
})();
