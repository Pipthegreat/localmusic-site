// Googly Eyes — paste a pair of mouse-tracking eyes on every visible image,
// avatar, button, and card on the page. Pupils orient toward the cursor.
// MutationObserver picks up new elements added by the page over time.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const MAX_PAIRS    = 440;
  const MIN_SIZE     = 20;   // catch small headings, capability labels, eyebrows, etc.
  const REFRESH_MS   = 1500; // re-scan for new candidates this often

  let styleEl = null;
  let raf = null;
  let mouseX = 0, mouseY = 0;
  let pairs = []; // { wrap, leftEye, rightEye, target, lastRect }
  let observer = null;
  let scanT = null;
  let root = null;

  async function loadCSS() {
    if (document.getElementById('__dp-googly-style')) return;
    const url = NS.getCSSURL('hacks/googly.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-googly-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  function onMouse(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function isVisible(el) {
    if (!el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < MIN_SIZE || r.height < MIN_SIZE) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false;
    if (r.right < 0 || r.bottom < 0 ||
        r.left > window.innerWidth || r.top > window.innerHeight) return false;
    return true;
  }

  function buildPair(target) {
    if (target.__dpGooglyPaired) return null;
    target.__dpGooglyPaired = true;

    const wrap = document.createElement('div');
    wrap.className = 'dp-googly-pair';
    // Small random tilt so each pair has its own personality
    wrap.style.setProperty('--dp-tilt', `${(Math.random() - 0.5) * 30}deg`);
    wrap.innerHTML = `
      <div class="dp-eye"><div class="dp-pupil"></div></div>
      <div class="dp-eye"><div class="dp-pupil"></div></div>
    `;
    const [leftEye, rightEye] = wrap.querySelectorAll('.dp-eye');

    return {
      wrap,
      leftEye,
      rightEye,
      leftPupil:  leftEye.querySelector('.dp-pupil'),
      rightPupil: rightEye.querySelector('.dp-pupil'),
      target,
      lastRect: null,
      // Whimsical position factors — each pair stakes out its own anchor
      // within the target element (so they aren't all in the same spot)
      anchorXFrac: 0.1 + Math.random() * 0.8,
      anchorYFrac: 0.1 + Math.random() * 0.8,
      sizeFrac:    0.18 + Math.random() * 0.16, // 18-34% of min dimension
    };
  }

  // Place a pair somewhere whimsical inside its target element.
  function positionPair(p) {
    const r = p.target.getBoundingClientRect();
    if (!r.width || !r.height) return;

    // Per-pair size and anchor (stored on the pair at creation, so the
    // same pair stays in roughly the same relative spot as we re-measure)
    const minDim = Math.min(r.width, r.height);
    const eyeSize = Math.max(14, Math.min(64, minDim * p.sizeFrac));
    const gap = eyeSize * 0.18;
    const pairW = eyeSize * 2 + gap;

    // Anchor inside the element's bounds, then clamp so the pair stays
    // wholly inside the viewport
    const cx = r.left + r.width  * p.anchorXFrac;
    const cy = r.top  + r.height * p.anchorYFrac;
    const left = Math.max(2, Math.min(window.innerWidth  - pairW - 2,    cx - pairW / 2));
    const top  = Math.max(2, Math.min(window.innerHeight - eyeSize - 2, cy - eyeSize / 2));

    p.wrap.style.left = `${left}px`;
    p.wrap.style.top  = `${top}px`;
    p.wrap.style.setProperty('--eye-size', `${eyeSize}px`);
    p.wrap.style.setProperty('--eye-gap',  `${gap}px`);

    p.lastRect = r;
    p.eyeSize = eyeSize;
  }

  function trackPupils() {
    for (const p of pairs) {
      if (!p.target.isConnected) continue;
      // Re-measure target if it might have moved (cheap to do every frame)
      const r = p.target.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // Only reposition wrap if rect has changed significantly
      if (!p.lastRect ||
          Math.abs(r.left - p.lastRect.left) > 1 ||
          Math.abs(r.top  - p.lastRect.top)  > 1 ||
          Math.abs(r.width  - p.lastRect.width)  > 1 ||
          Math.abs(r.height - p.lastRect.height) > 1) {
        positionPair(p);
      }

      // Compute pupil offset for each eye, separately (eyes converge)
      const eyeSize = p.eyeSize;
      const pupilSize = eyeSize * 0.4;
      const maxOffset = (eyeSize - pupilSize) * 0.5 * 0.9;

      [p.leftEye, p.rightEye].forEach((eye, idx) => {
        const er = eye.getBoundingClientRect();
        const ecx = er.left + er.width / 2;
        const ecy = er.top  + er.height / 2;
        const dx = mouseX - ecx;
        const dy = mouseY - ecy;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.001) return;
        const k = Math.min(maxOffset, dist) / dist;
        const ox = dx * k;
        const oy = dy * k;
        const pupil = idx === 0 ? p.leftPupil : p.rightPupil;
        pupil.style.transform = `translate(${ox}px, ${oy}px)`;
      });
    }
    raf = requestAnimationFrame(trackPupils);
  }

  function rescan() {
    if (!root) return;
    if (pairs.length >= MAX_PAIRS) return;

    const candidates = document.querySelectorAll(
      'img, [role="img"], picture, video, ' +
      'button, [role="button"], a.btn, ' +
      '.avatar, [class*="avatar" i], [class*="profile" i] img, ' +
      'h1, h2, h3, p, ' +
      // Common pattern blocks worth ogling in editorial-style pages
      '.eyebrow, .capability-label, .capability, .material-name, .step-num, blockquote'
    );

    for (const el of candidates) {
      if (pairs.length >= MAX_PAIRS) break;
      if (el.__dpGooglyPaired) continue;
      if (!isVisible(el)) continue;
      // skip if it's part of the DP overlay itself
      if (el.closest('#__dom-perignon-root')) continue;
      const p = buildPair(el);
      if (!p) continue;
      positionPair(p);
      root.appendChild(p.wrap);
      pairs.push(p);
    }
    // Garbage-collect pairs whose target is gone
    pairs = pairs.filter(p => {
      if (!p.target.isConnected) { p.wrap.remove(); return false; }
      return true;
    });
  }

  async function init(r) {
    await loadCSS();
    root = r;
    pairs = [];

    document.addEventListener('mousemove', onMouse, { passive: true });
    // Initial center mouse to avoid eyes snapping when first loaded
    mouseX = window.innerWidth / 2;
    mouseY = window.innerHeight / 2;

    rescan();
    scanT = setInterval(rescan, REFRESH_MS);

    // Watch for added/removed nodes
    observer = new MutationObserver(() => {
      // Cheap signal — actual rescan throttled by setInterval
    });
    observer.observe(document.body, { childList: true, subtree: true });

    raf = requestAnimationFrame(trackPupils);
  }

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    if (scanT) clearInterval(scanT);
    if (observer) observer.disconnect();
    document.removeEventListener('mousemove', onMouse);
    for (const p of pairs) {
      delete p.target.__dpGooglyPaired;
      p.wrap.remove();
    }
    pairs = [];
    raf = scanT = observer = null;
    root = null;
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks.googly = { init, teardown };
})();
