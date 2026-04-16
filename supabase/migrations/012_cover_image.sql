-- Add cover image URL to user profiles
alter table public.users
  add column if not exists cover_url text;
