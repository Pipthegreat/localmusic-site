// Aquarium Mode - the page becomes the back wall of a fish tank.
//
// Layers:
//   1. Blue-green wash overlay (multiply blend) tinting the page
//   2. Animated caustic shimmer at the top simulating water-surface light
//   3. Schools of small bubbles rising in clusters
//   4. Fish swimming across at different depths
//   5. Kelp swaying at the bottom-left and bottom-right corners
//   6. Cursor leaves a ripple

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  // Fish species - each has its own SVG and behavior bias
  const FISH = [
    {
      name: 'goldfish',
      w: 70, h: 36,
      // Bright orange, tropical
      svg: (id) => `
        <svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g${id}" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stop-color="#ffcf6b"/>
              <stop offset="55%"  stop-color="#ff8a36"/>
              <stop offset="100%" stop-color="#c0541a"/>
            </linearGradient>
          </defs>
          <!-- tail -->
          <polygon points="10,25 0,8 0,42" fill="url(#g${id})" opacity="0.9" class="dp-fish-tail"/>
          <!-- body -->
          <ellipse cx="55" cy="25" rx="38" ry="16" fill="url(#g${id})"/>
          <!-- top fin -->
          <path d="M 35 14 Q 55 0 75 14 Z" fill="#d76326" opacity="0.85"/>
          <!-- bottom fin -->
          <path d="M 40 36 Q 50 48 60 36 Z" fill="#d76326" opacity="0.85"/>
          <!-- eye -->
          <circle cx="78" cy="22" r="3.5" fill="#fff"/>
          <circle cx="79" cy="22" r="2"   fill="#000"/>
          <!-- gill stripe -->
          <path d="M 70 16 Q 72 25 70 34" stroke="#a0461a" stroke-width="1.2" fill="none" opacity="0.6"/>
        </svg>`
    },
    {
      name: 'blue-tang',
      w: 72, h: 42,
      svg: (id) => `
        <svg viewBox="0 0 100 56" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g${id}" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stop-color="#5fb8d6"/>
              <stop offset="50%"  stop-color="#2a6f9c"/>
              <stop offset="100%" stop-color="#143c5e"/>
            </linearGradient>
          </defs>
          <polygon points="8,28 0,8 0,48" fill="url(#g${id})" opacity="0.9" class="dp-fish-tail"/>
          <ellipse cx="54" cy="28" rx="40" ry="18" fill="url(#g${id})"/>
          <!-- signature black stripe -->
          <path d="M 30 12 Q 60 28 30 44" fill="#0a1b2e" opacity="0.8"/>
          <path d="M 36 14 Q 16 30 36 42 L 80 42 Q 88 28 80 14 Z" fill="url(#g${id})" opacity="0.7"/>
          <path d="M 60 6 Q 65 0 78 12" stroke="#143c5e" stroke-width="2" fill="none"/>
          <circle cx="78" cy="24" r="3.5" fill="#fff"/>
          <circle cx="79" cy="24" r="2"   fill="#000"/>
          <!-- yellow tail accent -->
          <polygon points="92,18 100,28 92,38" fill="#f7d24a" opacity="0.9"/>
        </svg>`
    },
    {
      name: 'minnow',
      w: 38, h: 16,
      svg: (id) => `
        <svg viewBox="0 0 80 32" xmlns="http://www.w3.org/2000/svg">
          <polygon points="6,16 0,4 0,28" fill="#b8d4dc" opacity="0.8" class="dp-fish-tail"/>
          <ellipse cx="42" cy="16" rx="32" ry="9" fill="#e0ecf1"/>
          <ellipse cx="42" cy="16" rx="32" ry="6" fill="#9bb8c2" opacity="0.5"/>
          <circle cx="64" cy="14" r="2.5" fill="#fff"/>
          <circle cx="64.5" cy="14" r="1.5" fill="#000"/>
        </svg>`
    },
    {
      name: 'lionfish',
      w: 90, h: 60,
      svg: (id) => `
        <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g${id}" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%"   stop-color="#a8431a"/>
              <stop offset="50%"  stop-color="#e88336"/>
              <stop offset="100%" stop-color="#fff1d8"/>
            </linearGradient>
          </defs>
          <!-- spines (top) -->
          <g stroke="#c46a26" stroke-width="1" fill="none">
            <path d="M 50 30 L 35 5"/>
            <path d="M 60 26 L 50 2"/>
            <path d="M 70 26 L 65 0"/>
            <path d="M 80 28 L 82 4"/>
          </g>
          <!-- tail -->
          <polygon points="12,40 0,18 0,62" fill="#b8501e" opacity="0.85" class="dp-fish-tail"/>
          <!-- body with stripes -->
          <ellipse cx="64" cy="40" rx="48" ry="18" fill="url(#g${id})"/>
          <g fill="#7a2f10" opacity="0.6">
            <rect x="30" y="24" width="3" height="32"/>
            <rect x="45" y="22" width="3" height="36"/>
            <rect x="62" y="22" width="3" height="36"/>
            <rect x="80" y="24" width="3" height="32"/>
          </g>
          <!-- spines (bottom) -->
          <g stroke="#c46a26" stroke-width="1" fill="none">
            <path d="M 55 56 L 50 80"/>
            <path d="M 70 56 L 70 80"/>
            <path d="M 82 56 L 86 80"/>
          </g>
          <circle cx="98" cy="36" r="3.5" fill="#fff"/>
          <circle cx="99" cy="36" r="2"   fill="#000"/>
        </svg>`
    },
  ];

  let styleEl = null;
  let root = null;
  let fishSpawnT = null, bubbleSpawnT = null;
  let raf = null;
  let fishes = [];
  let bubbles = [];
  let fishIdCounter = 0;
  let scale = 1;  // set on init from getScale()

  async function loadCSS() {
    if (document.getElementById('__dp-aqua-style')) return;
    const url = NS.getCSSURL('hacks/aquarium.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-aqua-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  function spawnFish() {
    if (!root) return;
    if (fishes.length > 8) return; // ~30% more concurrent fish
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const species = FISH[Math.floor(Math.random() * FISH.length)];
    const id = ++fishIdCounter;

    // Per-fish size jitter (0.56x-1.12x of base) × viewport scale so fish
    // are proportional to the iframe / screen
    const fishScale = (0.7 + Math.random() * 0.7) * 0.8 * scale;
    const w = species.w * fishScale;
    const h = species.h * fishScale;

    const fromLeft = Math.random() < 0.5;
    const y = vh * (0.1 + Math.random() * 0.75);
    const speed = (35 + Math.random() * 50) * scale; // px/sec
    const duration = (vw + w * 2) / speed * 1000;

    const el = document.createElement('div');
    el.className = `dp-fish ${fromLeft ? 'dp-fish-rtl' : 'dp-fish-ltr'}`;
    el.style.width  = `${w}px`;
    el.style.height = `${h}px`;
    el.style.top    = `${y}px`;
    el.innerHTML = species.svg(id);
    root.appendChild(el);

    const startX = fromLeft ? -w : vw + w;
    const endX   = fromLeft ?  vw + w : -w;

    // Slight vertical wave during swim
    const yDrift1 = (Math.random() - 0.5) * 60;
    const yDrift2 = (Math.random() - 0.5) * 60;

    const anim = el.animate([
      { transform: `translate(${startX}px, 0) ${fromLeft ? '' : 'scaleX(-1)'}` },
      { transform: `translate(${(startX+endX)/2}px, ${yDrift1}px) ${fromLeft ? '' : 'scaleX(-1)'}`, offset: 0.5 },
      { transform: `translate(${endX}px, ${yDrift2}px) ${fromLeft ? '' : 'scaleX(-1)'}` },
    ], {
      duration,
      easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
    });
    fishes.push(el);
    anim.onfinish = () => {
      el.remove();
      fishes = fishes.filter(f => f !== el);
    };
  }

  function spawnBubbleCluster() {
    if (!root) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Cluster origin from random bottom point
    const ox = 60 + Math.random() * (vw - 120);
    const n = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const size = (4 + Math.random() * 10) * scale;
      const el = document.createElement('div');
      el.className = 'dp-aqua-bubble';
      el.style.width = el.style.height = `${size}px`;
      el.style.left = `${ox + (Math.random() - 0.5) * 50}px`;
      el.style.top  = `${vh + 8}px`;
      root.appendChild(el);

      const dur = 4500 + Math.random() * 3500;
      const drift = (Math.random() - 0.5) * 80;
      const anim = el.animate([
        { transform: `translateY(0)`,             opacity: 0 },
        { transform: `translateY(-30px)`,         opacity: 0.7, offset: 0.08 },
        { transform: `translateY(${-vh + 40}px) translateX(${drift}px)`, opacity: 0 },
      ], { duration: dur, easing: 'cubic-bezier(0.5, 0.05, 0.5, 1)' });

      bubbles.push(el);
      anim.onfinish = () => {
        el.remove();
        bubbles = bubbles.filter(b => b !== el);
      };
    }
  }

  // Cursor ripple
  function onMouseMove(e) {
    if (!root) return;
    if (Math.random() > 0.18) return; // throttle
    const r = document.createElement('div');
    r.className = 'dp-aqua-ripple';
    r.style.left = `${e.clientX - 12}px`;
    r.style.top  = `${e.clientY - 12}px`;
    root.appendChild(r);
    setTimeout(() => r.remove(), 900);
  }

  async function init(r) {
    await loadCSS();
    root = r;
    fishes = [];
    bubbles = [];
    scale = (NS.getScale && NS.getScale()) || 1;

    // Background layers (water wash, caustic shimmer, kelp)
    const wash = document.createElement('div');
    wash.className = 'dp-aqua-wash';
    root.appendChild(wash);

    const caustic = document.createElement('div');
    caustic.className = 'dp-aqua-caustic';
    root.appendChild(caustic);

    // Kelp sized by viewport scale - was 120×320 fixed, now shrinks
    // proportionally on small screens / iframes.
    const kelpW = Math.round(120 * scale);
    const kelpH = Math.round(320 * scale);

    // Kelp (left)
    const kelpL = document.createElement('div');
    kelpL.className = 'dp-aqua-kelp dp-aqua-kelp-left';
    kelpL.style.width  = `${kelpW}px`;
    kelpL.style.height = `${kelpH}px`;
    kelpL.innerHTML = `
      <svg viewBox="0 0 120 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <g fill="#1a5a3b" opacity="0.68">
          <path d="M 20 320 C 16 260 30 200 18 140 C 10 90 24 40 22 0 L 32 0 C 28 50 38 100 28 150 C 18 210 36 270 30 320 Z"/>
          <path d="M 56 320 C 52 250 68 180 56 110 C 50 70 60 30 58 0 L 68 0 C 66 35 70 80 62 130 C 54 200 70 280 64 320 Z"/>
          <path d="M 92 320 C 88 270 100 220 90 170 C 84 130 94 80 90 30 L 100 30 C 100 80 104 130 96 180 C 88 240 98 290 100 320 Z"/>
        </g>
      </svg>`;
    root.appendChild(kelpL);

    // Kelp (right) - mirrored via CSS
    const kelpR = document.createElement('div');
    kelpR.className = 'dp-aqua-kelp dp-aqua-kelp-right';
    kelpR.style.width  = `${kelpW}px`;
    kelpR.style.height = `${kelpH}px`;
    kelpR.innerHTML = kelpL.innerHTML;
    root.appendChild(kelpR);

    // (sand band removed - kelp roots straight into the bottom edge now)

    // Seed some initial bubbles + fish
    for (let i = 0; i < 3; i++) setTimeout(spawnBubbleCluster, i * 600);
    for (let i = 0; i < 4; i++) setTimeout(spawnFish, i * 1000);

    fishSpawnT   = setInterval(spawnFish,          2500); // ~30% faster spawn
    bubbleSpawnT = setInterval(spawnBubbleCluster, 1700);

    document.addEventListener('mousemove', onMouseMove, { passive: true });
  }

  function teardown() {
    if (fishSpawnT)   clearInterval(fishSpawnT);
    if (bubbleSpawnT) clearInterval(bubbleSpawnT);
    document.removeEventListener('mousemove', onMouseMove);
    fishSpawnT = bubbleSpawnT = null;
    fishes = [];
    bubbles = [];
    root = null;
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks.aquarium = { init, teardown };
})();
