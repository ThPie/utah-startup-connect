## Goal

Replace the homepage hero's static gradient background with a **live, cinematic Mapbox map** of Utah's startup ecosystem — slowly panning and zooming between hot spots with **named startup labels** floating over glowing pins. Hero text and the "Match Me" search stay layered on top.

## Decisions locked in

- **v1 features**: clickable pins + live ticker + search‑driven flyTo
- **Pin colors**: by **sector** (Tech, Life Sciences, Aerospace, Energy, Outdoor, Manufacturing, Other)
- **Animation behavior**: **auto-cycles on load, but gently** — slow 12s legs, subtle zoom, pauses immediately when the user interacts (drag/scroll/click) and resumes after 8s of idle. This is the most welcoming default: visitors get the "wow" without feeling like the page is moving on them while they read.

## What changes

### 1. New component: `src/components/HeroLiveMap.tsx`

- Full-bleed Mapbox map (`mapbox://styles/mapbox/dark-v11`) as an absolute background layer behind the hero.
- Fetches token via the existing `get-mapbox-token` edge function (already working on `/map`).
- Loads ~150 active companies with `lat/lng` from Supabase, prioritizing those with funding/hiring signal so the visible names feel high-signal.
- **Custom markers**: glowing dot + the **startup name** in a small uppercase chip (backdrop-blur, thin border). Labels render only at zoom ≥ 8 to avoid crowding when zoomed out over the whole state.
- Pins colored by sector via CSS variables (`--sector-tech`, `--sector-bio`, etc., added to `src/styles.css`).
- Cinematic `flyTo` cycle through 6 hot spots: Salt Lake City → Lehi/Silicon Slopes → Provo/BYU → Park City → Ogden → Cedar City. Each leg ~12s, ease‑in‑out, subtle 40° pitch + slow bearing rotation.
- `mousedown` / `wheel` / `touchstart` pause the cycle; resume after 8s idle.
- Vignette + dark gradient overlay so hero text contrast holds.
- Graceful fallback: if token missing or map errors, the existing animated blob gradient renders instead — layout never breaks.

### 2. Update `src/routes/index.tsx` hero section

- Replace the two decorative blur blobs with `<HeroLiveMap />` as the background.
- Keep the dark gradient overlay (`from-transparent via-slate-950/60 to-slate-950`).
- Add a **"LIVE · {N} startups tracked"** chip with a pulsing green dot, top-right of the hero (FBI dashboard touch).
- Add a small **sector legend** bottom-left: color dot + sector name (collapsible on mobile).
- Wire **Match Me search → flyTo**: when the user types a query, before navigating to `/navigator?q=...`, the map flies toward the matching region (substring-match against city / sector / company name → pre-curated coordinates). Small delight, no extra clicks.

### 3. Live ticker (under the search box)

- A thin marquee row showing rotating one-liners pulled live from Supabase:
  - "🟢 Now hiring: {company}" (from `companies` where `hiring_status = true`)
  - "💸 New on map: {company}" (recent `created_at`)
  - "📍 {N} startups in {city}" (computed)
- Auto-rotates every 4s; muted/subtle so it doesn't compete with the headline.

### 4. Style tokens (`src/styles.css`)

- Add 7 sector color variables in `oklch` (vibrant but harmonized with existing primary orange).
- Add `@keyframes pin-pulse` (1.6s ease-in-out) for the glowing halo.
- Add a thin scanning `linear-gradient` keyframe for the optional sweep line (off by default; we can enable later if you like the look).

## Why this is easy to use & access

- **No new clicks needed**: the map *is* the background — visitors see the ecosystem the moment the page loads.
- **Stops on interaction**: never fights the user.
- **Search still works the same way** ("Match Me" still goes to Navigator); the flyTo is bonus eye candy.
- **Mobile**: labels hidden, pitch disabled, lower marker count (~50) for perf and readability. Live ticker stays.
- **Fallback**: if Mapbox is ever offline, the original gradient hero renders — no broken page.

## Technical notes

- `react-map-gl` and `mapbox-gl` already installed (used on `/map`); no new deps.
- Map mounts client-side only; SSR returns the gradient fallback to avoid `window` issues.
- `flyTo` chain managed via a single `setTimeout` ref, cleared on unmount and on user interaction.
- Marker labels rendered as DOM (not Mapbox `Symbol` layer) so they inherit the design system fonts/colors.

## Out of scope for v1 (easy to add later)

- Heatmap toggle, sector filter pills on the hero, time-of-day map style, scanning sweep line.

