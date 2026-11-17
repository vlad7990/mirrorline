-- B1, first of two: the tables that say who a request is, and who may see a
-- workspace. `docs/plan/BACKEND_PHASE.md` §1.
--
-- The 13 November migration created eleven tables with row-level security on
-- and **not one policy** — which is safe (nothing is readable) and useless (no
-- user owns anything). It could not have had policies: there was nothing to
-- join a row to. This file is that missing half, and the policies land in
-- `20261116230100_rls_policies.sql` so that the two can be reviewed apart.
--
-- ============================================================================
-- Three things this file enforces rather than documents
-- ============================================================================
--
-- 1. **A profile is created by the database, not by the app.** A trigger on
--    `auth.users` writes it. An app-side insert after sign-up is a second
--    round trip that can fail on its own, and the failure leaves a user who
--    can authenticate and does not exist.
--
-- 2. **Membership is asked through a function, not a subquery.** A policy on
--    `memberships` that selects from `memberships` recurses until Postgres
--    gives up. `public.is_member_of` is `security definer`, so the lookup it
--    performs is not itself subject to the policy that called it.
--
-- 3. **Deleting a workspace deletes it.** `/legal/privacy` promises the user
--    can "ask us to delete your workspace" (D80). A soft delete would keep
--    that sentence true on the screen and false in the database, so the
--    cascades are real and `delete_workspace` removes the auth user too when
--    the workspace was their last.

-- ============================================================================
-- Profiles — one row per authenticated user
-- ============================================================================

create table if not exists public.profiles (
  -- Not a new id. The auth user *is* the identity, and a separate key here
  -- would be a second one to keep in step.
  id uuid primary key references auth.users (id) on delete cascade,
  -- Copied from the auth record at sign-up so a workspace member list can be
  -- rendered without reaching into `auth.users`, which RLS cannot protect
  -- selectively.
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Memberships — the join every policy reads
-- ============================================================================

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Two roles, because B1 has two things to decide: who may read a workspace
  -- (either) and who may destroy it (owner). A third role with no behaviour
  -- behind it would be a column that lies about what is enforced.
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  -- One membership per person per workspace. Without this, a second insert
  -- silently grants a second role and the owner check becomes a coin toss.
  unique (workspace_id, user_id)
);

-- Both directions are hot: every policy looks up "is this user in this
-- workspace", and the members list looks up "who is in this workspace".
create index if not exists memberships_user on public.memberships (user_id);
create index if not exists memberships_workspace on public.memberships (workspace_id);

-- ============================================================================
-- The membership predicate every policy calls
-- ============================================================================

-- `security definer` for reason 2 at the top of this file: a policy on
-- `memberships` that queried `memberships` directly would recurse.
--
-- `set search_path = ''` and every name fully qualified, so a caller cannot
-- shadow `memberships` with a table of their own in a schema earlier on the
-- path and answer this question for themselves.
create or replace function public.is_member_of(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_owner_of(p_workspace_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

-- Anonymous callers get `false` rather than an error: `auth.uid()` is null and
-- the `exists` is simply not satisfied. That is the behaviour the policies
-- want — "reads nothing", not "fails loudly".
revoke all on function public.is_member_of(uuid) from public;
revoke all on function public.is_owner_of(uuid) from public;
grant execute on function public.is_member_of(uuid) to authenticated, anon;
grant execute on function public.is_owner_of(uuid) to authenticated, anon;

-- ============================================================================
-- A profile per auth user, written by the database
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    -- Supabase puts whatever sign-up sent in `raw_user_meta_data`. Null when
    -- the form sent only an email, which both of ours may.
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================================
-- Deleting a workspace, and the user when it was their last (D80)
-- ============================================================================

-- Owner only, and the ownership check is inside the function rather than in a
-- policy: this runs as `security definer` precisely because it must delete
-- from `auth.users`, which no policy can grant. So it re-asks the question
-- itself instead of trusting that something upstream did.
create or replace function public.delete_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_remaining integer;
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

revoke all on function public.delete_workspace(uuid) from public;
grant execute on function public.delete_workspace(uuid) to authenticated;

-- ============================================================================
-- A workspace cannot lose its last owner
-- ============================================================================

-- The unique constraint above stops two roles for one person; nothing stops
-- the only owner demoting or removing themselves and leaving a workspace that
-- nobody can delete or administer. This does.
create or replace function public.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid := coalesce(new.workspace_id, old.workspace_id);
  v_owners integer;
begin
  -- The workspace itself is on its way out; the cascade is allowed to take the
  -- memberships with it. Without this the cascade would trip the guard and a
  -- legitimate deletion would fail.
  if not exists (select 1 from public.workspaces w where w.id = v_workspace_id) then
    return coalesce(new, old);
  end if;

  select count(*) into v_owners
  from public.memberships m
  where m.workspace_id = v_workspace_id
    and m.role = 'owner';

  if v_owners = 0 then
    raise exception 'a workspace must keep at least one owner';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists memberships_keep_an_owner on public.memberships;

-- A deferred constraint trigger, so the check runs at the end of the
-- statement rather than per row: one statement that demotes an owner and
-- promotes another is legal, which a `before` trigger would have refused
-- depending on the order the rows happened to arrive in.
create constraint trigger memberships_keep_an_owner
after update or delete on public.memberships
deferrable initially deferred
for each row
execute function public.guard_last_owner();

-- ============================================================================
-- Row-level security on the two new tables
-- ============================================================================
--
-- On, with no policy, for exactly as long as this file is the head of the
-- migration list — the same safe default the 13 November migration chose. The
-- policies are in `20261116230100_rls_policies.sql`, applied in the same
-- `db push`.

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
