create table if not exists people (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  name             text not null,
  notes            text,
  "group"          text not null default 'acquaintances',
  want_catchup     boolean not null default false,
  last_mentioned_at timestamptz,
  created_at       timestamptz not null default now()
);

alter table people enable row level security;

create policy "users can manage their own people"
  on people for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index people_user_id_idx on people (user_id);
