/* =============================================================================
   export.js — "get this trip into Google Maps".
   Google offers no URL that injects multiple data-rich pins into consumer
   Google Maps, so the full-trip path is KML → Google My Maps (import at
   mymaps.google.com; the map then appears in the Google Maps app under
   Your places → Maps). Every activity, POI, and transit point becomes a
   placemark named "order.position Name" with a description carrying the type,
   time window, duration, difficulty, cash-only flag, description text, and
   reference link — the "data on each pin".
   Per-pin deep links (single place, no import) live here too.
   ============================================================================= */
import { CONFIG } from "./config.js?v=27";

/* Single-pin deep link. Searching the NAME (biased to the coords via the /@
   viewport) snaps to Google's own place listing — hours, photos, reviews —
   which is richer than a bare dropped pin; coords remain the fallback. */
export function gmapsUrl(f) {
  const at = `@${f.lat},${f.lng},16z`;
  const name = (f.name || "").trim();
  return name
    ? `https://www.google.com/maps/search/${encodeURIComponent(name)}/${at}`
    : `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`;
}

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* KML abgr color from the type's #rrggbb (full opacity). */
function kmlColor(hex) {
  const m = /^#?(..)(..)(..)$/.exec(hex || "#888888");
  return m ? `ff${m[3]}${m[2]}${m[1]}`.toLowerCase() : "ff888888";
}

function placemark(name, f, styleId) {
  const bits = [];
  bits.push(CONFIG.TYPES[f.type] ? CONFIG.TYPES[f.type].label : f.type);
  if (f.time_window) bits.push(`Time: ${f.time_window}`);
  if (f.duration)    bits.push(`Duration: ${f.duration}`);
  if (f.difficulty)  bits.push(`Difficulty: ${f.difficulty}`);
  if (f.cash_only)   bits.push("CASH ONLY");
  const head = bits.join(" · ");
  const ref = f.reference_link ? `\n\nReference: ${f.reference_link}` : "";
  const desc = `${head}\n\n${f.description || ""}${ref}`;
  return `    <Placemark>
      <name>${esc(name)}</name>
      <description><![CDATA[${desc}]]></description>
      <styleUrl>#${styleId}</styleUrl>
      <Point><coordinates>${f.lng},${f.lat},0</coordinates></Point>
    </Placemark>`;
}

/* Build one KML document from the render-model features of ONE trip.
   Structure: a folder per activity (its POIs inside, numbered order.position),
   then a Transit folder. Shared POIs are emitted once, under the first
   activity that references them, with a "(shared)" tag in the name. */
export function tripKML(features, tripName) {
  const acts = features.filter(f => f.kind === "activity")
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const poiById = {};
  features.forEach(f => { if (f.kind === "poi") poiById[f.poi_id] = f; });
  const transit = features.filter(f => f.kind === "transit");

  const styles = Object.entries(CONFIG.TYPES).map(([k, v]) => `  <Style id="${k}">
    <IconStyle><color>${kmlColor(v.color)}</color>
      <Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon>
    </IconStyle>
  </Style>`).join("\n");

  const emitted = new Set();
  const folders = acts.map(a => {
    const rows = [placemark(`${a.order_index}. ${a.name}`, a, a.type)];
    (a.poi_ids || []).forEach((pid, i) => {
      const p = poiById[pid];
      if (!p) return;
      if (emitted.has(pid)) return;          // shared POI: once is enough
      emitted.add(pid);
      const shared = (p.activity_ids || []).length > 1 ? " (shared)" : "";
      rows.push(placemark(`${a.order_index}.${i + 1} ${p.name}${shared}`, p, p.type));
    });
    return `  <Folder>\n    <name>${esc(`${a.order_index}. ${a.name}`)}</name>\n${rows.join("\n")}\n  </Folder>`;
  });
  if (transit.length) {
    folders.push(`  <Folder>\n    <name>Transit &amp; logistics</name>\n${transit.map(t => placemark(t.name, t, "transit")).join("\n")}\n  </Folder>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${esc(tripName)}</name>
  <description><![CDATA[Exported from Trip Map. Import at mymaps.google.com → Create a new map → Import → this file. The map then appears in the Google Maps app under Your places → Maps.]]></description>
${styles}
${folders.join("\n")}
</Document>
</kml>`;
}

export function downloadKML(kml, filename) {
  const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
