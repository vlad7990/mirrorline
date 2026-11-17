# Supabase

The schema for 15 §7, plus the two tables the app already writes to. **Nothing
here is applied automatically**, and nothing in the app requires it to have
been applied.

## Why it is optional

CLAUDE.md: "Supabase. Tonight, mock data only; wire Supabase only if keys exist
in `.env.local`." Every preview deployment runs without a database, and that is
not a degraded mode — it is the mode the previews are reviewed in. The lead
form in `apps/web/lib/leads/scan-store.ts` picks its adapter at runtime: it
writes to Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both
set, and to a git-ignored JSON file under `.data/` otherwise. A lead form that
500s on every preview is worse than one that writes to disk.

Every studio screen reads the sample data in `apps/web/components/kpi/` and
`apps/web/lib/studio/`. None of them queries a database yet.

## Files

| File | What it does |
|---|---|
| `migrations/20261113120000_metrics_and_goals.sql` | Every table in 15 §7, plus `workspaces`, `social_accounts`, `leads` and `trends`. RLS on, no policies yet. |
| `seed.sql` | The twelve shared KPI definitions of 15 §3, transcribed from `apps/web/components/kpi/sample-dashboard.ts`. Idempotent. |

`apps/web/lib/studio/kpi-seed.test.ts` fails if the seed and the TypeScript
definitions disagree on any key, name, unit, formula, source or tier. Edit one,
then the other, and `pnpm test` will tell you if you missed a row.

## Applying it

```sh
supabase link --project-ref <ref>
supabase db push          # runs migrations/
psql "$DATABASE_URL" -f supabase/seed.sql
```

Or paste both files into the SQL editor, migration first.

## Two decisions worth knowing before you extend it

**A missing measurement is a missing row, never a zero.**
`metric_snapshots.value` is `not null`. 15 §8 forbids showing a zero for
something nobody measured, and the cheapest way to break that rule is a
nullable column that some later `coalesce(value, 0)` quietly fills in. The
UI's "not connected" state is the absence of rows. `ledger_weekly.sales_usd`
is the one deliberate exception, and it is nullable for that reason rather
than in spite of it: an account selling nothing through a tracked link has no
revenue figure, and the ledger names the column it cannot fill instead of
printing zeroes down it.

**RLS is on everywhere with no policy, and that is the safe state.** With RLS
enabled and no policy, `anon` and `authenticated` can read nothing; the
service-role key the server uses bypasses it. Policies land with
authentication. Until then a table cannot leak to a browser by being
forgotten — which is the failure mode of enabling RLS last.

## Needs Vlad

- A Supabase project, and `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in
  `.env.local`. Nothing here has been run against a real database: the SQL is
  written and reviewed but unexecuted, because no project exists to execute it
  against.
- RLS policies, once there is an auth model to write them against.
