# Trip Map — Product & Data Specification (as built)

**Status:** implemented and render-verified
**Renderer:** MapLibre GL JS + Protomaps/PMTiles
**Last updated:** 2026-07-14

This is the build contract for the app as it exists. The authoring contract
lives in `data/SCHEMA.md`; the decision history and reasoning live in
`PROJECT.md` (§3). Where this file and PROJECT.md conflict, PROJECT.md's dated
decisions win — this file is the summary, not the ledger.

> Superseded (2026-07-13): the original spec nested POIs under activities with
> parent color inheritance and a stored `poi_order`. That design was replaced
> by the normalized model below before first render. If you find references to
> "inheritance" or fixed POI numbers elsewhere, they are stale.

---

## 1. Platform & scope

- **Targets:** mobile + desktop web, responsive, one static codebase — no
  server, no build step, no API keys.
- **Scope:** multi-trip catalog (`trips/index.json` manifest, one JSON per trip).
- **Offline:** architected-for (PMTiles); per-trip extracts are roadmap work.
- **Deploy target:** customprojects.info (see README).

## 2. Data model (normalized)

Trip → activities[] + pois[] as **sibling top-level collections**; activities
reference POIs by id (`poi_ids`, ordered). One POI may be referenced by many
activities (**shared**) — defined once, rendered once, "shared · N activities"
hint on its card.

- **Color is per-type, always.** A POI renders in its own `type` color — there
  is no parent inheritance (a shared POI has no single parent).
- **Numbering is contextual, never stored.** Selected activity = 1; its
  `poi_ids` = 2, 3, 4… in list order. Deselect → numbers gone.
- **Coordinates are authored and verified** (Wikipedia/OSM/official sources).
  No runtime geocoding, ever.
- **Trip-level fields:** `duration_days` (drives density checks), optional
  `theme` (drives pacing expectations, §6), `summary` (the write-up shown in
  the trip banner, §5).

## 3. Types, transit, images

- Five experience types (outdoor, food, scenery, nightlife, historic), one hue
  each; **transit** is a separate neutral utility layer with its own toggle.
- **Images are never manually authored.** Cards resolve at open time:
  authored `image` (if ever present) → Wikipedia lead image → nearest
  Wikimedia Commons photo to the coordinates → inline per-type SVG placeholder
  (also the instant loading state — a data URI, zero network). ~480p thumbs,
  results cached per session. `IMAGE_LOOKUP` in config.js switches lookups off.

## 4. Map behavior

- **Itinerary mode (default):** activity pins always; a POI shows ONLY when its
  activity is selected (numbered) or the **"Show all POIs" toggle** (mid-left
  control) is on (unnumbered). Deselect via card ✕ or a map-background tap.
- **Explore mode:** union predicate `inViewport OR withinRadius(origin, R)`.
  The radius **origin is GPS or a user-dropped pin** (draggable, black); R is
  the 2–25 km slider. No-origin degrades to viewport-only.
- **Consolidation:** pixel-overlapping pins always merge. Same-place groups
  (≤ 2 km span) become a **stack** — a pin with a count badge; wider groups
  become a numbered **cluster bubble** at the centroid. Both open a **carousel
  card** (‹ › cycling, number chips, "n of N"; clusters add a ⤢ zoom-to-fit).
  Zooming in un-stacks. Marker note: MapLibre owns the marker root's transform
  and position — all visual styling lives on inner elements.
- **Catalog overview:** fully zoomed out (zoom < `TRIP_OVERVIEW_ZOOM`, default
  5) with "All trips" selected, the map collapses to **one labeled dot per
  trip**, anchored on the trip's **medoid** (the activity with minimum total
  distance to the trip's other activities — always a real stop; a plain mean
  put elongated routes' dots in the ocean). Tapping a dot opens that trip.
- **Controls:** bottom-right stack, top to bottom: zoom +/- → mi/ft scale →
  km/m scale → attribution. Scales recompute per zoom and latitude. (MapLibre
  prepends controls in bottom corners — add scales first, zoom last.)

## 5. Cards, trip banner, filters

- Shared card template; fields show/hide by presence (time window, duration,
  difficulty, cash-only, shared hint). Every card has a **Google Maps** link
  (name search pinned to coords) and the Reference link.
- **Trip banner:** selecting a trip shows its summary write-up at the top of
  the map — what the trip is about, its limiters, what to expect. Dismissible
  (✕); hidden on "All trips".
- **Display copy rules:** trip `name` is "Name - Essence" style, max 30 chars
  (loader-warned) — it appears in the picker, overview dot labels, and banner.
  The picker appends "(N days)" from `duration_days` automatically.
- **Filters:** trip × type × time-of-day, both modes. Type row has an
  `all · none` control; individually deselecting the last type auto-restores
  all. Time buckets derive from the START hour (<12 / 12–16 / 17+); **POIs
  inherit buckets from their referencing activities** (own window wins) so a
  windowless trailhead can never surface under "Evening".

## 6. Content density (taxonomy)

Default rule: ≥2 activities starting in each time bucket AND total ≥1.5 ×
`duration_days`. **Theme-paced trips** (`theme` set — e.g. snowboard-resort,
rail-journey, backpacking) are trips whose core theme dictates the clock
(ride days, pre-determined stops, trail stages): they are exempt from the
per-bucket minimums and instead must average ≥1 activity per day. The loader
warns (console) on violations; it never blocks rendering.

## 7. Exports & sharing

- **KML export per trip** (panel button): every activity/POI/transit point as
  a data-rich placemark, foldered per activity, numbered `order.position`,
  shared POIs emitted once with a "(shared)" tag. Import path:
  mymaps.google.com → the Google Maps app (Your places → Maps).
- No Google Maps Platform API usage — their ToS bars offline/cached map
  content, and the charter bars API keys and per-view billing (PROJECT §3.1).

## 8. Pipeline & validation

JSON per trip → runtime fetch (`cache: "no-cache"`) → validate → in-memory
feature model. Validation fails loudly per trip (bad trip skipped): unique
`poi_id`s, valid types, numeric coords, every referenced `poi_id` resolves.
Density and `duration_days` issues warn without skipping. CSS/JS carry a
`?v=N` cache-bust version — bump everywhere on deploy (see README).
