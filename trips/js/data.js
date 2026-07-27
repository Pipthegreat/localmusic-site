/* =============================================================================
   data.js — normalized model.
   A trip has TWO top-level collections that are siblings:
     - activities[] : each has its own point + a poi_ids[] listing the POIs it
       references (in display order). The activity is its own start/anchor.
     - pois[]       : top-level POIs, each with a unique poi_id. A POI may be
       referenced by MANY activities (shared). It carries its OWN type/color.
   Activities reference POIs by id (activity -> poi). Numbering is NOT stored on
   features; it is computed at selection time (see app.js) because a shared POI
   has no fixed position — its number depends on which activity is selected.
   ============================================================================= */
import { CONFIG } from "./config.js?v=27";

/* ---- validation: fail loudly, don't render blank cards ---- */
function validateTrip(trip, tripFile) {
  const errs = [];
  const where = `${tripFile}`;
  if (!trip.trip_id) errs.push(`${where}: missing trip_id`);
  if (!Array.isArray(trip.activities)) { errs.push(`${where}: activities[] missing`); return errs; }
  if (!Array.isArray(trip.pois)) { errs.push(`${where}: pois[] missing (normalized model)`); return errs; }

  // index POIs by id, catch dupes + bad fields
  const poiIndex = {};
  trip.pois.forEach((p, pi) => {
    const pt = `${where} · poi[${pi}] ${p.name || p.poi_id || "?"}`;
    if (!p.poi_id) errs.push(`${pt}: missing poi_id`);
    else if (poiIndex[p.poi_id]) errs.push(`${pt}: duplicate poi_id "${p.poi_id}"`);
    else poiIndex[p.poi_id] = p;
    if (!CONFIG.TYPES[p.type]) errs.push(`${pt}: type "${p.type}" not one of ${Object.keys(CONFIG.TYPES).join(", ")}`);
    if (typeof p.lat !== "number" || typeof p.lng !== "number") errs.push(`${pt}: lat/lng must be numbers`);
    // image is optional: cards auto-resolve one (Wikipedia → type default)
  });

  // activities: valid type, coords, image, and every referenced poi_id resolves
  trip.activities.forEach((a, ai) => {
    const at = `${where} · activity[${ai}] ${a.name || a.activity_id || "?"}`;
    if (!a.activity_id) errs.push(`${at}: missing activity_id`);
    if (!CONFIG.TYPES[a.type]) errs.push(`${at}: type "${a.type}" invalid`);
    if (typeof a.lat !== "number" || typeof a.lng !== "number") errs.push(`${at}: lat/lng must be numbers`);
    (a.poi_ids || []).forEach(id => {
      if (!poiIndex[id]) errs.push(`${at}: references unknown poi_id "${id}"`);
    });
  });
  return errs;
}

/* time-of-day bucket from a window's START hour (shared helper) */
function startBucket(tw) {
  const h = parseInt((tw || "").slice(0, 2), 10);
  return isNaN(h) ? null : (h < 12 ? "morning" : h < 17 ? "afternoon" : "evening");
}

/* ---- content-density taxonomy (warns, never skips) ----
   Every trip must offer real choice at any time of day: ≥2 activities whose
   time_window STARTS in each bucket (morning <12, afternoon 12–16, evening
   17+), and a total volume proportionate to trip length — guideline ≥1.5
   activities per day of `duration_days`. ---------------------------------- */
function densityWarnings(trip, tripFile) {
  const warns = [];
  // display-name copy rule: short "Name - Essence" titles, max 30 characters
  // (they must fit the picker, the overview dot labels, and the banner)
  if ((trip.name || "").length > 30)
    warns.push(`${tripFile}: name "${trip.name}" is ${trip.name.length} chars — max 30 ("Name - Essence" style)`);
  if (typeof trip.duration_days !== "number") {
    warns.push(`${tripFile}: missing duration_days — needed to check content density`);
    return warns;
  }
  if (trip.theme) {
    // theme-paced trip (resort / rail / thru-hike): the theme dictates the
    // clock, so bucket minimums don't apply — but every day needs its
    // stage/stop/session: total ≥ 1 per day
    if (trip.activities.length < trip.duration_days)
      warns.push(`${tripFile} (theme=${trip.theme}): ${trip.activities.length} activities for ${trip.duration_days} days — themed guideline is ≥1/day`);
    return warns;
  }
  const counts = { morning: 0, afternoon: 0, evening: 0 };
  trip.activities.forEach(a => { const b = startBucket(a.time_window); if (b) counts[b]++; });
  Object.entries(counts).forEach(([b, n]) => {
    if (n < 2) warns.push(`${tripFile}: only ${n} ${b} activit${n === 1 ? "y" : "ies"} — density rule wants ≥2 per time-of-day bucket`);
  });
  const min = Math.ceil(trip.duration_days * 1.5);
  if (trip.activities.length < min)
    warns.push(`${tripFile}: ${trip.activities.length} activities for ${trip.duration_days} days — guideline is ≥${min} (1.5/day)`);
  return warns;
}

/* ---- build the render model for one trip ----
   Produces:
     - features: one entry per activity + one per POI + transit. POIs appear
       ONCE even if shared. Each carries its own type. No poi_order baked in.
     - links: activity_id -> ordered [poi_id, ...] so selection can number them
     - transit list handled as its own utility features. ------------------- */
function buildTrip(trip) {
  const features = [];

  // activity anchors (the "start" pins; selectable)
  trip.activities.forEach(a => {
    features.push({
      kind: "activity", trip_id: trip.trip_id, activity_id: a.activity_id, type: a.type,
      order_index: a.order_index ?? 0, poi_ids: (a.poi_ids || []).slice(),
      name: a.name, lat: a.lat, lng: a.lng,
      time_window: a.time_window || "", duration: a.duration || "",
      difficulty: a.difficulty || "", cash_only: !!a.cash_only,
      description: a.description || "", reference_link: a.reference_link || "", image: a.image || null
    });
  });

  // top-level POIs (shared; own color). Record which activities reference each.
  const refBy = {};
  const actById = {};
  trip.activities.forEach(a => { actById[a.activity_id] = a; });
  trip.activities.forEach(a => (a.poi_ids || []).forEach(id => {
    (refBy[id] = refBy[id] || []).push(a.activity_id);
  }));
  trip.pois.forEach(p => {
    // time-filter semantics: a POI belongs to the time buckets of the
    // activities that reference it (own time_window wins if authored) — so a
    // trailhead on a morning hike can never surface under "Evening". A POI
    // with no window and no references stays visible at any time.
    const own = startBucket(p.time_window);
    const inherited = (refBy[p.poi_id] || [])
      .map(id => startBucket((actById[id] || {}).time_window)).filter(Boolean);
    features.push({
      kind: "poi", trip_id: trip.trip_id, poi_id: p.poi_id, type: p.type,
      activity_ids: refBy[p.poi_id] || [],   // which activities call this POI
      time_buckets: own ? [own] : [...new Set(inherited)],
      name: p.name, lat: p.lat, lng: p.lng,
      time_window: p.time_window || "", duration: p.duration || "",
      difficulty: p.difficulty || "", cash_only: !!p.cash_only,
      description: p.description || "", reference_link: p.reference_link || "", image: p.image || null
    });
  });

  // transit utility layer
  (trip.transit || []).forEach(t => {
    features.push({
      kind: "transit", trip_id: trip.trip_id, type: "transit",
      name: t.name, lat: t.lat, lng: t.lng,
      time_window: "", duration: "", difficulty: "", cash_only: false,
      description: t.description || "", reference_link: t.reference_link || "", image: null
    });
  });

  return features;
}

/* ---- public: load the whole catalog ---- */
export async function loadCatalog() {
  // "no-cache" = always revalidate with the server, so edited trip content
  // shows up on the next reload instead of a heuristically-cached stale copy
  const idxUrl = `${CONFIG.TRIPS_DIR}/index.json`;
  const idx = await fetch(idxUrl, { cache: "no-cache" }).then(r => {
    if (!r.ok) throw new Error(`Can't load ${idxUrl} (${r.status}). Are you serving over http/https?`);
    return r.json();
  });

  const trips = [];
  const allErrs = [];
  for (const entry of idx.trips) {
    const url = `${CONFIG.TRIPS_DIR}/${entry.file}`;
    const trip = await fetch(url, { cache: "no-cache" }).then(r => {
      if (!r.ok) throw new Error(`Can't load ${url} (${r.status})`);
      return r.json();
    });
    const errs = validateTrip(trip, entry.file);
    if (errs.length) { allErrs.push(...errs); continue; }
    const warns = densityWarnings(trip, entry.file);
    if (warns.length) console.warn("Content density:\n" + warns.join("\n"));
    trips.push(trip);
  }
  if (allErrs.length) console.warn("Trip validation problems:\n" + allErrs.join("\n"));

  const features = trips.flatMap(buildTrip);
  const meta = trips.map(t => {
    // Overview-dot anchor: the MEDOID — the actual activity most central to
    // the trip (minimum total distance to all other activities). A plain
    // mean can land in the ocean for elongated routes (a coastal moto trip's
    // average sits offshore); the medoid is always a real stop on the trip.
    let best = t.activities[0] || { lat: 0, lng: 0 };
    let bestCost = Infinity;
    t.activities.forEach(a => {
      let cost = 0;
      t.activities.forEach(b => {
        const dLat = a.lat - b.lat, dLng = (a.lng - b.lng) * Math.cos(a.lat * Math.PI / 180);
        cost += Math.sqrt(dLat * dLat + dLng * dLng);
      });
      if (cost < bestCost) { bestCost = cost; best = a; }
    });
    return {
      trip_id: t.trip_id, name: t.name, region: t.region, date_range: t.date_range,
      duration_days: t.duration_days, theme: t.theme || "", summary: t.summary || "",
      centroid: { lat: best.lat, lng: best.lng }
    };
  });
  return { features, meta, errors: allErrs };
}
