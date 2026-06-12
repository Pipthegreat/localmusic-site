// DOM Perignon — hack router (dual-slot edition).
//
// As of v1.5.3 the user can run ONE overlay (ants, champagne, ...) and
// ONE theme world (tubular, arcade, ...) at the same time. Each hack
// file (loaded BEFORE this script in manifest.json) still registers
// itself on `window.__DOMPerignon.hacks` as `{ init, teardown }` — this
// file just tracks two independent "currently active" slots instead of
// one and dispatches per slot.
//
// The two slots are independent, but transitions are sequenced so the
// shared #__dom-perignon-root (used by overlay hacks for their DOM) is
// only touched when the overlay slot changes. Themes are CSS-only and
// never touch the root, so theme transitions don't disturb a running
// overlay.

(function () {
  // Skip local file:// pages. The extension is meant for the open web,
  // and applying it on top of local HTML the user authored (e.g. their
  // own theme test files like Checklist Supreme.html) creates conflicts
  // — the theme classes/CSS the user is iterating on collide with the
  // ones the extension injects. The individual hack files in manifest
  // load before this script and just register their {init, teardown}
  // into window.__DOMPerignon.hacks; without inject.js calling them,
  // none of them ever activate. So early-return here is the complete
  // off-switch for local files.
  if (window.location && window.location.protocol === 'file:') return;

  const NS = window.__DOMPerignon = window.__DOMPerignon || {
    hacks: {},
    currentOverlay: null,
    currentTheme: null,
  };
  const ROOT_ID = '__dom-perignon-root';

  NS.getCSSURL = (relPath) => chrome.runtime.getURL(relPath);

  // Viewport-scale helper (unchanged from v1.4.x — overlays use it).
  NS.getScale = () => {
    const w = window.innerWidth || 1280;
    if (w >= 1280) return 1.0;
    if (w <= 512)  return 0.4;
    return 0.4 + (w - 512) * (0.6 / 768);
  };

  // Shared root for overlay hacks. Themes don't use it; they class+style
  // the page directly via html.dp-<name>-on.
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

  function safeTeardown(name) {
    if (!name) return;
    const hack = NS.hacks[name];
    if (hack && typeof hack.teardown === 'function') {
      try { hack.teardown(); } catch (e) { console.warn('[DOM Perignon] teardown failed:', name, e); }
    }
  }

  // Apply a selection { overlay, theme }. Each slot transitions
  // independently so changing the theme doesn't tear down the overlay,
  // and vice versa.
  function applySelection(sel) {
    const wantOverlay = sel && sel.overlay || null;
    const wantTheme   = sel && sel.theme   || null;

    // Theme slot — CSS-only, no root involvement. Do this first so the
    // overlay paints on top of an already-themed page.
    if (NS.currentTheme !== wantTheme) {
      safeTeardown(NS.currentTheme);
      NS.currentTheme = null;
      if (wantTheme) {
        const hack = NS.hacks[wantTheme];
        if (hack && typeof hack.init === 'function') {
          try { hack.init(); NS.currentTheme = wantTheme; }
          catch (e) { console.warn('[DOM Perignon] theme init failed for', wantTheme, e); }
        } else {
          console.warn('[DOM Perignon] unknown theme:', wantTheme);
        }
      }
    }

    // Overlay slot — owns the shared root. Remove the root only when
    // the overlay is changing; a same-slot no-op keeps the root intact
    // so the running hack isn't disturbed.
    if (NS.currentOverlay !== wantOverlay) {
      safeTeardown(NS.currentOverlay);
      const sr = document.getElementById(ROOT_ID);
      if (sr) sr.remove();
      NS.currentOverlay = null;
      if (wantOverlay) {
        const hack = NS.hacks[wantOverlay];
        if (hack && typeof hack.init === 'function') {
          try {
            const newRoot = ensureRoot();
            hack.init(newRoot);
            NS.currentOverlay = wantOverlay;
          } catch (e) {
            console.warn('[DOM Perignon] overlay init failed for', wantOverlay, e);
          }
        } else {
          console.warn('[DOM Perignon] unknown overlay:', wantOverlay);
        }
      }
    }
  }
  NS.applySelection = applySelection;

  // Two ">_" override toggles, unchanged in spirit from v1.4.x:
  //   greenMode → full ezr-claude theme on claude.ai, matrix-green
  //               overlay-style takeover elsewhere
  //   redMode   → full ezr-chatgpt theme on chatgpt.com, matrix-red
  //               elsewhere
  // Both occupy the THEME slot (they're CSS-driven full recolors).
  // When either is on, the regular overlay+theme picks are ignored.
  function pickSelection(state) {
    const host = window.location.hostname || '';
    if (state.greenMode) {
      const theme = (host === 'claude.ai' || host.endsWith('.claude.ai'))
        ? 'ezr-claude' : 'matrix-green';
      return { overlay: null, theme };
    }
    if (state.redMode) {
      const theme = (host === 'chatgpt.com' || host.endsWith('.chatgpt.com'))
        ? 'ezr-chatgpt' : 'matrix-red';
      return { overlay: null, theme };
    }
    if (!state.enabled) return { overlay: null, theme: null };
    return { overlay: state.activeOverlay || null, theme: state.activeTheme || null };
  }

  // Used by migration below to file a legacy id into the correct slot.
  const LEGACY_OVERLAYS = new Set([
    'ants', 'champagne', 'dynamic-logo', 'quotes',
    'gravity-well', 'aquarium', 'googly', 'dvd',
  ]);
  const LEGACY_THEMES = new Set([
    'tubular', 'arcade', 'buzzbin', 'vapor', 'press', 'blueprint', 'chalkboard',
    'ezr-claude', 'ezr-chatgpt', 'matrix-green', 'matrix-red',
  ]);

  async function reactivateFromStorage() {
    try {
      const stored = await chrome.storage.local.get({
        activeHack:    null,   // legacy single-slot (≤v1.5.2)
        activeOverlay: null,
        activeTheme:   null,
        enabled:       true,
        greenMode:     false,
        redMode:       false,
      });

      // One-shot migration v1.4.x–v1.5.2 → v1.5.3. If we still have a
      // legacy activeHack and nothing in the new slots, file it into
      // whichever column it matches. Persist so the next read is clean.
      if (stored.activeHack && !stored.activeOverlay && !stored.activeTheme) {
        if (LEGACY_OVERLAYS.has(stored.activeHack))    stored.activeOverlay = stored.activeHack;
        else if (LEGACY_THEMES.has(stored.activeHack)) stored.activeTheme   = stored.activeHack;
        try {
          await chrome.storage.local.set({
            activeOverlay: stored.activeOverlay,
            activeTheme:   stored.activeTheme,
            activeHack:    null,
          });
        } catch {}
      }

      applySelection(pickSelection(stored));
    } catch (e) {
      /* chrome.storage unavailable */
    }
  }
  NS.reactivateFromStorage = reactivateFromStorage;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && (msg.type === 'setHack' || msg.type === 'reactivate')) {
      reactivateFromStorage();
      sendResponse({ ok: true });
      return true;
    }
  });

  // v1.5.21 — listen to chrome.storage directly so EVERY tab catches
  // storage changes the moment they happen, not only when the popup
  // remembers to broadcast and only to tabs the broadcast reaches.
  // popup.js's broadcastReactivate stays in place as belt-and-braces.
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.activeOverlay || changes.activeTheme ||
          changes.enabled || changes.greenMode || changes.redMode) {
        reactivateFromStorage();
      }
    });
  }

  // v1.5.21 — bfcache rescue. When the user navigates away from a page
  // with a theme/overlay applied and then back, Chrome restores the
  // page from the back-forward cache complete with all injected DOM
  // (class on <html>, <style> elements, overlay roots) but does NOT
  // re-run the content script. If the user disabled the extension or
  // changed selection while we were "gone", the bfcached page would
  // come back showing the OLD state. pageshow with persisted=true
  // fires only on bfcache restore, so calling reactivateFromStorage
  // there re-syncs with whatever storage now says — including tearing
  // everything down if the user turned the extension off entirely.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) reactivateFromStorage();
  });

  reactivateFromStorage();
})();
