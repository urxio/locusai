-- User Memory: persistent AI learning about each user
create table if not exists user_memory (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  data        jsonb not null default '{}',
  updated_at  timestamptz default now()
);

-- Row Level Security
alter table user_memory enable row level security;

create policy "Users can read own memory"
  on user_memory for select
  using (auth.uid() = user_id);

create policy "Users can upsert own memory"
  on user_memory for insert
  with check (auth.uid() = user_id);

create policy "Users can update own memory"
  on user_memory for update
  using (auth.uid() = user_id);

create policy "Service role bypasses memory RLS"
  on user_memory for all
  using (true)
  with check (true);
