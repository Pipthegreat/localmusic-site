import { requireSession, getState, setState, json, configError } from '../../../_utils.js';

export async function onRequestPost({ request, env, params }) {
  const cfg = configError(env);
  if (cfg) return cfg;
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Not signed in.' }, { status: 401 });
  if (session.mode !== 'power') return json({ error: 'Power user only.' }, { status: 403 });
  const state = await getState(env);
  const p = state.projects.find(x => x.id === params.id);
  if (!p) return json({ error: 'Project not found.' }, { status: 404 });
  p.done = !p.done;
  p.doneAt = p.done ? new Date().toISOString() : null;
  await setState(env, state);
  return json({ ok: true, state });
}
