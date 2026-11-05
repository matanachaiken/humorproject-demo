-- Week 8: the prompt chain tool. Superadmins build their own chains and run
-- them on demand. Daily Riff finds its chains by purpose and calls their
-- steps by number, so studio chains get their own purpose it never loads,
-- and the tool treats every other chain as read-only.

alter table public.prompt_chains drop constraint prompt_chains_purpose_check;
alter table public.prompt_chains add constraint prompt_chains_purpose_check
  check (purpose in ('riff', 'theme', 'idea_examples', 'writers_room', 'studio'));

-- 'vision' steps read the run's latest image and write text.
alter table public.prompt_chain_steps drop constraint prompt_chain_steps_kind_check;
alter table public.prompt_chain_steps add constraint prompt_chain_steps_kind_check
  check (kind in ('text', 'vision', 'image'));

-- Checked at the end of each statement instead of each row, so one UPDATE can
-- swap two steps' positions.
alter table public.prompt_chain_steps drop constraint prompt_chain_steps_chain_id_step_order_key;
alter table public.prompt_chain_steps add constraint prompt_chain_steps_chain_id_step_order_key
  unique (chain_id, step_order) deferrable initially immediate;

-- Numbers a studio chain's steps 1..n in the order given. The list must be
-- exactly that chain's steps.
create function public.set_prompt_chain_step_order(p_chain_id bigint, p_step_ids bigint[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.prompt_chains
    where id = p_chain_id and purpose = 'studio'
    for update;
  if not found then
    raise exception 'Chain % is not a studio chain.', p_chain_id using errcode = 'P0001';
  end if;

  if (select coalesce(array_agg(id order by id), '{}') from public.prompt_chain_steps where chain_id = p_chain_id)
     is distinct from (select coalesce(array_agg(x order by x), '{}') from unnest(p_step_ids) as x) then
    raise exception 'The list must contain each step of chain % once.', p_chain_id using errcode = 'P0001';
  end if;

  update public.prompt_chain_steps s
  set step_order = o.position
  from unnest(p_step_ids) with ordinality as o (step_id, position)
  where s.id = o.step_id;
end;
$$;
revoke execute on function public.set_prompt_chain_step_order(bigint, bigint[]) from public, anon, authenticated;
grant execute on function public.set_prompt_chain_step_order(bigint, bigint[]) to service_role;

-- One press of Generate. Images live in the generations bucket under
-- prompt-chains/.
create table public.prompt_chain_runs (
  id bigint generated always as identity primary key,
  chain_id bigint not null references public.prompt_chains (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  input_text text not null default '',
  input_image_path text,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index prompt_chain_runs_chain_idx on public.prompt_chain_runs (chain_id, created_at desc);

-- The steps as they were when the run started, so later edits to the chain
-- can't change a run in progress or rewrite what past media came from.
create table public.prompt_chain_run_steps (
  id bigint generated always as identity primary key,
  run_id bigint not null references public.prompt_chain_runs (id) on delete cascade,
  step_id bigint references public.prompt_chain_steps (id) on delete set null,
  position integer not null,
  name text not null,
  kind text not null check (kind in ('text', 'vision', 'image')),
  prompt text not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed')),
  output_text text,
  output_image_path text,
  model text,
  error text,
  duration_ms integer,
  unique (run_id, position)
);

do $$
declare t text;
begin
  foreach t in array array['prompt_chain_runs', 'prompt_chain_run_steps'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- A starter chain: the three-step example from the assignment.
with chain as (
  insert into public.prompt_chains (slug, name, purpose, description)
  values ('studio-image-to-captions', 'Image to captions', 'studio',
          'Describes an uploaded image, finds what''s funny about it, then writes five captions.')
  returning id
)
insert into public.prompt_chain_steps (chain_id, step_order, name, kind, prompt_template)
select chain.id, s.step_order, s.name, s.kind, s.prompt_template
from chain
cross join (values
  (1, 'Describe the image', 'vision',
   'Describe this image in 2-3 plain sentences. Say who or what is in it, what is happening, and any small detail that stands out.'),
  (2, 'Find the funny angle', 'text',
   $tpl$Here is a description of an image:
{{step_1}}

Write 2-3 sentences on what is funny about this scene, written for chronically online college students. Be specific.$tpl$),
  (3, 'Write five captions', 'text',
   $tpl$Image: {{step_1}}

Why it's funny: {{previous}}

Write five short, funny captions for this image, one per line, numbered 1 to 5. Each is under 100 characters. Keep them PG-13.$tpl$)
) as s (step_order, name, kind, prompt_template);
