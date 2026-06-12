// Dynamic site-logo bounce - sniffs the current site for its logo
// (apple-touch-icon, og:image, favicon, header img), then spawns 6 copies
// that bounce around DVD-style.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const LOGO_COUNT_BASE = 8;
  const LOGO_SIZE_BASE  = 35;
  let LOGO_COUNT = LOGO_COUNT_BASE;
  let LOGO_SIZE  = LOGO_SIZE_BASE;
  let raf = null;
  let styleEl = null;
  let logos = [];

  async function loadCSS() {
    if (document.getElementById('__dp-dynlogo-style')) return;
    const url = NS.getCSSURL('hacks/dynamic-logo.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-dynlogo-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  // Build a fallback "logo" when the page has no detectable real one.
  // Uses the first letter of the hostname (stripping www.) rendered in
  // the page's own background colour, text colour, and font family - so
  // the bouncing letter visually belongs to the page it's on instead of
  // looking like a generic placeholder.
  function makeFallbackLogo(size) {
    const fb = document.createElement('div');
    fb.className = 'dp-dynlogo-fallback';

    // First letter, stripping www. prefix. customprojects.info -> "C",
    // docs.google.com -> "D", adobe.com -> "A", etc.
    const host = (window.location.hostname || '').replace(/^www\./i, '');
    fb.textContent = (host.charAt(0) || '?').toUpperCase();

    // Pull body's rendered styling. Wrapped in try/catch because some
    // exotic pages (no body, sandboxed iframes) can throw.
    try {
      const bodyStyle = getComputedStyle(document.body);
      let bg = bodyStyle.backgroundColor;
      // Body has transparent background? Walk up to <html>, then default.
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || !bg) {
        const htmlStyle = getComputedStyle(document.documentElement);
        bg = htmlStyle.backgroundColor;
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || !bg) {
          bg = '#ffffff';
        }
      }
      fb.style.background = bg;
      fb.style.color      = bodyStyle.color || '#1a1a1a';
      fb.style.fontFamily = bodyStyle.fontFamily || 'serif';
    } catch (_) {
      // Sensible defaults if computed style is unreadable
      fb.style.background = '#ffffff';
      fb.style.color      = '#1a1a1a';
      fb.style.fontFamily = 'Georgia, serif';
    }

    // Font size scaled to the wrapper so the letter fills the box without
    // overflowing - 60% of the wrapper's smaller dimension.
    fb.style.fontSize = `${Math.round(size * 0.6)}px`;
    return fb;
  }

  // Find the best logo URL on the current page. Returns a string URL or null.
  function detectLogoURL() {
    const candidates = [];

    // 1. apple-touch-icon (usually 180px PNG, high quality)
    document.querySelectorAll('link[rel*="apple-touch-icon"]').forEach(link => {
      const sizes = parseInt((link.getAttribute('sizes') || '0').split('x')[0], 10) || 0;
      candidates.push({ url: link.href, score: 100 + sizes });
    });

    // 2. icon with sizes attribute
    document.querySelectorAll('link[rel*="icon"]').forEach(link => {
      const sizes = parseInt((link.getAttribute('sizes') || '0').split('x')[0], 10) || 0;
      candidates.push({ url: link.href, score: 50 + sizes });
    });

    // 3. og:image (often big brand image, not always a clean logo)
    const og = document.querySelector('meta[property="og:image"]');
    if (og && og.content) candidates.push({ url: og.content, score: 40 });

    // 4. First image inside header/nav with "logo" hint
    const possible = document.querySelectorAll(
      'header img, nav img, header svg, nav svg, [class*="logo" i] img, [id*="logo" i] img'
    );
    for (const el of possible) {
      const src = el.tagName === 'IMG' ? el.src : null;
      if (src) candidates.push({ url: src, score: 30 });
    }

    // 5. Last resort - site-root favicon
    candidates.push({
      url: `${window.location.origin}/favicon.ico`,
      score: 1,
    });

    // Pick highest score
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length ? candidates[0].url : null;
  }

  function step() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const l of logos) {
      l.x += l.vx;
      l.y += l.vy;
      if (l.x <= 0)            { l.x = 0;            l.vx = Math.abs(l.vx); }
      if (l.x + l.size >= vw)  { l.x = vw - l.size;  l.vx = -Math.abs(l.vx); }
      if (l.y <= 0)            { l.y = 0;            l.vy = Math.abs(l.vy); }
      if (l.y + l.size >= vh)  { l.y = vh - l.size;  l.vy = -Math.abs(l.vy); }
      l.el.style.transform = `translate(${l.x}px, ${l.y}px)`;
    }
    raf = requestAnimationFrame(step);
  }

  async function init(root) {
    await loadCSS();
    // Scale on activation - fewer copies, smaller sizes in small viewports
    const scale = (NS.getScale && NS.getScale()) || 1;
    LOGO_SIZE  = Math.max(18, Math.round(LOGO_SIZE_BASE * scale));
    LOGO_COUNT = Math.max(4, Math.round(LOGO_COUNT_BASE * (0.5 + 0.5 * scale)));
    const logoURL = detectLogoURL();

    // (The old "DETECTED LOGO" debug banner that printed the host name in
    // a chip up-top was removed in v1.5.10 — it was scaffolding from when
    // the detection waterfall was unstable, and it leaks the host name
    // into the bounce. Logos still pick up whatever the waterfall finds;
    // no banner is needed.)

    logos = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (let i = 0; i < LOGO_COUNT; i++) {
      const el = document.createElement('div');
      el.className = 'dp-dynlogo';
      // Vary sizes ±25% around scaled base so they don't all look identical
      const size = LOGO_SIZE + (Math.random() - 0.5) * (16 * scale);
      el.style.width = el.style.height = `${size}px`;

      if (logoURL) {
        const img = document.createElement('img');
        img.src = logoURL;
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => {
          // URL failed (CORS, 404, decode error). Swap in the
          // first-letter-of-hostname fallback styled to match the page.
          img.remove();
          el.appendChild(makeFallbackLogo(size));
        };
        el.appendChild(img);
      } else {
        // No logo URL detectable at all - use the first-letter fallback.
        el.appendChild(makeFallbackLogo(size));
      }

      root.appendChild(el);

      logos.push({
        el,
        size,
        x: Math.random() * (vw - size),
        y: Math.random() * (vh - size),
        vx: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.5),
        vy: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.5),
      });
    }

    raf = requestAnimationFrame(step);
  }

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    logos = [];
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks['dynamic-logo'] = { init, teardown };
})();
