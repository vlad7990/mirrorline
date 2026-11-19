-- Onboarding's write, as one statement to Postgres.
--
-- ============================================================================
-- Why this moved out of TypeScript
-- ============================================================================
--
-- The server action did this in four PostgREST calls — find the owned
-- workspace, update it, look for the primary goal, write it — each a round
-- trip to a database in another region, and each preceded by a `getUser()`
-- that verifies the token with GoTrue over the network too.
--
-- **It was measurably too slow.** Under a full parallel e2e run the submit
-- took longer than twenty seconds, and the test waiting on the redirect failed
-- while passing in isolation. Raising the timeout again would have been
-- treating the symptom: the work is one logical write and it was costing six
-- network hops.
--
-- The correctness argument is the same one `20261117180000_workspace_bootstrap`
-- already makes for `ensure_workspace_for_current_user`: a failure between the
-- workspace update and the goal insert leaves a workspace whose niche says one
-- thing and whose goal says another, with nothing to notice it. A plpgsql
-- function is one statement to Postgres, so there is no between.
--
-- ============================================================================
-- `security definer`, and why it is still the caller's own workspace
-- ============================================================================
--
-- This bypasses RLS, so it has to re-establish what RLS was enforcing. It does
-- that by never accepting a workspace id: the only workspace it will touch is
-- the one `auth.uid()` **owns**, looked up here. A caller cannot name somebody
-- else's workspace because there is no parameter in which to name one.
--
-- The three vocabularies stay checked by the column constraints
-- (`workspace_bootstrap.sql`), and `lib/workspace/onboarding-input.ts` checks
-- them a third time so the person gets a sentence instead of a `23514`.

create or replace function public.save_onboarding(
  p_niche text,
  p_audience text,
  p_stage text,
  p_goal_type text,
  p_outcome_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_goal_id uuid;
  v_outcome text := nullif(btrim(coalesce(p_outcome_text, '')), '');
begin
  if v_user_id is null then
    raise exception 'save_onboarding requires an authenticated user';
  end if;

  -- `goals.outcome_text` is `not null`, and an empty one would mean the person
  -- skipped the question rather than answered it. Refused here as well as in
  -- the parser, because this function is reachable without the form.
  if v_outcome is null then
    raise exception 'an outcome is required' using errcode = '45003';
  end if;

  -- The owned workspace, and only it. See the note above.
  select m.workspace_id into v_workspace_id
  from public.memberships m
  where m.user_id = v_user_id
    and m.role = 'owner'
  order by m.created_at
  limit 1;

  if v_workspace_id is null then
    raise exception 'you do not own a workspace' using errcode = '45002';
  end if;

  update public.workspaces w
  set niche = nullif(btrim(coalesce(p_niche, '')), ''),
      audience = p_audience,
      stage = p_stage,
      initial_goal_type = p_goal_type
  where w.id = v_workspace_id;

  -- `goals_one_primary_per_workspace` is a partial unique index, so this is
  -- read-then-write rather than an upsert — the same reasoning the action
  -- carried, now one hop away from the index instead of a network away.
  -- Re-running onboarding edits the one goal rather than colliding.
  select g.id into v_goal_id
  from public.goals g
  where g.workspace_id = v_workspace_id
    and g.is_primary
  limit 1;

  if v_goal_id is null then
    insert into public.goals (workspace_id, goal_type, outcome_text, is_primary)
    values (v_workspace_id, p_goal_type, v_outcome, true);
  else
    update public.goals g
    set goal_type = p_goal_type,
        outcome_text = v_outcome
    where g.id = v_goal_id;
  end if;

  return v_workspace_id;
end;
$$;

revoke all on function public.save_onboarding(text, text, text, text, text) from public;
grant execute on function public.save_onboarding(text, text, text, text, text) to authenticated;
