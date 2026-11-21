-- `revoke all from public` is not `revoke from anon` (D98).
--
-- ============================================================================
-- What was assumed, and what was true
-- ============================================================================
--
-- Every `security definer` function in this schema was written with the same
-- pair of lines:
--
--     revoke all on function … from public;
--     grant execute on function … to authenticated;
--
-- which reads as "only a signed-in caller may run this". It is not what it
-- does. `public` is the implicit grant every role holds by default; `anon` is a
-- **named role with a direct grant of its own**, from Supabase's
-- `alter default privileges … grant all on functions to postgres, anon,
-- authenticated, service_role`. Revoking the implicit grant leaves the direct
-- one untouched.
--
-- Measured against `mirrorline-preview` with the publishable key and no bearer
-- token — all four executed:
--
--     save_onboarding                     400 P0001 "requires an authenticated user"
--     delete_workspace                    400 P0001 "requires an authenticated user"
--     ensure_workspace_for_current_user   400 P0001 "requires an authenticated user"
--     set_workspace_timezone              400 P0001 "requires an authenticated user"
--
-- ============================================================================
-- Nothing was exploitable, and that is the only reason this is not urgent
-- ============================================================================
--
-- Each of those four opens with `if auth.uid() is null then raise`, which is why
-- the probe got a refusal rather than a workspace. **The guard held and the
-- grant did not** — defence in depth doing exactly its job, which is also why
-- the outer layer being wrong went unnoticed.
--
-- This is D96's lesson a second time, one object class over: a grant we never
-- wrote, inherited from a default, wider than the comment above it claimed. The
-- rule that comes out of both: **name the role you mean.** `from public` is a
-- statement about the implicit grant and about nothing else.
--
-- ============================================================================
-- The helpers keep their anon grant, deliberately
-- ============================================================================
--
-- `is_member_of`, `is_owner_of`, `can_access_goal`, `can_access_objective` and
-- `can_access_social_account` are granted `to authenticated, anon` on purpose
-- (`20261116230000_profiles_and_memberships.sql`). A policy runs as the calling
-- role, so an anonymous SELECT evaluates those functions as `anon` — revoking
-- there would turn "you see nothing" into an error on the public site. They
-- return booleans and read nothing a policy would not.
--
-- Additive: no function is dropped, renamed or changed in signature or body.
-- Only `anon`'s execute privilege on the four writers goes.

revoke execute on function public.save_onboarding(text, text, text, text, text) from anon;

revoke execute on function public.delete_workspace(uuid) from anon;

revoke execute on function
  public.ensure_workspace_for_current_user(text, text, text, text, text) from anon;

revoke execute on function public.set_workspace_timezone(text) from anon;
