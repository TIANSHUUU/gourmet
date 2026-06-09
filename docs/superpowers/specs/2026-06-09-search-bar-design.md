# Search Bar — Design Spec
Date: 2026-06-09

## Goal
Add a Michelin-style search/filter bar to the homepage so visitors can quickly narrow restaurants by keyword or city.

## Layout
Single horizontal bar between the hero headline and the restaurant card grid:

```
[ 🔍  Restaurant or cuisine... ] [ Melbourne ▾ ] [ Find ]
```

On mobile: stacks vertically (keyword → city → button).

## Components

### SearchBar (new client component)
- Renders the three-zone bar
- Reads `restaurants` list to derive available cities for the dropdown
- Holds `keyword` and `city` as local state
- On change/submit, calls `onFilter(keyword, city)` callback

### Homepage (page.tsx)
- Passes full restaurant list to SearchBar
- Holds filtered list in state, passes it to RestaurantGrid
- Default state: all restaurants shown

## Filtering logic
```
filtered = restaurants
  .filter(r => city === 'all' || r.city === city)
  .filter(r => keyword === '' ||
    r.name.toLowerCase().includes(keyword) ||
    r.cuisine_en.toLowerCase().includes(keyword) ||
    r.cuisine_zh.includes(keyword))
```
Case-insensitive. Runs client-side on every keystroke (no debounce needed at this data size).

## City dropdown
- Options derived automatically from restaurant data (no hardcoding)
- First option: "All Cities" / "全部城市" (bilingual, respects language toggle)
- Subsequent options: sorted unique city values from restaurant list

## Styling
- Pill-shaped container, white background, subtle shadow
- Keyword input: flex-grow, no border between zones (internal dividers only)
- City dropdown: fixed width ~160px
- Find button: `#C84B2F` terracotta, white text, rounded-r-full

## Out of scope
- URL-based shareable filters
- Debounce
- Cuisine-type filter (separate dropdown)
- Any server-side search
