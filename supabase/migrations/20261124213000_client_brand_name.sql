-- The client's own name, because the report was signing itself with ours (D131).
--
-- ============================================================================
-- What went wrong
-- ============================================================================
--
-- The first live production report printed **"Prepared for VN & MN Product
-- Group"** on its cover. That is the *workspace* name — ours, the one the
-- account was created under — and the cover is the first page of a PDF handed to
-- a prospect. `BACKEND_PHASE §V1` asks for this document to be "usable by us for
-- prospects", and a document addressed to the wrong business is not.
--
-- The workspace name was the only name we had. `workspaces.name` is an account
-- label — it may be an agency, a holding company, or whatever somebody typed at
-- sign-up — and nothing in the schema held the name the client trades under.
--
-- ============================================================================
-- On the profile rather than on the workspace
-- ============================================================================
--
-- `client_profiles` is the Voice and Facts profile: what the agents are told
-- about the business. The trading name belongs with "where they work" and "how
-- they work" rather than beside the billing label, for a reason that is not
-- filing: **the script agent should be allowed to say it.** A hook that names
-- the business is grounded only if the name is a fact in the profile, and
-- `profileFacts` reads this table — D126's fact check refuses anything it cannot
-- find there.
--
-- One workspace serving several brands is a real future — an agency with five
-- clients — and it is a change to this table's primary key, not to this column.
-- Putting the name on the profile is the shape that admits it; putting it on
-- `workspaces` would not.
--
-- ============================================================================
-- Nullable, with no default
-- ============================================================================
--
-- Every existing profile predates this column and none of them can be guessed
-- at. Null means "not told", and the cover's rule for an absent fact is already
-- written: leave the row out rather than fill it with a placeholder. The report
-- falls back to the workspace name while the field is empty, because a name we
-- have is better than none — and the moment the brand is typed, the fallback
-- stops being reached.
alter table public.client_profiles
  add column if not exists brand_name text;

comment on column public.client_profiles.brand_name is
  'The name the client trades under, for the report cover and for scripts that '
  'name the business. Null means not told — never substitute workspaces.name '
  'into the stored value; that fallback belongs at the point of rendering.';

-- ============================================================================
-- A SIXTH PARAMETER WOULD BREAK THE DEPLOYED CALL. This is a new signature.
-- ============================================================================
--
-- `save_client_profile(text, text, jsonb, jsonb, jsonb)` is deployed and called
-- by the running app. Adding a **defaulted** sixth parameter creates an
-- overload, and the existing five-argument call then matches both signatures:
-- Postgres raises `42725`, ambiguous. D97 reached exactly this conclusion about
-- `save_onboarding` and gave the time zone its own function instead.
--
-- Here the field belongs in the same form and the same transaction as the rest
-- of the profile, so a separate function would be the wrong shape — a brand name
-- that saved while the method failed is a half-written profile. So this is a
-- **six-argument function with no defaults**, which a five-argument call cannot
-- match. The two coexist unambiguously, and D104's order holds: the schema goes
-- first, and the old signature keeps answering the old code until the deploy
-- that stops calling it.
--
-- The five-argument version is deliberately **not** dropped here. Dropping it is
-- a contract change against whatever is still running, which is the failure the
-- production schema gate exists to prevent. It can go in a later, separate
-- migration once nothing calls it.
create or replace function public.save_client_profile(
  p_brand_name text,
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

  -- Through `memberships`, because that is where ownership lives: `workspaces`
  -- has no `owner_id` column. The same lookup every definer function since
  -- `workspace_bootstrap` does, and the mistake the five-argument version's own
  -- comment records making once.
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
    workspace_id, brand_name, service_area, method, avoid, services, handles
  )
  values (
    v_workspace_id,
    nullif(btrim(coalesce(p_brand_name, '')), ''),
    nullif(btrim(coalesce(p_service_area, '')), ''),
    nullif(btrim(coalesce(p_method, '')), ''),
    coalesce(p_avoid, '[]'::jsonb),
    coalesce(p_services, '[]'::jsonb),
    coalesce(p_handles, '{}'::jsonb)
  )
  on conflict (workspace_id) do update
  set
    brand_name = excluded.brand_name,
    service_area = excluded.service_area,
    method = excluded.method,
    avoid = excluded.avoid,
    services = excluded.services,
    handles = excluded.handles,
    updated_at = now();

  return v_workspace_id;
end;
$$;

-- `authenticated` only. D96's rule: a definer function reachable by `anon` is a
-- definer function reachable by anybody.
revoke all on function public.save_client_profile(text, text, text, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.save_client_profile(text, text, text, jsonb, jsonb, jsonb)
  to authenticated;

-- Additive: one nullable column and one new function signature. Nothing is
-- dropped, renamed or narrowed, and the deployed five-argument function is
-- untouched and still callable.
