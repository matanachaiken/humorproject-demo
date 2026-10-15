-- Battles count toward rankings: a riff's points are its vote score plus its
-- "Which is funnier?" wins. Postgres keeps it in sync whenever the vote and
-- battle triggers update score or wins.
alter table public.generations
  add column points integer generated always as (score + wins) stored;

create index generations_points_idx on public.generations (points desc, created_at desc);

grant select (points) on public.generations to anon;
