import { requireSession, getState, setState, json, configError } from '../../_utils.js';

export async function onRequestDelete({ request, env, params }) {
  const cfg = configError(env);
  if (cfg) return cfg;
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Not signed in.' }, { status: 401 });
  if (session.mode !== 'power') return json({ error: 'Power user only.' }, { status: 403 });
  const state = await getState(env);
  const before = state.events.length;
  state.events = state.events.filter(e => e.id !== params.id);
  if (state.events.length === before) {
    return json({ error: 'Event not found.' }, { status: 404 });
  }
  await setState(env, state);
  return json({ ok: true, state });
}
