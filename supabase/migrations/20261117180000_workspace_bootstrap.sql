-- B1's app layer: the one call sign-up makes, and the three columns it fills.
--
-- `20261116230100_rls_policies.sql` deliberately gave `workspaces` **no insert
-- policy**, with this reasoning: "A workspace and its owner membership have to
-- appear together or not at all, which is a transaction on the server, not two
-- client inserts." This is that transaction.
--
-- ============================================================================
-- Why a function rather than two inserts in a server action
-- ============================================================================
--
-- A server action could hold the service-role key and insert both rows. It
-- could also fail between them, and that failure leaves a workspace nobody
-- owns — invisible to every policy, unreachable through `delete_workspace`,
-- and impossible to notice. A plpgsql function is one statement to Postgres,
-- so there is no between.
--
-- It also means **the service-role key is not needed for sign-up at all**: the
-- function runs `security definer` and takes its identity from `auth.uid()`,
-- so the user's own session is enough. One less place the secret has to reach.
--
-- ============================================================================
-- "Ensure", not "create", and that is the double-submit fix
-- ============================================================================
--
-- Sign-up can run twice: a double-clicked button, a retried server action, a
-- magic link opened in a second tab. A `create_…` would make another workspace
-- each time, and the user would land in whichever one a later query happened
-- to return first. This hands back the existing one instead, so the second
-- call is a no-op rather than a duplicate. The name says which it is.

-- ============================================================================
-- The onboarding choices, carried onto the workspace
-- ============================================================================
--
-- `lib/audience/account-type.ts` is the source for all three vocabularies and
-- these checks match it exactly — `Audience`, `AccountStage`, `GoalKey`. The
-- public site already carries the first two in URLs (`who`, `account`), so a
-- visitor who picked "individual / new" on the marketing site and then signed
-- up should not be asked the same question twice.
--
-- **Nullable, all three.** Somebody who arrives straight at `/sign-up` has
-- chosen nothing yet, and a default would be an answer invented on their
-- behalf. Onboarding asks whoever arrives without one.

alter table public.workspaces
  add column if not exists audience text
    check (audience in ('business', 'individual'));

alter table public.workspaces
  add column if not exists stage text
    check (stage in ('new', 'existing'));

-- Named `initial_` on purpose: it records **what was chosen on the way in**,
-- which is provenance, not state. `goals.goal_type` is the live goal once
-- onboarding writes one with the user's own `outcome_text`, and the two are
-- allowed to differ — somebody can change their mind in the wizard. Calling
-- this `goal_type` would have invited code to read whichever was nearer.
alter table public.workspaces
  add column if not exists initial_goal_type text
    check (
      initial_goal_type in
        ('leads', 'bookings', 'sales', 'audience', 'awareness', 'community', 'launch')
    );

-- ============================================================================
-- The bootstrap
-- ============================================================================

create or replace function public.ensure_workspace_for_current_user(
  p_name text,
  p_audience text default null,
  p_stage text default null,
  p_goal_type text default null,
  p_niche text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_existing uuid;
  v_workspace_id uuid;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if v_user_id is null then
    raise exception 'ensure_workspace_for_current_user requires an authenticated user';
  end if;

  -- Already owns one: hand it back. See the note at the top of this file.
  select m.workspace_id into v_existing
  from public.memberships m
  where m.user_id = v_user_id
    and m.role = 'owner'
  order by m.created_at
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  if v_name is null then
    raise exception 'a workspace needs a name';
  end if;

  -- The profile is normally written by `on_auth_user_created` the moment the
  -- auth user appears. This covers the one case that trigger cannot — a user
  -- created before that migration ran — and it is why the sign-up path never
  -- has to check whether a profile exists first.
  select u.email into v_email from auth.users u where u.id = v_user_id;

  insert into public.profiles (id, email)
  values (v_user_id, coalesce(v_email, ''))
  on conflict (id) do nothing;

  insert into public.workspaces (name, niche, audience, stage, initial_goal_type)
  values (
    v_name,
    nullif(btrim(coalesce(p_niche, '')), ''),
    p_audience,
    p_stage,
    p_goal_type
  )
  returning id into v_workspace_id;

  insert into public.memberships (workspace_id, user_id, role)
  values (v_workspace_id, v_user_id, 'owner');

  return v_workspace_id;
end;
$$;

revoke all on function public.ensure_workspace_for_current_user(text, text, text, text, text)
  from public;
grant execute on function public.ensure_workspace_for_current_user(text, text, text, text, text)
  to authenticated;

-- Not granted to `anon`. The other helpers in B1 are granted to both, because
-- answering "false" to an anonymous caller is useful. This one *writes*, so an
-- anonymous caller has no business holding the grant even though `auth.uid()`
-- would refuse them a line later. Two refusals are better than one.
