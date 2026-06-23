# Mediterranean Visual Overhaul — Design Spec

**Date:** 2026-06-23
**Status:** Approved direction, pending spec review
**Goal:** Replace the current clean-Michelin look with a bolder "Mediterranean editorial" identity — terracotta orange + Aegean blue + cream, magazine-style layout — that feels like an urban food-and-wine connoisseur's personal poster-zine, while keeping the existing content model and bilingual (EN/ZH) behaviour.

---

## 1. Design System

### Palette
| Token | Hex | Use |
|-------|-----|-----|
| `--terracotta` | `#F0742A` | Header band, № index numbers, primary accent |
| `--aegean` | `#0F84B5` | Structural lines, search/category borders, Find button (white text), category tag outlines |
| `--aegean-ink` | `#0C6E97` | Aegean text on cream where `#0F84B5` is too light (tags, labels) |
| `--cream` | `#FCFAF4` | Page background |
| `--ink` | `#13314A` | Body/heading text (deep navy, not pure black) |
| `--ink-soft` | `#4A5A68` | Pull-quote / secondary text |
| `--ink-faint` | `#8A99A6` | Meta (location, captions) |
| White | `#FFFFFF` | Header text on terracotta, Find button label, card surfaces |

### Typography (load via `next/font`)
- **Fraunces** (serif) — Latin display: hero, place names, pull-quotes. Italic used as a flourish.
- **Noto Serif SC** (serif) — CJK display, so the Chinese version keeps the same editorial-serif feel (Fraunces has no CJK glyphs).
- **Inter** — UI and body text.
- **JetBrains Mono** — small uppercase labels, № index, category tags, meta.

Headings render Fraunces for Latin and Noto Serif SC for CJK via a combined `font-family` stack; the active language determines which glyphs are used. Brand wordmark「猪比登美食指南🐷🕵️」stays Chinese in both languages (matches current `Header.tsx`).

### Motifs
- `№ 01` style index numbers (JetBrains Mono, terracotta)
- Uppercase letter-spaced mono micro-labels
- Thin Aegean hairline dividers (1.5px) between editorial blocks
- Square corners on the search bar (poster feel); soft corners elsewhere kept minimal

---

## 2. Data Model Changes

`Restaurant` type (`src/lib/restaurants.ts`) and the `.md` frontmatter gain/realign these fields:

| Field | Change | Notes |
|-------|--------|-------|
| `category` | **Re-mapped** to `'food' \| 'cafe' \| 'bar'` | was `restaurant\|cafe\|winebar`. Drives the category filter nav. |
| `cuisine_en` / `cuisine_zh` | unchanged | Specific tag shown on cards & detail (e.g. "Nigerian", "Cocktail Bar", "Wine Bar"). |
| `visited` | **New, required** `YYYY-MM` string | Doubles as (a) sort key — reverse-chronological, newest = headline — and (b) the detail-page "Visited on:" line. |
| `tagline_en` / `tagline_zh` | **New, optional** | One-line pull-quote shown only on the homepage headline entry. |
| `featured` flag | **Not used** | Headline is automatic = newest `visited`. |

### Migration of the 3 existing entries
| slug | `category` (new) | cuisine tag | `visited` |
|------|------------------|-------------|-----------|
| `marys` | `food` | Nigerian | `2026-06` |
| `death-and-co` | `bar` | Cocktail Bar | `2026-05` |
| `south-aus-hotel` | `bar` | Wine Bar | `2026-03` |

> Note: Mary's date was given as "June 2926" — treated as a typo for **June 2026** (today is 2026-06-23). Confirm if wrong.

### Ordering rule
`getAllRestaurants()` returns entries sorted by `visited` **descending**. The homepage takes `list[0]` as the headline (large lead) and `list.slice(1)` as the grid. `№` index = position in this sorted list (display only, not a ranking). Month-precision ties break by slug.

### Taglines (draft — light-hearted tone per user preference, to be reviewed)
- **Mary's** — EN: "No question — a Collingwood must. Smoky, soulful, gloriously unpretentious." · ZH:「毫无悬念的 Collingwood 必打卡——烟火气十足，毫不端着。」
- **Death & Co** — EN: "Cocktail royalty's first stop down under — dim lights, serious drinks." · ZH:「鸡尾酒殿堂的首家海外店，灯光昏暗，酒认真得很。」
- **South Australian Hotel** — EN: "A small-town gem worth the detour — proper wine, zero pretension." · ZH:「值得绕路的小镇宝藏，酒地道，人随性。」

---

## 3. Homepage (full magazine layout)

**Terracotta region:** On the homepage the terracotta extends as one continuous block through the header bar + hero + category nav; a thick Aegean rule closes it, and cream begins at the search bar. On all other routes (detail, 404) only the header bar (item 1) is terracotta.

Top → bottom:
1. **Global header** (terracotta band, shared across all routes — see §5): wordmark left, EN/中文 toggle right.
2. **Hero headline** (homepage only, on terracotta): EN「Places I Actually *Go Back To.*」/ ZH「真正值得*回去*的地方。」+ existing sub-line ("A personal guide to restaurants, cafés & bars worth revisiting." / 「私藏美食清单，餐厅、咖啡馆与酒吧，全凭真心推荐。」); small mono tag "Melbourne & SA · N Entries · Est. 2026".
3. **Category nav** (homepage only, on terracotta — new functional filter): `All · Food · Cafés · Bars` (ZH:`全部 · 餐厅 · 咖啡 · 酒吧`) → filters the list by `category`. Thick Aegean rule below it ends the terracotta region.
4. **Search bar** (on cream): keyword + city `<select>` + Find (existing logic), restyled square/Aegean, white Find label. Category nav + city + keyword all compose (AND).
5. **Headline lead** = newest entry: large image, `№ 01`, cuisine tag, name, **tagline**, location.
6. **Grid** = remaining entries (two-up on desktop, responsive), each: image, `№`, cuisine tag, name, location. No tagline.
7. Empty-filter state keeps the existing "no results" copy, restyled.

> Filter interaction: category nav, city, and keyword apply together to the full sorted list; the headline/grid split is recomputed from the filtered result (i.e. when filtered, `filtered[0]` becomes the lead). If filtering leaves one entry, it shows as a lead with no grid.

---

## 4. Detail Page (restyled to match)

Same structure as today, re-skinned to the palette/type, plus one addition:
- Hero image → **name + cuisine tag + location** → **`Visited <Month YYYY>` line** (new; EN "Visited June 2026" / ZH「造访于 2026 年 6 月」) → review → gallery → map CTA.
- Map CTA restyled (Aegean/terracotta); **keeps the existing `map_type` Google/Amap switch** shipped in `RestaurantDetail.tsx`.

---

## 5. Component Change Map

| File | Change |
|------|--------|
| `src/app/globals.css` + `src/app/layout.tsx` | Register `next/font` families; set cream bg, ink text, CSS color tokens. |
| `src/lib/restaurants.ts` | Add `visited`, `tagline_en/zh`; retype `category`; sort by `visited` desc. |
| `src/data/restaurants/*.md` | Update 3 entries: new `category`, `visited`, taglines. |
| `src/components/Header.tsx` | Terracotta band, Aegean rule, restyled toggle. |
| `src/components/HomepageClient.tsx` | Add category state/filter; split sorted list into headline + grid; hero copy stays. |
| `src/components/CategoryNav.tsx` | **New** — All/Food/Cafés/Bars filter control. |
| `src/components/SearchBar.tsx` | Restyle (square, Aegean, white Find); logic unchanged. |
| `src/components/RestaurantCard.tsx` | Magazine card: `№`, cuisine tag, serif name, mono meta. |
| `src/components/RestaurantGrid.tsx` | Grid spacing/hairlines for editorial rhythm. |
| `src/components/RestaurantDetail.tsx` | Re-skin; add "Visited on" line; keep map_type logic. |
| `src/components/Footer.tsx` | Palette pass. |

---

## 6. Bilingual Handling
- All new UI strings (category nav labels, "Visited on", tagline field selection) follow the existing `useLang()` ternary pattern.
- Headline tagline picks `tagline_en` / `tagline_zh` by active language; falls back to hiding the line if the field is empty.
- `Visited` formats per language: EN "Visited June 2026", ZH「造访于 2026 年 6 月」.

---

## 7. Non-Goals / Out of Scope
- No new content beyond the 3 existing places (taglines/visited added to those).
- No CMS, login, booking, ratings, or maps embed beyond the existing link-out button.
- No change to deployment (still static export → GitHub Pages, basePath `/gourmet`).
- Animations/transitions kept minimal (hover states only); no heavy motion this pass.

## 8. Open Questions
1. Mary's `visited` = `2026-06` (typo confirm).
2. Category nav label style — "Food / Cafés / Bars" plural vs "Food / Café / Bar"; default plural.
3. Taglines above are drafts — user to approve/edit wording.
