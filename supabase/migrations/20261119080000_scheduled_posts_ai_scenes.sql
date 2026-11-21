-- Whether a post contains AI scenes, which is not a derivable fact (D99).
--
-- D95 listed the columns a scheduled post needs and deliberately left out the
-- three that are functions of other fields — `timeLabel`, `platformLabel`,
-- `statusLabel`. `hasAiScenes` was left out with them, and it does not belong in
-- that group: nothing else on the row implies it.
--
-- It is load-bearing rather than cosmetic. `components/calendar/post-panel.tsx`
-- reads `post.hasAiScenes` to **lock the AI label on** — a post with AI scenes
-- cannot have the label switched off. That is CLAUDE.md non-negotiable 4, "AI
-- scenes are always labelled, in the UI and on the platform".
--
-- So the read path had two options: store the fact, or hardcode `false` for
-- every row out of the database. The second would make a non-negotiable depend
-- on a literal — correct today, because nothing authors an AI remake yet, and
-- silently wrong the first time the Remake Producer does.
--
-- `default false` is honest here in a way `default 'UTC'` was not for D97's time
-- zone: a post has AI scenes only if something put them there, so the default is
-- the true answer for every row that exists today. The pipeline sets it true
-- when it composes a remake with generated scenes.
alter table public.scheduled_posts
  add column if not exists has_ai_scenes boolean not null default false;

comment on column public.scheduled_posts.has_ai_scenes is
  'True when the post contains AI-generated scenes. Forces the AI label on (non-negotiable 4) — never inferred, always written by whatever composed the post.';

-- No grant to `authenticated`. A member may move a post — `scheduled_date` and
-- `scheduled_time24`, D95 — and may not change what it is. Claiming a post has
-- no AI scenes when it does is exactly the edit that must be impossible, and
-- `20261119040000_append_only_grants.sql` already revoked the table-level UPDATE
-- that would otherwise have carried this column along with it.
--
-- Additive: one column with a default, no backfill needed, nothing dropped,
-- renamed or narrowed.
