-- Journal entries: one free-form text entry per user per day
create table if not exists journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null default current_date,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists journal_entries_user_id_idx on journal_entries(user_id);
create index if not exists journal_entries_date_idx    on journal_entries(date);

alter table journal_entries enable row level security;

create policy "Users manage own journal entries"
  on journal_entries for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
