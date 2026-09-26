-- BlockTiers account system
-- Run this in Supabase Dashboard -> SQL Editor.

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text not null unique,
    display_name text not null,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.handle_new_blocktiers_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, username, display_name)
    values (
        new.id,
        new.raw_user_meta_data ->> 'username',
        new.raw_user_meta_data ->> 'display_name'
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_blocktiers on auth.users;
create trigger on_auth_user_created_blocktiers
after insert on auth.users
for each row execute procedure public.handle_new_blocktiers_user();

-- Optional: prevent users from changing their username through direct profile updates.
-- The current BlockTiers UI does not expose profile editing.
