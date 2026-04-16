-- ── wheel_of_life ──────────────────────────────────────
-- Stores periodic life-area self-assessments (scores 1-10 per area)

create table if not exists public.wheel_of_life (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  snapshot_date  date not null,
  scores         jsonb not null default '{}',
  insight        text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(user_id, snapshot_date)
);

alter table public.wheel_of_life enable row level security;

create policy "Users manage own wheel"
  on public.wheel_of_life
  for all
  using (auth.uid() = user_id);
