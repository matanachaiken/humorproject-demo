-- Progression: XP, levels, daily streaks, a daily mystery wheel, art styles,
-- and the Writers' Room (level 5+ vote on tomorrow's theme).
--
-- All XP is granted by the database itself (triggers and security-definer
-- functions). Clients can read their own progress but never write it.

-- New York calendar day, the app's notion of "today".
create function public.ny_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/New_York')::date $$;

-- One row per player.
create table public.player_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_visit_day date,
  streak_freezes integer not null default 0,
  -- Day an extra creation was won on the wheel (good for that day only).
  bonus_creation_day date,
  -- Highest level the player has seen the level-up screen for.
  seen_level integer not null default 1
);
alter table public.player_stats enable row level security;
revoke all on public.player_stats from anon, authenticated;
grant select on public.player_stats to authenticated;
create policy "Players can view their own stats"
  on public.player_stats for select to authenticated
  using ((select auth.uid()) = user_id);

-- Every XP grant, so each one happens once (unique key) and daily caps can
-- be counted. Removing a grant (e.g. an upvote taken back) deletes its row.
create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  ref text not null,
  day date not null default public.ny_today(),
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index xp_events_user_day_idx on public.xp_events (user_id, day);
alter table public.xp_events enable row level security;
revoke all on public.xp_events from anon, authenticated;
grant select on public.xp_events to authenticated;
create policy "Players can view their own XP history"
  on public.xp_events for select to authenticated
  using ((select auth.uid()) = user_id);

-- Grants XP once per (user, reason, ref). Returns the amount granted (0 if
-- it was already granted). Internal: not callable over the API.
create function public.award_xp(p_user uuid, p_amount integer, p_reason text, p_ref text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.xp_events (user_id, amount, reason, ref)
  values (p_user, p_amount, p_reason, p_ref)
  on conflict (user_id, reason, ref) do nothing;
  if not found then
    return 0;
  end if;
  insert into public.player_stats (user_id, xp) values (p_user, p_amount)
  on conflict (user_id) do update set xp = public.player_stats.xp + excluded.xp;
  return p_amount;
end;
$$;

-- Like award_xp, but only for the first 20 votes + battle picks each day.
create function public.award_activity_xp(p_user uuid, p_reason text, p_ref text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.xp_events
    where user_id = p_user and day = public.ny_today() and reason in ('vote', 'judge')
  ) >= 20 then
    return 0;
  end if;
  return public.award_xp(p_user, 2, p_reason, p_ref);
end;
$$;

-- Takes back a grant (e.g. an upvote that was removed).
create function public.revoke_xp(p_reason text, p_ref text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed record;
begin
  for removed in
    delete from public.xp_events where reason = p_reason and ref = p_ref
    returning user_id, amount
  loop
    update public.player_stats
    set xp = greatest(0, xp - removed.amount)
    where user_id = removed.user_id;
  end loop;
end;
$$;

revoke execute on function public.award_xp(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.award_activity_xp(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.revoke_xp(text, text) from public, anon, authenticated;

-- Art style the riff was drawn in (unlocked by level).
alter table public.generations add column style text not null default 'classic';
grant select (style) on public.generations to anon;

-- Backfill XP for everything that happened before this migration.
insert into public.xp_events (user_id, amount, reason, ref, day)
select user_id, 20, 'create', id::text, (created_at at time zone 'America/New_York')::date
from public.generations;

insert into public.xp_events (user_id, amount, reason, ref, day)
select v.user_id, 2, 'vote', v.generation_id::text, (v.created_at at time zone 'America/New_York')::date
from public.generation_votes v;

insert into public.xp_events (user_id, amount, reason, ref, day)
select g.user_id, 5, 'upvoted', v.user_id || ':' || v.generation_id,
  (v.created_at at time zone 'America/New_York')::date
from public.generation_votes v
join public.generations g on g.id = v.generation_id
where v.vote = 1 and v.user_id <> g.user_id;

insert into public.player_stats (user_id, xp)
select user_id, sum(amount) from public.xp_events group by user_id;

-- XP for making a riff: +20.
create function public.xp_on_generation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_xp(new.user_id, 20, 'create', new.id::text);
  return null;
end;
$$;
create trigger generations_award_xp
  after insert on public.generations
  for each row execute function public.xp_on_generation();

-- XP for votes: +2 to the voter (capped), +5 to the creator per upvote,
-- taken back if the upvote is removed or switched to a downvote.
create function public.xp_on_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator uuid;
begin
  if tg_op = 'INSERT' then
    perform public.award_activity_xp(new.user_id, 'vote', new.generation_id::text);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.vote = 1
     and (tg_op = 'DELETE' or new.vote <> 1) then
    perform public.revoke_xp('upvoted', old.user_id || ':' || old.generation_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.vote = 1
     and (tg_op = 'INSERT' or old.vote <> 1) then
    select user_id into creator from public.generations where id = new.generation_id;
    if creator is not null and creator <> new.user_id then
      perform public.award_xp(creator, 5, 'upvoted', new.user_id || ':' || new.generation_id);
    end if;
  end if;
  return null;
end;
$$;
create trigger generation_votes_award_xp
  after insert or update of vote or delete on public.generation_votes
  for each row execute function public.xp_on_vote();

-- XP for battles: +2 to the judge (capped), +3 to the winner's creator.
create function public.xp_on_matchup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator uuid;
begin
  perform public.award_activity_xp(new.user_id, 'judge', new.id::text);
  select user_id into creator from public.generations where id = new.winner_id;
  if creator is not null then
    perform public.award_xp(creator, 3, 'battle_win', new.id::text);
  end if;
  return null;
end;
$$;
create trigger matchups_award_xp
  after insert on public.matchups
  for each row execute function public.xp_on_matchup();

revoke execute on function public.xp_on_generation() from public, anon, authenticated;
revoke execute on function public.xp_on_vote() from public, anon, authenticated;
revoke execute on function public.xp_on_matchup() from public, anon, authenticated;

-- Daily check-in, called on the first visit of each New York day. Extends
-- the streak (using streak freezes to cover missed days) and grants
-- +10 XP plus +5 per streak day, up to +45.
create function public.check_in()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := public.ny_today();
  stats public.player_stats;
  missed integer;
  next_streak integer;
  freezes integer;
  bonus integer;
begin
  if uid is null then
    return null;
  end if;

  insert into public.player_stats (user_id) values (uid) on conflict do nothing;
  select * into stats from public.player_stats where user_id = uid for update;
  if stats.last_visit_day = today then
    return jsonb_build_object('checked_in', false, 'streak', stats.streak);
  end if;

  freezes := stats.streak_freezes;
  if stats.last_visit_day is null then
    next_streak := 1;
  else
    missed := today - stats.last_visit_day - 1;
    if missed = 0 then
      next_streak := stats.streak + 1;
    elsif missed <= freezes then
      freezes := freezes - missed;
      next_streak := stats.streak + 1;
    else
      next_streak := 1;
    end if;
  end if;

  update public.player_stats
  set streak = next_streak,
      best_streak = greatest(best_streak, next_streak),
      last_visit_day = today,
      streak_freezes = freezes
  where user_id = uid;

  bonus := 10 + 5 * least(next_streak, 7);
  perform public.award_xp(uid, bonus, 'daily_visit', today::text);
  return jsonb_build_object('checked_in', true, 'streak', next_streak, 'xp', bonus);
end;
$$;
revoke execute on function public.check_in() from public, anon;
grant execute on function public.check_in() to authenticated;

-- Marks the level-up screen as seen up to p_level.
create function public.ack_level(p_level integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.player_stats
  set seen_level = greatest(seen_level, least(p_level, 10))
  where user_id = auth.uid();
$$;
revoke execute on function public.ack_level(integer) from public, anon;
grant execute on function public.ack_level(integer) to authenticated;

-- Creator XP for a list of riffs, so cards can show levels and frames
-- without exposing who made what.
create function public.creator_xp(ids bigint[])
returns table (generation_id bigint, xp integer)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, coalesce(s.xp, 0)
  from public.generations g
  left join public.player_stats s on s.user_id = g.user_id
  where g.id = any (ids);
$$;
revoke execute on function public.creator_xp(bigint[]) from public;
grant execute on function public.creator_xp(bigint[]) to anon, authenticated;

-- One spin of the mystery wheel per player per day.
create table public.wheel_spins (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default public.ny_today(),
  prize text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.wheel_spins enable row level security;
revoke all on public.wheel_spins from anon, authenticated;
grant select on public.wheel_spins to authenticated;
create policy "Players can view their own spins"
  on public.wheel_spins for select to authenticated
  using ((select auth.uid()) = user_id);

-- The server picks the prize, so the odds can't be tampered with:
-- 35% +10 XP, 30% +25 XP, 20% +50 XP, 10% streak freeze, 5% extra creation.
create function public.spin_wheel()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := public.ny_today();
  roll double precision := random();
  prize text;
begin
  if uid is null then
    return jsonb_build_object('error', 'signed_out');
  end if;

  prize := case
    when roll < 0.35 then 'xp10'
    when roll < 0.65 then 'xp25'
    when roll < 0.85 then 'xp50'
    when roll < 0.95 then 'freeze'
    else 'creation'
  end;

  insert into public.wheel_spins (user_id, day, prize) values (uid, today, prize)
  on conflict do nothing;
  if not found then
    return jsonb_build_object('error', 'already_spun');
  end if;

  insert into public.player_stats (user_id) values (uid) on conflict do nothing;
  case prize
    when 'xp10' then perform public.award_xp(uid, 10, 'wheel', today::text);
    when 'xp25' then perform public.award_xp(uid, 25, 'wheel', today::text);
    when 'xp50' then perform public.award_xp(uid, 50, 'wheel', today::text);
    when 'freeze' then
      update public.player_stats set streak_freezes = streak_freezes + 1 where user_id = uid;
    when 'creation' then
      update public.player_stats set bonus_creation_day = today where user_id = uid;
  end case;
  return jsonb_build_object('prize', prize);
end;
$$;
revoke execute on function public.spin_wheel() from public, anon;
grant execute on function public.spin_wheel() to authenticated;

-- Writers' Room: the AI drafts three candidate themes for tomorrow, and
-- level 5+ players (500+ XP) vote. The winner becomes tomorrow's theme.
alter table public.daily_themes add column writers_room boolean not null default false;

create table public.theme_candidates (
  id bigint generated always as identity primary key,
  for_day date not null,
  theme text not null,
  source_title text,
  source_url text,
  votes integer not null default 0,
  created_at timestamptz not null default now(),
  unique (for_day, theme)
);
alter table public.theme_candidates enable row level security;
revoke all on public.theme_candidates from anon, authenticated;
grant select on public.theme_candidates to anon, authenticated;
create policy "Anyone can view theme candidates"
  on public.theme_candidates for select to anon, authenticated using (true);

create table public.theme_votes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  for_day date not null,
  candidate_id bigint not null references public.theme_candidates (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, for_day)
);
alter table public.theme_votes enable row level security;
revoke all on public.theme_votes from anon, authenticated;
grant select, insert on public.theme_votes to authenticated;
grant update (candidate_id) on public.theme_votes to authenticated;

create policy "Players can view their own theme votes"
  on public.theme_votes for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Level 5 players can vote on tomorrow's theme"
  on public.theme_votes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and for_day > public.ny_today()
    and exists (
      select 1 from public.player_stats s
      where s.user_id = (select auth.uid()) and s.xp >= 500
    )
    and exists (
      select 1 from public.theme_candidates c
      where c.id = candidate_id and c.for_day = theme_votes.for_day
    )
  );
create policy "Level 5 players can change their theme vote"
  on public.theme_votes for update to authenticated
  using ((select auth.uid()) = user_id and for_day > public.ny_today())
  with check (
    (select auth.uid()) = user_id
    and for_day > public.ny_today()
    and exists (
      select 1 from public.theme_candidates c
      where c.id = candidate_id and c.for_day = theme_votes.for_day
    )
  );

create function public.sync_theme_votes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.theme_candidates set votes = votes - 1 where id = old.candidate_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.theme_candidates set votes = votes + 1 where id = new.candidate_id;
  end if;
  return null;
end;
$$;
revoke execute on function public.sync_theme_votes() from public, anon, authenticated;
create trigger theme_votes_sync
  after insert or update of candidate_id or delete on public.theme_votes
  for each row execute function public.sync_theme_votes();
