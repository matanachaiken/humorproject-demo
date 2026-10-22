-- Week 6: admin area access. Only profiles with is_superadmin can use it.
alter table public.profiles add column is_superadmin boolean not null default false;

-- Signed-in users could update every column of their own profile, which would
-- let anyone make themselves an admin. Limit updates to the name and avatar.
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, avatar_url, updated_at) on public.profiles to authenticated;
