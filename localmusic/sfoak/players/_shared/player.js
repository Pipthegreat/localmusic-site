/* ===========================================================================
   sfoak players — shared Spotify Web Playback SDK + Web API wrapper.
   Creates a real Connect device in the browser (full tracks, Premium) and
   exposes both SDK-local controls and the server-side playback endpoints.

   The background-survival thesis lives here: playUris()/playContext() hand a
   forward list to Spotify's SERVERS, which advance track-to-track regardless
   of whether this tab is throttled or frozen.  window.SfoakPlayer
   =========================================================================== */
window.SfoakPlayer = (function () {
  const API = "https://api.spotify.com/v1";
  let player = null, deviceId = null, ready = false;
  let cb = {};

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.Spotify && window.Spotify.Player) return resolve();
      const prev = window.onSpotifyWebPlaybackSDKReady;
      window.onSpotifyWebPlaybackSDKReady = function () { if (prev) try { prev(); } catch (e) {} resolve(); };
      const s = document.createElement("script");
      s.src = "https://sdk.scdn.co/spotify-player.js";
      s.async = true;
      s.onerror = () => reject(new Error("Failed to load Spotify Web Playback SDK"));
      document.head.appendChild(s);
    });
  }

  function trackOf(t) {
    if (!t) return null;
    const imgs = (t.album && t.album.images) || [];
    return {
      uri: t.uri, id: t.id, name: t.name,
      artist: (t.artists || []).map((a) => a.name).join(", "),
      art: (imgs[0] || {}).url || "",
      artSmall: (imgs[imgs.length - 1] || {}).url || "",
      duration: t.duration_ms || 0,
    };
  }
  function normalize(s) {
    if (!s) return null;
    const tw = s.track_window || {};
    return {
      paused: s.paused,
      position: s.position,
      duration: s.duration,
      shuffle: s.shuffle, repeat: s.repeat_mode, loading: s.loading,
      track: trackOf(tw.current_track),
      next: (tw.next_tracks || []).map(trackOf),
      prev: (tw.previous_tracks || []).map(trackOf),
      ts: s.timestamp,
      raw: s,
    };
  }

  async function connect(opts) {
    opts = opts || {};
    cb = opts;
    await loadSdk();
    player = new Spotify.Player({
      name: opts.name || "SF + Oakland Live · sfoak",
      volume: opts.volume != null ? opts.volume : 0.8,
      getOAuthToken: (done) => { SfoakAuth.getToken().then((t) => done(t || "")); },
    });
    player.addListener("ready", ({ device_id }) => {
      deviceId = device_id; ready = true;
      if (opts.onReady) opts.onReady(device_id);
    });
    player.addListener("not_ready", () => { ready = false; if (opts.onNotReady) opts.onNotReady(); });
    player.addListener("player_state_changed", (s) => { if (opts.onState) opts.onState(normalize(s)); });
    ["initialization_error", "authentication_error", "account_error", "playback_error"].forEach((ev) => {
      player.addListener(ev, (e) => { if (opts.onError) opts.onError(ev, (e && e.message) || ev); });
    });
    return await player.connect();
  }

  async function api(path, method, body) {
    const tok = await SfoakAuth.getToken();
    if (!tok) throw new Error("not authenticated");
    const r = await fetch(API + path, {
      method: method || "GET",
      headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 204) return null;
    const txt = await r.text();
    let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
    if (!r.ok) {
      const err = new Error((j && j.error && (j.error.message || j.error)) || ("HTTP " + r.status));
      err.status = r.status; err.body = j; throw err;
    }
    return j;
  }

  const dq = (extra) => {
    const p = [];
    if (deviceId) p.push("device_id=" + deviceId);
    if (extra) p.push(extra);
    return p.length ? "?" + p.join("&") : "";
  };

  // --- server-side playback: Spotify advances these track-to-track ---
  async function playUris(uris, positionMs) {
    return api("/me/player/play" + dq(), "PUT", { uris: uris, position_ms: positionMs || 0 });
  }
  async function playContext(contextUri, offsetUri, positionMs) {
    const body = { context_uri: contextUri, position_ms: positionMs || 0 };
    if (offsetUri) body.offset = { uri: offsetUri };
    return api("/me/player/play" + dq(), "PUT", body);
  }
  async function addToQueue(uri) {
    return api("/me/player/queue" + dq("uri=" + encodeURIComponent(uri)), "POST");
  }
  async function transferHere(play) {
    return api("/me/player", "PUT", { device_ids: [deviceId], play: play !== false });
  }
  async function getRemote() { return api("/me/player"); }
  async function getQueue() { return api("/me/player/queue"); }
  async function apiPause() { return api("/me/player/pause" + dq(), "PUT"); }
  async function apiNext() { return api("/me/player/next" + dq(), "POST"); }
  async function apiPrev() { return api("/me/player/previous" + dq(), "POST"); }
  async function apiSeek(ms) { return api("/me/player/seek" + dq("position_ms=" + Math.round(ms)), "PUT"); }

  // --- SDK-local controls (no network, instant on this device) ---
  const resume = () => player && player.resume();
  const pause = () => player && player.pause();
  const toggle = () => player && player.togglePlay();
  const next = () => player && player.nextTrack();
  const prev = () => player && player.previousTrack();
  const seek = (ms) => player && player.seek(ms);
  const setVolume = (v) => player && player.setVolume(v);
  const getCurrentState = () => (player ? player.getCurrentState() : Promise.resolve(null));
  const disconnect = () => player && player.disconnect();

  return {
    connect, api, playUris, playContext, addToQueue, transferHere, getRemote, getQueue,
    apiPause, apiNext, apiPrev, apiSeek,
    resume, pause, toggle, next, prev, seek, setVolume, getCurrentState, disconnect,
    normalize,
    get deviceId() { return deviceId; },
    get ready() { return ready; },
    get player() { return player; },
  };
})();
