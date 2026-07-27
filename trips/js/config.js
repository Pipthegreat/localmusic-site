/* =============================================================================
   config.js — everything you swap or tune lives here, nothing else.
   ============================================================================= */
export const CONFIG = {
  /* ── SWAP POINT ①: the basemap (production = self-hosted) ──────────────────
     ONE origin serves all three basemap assets (tiles + fonts + sprites), so
     there is a single thing to set. Point it at storage that supports HTTP
     Range requests + CORS — Cloudflare R2 is recommended (no egress fees).
     Include the protocol, NO trailing slash. Expected layout on the host:
        /planet.pmtiles                     ← the OSM planet PMTiles file
        /fonts/{fontstack}/{range}.pbf      ← protomaps/basemaps-assets  fonts/
        /sprites/v4/light.json|.png|@2x.*   ← protomaps/basemaps-assets  sprites/
     Full setup is in README "Self-hosting the basemap". */
  BASEMAP_HOST: "https://basemap.customprojects.info",

  /* Basemap source. true = OpenFreeMap: a full-colour world map with NO API key
     and NO usage limits (js/map.js → DEV_STYLE_URL). This is the reliable
     default and works on ANY domain with zero setup — it's what makes this a
     drop-in. Flip to false ONLY after you've set up the self-hosted BASEMAP_HOST
     above (README "Self-hosting the basemap") — the fully-owned, no-third-party
     option. */
  USE_OPENFREEMAP: true,

  /* Basemap flavor from @protomaps/basemaps. "light" is the basic style.
     The hand-tuned outdoor/topo pass is a later styling task. */
  BASEMAP_FLAVOR: "light",

  /* Where trip JSON lives, relative to index.html. */
  TRIPS_DIR: "trips",

  /* Initial camera if no trip is auto-focused. */
  DEFAULT_CENTER: [20.80, 41.02],
  DEFAULT_ZOOM: 9,

  /* Visibility tuning (spec §4). */
  RADIUS_MIN_KM: 2,
  RADIUS_MAX_KM: 25,
  RADIUS_DEFAULT_KM: 8,
  CLUSTER_AT: 100,       // N: cluster/cap threshold for explore-mode union
  EXPLORE_MIN_ZOOM: 8,   // zoom-out floor so a wide view never paints everything

  /* Pins collapse into one stacked marker (count badge + card carousel) when
     they overlap on screen (within STACK_PX pixels) AND are genuinely the
     same place on the ground (within STACK_MAX_KM). The ground cap stops a
     zoomed-out world view from merging pins that are km apart. */
  STACK_PX: 26,
  STACK_MAX_KM: 2,

  /* Below this zoom (with "All trips" selected) the map shows ONE dot per
     trip at the trip's centroid — the catalog overview. Tap a dot to open
     that trip. */
  TRIP_OVERVIEW_ZOOM: 5,

  /* Image resolution chain for cards (no manual image authoring needed):
     authored image → Wikipedia lead image (via reference link, else name
     search) → nearest Wikimedia Commons photo to the pin's coordinates →
     PLACEHOLDER. Thumbs fetched at ~480p. Set IMAGE_LOOKUP to false to
     disable the runtime lookups. */
  IMAGE_LOOKUP: true,
  PLACEHOLDER: "assets/placeholder.svg",

  /* The five experience types + the transit utility layer. Color = per type. */
  TYPES: {
    outdoor:   { label: "Outdoor rec", color: "#C64B27" },
    food:      { label: "Food",        color: "#B8892B" },
    scenery:   { label: "Scenery",     color: "#2E7D6B" },
    nightlife: { label: "Nightlife",   color: "#6A4C93" },
    historic:  { label: "Historic",    color: "#3A6EA5" },
    transit:   { label: "Transit",     color: "#8A8A8A" }
  }
};
