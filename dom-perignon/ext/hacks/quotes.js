// Motivational quotes hack - gentle words drift across the page in
// Fraunces, rendered through five distinct typographic treatments
// (wonk, display italic, roman headline, small caps, drop cap). Each
// spawn picks a treatment at random so consecutive quotes never look
// the same — the typography itself becomes part of the inspiration.

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

  // Reflective pool — outward-facing observations about healthier ways
  // to live, not direct quotes from any source. Each of these fires
  // half as often as each primary quote (see pickQuote() below).
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

  // Weighted picker. Each primary quote weight 1, each reflective 0.5.
  function pickQuote() {
    const primaryWeight = QUOTES.length;
    const reflectiveWeight = QUOTES_REFLECTIVE.length * 0.5;
    const r = Math.random() * (primaryWeight + reflectiveWeight);
    if (r < primaryWeight) {
      return QUOTES[Math.floor(Math.random() * QUOTES.length)];
    }
    return QUOTES_REFLECTIVE[Math.floor(Math.random() * QUOTES_REFLECTIVE.length)];
  }

  // ─── TYPOGRAPHIC TREATMENTS ────────────────────────────────────────
  // Each treatment is one CSS class (defined in quotes.css). Picked at
  // random per spawn so consecutive quotes always look different —
  // typography itself carries the variety, not just text.
  //
  //   wonk      Fraunces italic w/ WONK axis on + swash + ss01 alts.
  //             The wildest Fraunces look: curling tails, swashed
  //             terminals, the famous wonky 'g'.
  //   display   Fraunces italic, refined classic display weight.
  //   roman     Bold roman headline, tight tracking. Editorial weight.
  //   smallcaps All-small-caps roman, wide tracking. Quiet authority.
  //   dropcap   Italic body w/ oversized wonky first letter. Literary
  //             opening feel — JS wraps the first letter in a span.
  //
  // Weights bias toward the more dramatic treatments (wonk + dropcap)
  // since those carry the strongest "this is hand-set" feel.
  const TREATMENTS = [
    { cls: 'dp-treat-wonk',      weight: 1.4, sizeFactor: 1.10 },
    { cls: 'dp-treat-display',   weight: 1.0, sizeFactor: 1.00 },
    { cls: 'dp-treat-roman',     weight: 0.9, sizeFactor: 1.05 },
    { cls: 'dp-treat-smallcaps', weight: 0.7, sizeFactor: 0.92 },
    { cls: 'dp-treat-dropcap',   weight: 1.2, sizeFactor: 1.05 },
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

  // Autumn palette — pale (94-95% L) tones unchanged, plus a new
  // band of mid-tone autumn (78-86% L, higher chroma) for richer
  // treatments. Random pick per spawn; the weight is unstratified so
  // both bands appear evenly.
  const PALETTE = [
    // Pale autumn (lightness 90-95%)
    'oklch(94% 0.06 65)',     // pale saffron
    'oklch(92% 0.07 35)',     // pale terracotta
    'oklch(90% 0.06 30)',     // pale burnt sienna
    'oklch(95% 0.07 80)',     // pale mustard
    'oklch(94% 0.05 130)',    // pale desert sage
    'oklch(91% 0.06 20)',     // pale rosewood
    'oklch(92% 0.07 40)',     // pale adobe clay
    // Mid-tone autumn (lightness 78-86%, higher chroma — for richer
    // treatments where bolder weights handle the deeper colour well)
    'oklch(85% 0.10 50)',     // honey amber
    'oklch(82% 0.11 30)',     // burnished copper
    'oklch(86% 0.09 75)',     // mellow gold
    'oklch(79% 0.12 18)',     // wine flush
    'oklch(83% 0.09 130)',    // pressed sage
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
    // Load Fraunces with the FULL set of registered + custom axes
    // (ital, opsz, wght, SOFT, WONK). The previous URL omitted SOFT
    // and WONK, so font-variation-settings for those were silently
    // ignored. With the full axis range we can use the WONK axis for
    // the wonk treatment and the SOFT axis to differentiate
    // treatments' temperaments.
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:' +
      'ital,opsz,wght,SOFT,WONK@' +
      '0,9..144,100..900,0..100,0;'  +
      '0,9..144,100..900,0..100,1;'  +
      '1,9..144,100..900,0..100,0;'  +
      '1,9..144,100..900,0..100,1'   +
      '&display=swap';
    (document.head || document.documentElement).appendChild(fontLink);
  }

  function spawnQuote() {
    if (!root) return;
    const text = pickQuote();
    const treat = pickTreatment();
    const node = document.createElement('div');
    node.className = 'dp-quote ' + treat.cls;

    // Drop-cap treatment: wrap first letter in its own span so the
    // CSS can scale + restyle just that glyph.
    if (treat.cls === 'dp-treat-dropcap' && text.length > 0) {
      const first = text.charAt(0);
      const rest  = text.slice(1);
      node.innerHTML =
        '<span class="dp-drop-init">' +
        first.replace(/[&<>"']/g, c => ({
          '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        })[c]) +
        '</span>' +
        rest.replace(/[&<>"']/g, c => ({
          '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        })[c]);
    } else {
      node.textContent = text;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const dirLR = Math.random() < 0.5;

    // Base range 24-39px desktop, mobile floor 16px. Each treatment
    // gets a per-treatment scaling so wonk + drop-cap read a touch
    // larger (more presence) and small-caps reads a touch smaller
    // (more contained).
    const baseFontSize = (24 + Math.random() * 15) * quoteScale;
    const fontSize = Math.max(16, baseFontSize * (treat.sizeFactor || 1));

    const yTop    = fontSize * 0.5;
    const yBottom = Math.max(yTop + 1, vh - fontSize * 1.5);
    const y       = yTop + Math.random() * (yBottom - yTop);
    const opacity = 0.85 + Math.random() * 0.15;
    const color   = PALETTE[Math.floor(Math.random() * PALETTE.length)];

    node.style.fontSize = `${fontSize}px`;
    node.style.color    = color;
    node.style.opacity  = '0';
    node.style.top      = `${y}px`;
    node.style.left     = dirLR ? `-360px` : `${vw + 40}px`;

    root.appendChild(node);

    // Animation envelope unchanged from v1.2.8 — fontSize-linked
    // duration; smaller text drifts slower to mask sub-pixel artefacts.
    const FONT_MIN_FOR_SPEED = 16;
    const FONT_MAX_FOR_SPEED = 39;
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
