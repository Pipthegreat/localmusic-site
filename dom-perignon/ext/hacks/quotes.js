// Motivational quotes hack — drifting words in four reference-inspired
// treatments, validated for legibility against white, light-photo,
// dark, dark-photo, and busy-gradient backdrops before shipping (see
// _test_render.py in the project root for the Pillow bench).
//
//   chunky-caps    Heavy all-caps with per-word colour from a pale
//                  autumn palette. Reads like a hand-painted poster.
//   wide-caps      Bold all-caps with very wide letter-spacing.
//                  Reads as inscribed / editorial.
//   italic-quoted  Heavy italic mixed-case framed by typographic
//                  quote glyphs. Reads as a pulled quote.
//   roman-head     Bold roman headline, mixed-case, tight tracking.
//                  Reads as a newspaper banner.
//
// Palette is pale (L 92-95% with hue tint) so the fill reads as
// near-white on dark backdrops, while a thin 1px black outline keeps
// the letter edges crisp on light backdrops. Heavy weights (700-900)
// provide stroke mass so the outline doesn't need to be heavier.

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

  // Pale autumn palette — near-white tones with warm hue tints. Reads
  // as near-white on dark backdrops (sufficient luminance contrast)
  // and the 1px outline carries the edge on light backdrops. Values
  // chosen empirically from the Pillow bench render.
  const PALETTE = [
    'oklch(94% 0.06 65)',     // pale honey
    'oklch(92% 0.07 35)',     // pale copper
    'oklch(94% 0.06 75)',     // pale gold
    'oklch(91% 0.07 18)',     // pale wine
    'oklch(94% 0.05 130)',    // pale sage
    'oklch(92% 0.07 40)',     // pale clay
    'oklch(93% 0.07 60)',     // pale saffron
  ];

  function pickColor() {
    return PALETTE[Math.floor(Math.random() * PALETTE.length)];
  }

  // Treatment registry. multicolor=true means each word gets its own
  // palette colour, applied as inline span styles in spawnQuote.
  const TREATMENTS = [
    { cls: 'dp-treat-chunky-caps',   weight: 1.0, sizeFactor: 1.10, multicolor: true  },
    { cls: 'dp-treat-wide-caps',     weight: 0.8, sizeFactor: 0.90, multicolor: false },
    { cls: 'dp-treat-italic-quoted', weight: 1.0, sizeFactor: 1.00, multicolor: false },
    { cls: 'dp-treat-roman-head',    weight: 1.0, sizeFactor: 1.00, multicolor: false },
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

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

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
    // SOFT axis loaded so italic-quoted (SOFT 70) can differ from
    // roman-head (SOFT 40) in temperament.
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

    if (treat.multicolor) {
      // chunky-caps: wrap each word in its own colour span. Per-word
      // colour shift is the load-bearing visual of this treatment
      // (matches the user's reference image 1).
      const words = text.split(' ');
      node.innerHTML = words.map(w =>
        `<span style="color:${pickColor()}">${escapeHTML(w)}</span>`
      ).join(' ');
    } else {
      node.textContent = text;
      node.style.color = pickColor();
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dirLR = Math.random() < 0.5;

    // 24-40px base with per-treatment scaling. Mobile floor 18px.
    const baseFontSize = (24 + Math.random() * 16) * quoteScale;
    const fontSize = Math.max(18, baseFontSize * (treat.sizeFactor || 1));

    const yTop    = fontSize * 0.5;
    const yBottom = Math.max(yTop + 1, vh - fontSize * 1.5);
    const y       = yTop + Math.random() * (yBottom - yTop);
    const opacity = 0.92 + Math.random() * 0.08;

    node.style.fontSize = `${fontSize}px`;
    node.style.opacity  = '0';
    node.style.top      = `${y}px`;
    node.style.left     = dirLR ? `-420px` : `${vw + 60}px`;

    root.appendChild(node);

    const FONT_MIN_FOR_SPEED = 18;
    const FONT_MAX_FOR_SPEED = 44;
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
      const endX = dirLR ? vw + 420 : -node.offsetWidth - 60;
      const startX = dirLR ? -420 : vw + 60;
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
