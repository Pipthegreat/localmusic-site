// Motivational quotes hack — gentle words drift across the page in Fraunces
// italic. Pulls from a curated pool; spawns one new quote every ~3-5s,
// each fading in at a random edge and floating to the opposite side.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const QUOTES = [
    // Original 29
    'You got this',
    'Keep going',
    'One step at a time',
    "You're doing great",
    'Almost there',
    'Trust the process',
    'Take a breath',
    'Progress, not perfection',
    'Start small',
    'You belong here',
    'This too shall pass',
    "It's okay to rest",
    "You're not behind",
    'Be patient with yourself',
    'Done is better than perfect',
    "You're stronger than you think",
    'Just begin',
    "You're enough",
    'Breathe — you got this',
    'Today is a good day',
    "You're on the right path",
    'Keep showing up',
    'Believe in yourself',
    'Embrace the journey',
    'Stay curious',
    'Small steps count',
    "Don't give up",
    "It's going to be okay",
    "You're doing the work",
    // Added round-3 — pool doubled, ~10% longer max length permitted
    'Take it easy on yourself',
    'Slow and steady wins',
    "You're not alone in this",
    'Step by step, day by day',
    'Worth the effort',
    'Make today count',
    'Trust your gut',
    'Find your rhythm',
    'Lean into it',
    "Showing up is enough",
    'Pace yourself, friend',
    "You're more than your worst day",
    'Try anyway',
    'Begin exactly where you are',
    'Notice the small wins',
    'Tomorrow is a fresh start',
    'Trust the timing of your life',
    'Rest is productive too',
    'Forward is a pace',
    'Be where your feet are',
    'Quiet your mind, just for now',
    'Today is enough',
    'Hold the line, kindly',
    'Open your hands and breathe',
    'Let it be easy',
    'Find one small joy today',
    "Bend, don't break",
    'Stay soft, stay open',
    'The work counts even when no one sees',
    'You can begin again',
    'Soft eyes, steady heart',
  ];

  // Autumn / desert palette — chroma bumped 30-40% from v1.1.5 for more
  // motivational presence. Lightness range unchanged (58-78%) so quotes
  // still read as warm/laid-back rather than neon.
  const AUTUMN_PALETTE = [
    'oklch(72% 0.20 65)',    // saffron
    'oklch(65% 0.19 35)',    // terracotta
    'oklch(58% 0.17 30)',    // burnt sienna
    'oklch(78% 0.18 80)',    // mustard
    'oklch(70% 0.11 130)',   // desert sage
    'oklch(60% 0.14 20)',    // rosewood
    'oklch(63% 0.15 40)',    // adobe clay
  ];

  let styleEl = null;
  let fontLink = null;
  let spawnTimer = null;
  let root = null;
  let quoteScale = 1;

  async function loadCSS() {
    if (document.getElementById('__dp-quotes-style')) return;
    const url = NS.getCSSURL('hacks/quotes.css');
    const css = await (await fetch(url)).text();
    styleEl = document.createElement('style');
    styleEl.id = '__dp-quotes-style';
    styleEl.textContent = css;
    document.documentElement.appendChild(styleEl);
  }

  function ensureFont() {
    if (document.getElementById('__dp-quotes-font')) return;
    // Try to inject Google Fonts link. If the page's CSP blocks it, we
    // gracefully fall back to Georgia italic via the stack in the CSS.
    fontLink = document.createElement('link');
    fontLink.id = '__dp-quotes-font';
    fontLink.rel = 'stylesheet';
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,1,300;9..144,1,400&display=swap';
    (document.head || document.documentElement).appendChild(fontLink);
  }

  function spawnQuote() {
    if (!root) return;
    const text = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const node = document.createElement('div');
    node.className = 'dp-quote';
    node.textContent = text;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Pick an entry edge. Quote starts off-edge and drifts to the
    // opposite side. Vertical position is randomized within safe band.
    const dirLR = Math.random() < 0.5; // true = left→right
    const yBand = 0.12 + Math.random() * 0.76; // 12% to 88% of viewport height
    const y = yBand * vh;

    // Bigger range than v1.1.5 (30-70px desktop instead of 22-55px) for
    // more motivational presence. Mobile floor lifted to 20px so even the
    // smallest scaled quote reads as a statement, not marginalia.
    const fontSize = Math.max(20, (30 + Math.random() * 40) * quoteScale);
    // Outlined characters can sit at high opacity without being heavy
    const opacity = 0.85 + Math.random() * 0.15;
    // Pick a desert/autumn hue at random; backdrop guarantees legibility
    const color = AUTUMN_PALETTE[Math.floor(Math.random() * AUTUMN_PALETTE.length)];

    node.style.fontSize = `${fontSize}px`;
    node.style.color    = color;
    node.style.opacity  = '0';
    node.style.top      = `${y}px`;
    node.style.left     = dirLR ? `-360px` : `${vw + 40}px`;

    root.appendChild(node);

    // Wait a frame so the start position is committed, then animate to
    // the opposite edge over a long duration.
    const duration = 14000 + Math.random() * 10000; // 14-24s
    requestAnimationFrame(() => {
      node.style.transition = `transform ${duration}ms linear, opacity 1800ms ease-in-out`;
      node.style.opacity = String(opacity);
      // small vertical drift for life
      const yDrift = (Math.random() - 0.5) * 80;
      const endX = dirLR ? vw + 400 : -node.offsetWidth - 40;
      const startX = dirLR ? -360 : vw + 40;
      node.style.transform = `translate(${endX - startX}px, ${yDrift}px)`;
    });

    // Fade out then remove
    setTimeout(() => { node.style.opacity = '0'; }, duration - 1700);
    setTimeout(() => { node.remove(); }, duration + 200);
  }

  async function init(r) {
    await loadCSS();
    ensureFont();
    root = r;
    quoteScale = (NS.getScale && NS.getScale()) || 1;
    // Initial burst: spawn 3 quotes immediately so the page isn't empty
    for (let i = 0; i < 3; i++) setTimeout(spawnQuote, i * 800);
    // Then continue spawning at intervals
    spawnTimer = setInterval(spawnQuote, 2800);
  }

  function teardown() {
    if (spawnTimer) clearInterval(spawnTimer);
    spawnTimer = null;
    root = null;
    if (styleEl)  { styleEl.remove();  styleEl = null; }
    if (fontLink) { fontLink.remove(); fontLink = null; }
  }

  NS.hacks.quotes = { init, teardown };
})();
