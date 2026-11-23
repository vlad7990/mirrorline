-- V2 — the client profile, and the three videos the scan ends on.
--
-- ============================================================================
-- One profile, two agents
-- ============================================================================
--
-- `BACKEND_PHASE §V2` asks the script agent to write "from the client's Voice
-- and Facts profile with at least one real business fact per script", and the
-- Niche Scan's P1 pass asks the Trend Scout to score fit against the same
-- facts. That is one profile, not two: a scan that knows the client runs
-- reactive-dog sessions in Miami beside a script agent that does not would
-- recommend formats it cannot then write.
--
-- So it is built once, for both.
--
-- ============================================================================
-- Industry-agnostic, which is a constraint on the SCHEMA and not only on copy
-- ============================================================================
--
-- CLAUDE.md: "It is industry-agnostic — we do not build industry pages,
-- because the agents research each account's niche and adapt to it." A column
-- called `training_method` with a check constraint listing
-- `positive_reinforcement | balanced` would make this a dog-training product
-- with a database to match, and the second client — a dentist, a plumber, a
-- photographer — would need a migration before they could be described.
--
-- `method` is therefore free text in the client's own words and `avoid` is the
-- list of things that method rules out. Between them they say "I only use
-- positive reinforcement" and "I never recommend prong collars" without this
-- table knowing what a prong collar is.

create table if not exists public.client_profiles (
  -- One row per workspace, so the workspace id *is* the key. A surrogate id
  -- would allow two profiles for one account, which is a state with no meaning
  -- and no way to choose between them.
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,

  -- Where they work: "Miami", "South London", "online only". Free text because
  -- a region list is a product decision nobody has made, and a wrong one is
  -- worse than none. The scan uses this to prefer local examples and local
  -- language, never to geocode anything.
  service_area text,

  -- **The one that can make an agent harmful if ignored.** A format that
  -- contradicts the client's stated method is not a mediocre suggestion — it
  -- is one they would have to refuse publicly, in their own niche. `12 §3` and
  -- the V2 brief both make the profile the thing a script is written *from*.
  method text,

  -- What the method rules out, one per entry. Passed to both agents as a hard
  -- "do not suggest" list rather than as a preference.
  avoid jsonb not null default '[]'::jsonb,

  -- `[{ "name": "Reactive dog intensive", "price": "$450 for 4 sessions" }]`.
  -- The price is text, not numeric: "from $120", "£90 an hour" and "free
  -- consult, then $200" are all real answers, and a numeric column would make
  -- the client either lie or leave it blank. Nothing bills off this.
  services jsonb not null default '[]'::jsonb,

  -- `{ "instagram": "@handle", "tiktok": "@handle", "youtube": "@handle" }`.
  -- Optional, and **not** a connection: `social_accounts` is where a connected
  -- account lives. This is the client telling the scan where their own work is.
  handles jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.client_profiles is
  'The Voice and Facts profile (BACKEND_PHASE §V2). Read by the Trend Scout '
  'for fit scoring and by the script agent, which must put at least one fact '
  'from here into every script it writes.';

-- ============================================================================
-- niche_reports gains the three videos
-- ============================================================================
--
-- On the report rather than in a table of their own, because they are part of
-- the report: "Your first 3 videos" is the last section of the document a
-- client reads, written from the formats directly above it. A separate table
-- would be a join that can disagree with the research it came from.
--
-- When a script becomes something we schedule and publish, it earns its own
-- row. Three ideas at the end of a document are not that yet.
alter table public.niche_reports add column if not exists first_videos jsonb not null default '[]'::jsonb;

comment on column public.niche_reports.first_videos is
  'Three concrete video ideas written from the top formats and the client '
  'profile (V2). Each carries a hook, four beats, the footage to shoot and '
  'the business fact it uses. Rejected before it lands here if it shares a '
  'sentence with a source example or carries no fact.';

-- ============================================================================
-- Row-level security
-- ============================================================================
--
-- Unlike `niche_reports` and `agent_runs`, this one **is** the client's own
-- writing — so members read it, and the write goes through a definer function
-- that cannot be pointed at another workspace. Same shape as `save_onboarding`
-- (20261118110000), for the same two reasons: one statement to Postgres, and
-- no workspace id in the signature to get wrong.
alter table public.client_profiles enable row level security;

drop policy if exists client_profiles_select_members on public.client_profiles;

create policy client_profiles_select_members
on public.client_profiles
for select
to authenticated
using (public.is_member_of(workspace_id));

grant select on public.client_profiles to authenticated;
revoke insert, update, delete on public.client_profiles from authenticated, anon;

-- ============================================================================
-- save_client_profile — the owner's own profile, and nothing else's
-- ============================================================================
--
-- `security definer` bypasses RLS, so it re-establishes what RLS was
-- enforcing: the only workspace it will touch is the one `auth.uid()` owns,
-- looked up here. There is no parameter in which to name somebody else's.
create or replace function public.save_client_profile(
  p_service_area text,
  p_method text,
  p_avoid jsonb,
  p_services jsonb,
  p_handles jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception 'save_client_profile requires an authenticated user';
  end if;

  -- **Through `memberships`, because that is where ownership lives.**
  -- `workspaces` has no `owner_id` column — `workspace_bootstrap` creates the
  -- workspace and an `owner` membership in one statement, and every definer
  -- function since reads the membership. The first draft of this one invented
  -- `w.owner_id`, which Postgres rejected at call time rather than at migrate
  -- time: a `security definer` body is only planned when it runs, so the
  -- migration applied cleanly and the save failed in the studio.
  select m.workspace_id into v_workspace_id
  from public.memberships m
  where m.user_id = v_user_id
    and m.role = 'owner'
  order by m.created_at
  limit 1;

  if v_workspace_id is null then
    raise exception 'you do not own a workspace' using errcode = '45002';
  end if;

  insert into public.client_profiles (
    workspace_id, service_area, method, avoid, services, handles
  )
  values (
    v_workspace_id,
    nullif(btrim(coalesce(p_service_area, '')), ''),
    nullif(btrim(coalesce(p_method, '')), ''),
    coalesce(p_avoid, '[]'::jsonb),
    coalesce(p_services, '[]'::jsonb),
    coalesce(p_handles, '{}'::jsonb)
  )
  on conflict (workspace_id) do update
  set
    service_area = excluded.service_area,
    method = excluded.method,
    avoid = excluded.avoid,
    services = excluded.services,
    handles = excluded.handles,
    updated_at = now();

  return v_workspace_id;
end;
$$;

-- `authenticated` only. D96's rule: a definer function reachable by `anon` is
-- a definer function reachable by anybody.
revoke all on function public.save_client_profile(text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_client_profile(text, text, jsonb, jsonb, jsonb) to authenticated;
