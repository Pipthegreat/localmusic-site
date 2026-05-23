// Motivational quotes hack - gentle words drift across the page in Fraunces
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
    'Breathe - you got this',
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
    // Added round-3 - pool doubled, ~10% longer max length permitted
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

  // Reflective pool added in v1.2.3 - outward-facing observations about
  // healthier ways to live, not direct quotes from any source. Each of
  // these fires half as often as each primary quote (see pickQuote()
  // below).
  const QUOTES_REFLECTIVE = [
    'Slowness is a discipline',
    'Sleep is a craft',
    'Walks have always been the answer',
    'Quiet rooms make quiet minds',
    'Sunlight before screens',
    'Water first, coffee second',
    'Mornings hold their own light',
    'Slow food is faster in the long run',
    'Boredom is fertile soil',
    'Curiosity outlives ambition',
    'Books are quiet teachers',
    'Patience is a form of attention',
    'Small kindnesses ripple outward',
    'Cooking is a meditation',
    'Less is the discipline of more',
    'Silence makes room for thought',
    'Rested hands work better',
    'Hands at work, mind at ease',
    'Old friendships compound',
    'Wandering has its own logic',
    'Nature does not hurry',
    'Long meals build long memories',
    'Music outlasts the moment',
    'Routines hold space for spontaneity',
    'Sleep is the foundation, not the reward',
    'Conversation is a craft',
    'The slow path is often the only path',
    'Stillness is a competency',
    'Walking is thinking with the feet',
    'Tea is a pause made tangible',
    "Daylight has a value coffee can't replace",
    'Friendship outlasts almost everything',
    'Gardens are slow theatre',
    'Trees know things words do not',
    'A long walk solves most short problems',
    'Memory grows in the company of others',
    'Saying no is a quiet art',
    'The road is part of the destination',
    'Daydreams have their own work to do',
    'Hospitality is a small revolution',
  ];

  // Weighted picker. Each primary quote has weight 1, each reflective
  // quote has weight 0.5 - so within the rotation, a reflective quote
  // fires half as often as a primary one. Aggregate spawn share:
  // primary ~75%, reflective ~25%.
  function pickQuote() {
    const primaryWeight = QUOTES.length;                  // 60 * 1.0
    const reflectiveWeight = QUOTES_REFLECTIVE.length * 0.5; // 40 * 0.5 = 20
    const r = Math.random() * (primaryWeight + reflectiveWeight);
    if (r < primaryWeight) {
      return QUOTES[Math.floor(Math.random() * QUOTES.length)];
    }
    return QUOTES_REFLECTIVE[Math.floor(Math.random() * QUOTES_REFLECTIVE.length)];
  }

  // Autumn / desert palette - PALE versions. Lightness pushed to 88-95%,
  // chroma reduced to 0.04-0.08. Each colour reads as a near-white wash
  // hinting at the hue, so when paired with the black character outline
  // the result is "ghostly outlined text with a wash of warm colour"
  // rather than saturated mid-tone letters.
  const AUTUMN_PALETTE = [
    'oklch(94% 0.06 65)',    // pale saffron
    'oklch(92% 0.06 35)',    // pale terracotta
    'oklch(90% 0.05 30)',    // pale burnt sienna
    'oklch(95% 0.07 80)',    // pale mustard
    'oklch(94% 0.04 130)',   // pale desert sage
    'oklch(91% 0.05 20)',    // pale rosewood
    'oklch(92% 0.06 40)',    // pale adobe clay
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
    // Load Fraunces with full italic axis + weight range so we get real
    // italic at weight 600+, not a browser-synthesized slant on the
    // regular file (which renders weak/boring).
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,1,100..900&display=swap';
    (document.head || document.documentElement).appendChild(fontLink);
  }

  function spawnQuote() {
    if (!root) return;
    const text = pickQuote();
    const node = document.createElement('div');
    node.className = 'dp-quote';
    node.textContent = text;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Pick an entry edge. Quote starts off-edge and drifts to the
    // opposite side. Vertical position uses the FULL viewport height with
    // just enough margin so the text isn't clipped at the top or bottom.
    const dirLR = Math.random() < 0.5; // true = left→right

    // Range trimmed in v1.1.12: 24-39px desktop (was 30-70). The whole
    // range is 20% smaller and the top end gets an additional 30% cut so
    // the largest quote isn't dominating the viewport. Mobile floor 16px.
    const fontSize = Math.max(16, (24 + Math.random() * 15) * quoteScale);

    // Y range: top margin = fontSize/2 (keeps cap-height visible),
    // bottom margin = fontSize * 1.5 (clears descender + drop-shadow).
    // Full viewport gets used now, not just the middle 76% as in v1.1.12.
    const yTop    = fontSize * 0.5;
    const yBottom = Math.max(yTop + 1, vh - fontSize * 1.5);
    const y       = yTop + Math.random() * (yBottom - yTop);
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
    // the opposite edge over a fontSize-linked duration:
    //   smallest fontSize → 24s (slowest)
    //   largest  fontSize → 14s (fastest)
    // Inverse mapping because smaller text exposes more sub-pixel
    // rendering artefacts as it moves, so slow it down to mask them;
    // larger text composites cleanly and can fly through quickly.
    // Envelope (14s-24s) unchanged from previous versions.
    const FONT_MIN_FOR_SPEED = 16;
    const FONT_MAX_FOR_SPEED = 39;
    const DUR_AT_SMALLEST = 24000;
    const DUR_AT_LARGEST  = 14000;
    const sizeFrac = Math.max(0, Math.min(1,
      (fontSize - FONT_MIN_FOR_SPEED) /
      (FONT_MAX_FOR_SPEED - FONT_MIN_FOR_SPEED)
    ));
    const duration = DUR_AT_SMALLEST - sizeFrac * (DUR_AT_SMALLEST - DUR_AT_LARGEST);

    requestAnimationFrame(() => {
      node.style.transition = `transform ${duration}ms linear, opacity 1800ms ease-in-out`;
      node.style.opacity = String(opacity);
      // small vertical drift for life
      const yDrift = (Math.random() - 0.5) * 80;
      const endX = dirLR ? vw + 400 : -node.offsetWidth - 40;
      const startX = dirLR ? -360 : vw + 40;
      // translate3d (not translate) forces the browser to promote this
      // element to a GPU compositor layer. The bitmap (including the
      // expensive 9-offset text-shadow outline) is cached once and the
      // GPU composites each frame instead of re-rasterising. Removes
      // the small-text stutter that users see at slow speeds.
      node.style.transform = `translate3d(${endX - startX}px, ${yDrift}px, 0)`;
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
    // Then continue spawning at intervals (15% slower in v1.2.3)
    spawnTimer = setInterval(spawnQuote, 3300);
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
