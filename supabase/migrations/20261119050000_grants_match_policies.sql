-- Every table audited for the bug B2.2 found on one of them (D96).
--
-- ============================================================================
-- The bug, restated, because this migration is the general case of it
-- ============================================================================
--
-- Supabase's default privileges grant `select, insert, update, delete` on every
-- new table in `public` to `anon` and `authenticated`. **The grant is checked
-- before the policy.** So for a verb that has a grant and no policy:
--
--   * INSERT  — the row is built, the missing `with check` refuses it, and the
--               caller gets 42501. **Loud.** Nothing to fix.
--   * UPDATE  — `using` filters the rows to none, zero rows are updated, and
--     DELETE    PostgREST answers **200 with an empty array**. **Silent.** The
--               caller is told it succeeded and nothing happened.
--
-- `20261119040000_append_only_grants.sql` fixed the two B2.2 tables. This fixes
-- the other ten, because the hole was never specific to them — it is what every
-- `create table` in this schema inherited.
--
-- ============================================================================
-- What was audited, and the result
-- ============================================================================
--
-- All fifteen tables in `public`, each verb against the policies in
-- `20261116230100_rls_policies.sql` and `20261119030000_…`:
--
--   goals, objectives, key_results   four policies each. Nothing to do.
--   scheduled_posts, post_moves      done in 20261119040000.
--   the remaining ten                below.
--
-- ============================================================================
-- Why revoking is right rather than writing ten refusing policies
-- ============================================================================
--
-- A policy that matches nothing produces the same silent 200. Only the absence
-- of the grant makes Postgres refuse before it looks at a row — "RLS decides
-- rows, grants decide columns" (D95), and a verb the client has no business
-- using is not a row question at all.
--
-- **Nothing in the application loses a capability.** Every write to these ten
-- tables already goes through either the service role (`metric_snapshots`,
-- `ledger_weekly`, `trends`, `leads` — see `lib/leads/scan-store.ts`) or a
-- `security definer` function that runs as its owner and is unaffected by a
-- grant to `authenticated`: `handle_new_user` (profiles),
-- `ensure_workspace_for_current_user` and `save_onboarding` (workspaces,
-- memberships, goals), `delete_workspace` (the whole cascade). The one direct
-- client write in the app is `key_results`, which keeps all four policies.
--
-- What changes is the answer a caller gets for a write it was never allowed to
-- make: `403 permission denied` instead of `200 []`.
--
-- ============================================================================
-- The three verbs deliberately left granted
-- ============================================================================
--
-- `workspaces.update` (an owner renames it), `profiles.update` (self) and
-- `alerts.update` (a member acknowledges one) each have a policy, so each is a
-- row question and is answered by one. They stay.
--
-- Additive: no column, table, policy or function is dropped, renamed or
-- narrowed in type. `pnpm migration-safety` agrees.

-- Identity: created by a trigger on `auth.users`, deleted with the auth user.
-- A client may read co-members and update its own row; it may not author or
-- destroy one.
revoke insert, delete on public.profiles from authenticated, anon;

-- Membership is granted by `ensure_workspace_for_current_user` and removed by
-- `delete_workspace`. Inserting one would be joining a workspace nobody invited
-- you to; updating one would be promoting yourself to owner.
revoke insert, update, delete on public.memberships from authenticated, anon;

-- `delete_workspace(uuid)` is the only way a workspace goes, because deleting it
-- has to check sole membership and cascade (D80). A direct DELETE bypasses that
-- check — today it silently matches nothing, which is luck rather than design.
revoke insert, delete on public.workspaces from authenticated, anon;

-- Connecting an account is a Postiz/OAuth flow we have not built. Until it
-- exists there is no honest client-side write to this table.
revoke insert, update, delete on public.social_accounts from authenticated, anon;

-- The twelve shared definitions are reference data (seed.sql). Custom
-- definitions are a later feature and will arrive with a policy and a grant
-- back, together, rather than find a grant that has been sitting open.
revoke insert, update, delete on public.kpi_definitions from authenticated, anon;

-- Measurements. Written by the pipeline through the service role; a client that
-- could edit them could edit its own results, which is the one set of numbers in
-- this product that must not be editable.
revoke insert, update, delete on public.metric_snapshots from authenticated, anon;
revoke insert, update, delete on public.ledger_weekly from authenticated, anon;

-- An alert is raised by us and acknowledged by the client —
-- `alerts_update_members` is that acknowledgement. Raising or deleting one is
-- ours.
revoke insert, delete on public.alerts from authenticated, anon;

-- Lead capture is server-side with the service-role key, and `leads` has no
-- policy at all, so every client verb here is silent today — including from
-- `anon`, which is the role the public site's browser code holds.
revoke insert, update, delete on public.leads from authenticated, anon;

-- Trend Scout's output. Read by members, written by the scan.
revoke insert, update, delete on public.trends from authenticated, anon;
