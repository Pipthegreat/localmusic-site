/* ===========================================================================
   sfoak players — shared Spotify OAuth (Authorization Code + PKCE).
   The browser drives PKCE; the worker finishes the exchange with the app
   secret (confidential client). One login authenticates EVERY page on this
   origin via localStorage.  window.SfoakAuth
   =========================================================================== */
window.SfoakAuth = (function () {
  const CLIENT_ID = "0701db31d7e34ca0b0693023b442467f";
  const REDIRECT_URI = "https://customprojects.info/localmusic/sfoak/players/callback/";
  const WORKER = "https://localmusic-search.mr-raleigh-j.workers.dev";
  // Premium + full remote control. `streaming` is the SDK gate (Premium only).
  const SCOPES = [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-modify-playback-state",
    "user-read-playback-state",
    "user-read-currently-playing",
  ].join(" ");

  const K_TOK = "sfoak_tok";     // {access_token, refresh_token, expires_at, scope}
  const K_PKCE = "sfoak_pkce";
  const K_RET = "sfoak_return";

  const b64url = (buf) =>
    btoa(String.fromCharCode.apply(null, new Uint8Array(buf)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  function randomVerifier(len) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    const a = crypto.getRandomValues(new Uint8Array(len || 64));
    let s = "";
    for (let i = 0; i < a.length; i++) s += chars[a[i] % chars.length];
    return s;
  }
  async function challengeOf(verifier) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return b64url(digest);
  }
  function readTok() { try { return JSON.parse(localStorage.getItem(K_TOK) || "null"); } catch (e) { return null; } }
  function writeTok(t) { localStorage.setItem(K_TOK, JSON.stringify(t)); }

  async function login(returnTo) {
    const verifier = randomVerifier(64);
    const code_challenge = await challengeOf(verifier);
    localStorage.setItem(K_PKCE, verifier);
    localStorage.setItem(K_RET, returnTo || location.href);
    const p = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      code_challenge_method: "S256",
      code_challenge: code_challenge,
      scope: SCOPES,
    });
    location.assign("https://accounts.spotify.com/authorize?" + p.toString());
  }

  // Build the authorize URL without navigating — used by validators/diagnostics.
  async function authorizeUrl() {
    const verifier = randomVerifier(64);
    const code_challenge = await challengeOf(verifier);
    const p = new URLSearchParams({
      client_id: CLIENT_ID, response_type: "code", redirect_uri: REDIRECT_URI,
      code_challenge_method: "S256", code_challenge, scope: SCOPES,
    });
    return "https://accounts.spotify.com/authorize?" + p.toString();
  }

  async function handleCallback() {
    const q = new URLSearchParams(location.search);
    const ret = localStorage.getItem(K_RET) || "../v10/";
    const err = q.get("error");
    if (err) return { ok: false, error: err, returnTo: ret };
    const code = q.get("code");
    const verifier = localStorage.getItem(K_PKCE);
    if (!code || !verifier) return { ok: false, error: "missing code or verifier", returnTo: ret };
    let data;
    try {
      const r = await fetch(WORKER + "/api/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: REDIRECT_URI }),
      });
      data = await r.json();
      if (!r.ok || !data.access_token) {
        return { ok: false, error: data.error_description || data.error || "exchange failed", returnTo: ret };
      }
    } catch (e) {
      return { ok: false, error: String(e), returnTo: ret };
    }
    writeTok({
      access_token: data.access_token,
      refresh_token: data.refresh_token || null,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      scope: data.scope || "",
    });
    localStorage.removeItem(K_PKCE);
    return { ok: true, returnTo: ret };
  }

  let refreshing = null;
  async function refresh() {
    const t = readTok();
    if (!t || !t.refresh_token) return null;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const r = await fetch(WORKER + "/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: t.refresh_token }),
        });
        const d = await r.json();
        if (!r.ok || !d.access_token) return null;
        writeTok({
          access_token: d.access_token,
          refresh_token: d.refresh_token || t.refresh_token,
          expires_at: Date.now() + (d.expires_in || 3600) * 1000,
          scope: d.scope || t.scope,
        });
        return d.access_token;
      } catch (e) { return null; } finally { refreshing = null; }
    })();
    return refreshing;
  }

  async function getToken() {
    const t = readTok();
    if (!t) return null;
    if (Date.now() > t.expires_at - 60000) return await refresh();
    return t.access_token;
  }

  function isLoggedIn() { return !!readTok(); }
  function tokenInfo() { return readTok(); }
  function logout() { localStorage.removeItem(K_TOK); }

  return { login, authorizeUrl, handleCallback, getToken, refresh, isLoggedIn, tokenInfo, logout,
           CLIENT_ID, REDIRECT_URI, WORKER, SCOPES };
})();
