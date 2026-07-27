# Trip JSON — authoring contract (normalized model)

One file per trip in `trips/`, listed in `trips/index.json`. POIs are a
**top-level collection** — siblings of activities. An activity **references** its
POIs by id, and one POI may be referenced by **several** activities (shared).

## Catalog: `trips/index.json`
```json
{ "trips": [ { "file": "ohrid-2026-07.json", "name": "Ohrid — Car-Free Week" } ] }
```

## Trip file shape
```
{
  "trip_id":   string
  "name":      string      // display copy: short "Name - Essence" style, MAX
                           // 30 characters (fits picker, overview dot labels,
                           // banner) — e.g. "GR20 - Island Backpacking".
                           // Loader warns when exceeded.
  "region":    string
  "date_range":string
  "duration_days": int             // trip length; drives the density check
  "theme":     string              // OPTIONAL — set for theme-paced trips, e.g.
                                   // "snowboard-resort" | "rail-journey" |
                                   // "backpacking" (relaxes density, see below)
  "summary":   string              // the trip WRITE-UP: shown in the banner at
                                   // the top of the map when the trip is
                                   // selected — what the trip is about, its
                                   // limiters, what to expect
  "activities":[ Activity, ... ]   // the anchors / start pins
  "pois":      [ POI, ... ]        // top-level, referenced by activities
  "transit":   [ Transit, ... ]    // optional utility points
}
```

## Content density rule (taxonomy)

Time-of-day buckets derive from the START hour of `time_window`:
**morning** < 12:00 · **afternoon** 12:00–16:59 · **evening** ≥ 17:00.

**Default (destination trips, no `theme`):** real choice at any time of day —
- **≥ 2 activities starting in each bucket** (morning, afternoon, evening);
- **total activity count ≥ 1.5 × `duration_days`** (a week ≈ 11+, a long
  weekend ≈ 6+).

**Theme-paced trips (`theme` set):** when the core theme dictates the clock —
resort riding days, a train's pre-determined stops, a thru-hike's daily
stages — the per-bucket minimums don't apply. Instead the rule is
**total activity count ≥ 1 × `duration_days`** (every day has its stage/stop/
session), and evening slots stay honest: only food/nightlife/night-session
things ever start ≥ 17:00.

The loader checks the applicable rule on load and logs a `Content density:`
console warning per violation (the trip still renders — thin density is a
content bug, not a data error).

### Activity  (a start/anchor pin AND a reference list)
```
{
  "activity_id":  string   // unique within the trip
  "name":         string
  "type":         "outdoor" | "food" | "scenery" | "nightlife" | "historic"
  "order_index":  int
  "lat","lng":    number   // AUTHORED, verified
  "time_window":  "HH:MM–HH:MM"
  "duration":     string
  "difficulty":   "easy" | "moderate" | "hard"   // optional
  "cash_only":    bool     // optional
  "description":  string
  "reference_link": url
  "image":        url      // OPTIONAL — never authored in practice; cards
                           // auto-resolve: Wikipedia lead image → nearest
                           // Commons photo to the coords → placeholder
  "poi_ids":      [ "poi-id-1", "poi-id-2" ]   // the POIs this activity calls,
                                               // in display order (numbered 2,3,4…)
}
```

### POI  (top-level, shareable)
```
{
  "poi_id":       string   // unique within the trip; referenced from activities
  "type":         one of the 5 types   // POI ALWAYS keeps its OWN color
  "name":         string
  "lat","lng":    number
  "time_window":  (optional)
  "duration":     (optional)
  "difficulty":   (optional)
  "cash_only":    (optional)
  "description":  string
  "reference_link": url
  "image":        url      // OPTIONAL — auto-resolved like activities
}
```

### Transit (utility layer, not one of the 5 types)
```
{ "name": string, "lat": number, "lng": number, "description": string, "reference_link": url }
```

## Key rules of the normalized model
- **Reference direction is activity → POI.** Activities list `poi_ids`; POIs
  don't name their parents. This is what allows sharing.
- **Shared POIs:** put a POI's id in multiple activities' `poi_ids`. It's defined
  once in `pois[]` and renders once on the map. Its card shows a "shared" hint.
- **Color:** every POI renders in its own `type` color, regardless of which
  activity references it (a shared POI has no single parent to inherit from).
- **Numbering is contextual:** numbers appear only when an activity is selected.
  The selected activity is **1**; the POIs in its `poi_ids` are **2, 3, 4…** in
  list order. Deselect and numbers disappear. A shared POI's number therefore
  depends on which activity is selected — it is not a fixed property of the POI.
- **The start pin is the activity itself** (position 1). `poi_ids` are the
  additional stops.

## Validation (on load, logged to console; bad trip is skipped)
- every POI has a unique `poi_id`, a valid `type`, numeric lat/lng
- every activity has a valid `type`, numeric lat/lng
- **every `poi_id` referenced by an activity exists in `pois[]`** (dangling
  references are reported by name)
- images are NOT required — they resolve automatically (see the image field notes
  and the density section above)
- content density (warns, never skips): ≥2 activities per time-of-day bucket and
  ≥1.5 activities per `duration_days` day
