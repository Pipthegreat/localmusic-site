/* =============================================================================
   placeholders.js — instant per-type card art shown WHILE the real web image
   (Wikipedia/Commons) loads. These are inline SVG data URIs baked into the JS
   bundle: zero network requests, zero load time. They are a loading state and
   a last-resort fallback — never the intended final image (the owner's
   no-manual-images rule still resolves a real photo whenever the web has one).
   Each scene uses its type's palette so the card reads correctly at a glance.
   ============================================================================= */

const SVGS = {
  outdoor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7E7DC"/><stop offset=".65" stop-color="#EDBFA4"/><stop offset="1" stop-color="#DE9578"/></linearGradient>
<radialGradient id="g" cx=".72" cy=".3" r=".5"><stop offset="0" stop-color="#FBEAD9" stop-opacity=".95"/><stop offset="1" stop-color="#FBEAD9" stop-opacity="0"/></radialGradient></defs>
<rect width="400" height="200" fill="url(#s)"/><rect width="400" height="200" fill="url(#g)"/>
<circle cx="288" cy="62" r="20" fill="#FCEFDF"/>
<path d="M0 132 Q60 92 118 118 T240 112 T400 128 V200 H0 Z" fill="#D98C64" opacity=".55"/>
<path d="M0 152 Q80 104 160 136 T320 130 T400 148 V200 H0 Z" fill="#C64B27" opacity=".75"/>
<path d="M0 176 Q100 140 210 166 T400 168 V200 H0 Z" fill="#8F3418"/>
</svg>`,

  food: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8EFDC"/><stop offset="1" stop-color="#EAD3A2"/></linearGradient>
<radialGradient id="g" cx=".5" cy=".18" r=".45"><stop offset="0" stop-color="#FFF7E6"/><stop offset="1" stop-color="#FFF7E6" stop-opacity="0"/></radialGradient></defs>
<rect width="400" height="200" fill="url(#s)"/><rect width="400" height="200" fill="url(#g)"/>
<circle cx="200" cy="34" r="10" fill="#B8892B" opacity=".85"/><path d="M200 44 v14" stroke="#B8892B" stroke-width="3"/>
<path d="M186 96 c6 -14 22 -14 28 0" stroke="#C79A3F" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
<ellipse cx="200" cy="138" rx="92" ry="26" fill="#D9B45C" opacity=".5"/>
<ellipse cx="200" cy="132" rx="70" ry="19" fill="#FDF6E7"/>
<ellipse cx="200" cy="130" rx="46" ry="12" fill="#B8892B"/>
<path d="M84 112 v44 M84 112 v-16 m-7 16 v-14 m14 14 v-14" stroke="#8F6A1E" stroke-width="4" stroke-linecap="round"/>
<path d="M318 96 c-10 2 -10 26 0 28 v32" stroke="#8F6A1E" stroke-width="4" stroke-linecap="round" fill="none"/>
</svg>`,

  scenery: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7F2ED"/><stop offset="1" stop-color="#BFDFD4"/></linearGradient>
<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC8B9"/><stop offset="1" stop-color="#6FAE9B"/></linearGradient></defs>
<rect width="400" height="200" fill="url(#s)"/>
<circle cx="96" cy="46" r="16" fill="#F2FAF6" opacity=".9"/>
<path d="M258 44 q8 -8 16 0 M286 52 q7 -7 14 0" stroke="#4E8A78" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/>
<path d="M0 108 Q90 62 180 100 T400 96 V200 H0 Z" fill="#5FA391" opacity=".6"/>
<path d="M120 108 Q210 70 300 100 T400 104 V200 H120 Z" fill="#2E7D6B" opacity=".8"/>
<rect y="128" width="400" height="72" fill="url(#w)"/>
<path d="M36 148 h58 M140 160 h74 M262 150 h84 M84 176 h96 M292 176 h62" stroke="#E7F2ED" stroke-width="4" stroke-linecap="round" opacity=".55"/>
</svg>`,

  nightlife: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D1733"/><stop offset="1" stop-color="#463366"/></linearGradient>
<radialGradient id="m" cx=".78" cy=".24" r=".3"><stop offset="0" stop-color="#CDBCEE" stop-opacity=".8"/><stop offset="1" stop-color="#CDBCEE" stop-opacity="0"/></radialGradient></defs>
<rect width="400" height="200" fill="url(#s)"/><rect width="400" height="200" fill="url(#m)"/>
<circle cx="312" cy="48" r="17" fill="#EDE4FB"/><circle cx="305" cy="43" r="15" fill="#2A2140"/>
<circle cx="66" cy="36" r="2" fill="#B9A6E0"/><circle cx="132" cy="58" r="1.6" fill="#B9A6E0"/><circle cx="196" cy="30" r="2.2" fill="#B9A6E0"/><circle cx="252" cy="66" r="1.5" fill="#B9A6E0"/><circle cx="38" cy="82" r="1.7" fill="#B9A6E0"/>
<path d="M0 140 h34 v-26 h18 v26 h26 v-40 h20 v40 h30 v-20 h16 v20 h34 v-34 h20 v34 h28 v-16 h18 v16 h40 v-28 h18 v28 h34 v-12 h16 v12 h48 V200 H0 Z" fill="#150F26"/>
<path d="M60 128 h4 M112 116 h4 M172 132 h4 M234 118 h4 M296 136 h4 M344 130 h4" stroke="#9B7FC7" stroke-width="3" stroke-linecap="round"/>
</svg>`,

  historic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF1F8"/><stop offset="1" stop-color="#C6D8EA"/></linearGradient>
<radialGradient id="g" cx=".5" cy=".26" r=".42"><stop offset="0" stop-color="#FDFEFF" stop-opacity=".9"/><stop offset="1" stop-color="#FDFEFF" stop-opacity="0"/></radialGradient></defs>
<rect width="400" height="200" fill="url(#s)"/><rect width="400" height="200" fill="url(#g)"/>
<circle cx="200" cy="66" r="34" fill="#9DB9D6" opacity=".35"/>
<path d="M132 84 L200 46 L268 84 Z" fill="#3A6EA5"/>
<rect x="140" y="90" width="120" height="8" fill="#5D88B5"/>
<rect x="148" y="102" width="12" height="52" fill="#3A6EA5"/><rect x="176" y="102" width="12" height="52" fill="#3A6EA5"/><rect x="204" y="102" width="12" height="52" fill="#3A6EA5"/><rect x="232" y="102" width="12" height="52" fill="#3A6EA5"/>
<rect x="134" y="158" width="132" height="8" fill="#5D88B5"/><rect x="124" y="170" width="152" height="9" fill="#3A6EA5"/>
<path d="M0 200 h400" stroke="#2C567F" stroke-width="10" opacity=".35"/>
</svg>`,

  transit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0F0F0"/><stop offset="1" stop-color="#D2D2D2"/></linearGradient></defs>
<rect width="400" height="200" fill="url(#s)"/>
<circle cx="322" cy="52" r="22" fill="#8A8A8A" opacity=".25"/>
<path d="M200 92 L118 200 H282 Z" fill="#9E9E9E"/>
<path d="M200 92 L172 200 h56 Z" fill="#8A8A8A"/>
<path d="M200 104 v14 m0 24 v16 m0 26 v18" stroke="#F0F0F0" stroke-width="5" stroke-linecap="round"/>
<path d="M0 92 h400" stroke="#B5B5B5" stroke-width="3" opacity=".7"/>
<rect x="52" y="58" width="44" height="30" rx="5" fill="#8A8A8A"/><rect x="60" y="66" width="12" height="9" rx="2" fill="#E6E6E6"/><rect x="78" y="66" width="12" height="9" rx="2" fill="#E6E6E6"/>
</svg>`
};

const cache = {};
export function placeholderFor(type) {
  const t = SVGS[type] ? type : "outdoor";
  return cache[t] || (cache[t] = "data:image/svg+xml," + encodeURIComponent(SVGS[t].replace(/\n\s*/g, "")));
}
