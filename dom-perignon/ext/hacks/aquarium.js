// Aquarium Mode - the page becomes the back wall of a fish tank.
//
// Layers:
//   1. Blue-green wash overlay (multiply blend) tinting the page
//   2. Animated caustic shimmer at the top simulating water-surface light
//   3. Schools of small bubbles rising in clusters
//   4. Fish swimming across at different depths
//   5. Kelp swaying at the bottom-left and bottom-right corners
//   6. Cursor leaves a ripple
//
// v1.5.19: fish SVGs rebuilt with pectoral fins, eye highlights, scale
// detail, and gradient depth. Animations split per-part — tail wiggle,
// body skew, eye blink, pec-fin flutter, lionfish spine drift — so each
// fish moves like a small animated character rather than a single
// rocking shape. Kelp split into 5 strands per cluster, each with its
// own sway phase. Frond accents twist independently on top.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  // Fish species — each SVG carries the same set of named groups
  // (.dp-fish-tail, .dp-fish-body, .dp-fish-pec, .dp-fish-eye) so the
  // CSS animations target every species uniformly.
  const FISH = [
    {
      name: 'goldfish',
      w: 70, h: 36,
      svg: (id) => `
        <svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g${id}" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stop-color="#ffcf6b"/>
              <stop offset="55%"  stop-color="#ff8a36"/>
              <stop offset="100%" stop-color="#c0541a"/>
            </linearGradient>
          </defs>
          <g class="dp-fish-tail">
            <polygon points="14,25 0,4 0,46" fill="url(#g${id})" opacity="0.92"/>
            <polygon points="12,25 4,14 4,36" fill="#a0461a" opacity="0.45"/>
          </g>
          <ellipse class="dp-fish-body" cx="55" cy="25" rx="38" ry="16" fill="url(#g${id})"/>
          <!-- belly highlight -->
          <ellipse cx="55" cy="30" rx="32" ry="7" fill="rgba(255,235,180,0.32)"/>
          <!-- scale arcs -->
          <g stroke="rgba(160,70,26,0.32)" stroke-width="0.5" fill="none">
            <path d="M 40 19 Q 47 23 40 28"/>
            <path d="M 52 17 Q 60 23 52 28"/>
            <path d="M 64 17 Q 72 23 64 28"/>
            <path d="M 74 19 Q 80 23 74 28"/>
          </g>
          <!-- dorsal fin -->
          <path d="M 35 14 Q 55 0 75 14 L 70 17 Q 55 7 40 17 Z" fill="#d76326" opacity="0.85"/>
          <!-- ventral fin -->
          <path d="M 42 36 Q 50 48 58 36 Z" fill="#d76326" opacity="0.7"/>
          <!-- pectoral fin (flutters) -->
          <g class="dp-fish-pec">
            <path d="M 64 30 Q 56 42 50 38 Q 60 34 64 30 Z" fill="#b85120" opacity="0.78"/>
          </g>
          <!-- gill -->
          <path d="M 74 17 Q 76 25 74 33" stroke="#922f0e" stroke-width="1" fill="none" opacity="0.55"/>
          <!-- eye (blinks) -->
          <g class="dp-fish-eye">
            <circle cx="80" cy="22" r="4" fill="#fff"/>
            <circle cx="81" cy="22" r="2.4" fill="#0a0a0a"/>
            <circle cx="79.5" cy="20.5" r="1.1" fill="rgba(255,255,255,0.75)"/>
          </g>
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
          <!-- yellow Dory-style tail -->
          <g class="dp-fish-tail">
            <polygon points="12,28 -2,2 -2,54" fill="#f7d24a" opacity="0.95"/>
            <polygon points="10,28 2,12 2,44" fill="#d6a924" opacity="0.55"/>
          </g>
          <ellipse class="dp-fish-body" cx="54" cy="28" rx="40" ry="18" fill="url(#g${id})"/>
          <!-- signature dark mark on the body -->
          <path d="M 28 12 Q 60 28 28 44 L 32 28 Z" fill="#0a1b2e" opacity="0.78"/>
          <!-- belly highlight -->
          <ellipse cx="56" cy="36" rx="34" ry="5" fill="rgba(220,250,255,0.20)"/>
          <!-- dorsal fin -->
          <path d="M 40 8 Q 60 -2 78 12 L 74 16 Q 60 6 42 16 Z" fill="#143c5e" opacity="0.88"/>
          <!-- ventral fin -->
          <path d="M 50 44 Q 60 54 70 44 Z" fill="#143c5e" opacity="0.72"/>
          <g class="dp-fish-pec">
            <path d="M 62 34 Q 52 46 46 42 Q 58 36 62 34 Z" fill="#2a6f9c" opacity="0.78"/>
          </g>
          <path d="M 74 18 Q 76 28 74 38" stroke="#0a1b2e" stroke-width="1" fill="none" opacity="0.55"/>
          <g class="dp-fish-eye">
            <circle cx="80" cy="24" r="4" fill="#fff"/>
            <circle cx="81" cy="24" r="2.4" fill="#0a0a0a"/>
            <circle cx="79.5" cy="22.5" r="1.1" fill="rgba(255,255,255,0.75)"/>
          </g>
        </svg>`
    },
    {
      name: 'minnow',
      w: 38, h: 16,
      svg: (id) => `
        <svg viewBox="0 0 80 32" xmlns="http://www.w3.org/2000/svg">
          <g class="dp-fish-tail">
            <polygon points="8,16 -2,2 0,30" fill="#b8d4dc" opacity="0.8"/>
          </g>
          <ellipse class="dp-fish-body" cx="42" cy="16" rx="32" ry="9" fill="#e0ecf1"/>
          <ellipse cx="42" cy="13" rx="32" ry="5" fill="rgba(255,255,255,0.42)"/>
          <ellipse cx="42" cy="20" rx="32" ry="5" fill="#9bb8c2" opacity="0.5"/>
          <!-- side line -->
          <path d="M 16 16 Q 42 18 70 16" stroke="#7a9aa6" stroke-width="0.6" fill="none" opacity="0.45"/>
          <!-- gill -->
          <path d="M 58 12 Q 56 16 58 20" stroke="#7a9aa6" stroke-width="0.8" fill="none" opacity="0.5"/>
          <g class="dp-fish-eye">
            <circle cx="64" cy="14" r="2.5" fill="#fff"/>
            <circle cx="64.5" cy="14" r="1.5" fill="#0a0a0a"/>
            <circle cx="63.7" cy="13.3" r="0.8" fill="rgba(255,255,255,0.7)"/>
          </g>
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
          <!-- top spines (slow drift) -->
          <g class="dp-lion-spines-top" stroke="#c46a26" stroke-width="1.2" fill="none" opacity="0.78">
            <path d="M 40 28 C 36 18 42 8 38 0"/>
            <path d="M 52 24 C 50 14 56 6 52 -2"/>
            <path d="M 66 22 C 66 12 72 4 66 -4"/>
            <path d="M 80 24 C 80 14 86 6 80 -2"/>
            <path d="M 92 28 C 94 18 90 8 96 0"/>
          </g>
          <g class="dp-fish-tail">
            <polygon points="14,40 -2,12 -2,68" fill="#b8501e" opacity="0.88"/>
            <polygon points="12,40 4,22 4,58" fill="#7a3210" opacity="0.5"/>
          </g>
          <ellipse class="dp-fish-body" cx="64" cy="40" rx="48" ry="18" fill="url(#g${id})"/>
          <!-- vertical stripes -->
          <g fill="#7a2f10" opacity="0.65">
            <path d="M 28 24 Q 30 40 28 56 L 32 56 Q 34 40 32 24 Z"/>
            <path d="M 44 22 Q 46 40 44 58 L 48 58 Q 50 40 48 22 Z"/>
            <path d="M 60 22 Q 62 40 60 58 L 64 58 Q 66 40 64 22 Z"/>
            <path d="M 78 24 Q 80 40 78 56 L 82 56 Q 84 40 82 24 Z"/>
          </g>
          <!-- bottom spines (slow drift, opposite phase) -->
          <g class="dp-lion-spines-bottom" stroke="#c46a26" stroke-width="1.2" fill="none" opacity="0.78">
            <path d="M 50 56 C 50 66 44 74 48 84"/>
            <path d="M 64 56 C 66 66 60 74 64 84"/>
            <path d="M 78 56 C 78 66 84 74 80 84"/>
          </g>
          <g class="dp-fish-pec">
            <path d="M 80 50 Q 70 64 64 60 Q 76 54 80 50 Z" fill="#a8431a" opacity="0.7"/>
          </g>
          <g class="dp-fish-eye">
            <circle cx="100" cy="36" r="4" fill="#fff"/>
            <circle cx="101" cy="36" r="2.4" fill="#0a0a0a"/>
            <circle cx="99.5" cy="34.5" r="1.1" fill="rgba(255,255,255,0.75)"/>
          </g>
        </svg>`
    },
  ];

  // Kelp cluster — 5 strands with individual sway, plus 5 frond shimmers
  // that twist independently on top. Each strand gets a unique class so
  // the CSS can give them different periods + offsets.
  const KELP_SVG = `
    <svg viewBox="0 0 120 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <g fill="#1a5a3b">
        <path class="dp-kelp-strand s1" d="M 10 320 C 6 250 22 190 12 130 C 4 80 18 30 14 0 L 22 0 C 20 40 28 90 18 150 C 8 220 26 280 22 320 Z" opacity="0.72"/>
        <path class="dp-kelp-strand s2" d="M 32 320 C 28 260 42 210 30 150 C 22 100 36 50 34 0 L 42 0 C 40 50 50 95 38 145 C 30 200 44 270 40 320 Z" opacity="0.68"/>
        <path class="dp-kelp-strand s3" d="M 56 320 C 52 250 68 180 56 110 C 50 70 60 30 58 0 L 68 0 C 66 35 70 80 62 130 C 54 200 70 280 64 320 Z" opacity="0.78"/>
        <path class="dp-kelp-strand s4" d="M 80 320 C 76 260 88 200 80 140 C 74 100 82 50 80 0 L 88 0 C 88 50 92 100 84 150 C 78 210 90 280 88 320 Z" opacity="0.70"/>
        <path class="dp-kelp-strand s5" d="M 100 320 C 96 270 108 220 98 170 C 92 130 102 80 98 30 L 108 30 C 108 80 112 130 104 180 C 96 240 106 290 108 320 Z" opacity="0.74"/>
      </g>
      <g fill="#3aa066" opacity="0.5">
        <ellipse class="dp-kelp-frond f1" cx="20"  cy="90"  rx="7" ry="2.5"/>
        <ellipse class="dp-kelp-frond f2" cx="40"  cy="170" rx="8" ry="2.5"/>
        <ellipse class="dp-kelp-frond f3" cx="64"  cy="220" rx="9" ry="3"/>
        <ellipse class="dp-kelp-frond f4" cx="84"  cy="120" rx="7" ry="2.5"/>
        <ellipse class="dp-kelp-frond f5" cx="104" cy="250" rx="8" ry="2.5"/>
      </g>
    </svg>`;

  let styleEl = null;
  let root = null;
  let fishSpawnT = null, bubbleSpawnT = null;
  let raf = null;
  let fishes = [];
  let bubbles = [];
  let fishIdCounter = 0;
  let scale = 1;

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
    if (fishes.length > 8) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const species = FISH[Math.floor(Math.random() * FISH.length)];
    const id = ++fishIdCounter;

    const fishScale = (0.7 + Math.random() * 0.7) * 0.8 * scale;
    const w = species.w * fishScale;
    const h = species.h * fishScale;

    const fromLeft = Math.random() < 0.5;
    const y = vh * (0.1 + Math.random() * 0.75);
    const speed = (35 + Math.random() * 50) * scale;
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

  function onMouseMove(e) {
    if (!root) return;
    if (Math.random() > 0.18) return;
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

    const wash = document.createElement('div');
    wash.className = 'dp-aqua-wash';
    root.appendChild(wash);

    const caustic = document.createElement('div');
    caustic.className = 'dp-aqua-caustic';
    root.appendChild(caustic);

    const kelpW = Math.round(120 * scale);
    const kelpH = Math.round(320 * scale);

    const kelpL = document.createElement('div');
    kelpL.className = 'dp-aqua-kelp dp-aqua-kelp-left';
    kelpL.style.width  = `${kelpW}px`;
    kelpL.style.height = `${kelpH}px`;
    kelpL.innerHTML = KELP_SVG;
    root.appendChild(kelpL);

    const kelpR = document.createElement('div');
    kelpR.className = 'dp-aqua-kelp dp-aqua-kelp-right';
    kelpR.style.width  = `${kelpW}px`;
    kelpR.style.height = `${kelpH}px`;
    kelpR.innerHTML = KELP_SVG;
    root.appendChild(kelpR);

    for (let i = 0; i < 3; i++) setTimeout(spawnBubbleCluster, i * 600);
    for (let i = 0; i < 4; i++) setTimeout(spawnFish, i * 1000);

    fishSpawnT   = setInterval(spawnFish,          2500);
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
