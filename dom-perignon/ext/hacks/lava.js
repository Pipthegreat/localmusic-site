// Floor is Lava — visually clones selected page elements (images, big
// headings, buttons) into fixed-position overlays that fall to the bottom
// of the viewport with gravity physics. The actual page DOM is never
// modified, so layout never breaks. Click a falling overlay to rescue it.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const GRAVITY = 0.45;
  const TERMINAL_V = 18;
  const BOUNCE_DAMP = 0.35;
  const FRICTION = 0.92;
  const LAVA_BAND_H = 60;  // bottom band reserved for lava glow

  let styleEl = null;
  let raf = null;
  let lavaBand = null;
  let root = null;
  let fallingItems = [];

  async function loadCSS() {
    if (document.getElementById('__dp-lava-style')) return;
    const url = NS.getCSSURL('hacks/lava.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-lava-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  // Find candidate elements: visible images + chunky text/button elements
  function findCandidates() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const seen = new Set();
    const out = [];

    function consider(el, maxSize = 220) {
      if (seen.has(el)) return;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width < 28 || r.height < 28) return;
      if (r.width > maxSize || r.height > maxSize) return;
      if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh - LAVA_BAND_H) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
      out.push({ el, rect: r });
    }

    document.querySelectorAll('img').forEach(el => consider(el, 320));
    document.querySelectorAll('button, h1, h2, h3, a[role="button"]').forEach(el => consider(el, 280));

    // Cap to avoid performance issues
    return out.slice(0, 28);
  }

  function createOverlay(item) {
    const { el, rect } = item;
    const clone = el.cloneNode(true);
    // Strip any classes/styles that might rely on a particular DOM tree
    clone.removeAttribute('id');
    clone.style.cssText = `
      position: fixed;
      left: 0; top: 0;
      width: ${rect.width}px;
      height: ${rect.height}px;
      margin: 0;
      transform: translate(${rect.left}px, ${rect.top}px);
      pointer-events: auto;
      cursor: pointer;
      transition: none;
      box-sizing: border-box;
      will-change: transform;
    `;
    clone.classList.add('dp-lava-item');

    return {
      clone,
      target: el,
      rect,
      origLeft: rect.left,
      origTop: rect.top,
      x: rect.left,
      y: rect.top,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -2 - Math.random() * 2,   // initial slight upward bounce
      delay: Math.random() * 1800,  // staggered fall start
      started: false,
      startedAt: 0,
      rescued: false,
      angle: 0,
      angVel: (Math.random() - 0.5) * 0.05,
    };
  }

  // Save the original's inline visibility so we can restore exactly what
  // the page had set (rather than just blanking it to '').
  function hideOriginal(target) {
    if (target.__dpLavaPriorVisibility !== undefined) return;
    target.__dpLavaPriorVisibility = target.style.visibility || '';
    target.style.visibility = 'hidden';
  }
  function restoreOriginal(target) {
    if (target.__dpLavaPriorVisibility === undefined) return;
    target.style.visibility = target.__dpLavaPriorVisibility;
    delete target.__dpLavaPriorVisibility;
  }

  function rescueItem(item) {
    if (item.rescued) return;
    item.rescued = true;
    // Animate back to original position with a soft arc, then reveal the
    // original element again right before the clone is removed (so there
    // is never a frame where neither is visible).
    item.clone.style.transition =
      'transform 760ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 760ms ease-out';
    item.clone.style.transform = `translate(${item.origLeft}px, ${item.origTop}px) rotate(0deg)`;
    setTimeout(() => {
      restoreOriginal(item.target);
      item.clone.remove();
    }, 760);
  }

  function step(t) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const floorY = vh - LAVA_BAND_H;

    for (const it of fallingItems) {
      if (it.rescued) continue;
      if (!it.started) {
        if (!it.startedAt) it.startedAt = t;
        if (t - it.startedAt < it.delay) continue;
        it.started = true;
        // The clone has started falling — hide the original so the user
        // doesn't see two of the same thing. Layout is preserved because
        // we use visibility:hidden, not display:none.
        hideOriginal(it.target);
      }

      // Integrate
      it.vy = Math.min(it.vy + GRAVITY, TERMINAL_V);
      it.vx *= 0.995;
      it.x += it.vx;
      it.y += it.vy;
      it.angle += it.angVel;

      // Floor collision
      const itemBot = it.y + it.rect.height;
      if (itemBot >= floorY) {
        it.y = floorY - it.rect.height;
        it.vy = -it.vy * BOUNCE_DAMP;
        it.vx *= FRICTION;
        it.angVel *= 0.6;
        // Settle if bounce energy is tiny
        if (Math.abs(it.vy) < 1.6) it.vy = 0;
      }
      // Side walls
      if (it.x < 0)                   { it.x = 0;                   it.vx = Math.abs(it.vx) * 0.6; }
      if (it.x + it.rect.width > vw)  { it.x = vw - it.rect.width;  it.vx = -Math.abs(it.vx) * 0.6; }

      it.clone.style.transform =
        `translate(${it.x}px, ${it.y}px) rotate(${it.angle}rad)`;
    }
    raf = requestAnimationFrame(step);
  }

  async function init(r) {
    await loadCSS();
    root = r;

    // Lava band at the bottom
    lavaBand = document.createElement('div');
    lavaBand.className = 'dp-lava-band';
    lavaBand.innerHTML = `
      <div class="dp-lava-glow"></div>
      <div class="dp-lava-surface"></div>
    `;
    root.appendChild(lavaBand);

    // Info chip
    const chip = document.createElement('div');
    chip.className = 'dp-lava-chip';
    chip.textContent = 'CLICK A FALLING ITEM TO RESCUE IT';
    root.appendChild(chip);

    // Snapshot the page
    const candidates = findCandidates();
    fallingItems = candidates.map(createOverlay);

    for (const it of fallingItems) {
      it.clone.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        rescueItem(it);
      });
      root.appendChild(it.clone);
    }

    raf = requestAnimationFrame(step);
  }

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    // Restore every original we hid — including ones still mid-fall
    for (const it of fallingItems) restoreOriginal(it.target);
    fallingItems = [];
    lavaBand = null;
    root = null;
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks.lava = { init, teardown };
})();
