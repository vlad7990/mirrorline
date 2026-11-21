-- `post_moves` refuses rather than silently doing nothing (D95).
--
-- A separate migration because `20261119030000` was already applied when this
-- was found, and an applied migration is immutable — editing it in place would
-- leave every database that already ran it disagreeing with the file, which is
-- the drift a migration history exists to prevent. Forward-only, additive.
--
-- ============================================================================
-- What the RLS test caught
-- ============================================================================
--
-- `post_moves` has a select policy and no insert, update or delete policy, so
-- RLS denies all three. But Supabase grants every table in `public` to
-- `authenticated` by default, and the *grant* is checked before the *policy*:
-- with the grant still in place an UPDATE is permitted, RLS then filters it to
-- zero rows, and PostgREST answers **200 with an empty array**.
--
-- That is indistinguishable from "the row you asked for does not exist". For a
-- post that is right — B2.1's rule is that a filtered row reads as not-found.
-- For an audit table it is wrong: an attempt to rewrite history should be an
-- error somebody can see, not a no-op that reports success.
--
-- INSERT already failed loudly (a missing insert policy *is* a 42501), which is
-- why only two of the three were quiet.

revoke insert, update, delete on public.post_moves from authenticated;

-- The same treatment for the two verbs nobody may use on a scheduled post.
-- `grant update (scheduled_date, scheduled_time24)` from the previous migration
-- stands: moving stays allowed, and only those two columns.
--
-- Nothing in the app inserts or deletes a post as a user — the pipeline will
-- author them through the service role, which these revokes do not touch.

revoke insert, delete on public.scheduled_posts from authenticated;
