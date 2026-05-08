## Problem

The Navigator results screen (and likely the Map) shows "permission denied for function has_role". The frontend IS communicating with the backend, but the database is rejecting the read query.

Cause: RLS policies on `resources` and `companies` include an admin override that calls `public.has_role(auth.uid(), 'admin')`. EXECUTE on that function is granted to `authenticated` and `service_role`, but **not** to `anon`. When an unauthenticated visitor (or a logged-in user whose policy set still references the function) loads the page, Postgres evaluates every applicable policy, hits `has_role`, and errors out — so even the public-read policy never gets a chance to return rows.

## Fix

Single migration that grants EXECUTE on `public.has_role(uuid, app_role)` to both `anon` and `authenticated`. The function is already `SECURITY DEFINER` with a locked `search_path`, so granting EXECUTE doesn't widen the trust boundary — it only lets the planner call it during RLS evaluation.

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  TO anon, authenticated;
```

## Verification

1. Reload `/navigator` as a signed-out visitor — results render, no toast.
2. Reload `/map` — directory loads.
3. `psql` check: `proacl` should now list `anon=X` and `authenticated=X`.

No frontend changes needed.