-- Goal Steps: AI-generated + user-editable milestones per goal
create table if not exists goal_steps (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references goals(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  due_date     date,
  completed    boolean not null default false,
  completed_at timestamptz,
  position     integer not null default 0,
  created_at   timestamptz default now()
);

create index if not exists goal_steps_goal_id_idx on goal_steps(goal_id);
create index if not exists goal_steps_user_id_idx on goal_steps(user_id);

alter table goal_steps enable row level security;

create policy "Users manage own goal steps"
  on goal_steps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
