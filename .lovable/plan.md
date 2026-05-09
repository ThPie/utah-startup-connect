## Goal

Make the homepage concierge proactive, ensure Map and Navigator are functioning, and strip every piece of fallback/demo data so the site only shows real content from the database.

## 1. Autonomous Concierge

Update `src/components/ConciergeAgent.tsx` so it opens itself the first time a visitor lands:

- After ~6 seconds on the page (only if not already opened, and only once per session via `sessionStorage` flag `5io-concierge-auto-opened`), automatically open the chat panel with a friendly proactive greeting: "Hi 👋 I noticed you exploring 5iO — want me to help you list your startup, find a state program, or post a job?"
- Add a small unread "1" dot on the floating button before auto-open so it feels alive.
- Keep manual open/close behavior intact. Auto-open never re-triggers in the same session after the user closes it.

## 2. Remove all demo / fallback data

In `src/components/home/HomeToolSections.tsx`:

- Delete the `FALLBACK_EVENTS` array and the `data && data.length > 0 ? data : FALLBACK_EVENTS` fallback. If the DB returns 0 upcoming events, render a clean empty state: "No upcoming events yet — [Submit an event](mailto:…)".
- Delete the `FALLBACK_JOBS` array and the `if (!data || data.length === 0) setJobs(FALLBACK_JOBS)` fallback. If 0 active jobs, render an empty state: "No open roles listed yet — [Post a job at your startup](mailto:…)".
- Keep the live Navigator + Map previews as-is (they already use only real data).

In `src/routes/index.tsx`:

- The "View all 213 resources" button text in `HomeNavigatorPreview` is hardcoded — change to use the real `heroStats.resources` count, or just say "View all resources".

## 3. Verify Map + Navigator

Spot-check both routes for runtime errors:

- Open `/map` and `/navigator` in the preview, read console logs and network requests, confirm data loads and there are no broken imports/queries.
- Confirm `navigator-chat` edge function still responds (model = `google/gemini-2.5-flash`).
- If any errors surface (broken query, 404 link, missing component), patch them in the same pass. No scope creep beyond fixing what's broken.

## 4. Out of scope

- No redesign of the chat UI or sections.
- No new database tables — empty states stay empty until users add real data.
- No changes to auth/routing other than bug fixes uncovered in step 3.

## Files to touch

- `src/components/ConciergeAgent.tsx` — auto-open + proactive greeting
- `src/components/home/HomeToolSections.tsx` — strip FALLBACK_EVENTS, FALLBACK_JOBS, add empty states
- `src/routes/index.tsx` — replace hardcoded "213 resources" copy
- (conditionally) any Map/Navigator file with a discovered runtime error
