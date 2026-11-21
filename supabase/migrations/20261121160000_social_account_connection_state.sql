-- B2.3 — a workspace records which accounts are its own, and nothing that
-- could post (BACKEND_PHASE.md §2 item 3, §6).
--
-- ============================================================================
-- Why a function, when every other B2 write was a policy
-- ============================================================================
--
-- `social_accounts` is **read-only to the browser** and deliberately so.
-- `20261116230100_rls_policies.sql` gives members a SELECT policy and nothing
-- else, and D96 revoked insert, update and delete from `authenticated` and
-- `anon` — the table is written by the pipeline, under the service role.
--
-- Connecting an account is the one thing a *person* does to it, so it arrives
-- the way `save_onboarding` (D97) does: a `security definer` function that does
-- the write the caller cannot. Re-opening table-level writes would undo D96 for
-- the sake of two statements.
--
-- ============================================================================
-- Neither function takes a workspace id
-- ============================================================================
--
-- The same shape as `save_onboarding` and `set_workspace_timezone`: **there is
-- no parameter in which to name somebody else's workspace.** The caller's own
-- is looked up from `memberships`, and `(workspace_id, platform, handle)` is
-- already unique — so a platform and a handle identify a row inside that
-- workspace and cannot address one outside it.
--
-- That is why `disconnect_social_account` takes a platform and a handle rather
-- than the row id the UI already has. An id parameter would need a membership
-- check to be *correct*; this needs one to be *found*, which is a weaker thing
-- to get wrong.
--
-- ============================================================================
-- No tokens, and the schema is where that is kept true
-- ============================================================================
--
-- §6 keeps posting off until Meta, TikTok and YouTube have approved the apps
-- and Postiz is running. Until then "connected" means **the client told us this
-- account is theirs** — not that we hold an OAuth grant, and not that anything
-- can publish.
--
-- So no column is added here, and none is referenced: `platform`, `handle`,
-- `status`, `note`, `connected_on` already exist and are the whole state.
-- `rls.db.test.ts` asserts no column of this table is named for a credential,
-- which is a test that fails the day somebody adds one without a decision.
--
-- `note` is the honest platform limit — "posts stay private until our app is
-- audited" — shown on the card rather than buried in a help article.

-- ============================================================================
-- connect_social_account
-- ============================================================================
--
-- Idempotent on `(platform, handle)`: connecting an account that is already
-- there updates it rather than failing on the unique index. Re-connecting after
-- a disconnect is the common case, and a person doing it twice should not meet
-- a constraint error.
create or replace function public.connect_social_account(
  p_platform text,
  p_handle text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_platform text := lower(nullif(btrim(coalesce(p_platform, '')), ''));
  v_handle text := nullif(btrim(coalesce(p_handle, '')), '');
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_account_id uuid;
begin
  if v_user_id is null then
    raise exception 'connect_social_account requires an authenticated user';
  end if;

  -- Checked here as well as by the column constraint. The constraint would
  -- refuse an unknown platform with `23514`, which is a database error for a
  -- form to show somebody; `45006` is one the action can turn into a sentence.
  if v_platform is null or v_platform not in ('instagram', 'tiktok', 'youtube', 'linkedin') then
    raise exception 'that platform is not one we support' using errcode = '45006';
  end if;

  -- A blank handle is not an account. `handle` is nullable on the table because
  -- the pipeline can know a platform before it knows the handle; a person
  -- connecting one always knows it.
  if v_handle is null then
    raise exception 'an account handle is required' using errcode = '45006';
  end if;

  -- The owned workspace, and only it. The same lookup `save_onboarding` and
  -- `set_workspace_timezone` do, for the same reason.
  select m.workspace_id into v_workspace_id
  from public.memberships m
  where m.user_id = v_user_id
    and m.role = 'owner'
  order by m.created_at
  limit 1;

  if v_workspace_id is null then
    raise exception 'you do not own a workspace' using errcode = '45002';
  end if;

  insert into public.social_accounts (workspace_id, platform, handle, status, note, connected_on)
  values (v_workspace_id, v_platform, v_handle, 'connected', v_note, current_date)
  on conflict (workspace_id, platform, handle) do update
    set status = 'connected',
        -- A null note leaves the existing one alone rather than erasing it: the
        -- platform limit is ours to write, not the caller's to clear by
        -- omitting a field.
        note = coalesce(excluded.note, public.social_accounts.note),
        connected_on = current_date
  returning id into v_account_id;

  return v_account_id;
end;
$$;

-- ============================================================================
-- disconnect_social_account
-- ============================================================================
--
-- The row survives. The card still has to say which account this was, and an
-- account the client disconnected is a different thing from one they never had
-- — `metric_snapshots` rows reference it either way.
create or replace function public.disconnect_social_account(
  p_platform text,
  p_handle text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_platform text := lower(nullif(btrim(coalesce(p_platform, '')), ''));
  v_handle text := nullif(btrim(coalesce(p_handle, '')), '');
  v_account_id uuid;
begin
  if v_user_id is null then
    raise exception 'disconnect_social_account requires an authenticated user';
  end if;

  if v_platform is null or v_handle is null then
    raise exception 'a platform and an account handle are required' using errcode = '45006';
  end if;

  select m.workspace_id into v_workspace_id
  from public.memberships m
  where m.user_id = v_user_id
    and m.role = 'owner'
  order by m.created_at
  limit 1;

  if v_workspace_id is null then
    raise exception 'you do not own a workspace' using errcode = '45002';
  end if;

  update public.social_accounts sa
  set status = 'not-connected',
      connected_on = null
  where sa.workspace_id = v_workspace_id
    and sa.platform = v_platform
    and sa.handle = v_handle
  returning sa.id into v_account_id;

  -- Not found and not yours are the same answer on purpose. The alternative
  -- distinguishes them, which tells a caller whether a handle exists in
  -- somebody else's workspace.
  if v_account_id is null then
    raise exception 'no such account on this workspace' using errcode = '45007';
  end if;

  return v_account_id;
end;
$$;

-- ============================================================================
-- Who may execute them (D98)
-- ============================================================================
--
-- Three statements, not two. `revoke all … from public` removes the implicit
-- grant; it leaves `anon`'s **direct** grant from Supabase's default privileges
-- intact, which is exactly the hole D98 found on four functions. The
-- `revoke … from anon` is the line that closes it.
revoke all on function public.connect_social_account(text, text, text) from public;
revoke execute on function public.connect_social_account(text, text, text) from anon;
grant execute on function public.connect_social_account(text, text, text) to authenticated;

revoke all on function public.disconnect_social_account(text, text) from public;
revoke execute on function public.disconnect_social_account(text, text) from anon;
grant execute on function public.disconnect_social_account(text, text) to authenticated;

-- Additive: two new functions and their grants. No table, column, policy or
-- existing function is dropped, renamed or narrowed.
