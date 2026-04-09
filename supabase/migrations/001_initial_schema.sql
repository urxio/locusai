-- ─────────────────────────────────────────────────────
-- Locus AI Life OS — Initial Schema
-- ─────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── users ──────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  avatar_url    text,
  timezone      text not null default 'UTC',
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ── goals ──────────────────────────────────────────────
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  title         text not null,
  category      text not null default 'other'
                  check (category in ('product','health','learning','financial','wellbeing','other')),
  timeframe     text not null default 'quarter'
                  check (timeframe in ('quarter','year','ongoing')),
  target_date   date,
  progress_pct  int not null default 0 check (progress_pct between 0 and 100),
  next_action   text not null default '',
  status        text not null default 'active'
                  check (status in ('active','completed','paused')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── habits ─────────────────────────────────────────────
create table if not exists public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  name          text not null,
  emoji         text not null default '✓',
  frequency     text not null default 'daily'
                  check (frequency in ('daily','3x_week','weekdays')),
  target_count  int not null default 7,
  created_at    timestamptz not null default now()
);

-- ── habit_logs ─────────────────────────────────────────
create table if not exists public.habit_logs (
  id            uuid primary key default gen_random_uuid(),
  habit_id      uuid not null references public.habits(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  logged_date   date not null,
  created_at    timestamptz not null default now(),
  unique (habit_id, logged_date)
);

-- ── check_ins ──────────────────────────────────────────
create table if not exists public.check_ins (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  checked_in_at   timestamptz not null default now(),
  energy_level    int not null check (energy_level between 1 and 10),
  mood_note       text,
  blockers        text[] not null default '{}',
  date            date not null default current_date,
  unique (user_id, date)
);

-- ── briefs ─────────────────────────────────────────────
create table if not exists public.briefs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  brief_date      date not null,
  generated_at    timestamptz not null default now(),
  model_used      text not null default 'claude-haiku-4-5',
  raw_prompt      text,
  priorities      jsonb not null default '[]',
  insight_text    text not null default '',
  energy_score    float,
  tokens_used     int,
  stale           boolean not null default false,
  unique (user_id, brief_date)
);

-- ── tasks ──────────────────────────────────────────────
create table if not exists public.tasks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  goal_id         uuid references public.goals(id) on delete set null,
  title           text not null,
  category        text not null default 'general',
  estimated_mins  int,
  status          text not null default 'todo'
                    check (status in ('todo','done','skipped')),
  due_date        date,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

-- ── indexes ────────────────────────────────────────────
create index if not exists goals_user_id_idx        on public.goals(user_id);
create index if not exists habits_user_id_idx       on public.habits(user_id);
create index if not exists habit_logs_user_id_idx   on public.habit_logs(user_id);
create index if not exists habit_logs_date_idx      on public.habit_logs(logged_date);
create index if not exists check_ins_user_id_idx    on public.check_ins(user_id);
create index if not exists check_ins_date_idx       on public.check_ins(date);
create index if not exists briefs_user_id_idx       on public.briefs(user_id);
create index if not exists briefs_date_idx          on public.briefs(brief_date);
create index if not exists tasks_user_id_idx        on public.tasks(user_id);

-- ── auto-update updated_at on goals ────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.handle_updated_at();

-- ── auto-create user profile on signup ─────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
