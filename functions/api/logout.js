import { COOKIE_NAME, makeCookieHeader, json } from '../_utils.js';

export async function onRequestPost() {
  return json({ ok: true }, {
    headers: { 'Set-Cookie': makeCookieHeader(COOKIE_NAME, '', 0) }
  });
}
