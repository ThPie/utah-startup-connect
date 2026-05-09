
-- Restrict profiles SELECT (was public, exposed emails)
drop policy if exists "profiles public read" on public.profiles;
create policy "users see own profile" on public.profiles
  for select using (auth.uid() = id or public.has_role(auth.uid(),'admin'));

-- Restrict navigator_sessions: drop NULL exposure
drop policy if exists "users see own sessions" on public.navigator_sessions;
create policy "users see own sessions" on public.navigator_sessions
  for select using (auth.uid() = user_id);

-- Lock down has_role: only used internally by RLS (runs as definer/owner)
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;
