
create table public.hiring_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  scanned int not null default 0,
  hiring int not null default 0,
  jobs_imported int not null default 0,
  error_count int not null default 0,
  status text not null default 'running',
  created_at timestamptz not null default now()
);

alter table public.hiring_refresh_runs enable row level security;

create policy "runs public read" on public.hiring_refresh_runs
  for select using (true);

create policy "admins manage runs" on public.hiring_refresh_runs
  for all using (has_role(auth.uid(), 'admin'))
  with check (has_role(auth.uid(), 'admin'));

alter table public.companies replica identity full;
alter table public.job_postings replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.companies;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.job_postings;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.hiring_refresh_runs;
  exception when duplicate_object then null;
  end;
end $$;
