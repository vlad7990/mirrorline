-- The shared KPI definitions — 15 §3, seeded from
-- `apps/web/components/kpi/sample-dashboard.ts`.
--
-- **This file is a transcription, not a translation.** `KpiDefinition` in
-- `components/kpi/kpi-types.ts` was written to match 15 §7's column list
-- exactly so this seed could be copied across rather than reinterpreted, and
-- `apps/web/lib/studio/kpi-seed.test.ts` fails if the two ever drift: same
-- keys, same units, same tiers. Edit the TypeScript, then edit this, and the
-- test will tell you if you missed one.
--
-- Idempotent on purpose. Running it twice is a thing that happens, and a seed
-- that explodes the second time is a seed nobody runs.
--
-- Only the shared definitions are here. A workspace's own KPIs (15 §4) are
-- created by the user, carry `is_custom = true` and a `workspace_id`, and
-- never come from a seed.

insert into public.kpi_definitions (key, name, unit, formula, source, tier) values
  (
    'posts_published',
    'Posts published',
    'count',
    'Posts that went live across every connected account, this week',
    'Our system',
    'production'
  ),
  (
    'posts_on_schedule',
    'Posts on schedule',
    'percent',
    'Posts published within 15 minutes of their planned time, as a share of all posts',
    'Our system',
    'production'
  ),
  (
    'three_second_hold',
    '3-second hold',
    'percent',
    'Viewers still watching at 3 seconds, as a share of plays',
    'Platform insights APIs',
    'content-health'
  ),
  (
    'sends_per_1k',
    'Sends per 1,000 reach',
    'count',
    'Times a post was sent to someone, per 1,000 accounts reached',
    'Platform insights APIs',
    'content-health'
  ),
  (
    'net_followers',
    'Net new followers',
    'count',
    'Follows minus unfollows, across every connected account, this week',
    'Platform insights APIs',
    'growth'
  ),
  (
    'non_follower_reach',
    'Non-follower reach',
    'percent',
    'Share of reach from accounts that do not follow you',
    'Platform insights APIs',
    'growth'
  ),
  (
    'leads',
    'Leads',
    'count',
    'Enquiries attributed to a tracked link or a DM keyword, this week',
    'Tracked links and DM keywords',
    'outcome'
  ),
  (
    'bookings',
    'Bookings',
    'count',
    'Appointments booked through a connected booking tool, this week',
    'Booking connector',
    'outcome'
  ),
  (
    'cost_per_lead',
    'Cost per lead',
    'currency',
    'Plan cost for the period divided by leads in the period',
    'Calculated',
    'return'
  ),
  (
    'originality_pass_rate',
    'Originality Gate pass rate',
    'percent',
    'Videos passing the gate first time, as a share of videos checked',
    'Compliance agent',
    'quality'
  ),
  (
    'ai_labelled_share',
    'AI-labelled share',
    'percent',
    'Published posts carrying an AI label, as a share of all posts',
    'Compliance agent',
    'quality'
  ),
  (
    'upload_to_first_post',
    'Upload to first post',
    'days',
    'Median time from a file arriving to its first cut going live',
    'Job queue',
    'agent-ops'
  )
on conflict (key) do update set
  name = excluded.name,
  unit = excluded.unit,
  formula = excluded.formula,
  source = excluded.source,
  tier = excluded.tier;
