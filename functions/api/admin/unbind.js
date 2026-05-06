import { ACCOUNTS, setBindings, json, configError } from '../../_utils.js';

// Recover from a self-lockout. Anyone who knows BOTH passwords can clear
// all IP bindings; the next login from any IP re-binds. No session
// required (the whole point is that you can't sign in).
export async function onRequestPost({ request, env }) {
  const cfg = configError(env);
  if (cfg) return cfg;
  const data = await request.json().catch(() => ({}));
  let matched = 0;
  const required = Object.keys(ACCOUNTS).length;
  for (const [u, acct] of Object.entries(ACCOUNTS)) {
    if (typeof data[u] === 'string' && data[u] === acct.password) matched++;
  }
  if (matched < required) {
    return json({ error: 'Both passwords are required to unlock.' }, { status: 401 });
  }
  await setBindings(env, {});
  return json({ ok: true });
}
