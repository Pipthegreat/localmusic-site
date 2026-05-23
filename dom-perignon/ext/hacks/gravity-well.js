// Gravity Well — page elements slowly succumb to gravity.
//
// On activation, scans the page for visible images, headings, and buttons.
// Each one starts falling on a staggered delay with very soft gravity, so
// the descent feels like slow sinking rather than dropping. As items land
// they stack on a column-shelf grid — pieces rest on top of pieces that
// fell before them rather than all overlapping at the floor.
//
// Re-scans the page every 3.5 seconds (batch of 6 per scan) so new
// content keeps falling indefinitely. The page eventually piles up.
//
// Click any falling clone to rescue it: the clone animates back to the
// original position, the original element becomes visible again, the
// clone is removed. Page DOM is never mutated — clones are fixed-position
// overlays; the original element just gets visibility:hidden while its
// clone is in flight.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const GRAVITY            = 0.05;   // px/frame² — soft pull
  const TERMINAL_V         = 4.5;    // px/frame — gentle terminal velocity
  const RESCAN_INTERVAL_MS = 3500;
  const ITEMS_PER_SCAN     = 6;
  const COLUMNS            = 48;     // shelf resolution

  let styleEl = null;
  let chipEl  = null;
  let raf = null;
  let scanT = null;
  let fallingItems = [];
  let shelves = [];                 // shelves[col] = current top-of-pile y for that column
  let root = null;

  async function loadCSS() {
    if (document.getElementById('__dp-gw-style')) return;
    const url = NS.getCSSURL('hacks/gravity-well.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-gw-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  // ── Shelf helpers ─────────────────────────────────────────────────────
  function initShelves() {
    shelves = new Array(COLUMNS).fill(window.innerHeight);
  }
  function colFromX(x) {
    return Math.max(0, Math.min(COLUMNS - 1,
      Math.floor((x / window.innerWidth) * COLUMNS)));
  }
  function minShelfAcross(left, width) {
    const c1 = colFromX(left);
    const c2 = colFromX(left + width);
    let min = window.innerHeight;
    for (let c = c1; c <= c2; c++) {
      if (shelves[c] < min) min = shelves[c];
    }
    return min;
  }
  function raiseShelves(left, width, newTop) {
    const c1 = colFromX(left);
    const c2 = colFromX(left + width);
    for (let c = c1; c <= c2; c++) {
      if (newTop < shelves[c]) shelves[c] = newTop;
    }
  }

  // ── Candidate discovery ───────────────────────────────────────────────
  function findCandidates() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const out = [];
    const seen = new Set();
    function consider(el) {
      if (seen.has(el) || el.__dpGwProcessed) return;
      if (el.closest && el.closest('#__dom-perignon-root')) return;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width < 28 || r.height < 28) return;
      if (r.width > 360 || r.height > 360) return;
      if (r.right < 0 || r.bottom < 0) return;
      if (r.left > vw || r.top > vh) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
      out.push({ el, rect: r });
    }
    document.querySelectorAll('img').forEach(consider);
    document.querySelectorAll('button, h1, h2, h3, a[role="button"]').forEach(consider);
    return out;
  }

  // ── Per-item overlay + physics ────────────────────────────────────────
  function createOverlay(item) {
    const { el, rect } = item;
    el.__dpGwProcessed = true;

    const clone = el.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('dp-gw-item');
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
    return {
      clone, target: el, rect,
      origLeft: rect.left, origTop: rect.top,
      x: rect.left, y: rect.top,
      vy: 0,
      delay: 600 + Math.random() * 5400, // start falling 0.6–6s after creation
      started: false, startedAt: 0,
      rescued: false, settled: false,
    };
  }

  function hideOriginal(el) {
    if (el.__dpGwPriorVis !== undefined) return;
    el.__dpGwPriorVis = el.style.visibility || '';
    el.style.visibility = 'hidden';
  }
  function restoreOriginal(el) {
    if (el.__dpGwPriorVis === undefined) return;
    el.style.visibility = el.__dpGwPriorVis;
    delete el.__dpGwPriorVis;
  }

  function rescueItem(item) {
    if (item.rescued) return;
    item.rescued = true;
    item.clone.style.transition =
      'transform 760ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    item.clone.style.transform =
      `translate(${item.origLeft}px, ${item.origTop}px)`;
    setTimeout(() => {
      restoreOriginal(item.target);
      item.clone.remove();
    }, 760);
  }

  function step(t) {
    for (const it of fallingItems) {
      if (it.rescued || it.settled) continue;
      if (!it.started) {
        if (!it.startedAt) it.startedAt = t;
        if (t - it.startedAt < it.delay) continue;
        it.started = true;
        hideOriginal(it.target);
      }
      it.vy = Math.min(it.vy + GRAVITY, TERMINAL_V);
      it.y += it.vy;

      const shelfTop = minShelfAcross(it.x, it.rect.width);
      if (it.y + it.rect.height >= shelfTop) {
        it.y = shelfTop - it.rect.height;
        it.vy = 0;
        it.settled = true;
        raiseShelves(it.x, it.rect.width, it.y);
      }
      it.clone.style.transform = `translate(${it.x}px, ${it.y}px)`;
    }
    raf = requestAnimationFrame(step);
  }

  function rescan() {
    if (!root) return;
    const batch = findCandidates().slice(0, ITEMS_PER_SCAN);
    for (const item of batch) {
      const overlay = createOverlay(item);
      overlay.clone.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        rescueItem(overlay);
      });
      root.appendChild(overlay.clone);
      fallingItems.push(overlay);
    }
  }

  function onResize() {
    const vh = window.innerHeight;
    shelves = new Array(COLUMNS).fill(vh);
    for (const it of fallingItems) {
      if (it.settled && !it.rescued) {
        raiseShelves(it.x, it.rect.width, it.y);
      }
    }
  }

  async function init(r) {
    await loadCSS();
    root = r;
    fallingItems = [];
    initShelves();

    chipEl = document.createElement('div');
    chipEl.className = 'dp-gw-chip';
    chipEl.textContent = 'EVERYTHING IS FALLING · CLICK TO RESCUE';
    root.appendChild(chipEl);

    setTimeout(rescan, 250);
    scanT = setInterval(rescan, RESCAN_INTERVAL_MS);
    raf = requestAnimationFrame(step);
    window.addEventListener('resize', onResize);
  }

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    if (scanT) clearInterval(scanT);
    window.removeEventListener('resize', onResize);
    for (const it of fallingItems) {
      restoreOriginal(it.target);
      delete it.target.__dpGwProcessed;
    }
    fallingItems = [];
    shelves = [];
    chipEl = null;
    raf = scanT = null;
    root = null;
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks['gravity-well'] = { init, teardown };
})();
