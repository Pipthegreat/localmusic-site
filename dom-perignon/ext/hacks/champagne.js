// Champagne Bubbles - the house signature.
//
// Bubbles rise continuously from the bottom of the viewport with realistic
// physics: smaller bubbles rise faster (less drag relative to buoyancy),
// all wobble sinusoidally as they ascend. Click any bubble to pop. Every
// ~28s a champagne cork ricochets across the screen with rotation.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const SPAWN_INTERVAL_MS = 90;     // how often a new bubble appears
  const MAX_BUBBLES       = 70;
  // Cork shows up roughly 12% as often as before (was every 28s).
  const CORK_INTERVAL_MS  = 240000; // ~4 minutes

  let styleEl = null;
  let spawnT = null, corkT = null, raf = null;
  let bubbles = [];
  let corks = [];
  let root = null;
  let bubbleScale = 1;

  async function loadCSS() {
    if (document.getElementById('__dp-champ-style')) return;
    const url = NS.getCSSURL('hacks/champagne.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-champ-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  // initialY: pass a Y position to start the bubble mid-rise (used for
  // pre-population on init). Omit to spawn from below the viewport.
  function spawnBubble(initialY) {
    if (!root || bubbles.length >= MAX_BUBBLES) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Power-law size distribution: lots of small, few big. Max size scales
    // with viewport so small iframes don't get oversized bubbles.
    const size = Math.pow(Math.random(), 2) * (32 * bubbleScale) + 6;
    const el = document.createElement('div');
    el.className = 'dp-bubble';
    el.style.width = el.style.height = `${size}px`;
    root.appendChild(el);

    const bubble = {
      el,
      size,
      x: Math.random() * vw,
      y: initialY !== undefined ? initialY : vh + size,
      // Speed inversely related to size - small bubbles dart up
      vy: -(0.6 + 1.4 / Math.sqrt(size)),
      // Wobble: phase + frequency vary per bubble
      wobble: Math.random() * Math.PI * 2,
      wobbleRate: 0.018 + Math.random() * 0.018,
      wobbleAmp: 0.6 + Math.random() * 1.4,
    };
    // ~20% of bubbles auto-pop mid-rise. Subtle scale + fade, distinct
    // from the more dramatic click-pop. Pop fires at a randomised time
    // 2-6s after spawn so they go off across the field, not in a wave.
    if (Math.random() < 0.20) {
      bubble.autoPopAt = performance.now() + 2000 + Math.random() * 4000;
    }
    el.addEventListener('click', () => popBubble(bubble), { once: true });
    bubble.el.style.pointerEvents = 'auto'; // bubbles ARE clickable
    bubbles.push(bubble);
  }

  // Freeze the bubble's current screen position into CSS custom
  // properties so the pop keyframe can reference them — otherwise the
  // CSS animation's transform would overwrite the inline translate and
  // the bubble would visually jump to viewport top-left as it pops.
  function freezePosition(b) {
    const x = b.x + Math.sin(b.wobble) * b.wobbleAmp;
    b.el.style.setProperty('--pop-x', `${x}px`);
    b.el.style.setProperty('--pop-y', `${b.y}px`);
  }

  function popBubble(b) {
    if (b.popped) return;
    b.popped = true;
    freezePosition(b);
    b.el.classList.add('dp-bubble-pop');
    setTimeout(() => {
      b.el.remove();
      bubbles = bubbles.filter(x => x !== b);
    }, 420);
  }

  // Auto-pop: gentler scale-to-1.25 + fade over 320ms. Reads as a
  // small surface flicker rather than a click-pop's full burst.
  function autoPopBubble(b) {
    if (b.popped) return;
    b.popped = true;
    freezePosition(b);
    b.el.classList.add('dp-bubble-pop-subtle');
    setTimeout(() => {
      b.el.remove();
      bubbles = bubbles.filter(x => x !== b);
    }, 320);
  }

  function spawnCork() {
    if (!root) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fromLeft = Math.random() < 0.5;

    // 🍾 emoji replaces the hand-drawn cork SVG - reads instantly and
    // matches the brand cue without rendering bespoke artwork.
    const el = document.createElement('div');
    el.className = 'dp-cork';
    el.textContent = '🍾';
    root.appendChild(el);

    const startX = fromLeft ? -120 : vw + 120;
    const endX   = fromLeft ? vw + 120 : -120;
    const startY = vh - 80 - Math.random() * 60;
    // Slight arc - go up then come down (parabola via two keyframes)
    const peakY  = startY - (vh * 0.4);
    const endY   = startY + 40;

    el.style.transform = `translate(${startX}px, ${startY}px) rotate(0deg)`;
    el.style.pointerEvents = 'none';

    // Slower travel + gentler rotation = legible cork. Cork takes ~6s to
    // arc across the screen with one calm half-turn.
    const totalRotation = (fromLeft ? 1 : -1) * (180 + Math.random() * 180);
    const animation = el.animate([
      { transform: `translate(${startX}px, ${startY}px) rotate(0deg)` },
      { transform: `translate(${(startX+endX)/2}px, ${peakY}px) rotate(${totalRotation/2}deg)`, offset: 0.5 },
      { transform: `translate(${endX}px, ${endY}px) rotate(${totalRotation}deg)` },
    ], {
      duration: 5400 + Math.random() * 1600,
      easing: 'cubic-bezier(0.32, 0.02, 0.72, 1.0)',
    });

    corks.push(el);
    animation.onfinish = () => {
      el.remove();
      corks = corks.filter(c => c !== el);
    };
  }

  function step() {
    const now = performance.now();
    for (const b of bubbles) {
      if (b.popped) continue;
      // Auto-pop check fires before the position update so the freeze
      // captures the position the user just saw, not next-frame's.
      if (b.autoPopAt && now >= b.autoPopAt) {
        autoPopBubble(b);
        continue;
      }
      b.wobble += b.wobbleRate;
      b.y += b.vy;
      const drift = Math.sin(b.wobble) * b.wobbleAmp;
      b.el.style.transform = `translate(${b.x + drift}px, ${b.y}px)`;

      // Remove bubbles that have escaped the top
      if (b.y + b.size < 0) {
        b.popped = true;
        b.el.remove();
      }
    }
    bubbles = bubbles.filter(b => !b.popped);
    raf = requestAnimationFrame(step);
  }

  async function init(r) {
    await loadCSS();
    root = r;
    bubbles = [];
    corks = [];
    bubbleScale = (NS.getScale && NS.getScale()) || 1;

    // Pre-populate the viewport at varied Y positions so the user sees a
    // fully-bubbling page from frame one - no opening wave at the bottom,
    // no empty gaps to wait through.
    const vh = window.innerHeight;
    for (let i = 0; i < 32; i++) {
      spawnBubble(Math.random() * vh);
    }

    // Then trickle in new bubbles from below with JITTERED intervals.
    // The previous constant-90ms cadence visibly clustered: each tick fed
    // a uniformly-distributed bubble into a stream of variable rise speeds,
    // and the periodic input collided with the periodic eye to form bands.
    // Randomised spacing breaks that resonance.
    const queueNext = () => {
      const delay = 40 + Math.random() * 140; // 40-180ms, avg ~110ms
      spawnT = setTimeout(() => {
        spawnBubble();
        queueNext();
      }, delay);
    };
    queueNext();

    corkT = setInterval(spawnCork, CORK_INTERVAL_MS);
    raf   = requestAnimationFrame(step);
  }

  function teardown() {
    // spawnT is now a setTimeout (recursive), not setInterval - clearTimeout
    // also clears interval handles, so this works for both forms.
    if (spawnT) clearTimeout(spawnT);
    if (corkT)  clearInterval(corkT);
    if (raf)    cancelAnimationFrame(raf);
    spawnT = corkT = raf = null;
    bubbles = [];
    corks = [];
    root = null;
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks.champagne = { init, teardown };
})();
