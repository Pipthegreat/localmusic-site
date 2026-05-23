// Ants hack — a colony of crawling ants overlaid on every page.
//
// Spawns ~14 SVG ants that wander the viewport with a momentum-based
// random walk. Bounce gently off edges. Body bobs faintly while walking
// to read as alive. Legs are SVG lines styled in CSS.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const ANT_COUNT = 14;
  // Each ant points "right" at 0deg in its local coordinates.
  const ANT_SVG = `
    <svg viewBox="0 0 40 22" xmlns="http://www.w3.org/2000/svg">
      <g class="ant-body">
        <!-- antennae -->
        <line x1="36" y1="11" x2="40" y2="6"  class="ant-antenna"/>
        <line x1="36" y1="11" x2="40" y2="16" class="ant-antenna"/>
        <!-- legs (front, mid, rear × 2) -->
        <line x1="29" y1="9"  x2="33" y2="2"  class="ant-leg leg-a"/>
        <line x1="26" y1="9"  x2="26" y2="1"  class="ant-leg leg-b"/>
        <line x1="23" y1="9"  x2="19" y2="1"  class="ant-leg leg-a"/>
        <line x1="29" y1="13" x2="33" y2="20" class="ant-leg leg-b"/>
        <line x1="26" y1="13" x2="26" y2="21" class="ant-leg leg-a"/>
        <line x1="23" y1="13" x2="19" y2="21" class="ant-leg leg-b"/>
        <!-- head, thorax, abdomen -->
        <ellipse cx="34" cy="11" rx="3"   ry="2.5" class="ant-head"/>
        <ellipse cx="26" cy="11" rx="3.5" ry="2.8" class="ant-thorax"/>
        <ellipse cx="16" cy="11" rx="5"   ry="3.5" class="ant-abdomen"/>
      </g>
    </svg>
  `;

  let raf = null;
  let styleEl = null;
  let ants = [];

  async function loadCSS() {
    if (document.getElementById('__dp-ants-style')) return;
    const url = NS.getCSSURL('hacks/ants.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-ants-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  function spawnAnt(root) {
    const wrap = document.createElement('div');
    wrap.className = 'dp-ant';
    wrap.innerHTML = ANT_SVG;
    root.appendChild(wrap);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      el: wrap,
      x: Math.random() * vw,
      y: Math.random() * vh,
      angle: Math.random() * Math.PI * 2,
      speed: 0.25 + Math.random() * 0.55, // px per frame
      wobble: Math.random() * Math.PI * 2,
      wobbleRate: 0.02 + Math.random() * 0.04,
      turnRate: (Math.random() - 0.5) * 0.04,
      lastDirShift: 0,
    };
  }

  function step(t) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 28;

    for (const a of ants) {
      // Periodically nudge the heading randomly (so they meander)
      if (t - a.lastDirShift > 600 + Math.random() * 1500) {
        a.turnRate = (Math.random() - 0.5) * 0.05;
        a.lastDirShift = t;
      }
      a.angle += a.turnRate;

      // Subtle wobble in heading from the wobble phase
      a.wobble += a.wobbleRate;
      const effAngle = a.angle + Math.sin(a.wobble) * 0.12;

      a.x += Math.cos(effAngle) * a.speed;
      a.y += Math.sin(effAngle) * a.speed;

      // Soft edge: turn toward center when near a wall
      if (a.x < margin)        a.angle += 0.04;
      if (a.x > vw - margin)   a.angle += 0.04;
      if (a.y < margin)        a.angle -= 0.04;
      if (a.y > vh - margin)   a.angle -= 0.04;

      // Hard clamp (don't escape viewport)
      a.x = Math.max(0, Math.min(vw - 24, a.x));
      a.y = Math.max(0, Math.min(vh - 16, a.y));

      // Convert to CSS transform. Heading 0 = pointing right (matches SVG).
      const deg = (effAngle * 180) / Math.PI;
      // Slight Y bob to read as walking
      const bob = Math.sin(a.wobble * 2.5) * 0.4;
      a.el.style.transform = `translate(${a.x}px, ${a.y + bob}px) rotate(${deg}deg)`;
    }

    raf = requestAnimationFrame(step);
  }

  async function init(root) {
    await loadCSS();
    root.style.pointerEvents = 'none';
    ants = [];
    for (let i = 0; i < ANT_COUNT; i++) ants.push(spawnAnt(root));
    raf = requestAnimationFrame(step);
  }

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    ants = [];
    if (styleEl) { styleEl.remove(); styleEl = null; }
    // root cleanup is handled by inject.js
  }

  NS.hacks.ants = { init, teardown };
})();
