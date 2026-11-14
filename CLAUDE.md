@AGENTS.md

# Gourmet Guide — Project Notes

A personal bilingual (EN/ZH) restaurant/café/wine bar guide, Michelin-style layout.

## Deployment
- Repo: https://github.com/TIANSHUUU/gourmet
- Live: https://tianshuuu.github.io/gourmet/
- Auto-deploys via `.github/workflows/deploy.yml` on push to `main`
- `next.config.ts` uses `output: "export"`, `basePath: "/gourmet"`, `images.unoptimized: true`
- **Any `public/` asset URL (images, `maps/painted.json`, the maplibre worker) must be prefixed with `basePath` from `src/lib/basePath.ts`** (reads `NEXT_PUBLIC_BASE_PATH`; CI sets it to `/gourmet`). Because `next.config.ts` always sets `basePath: "/gourmet"`, **local `npm run dev` needs `web/.env.local` containing `NEXT_PUBLIC_BASE_PATH=/gourmet`** (gitignored; create it once per machine) — without it every `public/` asset 404s in dev, and with it a forgotten prefix shows up in dev instead of only on the live site.

## Adding a new place
Source content lives in `/Users/tantianshu/Documents/code/gourmet/{restaurant,cafe,winebar}/<name>/` as a `.md` (raw EN notes) + `imgs/` folder. To publish:

1. Copy images → `web/public/images/<slug>/`
2. Create `web/src/data/restaurants/<slug>.md`:
   ```yaml
   ---
   slug, name, suburb, city, category, cuisine_en, cuisine_zh, map_url, map_type (google|amap),
   coords: [lng, lat]  (required — run `npm run coords:backfill` to fill it from map_url, or `npm run coords:check` to verify),
   images: [...]
   ---
   ## en
   (review)
   ## zh
   (review)
   ```
3. Translate the review EN↔ZH — tone should be **concise, light-hearted, fun-loving** (per user preference, not formal Michelin-speak)
4. `npm run build` to verify both the homepage grid and `/<slug>` detail page generate
5. Commit + push (auto-deploys)
6. Non-food places (sights / activities / shops / stays) go to `web/src/data/spots/<slug>.md` with the **same frontmatter**; `category` there must be one of `sight | activity | shop | stay` (restaurants/ only allows `food | cafe | bar`). They are read by `src/lib/places.ts` (`getAllPlaces()`, zod-validated, build fails on a missing/invalid `coords`) and will show on the `/map` page; the homepage grid stays food-only for now.
7. `src/data/map/cities.json` decides which city a place belongs to **by bounds**, not by its `city` string. A place outside every city makes `src/lib/map/cities.test.ts` fail — add a city entry (slug, names, bounds, default view) when that happens.

## Status
- Added so far: marys (Nigerian, Collingwood/Melbourne), south-aus-hotel (wine bar, Mount Gambier), death-and-co (cocktail bar, CBD/Melbourne), soma-pastry (pastry shop, Towada/Aomori), dons (wine bar, Prahran/Melbourne), zareh (Middle Eastern, Collingwood/Melbourne)
- `map_type` drives the map CTA in `RestaurantDetail.tsx`: `amap` → 「在高德地图查看 / Open in Amap」, anything else → Google Maps wording. Mainland China entries can now use `map_type: amap` with an `amap.com` / `uri.amap.com` link.
- Source folders `cafe/` and `restaurant/`/`winebar/` at the gourmet root may have more unpublished entries — check before assuming all content is live.
- 地图(2026-11):总策划案 `docs/superpowers/specs/2026-11-13-pineapple-map-design.md`;Phase 0(数据)、Phase 1(`/map`)、Phase 2(小人)、Phase 3(资产管线·墨尔本试点)已完成,见下方「Map」一节;美术资产由业主生成后 `npm run map:assets` 接入;Phase 4(Takeout 导入景点)待做。

## Map (`/map`)
- Hand-painted-style real map (MapLibre GL 6 + OpenFreeMap vector tiles, free, no key). Design: `docs/superpowers/specs/2026-11-13-pineapple-map-design.md`; plans: `docs/superpowers/plans/2026-11-13-pineapple-map-phase*.md`.
- Only `src/components/map/MapView.tsx`, `walkerMarker.ts` and `walkerController.ts` import `maplibre-gl`; everything else is plain React. Pure logic lives in `src/lib/map/` and is unit-tested.
- Basemap style: edit the `palette` in `scripts/build-map-style.mjs`, run `npm run maps`, commit `public/maps/painted.json`. Never hand-edit the JSON. Dropping seamless PNGs into `public/map-assets/patterns/{pat-wood,pat-grass,pat-water,pat-sand}.png` and re-running `npm run maps` switches those layers to `fill-pattern` (they must also be registered with `map.addImage` under the same names — see spec §6.4).
- Places come from `getAllPlaces()` (restaurants/ + spots/); the page is static, so adding a place = adding a markdown file with `coords`. Cities/default camera: `src/data/map/cities.json`.
- URL state: `/map?city=<slug>&place=<slug>`. Labels use OpenFreeMap glyphs (`Noto Sans Bold` for shops / clusters, `Noto Sans Regular` for landmark names; both render CJK, checked in dev). Map failure or no WebGL2 falls back to `MapFallbackList`.
- Label background and kind badges are drawn on a canvas at runtime (`mapImages.ts`); Phase 3 replaces badges with painted PNGs.
- maplibre 6's ESM web worker can't be located once Turbopack bundles it, so `MapView` calls `setWorkerUrl(`${basePath}/maps/maplibre-gl-worker.js`)` and that file is a **copy** of `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs`. After bumping `maplibre-gl`, run `npm run maps:worker` and commit the result (a stale worker = silent breakage). Don't try to "tidy" it away without re-testing a production build.
- `maplibre-gl.css` is un-layered and beats Tailwind utilities (e.g. `.maplibregl-map{position:relative}` beats `absolute`), so don't put sizing/positioning classes on the element maplibre mounts into — wrap it instead.
- **Walker (Phase 2):** `walkerController.ts` owns the pineapple (MapLibre `Marker` + pixel sprite from travel-timeline, `public/sprites/pineapple-classic.png`, 4×3 frames of 128×160; swap the PNG for a painted version with the same frame grid and `walker.css` needs no change). Pure logic + constants (30 m enter / 60 m exit / 400 ms dwell / 180 px·s⁻¹ / auto-walk 1.2–4 s) live in `src/lib/map/walker.ts` (unit-tested). `MapView` exposes `apiRef` (`setInput` / `recenter` / `togglePitch`); keyboard (arrows + WASD) is handled in `MapPageClient`, touch uses `DPad.tsx`. Tap a label → walk → arrive → card; free-walk camera is locked on the walker; below zoom 15 the first input zooms in first. The frame loop keeps running while the walker stands inside a shop's 30 m radius until the 400 ms dwell completes (otherwise releasing the key at the door would never open the card).
- **Camera padding is persistent in MapLibre.** `MapView` keeps the padding that *should* be on the map in `padRef` (`OVERVIEW_PADDING` / `CITY_PADDING[_MOBILE]` / `CARD_PADDING_*`); every camera call passes it explicitly (the controller gets it through its `getPadding` argument) and closing the card resets it. Three traps found in dev acceptance: (1) a camera call without `padding` interrupts an in-flight padding transition and leaves it half-way, so never add one; (2) `fitBounds` adds `padding` on top of the map's *current* padding and does not persist it unless you pass `absolutePadding: true`; (3) any camera call `stop()`s the running animation — the card-closed branch only eases padding when the camera isn't already moving, and `WalkerController.lockCamera` yields while another animation runs. City views `fitBounds` the city's own places (`cities.json` `view.zoom` is the max / single-place zoom); mobile keeps 200 px at the bottom so the d-pad doesn't cover the southernmost place.
- Attribution control sits bottom-left (`AttributionControl`, non-compact); the mobile card repeats the attribution line because it covers the map's bottom.
- **Art assets (Phase 3):** drop PNGs into `/Users/tantianshu/Documents/code/gourmet/map/inbox/melbourne/` (names: `pat-{wood,grass,water,sand}`, `badge-<kind>`, `lm-<slug>`, `shop-<place-slug>`, `pp-{idle,walk-a,walk-b,cheer}` — spec §7.1) and run `npm run map:assets`. It mirrors the inbox into `public/map-assets/{patterns,icons}/` (sharp-resized: 512 / 96 / 256 / 192 px), builds `public/sprites/pineapple-painted.png` when all four poses exist, writes `public/map-assets/manifest.json`, drops `_preview/*-2x2.png` seam checks next to the inbox, then re-runs `npm run maps` so `fill-pattern` appears only for existing tiles. Commit `public/map-assets`, `public/sprites`, `public/maps/painted.json` together. `npm run map:assets -- --synthetic` runs the pipeline on generated placeholders (never commit its output). Everything missing from the manifest falls back: flat colours, canvas badges, `lm-generic` star for landmarks, pixel walker. Output PNGs are palette-quantised (`PNG_OUT` in the ingest script; the riso paper grain would otherwise make each 512 px tile 300–400 KB). **Melbourne assets landed 2026-11-14**: 4 tiles + 6 landmark stickers (riso flat sticker style, GPT Image, prompts in spec §7.1); unused variants live in `map/inbox/_spare/`; the painted walker poses (`pp-*`) are still missing, so the pixel walker stays. **Category badges are code, not AI art:** `scripts/lib/badges.mjs` holds the 7 SVGs (colours must equal `KIND_COLORS` in `src/lib/map/kinds.ts`; a vitest enforces it); `npm run badges:render` writes `badge-<kind>.png` into the inbox plus `_preview/badges.png` at real 32 px size, then `npm run map:assets` ingests them. Edit the SVG, re-run both, commit `public/map-assets`.
- Runtime: `MapView` fetches the manifest, preloads every listed image as an `ImageBitmap` **before** creating the map and registers them in `style.load` (before the first frame), so there are no "image missing" flashes. Sizes and `pixelRatio` are paired: `scripts/lib/map-assets.mjs` `SIZES` ↔ `src/lib/map/assets.ts` `PIXEL_RATIO`.
- Landmarks: `src/data/map/landmarks/<city>.json` (`name_zh`, `name_en`, `coords [lng, lat]`, `icon: lm-<slug>`, `minzoom`), loaded by `src/lib/map/landmarks.ts` (zod; a landmark outside its city's bounds fails the test). Layer `landmark` sits below the place layers so place labels win collisions (e.g. Flinders Street Station hides behind the "Death & Co" label near z12–13 and shows from ~z14); the label language follows the site toggle.
- Storefronts: a `shop-<slug>.png` in the inbox adds that place to the `place-storefront` layer (z ≥ 15.5), drawn under the white label (so the label overlaps the storefront's lower half). The walker stands 22 px right / 42 px below the point (`WALKER_OFFSET`): the sprite box is ~45×56 px, so it has to drop below the label body (8–36 px above the point) to keep any shop name readable — a sideways nudge alone clips short names.

## Style
- Background `#FCFAF4` (cream), ink `#13314A`, accents `#F0742A` (orange) / `#0F84B5` (blue); map page chrome `#1E242C`. (Mediterranean redesign 2026-06 — the old `#FAFAF7` / `#C84B2F` are gone.)
- Site name: "菠萝子指南" (2026-11 dropped 美食 to make room for sights & activities; 2026-07 renamed from 猪比登 to match the pineapple avatar). Logo = cropped pineapple-head mark (`public/logo-mark.png`); favicon = pineapple (`src/app/icon.png`). The old 🐷🕵️/🐽 emojis were dropped. English `description` strings still say "restaurants, cafés & bars" on purpose — update them together with the homepage hero copy once sights go live.
- Footer contact: alubiaroja529@gmail.com
