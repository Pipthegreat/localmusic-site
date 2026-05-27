// Motivational quotes hack — heavy-bold Fraunces drifting across the
// page in three legibility-first treatments. Each spawn picks one of:
// crisp heavy italic, heavy roman display, or soft heavy italic. The
// 2px black character outline + extreme weight keeps every quote
// readable on white pages, dark pages, photos, gradients, or busy
// dashboard chrome.

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

  function pickQuote() {
    const primaryWeight = QUOTES.length;
    const reflectiveWeight = QUOTES_REFLECTIVE.length * 0.5;
    const r = Math.random() * (primaryWeight + reflectiveWeight);
    if (r < primaryWeight) {
      return QUOTES[Math.floor(Math.random() * QUOTES.length)];
    }
    return QUOTES_REFLECTIVE[Math.floor(Math.random() * QUOTES_REFLECTIVE.length)];
  }

  // ─── HEAVY TREATMENTS ───────────────────────────────────────────────
  // Three readability-first treatments, all weight 800+. The previous
  // wonk / drop-cap / small-caps treatments fell apart on real pages
  // (illegible at 16-20px, swallowed by busy backdrops). These three
  // are extreme weight so the stroke itself carries presence, with a
  // 2px outline as backstop.
  //
  //   italic-heavy  Fraunces italic, wght 800, SOFT 40 (crisp serifs)
  //   roman-heavy   Fraunces roman,  wght 900, SOFT 30, tight tracking
  //   italic-soft   Fraunces italic, wght 800, SOFT 95 (rounder warmth)
  //
  // Self-audit pass (mentally traced against representative pages):
  //   • Pure-white pages (Google, Wikipedia): the 2px black outline
  //     gives every glyph an enclosed black ring → strong contrast.
  //   • Pure-dark pages (terminals, dark-mode apps): the outline blends
  //     in, but the heavy-weight coloured fill (mid-tone autumn) reads
  //     against the dark — stroke widths big enough to register.
  //   • Photo / hero-image backdrops: outline + heavy fill carries.
  //   • Patterned / busy dashboards: outline + heavy fill carries.
  //   • Small text (16-18px floor on mobile): wght 800+ keeps glyph
  //     surface area large enough to read; 2px outline grows the
  //     legibility envelope outward.
  const TREATMENTS = [
    { cls: 'dp-treat-italic-heavy', weight: 1.0 },
    { cls: 'dp-treat-roman-heavy',  weight: 1.0 },
    { cls: 'dp-treat-italic-soft',  weight: 1.0 },
  ];

  function pickTreatment() {
    const total = TREATMENTS.reduce((s, t) => s + t.weight, 0);
    let r = Math.random() * total;
    for (const t of TREATMENTS) {
      r -= t.weight;
      if (r <= 0) return t;
    }
    return TREATMENTS[0];
  }

  // Mid-tone autumn — saturated enough to read on white but warm
  // enough to feel like the brand. Lightness 75-82%, chroma 0.10-0.13.
  // Avoids the previous pale palette which vanished into white pages.
  const PALETTE = [
    'oklch(82% 0.11 50)',     // honey amber
    'oklch(78% 0.13 30)',     // burnished copper
    'oklch(80% 0.10 75)',     // mellow gold
    'oklch(76% 0.13 18)',     // wine flush
    'oklch(81% 0.10 130)',    // pressed sage
    'oklch(75% 0.12 20)',     // sunset clay
    'oklch(78% 0.11 60)',     // saffron
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
    fontLink = document.createElement('link');
    fontLink.id = '__dp-quotes-font';
    fontLink.rel = 'stylesheet';
    // Need SOFT axis loaded for the italic-heavy / italic-soft contrast.
    // Drop WONK from the URL since none of the v1.4.6 treatments use it.
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:' +
      'ital,opsz,wght,SOFT@' +
      '0,9..144,100..900,0..100;' +
      '1,9..144,100..900,0..100' +
      '&display=swap';
    (document.head || document.documentElement).appendChild(fontLink);
  }

  function spawnQuote() {
    if (!root) return;
    const text = pickQuote();
    const treat = pickTreatment();
    const node = document.createElement('div');
    node.className = 'dp-quote ' + treat.cls;
    node.textContent = text;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dirLR = Math.random() < 0.5;

    // 26-42px desktop. Bumped from 24-39 to give the heavy weights
    // more room to read — 26px floor is where wght 800 + 2px outline
    // stops feeling cramped. Mobile floor 18px (also bumped from 16).
    const fontSize = Math.max(18, (26 + Math.random() * 16) * quoteScale);

    const yTop    = fontSize * 0.5;
    const yBottom = Math.max(yTop + 1, vh - fontSize * 1.5);
    const y       = yTop + Math.random() * (yBottom - yTop);
    const opacity = 0.92 + Math.random() * 0.08;
    const color   = PALETTE[Math.floor(Math.random() * PALETTE.length)];

    node.style.fontSize = `${fontSize}px`;
    node.style.color    = color;
    node.style.opacity  = '0';
    node.style.top      = `${y}px`;
    node.style.left     = dirLR ? `-360px` : `${vw + 40}px`;

    root.appendChild(node);

    const FONT_MIN_FOR_SPEED = 18;
    const FONT_MAX_FOR_SPEED = 42;
    const DUR_AT_SMALLEST = 32000;
    const DUR_AT_LARGEST  = 18700;
    const sizeFrac = Math.max(0, Math.min(1,
      (fontSize - FONT_MIN_FOR_SPEED) /
      (FONT_MAX_FOR_SPEED - FONT_MIN_FOR_SPEED)
    ));
    const duration = DUR_AT_SMALLEST - sizeFrac * (DUR_AT_SMALLEST - DUR_AT_LARGEST);

    requestAnimationFrame(() => {
      node.style.transition = `transform ${duration}ms linear, opacity 1800ms ease-in-out`;
      node.style.opacity = String(opacity);
      const yDrift = (Math.random() - 0.5) * 80;
      const endX = dirLR ? vw + 400 : -node.offsetWidth - 40;
      const startX = dirLR ? -360 : vw + 40;
      node.style.transform = `translate3d(${endX - startX}px, ${yDrift}px, 0)`;
    });

    setTimeout(() => { node.style.opacity = '0'; }, duration - 1700);
    setTimeout(() => { node.remove(); }, duration + 200);
  }

  async function init(r) {
    await loadCSS();
    ensureFont();
    root = r;
    quoteScale = (NS.getScale && NS.getScale()) || 1;
    for (let i = 0; i < 3; i++) setTimeout(spawnQuote, i * 800);
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
