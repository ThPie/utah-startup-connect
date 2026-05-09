## Goal
Fix the Navigator page (`/navigator`) results UX and chat quality.

## 1. Stop always returning 24 results
In `src/routes/navigator.tsx` → `rankResources()`:
- Remove the `.slice(0, 24)` hard cap and the "fall back to all 24 if nothing scored" branch.
- Return only resources whose `_score` is meaningful (e.g. `_score >= 3`), capped at 12.
- If nothing scores ≥ 3, show top 6 (not 24) so the count actually reflects relevance.
- The header "{n} programs matched" will then show a real, varying number (5, 8, 11…) instead of 24 every time.

## 2. Card: clickable card + remove broken "View details"
In `ResourceCard`:
- The whole card is already a `<Link>` to `/navigator/resource/$id` — keep that (clicking anywhere already opens the page).
- Delete the `<span>View details →</span>` element entirely (the bottom row keeps only the "Visit site ↗" external link, right-aligned).
- Keep `e.stopPropagation()` on the external link so it doesn't trigger the card link.

## 3. Replace gradient/initials thumbnails with real stock images
- Drop the `hashHue` gradient + initials fallback.
- Use a deterministic Unsplash Source image based on the resource's primary topic/industry so each card gets a relevant photo (e.g. Capital → finance photo, Workspace → coworking, R&D → lab, Education → classroom, Mentorship → meeting, Talent → team, Manufacturing → factory, Tech → office/laptops).
- Implementation: a `pickStockImage(r)` helper that maps topics/industries to a curated list of Unsplash photo IDs (`https://images.unsplash.com/photo-XXXX?w=800&q=70&auto=format&fit=crop`). Falls back to a generic Utah/business photo.
- If `r.image_url` exists in DB, still prefer it.

## 4. Chat quality + markdown rendering
Two issues: raw `**bold**` shows as text, and answers are too long/general.

**Frontend (`ChatPanel`)**: render assistant messages with `react-markdown` (already used in `ConciergeAgent.tsx`), with `prose prose-sm` styling and link handling. User bubbles stay plain text.

**Edge function (`supabase/functions/navigator-chat/index.ts`)**: tighten the system prompt so answers are:
- Max 3 short paragraphs OR a short bullet list (not both).
- Lead with the single best-fit program (bolded name + one-line why-it-fits).
- Then 1–2 alternates as bullets with name + 1 sentence each.
- End with a concrete next step on its own line (apply link or email), no fluff.
- Forbid: long preambles ("It sounds like you're looking for…"), multi-paragraph essays, recommending programs not in the matched list, and using more than 4 bullets total.
- Re-deploy `navigator-chat`.

## Files to touch
- `src/routes/navigator.tsx` — ranking cap, ResourceCard (remove View details, stock image helper), ChatPanel (react-markdown).
- `supabase/functions/navigator-chat/index.ts` — tighter system prompt, redeploy.

## Out of scope
- No DB schema changes.
- No new routes.
- Concierge agent (homepage) untouched.
