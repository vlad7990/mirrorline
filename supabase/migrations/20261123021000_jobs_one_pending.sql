-- One pending job per workspace per kind, as a constraint rather than a habit.
--
-- `lib/jobs/enqueue.ts` reads for a pending job before inserting, which closes
-- the ordinary double-press and gives the screen a sentence to show. It cannot
-- close the simultaneous one: two requests can both read "nothing pending"
-- before either inserts, and the window is exactly as wide as the round trip.
--
-- For this queue that window costs money. Two jobs for one button press means
-- two Sonnet calls with ~28 web searches each, billed twice, writing two
-- reports nobody asked for twice. So the guarantee belongs in the database,
-- where it cannot be raced, and the read upstream becomes what it should be: a
-- way to say something useful rather than the thing being relied on.
--
-- A partial unique index, the same shape as
-- `goals_one_primary_per_workspace` in `20261113120000_metrics_and_goals.sql`.
--
-- **Its own file rather than an edit to `20261123020000_jobs.sql`**, which has
-- already been applied to preview. `migrate-production.yml` states the rule
-- this follows — "applied history cannot be edited, only added to. Need a
-- change? Add another migration and run this again." Production has seen
-- neither file, so editing would have been harmless *this* time, which is
-- precisely the reasoning that makes the habit unsafe.
--
-- ============================================================================
-- Why the predicate stops at `running`
-- ============================================================================
--
-- A `failed` job with attempts left is still claimable — the lease expires and
-- the next claim picks it up — so it is arguably pending too. It is left out on
-- purpose: a client who sees a failure and presses the button again is making a
-- deliberate second request, and refusing it with "a scan is already running"
-- would be both confusing and wrong about what they can see on the screen.
-- Allowing the retry and the new job is the honest reading of two deliberate
-- presses.

create unique index if not exists jobs_one_pending_per_kind
  on public.jobs (workspace_id, kind)
  where status in ('queued', 'running');

comment on index public.jobs_one_pending_per_kind is
  'A double-pressed button must not buy two scans. enqueue.ts also reads '
  'before inserting, for the message; this index is the guarantee, because the '
  'read-then-insert has a race and that race is billable.';
