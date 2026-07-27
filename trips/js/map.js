/* =============================================================================
   map.js — MapLibre + PMTiles init. This is the real self-hosted render path;
   the whole basemap (tiles + fonts + sprites) is served from CONFIG.BASEMAP_HOST
   in production. Globals maplibregl / pmtiles come from the vendor scripts in
   index.html (kept as globals so the file works from static hosting with no
   build step). @protomaps/basemaps ships no UMD/global build, so it is imported
   here as an ES module straight from the CDN (its ESM bundle has no bare
   imports). ================================================================== */
import { CONFIG } from "./config.js?v=28";
import { layers, namedFlavor } from "https://unpkg.com/@protomaps/basemaps@5.7.2/dist/esm/index.js";

// LOCAL DEV / DEMO basemap: OpenFreeMap — full-planet vector tiles, MapLibre
// style hosted for us, NO API key and NO usage limits (the whole point: the old
// data.source.coop demo bucket rate-limited and left the map blank). The style
// URL is self-contained (its own tiles/fonts/sprites/attribution). Flavors:
// liberty (full colour), bright, positron (muted grey). "liberty" is chosen so
// land/water/parks carry real colour and the trip pins read clearly against it.
// Production instead uses the self-hosted Protomaps PMTiles under
// CONFIG.BASEMAP_HOST (see basemapStyle).
const DEV_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Production self-hosted basemap: the three assets under CONFIG.BASEMAP_HOST.
function basemapStyle() {
  const h = CONFIG.BASEMAP_HOST.replace(/\/+$/, "");   // tolerate a trailing slash
  return {
    version: 8,
    glyphs: `${h}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${h}/sprites/v4/${CONFIG.BASEMAP_FLAVOR}`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${h}/planet.pmtiles`,
        attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
      }
    },
    layers: layers("protomaps", namedFlavor(CONFIG.BASEMAP_FLAVOR), { lang: "en" })
  };
}

export function initMap(container) {
  if (typeof maplibregl === "undefined" || typeof pmtiles === "undefined") {
    throw new Error("Map libraries not loaded — serve over http/https, not file://");
  }

  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);

  // OpenFreeMap (reliable, no limits, default) OR the self-hosted PMTiles basemap
  const style = CONFIG.USE_OPENFREEMAP ? DEV_STYLE_URL : basemapStyle();

  const map = new maplibregl.Map({
    container,
    style,
    center: CONFIG.DEFAULT_CENTER,
    zoom: CONFIG.DEFAULT_ZOOM,
    attributionControl: true
  });
  // bottom-right stack, top to bottom: zoom +/- above the two scale bars.
  // MapLibre prepends controls in bottom corners, so add scales FIRST and the
  // zoom control LAST to put +/- on top. Scales recompute per zoom AND per
  // latitude of the current view, so they stay accurate everywhere.
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "imperial" }), "bottom-right");
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
  return map;
}
