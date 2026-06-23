@AGENTS.md

# Gourmet Guide — Project Notes

A personal bilingual (EN/ZH) restaurant/café/wine bar guide, Michelin-style layout.

## Deployment
- Repo: https://github.com/TIANSHUUU/gourmet
- Live: https://tianshuuu.github.io/gourmet/
- Auto-deploys via `.github/workflows/deploy.yml` on push to `main`
- `next.config.ts` uses `output: "export"`, `basePath: "/gourmet"`, `images.unoptimized: true`
- **Any image `src` must be prefixed with `basePath` from `src/lib/basePath.ts`** (resolves to `/gourmet` in CI via `NEXT_PUBLIC_BASE_PATH`, empty string locally). Forgetting this breaks images on the live site while looking fine in `npm run dev`.

## Adding a new place
Source content lives in `/Users/tantianshu/Documents/code/gourmet/{restaurant,cafe,winebar}/<name>/` as a `.md` (raw EN notes) + `imgs/` folder. To publish:

1. Copy images → `web/public/images/<slug>/`
2. Create `web/src/data/restaurants/<slug>.md`:
   ```yaml
   ---
   slug, name, suburb, city, category, cuisine_en, cuisine_zh, map_url, map_type (google|amap), images: [...]
   ---
   ## en
   (review)
   ## zh
   (review)
   ```
3. Translate the review EN↔ZH — tone should be **concise, light-hearted, fun-loving** (per user preference, not formal Michelin-speak)
4. `npm run build` to verify both the homepage grid and `/<slug>` detail page generate
5. Commit + push (auto-deploys)

## Status
- Added so far: marys (Nigerian, Collingwood/Melbourne), south-aus-hotel (wine bar, Mount Gambier), death-and-co (cocktail bar, CBD/Melbourne)
- `map_type` drives the map CTA in `RestaurantDetail.tsx`: `amap` → 「在高德地图查看 / Open in Amap」, anything else → Google Maps wording. Mainland China entries can now use `map_type: amap` with an `amap.com` / `uri.amap.com` link.
- Source folders `cafe/` and `restaurant/`/`winebar/` at the gourmet root may have more unpublished entries — check before assuming all content is live.

## Style
- Background `#FAFAF7`, accent/terracotta `#C84B2F`, rounded-2xl cards
- Site name: "猪比登美食指南🐷🕵️", favicon is 🐽 emoji
- Footer contact: alubiaroja529@gmail.com
