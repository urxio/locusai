-- Set default cover image for new users and backfill existing accounts
alter table public.users
  alter column cover_url set default 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80';

update public.users
  set cover_url = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80'
  where cover_url is null;
