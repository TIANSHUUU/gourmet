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
- Added so far: marys (Nigerian, Collingwood/Melbourne), south-aus-hotel (wine bar, Mount Gambier), death-and-co (cocktail bar, CBD/Melbourne), soma-pastry (pastry shop, Towada/Aomori), dons (wine bar, Prahran/Melbourne), zareh (Middle Eastern, Kensington/Melbourne)
- `map_type` drives the map CTA in `RestaurantDetail.tsx`: `amap` → 「在高德地图查看 / Open in Amap」, anything else → Google Maps wording. Mainland China entries can now use `map_type: amap` with an `amap.com` / `uri.amap.com` link.
- Source folders `cafe/` and `restaurant/`/`winebar/` at the gourmet root may have more unpublished entries — check before assuming all content is live.
- 地图(2026-11):总策划案 `docs/superpowers/specs/2026-11-13-pineapple-map-design.md`;Phase 0(coords / `places.ts` / `cities.json` / 改站名)已上线,Phase 1(`/map`)见下方「Map」一节,Phase 2+(小人、手绘资产、Takeout 导入)待做。

## Map (`/map`)
- Hand-painted-style real map (MapLibre GL 6 + OpenFreeMap vector tiles, free, no key). Design: `docs/superpowers/specs/2026-11-13-pineapple-map-design.md`; plans: `docs/superpowers/plans/2026-11-13-pineapple-map-phase*.md`.
- `src/components/map/MapView.tsx` is the **only** file that imports `maplibre-gl`; everything else is plain React. Pure logic lives in `src/lib/map/` and is unit-tested.
- Basemap style: edit the `palette` in `scripts/build-map-style.mjs`, run `npm run maps`, commit `public/maps/painted.json`. Never hand-edit the JSON. Dropping seamless PNGs into `public/map-assets/patterns/{pat-wood,pat-grass,pat-water,pat-sand}.png` and re-running `npm run maps` switches those layers to `fill-pattern` (they must also be registered with `map.addImage` under the same names — see spec §6.4).
- Places come from `getAllPlaces()` (restaurants/ + spots/); the page is static, so adding a place = adding a markdown file with `coords`. Cities/default camera: `src/data/map/cities.json`.
- URL state: `/map?city=<slug>&place=<slug>`. Labels use OpenFreeMap glyphs (`Noto Sans Bold` only). Map failure or no WebGL2 falls back to `MapFallbackList`.
- Label background and kind badges are drawn on a canvas at runtime (`mapImages.ts`); Phase 3 replaces badges with painted PNGs.
- maplibre 6's ESM web worker can't be located once Turbopack bundles it, so `MapView` calls `setWorkerUrl(`${basePath}/maps/maplibre-gl-worker.js`)` and that file is a **copy** of `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs`. After bumping `maplibre-gl`, run `npm run maps:worker` and commit the result (a stale worker = silent breakage). Don't try to "tidy" it away without re-testing a production build.
- `maplibre-gl.css` is un-layered and beats Tailwind utilities (e.g. `.maplibregl-map{position:relative}` beats `absolute`), so don't put sizing/positioning classes on the element maplibre mounts into — wrap it instead.

## Style
- Background `#FCFAF4` (cream), ink `#13314A`, accents `#F0742A` (orange) / `#0F84B5` (blue); map page chrome `#1E242C`. (Mediterranean redesign 2026-06 — the old `#FAFAF7` / `#C84B2F` are gone.)
- Site name: "菠萝子指南" (2026-11 dropped 美食 to make room for sights & activities; 2026-07 renamed from 猪比登 to match the pineapple avatar). Logo = cropped pineapple-head mark (`public/logo-mark.png`); favicon = pineapple (`src/app/icon.png`). The old 🐷🕵️/🐽 emojis were dropped. English `description` strings still say "restaurants, cafés & bars" on purpose — update them together with the homepage hero copy once sights go live.
- Footer contact: alubiaroja529@gmail.com
