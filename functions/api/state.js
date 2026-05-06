import { requireSession, getState, setState, json, configError } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const cfg = configError(env);
  if (cfg) return cfg;
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Not signed in.' }, { status: 401 });
  const state = await getState(env);
  return json({ session: { user: session.user, mode: session.mode }, state });
}

// Power-only: replace the entire state (used by the Import button).
export async function onRequestPost({ request, env }) {
  const cfg = configError(env);
  if (cfg) return cfg;
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Not signed in.' }, { status: 401 });
  if (session.mode !== 'power') return json({ error: 'Power user only.' }, { status: 403 });
  const incoming = await request.json().catch(() => null);
  if (!incoming || !Array.isArray(incoming.projects) || !Array.isArray(incoming.events)) {
    return json({ error: 'Bad payload shape.' }, { status: 400 });
  }
  await setState(env, { projects: incoming.projects, events: incoming.events });
  const state = await getState(env);
  return json({ ok: true, state });
}
