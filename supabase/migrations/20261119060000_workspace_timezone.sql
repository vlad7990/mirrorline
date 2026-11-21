-- The workspace's time zone, captured once at onboarding (D97).
--
-- ============================================================================
-- Why this column exists before anything reads it
-- ============================================================================
--
-- D95 stored a scheduled post as a **local date and a `time24` string** rather
-- than a `timestamptz`, because no workspace time zone existed and defaulting
-- to UTC would have silently rescheduled every account outside it. That was the
-- right call and it stays the storage; what was missing is the one fact that
-- makes "09:00" unambiguous — *nine in the morning where?*
--
-- So this is the fact, captured while the person is in front of us and their
-- browser can be asked, rather than inferred later from an IP address or
-- guessed at posting time. **No posting logic is built on it here.** The
-- scheduler is a later phase; it will find the answer already recorded instead
-- of having to invent one.
--
-- ============================================================================
-- Nullable, with no default
-- ============================================================================
--
-- `not null default 'UTC'` is the exact mistake D95 refused, one layer down: it
-- would make every workspace that predates this column — and every one whose
-- capture failed — claim London time rather than admit it does not know.
--
-- Null means "not captured". A reader has to handle it, and the only honest
-- thing to do with it is ask, which is cheap while the alternative is posting at
-- the wrong hour.
alter table public.workspaces
  add column if not exists timezone text;

comment on column public.workspaces.timezone is
  'IANA zone name from the browser at onboarding, e.g. America/New_York. Null means not captured — never assume UTC.';

-- ============================================================================
-- Validated by a trigger, because the column is reachable without the function
-- ============================================================================
--
-- `workspaces_update_owner` plus the table-level UPDATE grant mean an owner can
-- PATCH their own workspace row directly, so validating only inside
-- `set_workspace_timezone` would leave `timezone = 'Narnia'` one request away.
-- The same reasoning as D95's audit trigger: put the guarantee where no caller
-- can route around it.
--
-- A CHECK constraint cannot do this job. It would have to read
-- `pg_timezone_names`, and a constraint that reads a catalog is not immutable —
-- it would make a dump and restore depend on the restoring server's zone
-- database. A trigger is evaluated on write only, which is exactly when the
-- question matters.
create or replace function public.assert_timezone_is_real()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Null is the honest "not captured" and must stay allowed.
  if new.timezone is null then
    return new;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_timezone_names tz where tz.name = new.timezone
  ) then
    raise exception '% is not a time zone this database knows', new.timezone
      using errcode = '45004';
  end if;

  return new;
end;
$$;

drop trigger if exists workspaces_timezone_is_real on public.workspaces;

create trigger workspaces_timezone_is_real
before insert or update of timezone on public.workspaces
for each row
execute function public.assert_timezone_is_real();

-- ============================================================================
-- One function rather than a sixth parameter on `save_onboarding`
-- ============================================================================
--
-- `save_onboarding(text, text, text, text, text)` is deployed and called by the
-- running app. Adding a defaulted sixth parameter creates an *overload*, and the
-- existing five-argument call then matches both signatures — `42725`,
-- ambiguous. Dropping and recreating it would be a contract change: production
-- would be running code that calls the old shape until the next deploy, which is
-- the failure D93's gate exists to prevent.
--
-- So the time zone gets its own call. It is also better shaped: a time zone that
-- fails to save must not lose somebody their onboarding answers, and two
-- functions can fail independently where one cannot.
create or replace function public.set_workspace_timezone(p_timezone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_timezone text := nullif(btrim(coalesce(p_timezone, '')), '');
begin
  if v_user_id is null then
    raise exception 'set_workspace_timezone requires an authenticated user';
  end if;

  if v_timezone is null then
    raise exception 'a time zone is required' using errcode = '45005';
  end if;

  -- The owned workspace, and only it: there is no parameter in which to name
  -- somebody else's. The same lookup `save_onboarding` does, for the same
  -- reason.
  select m.workspace_id into v_workspace_id
  from public.memberships m
  where m.user_id = v_user_id
    and m.role = 'owner'
  order by m.created_at
  limit 1;

  if v_workspace_id is null then
    raise exception 'you do not own a workspace' using errcode = '45002';
  end if;

  -- The trigger validates the value. An unknown zone raises `45004` and nothing
  -- is written, which is the right outcome: a wrong zone is worse than none.
  update public.workspaces w
  set timezone = v_timezone
  where w.id = v_workspace_id;

  return v_workspace_id;
end;
$$;

revoke all on function public.set_workspace_timezone(text) from public;
grant execute on function public.set_workspace_timezone(text) to authenticated;

-- Additive: a nullable column, a new trigger on it, and a new function. Nothing
-- is dropped, renamed or narrowed, and `save_onboarding` is untouched.
