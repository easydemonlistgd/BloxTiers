alter table public.profiles
add column if not exists recovery_email text;

alter table public.profiles
add column if not exists recovery_email_pending text;
