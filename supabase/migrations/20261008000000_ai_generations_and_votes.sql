-- Assignment 4: AI generations, votes, and strict RLS on every table.

-- One theme per day, picked by the server from trending Reddit post titles.
create table public.daily_themes (
  day date primary key,
  theme text not null,
  source_title text,
  source_url text,
  llm_prompt text,
  text_model text,
  created_at timestamptz not null default now()
);
alter table public.daily_themes enable row level security;
revoke insert, update, delete, truncate on public.daily_themes from anon, authenticated;
revoke all on public.daily_themes from anon;
create policy "Signed-in users can view daily themes"
  on public.daily_themes for select to authenticated using (true);

-- AI-generated images. Only the server (secret key, after calling the AI)
-- can insert rows; signed-in users can read them.
create table public.generations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  creator_name text not null,
  theme_day date references public.daily_themes (day),
  theme text not null,
  user_input text not null check (char_length(user_input) between 1 and 200),
  llm_prompt text not null,
  image_prompt text not null,
  caption text not null,
  text_model text not null,
  image_model text not null,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
create index generations_created_at_idx on public.generations (created_at desc);
create index generations_user_created_idx on public.generations (user_id, created_at desc);
create index generations_theme_day_idx on public.generations (theme_day);

alter table public.generations enable row level security;
revoke insert, update, delete, truncate on public.generations from anon, authenticated;
revoke all on public.generations from anon;
create policy "Signed-in users can view generations"
  on public.generations for select to authenticated using (true);

-- One vote per user per generation. Users manage only their own votes.
create table public.generation_votes (
  id bigint generated always as identity primary key,
  generation_id bigint not null references public.generations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (generation_id, user_id)
);
create index generation_votes_user_idx on public.generation_votes (user_id);

alter table public.generation_votes enable row level security;
revoke all on public.generation_votes from anon;
revoke update, truncate on public.generation_votes from authenticated;
-- Changing a vote may only touch the vote itself, never who/what it belongs to.
grant update (vote, updated_at) on public.generation_votes to authenticated;

create policy "Signed-in users can view votes"
  on public.generation_votes for select to authenticated using (true);
create policy "Users can cast their own votes"
  on public.generation_votes for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can change their own votes"
  on public.generation_votes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can remove their own votes"
  on public.generation_votes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Private bucket for the images: only the server writes, signed-in users read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('generations', 'generations', false, 5242880, array['image/jpeg']);
create policy "Signed-in users can view generated images"
  on storage.objects for select to authenticated
  using (bucket_id = 'generations');

-- Jokes page is gone: nobody needs to read the table any more.
drop policy "Public read access" on public.jokes;
drop policy "Authenticated read access" on public.jokes;
revoke all on public.jokes from anon, authenticated;

-- Profiles are created by the signup trigger, never by clients directly.
revoke insert, delete, truncate on public.profiles from anon, authenticated;
revoke all on public.profiles from anon;

-- The signup trigger function should not be callable over the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
