# 04 · Agents

Seven agents work as one loop: a trend found on Monday becomes the client's own videos, posted all week, and the results shape next week. Each agent is a worker on the job queue with its own prompt, tools, spending cap and log. The writing and reasoning model is Claude (Sonnet for volume, Opus for strategy and reviews).

| # | Agent | Job | Inputs | Outputs | Tools and models | Limits |
|---|---|---|---|---|---|---|
| 1 | Trend Scout | Find formats rising in the niche and nearby niches; turn each into a format recipe | Niche settings, licensed trend data, the client's own analytics, the Performance Analyst's rankings | Trend cards: format name, beats, pacing, why it works, fit score | Claude; platform and licensed trend data sources only | Never downloads or stores other creators' videos; keeps only descriptions of the format |
| 2 | Remake Producer | Make the brand's own original version of a format | Format recipe, brand kit, client footage library | Script, shot list, rendered 9:16 video, 3 alternative hooks | Claude, Remotion templates, Wan 2.2 or a paid video API for labelled B-roll, FLUX.1 schnell, Kokoro or the client's consented voice | New script and footage only; AI scenes labelled |
| 3 | Multiplier | Turn one long video into 8–15 distinct cuts | Client upload | Cuts with hooks, captions, format tags, strength score | WhisperX, ClipsAI, Claude for picking moments and writing hooks, Remotion for captions and templates | Each cut must differ in moment, hook, length or format |
| 4 | Compliance | Check every video before it can post | Any rendered video plus its source data | Pass, needs review, or blocked, with reasons | Similarity checks against the source script and frames, rights records, consent records, licence allow-list, AI-label check | Blocks copied footage, audio, wording or likeness; blocks near-duplicates of the client's recent posts; blocks guarantees in captions |
| 5 | Client Concierge | Approvals, questions, weekly report | Approval queue, client messages, results | Approval requests, answers, weekly report | Claude, email or in-app chat | Never posts without approval, unless the client turned on auto-approve |
| 6 | Publisher | Post several times a day to each platform at the best times | Approved posts, the posting plan | Published posts with platform IDs | Postiz API, official platform APIs (Instagram Graph API, TikTok Content Posting API, YouTube Data API) | Client-owned accounts only; starts at 1–3 posts a day per platform; far below platform limits (Instagram allows 100 API posts per 24 hours); TikTok posts stay private until the app is audited |
| 7 | Performance Analyst | Learn what works and feed it back | Platform insights, link clicks, conversions | Rankings of hooks, formats and times; next week's plan | Claude, platform insights APIs, the client's link tracking | Reports honest numbers; no inflated or projected figures shown as actuals |

## The metric each agent owns (15 §6)

Every agent produces a measurement as well as a result. This table is what
makes the dashboard possible: a KPI with no agent behind it is a number nobody
is accountable for, and the 15 §3 tiers map onto it exactly.

| Agent | Metric job | Tier it feeds |
|---|---|---|
| Trend Scout | Benchmarks from the Niche Scan — views per follower, typical hold, typical length — which seed the first targets | Seeds the targets in tiers 2 and 3 |
| Remake Producer | Tags every video with format, hook type, length and CTA, so results can be compared | Makes tiers 2–4 comparable |
| Multiplier | The same tags on every cut, for the same reason | Makes tiers 2–4 comparable |
| Compliance | Originality Gate pass rate, items rewritten, AI-labelled share, compliance blocks | 6 · Quality and safety |
| Publisher | Posts published, posts on schedule, posting times | 1 · Production |
| Performance Analyst | Baseline, targets, every KPI calculation, alerts, the weekly note, next week's plan | 5 · Return, and the rollup of all seven |
| Client Concierge | Sends the weekly ledger and the note; collects the outcomes no platform can see ("did that lead buy?") | 4 · Outcome, the manual half |

**Nothing is tagged after the fact.** The Producer and the Multiplier write the
format, hook, length and CTA at the moment a video is made. Tagging later means
guessing, and a leaderboard built on guesses ranks the guesser.

## The Niche Scan: where Trend Scout may look (12 §1)

**Allowed, and nothing else:**

- TikTok Creative Center — trending hashtags, songs, top ads by industry
- Meta Ad Library — what others run as ads
- YouTube Data API search — public Shorts, view counts, publish dates
- The client's own Instagram, TikTok and YouTube insights, via official APIs
- Manual review by our strategist of up to 30 public examples

**Never:** scraping private data, logging into other accounts, downloading or
storing other creators' videos or audio, or bulk collection tools. The two
named scripts from the predecessor project — `tt_collect.py` and
`ig_account_dump.py` — stay banned and are not in this repo.

**What a scan stores: links and descriptions, never media.** Per example, in
`trends`: url, platform, account-size bucket, posted date, views, views per
follower, growth velocity, format name, hook type, length, beats, CTA type, why
it works, and the fit score for this client. The `source_note` column records
where the scan looked, per row — an audit of our sources has to be answerable
from the data rather than from memory.

**"Best" in a niche is views per follower over 30 days, not follower count.** A
4,000-follower account getting 40,000 views a video is a better model than a
two-million-follower account coasting, and ranking by raw views would recommend
the coaster.

## The Originality Gate: blocks and rewrites

The Compliance agent's first check, and the one that decides whether a draft
exists at all.

1. The draft is compared against the beat structure of the source format and
   against the client's own last 90 posts. The second comparison matters as
   much as the first: a client repeating themselves is a client whose reach
   falls, and the platforms treat it the same way.
2. **Over the similarity limit, the draft does not go forward as written.** It
   goes back to the Remake Producer with the offending lines named, and is
   rewritten. The gate does not warn and continue, and there is no override —
   not from the Remake studio and not from anywhere else.
3. A draft that fails twice is **blocked**, and the Concierge is told. Two
   failures mean the recipe is too close to its source to remake, not that the
   writer was unlucky.
4. The result is shown to the client with the number, the limit, and what the
   gate did — including the draft it sent back. A gate whose failures are
   invisible is indistinguishable from a gate that never fires, which is
   precisely what the predecessor project had.

The pass rate and the count of rewritten items are tier 6 KPIs, so the gate's
own behaviour is measured rather than assumed.

## Shared rules for every agent

- Every action is written to the agent log with time, input, output, cost and reason.
- Every agent has a monthly spend cap per client; at 80% it warns, and at 100% it pauses and tells the Concierge.
- Every model and platform sits behind an adapter interface, so it can be swapped.
- Humans can override any decision, and the override is logged.

## Build order

1. Multiplier and Compliance (week 1): these make the sample videos for sales.
2. Publisher and Client Concierge (weeks 2–3).
3. Remake Producer and Trend Scout (weeks 2–4).
4. Performance Analyst and the learning loop (week 4 and month 2).
