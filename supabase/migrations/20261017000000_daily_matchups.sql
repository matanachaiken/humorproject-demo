-- Battles refresh daily: each player can judge a given pair once per day
-- (New York time) instead of once ever, so small pools don't run dry.

alter table public.matchups add column day date not null default public.ny_today();
update public.matchups set day = (created_at at time zone 'America/New_York')::date;

drop index public.matchups_user_pair_idx;
create unique index matchups_user_day_pair_idx
  on public.matchups (user_id, day, least(winner_id, loser_id), greatest(winner_id, loser_id));

-- Picks always count for today, so nobody can backdate a pick to judge a
-- pair again (and hand out extra battle-win XP).
drop policy "Users can judge other people's images" on public.matchups;
create policy "Users can judge other people's images"
  on public.matchups for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and day = public.ny_today()
    and not exists (
      select 1 from public.generations g
      where g.id in (winner_id, loser_id) and g.user_id = (select auth.uid())
    )
  );
