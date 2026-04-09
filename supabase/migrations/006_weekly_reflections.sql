-- Store weekly AI reflections in DB so they persist across devices
create table if not exists weekly_reflections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  week_number  integer not null,
  year         integer not null,
  reflection   jsonb not null,
  generated_at timestamptz not null default now(),
  unique (user_id, week_number, year)
);

create index if not exists weekly_reflections_user_id_idx on weekly_reflections(user_id);

alter table weekly_reflections enable row level security;

create policy "Users manage own weekly reflections"
  on weekly_reflections for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
