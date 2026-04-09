-- ─────────────────────────────────────────────────────
-- Locus AI Life OS — Row Level Security Policies
-- ─────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table public.users      enable row level security;
alter table public.goals       enable row level security;
alter table public.habits      enable row level security;
alter table public.habit_logs  enable row level security;
alter table public.check_ins   enable row level security;
alter table public.briefs      enable row level security;
alter table public.tasks       enable row level security;

-- ── users ──────────────────────────────────────────────
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- ── goals ──────────────────────────────────────────────
create policy "Users can CRUD own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── habits ─────────────────────────────────────────────
create policy "Users can CRUD own habits"
  on public.habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── habit_logs ─────────────────────────────────────────
create policy "Users can CRUD own habit logs"
  on public.habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── check_ins ──────────────────────────────────────────
create policy "Users can CRUD own check-ins"
  on public.check_ins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── briefs ─────────────────────────────────────────────
create policy "Users can read own briefs"
  on public.briefs for select
  using (auth.uid() = user_id);

create policy "Service role can insert briefs"
  on public.briefs for insert
  with check (auth.uid() = user_id);

create policy "Service role can update briefs"
  on public.briefs for update
  using (auth.uid() = user_id);

-- ── tasks ──────────────────────────────────────────────
create policy "Users can CRUD own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
