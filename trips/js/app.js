/* =============================================================================
   app.js — orchestrates everything ("journey-first" shell, adopted 2026-07-17
   from the v2 prototype; the original paper-panel shell lives in git history).

   ENGINE: visibility predicate, selection numbering, stacking, clusters,
   medoid overview dots, explore union — behavior rules unchanged (strict POI
   visibility, evening rules, near-me clears the trip, etc).
   SHELL: trip chips on top, bottom sheet with a horizontal activity card rail
   scroll-synced with the map; filters live in a popover.
   ============================================================================= */
// the ?v= on every import must match index.html's — bump all together on deploy
import { CONFIG } from "./config.js?v=28";
import { loadCatalog } from "./data.js?v=28";
import { initMap } from "./map.js?v=28";
import { baseImage, resolveImage, placeholderFor } from "./images.js?v=28";
import { gmapsUrl, tripKML, downloadKML } from "./export.js?v=28";

const $ = sel => document.querySelector(sel);
const errbar = $("#errbar");

let map, FEATURES = [], META = [];
const state = {
  mode: "itinerary",
  trip: "*",
  types: new Set(Object.keys(CONFIG.TYPES)),
  time: "*",
  selectedActivity: null,
  showAllPois: false,
  radiusKm: CONFIG.RADIUS_DEFAULT_KM,
  origin: null,
  dropArmed: false
};
let markers = [];

/* ---------- engine: geo + predicate (identical to v1) ---------- */
const timeBucket = tw => {
  if (!tw) return null;
  const h = parseInt(tw.slice(0, 2), 10);
  return isNaN(h) ? null : (h < 12 ? "morning" : h < 17 ? "afternoon" : "evening");
};
function haversine(a, b, c, d) {
  const R = 6371, p = Math.PI / 180, dLat = (c - a) * p, dLng = (d - b) * p;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
const inViewport = f => map.getBounds().contains([f.lng, f.lat]);
const withinRadius = f => state.origin && haversine(state.origin.lat, state.origin.lng, f.lat, f.lng) <= state.radiusKm;

function visible(f) {
  if (state.trip !== "*" && f.trip_id !== state.trip) return false;
  if (f.kind === "transit") return state.types.has("transit");
  if (!state.types.has(f.type)) return false;
  if (state.time !== "*") {
    if (f.kind === "activity") {
      const b = timeBucket(f.time_window); if (b && b !== state.time) return false;
    } else if (f.kind === "poi") {
      const bs = f.time_buckets || [];
      if (bs.length && !bs.includes(state.time)) return false;
    }
  }
  if (state.mode === "itinerary") {
    if (f.kind === "activity") return true;
    if (state.showAllPois) return true;
    if (!state.selectedActivity) return false;
    return selectedPoiIds().includes(f.poi_id);
  }
  return inViewport(f) || withinRadius(f);
}

function selectedActivityFeature() {
  return FEATURES.find(f => f.kind === "activity" && f.activity_id === state.selectedActivity) || null;
}
function selectedPoiIds() {
  const a = selectedActivityFeature();
  return a ? a.poi_ids : [];
}
function numberFor(f) {
  if (state.mode !== "itinerary" || !state.selectedActivity) return null;
  if (f.kind === "activity") return f.activity_id === state.selectedActivity ? 1 : null;
  if (f.kind === "poi") {
    const idx = selectedPoiIds().indexOf(f.poi_id);
    return idx === -1 ? null : idx + 2;
  }
  return null;
}

/* ---------- origin pin (explore) ---------- */
let originMarker = null;
function setOrigin(lat, lng, source) {
  state.origin = { lat, lng, source };
  clearTripFilter();                       // near-me is cross-trip (v1 rule)
  if (originMarker) originMarker.remove();
  originMarker = new maplibregl.Marker({ color: "#E8B84B", draggable: source === "pin" })
    .setLngLat([lng, lat]).addTo(map);
  if (source === "pin") originMarker.on("dragend", () => {
    const p = originMarker.getLngLat();
    state.origin = { lat: p.lat, lng: p.lng, source: "pin" };
    render();
  });
  $("#locState").textContent = source === "pin" ? "pin origin (drag to move)" : "location on";
  render();
}

/* ---------- POI/stack popup card (v2 dark) ---------- */
function popupCardHTML(f) {
  const c = CONFIG.TYPES[f.type].color;
  const pills = [];
  if (f.time_window) pills.push(`<span class="pill">${f.time_window}</span>`);
  if (f.duration)    pills.push(`<span class="pill">${f.duration}</span>`);
  if (f.difficulty)  pills.push(`<span class="pill ${f.difficulty}">${f.difficulty}</span>`);
  if (f.cash_only)   pills.push(`<span class="pill">cash only</span>`);
  if (f.kind === "poi" && f.activity_ids && f.activity_ids.length > 1)
    pills.push(`<span class="pill">shared · ${f.activity_ids.length}</span>`);
  const links = [
    `<a class="ref" href="${gmapsUrl(f)}" target="_blank" rel="noopener">Google Maps</a>`,
    f.reference_link ? `<a class="ref" href="${f.reference_link}" target="_blank" rel="noopener">Reference</a>` : ""
  ].filter(Boolean).join(" ");
  const n = numberFor(f);
  const numBadge = (n != null) ? `<span class="num" style="background:${c}">${n}</span>` : "";
  return `<div class="pcard"><img src="${baseImage(f)}" alt=""><div class="p-body">
    <div class="p-type" style="color:${c}">${CONFIG.TYPES[f.type].label}</div>
    <h3>${numBadge}${f.name}</h3>
    ${pills.length ? `<div class="meta">${pills.join("")}</div>` : ""}
    <p class="desc">${f.description || ""}</p><div class="links">${links}</div></div></div>`;
}
function hydrate(el, f) {
  resolveImage(f).then(url => {
    if (!url) return;
    const img = el.querySelector("img");
    if (!img) return;
    img.onerror = () => { img.onerror = null; img.src = placeholderFor(f.type); };
    img.src = url;
  });
}

let activePopup = null;
let switchingPopup = false;
function openPopup(g, lngLat, zoomable) {
  if (activePopup) { switchingPopup = true; activePopup.remove(); switchingPopup = false; activePopup = null; }
  let idx = 0;
  const wrap = document.createElement("div");
  const draw = () => {
    const f = g[idx];
    const nav = g.length > 1
      ? `<div class="p-body" style="padding:7px 12px 0;display:flex;gap:8px;align-items:center">
           <button class="ebtn nvp">‹</button><span style="font-size:10px;color:#A8A392">${idx + 1} of ${g.length}</span>
           <button class="ebtn nvn">›</button>${zoomable ? `<button class="ebtn nvf" title="zoom to pins">⤢</button>` : ""}</div>`
      : "";
    wrap.innerHTML = nav + popupCardHTML(f);
    if (g.length > 1) {
      wrap.querySelector(".nvp").onclick = () => { idx = (idx - 1 + g.length) % g.length; draw(); };
      wrap.querySelector(".nvn").onclick = () => { idx = (idx + 1) % g.length; draw(); };
      const fb = wrap.querySelector(".nvf");
      if (fb) fb.onclick = () => {
        const b = new maplibregl.LngLatBounds();
        g.forEach(x => b.extend([x.lng, x.lat]));
        map.fitBounds(b, { padding: 90, maxZoom: 15 });
      };
    }
    hydrate(wrap, f);
  };
  draw();
  const p = new maplibregl.Popup({ offset: 18, closeButton: true })
    .setLngLat(lngLat).setDOMContent(wrap).addTo(map);
  p.on("close", () => { if (!switchingPopup && activePopup === p) activePopup = null; });
  activePopup = p;
}

/* ---------- selection: single entry point keeps map + rail in sync ---------- */
function selectActivity(id, { fly = true } = {}) {
  state.selectedActivity = id;
  render();
  buildRail();
  if (id && fly) fitActivity(id);
  if (id) {
    const card = document.querySelector(`.acard[data-id="${CSS.escape(id)}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

/* ---------- markers (engine port; activity click syncs the rail) ---------- */
function makeEl(g) {
  const f = g[0];
  const el = document.createElement("div");
  const c = CONFIG.TYPES[f.type].color;
  const isSel = f.kind === "activity" && f.activity_id === state.selectedActivity;
  el.className = "mk " + (f.kind === "activity" ? "start " : "") + (f.kind === "transit" ? "transit " : "") + (isSel ? "selpin" : "");
  const n = numberFor(f);
  const glyph = f.kind === "transit" ? "◆" : (n != null ? n : "");
  el.innerHTML = `<div class="pin" style="background:${c}"><span>${glyph}</span></div>`
    + (g.length > 1 ? `<i class="stk">${g.length}</i>` : "");
  el.addEventListener("click", e => {
    e.stopPropagation();
    const act = g.find(x => x.kind === "activity");
    if (state.mode === "itinerary" && act) {
      // v2 grammar: activity pin ↔ rail card. Select (or toggle off) and let
      // the rail present the detail; POIs still open popups.
      if (g.length === 1) {
        selectActivity(state.selectedActivity === act.activity_id ? null : act.activity_id);
        return;
      }
      if (state.selectedActivity !== act.activity_id) selectActivity(act.activity_id, { fly: false });
    }
    openPopup(g, [f.lng, f.lat]);
  });
  return el;
}

function groupVisible(vis) {
  const pts = vis.map(f => map.project([f.lng, f.lat]));
  const used = new Array(vis.length).fill(false);
  const r2 = CONFIG.STACK_PX * CONFIG.STACK_PX;
  const rank = f => f.kind === "activity" ? 0 : f.kind === "poi" ? 1 : 2;
  const groups = [];
  for (let i = 0; i < vis.length; i++) {
    if (used[i]) continue;
    const items = [vis[i]]; used[i] = true;
    let span = 0;
    for (let j = i + 1; j < vis.length; j++) {
      if (used[j]) continue;
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
      if (dx * dx + dy * dy <= r2) {
        items.push(vis[j]); used[j] = true;
        span = Math.max(span, haversine(vis[i].lat, vis[i].lng, vis[j].lat, vis[j].lng));
      }
    }
    items.sort((a, b) => rank(a) - rank(b) || (numberFor(a) ?? 99) - (numberFor(b) ?? 99));
    groups.push({ items, span });
  }
  return groups;
}
function makeClusterEl(items) {
  const el = document.createElement("div");
  el.className = "cluster";
  el.textContent = items.length;
  el.addEventListener("click", e => { e.stopPropagation(); openPopup(items, centroid(items), true); });
  return el;
}
function centroid(items) {
  const s = items.reduce((acc, f) => [acc[0] + f.lng, acc[1] + f.lat], [0, 0]);
  return [s[0] / items.length, s[1] / items.length];
}

/* ---------- overview dots (medoid — engine rule) ---------- */
let wasOverview = false;
function makeTripDot(t) {
  const el = document.createElement("div");
  el.className = "tripdot";
  el.title = t.name;
  el.innerHTML = `<span class="lbl">${t.name}</span>`;
  el.addEventListener("click", e => { e.stopPropagation(); pickTrip(t.trip_id); });
  return el;
}
function renderTripOverview() {
  META.forEach(t => {
    if (!t.centroid) return;
    markers.push(new maplibregl.Marker({ element: makeTripDot(t), anchor: "center" })
      .setLngLat([t.centroid.lng, t.centroid.lat]).addTo(map));
  });
  wasOverview = true;
}

/* ---------- render ---------- */
function render() {
  markers.forEach(m => m.remove());
  markers = [];
  if (state.trip === "*" && map.getZoom() < CONFIG.TRIP_OVERVIEW_ZOOM) {
    renderTripOverview();
    updateVisCount(null);
    return;
  }
  wasOverview = false;
  const vis = FEATURES.filter(visible);
  updateVisCount(vis.length);
  if (state.mode === "explore" && vis.length > CONFIG.CLUSTER_AT) {
    markers.push(new maplibregl.Marker({ element: makeClusterEl(vis), anchor: "center" })
      .setLngLat(centroid(vis)).addTo(map));
    return;
  }
  groupVisible(vis).forEach(g => {
    if (g.items.length > 1 && g.span > CONFIG.STACK_MAX_KM) {
      markers.push(new maplibregl.Marker({ element: makeClusterEl(g.items), anchor: "center" })
        .setLngLat(centroid(g.items)).addTo(map));
      return;
    }
    const f = g.items[0];
    markers.push(new maplibregl.Marker({ element: makeEl(g.items), anchor: f.kind === "transit" ? "center" : "bottom" })
      .setLngLat([f.lng, f.lat]).addTo(map));
  });
}
function updateVisCount(n) {
  const el = $("#visCount");
  if (el) el.textContent = (state.mode === "explore" && n != null) ? `${n} pins in view/radius` : "";
}

function fitActivity(id) {
  const a = FEATURES.find(f => f.kind === "activity" && f.activity_id === id);
  if (!a) return;
  const ids = new Set(a.poi_ids);
  const pts = [a, ...FEATURES.filter(f => f.kind === "poi" && ids.has(f.poi_id))];
  const b = new maplibregl.LngLatBounds();
  pts.forEach(f => b.extend([f.lng, f.lat]));
  // extra bottom padding so the sheet never covers the numbered stops
  map.fitBounds(b, { padding: { top: 120, left: 60, right: 60, bottom: 220 }, maxZoom: 14 });
}
function fitTrip(tripId) {
  const pts = FEATURES.filter(f => tripId === "*" || f.trip_id === tripId);
  if (!pts.length) return;
  const b = new maplibregl.LngLatBounds();
  pts.forEach(f => b.extend([f.lng, f.lat]));
  map.fitBounds(b, { padding: { top: 110, left: 60, right: 60, bottom: 200 }, maxZoom: 13 });
}

/* ---------- trip chips + sheet ---------- */
// keep every trip selector in agreement: the left dropdown (the reliable
// control) and the .on highlight on any matching marquee chip.
function syncTripControls(id) {
  const sel = $("#tripSelect");
  if (sel) sel.value = id;
  document.querySelectorAll(".tchip").forEach(c => c.classList.toggle("on", c.dataset.id === id));
}
function pickTrip(id) {
  state.trip = id;
  state.selectedActivity = null;
  resetTypeAndTime();                       // v1 rule: fresh trip, fresh filters
  syncTripControls(id);
  buildSheetHead();
  buildRail();
  render();
  fitTrip(id);
}
function clearTripFilter() {
  if (state.trip === "*") return;
  state.trip = "*";
  syncTripControls("*");
  buildSheetHead(); buildRail();
}
function resetTypeAndTime() {
  state.types = new Set(Object.keys(CONFIG.TYPES));
  state.time = "*";
  document.querySelectorAll("#typeChips .chip").forEach(c => c.classList.remove("off"));
  $("#timeSel").value = "*";
}

function buildTripRail() {
  const railEl = $("#tripRail");
  railEl.innerHTML = "";

  // (1) the reliable selector: a dropdown pinned at the left
  const sel = document.createElement("select");
  sel.id = "tripSelect";
  sel.className = "tripselect";
  sel.title = "Select a trip";
  sel.appendChild(new Option("All trips", "*"));
  META.forEach(t => sel.appendChild(
    new Option((t.name || t.trip_id) + (t.duration_days ? ` (${t.duration_days}d)` : ""), t.trip_id)));
  sel.value = state.trip;
  sel.onchange = () => pickTrip(sel.value);
  railEl.appendChild(sel);

  // (2) the "All trips" anchor button the chips fade toward
  const all = document.createElement("button");
  all.className = "tchip allpin" + (state.trip === "*" ? " on" : "");
  all.dataset.id = "*";
  all.textContent = "All trips";
  all.onclick = () => pickTrip("*");
  railEl.appendChild(all);

  // (3) the fun bit: non-"All trips" chips cycle leftward and fade out as they
  // reach the anchor (a left-edge mask on .marquee). The track holds TWO copies
  // so the CSS translateX(-50%) loop is seamless; hover pauses it so a chip can
  // be clicked (the dropdown is the no-fuss path).
  // On mobile there is no hover to pause and a moving target under a thumb is
  // hostile — the rail becomes a single-copy, natively swipeable strip
  // (.marquee.static) and the chips ARE the primary selector, not decoration.
  const mobile = window.matchMedia("(max-width: 640px)").matches;
  const marq = document.createElement("div");
  marq.className = "marquee" + (mobile ? " static" : "");
  const track = document.createElement("div");
  track.className = "marquee-track";
  const chip = t => {
    const b = document.createElement("button");
    b.className = "tchip" + (state.trip === t.trip_id ? " on" : "");
    b.dataset.id = t.trip_id;
    if (!mobile) b.setAttribute("aria-hidden", "true");   // desktop: decorative; dropdown is the a11y path
    b.innerHTML = (t.name || t.trip_id) + (t.duration_days ? `<small>${t.duration_days}d</small>` : "");
    b.onclick = () => pickTrip(t.trip_id);
    return b;
  };
  for (let copy = 0, copies = mobile ? 1 : 2; copy < copies; copy++)
    META.forEach(t => track.appendChild(chip(t)));
  if (!META.length) marq.classList.add("hidden");
  marq.appendChild(track);
  railEl.appendChild(marq);
}

// the marquee/static fork is decided at build time — rebuild the rail when the
// layout crosses the mobile breakpoint (rotation, split-screen, window resize)
const railMQ = window.matchMedia("(max-width: 640px)");
if (railMQ.addEventListener) railMQ.addEventListener("change", () => buildTripRail());
else if (railMQ.addListener) railMQ.addListener(() => buildTripRail());

function buildSheetHead() {
  const h = $("#shHead");
  const t = META.find(x => x.trip_id === state.trip);
  if (state.mode === "explore") {
    h.innerHTML = `<span class="hint">Explore — pins in view OR within the radius of your origin. Drop a pin or use your location.</span>`;
    return;
  }
  if (!t) {
    h.innerHTML = `<span class="hint">Pick a trip above — or tap a dot on the map. Tap an activity card to see its numbered stops.</span>`;
    return;
  }
  const bits = [t.region, t.date_range, t.duration_days ? `${t.duration_days} days` : ""].filter(Boolean).join(" · ");
  h.innerHTML = `<span class="t-name">${t.name}</span><span class="t-meta">${bits}</span>` +
    (t.summary ? `<p class="t-sum" title="tap to expand">${t.summary}</p>` : "");
  const sum = h.querySelector(".t-sum");
  if (sum) sum.onclick = () => sum.classList.toggle("open");
}

/* the horizontal activity rail — the v2 replacement for activity popups */
function buildRail() {
  const rail = $("#rail");
  rail.innerHTML = "";
  if (state.mode === "explore" || state.trip === "*") return;
  const acts = FEATURES
    .filter(f => f.kind === "activity" && f.trip_id === state.trip && visible(f))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  acts.forEach((a, i) => {
    const c = CONFIG.TYPES[a.type].color;
    const sel = a.activity_id === state.selectedActivity;
    const card = document.createElement("div");
    card.className = "acard" + (sel ? " sel" : "");
    card.dataset.id = a.activity_id;
    card.style.setProperty("--c", c);
    const pills = [];
    if (a.time_window) pills.push(`<span class="pill">${a.time_window}</span>`);
    if (a.duration)    pills.push(`<span class="pill">${a.duration}</span>`);
    if (a.difficulty)  pills.push(`<span class="pill ${a.difficulty}">${a.difficulty}</span>`);
    const links = [
      `<a class="ref" href="${gmapsUrl(a)}" target="_blank" rel="noopener">Google Maps</a>`,
      a.reference_link ? `<a class="ref" href="${a.reference_link}" target="_blank" rel="noopener">Reference</a>` : ""
    ].filter(Boolean).join(" ");
    card.innerHTML =
      `<div class="a-ord" style="color:${sel ? c : ""}">STOP ${i + 1}${a.poi_ids.length ? ` · ${a.poi_ids.length} POIs` : ""}</div>
       <h3>${a.name}</h3>
       ${pills.length ? `<div class="a-pills">${pills.join("")}</div>` : ""}
       <div class="a-more"><img src="${baseImage(a)}" alt=""><p class="a-desc">${a.description || ""}</p>
         <div class="links">${links}</div></div>`;
    card.onclick = e => {
      if (e.target.closest("a")) return;                    // let links be links
      selectActivity(sel ? null : a.activity_id);
    };
    if (sel) hydrate(card, a);
    rail.appendChild(card);
  });
}

/* ---------- clear all (v1 semantics: reset + pan to globe) ---------- */
function resetAll() {
  state.trip = "*";
  resetTypeAndTime();
  state.selectedActivity = null;
  state.showAllPois = false;
  state.radiusKm = CONFIG.RADIUS_DEFAULT_KM;
  state.origin = null;
  state.dropArmed = false;
  if (originMarker) { originMarker.remove(); originMarker = null; }
  if (activePopup) { switchingPopup = true; activePopup.remove(); switchingPopup = false; activePopup = null; }
  $("#poiToggle").classList.remove("on");
  $("#poiToggle").setAttribute("aria-checked", "false");
  $("#pinBtn").classList.remove("on");
  $("#radius").value = CONFIG.RADIUS_DEFAULT_KM;
  $("#radiusVal").textContent = CONFIG.RADIUS_DEFAULT_KM;
  $("#locState").textContent = "no origin";
  syncTripControls("*");
  buildSheetHead(); buildRail();
  render();
  fitTrip("*");
}

/* ---------- UI wiring ---------- */
function buildUI() {
  buildTripRail();
  buildSheetHead();

  // mode segmented control
  $("#modes").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    state.mode = b.dataset.mode;
    document.querySelectorAll("#modes button").forEach(x => x.classList.toggle("on", x === b));
    $("#exploreBox").classList.toggle("hidden", state.mode !== "explore");
    $("#rail").classList.toggle("hidden", state.mode !== "itinerary");
    if (state.mode === "explore") state.selectedActivity = null;
    if (originMarker) { if (state.mode === "explore") originMarker.addTo(map); else originMarker.remove(); }
    if (state.mode !== "explore" && state.dropArmed) { state.dropArmed = false; $("#pinBtn").classList.remove("on"); }
    buildSheetHead(); buildRail(); render();
  });

  // filters popover
  $("#filterBtn").onclick = () => {
    const f = $("#filters");
    f.classList.toggle("hidden");
    $("#filterBtn").classList.toggle("on", !f.classList.contains("hidden"));
  };

  // type chips
  const chipWrap = $("#typeChips");
  const setAllTypes = on => {
    state.types = new Set(on ? Object.keys(CONFIG.TYPES) : []);
    chipWrap.querySelectorAll(".chip").forEach(c => c.classList.toggle("off", !on));
    render(); buildRail();
  };
  Object.entries(CONFIG.TYPES).forEach(([k, v]) => {
    const c = document.createElement("div");
    c.className = "chip";
    c.innerHTML = `<span class="dot" style="background:${v.color}"></span>${v.label}`;
    c.onclick = () => {
      if (state.types.has(k)) { state.types.delete(k); c.classList.add("off"); }
      else { state.types.add(k); c.classList.remove("off"); }
      if (!state.types.size) { setAllTypes(true); return; }   // v1 rule: never empty via chips
      render(); buildRail();
    };
    chipWrap.appendChild(c);
  });
  $("#typeAll").onclick = () => setAllTypes(true);
  $("#typeNone").onclick = () => setAllTypes(false);

  $("#timeSel").onchange = e => { state.time = e.target.value; render(); buildRail(); };

  // Show-all-POIs switch (strict POI rule override, same as v1)
  $("#poiToggle").onclick = () => {
    state.showAllPois = !state.showAllPois;
    $("#poiToggle").classList.toggle("on", state.showAllPois);
    $("#poiToggle").setAttribute("aria-checked", String(state.showAllPois));
    render();
  };

  $("#kmlBtn").onclick = () => {
    const targets = state.trip === "*" ? META : META.filter(t => t.trip_id === state.trip);
    targets.forEach(t => {
      const feats = FEATURES.filter(f => f.trip_id === t.trip_id);
      downloadKML(tripKML(feats, t.name), `${t.trip_id}.kml`);
    });
  };

  $("#clearAll").onclick = resetAll;

  // explore controls
  const radius = $("#radius");
  radius.min = CONFIG.RADIUS_MIN_KM; radius.max = CONFIG.RADIUS_MAX_KM; radius.value = CONFIG.RADIUS_DEFAULT_KM;
  radius.oninput = e => {
    state.radiusKm = +e.target.value;
    $("#radiusVal").textContent = e.target.value;
    if (state.mode === "explore") render();
  };
  $("#locBtn").onclick = () => {
    if (!navigator.geolocation) { $("#locState").textContent = "unavailable"; return; }
    navigator.geolocation.getCurrentPosition(
      p => setOrigin(p.coords.latitude, p.coords.longitude, "gps"),
      () => { $("#locState").textContent = "denied — drop a pin instead"; }
    );
  };
  $("#pinBtn").onclick = () => {
    state.dropArmed = !state.dropArmed;
    $("#pinBtn").classList.toggle("on", state.dropArmed);
    if (state.dropArmed) {
      $("#locState").textContent = "tap the map to place the pin";
      clearTripFilter(); render();
    } else {
      $("#locState").textContent = state.origin
        ? (state.origin.source === "pin" ? "pin origin (drag to move)" : "location on") : "no origin";
    }
  };
}

/* ---------- boot ---------- */
async function boot() {
  try {
    map = initMap("map");
  } catch (e) {
    errbar.style.display = "block"; errbar.textContent = e.message; return;
  }
  try {
    const cat = await loadCatalog();
    FEATURES = cat.features; META = cat.meta;
    if (!FEATURES.length) {
      errbar.style.display = "block";
      errbar.textContent = "No trips loaded. Check trips/index.json and that files are served over http/https.";
    }
  } catch (e) {
    errbar.style.display = "block"; errbar.textContent = e.message; return;
  }

  buildUI();
  map.on("moveend", render);
  map.on("click", e => {
    if (state.mode === "explore" && state.dropArmed) {
      state.dropArmed = false;
      $("#pinBtn").classList.remove("on");
      setOrigin(e.lngLat.lat, e.lngLat.lng, "pin");
      return;
    }
    if (activePopup) { activePopup.remove(); return; }
    if (state.mode === "itinerary" && state.selectedActivity) selectActivity(null);
  });
  const firstPaint = () => { render(); fitTrip("*"); };
  if (map.loaded()) firstPaint(); else map.once("load", firstPaint);
  map.on("error", e => console.warn("map error", e && e.error));
}

boot();
