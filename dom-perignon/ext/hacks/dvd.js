// DVD bouncer hack — the classic logo at 45° angles, color cycling on
// every wall bounce. Corner hits trigger a brief celebration flash.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const LOGO_W = 90;
  const LOGO_H = 50;
  // DVD-Video logo — heavy italic Impact "DVD" with subtle gradient sheen
  // (mimics the iconic 3D-block look), pill-shaped disc with legible
  // "VIDEO" below. All chromatic surfaces use currentColor so the wall
  // bounce color cycle drives every element together.
  const LOGO_SVG = `
    <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Highlight sheen across the letterforms (top bright, bottom shadow) -->
        <linearGradient id="dpDvdSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.55"/>
          <stop offset="45%"  stop-color="#ffffff" stop-opacity="0.10"/>
          <stop offset="55%"  stop-color="#000000" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
        </linearGradient>
      </defs>

      <!-- DVD letters: heavy italic condensed sans, base layer in currentColor -->
      <text x="100" y="62"
            text-anchor="middle"
            font-family="Impact, 'Haettenschweiler', 'Arial Narrow Bold', 'Helvetica Inserat', sans-serif"
            font-weight="900"
            font-style="italic"
            font-size="72"
            letter-spacing="-3"
            fill="currentColor"
            stroke="rgba(0,0,0,0.55)"
            stroke-width="1.4"
            paint-order="stroke fill">DVD</text>

      <!-- Sheen overlay on the same letters for the 3D-block highlight -->
      <text x="100" y="62"
            text-anchor="middle"
            font-family="Impact, 'Haettenschweiler', 'Arial Narrow Bold', 'Helvetica Inserat', sans-serif"
            font-weight="900"
            font-style="italic"
            font-size="72"
            letter-spacing="-3"
            fill="url(#dpDvdSheen)"
            pointer-events="none">DVD</text>

      <!-- Disc oval below the letters -->
      <ellipse cx="100" cy="92" rx="68" ry="13"
               fill="currentColor"
               stroke="rgba(0,0,0,0.4)" stroke-width="1.2"/>

      <!-- VIDEO text inside the disc — always black for legibility -->
      <text x="100" y="97"
            text-anchor="middle"
            font-family="'Arial Black', 'Helvetica Neue', Helvetica, sans-serif"
            font-weight="900"
            font-size="15"
            letter-spacing="3.5"
            fill="#000000">VIDEO</text>
    </svg>
  `;

  // Classic palette — saturated, rotates per bounce
  const COLORS = [
    '#ff2d2d', '#ff8b2d', '#ffd62d',
    '#2dff5e', '#2de1ff', '#2d6bff',
    '#a02dff', '#ff2db8',
  ];

  let raf = null;
  let styleEl = null;
  let logo = null;
  let cornerFlash = null;
  let cornerCount = 0;
  let counterEl = null;
  let x, y, vx, vy, colorIdx;

  async function loadCSS() {
    if (document.getElementById('__dp-dvd-style')) return;
    const url = NS.getCSSURL('hacks/dvd.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-dvd-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  function setColor() {
    colorIdx = (colorIdx + 1) % COLORS.length;
    logo.style.color = COLORS[colorIdx];
  }

  function celebrateCorner() {
    cornerCount++;
    counterEl.textContent = `CORNER HIT × ${cornerCount}`;
    counterEl.classList.remove('dp-dvd-corner-flash');
    void counterEl.offsetWidth; // restart animation
    counterEl.classList.add('dp-dvd-corner-flash');
    cornerFlash.classList.remove('dp-dvd-flash');
    void cornerFlash.offsetWidth;
    cornerFlash.classList.add('dp-dvd-flash');
  }

  function step() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    x += vx;
    y += vy;

    let bouncedX = false, bouncedY = false;
    if (x <= 0)             { x = 0;             vx = Math.abs(vx); bouncedX = true; }
    if (x + LOGO_W >= vw)   { x = vw - LOGO_W;   vx = -Math.abs(vx); bouncedX = true; }
    if (y <= 0)             { y = 0;             vy = Math.abs(vy); bouncedY = true; }
    if (y + LOGO_H >= vh)   { y = vh - LOGO_H;   vy = -Math.abs(vy); bouncedY = true; }

    if (bouncedX || bouncedY) setColor();
    if (bouncedX && bouncedY) celebrateCorner();

    logo.style.transform = `translate(${x}px, ${y}px)`;
    raf = requestAnimationFrame(step);
  }

  async function init(root) {
    await loadCSS();
    cornerCount = 0;

    logo = document.createElement('div');
    logo.className = 'dp-dvd-logo';
    logo.innerHTML = LOGO_SVG;
    root.appendChild(logo);

    cornerFlash = document.createElement('div');
    cornerFlash.className = 'dp-dvd-flash-layer';
    root.appendChild(cornerFlash);

    counterEl = document.createElement('div');
    counterEl.className = 'dp-dvd-corner-counter';
    counterEl.textContent = 'CORNER HIT × 0';
    root.appendChild(counterEl);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    x = Math.random() * (vw - LOGO_W);
    y = Math.random() * (vh - LOGO_H);
    // Classic 1.5–2.2 px/frame at ~60fps. Sign random for direction.
    vx = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 0.5);
    vy = (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * 0.4);
    colorIdx = Math.floor(Math.random() * COLORS.length);
    logo.style.color = COLORS[colorIdx];

    raf = requestAnimationFrame(step);
  }

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    logo = null;
    cornerFlash = null;
    counterEl = null;
    if (styleEl) { styleEl.remove(); styleEl = null; }
  }

  NS.hacks.dvd = { init, teardown };
})();
