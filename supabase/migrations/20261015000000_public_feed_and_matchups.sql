-- Week 5: signed-out browsing, cached scores, and "Which is funnier?" matchups.

-- Vote and matchup totals live on the generation itself, kept in sync by
-- triggers. Feeds can sort by score in SQL, and signed-out visitors see
-- totals without being able to read who voted for what.
alter table public.generations
  add column score integer not null default 0,
  add column wins integer not null default 0,
  add column losses integer not null default 0;

update public.generations g
set score = coalesce((select sum(v.vote) from public.generation_votes v where v.generation_id = g.id), 0);

create index generations_score_idx on public.generations (score desc, created_at desc);

create function public.sync_generation_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.generations set score = score - old.vote where id = old.generation_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.generations set score = score + new.vote where id = new.generation_id;
  end if;
  return null;
end;
$$;
revoke execute on function public.sync_generation_score() from public, anon, authenticated;

create trigger generation_votes_sync_score
  after insert or update of vote or delete on public.generation_votes
  for each row execute function public.sync_generation_score();

-- "Which is funnier?": a signed-in user picks the funnier of two images.
-- Each user judges a given pair once, and never judges their own images.
create table public.matchups (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  winner_id bigint not null references public.generations (id) on delete cascade,
  loser_id bigint not null references public.generations (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (winner_id <> loser_id)
);
create unique index matchups_user_pair_idx
  on public.matchups (user_id, least(winner_id, loser_id), greatest(winner_id, loser_id));
create index matchups_winner_idx on public.matchups (winner_id);
create index matchups_loser_idx on public.matchups (loser_id);

alter table public.matchups enable row level security;
revoke all on public.matchups from anon;
revoke update, delete, truncate on public.matchups from authenticated;

create policy "Users can view their own matchups"
  on public.matchups for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can judge other people's images"
  on public.matchups for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.generations g
      where g.id in (winner_id, loser_id) and g.user_id = (select auth.uid())
    )
  );

create function public.sync_matchup_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.generations set wins = wins + 1 where id = new.winner_id;
  update public.generations set losses = losses + 1 where id = new.loser_id;
  return null;
end;
$$;
revoke execute on function public.sync_matchup_record() from public, anon, authenticated;

create trigger matchups_sync_record
  after insert on public.matchups
  for each row execute function public.sync_matchup_record();

-- Signed-out visitors can browse: today's theme and the public columns of
-- each generation (not the creator's user id or the internal LLM prompt).
grant select on public.daily_themes to anon;
create policy "Anyone can view daily themes"
  on public.daily_themes for select to anon using (true);

grant select (
  id, creator_name, theme_day, theme, user_input, image_prompt, caption,
  storage_path, created_at, score, wins, losses
) on public.generations to anon;
create policy "Anyone can view generations"
  on public.generations for select to anon using (true);

-- The images are public now that the feed is, which also lets link
-- previews (iMessage, Slack, etc.) show them. Only the server can upload.
update storage.buckets set public = true where id = 'generations';
