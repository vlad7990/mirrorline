-- B1, second of two: policies only. `docs/plan/BACKEND_PHASE.md` §1.
--
-- Thirteen tables have row-level security enabled and nothing may read them.
-- This file is what makes them readable, and **only** to a member of the
-- workspace the row belongs to.
--
-- ============================================================================
-- The shape of every policy here
-- ============================================================================
--
-- `public.is_member_of(workspace_id)` — defined in the previous migration,
-- `security definer`, so it answers the question without being subject to the
-- policy that asked it. For an anonymous caller `auth.uid()` is null, the
-- `exists` fails, and the answer is `false`. **That is how "anonymous reads
-- nothing" is implemented: not as a separate rule, but as the absence of a
-- membership.**
--
-- The service-role key bypasses RLS entirely. Every policy below is therefore
-- about the browser and nothing else, and the server keeps its own discipline
-- (§1: the service-role key never reaches a client component).
--
-- ============================================================================
-- Reads are broad, writes are narrow, and the narrowness is deliberate
-- ============================================================================
--
-- A member may **read** everything in their workspace. A member may **write**
-- only what a person authors: goals, objectives, key results (the target in
-- 15 §1) and the acknowledgement of an alert.
--
-- Everything else is read-only to the browser — `metric_snapshots`,
-- `ledger_weekly`, `social_accounts`, `trends` — because those are written by
-- jobs holding the service-role key, and a client-side insert into
-- `metric_snapshots` would be a measurement a user typed. 15 §8 is the rule
-- that makes this a correctness question rather than a tidiness one.
--
-- **No `insert` policy on `workspaces`.** A workspace and its owner
-- membership have to appear together or not at all, which is a transaction on
-- the server, not two client inserts. An `insert` policy here would also let
-- any authenticated user create workspaces without limit.
--
-- **No policy at all on `leads`.** It has no `workspace_id`: a lead is a
-- stranger who filled in the Niche Scan form, and it belongs to us rather
-- than to any workspace. RLS on with no policy is exactly right — B4's writer
-- holds the service-role key, and no browser has any business reading it.

-- ============================================================================
-- Three joins that do not carry a workspace_id
-- ============================================================================
--
-- `objectives`, `key_results` and `metric_snapshots` reach their workspace
-- through a parent. Each gets a `security definer` function rather than a
-- nested `exists` in the policy body, for two reasons: the policy reads as the
-- sentence it means, and the lookup is not re-filtered by the parent table's
-- own policy on the way (which would work, and would make the behaviour
-- depend on two policies agreeing instead of one).

create or replace function public.can_access_goal(p_goal_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.goals g
    join public.memberships m on m.workspace_id = g.workspace_id
    where g.id = p_goal_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_access_objective(p_objective_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.objectives o
    join public.goals g on g.id = o.goal_id
    join public.memberships m on m.workspace_id = g.workspace_id
    where o.id = p_objective_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_access_social_account(p_social_account_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.social_accounts sa
    join public.memberships m on m.workspace_id = sa.workspace_id
    where sa.id = p_social_account_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.can_access_goal(uuid) from public;
revoke all on function public.can_access_objective(uuid) from public;
revoke all on function public.can_access_social_account(uuid) from public;
grant execute on function public.can_access_goal(uuid) to authenticated, anon;
grant execute on function public.can_access_objective(uuid) to authenticated, anon;
grant execute on function public.can_access_social_account(uuid) to authenticated, anon;

-- ============================================================================
-- profiles
-- ============================================================================

drop policy if exists profiles_select_self_and_co_members on public.profiles;

-- Yourself, and anyone who shares a workspace with you — a member list has to
-- be able to show a name. Not every profile in the database.
create policy profiles_select_self_and_co_members
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid()
      and theirs.user_id = public.profiles.id
  )
);

drop policy if exists profiles_update_self on public.profiles;

-- `with check` as well as `using`, so the row cannot be updated into
-- somebody else's id — `using` alone decides which rows you may touch, not
-- what you may turn them into.
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- No insert policy: the trigger writes profiles, as the previous migration's
-- note 1 explains. No delete policy: a profile goes when the auth user goes,
-- by cascade.

-- ============================================================================
-- memberships
-- ============================================================================

drop policy if exists memberships_select_own_workspaces on public.memberships;

create policy memberships_select_own_workspaces
on public.memberships
for select
to authenticated
using (public.is_member_of(workspace_id));

-- No write policies. Inviting and removing people is not in B1, and a client
-- that could insert a membership could add itself to any workspace whose id
-- it could guess — which is the whole of the access model in one insert.

-- ============================================================================
-- workspaces
-- ============================================================================

drop policy if exists workspaces_select_members on public.workspaces;

create policy workspaces_select_members
on public.workspaces
for select
to authenticated
using (public.is_member_of(id));

drop policy if exists workspaces_update_owner on public.workspaces;

create policy workspaces_update_owner
on public.workspaces
for update
to authenticated
using (public.is_owner_of(id))
with check (public.is_owner_of(id));

-- No insert policy (see the header). No delete policy: deletion goes through
-- `public.delete_workspace`, which also removes the auth user when it was
-- their last workspace — something no policy can do.

-- ============================================================================
-- social_accounts — read-only to the browser
-- ============================================================================

drop policy if exists social_accounts_select_members on public.social_accounts;

create policy social_accounts_select_members
on public.social_accounts
for select
to authenticated
using (public.is_member_of(workspace_id));

-- No write policies. Connecting an account is an OAuth flow that ends on the
-- server, and §2 of the plan keeps tokens out of this phase entirely.

-- ============================================================================
-- The goal cascade — a member authors these
-- ============================================================================

drop policy if exists goals_select_members on public.goals;
drop policy if exists goals_insert_members on public.goals;
drop policy if exists goals_update_members on public.goals;
drop policy if exists goals_delete_members on public.goals;

create policy goals_select_members
on public.goals
for select
to authenticated
using (public.is_member_of(workspace_id));

create policy goals_insert_members
on public.goals
for insert
to authenticated
with check (public.is_member_of(workspace_id));

create policy goals_update_members
on public.goals
for update
to authenticated
using (public.is_member_of(workspace_id))
with check (public.is_member_of(workspace_id));

create policy goals_delete_members
on public.goals
for delete
to authenticated
using (public.is_member_of(workspace_id));

drop policy if exists objectives_select_members on public.objectives;
drop policy if exists objectives_insert_members on public.objectives;
drop policy if exists objectives_update_members on public.objectives;
drop policy if exists objectives_delete_members on public.objectives;

create policy objectives_select_members
on public.objectives
for select
to authenticated
using (public.can_access_goal(goal_id));

create policy objectives_insert_members
on public.objectives
for insert
to authenticated
with check (public.can_access_goal(goal_id));

create policy objectives_update_members
on public.objectives
for update
to authenticated
using (public.can_access_goal(goal_id))
with check (public.can_access_goal(goal_id));

create policy objectives_delete_members
on public.objectives
for delete
to authenticated
using (public.can_access_goal(goal_id));

drop policy if exists key_results_select_members on public.key_results;
drop policy if exists key_results_insert_members on public.key_results;
drop policy if exists key_results_update_members on public.key_results;
drop policy if exists key_results_delete_members on public.key_results;

create policy key_results_select_members
on public.key_results
for select
to authenticated
using (public.can_access_objective(objective_id));

create policy key_results_insert_members
on public.key_results
for insert
to authenticated
with check (public.can_access_objective(objective_id));

-- This is the write §2 calls "targets persisting". The column restriction is
-- not expressible in a policy, so the server action is the narrower gate: the
-- policy says *whose* key result may be touched, the action says *which
-- field*.
create policy key_results_update_members
on public.key_results
for update
to authenticated
using (public.can_access_objective(objective_id))
with check (public.can_access_objective(objective_id));

create policy key_results_delete_members
on public.key_results
for delete
to authenticated
using (public.can_access_objective(objective_id));

-- ============================================================================
-- kpi_definitions — shared reference data, plus a workspace's own
-- ============================================================================

drop policy if exists kpi_definitions_select_shared_and_own on public.kpi_definitions;

-- §1: "shared reference data, readable by any authenticated user, writable by
-- none". The twelve seeded rows have a null `workspace_id`; a custom KPI
-- (15 §4) carries one, and only its workspace sees it.
create policy kpi_definitions_select_shared_and_own
on public.kpi_definitions
for select
to authenticated
using (workspace_id is null or public.is_member_of(workspace_id));

-- No write policies, including for custom KPIs. `lib/studio/kpi-seed.test.ts`
-- fails if the seeded twelve drift from the TypeScript, and a browser that
-- could insert here could add a thirteenth that no test knows about. Creating
-- a custom KPI is a server action when B2 needs one.

-- ============================================================================
-- Measurements — read-only to the browser
-- ============================================================================

drop policy if exists metric_snapshots_select_members on public.metric_snapshots;

create policy metric_snapshots_select_members
on public.metric_snapshots
for select
to authenticated
using (public.can_access_social_account(social_account_id));

drop policy if exists ledger_weekly_select_members on public.ledger_weekly;

create policy ledger_weekly_select_members
on public.ledger_weekly
for select
to authenticated
using (public.is_member_of(workspace_id));

-- No writes on either. Both are measurements, and the only honest author of a
-- measurement is the thing that took it.

-- ============================================================================
-- alerts — readable, and acknowledgeable
-- ============================================================================

drop policy if exists alerts_select_members on public.alerts;
drop policy if exists alerts_update_members on public.alerts;

create policy alerts_select_members
on public.alerts
for select
to authenticated
using (public.is_member_of(workspace_id));

-- Acknowledging an alert is a person's act, so it is the one write here. The
-- `alerts_timing_matches_kind` constraint still holds, so an update cannot
-- turn a connection alert into a trend one to make it look older.
create policy alerts_update_members
on public.alerts
for update
to authenticated
using (public.is_member_of(workspace_id))
with check (public.is_member_of(workspace_id));

-- No insert and no delete: 15 §5 decides when an alert exists, and a user who
-- could delete one could delete the evidence that posting had stopped.

-- ============================================================================
-- trends — read-only to the browser
-- ============================================================================

drop policy if exists trends_select_members on public.trends;

create policy trends_select_members
on public.trends
for select
to authenticated
using (public.is_member_of(workspace_id));

-- The Niche Scan writes these, with the service-role key. 12 §sources makes
-- `source_note` an audit record, and a row a client could write is not one.

-- ============================================================================
-- leads — deliberately no policy
-- ============================================================================
--
-- See the header. RLS is on and there is no policy, so anon and authenticated
-- read nothing and write nothing; B4's writer holds the service-role key.
-- This is the one table where "no policy" is the finished state rather than a
-- gap, which is why it is named here instead of being silently absent.
