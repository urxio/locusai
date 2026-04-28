alter table public.users
  add column if not exists capture_folders text[] not null default '{}';
