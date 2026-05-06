// Shared helpers for the /tracker Cloudflare Pages Functions.
//
// Storage layout in the bound KV namespace `TRACKER`:
//   bindings  -> { "<username-lower>": "<ip>" }
//   state     -> { projects: [...], events: [...] }
//
// Auth model:
//   - On valid login, the username is bound to the request IP
//     (CF-Connecting-IP). Future logins succeed only from the same IP.
//   - A signed httpOnly cookie carries the session for 30 days.
//   - Every privileged request re-validates the IP against the binding,
//     so a stolen cookie alone is not enough.

export const ACCOUNTS = {
  'mr.skye': { password: 'isleofskye1!', mode: 'normal' },
  'whoever': { password: 'dad95070',     mode: 'power'  }
};

export const COOKIE_NAME = 'tracker_session';
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes) {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : new Uint8Array(bytes);
  let str = '';
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const str = atob(padded);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64urlEncode(sig);
}

export async function signSession(payload, secret) {
  const body = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = await hmac(secret, body);
  return body + '.' + sig;
}

export async function verifySession(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = await hmac(secret, parts[0]);
  // Constant-time compare — strings are equal length here, so a per-char
  // diff is acceptable.
  if (expected.length !== parts[1].length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ parts[1].charCodeAt(i);
  }
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(dec.decode(b64urlDecode(parts[0])));
    if (!payload || typeof payload !== 'object') return null;
    if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  for (const part of cookie.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('=') || '');
  }
  return null;
}

export function makeCookieHeader(name, value, maxAge, opts = {}) {
  const parts = [`${name}=${value}`];
  parts.push('Path=/');
  parts.push('HttpOnly');
  if (!opts.insecure) parts.push('Secure');
  parts.push('SameSite=Strict');
  if (typeof maxAge === 'number') parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || '';
}

export async function getBindings(env) {
  const raw = await env.TRACKER.get('bindings');
  return raw ? JSON.parse(raw) : {};
}
export async function setBindings(env, bindings) {
  await env.TRACKER.put('bindings', JSON.stringify(bindings));
}

export async function getState(env) {
  const raw = await env.TRACKER.get('state');
  if (raw) {
    const parsed = JSON.parse(raw);
    // Auto-merge any newly-added default projects.
    const existing = new Set(parsed.projects.map(p => p.id));
    for (const seed of defaultProjects()) {
      if (!existing.has(seed.id)) parsed.projects.push(seed);
    }
    return parsed;
  }
  return { projects: defaultProjects(), events: [] };
}
export async function setState(env, state) {
  await env.TRACKER.put('state', JSON.stringify(state));
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function defaultProjects() {
  const seeds = [
    ['Aggregating', 'Property Damage Reporting as a Service'],
    ['Aggregating', 'Local Music Live'],
    ['Rotomolds',   'Building a Kiln'],
    ['Rotomolds',   'Building a Mold'],
    ['Rotomolds',   'Selling Specialty Car Parts'],
    ['3D Printing', 'Etsy Store'],
    ['3D Printing', 'Prototypes for Manufacturing'],
    ['3D Printing', 'Roll-out bed for car'],
    ['3D Printing', 'Furniture Company'],
    ['Games',       'Research'],
    ['Games',       'Storyboarding'],
    ['Games',       'Final Designs'],
  ];
  const now = new Date().toISOString();
  return seeds.map(([cat, name]) => ({
    id: slug(cat) + ':' + slug(name),
    category: cat,
    name,
    done: false, doneAt: null,
    starred: false, starredAt: null,
    createdAt: now
  }));
}

export function makeId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(init.headers || {})
    }
  });
}

export function configError(env) {
  if (!env.TRACKER) return json({ error: 'Server misconfigured: KV namespace TRACKER is not bound.' }, { status: 500 });
  if (!env.SESSION_SECRET) return json({ error: 'Server misconfigured: SESSION_SECRET env var is not set.' }, { status: 500 });
  return null;
}

export async function requireSession(request, env) {
  const token = getCookie(request, COOKIE_NAME);
  const payload = await verifySession(token, env.SESSION_SECRET);
  if (!payload) return null;
  // Re-verify the bound IP so a stolen cookie can't be replayed elsewhere.
  const ip = clientIp(request);
  const bindings = await getBindings(env);
  if (bindings[String(payload.user || '').toLowerCase()] !== ip) return null;
  return payload;
}
