I walked through the live site at https://fiveio.lovable.app — Home, Navigator, Startup Map, and Ecosystem. Here's what I found, what's broken, and what to add next.

## 🔴 Critical bugs (the site looks empty in production)

The database actually contains **220 active companies**, but every public page shows **0**. Root cause: the recent security fix revoked `EXECUTE` on `public.has_role()` from `anon`, `authenticated`, and `public`. Every RLS policy on `companies` (and similar tables) calls `has_role()`, so anonymous reads now silently return zero rows.

**Visible symptoms**
- Home → "0 ACTIVE COMPANIES / 0 STATE RESOURCES / 0 CAPITAL SOURCES / 0 RURAL PROGRAMS"
- /map → "Discover 0 verified Utah startups", "0 COMPANIES", "0 HIRING NOW", company grid empty
- /ecosystem → "Real-time data from 0 companies and 0 resources", all charts empty

**Fix**: re-grant `EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;` This is safe — `has_role` only reads `user_roles` and is `SECURITY DEFINER`; the previous revoke was over-cautious and broke every public-readable table.

## 🟠 Other issues found

1. **Map is offline in production** — `/map` shows "Interactive map is offline. Mapbox token missing." `VITE_MAPBOX_TOKEN` isn't configured for the published build, so 220 companies have no geographic visualization. Either add the token as a build env var or render a fallback static map / cluster summary.
2. **Hiring data status strip** says "No data yet · scanned via Firecrawl" — expected until an admin triggers `/refresh-hiring`, but a non-admin visitor sees a permanently grey state. Worth softening the copy to "Refresh scheduled" + a "Last scanned: never" or hiding until first run.
3. **Footer link "Submit a Company"** is a dead/anchor link — should route to `/map/add-company`.
4. **Home → "View all paths →"** link under personas appears non-functional / scrolls nowhere.
5. **Hero search "Match Me"** posts free-text but there's no visible loading/empty state for results — confirm it routes into the Navigator quiz with the prompt prefilled.
6. **SEO**: only `/map` has a unique `head()`. Home, `/navigator`, `/ecosystem` reuse default metadata. Add unique `title` + `description` + `og:title/description` to each route.
7. **Auth visibility**: the navbar shows "Sign in / Get started" but nothing on the home page tells visitors *why* they'd sign up (saved matches? claim a company? investor view?). Needs a value-prop for accounts.

## 🟢 Suggested new features (ranked by impact)

**A. Investor / Operator dashboard** — the project is currently founder-first. Add `/investors` with: filterable deal-flow list, "new this week" companies, "raising now" filter, saved searches, CSV export. Reuses existing `companies` data.

**B. Claim-your-company flow surfaced** — `/map/claim/$id` exists but isn't promoted. Add a "Claim this profile" CTA on every company card + email verification against the company domain.

**C. Weekly ecosystem digest (email)** — opt-in newsletter: new companies added, new hiring, funding announcements. Uses existing data + a scheduled edge function. Great retention loop.

**D. Funding & capital tracker** — `/capital` page listing Utah VCs, angels, accelerators, grants with stage/sector filters, deadlines for grants (rural programs, SBIR, GOED). Pairs naturally with the Navigator results.

**E. Job board (consumer view)** — you're already scraping `job_postings` via Firecrawl. Surface them at `/jobs` with sector + location + remote filters and "apply" deep links. This turns a backend dataset into a public product.

**F. Mentor / advisor directory** — opt-in profiles tagged by expertise (legal, GTM, fundraising) so Navigator can recommend specific people, not just programs.

**G. Founder profile + saved navigator runs** — let signed-in founders save their Navigator session, share a public "founder card" URL, and re-run as their stage changes.

**H. Map clustering + heatmap** — once Mapbox is wired, cluster pins by zoom and add a sector heatmap toggle (Tech vs Life Sci vs Aerospace corridors).

**I. Public "Pulse" page** — single page showing live ecosystem KPIs (companies added this month, total hiring delta WoW, top sectors growing) for press / state officials.

**J. Embeddable widgets** — `<iframe>` snippets accelerators and universities can drop on their own sites: "Powered by 5iO" sector counts or hiring tickers. Marketing flywheel.

## Recommended order

1. **Fix `has_role` grant** (blocks everything; one-line migration).
2. **Wire `VITE_MAPBOX_TOKEN`** in published env so the map renders.
3. **Fix Submit-a-Company / View-all-paths links** + add per-route SEO meta.
4. Pick 1–2 features from the list above for the next build sprint — my recommendation: **(E) Job board** and **(D) Capital tracker**, since both reuse data you already collect and give the site immediate non-founder utility.

Want me to implement #1–#3 now and then we discuss which features from the list to build next?
