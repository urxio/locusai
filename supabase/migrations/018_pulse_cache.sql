-- ── pulse_cache ────────────────────────────────────────
-- Stores the AI-generated pulse text per user per hour so
-- all devices see the same message within the same hour.
create table if not exists public.pulse_cache (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  pulse_date  date not null,
  pulse_hour  smallint not null check (pulse_hour between 0 and 23),
  text        text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, pulse_date, pulse_hour)
);

alter table public.pulse_cache enable row level security;

create policy "Users manage own pulse cache"
  on public.pulse_cache for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
