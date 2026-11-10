# 30-day plan (summary for Claude Code)

The full plan lives in Vlad's "30-Day Build Plan: Legal Content Engine" doc. This is the build-relevant summary. Figures are planning estimates, not results.

## Goal

By day 30: a working engine and 3–5 paying brands. $10K–$30K a month in recurring revenue follows once 8–15 clients are on retainers, most likely in days 45–90 after launch. The base case passes $20K a month in month 3 and reaches about $68K by month 6.

## Offer and test prices

| Tier | Price | Includes |
|---|---|---|
| Pilot | $750 for 2 weeks | 12 videos, scheduling, one report |
| Growth | $1,500 a month | 90 posts a month (3 a day), 2 viral remakes a week, 3 platforms, weekly report |
| Scale | $3,000 a month | 180 posts a month (6 a day), daily viral remakes, AI product scenes, A/B hooks, monthly strategy call |
| Studio (self-serve, later) | $49–$149 a month | Same engine; the client approves each post |

Launch niches: coaches and consultants with podcasts or webinars, and local service businesses (med spa, gym, clinic). Product brands come later.

## Timeline

| When | Build | Sell | Gate |
|---|---|---|---|
| Day 0–1 (tonight) | Web app and website prototype with mock data; Vercel preview | Use the prototype in demos | Demo path works end to end |
| Week 1 (days 1–7) | Repo, CI, licence scan. Engine v0: upload → transcribe → clip → captioned 9:16 render. Submit Meta, TikTok and YouTube developer apps on day 1. | 30-name warm list; first 3 free samples | One client video becomes 10 captioned clips with no hand editing |
| Week 2 (days 8–14) | Brand kits as Remotion templates; Claude writes hooks and captions per niche; labelled AI B-roll (Wan 2.2) and stills (FLUX.1 schnell); Compliance v1 | $750 pilots signed; deliver files, clients post them | 3+ pilots signed and accepting first drafts |
| Week 3 (days 15–21) | Client portal on real data (Supabase); Postiz publishing through official APIs where approved; Stripe billing; weekly report | Pilots in delivery | A client approves and schedules a week of posts on their own |
| Week 4 (days 22–30) | Cost caps, retries, monitoring, backups; Trend Scout and Remake Producer; lawyer-reviewed contract and terms | Convert pilots to retainers; outbound 20 a day; two case studies | 3–5 paying clients; engine runs with no manual steps |
| Month 2+ | Performance Analyst learning loop; self-serve Studio; mobile companion app | Partners and white-label | |

## Agent build order

1. Multiplier and Compliance (week 1)
2. Publisher and Client Concierge (weeks 2–3)
3. Remake Producer and Trend Scout (weeks 2–4)
4. Performance Analyst and the learning loop (week 4 and month 2)

## Reuse from the old drives

Not tonight. Reuse begins only after a written IP assignment. Reuse list, never-reuse list and provenance rules: `docs/specs/07_CLAUDE_CODE_HANDOFF.md`. The similarity checks are reused **in reverse**, to block remakes that are too close to their source.

## Automation

n8n, self-hosted, handles back-office flows; Zapier only for low-volume gaps. Video work runs in our own job queue. Details: `docs/automation/N8N_AND_ZAPIER.md`.

## Budget guardrails

- The 30-day build costs about $3,000–$6,500 in total.
- Delivery costs about $40–$120 per client a month.
- Every agent has a monthly spend cap per client.
- No paid API usage during prototype builds.
