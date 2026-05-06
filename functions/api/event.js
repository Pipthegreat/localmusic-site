import { requireSession, getState, setState, makeId, json, configError } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const cfg = configError(env);
  if (cfg) return cfg;
  const session = await requireSession(request, env);
  if (!session) return json({ error: 'Not signed in.' }, { status: 401 });
  const data = await request.json().catch(() => ({}));
  const projectId = String(data.projectId || '');
  const type = data.type;
  const reason = String(data.reason || '').trim();
  const evidence = String(data.evidence || '').trim();
  if (!projectId || (type !== '+' && type !== '-')) {
    return json({ error: 'Missing projectId or type.' }, { status: 400 });
  }
  if (!reason) return json({ error: 'Reason is required.' }, { status: 400 });

  const state = await getState(env);
  if (!state.projects.find(p => p.id === projectId)) {
    return json({ error: 'Unknown project.' }, { status: 404 });
  }
  state.events.push({
    id: makeId(),
    projectId, type, reason, evidence,
    timestamp: new Date().toISOString(),
    author: session.user
  });
  await setState(env, state);
  return json({ ok: true, state });
}
