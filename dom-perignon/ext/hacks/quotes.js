// Motivational quotes hack — gentle words drift across the page in Fraunces
// italic. Pulls from a curated pool; spawns one new quote every ~3-5s,
// each fading in at a random edge and floating to the opposite side.

(function () {
  const NS = (window.__DOMPerignon = window.__DOMPerignon || { hacks: {} });

  const QUOTES = [
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
  ];

  let styleEl = null;
  let fontLink = null;
  let spawnTimer = null;
  let root = null;

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

    // Vary size; the larger quotes feel like printed plates, smaller
    // ones like marginalia
    const fontSize = 22 + Math.random() * 28; // 22-50px
    const opacity = 0.45 + Math.random() * 0.35;

    node.style.fontSize = `${fontSize}px`;
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
