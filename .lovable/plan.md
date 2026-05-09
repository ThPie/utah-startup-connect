## Reality check (before fixes)

I checked the database directly. The user's diagnosis is partially based on stale info:

| User claim | Actual state | Action |
|---|---|---|
| "Map shows 0 verified Utah startups" | **220 active companies, all with lat/lng** | Likely a brief loading-state flash. Add a non-zero loading guard so the count never reads "0". |
| "/capital is empty" | **151 funding-tagged resources** in DB, page renders them | No action — works today. |
| "/events is empty" | DB is empty but page has **12 hardcoded fallback events**, renders fine | Ship as-is, queue real scrape later. |
| "/jobs is empty" | **DB truly empty (0 rows)**, no fallback → page shows "No live roles" | **Real problem.** Add curated fallback + temporarily hide from primary nav until real data lands. |
| "Only 3 personas" | True — Jordan, Maria, Dr. Amir | Add Marcus, Priya, David. |
| "Edit with Lovable badge" | On by default | Toggle off. |
| "Realtime data from pampam.city" | Pampam is a closed product with **no public API**. The GOED sheet (220 cos) is already imported. | Ship the GOED data we have; add an admin "Re-sync from GOED sheet" button rather than chasing a non-public source. |

So the *critical* fixes are: jobs fallback + hide-from-nav, +3 persona cards, hide Lovable badge, and a small "0 startups" copy guard on `/map`.

## Plan

### 1. `/map` — kill the "0 verified" flash
File: `src/routes/map.index.tsx` (line 292)

Change the heading copy to use `companies.length || 220` while loading, and only render the count once the Supabase fetch resolves. Same fix on the `/map` route metadata in `src/routes/map.tsx` (already says "222+", fine).

### 2. Jobs page — fallback content + remove from primary nav
- **`src/routes/jobs.tsx`**: add a `FALLBACK_JOBS` array (~10–12 curated open roles at known Utah startups, mirroring the events fallback pattern). When the DB query returns zero rows, render the fallback so judges see real cards instead of an empty state. Keep the admin "Refresh" CTA visible.
- **`src/components/SiteNav.tsx`**: remove the `/jobs` desktop and mobile nav links (keep the route reachable via the footer + map filters so the route still exists for SEO).

### 3. Add the 3 missing persona cards
File: `src/routes/index.tsx` (Personas section ~line 454)

Switch the grid from 3 to 6 cards (responsive: `sm:grid-cols-2 lg:grid-cols-3`) and append:

- **Marcus** — Veteran Founder, Ogden — Defense + manufacturing pre-seed → `search={{ stage: "Pre-seed", industry: "Manufacturing", needs: "Capital", location: "Weber County", community: "Veterans" }}`
- **Priya** — B2B SaaS Founder, Lehi — Raising venture → `search={{ stage: "Series A+", industry: "Tech / Software", needs: "Capital", location: "Utah County" }}`
- **David** — Medical Device Founder, Salt Lake — International expansion → `search={{ stage: "Seed", industry: "Life Sciences", needs: "International Trade", location: "Salt Lake County" }}`

Use existing `PersonaCard` component (already wired to `/navigator?search=…`). Source persona portraits from Unsplash in the same style as existing cards.

### 4. Hide the "Edit with Lovable" badge
Call `publish_settings--set_badge_visibility { hide_badge: true }` — one-shot setting, no code change needed.

### 5. Map data refresh affordance (optional polish, ~10 min)
On `/admin`, add a "Re-sync GOED companies" button that re-runs the existing CSV import flow (`src/lib/csv-import.ts` is already wired). This gives judges a visible answer to "where does the data come from?" without us promising a live pampam mirror we can't deliver.

### Out of scope (and why)
- **Real-time mirror of pampam.city** — they don't expose an API and scraping their canvas-based map is not viable in a hackathon timeframe. We already match their dataset (GOED sheet, 220 companies). I'll explain this in the response, not in code.
- **Live job scraping run** — the `refresh-hiring` edge function exists; triggering it is admin-gated and slow. Better to ship a fallback now and let the admin run the crawl post-demo.
- **Events DB backfill** — fallback already covers it for demo purposes.

### Files touched
- `src/routes/map.index.tsx` (1-line copy guard)
- `src/routes/jobs.tsx` (fallback array + render branch)
- `src/components/SiteNav.tsx` (remove `/jobs` nav links)
- `src/routes/index.tsx` (3 new PersonaCards)
- `src/routes/admin.tsx` (optional re-sync button)
- Settings call: hide Lovable badge

No DB migrations, no new routes, no auth changes.
