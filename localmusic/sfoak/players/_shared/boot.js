/* ===========================================================================
   sfoak players — shared SDK-page engine.  window.SfoakBoot
   Wires the common flow once (login → connect → device ready → play →
   state → UI), with opt-in background hardening. Each page supplies only its
   distinct playback `strategy` + optional telemetry — that's the escalation.
   =========================================================================== */
window.SfoakBoot = (function () {
  const D = window.SFOAK_DATA;

  function remoteToState(r) {
    if (!r || !r.item) return null;
    const imgs = (r.item.album && r.item.album.images) || [];
    return {
      paused: !r.is_playing, position: r.progress_ms || 0, duration: r.item.duration_ms || 0,
      track: {
        uri: r.item.uri, name: r.item.name,
        artist: (r.item.artists || []).map((a) => a.name).join(", "),
        art: (imgs[0] || {}).url || "", duration: r.item.duration_ms || 0,
      },
      device: r.device || null, fromRemote: true,
    };
  }

  function sdkPage(cfg) {
    SfoakUI.injectSprite();
    const P = SfoakPlayer, U = SfoakUI, S = SfoakShell;
    const status = S.statusChip(document.getElementById("status"));
    const accEl = document.getElementById("account");
    const listEl = document.getElementById("list");
    const gateEl = document.getElementById("gate");
    const countEl = document.getElementById("count");
    let lastState = null, connecting = false, readyResolve;
    const readyP = new Promise((r) => (readyResolve = r));

    S.accountButton(accEl, { onLogin: () => SfoakAuth.login(location.href), onLogout: () => location.reload() });

    const np = S.nowPlaying({
      onToggle: () => P.toggle(), onNext: () => P.next(), onPrev: () => P.prev(),
      onSeek: (ms) => P.seek(ms), onVolume: (v) => P.setVolume(v),
    });

    const tracks = cfg.tracks || D.tracks;
    if (countEl) countEl.textContent = tracks.length + " tracks · " + D.row_count + " shows";
    const list = S.renderList(listEl, tracks, {
      onPlay,
      onPrev: () => P.prev(),
      onNext: () => P.next(),
      onToggle: () => P.toggle(),
    });

    const ctx = {
      P, U, S, data: D, tracks, toast: U.toast, status, np, list,
      panel: document.getElementById("panel"),
      get state() { return lastState; },
      remoteToState,
    };

    if (gateEl && !SfoakAuth.isLoggedIn()) S.loginGate(gateEl, { onLogin: () => SfoakAuth.login(location.href) });
    if (SfoakAuth.isLoggedIn()) { status.set("connecting Spotify…", "warn"); connect(); }
    else status.set("not connected", "");

    async function connect() {
      if (connecting || P.ready) return;
      connecting = true;
      try {
        await P.connect({
          name: cfg.name || "SF + Oakland Live · sfoak",
          onReady: (id) => {
            status.set("device ready", "ok");
            if (gateEl) gateEl.innerHTML = "";
            readyResolve(id);
            if (cfg.onReady) cfg.onReady(id, ctx);
          },
          onNotReady: () => status.set("device offline", "warn"),
          onState,
          onError,
        });
      } catch (e) { status.set("SDK load failed", "bad"); U.toast("Could not load the Spotify SDK", "err"); }
      connecting = false;
    }

    function onError(ev, msg) {
      if (ev === "account_error") { status.set("Premium required", "bad"); U.toast("Spotify Premium is required for full-track playback.", "err", 4500); }
      else if (ev === "authentication_error") { status.set("auth expired", "bad"); U.toast("Spotify session expired — reconnect.", "err"); }
      else status.set(ev.replace(/_/g, " "), "warn");
      if (cfg.onError) cfg.onError(ev, msg, ctx);
    }

    function onState(state) {
      lastState = state;
      if (state) {
        np.update(state);
        list.setPlaying(state.track && state.track.uri, state.paused);
        if (cfg.mediaSession) {
          U.Media.set(Object.assign({ paused: state.paused }, state.track), {
            play: () => P.resume(), pause: () => P.pause(), next: () => P.next(), prev: () => P.prev(),
          });
          U.Media.position(state.duration, state.position, state.paused);
        }
      }
      if (cfg.onState) cfg.onState(state, ctx);
    }

    async function onPlay(track, i, all) {
      if (!SfoakAuth.isLoggedIn()) { U.toast("Connect Spotify to play full tracks"); SfoakAuth.login(location.href); return; }
      if (cfg.keepAlive) U.KeepAlive.start();
      if (!P.ready) { status.set("connecting…", "warn"); connect(); }
      status.set("starting…", "warn");
      try {
        await readyP;
        try {
          await cfg.strategy(track, i, all, ctx);
        } catch (e1) {
          // The SDK device can 404 on the first call (Spotify hasn't registered
          // it yet). Transfer playback here, then retry the strategy once.
          if (e1.status === 404) {
            try { await P.transferHere(false); } catch (e2) {}
            await new Promise((r) => setTimeout(r, 700));
            await cfg.strategy(track, i, all, ctx);
          } else throw e1;
        }
        status.set(cfg.playingLabel || "playing", "ok");
      } catch (e) {
        if (e.status === 404) U.toast("Device not active yet — tap play once more", "err");
        else if (e.status === 403) U.toast("Blocked: Premium required, or another Spotify session is active", "err", 4500);
        else U.toast("Couldn't start: " + (e.message || e), "err");
        status.set("play error", "bad");
      }
    }

    if (cfg.reconcileOnVisible) {
      U.onVisible(async () => {
        try {
          const r = await P.getRemote();
          const ns = remoteToState(r);
          if (ns) { np.update(ns); list.setPlaying(ns.track.uri, ns.paused); if (cfg.onReconcile) cfg.onReconcile(r, ctx); }
        } catch (e) {}
      });
    }
    if (cfg.worker) {
      const wt = U.WorkerTimer(cfg.workerMs || 2000, () => { if (cfg.onHeartbeat) cfg.onHeartbeat(ctx); });
      wt.start(); ctx.worker = wt;
    }

    return ctx;
  }

  // Forward slice of URIs from a click point — the "server-side context" the
  // experiments hand to Spotify (capped; Spotify advances through them).
  function forwardUris(all, fromIndex, cap) {
    return all.slice(fromIndex, fromIndex + (cap || 50)).map((t) => t.uri);
  }

  return { sdkPage, forwardUris, remoteToState };
})();
