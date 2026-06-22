/* ===========================================================================
   sfoak players — shared UI + background-survival primitives.  window.SfoakUI
   Icons, time/format helpers, toasts, and the three reusable techniques the
   experiments layer on: a silent AudioContext anchor, MediaSession wiring, and
   an un-throttled Web Worker heartbeat.
   =========================================================================== */
window.SfoakUI = (function () {
  /* ---- icon sprite (injected once) ---- */
  const SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
 <symbol id="i-play" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.79-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z"/></symbol>
 <symbol id="i-pause" viewBox="0 0 24 24"><path fill="currentColor" d="M7 4h3v16H7zM14 4h3v16h-3z"/></symbol>
 <symbol id="i-next" viewBox="0 0 24 24"><path fill="currentColor" d="M6 5.14v13.72a1 1 0 0 0 1.54.84L16 14.3V19a1 1 0 0 0 2 0V5a1 1 0 0 0-2 0v4.7L7.54 4.3A1 1 0 0 0 6 5.14Z"/></symbol>
 <symbol id="i-prev" viewBox="0 0 24 24"><path fill="currentColor" d="M18 5.14v13.72a1 1 0 0 1-1.54.84L8 14.3V19a1 1 0 0 1-2 0V5a1 1 0 0 1 2 0v4.7l8.46-5.4A1 1 0 0 1 18 5.14Z"/></symbol>
 <symbol id="i-vol" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3Zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Zm-2.5-9v2.06A7 7 0 0 1 14 21v-2.06A5 5 0 0 0 14 3Z"/></symbol>
 <symbol id="i-spotify" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.62.62 0 1 1-.28-1.22c3.81-.87 7.08-.5 9.72 1.11.3.18.39.57.21.86Zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.15-.56 11.24 1.33.37.22.49.7.25 1.07Zm.11-2.84C14.8 8.93 9.4 8.75 6.3 9.69a.93.93 0 1 1-.54-1.78c3.56-1.08 9.52-.87 13.28 1.36a.93.93 0 1 1-.95 1.6Z"/></symbol>
 <symbol id="i-cast" viewBox="0 0 24 24"><path fill="currentColor" d="M21 3H3a2 2 0 0 0-2 2v3h2V5h18v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM1 18v3h3a3 3 0 0 0-3-3Zm0-4v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7Zm0-4v2a9 9 0 0 1 9 9h2A11 11 0 0 0 1 10Z"/></symbol>
</svg>`;
  function injectSprite() {
    if (document.getElementById("sfoak-sprite")) return;
    const d = document.createElement("div");
    d.id = "sfoak-sprite"; d.innerHTML = SPRITE;
    document.body.insertBefore(d, document.body.firstChild);
  }
  const ico = (id) => `<svg><use href="#${id}"/></svg>`;

  /* ---- formatting ---- */
  function fmt(ms) {
    if (!ms || ms < 0 || !isFinite(ms)) return "0:00";
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---- toast ---- */
  let toastWrap = null;
  function toast(msg, isErr, ms) {
    if (!toastWrap) { toastWrap = document.createElement("div"); toastWrap.className = "toast-wrap"; document.body.appendChild(toastWrap); }
    const t = document.createElement("div");
    t.className = "toast" + (isErr ? " err" : ""); t.textContent = msg;
    toastWrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity 300ms"; setTimeout(() => t.remove(), 320); }, ms || 2600);
  }

  /* ---- KeepAlive: a silent AudioContext anchor. A tab producing audio is
     marked "media-active" and is NOT frozen by the browser — this keeps the
     pipeline warm across the brief inter-track gap so playback never stalls. */
  const KeepAlive = (function () {
    let ctx = null, osc = null, gain = null, on = false;
    function start() {
      if (on) return;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        osc = ctx.createOscillator(); gain = ctx.createGain();
        gain.gain.value = 0.0001;            // effectively silent
        osc.frequency.value = 30;            // sub-audible
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); on = true;
        if (ctx.state === "suspended") ctx.resume();
      } catch (e) {}
    }
    function stop() { try { if (osc) osc.stop(); if (ctx) ctx.close(); } catch (e) {} on = false; ctx = osc = gain = null; }
    return { start, stop, get active() { return on; } };
  })();

  /* ---- MediaSession: OS-level transport + lock-screen art + position. ---- */
  const Media = {
    set(track, handlers) {
      if (!("mediaSession" in navigator)) return;
      try {
        if (track) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.name || "", artist: track.artist || "", album: "SF + Oakland Live",
            artwork: track.art ? [{ src: track.art, sizes: "640x640", type: "image/jpeg" }] : [],
          });
        }
        navigator.mediaSession.playbackState = (track && track.paused) ? "paused" : "playing";
        const h = handlers || {};
        const map = { play: h.play, pause: h.pause, nexttrack: h.next, previoustrack: h.prev };
        for (const k in map) { try { navigator.mediaSession.setActionHandler(k, map[k] || null); } catch (e) {} }
      } catch (e) {}
    },
    position(durationMs, positionMs, paused) {
      if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
      try {
        navigator.mediaSession.setPositionState({
          duration: (durationMs || 0) / 1000, position: Math.min((positionMs || 0), durationMs || 0) / 1000,
          playbackRate: paused ? 0 : 1,
        });
      } catch (e) {}
    },
  };

  /* ---- WorkerTimer: a setInterval inside a Web Worker. Worker timers are not
     throttled when the tab is hidden, so a heartbeat keeps firing — used to
     reconcile UI / trigger advance checks that the main thread would miss. */
  function WorkerTimer(intervalMs, onTick) {
    const src = "let id=null;onmessage=e=>{if(e.data&&e.data.cmd==='start'){clearInterval(id);id=setInterval(()=>postMessage('tick'),e.data.ms);}else if(e.data&&e.data.cmd==='stop'){clearInterval(id);id=null;}};";
    let w = null;
    try { w = new Worker(URL.createObjectURL(new Blob([src], { type: "application/javascript" }))); }
    catch (e) { /* fall back to a main-thread interval */ let h = setInterval(onTick, intervalMs); return { start() {}, stop() { clearInterval(h); } }; }
    w.onmessage = () => onTick();
    return {
      start() { w.postMessage({ cmd: "start", ms: intervalMs }); },
      stop() { w.postMessage({ cmd: "stop" }); },
      terminate() { try { w.terminate(); } catch (e) {} },
    };
  }

  function onVisible(cb) {
    document.addEventListener("visibilitychange", () => { if (!document.hidden) cb(); });
  }

  return { injectSprite, ico, fmt, esc, toast, KeepAlive, Media, WorkerTimer, onVisible };
})();
