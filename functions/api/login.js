import {
  ACCOUNTS, COOKIE_NAME, COOKIE_MAX_AGE,
  signSession, getBindings, setBindings, clientIp,
  makeCookieHeader, json, configError
} from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const cfg = configError(env);
  if (cfg) return cfg;

  const data = await request.json().catch(() => ({}));
  const username = (data.username || '').trim();
  const password = data.password || '';
  const acct = ACCOUNTS[username.toLowerCase()];
  if (!acct || acct.password !== password) {
    return json({ error: 'Wrong username or password.' }, { status: 401 });
  }
  const ip = clientIp(request);
  if (!ip) return json({ error: 'No client IP available.' }, { status: 500 });

  const bindings = await getBindings(env);
  const key = username.toLowerCase();
  if (bindings[key] && bindings[key] !== ip) {
    return json({
      error: 'This account is already locked to a different device. Use the unlock form (both passwords required) to rebind.'
    }, { status: 403 });
  }
  if (!bindings[key]) {
    bindings[key] = ip;
    await setBindings(env, bindings);
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await signSession({
    user: username, mode: acct.mode, ip, iat: now, exp: now + COOKIE_MAX_AGE
  }, env.SESSION_SECRET);

  return json({ ok: true, user: username, mode: acct.mode }, {
    headers: { 'Set-Cookie': makeCookieHeader(COOKIE_NAME, token, COOKIE_MAX_AGE) }
  });
}
