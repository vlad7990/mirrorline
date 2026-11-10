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
