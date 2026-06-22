/* ===========================================================================
   sfoak players — shared UI shell components.  window.SfoakShell
   Login gate, track list, account button, status chip, and a self-ticking
   now-playing bar.  Pages compose these and supply their own playback strategy.
   =========================================================================== */
window.SfoakShell = (function () {
  const { ico, fmt, esc } = SfoakUI;

  function letterTile(name) {
    const ch = (name || "?").trim()[0] || "?";
    return '<span style="font:700 17px var(--sans);color:var(--ember-300)">' + esc(ch.toUpperCase()) + "</span>";
  }

  /* ---- track list ---- */
  function renderList(container, tracks, opts) {
    opts = opts || {};
    container.classList.add("tracklist");
    container.innerHTML = "";
    const rows = new Map(); // uri -> {el, idxEl}
    tracks.forEach((t, i) => {
      const el = document.createElement("div");
      el.className = "trk"; el.dataset.uri = t.uri; el.tabIndex = 0; el.setAttribute("role", "button");
      el.innerHTML =
        '<div class="cell-idx">' +
          '<span class="idx">' + (i + 1) + "</span>" +
          '<button class="icon-btn playbtn" tabindex="-1" aria-label="Play">' + ico("i-play") + "</button>" +
        "</div>" +
        '<div class="meta"><div class="title">' + esc(t.title || t.name || "") + '</div>' +
          '<div class="sub">' + esc(t.artist || "") + "</div></div>" +
        '<div class="art" aria-hidden="true">' + letterTile(t.artist) + "</div>";
      const fire = () => opts.onPlay && opts.onPlay(t, i, tracks);
      el.addEventListener("click", fire);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); } });
      container.appendChild(el);
      rows.set(t.uri, el);
    });
    // grid: idx | meta | art  (re-order vs css default: idx, meta, art)
    container.querySelectorAll(".trk").forEach((el) => { el.style.gridTemplateColumns = "44px 1fr 44px"; });

    let curUri = null;
    function setPlaying(uri, paused) {
      if (curUri && rows.has(curUri)) {
        const prev = rows.get(curUri);
        prev.classList.remove("playing");
        prev.querySelector(".cell-idx").innerHTML =
          '<span class="idx">' + ([...rows.keys()].indexOf(curUri) + 1) + "</span>" +
          '<button class="icon-btn playbtn" tabindex="-1" aria-label="Play">' + ico("i-play") + "</button>";
      }
      curUri = uri;
      if (uri && rows.has(uri)) {
        const el = rows.get(uri);
        el.classList.add("playing");
        el.querySelector(".cell-idx").innerHTML = paused
          ? '<button class="icon-btn playbtn" style="display:grid" tabindex="-1" aria-label="Play">' + ico("i-play") + "</button>"
          : '<span class="eqbars" aria-label="Now playing"><i></i><i></i><i></i></span>';
        // re-bind the freshly-created play button
        const pb = el.querySelector(".playbtn");
        if (pb) pb.addEventListener("click", (e) => { e.stopPropagation(); el.click(); });
      }
    }
    return { setPlaying, rows };
  }

  /* ---- login gate ---- */
  function loginGate(container, opts) {
    container.innerHTML =
      '<div class="gate">' +
      '<div class="eyebrow">Spotify Premium</div>' +
      "<h2>Connect Spotify to play full tracks</h2>" +
      "<p>This player streams complete songs through your own Spotify Premium account using the Web Playback SDK — not 30-second previews. Your account stays yours; we never see your password.</p>" +
      '<button class="btn btn-primary" id="sfoak-login">' + ico("i-spotify") + " Connect Spotify</button>" +
      '<div class="note">Requires Spotify Premium. One login works across every player on this site.</div>' +
      "</div>";
    container.querySelector("#sfoak-login").addEventListener("click", () => opts.onLogin());
  }

  /* ---- account button (topbar) ---- */
  function accountButton(el, opts) {
    function render() {
      if (SfoakAuth.isLoggedIn()) {
        el.innerHTML = '<button class="btn btn-ghost" id="acc">Premium · sign out</button>';
        el.querySelector("#acc").addEventListener("click", () => { SfoakAuth.logout(); opts.onLogout && opts.onLogout(); render(); });
      } else {
        el.innerHTML = '<button class="btn btn-primary" id="acc">' + ico("i-spotify") + " Connect Spotify</button>";
        el.querySelector("#acc").addEventListener("click", () => opts.onLogin());
      }
    }
    render();
    return { render };
  }

  /* ---- status chip ---- */
  function statusChip(el) {
    return {
      set(text, level) {
        el.className = "chip " + (level || "");
        el.innerHTML = '<span class="led"></span>' + esc(text);
      },
    };
  }

  /* ---- now-playing bar (self-ticking progress) ---- */
  function nowPlaying(opts) {
    opts = opts || {};
    const np = document.createElement("div");
    np.className = "np hidden";
    np.innerHTML =
      '<div class="now">' +
        '<div class="art"><img alt="" id="np-art" hidden></div>' +
        '<div class="t"><div class="name" id="np-name">—</div><div class="by" id="np-by"></div></div>' +
      "</div>" +
      '<div class="controls">' +
        '<div class="transport">' +
          '<button class="icon-btn" id="np-prev" aria-label="Previous">' + ico("i-prev") + "</button>" +
          '<button class="icon-btn play" id="np-toggle" aria-label="Play/Pause">' + ico("i-play") + "</button>" +
          '<button class="icon-btn" id="np-next" aria-label="Next">' + ico("i-next") + "</button>" +
        "</div>" +
        '<div class="scrub"><span class="time" id="np-pos">0:00</span>' +
          '<div class="bar" id="np-bar"><div class="fill" id="np-fill"></div><div class="knob" id="np-knob"></div></div>' +
          '<span class="time r" id="np-dur">0:00</span></div>' +
      "</div>" +
      '<div class="right">' +
        '<span class="icon-btn" aria-hidden="true">' + ico("i-vol") + "</span>" +
        '<div class="bar vol" id="np-vol"><div class="fill" id="np-volfill" style="width:80%"></div><div class="knob" id="np-volknob"></div></div>' +
      "</div>";
    document.body.appendChild(np);
    const $ = (id) => np.querySelector(id);
    const art = $("#np-art"), name = $("#np-name"), by = $("#np-by"), toggle = $("#np-toggle");
    const posEl = $("#np-pos"), durEl = $("#np-dur"), fill = $("#np-fill"), bar = $("#np-bar"), knob = $("#np-knob");

    toggle.addEventListener("click", () => opts.onToggle && opts.onToggle());
    $("#np-next").addEventListener("click", () => opts.onNext && opts.onNext());
    $("#np-prev").addEventListener("click", () => opts.onPrev && opts.onPrev());
    bar.addEventListener("click", (e) => {
      if (!st.duration) return;
      const r = bar.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      opts.onSeek && opts.onSeek(Math.round(frac * st.duration));
    });
    const vol = $("#np-vol");
    vol.addEventListener("click", (e) => {
      const r = vol.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      $("#np-volfill").style.width = (frac * 100) + "%";
      opts.onVolume && opts.onVolume(frac);
    });

    const st = { position: 0, duration: 0, paused: true, ts: Date.now() };
    function paint() {
      const p = st.paused ? st.position : st.position + (Date.now() - st.ts);
      const pos = Math.min(p, st.duration || p);
      fill.style.width = st.duration ? (pos / st.duration * 100) + "%" : "0%";
      knob.style.left = fill.style.width;
      posEl.textContent = fmt(pos);
      durEl.textContent = fmt(st.duration);
      if (opts.onTick) opts.onTick(pos, st.duration, st.paused);
    }
    setInterval(paint, 250);

    function update(state) {
      if (!state) return;
      np.classList.remove("hidden");
      st.position = state.position || 0;
      st.duration = state.duration || (state.track && state.track.duration) || 0;
      st.paused = !!state.paused;
      st.ts = Date.now();
      toggle.innerHTML = state.paused ? ico("i-play") : ico("i-pause");
      if (state.track) {
        name.textContent = state.track.name || "—";
        by.textContent = state.track.artist || "";
        if (state.track.art) { art.src = state.track.art; art.hidden = false; } else { art.hidden = true; }
      }
      paint();
    }
    return { el: np, update, setHidden: (b) => np.classList.toggle("hidden", b), state: st };
  }

  return { renderList, loginGate, accountButton, statusChip, nowPlaying };
})();
