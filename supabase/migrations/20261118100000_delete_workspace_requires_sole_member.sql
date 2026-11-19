-- An owner may not delete a workspace out from under its other members.
--
-- ============================================================================
-- What this changes, and what was wrong with it
-- ============================================================================
--
-- `20261116230000_profiles_and_memberships.sql` defined `delete_workspace` to
-- check ownership and then `delete from public.workspaces`. Because
-- `memberships.workspace_id` is `on delete cascade`, that one statement also
-- removed **every other member's membership row**.
--
-- The result was silent in the worst way: the other members' accounts survived,
-- so nothing looked broken from their side — they simply had no workspace any
-- more, were never told, and had no record that one had existed. A destructive
-- action that affects somebody who is not in the room should not be reachable
-- by one person clicking a button in their own Settings.
--
-- Vlad's decision for B1: **refuse, and say why.** Transferring ownership,
-- removing members, or deleting with their consent are all real features, and
-- none of them is B1. Refusing is the smallest honest thing, and it is the one
-- that cannot destroy anybody's data while the bigger question is open.
--
-- ============================================================================
-- Why a custom SQLSTATE
-- ============================================================================
--
-- `45001`, from class 45, which PostgreSQL does not use. The server action has
-- to tell this refusal apart from "something went wrong" so it can offer a
-- different sentence — and matching on the message text would mean the prose
-- could never be reworded without breaking it. The code is the contract; the
-- message is for people.
--
-- The ownership check above it keeps the default `P0001`, because nothing needs
-- to distinguish it: both the action and `rls.db.test.ts` read its message.

create or replace function public.delete_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_remaining integer;
  v_others integer;
begin
  if v_user_id is null then
    raise exception 'delete_workspace requires an authenticated user';
  end if;

  -- `is_owner_of` would answer this, but asking it here keeps the failure
  -- message specific: a member who tries this should be told they are not the
  -- owner, not handed a silent no-op that looks like success.
  if not exists (
    select 1
    from public.memberships m
    where m.workspace_id = p_workspace_id
      and m.user_id = v_user_id
      and m.role = 'owner'
  ) then
    raise exception 'only an owner may delete a workspace';
  end if;

  -- The new rule. Counted before anything is deleted, so a refusal leaves the
  -- workspace exactly as it was.
  select count(*) into v_others
  from public.memberships m
  where m.workspace_id = p_workspace_id
    and m.user_id <> v_user_id;

  if v_others > 0 then
    raise exception
      'this workspace still has % other member(s), so it cannot be deleted', v_others
      using errcode = '45001',
            hint = 'Remove the other members first, or transfer ownership to one of them.';
  end if;

  -- Everything else goes with it: every table carrying a `workspace_id`
  -- cascades, `objectives` and `key_results` cascade through `goals`, and
  -- `metric_snapshots` through `social_accounts`. The test asserts zero rows
  -- across all of them rather than trusting this comment.
  delete from public.workspaces w where w.id = p_workspace_id;

  select count(*) into v_remaining
  from public.memberships m
  where m.user_id = v_user_id;

  -- A profile with no workspace is a login into nothing, so the account goes
  -- too — but only when this was the last one. A user who owns one workspace
  -- and is a member of another keeps their account.
  if v_remaining = 0 then
    delete from auth.users u where u.id = v_user_id;
  end if;
end;
$$;

-- Unchanged, and restated because a fresh database applying these migrations in
-- order must end with the same grants the original definition established.
revoke all on function public.delete_workspace(uuid) from public;
grant execute on function public.delete_workspace(uuid) to authenticated;
