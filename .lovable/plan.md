## 5iO — Utah Startup Platform

A full-stack TanStack Start app with Lovable Cloud (Supabase) backend, Lovable AI Gateway (Gemini), and Mapbox. Built in one comprehensive pass.

---

### 1. Foundation & design system

- Enable Lovable Cloud (Supabase + AI Gateway).
- Add `mapbox-gl` + `react-map-gl` and `framer-motion` deps.
- `src/styles.css`: define semantic tokens in oklch matching the Utah palette (canyon red, sandstone, desert sky, deep navy, parchment surface, success, muted). Add gradient and shadow tokens (`--gradient-canyon`, `--shadow-warm`).
- Load Google Fonts (Playfair Display, Inter, Space Grotesk) via `<link>` in `__root.tsx` head; map to Tailwind utilities `font-display`, `font-body`, `font-accent`.
- Mountain silhouette SVG component + arched card variant (rounded-t-[2rem]) reused throughout.
- Sticky frosted-glass `<SiteNav>` and `<SiteFooter>` rendered in `__root.tsx`.

### 2. Database schema (migrations)

Tables exactly per spec: `resources`, `companies`, `job_postings`, `claim_requests`, `profiles`, `navigator_sessions`. Plus separate `user_roles` table + `app_role` enum + `has_role()` security-definer function (admin/founder/investor) — never store roles on profiles.

RLS:
- `resources`, `companies` (status='active'), `job_postings` (active): public read.
- Authenticated users insert companies (status='pending_review'), claim_requests, job_postings for their owned company.
- `profiles`: user reads/updates self. Trigger `handle_new_user()` auto-inserts profile + 'founder' role on signup.
- Admin (`has_role(uid,'admin')`) full read/write everywhere.

### 3. Seed data (parse XLSX → migration)

- Use `code--exec` with python+openpyxl to parse `Resources_List_-_Builder_Day.xlsx` (213 rows) and `Map_Data_for_Builder_Day.xlsx` (222 rows).
- Split pipe-separated fields into arrays. Geocode companies by extracting city from `full_address` and mapping against a hardcoded Utah city → lat/lng table (Salt Lake City, Provo, Lehi, Ogden, Park City, St. George, Logan, etc.); fallback to Utah center with small jitter.
- Emit a single `supabase/migrations/*_seed.sql` with `INSERT … ON CONFLICT DO NOTHING` for all rows. Mark companies `is_verified=true, status='active'`.

### 4. Routes (file-based, TanStack Start)

```
src/routes/
  __root.tsx                  shell + nav + footer + QueryClientProvider
  index.tsx                   landing (hero, two-products, counters, personas, footer)
  navigator.tsx               quiz → results → AI chat
  map.tsx                     hero + filters + Mapbox + company grid
  map.company.$id.tsx         company profile + jobs + minimap
  map.add-company.tsx         4-step submission wizard
  map.claim.$id.tsx           claim form
  auth.login.tsx
  auth.signup.tsx
  _authenticated.tsx          beforeLoad redirect → /auth/login
  _authenticated/dashboard.tsx
  _authenticated/_admin.tsx   beforeLoad role check
  _authenticated/_admin/admin.tsx  tabs: Resources / Companies / Users
```

### 5. Founder's Navigator (`/navigator`)

- 5-step quiz with framer-motion transitions, progress bar, large option cards. State persisted to `localStorage` (`5io.navigator.state`).
- After step 5: 2s "Finding your resources…" loader with animated mountain SVG.
- Results page: sticky left (profile summary chips + collapsible AI chat + filter chips for Topic/Industry/Community/Location); right grid of resource cards sorted by AI relevance score, then array-overlap score.
- **AI ranking** server fn `rankResources` calls Gemini via Lovable AI Gateway with tool-calling to return `{ id, reason }[]` (top 10).
- **AI chat** edge-style server route `/api/navigator/chat` that streams Gemini SSE responses with system prompt + profile + matched resources as context. Pre-filled greeting message. Suggested-resource cards parsed from tool calls below each AI response.
- Filter changes re-query Supabase with `.overlaps()` on array columns.
- Resource card: arched top, color-coded left border by topic, Playfair title, tag pills, Visit + Email buttons.

### 6. Utah Startup Map (`/map`)

- Hero with stats (counts via aggregate query).
- Filter bar: sector (multi), stage (multi), hiring toggle, employee size — horizontal scroll on mobile, pill chips, active-count badge, Clear all.
- **Mapbox**: warm `dark-v11` style; if `VITE_MAPBOX_TOKEN` missing, render a styled fallback panel ("Add VITE_MAPBOX_TOKEN to enable the live map") with the company grid still working. Custom SVG circle pins colored by sector (color map per spec). Clustering below zoom 10. Click pin → popup with name/sector/employees/View Profile; camera flyTo. Zoom + fullscreen controls.
- Company grid (3/2/1 cols), 20 per page infinite scroll (`useInfiniteQuery`).
- `/map/company/:id`: hero, description, photo gallery, jobs list, sidebar with embedded minimap, Claim/Edit buttons (auth-aware).
- `/map/add-company`: 4-step wizard (basic info → AI job import → hiring/media → email verification). Job import calls server fn `extractJobs` (Gemini tool-calling on pasted text/URL fetched server-side). Editable extracted jobs before save. Submission writes status='pending_review'.
- `/map/claim/:id`: domain-match check on email vs website; insert claim_request.

### 7. Dashboard (`/dashboard`)

- Auth-protected. If user has owned company (claimed_by or submitted_by): editable profile, job postings CRUD, AI Job Import, placeholder stats. Else: two CTAs (Add startup / Claim listing).

### 8. Admin (`/admin`)

- Role-gated via `has_role(uid,'admin')` server fn check in `beforeLoad`.
- **Resources tab**: searchable table, inline edit drawer, toggle active, delete, + Add.
- **Companies tab**: status filter, pending submissions + claim requests with Approve/Reject (approve flips status='active' and links `claimed_by` for claim requests), inline edit.
- **Users tab**: list profiles with role chip; change role (writes to `user_roles`).

### 9. Landing (`/`)

Hero gradient (canyon → navy) with mountain silhouette + dual CTAs → counters (animated with framer-motion `useInView`) → 6 persona carousel cards that pre-fill navigator quiz via search params (`/navigator?persona=jordan`) → footer with GoED credit.

### 10. Auth

- `/auth/login` + `/auth/signup` (email+password). `emailRedirectTo: window.location.origin`. Auth state via `onAuthStateChange` set up before `getSession`. Signup creates profile via DB trigger; redirects to `/dashboard`.

### 11. AI integration (Lovable AI Gateway, default `google/gemini-2.5-flash`)

Three server endpoints:
1. `rankResources` — `createServerFn`, tool-calling for structured `{id,reason}[]`.
2. `/api/navigator/chat` — server route streaming SSE with full conversation history.
3. `extractJobs` — `createServerFn`, tool-calling for `{title,description,location,type,url}[]`.

Surface 402/429 errors as toasts.

### 12. Polish

- Skeleton loaders on every fetch boundary.
- Empty states with mountain illustration + reset.
- SEO `head()` per route (title <60, description <160, og tags).
- Subtle scroll fade-ins.

### Technical notes

- Mapbox token absent → graceful fallback panel; everything else functions.
- Geocoding is approximate (city-based); flagged in admin for manual correction.
- Server fns under `src/lib/*.functions.ts`; admin client only inside `*.server.ts`.
- Long build — expect this to land in a single large turn; minor follow-ups likely for polish.

```text
Landing ──┬── /navigator (quiz → AI results+chat)
          ├── /map (filters + Mapbox + grid)
          │     ├── /company/:id (profile + jobs)
          │     ├── /add-company (4-step + AI jobs)
          │     └── /claim/:id
          ├── /auth/{login,signup}
          ├── /dashboard (founder)
          └── /admin (resources | companies | users)
```
