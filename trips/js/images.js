/* =============================================================================
   images.js — automatic card images, no manual authoring required.
   Resolution chain per pin:
     1. authored image (anything that isn't the placeholder) — always wins
     2. Wikipedia lead image — via the pin's wikipedia.org reference link,
        else a Wikipedia title search on the (cleaned) pin name whose top hit
        must loosely match the name
     3. Wikimedia Commons geosearch — the nearest photo taken within ~500 m of
        the pin's coordinates (covers trailheads/villages/venues with no
        article of their own)
     4. CONFIG.PLACEHOLDER (only when the web genuinely has nothing)
   Thumbs are requested at 854 px wide (≈480p) — high-res on the card without
   pulling full originals. Lookups run lazily when a card opens; results
   (including misses) are cached in-memory and in sessionStorage.
   ============================================================================= */
import { CONFIG } from "./config.js?v=28";
import { placeholderFor } from "./placeholders.js?v=28";
export { placeholderFor };

const THUMB_W = 854;   // ≈480p wide
const mem = new Map();

export function hasAuthoredImage(f) {
  return !!(f.image && !f.image.endsWith("placeholder.svg"));
}

/* Synchronous initial src for a card — an instant inline SVG per type (zero
   network, zero wait); the real web image swaps in when fetched. */
export function baseImage(f) {
  return hasAuthoredImage(f) ? f.image : placeholderFor(f.type);
}

/* Async: returns a fetched web image URL, or null when nothing was found. */
export async function resolveImage(f) {
  if (!CONFIG.IMAGE_LOOKUP || hasAuthoredImage(f)) return null;
  const key = "tripmap:img:" + (f.trip_id || "") + ":" + (f.poi_id || f.activity_id || f.name);
  if (mem.has(key)) return mem.get(key);
  try {
    const hit = sessionStorage.getItem(key);
    if (hit !== null) { const v = hit || null; mem.set(key, v); return v; }
  } catch (e) { /* storage may be unavailable; in-memory cache still works */ }

  let url = null;
  try { url = await lookup(f); } catch (e) { url = null; }
  mem.set(key, url);
  try { sessionStorage.setItem(key, url || ""); } catch (e) {}
  return url;
}

async function lookup(f) {
  // 1) the pin's reference link is already a Wikipedia article
  const m = (f.reference_link || "").match(/wikipedia\.org\/wiki\/([^#?]+)/);
  if (m) {
    const u = await summaryThumb(decodeURIComponent(m[1]));
    if (u) return u;
  }
  // 2) Wikipedia title search on the cleaned pin name
  const q = f.name.replace(/\(.*?\)/g, "").split(/\s[—–]\s/)[0].trim();
  if (q) {
    const r = await fetch(`https://en.wikipedia.org/w/rest.php/v1/search/title?q=${encodeURIComponent(q)}&limit=1`);
    if (r.ok) {
      const d = await r.json();
      const hit = d.pages && d.pages[0];
      if (hit && looseMatch(q, hit.title)) {
        if (hit.thumbnail && hit.thumbnail.url) return sizeThumb(hit.thumbnail.url);
        const u = await summaryThumb(hit.key);
        if (u) return u;
      }
    }
  }
  // 3) nearest Commons photo to the pin's coordinates
  return commonsNear(f.lat, f.lng);
}

async function summaryThumb(title) {
  const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title));
  if (!r.ok) return null;
  const d = await r.json();
  return d.thumbnail && d.thumbnail.source ? sizeThumb(d.thumbnail.source) : null;
}

async function commonsNear(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    `&generator=geosearch&ggscoord=${lat}%7C${lng}&ggsradius=500&ggslimit=8&ggsnamespace=6` +
    `&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=${THUMB_W}`;
  const r = await fetch(u);
  if (!r.ok) return null;
  const d = await r.json();
  const pages = d.query && d.query.pages ? Object.values(d.query.pages) : [];
  // geosearch results carry an index ordered by distance; keep photos only
  pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  for (const p of pages) {
    const ii = p.imageinfo && p.imageinfo[0];
    if (ii && /^image\/(jpeg|png|webp)/.test(ii.mime || "") && (ii.thumburl || ii.url)) {
      return ii.thumburl || ii.url;
    }
  }
  return null;
}

/* Normalize a Wikimedia thumb URL to the card width. */
function sizeThumb(u) {
  if (u.startsWith("//")) u = "https:" + u;
  return u.replace(/\/(\d+)px-/, `/${THUMB_W}px-`);
}

/* The top search hit must share at least one significant word with the query,
   so "Coffee Bazaar" can't silently become an unrelated article's photo. */
function looseMatch(q, title) {
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const t = norm(title);
  return norm(q).split(/[^a-z0-9]+/).filter(w => w.length >= 4).some(w => t.includes(w));
}
