// Gravity Well - page elements slowly succumb to gravity.
//
// On activation, scans the page for visible images, headings, and buttons.
// Each one starts falling on a staggered delay with very soft gravity, so
// the descent feels like slow sinking rather than dropping. As items land
// they stack on a column-shelf grid - pieces rest on top of pieces that
// fell before them rather than all overlapping at the floor.
//
// Re-scans the page every 3.5 seconds (batch of 6 per scan) so new
// content keeps falling indefinitely. The page eventually piles up.
//
// Click any falling clone to rescue it: the clone animates back to the
// original position, the original element becomes visible again, the
// clone is removed. Page DOM is never mutated - clones are fixed-position
// overlays; the original element just gets visibility:hidden while its
// clone is in flight.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const GRAVITY            = 0.05;   // px/frame² - soft pull
  const TERMINAL_V         = 4.5;    // px/frame - gentle terminal velocity
  const RESCAN_INTERVAL_MS = 2500;   // faster cadence for visible activity
  const ITEMS_PER_SCAN     = 8;
  const COLUMNS            = 48;     // shelf resolution
  // ── Physics constants (v1.2.5: bounce + drift restored) ─────────────
  const BOUNCE_DAMP        = 0.4;    // vertical velocity retained on each bounce
  const HORIZONTAL_DAMP    = 0.985;  // per-frame horizontal friction
  const ANGULAR_DAMP       = 0.99;   // per-frame angular friction
  const BOUNCE_HORIZ_DAMP  = 0.72;   // horizontal velocity damped on bounce
  const WALL_BOUNCE_DAMP   = 0.55;   // velocity retained on side wall hit
  const SETTLE_VY          = 0.55;   // |vy| below this on contact = could settle
  const SETTLE_VX          = 0.25;   // |vx| must also be small to fully settle
  const SPAWN_VX_RANGE     = 0.9;    // ± initial horizontal velocity on spawn
  const SPAWN_ANGVEL_RANGE = 0.018;  // ± initial angular velocity on spawn
  const BOUNCE_ANGVEL_KICK = 0.013;  // ± random tilt added on each bounce

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

  // How "well-supported" is an item landing at this shelf height? Returns
  // { supportFrac, leftSupport, rightSupport } where supportFrac is the
  // share of the item's column range whose shelves are at-or-near the
  // landing height (within SHELF_TOLERANCE). Anything below that fraction
  // means most of the item is dangling over empty space or a much deeper
  // shelf - physically the item should tip and slide, not settle.
  const SHELF_TOLERANCE = 8;     // px - within this counts as "same surface"
  const MIN_SUPPORT_FRAC = 0.4;  // below this triggers tip-off behaviour
  function evaluateSupport(left, width, shelfTop) {
    const c1 = colFromX(left);
    const c2 = colFromX(left + width);
    const midCol = (c1 + c2) / 2;
    let supported = 0, total = 0;
    let leftSupport = 0, rightSupport = 0;
    for (let c = c1; c <= c2; c++) {
      total++;
      if (shelves[c] <= shelfTop + SHELF_TOLERANCE) {
        supported++;
        if (c < midCol) leftSupport++;
        else            rightSupport++;
      }
    }
    return {
      supportFrac: total > 0 ? supported / total : 1,
      leftSupport,
      rightSupport,
    };
  }

  // ── Candidate discovery ───────────────────────────────────────────────
  // Min/max element-dimension bounds scale with viewport so we catch
  // smaller things in small iframes (the KF 20×20 logo, for instance)
  // and skip elements that span the whole tiny preview.
  function findCandidates() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = (NS.getScale && NS.getScale()) || 1;
    const minDim = Math.max(14, Math.round(28 * scale));
    // Hard cap on candidate size: product cards / hero images that are
    // 200px+ dominate the viewport when they fall and read as broken.
    // 150px at desktop / 75px floor at small viewports captures logos,
    // avatars, header icons, and buttons but excludes large media.
    const maxDim = Math.max(75, Math.round(150 * scale));
    const out = [];
    const seen = new Set();
    function consider(el) {
      if (seen.has(el) || el.__dpGwProcessed) return;
      if (el.closest && el.closest('#__dom-perignon-root')) return;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width < minDim || r.height < minDim) return;
      if (r.width > maxDim || r.height > maxDim) return;
      if (r.right < 0 || r.bottom < 0) return;
      if (r.left > vw || r.top > vh) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
      out.push({ el, rect: r });
    }
    document.querySelectorAll('img').forEach(consider);
    document.querySelectorAll('button, h1, h2, h3, a[role="button"], a.btn').forEach(consider);
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
      // Initial velocities + spin: a touch of horizontal drift and a
      // mild rotation so items don't fall in perfectly identical lines.
      vx: (Math.random() - 0.5) * SPAWN_VX_RANGE,
      vy: 0,
      angle: 0,
      angVel: (Math.random() - 0.5) * SPAWN_ANGVEL_RANGE,
      // Snappier delay so previews show the fall within a couple seconds
      delay: 200 + Math.random() * 2200, // 0.2-2.4s
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
    // Explicit rotate(0) so the interpolation unwinds whatever tilt the
    // item picked up during the fall.
    item.clone.style.transform =
      `translate(${item.origLeft}px, ${item.origTop}px) rotate(0rad)`;
    setTimeout(() => {
      restoreOriginal(item.target);
      item.clone.remove();
    }, 760);
  }

  function step(t) {
    const vw = window.innerWidth;
    for (const it of fallingItems) {
      if (it.rescued || it.settled) continue;
      if (!it.started) {
        if (!it.startedAt) it.startedAt = t;
        if (t - it.startedAt < it.delay) continue;
        it.started = true;
        hideOriginal(it.target);
      }
      // Integrate: gravity on vy, friction on vx + angVel
      it.vy = Math.min(it.vy + GRAVITY, TERMINAL_V);
      it.vx *= HORIZONTAL_DAMP;
      it.angVel *= ANGULAR_DAMP;

      // Horizontal motion gate: refuse to move INTO a pile.
      // Without this check, an item drifting sideways during its fall
      // can pass through a settled pile (because at the old x the shelf
      // was further down) and then "blink" up to the pile's top the
      // next frame when floor-collision fires. Bouncing the vx off the
      // side of the pile keeps the visual continuous.
      const proposedX = it.x + it.vx;
      const shelfAtProposed = minShelfAcross(proposedX, it.rect.width);
      if (it.y + it.rect.height > shelfAtProposed + 2) {
        // Bottom edge would end up below the shelf at the new x - hit a wall
        it.vx = -it.vx * WALL_BOUNCE_DAMP;
        it.angVel += (Math.random() - 0.5) * 0.012;
        // Don't apply horizontal motion this frame; x stays where it was
      } else {
        it.x = proposedX;
      }

      it.y += it.vy;
      it.angle += it.angVel;

      // Side wall collisions - bounce inward with damping
      if (it.x < 0) {
        it.x = 0;
        it.vx = Math.abs(it.vx) * WALL_BOUNCE_DAMP;
      } else if (it.x + it.rect.width > vw) {
        it.x = vw - it.rect.width;
        it.vx = -Math.abs(it.vx) * WALL_BOUNCE_DAMP;
      }

      // Floor / pile collision - bounce, slide, tip, or settle
      const shelfTop = minShelfAcross(it.x, it.rect.width);
      if (it.y + it.rect.height >= shelfTop) {
        it.y = shelfTop - it.rect.height;

        const slowVy = Math.abs(it.vy) < SETTLE_VY;
        const slowVx = Math.abs(it.vx) < SETTLE_VX;

        // First: check whether the item is balanced on this shelf or
        // perched on a narrow support. If most of the item's footprint
        // hangs over a deeper shelf, it tips and keeps falling.
        const sup = evaluateSupport(it.x, it.rect.width, shelfTop);
        const unbalanced = sup.supportFrac < MIN_SUPPORT_FRAC;

        if (unbalanced) {
          // Tip toward the LESS supported side. If support is mostly on
          // the left, the right is hanging and the item tips right.
          const tipDir = sup.leftSupport > sup.rightSupport ? 1 : -1;
          it.vx += tipDir * 1.6;
          it.angVel += tipDir * 0.05;
          // Bleed off most of the vertical impact - the item is mostly
          // rotating/sliding now, not bouncing
          it.vy = Math.max(0.4, it.vy * 0.25);
          // Don't claim the shelf - the item is still moving
        } else if (slowVy && slowVx) {
          // Energy spent AND well-supported - settle here and claim shelf
          it.vy = 0;
          it.vx = 0;
          it.angVel = 0;
          it.settled = true;
          raiseShelves(it.x, it.rect.width, it.y);
        } else if (slowVy) {
          // Sliding along the shelf surface - kill vy but keep gliding horizontally
          it.vy = 0;
        } else {
          // Bounce: reverse vy with damping, dampen vx, kick angVel so the
          // item visibly tilts on impact (no two landings are identical)
          it.vy = -Math.abs(it.vy) * BOUNCE_DAMP;
          it.vx *= BOUNCE_HORIZ_DAMP;
          it.angVel += (Math.random() - 0.5) * BOUNCE_ANGVEL_KICK;
        }
      }

      it.clone.style.transform =
        `translate(${it.x}px, ${it.y}px) rotate(${it.angle}rad)`;
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
