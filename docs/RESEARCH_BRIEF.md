# Research brief — what I understood before building v4

Written at Step 0 of `docs/prompts/MASTER_PROMPT_v4.md`, from CLAUDE.md,
`docs/specs/01–08` and `11–16`, DESIGN.md, DECISIONS.md, PROGRESS.md and
`docs/plan/DESIGN_BACKLOG.md`. Everything below is in my own words; where a
spec and the repo disagree I say so rather than smoothing it over.

## 1. Who we serve

**Everyone.** Any business or individual, in any industry, with a new or an
existing account. This is the single biggest change in v4 and it contradicts
most of what is written in the older specs — see §9.

The only segmentation anywhere on the site is a 2×2 and a goal:

- **Who:** a business, or an individual
- **Account:** starting new, or growing an existing one
- **Goal:** leads, bookings, sales, audience growth, awareness, community, or
  launching an account

Industry is asked for exactly once, in onboarding, in the user's own free text,
and only so Trend Scout can research it. It never appears as a navigation item,
a landing page, a filter or a plan. Four account types (13 §1) carry the
default plan, input mix and posts per week; the goal (15 §2) carries the KPI
set. Neither is an industry.

Not served: political, gambling, crypto, adult, anyone under 18. Regulated
niches — health, finance, legal, real estate — are served, with a rule pack
switched on automatically and shown to the user.

## 2. P1–P10 and our answer to each

From `11_MARKET_RESEARCH.md` §2. The evidence is directional and stays in
docs; the public site paraphrases the complaint and names only *categories*
("clipping tools", "agencies", "repost pages"), never a competitor brand.

| # | The complaint | Our answer |
|---|---|---|
| P1 | Tools make clips but don't grow the account; price is unrelated to result | We publish daily to the client's own accounts and report outcomes in the Results Ledger. Plans priced per posts delivered. |
| P2 | A large share of AI clips are unusable and miss the point | Quality Gate: a reviewed shortlist. Scores learn from the client's own results, not a generic "virality" number. |
| P3 | Billing traps — per-minute credits, charges after cancelling, files deleted | Plain billing: flat monthly, cancel in one click, no credits, the client keeps and can export every file forever. |
| P4 | Jobs stall or fail; support is slow | A retrying job queue with alerts to us, and the status visible on the Agents screen. A human fixes it before the client notices. |
| P5 | Broken reframes, mistimed captions in other languages | Compliance checks face framing and caption timing; multilingual caption review is in the pipeline. |
| P6 | "It didn't sound like us" — generic AI content | Voice and Facts profile: tone sliders, words to use and avoid, real offers and FAQs. Every script must cite at least one real business fact. |
| P7 | Agencies: long contracts, setup fees, vanity metrics, no link to leads | Month-to-month, no setup fee, Pilot as the paid trial. Reports show leads, bookings and sales per post. |
| P8 | The posting treadmill burns people out | The agents post several times a day; the client spends ~15 minutes a week approving. One upload becomes a month of posts. |
| P9 | Reposts and recycled content now lose reach | The Originality Gate blocks anything too close to a source. Remakes copy the **format** only: new script, new footage, the client's own voice. |
| P10 | Their own videos get stolen, and small creators can't get platform protection | Repost Watch: we crosspost originals so they are eligible, and a checklist shows them how to enrol. We never file claims for them. |

**What changed in 2026** (the reason any of this is urgent): platforms stopped
recommending accounts that mostly post unoriginal material, and the ranking
signals moved to watch time, sends and saves rather than likes. The cheap
shortcut got punished. That is the gap the product sits in.

## 3. The story and the funnel

**The story** (14 §1) is one spine reused on every page, in eight beats: the
client is the hero → the problem they have already lived → the new rule of the
game → we are the guide who studied the complaints → a three-step plan (Scan →
Make → Post & prove) → the promise and the proof format (a Results Ledger row,
labelled an example, never a guarantee) → the stakes, stated calmly → one
clear next step.

Tone rules that follow from it: the visitor's words come first and our product
second; no guarantees, invented testimonials, ratings, client logos or made-up
numbers; sample data is always labelled.

**The funnel** (14 §3) runs: attract (our own accounts, run with Mirrorline) →
recognise (`/businesses`, `/individuals`, `/compare`, `/metrics`) → **lead
magnet: the free Niche Scan** → proof (the scan report) → convert (`/pricing`,
pre-selected by account type) → activate (onboarding) → retain (the weekly
ledger email, which is also where the upgrade prompt lives).

One main button for everyone: **"Get my free Niche Scan"**. The second button
changes by account type — business → Pilot or a call; individual with an
audience → Creator; individual starting out → the Studio waitlist.

Eleven events get tracked (14 §4), through a console adapter in dev, and
surfaced on an internal `/admin/funnel` page with sample data.

## 4. The metrics system

The heart of v4, and it applies to **every** account, not a premium tier.

**The cascade** (15 §1): outcome → objectives → key results → KPIs → weekly
actions. The user picks the outcome in onboarding; the Performance Analyst
proposes objectives and, after a **14-day baseline** plus Niche Scan
benchmarks, proposes key results. The user edits and approves. Targets are
proposals — the UI says "target", never "guaranteed".

**Seven KPI tiers** (15 §3), the same structure for every account: Production,
Content health, Growth, Outcome, Return, Quality and safety, Agent operations.
Every KPI carries a definition, formula, source, refresh time, optional
target, trend and tooltip.

**Scope** (15 §4): metrics are stored per connected social account and per
post; the workspace rolls them up; Scale users with several brands get a
portfolio view. Users can add custom KPIs by hand or by CSV.

**Results becomes seven tabs** (15 §5): Overview, Funnel, Content, Accounts,
Goals and KPIs, Ledger, Agent insights. Studio Home shows the goal progress bar
and the top three KPI cards, plus an alert when a KPI is off track two weeks
running.

**The honesty rules** (15 §8) are the part that must not be softened:
projections are dashed and labelled, demo data says "Sample data", freshness is
shown, platform limits are stated, and a missing source shows **"Not
connected" with a connect button — never a zero**. A zero is a lie about a
number nobody measured.

## 5. The agents, and the metric each one owns

| Agent | Job | Metric it owns (15 §6) |
|---|---|---|
| Trend Scout | Runs the Niche Scan; turns what is growing into format recipes | Benchmarks that seed targets — views per follower, typical hold, length |
| Remake Producer | Makes the client's own version of a proven format | Tags every video with format, hook, length and CTA so results compare |
| Multiplier | Turns one long video into 8–15 genuinely different cuts | Same tagging |
| Compliance | Checks every video, including the Originality Gate | The Quality and safety tier |
| Client Concierge | Approvals, questions, the weekly report | Sends the ledger; collects manual outcomes ("did that lead buy?") |
| Publisher | Posts several times a day via official APIs | The Production tier, and posting times |
| Performance Analyst | Learns and plans | Baseline, targets, KPI calculations, alerts, weekly insights |

The **Niche Scan** (12 §1) is how an industry-agnostic product stays specific.
It reads only legitimate sources — TikTok Creative Center, Meta Ad Library,
YouTube Data API, the client's own insights, and a strategist's manual review
of up to 30 public examples. It stores **links and descriptions only, never
media**. "Best in a niche" is ranked by views per follower and consistency over
30 days, not follower count. Banned outright: scraping, logging into other
accounts, downloading other creators' footage, and the two bulk-collection
scripts from the drives.

## 6. Why we are not a farm

The failed predecessor is our own case study of what not to do, and its numbers
are the argument: ~0.06% click rate from views to link, a median of 5 followers
per account, ~14,027 views per sign-up, and no revenue anywhere in the
evidence. Volume without trust did not pay.

What we do instead, and what the site says: content on the client's **real,
owned** accounts; publishing only through official APIs; the format copied but
never the footage, audio or wording; AI scenes always labelled; the Originality
Gate blocking anything too close to a source and **rewriting rather than
perturbing it to slip under a threshold**; and Repost Watch for when it happens
to them.

Public positioning carries no names and no fear-mongering: *"Reposts and fake
accounts are now penalised. Grow the account you own, with content that's
yours."* The investigation itself stays out of `/about`.

## 7. What we reuse from the drives, and how

Per 07 and non-negotiable 8, nothing from the GenAIUniq drives is in this repo
and nothing may be added until a **written IP assignment exists**. Until then
the reusable pieces are built as **interfaces with stubs**, and the planned
source for each is recorded in `docs/provenance.md`.

- **Reuse:** the rented-GPU job runner, the video-generation calls,
  `expenses.py` cost tracking (which feeds the Agent-operations KPIs), the
  dashboard charts, and the Telegram alerts (which feed the KPI alerts).
- **Reuse in reverse:** `check_uniq.py`'s similarity checks become the
  Originality Gate — the same technique that was used to evade detection, run
  backwards to enforce originality. That inversion is the point.
- **Rebuild cleanly:** the views reader (use official insights APIs), the
  click-log copier (use our own link tracking), the scheduled jobs (use the
  queue).
- **Never reuse:** `uniquify.py`, `camera_mov.py`, `tt_collect.py`,
  `ig_account_dump.py`, account registration and warming, farm control,
  app clones, proxy and email-alias tooling, face-swap and detection-bypass
  workflows, and any key or password file.

## 8. The design is locked

The gold-and-ink public site and the glass-box studio are approved and closed
to change. v4 changes **content, structure, pages, the funnel and the metrics
features** — not the palette, the fonts, the glass-box card style, the tokens
or the shared `@mirrorline/ui` components. New things are composed from
existing tokens and recorded in DECISIONS.md with a screenshot.

Five layout fixes are allowed, and three of the five turn out to be more
complicated than they read. That analysis is in §10.

## 9. Conflicts between the specs (logged in DECISIONS.md as D38)

These are real contradictions, not ambiguities, and v4's own ordering resolves
all of them in the same direction: **the newer, industry-agnostic specs win.**

1. **Who we serve.** CLAUDE.md, `01_PRODUCT_BRIEF.md` and `DESIGN.md`'s
   Overview all say "coaches, consultants and local service businesses".
   `11 §5`, `13` and `16 §1` say everyone, industry-agnostic. **16/13/11 win.**
   CLAUDE.md's opening paragraph and DESIGN.md's Overview describe a product we
   are no longer selling and need a factual correction — which is content, not
   design.
2. **The brand tokens.** `02_BRAND_AND_VOICE.md` still specifies coral
   `#FF5A36` and Inter. The live design is gold `#C8A24A` / `#7A5C0F` and
   Geist. **DESIGN.md wins**; 02 is stale on colour and type, and still correct
   on voice.
3. **Prices.** `01` lists Studio at $49–$149 and no Creator tier. v4 and the
   plan table list Pilot $750, Growth $1,500, Scale $3,000, Creator $499,
   Studio $79. **v4 wins**, and 09_SERVICES.md becomes the price's home.
4. **Home-page order.** `14 §2` lists twelve sections; `16 §3` lists nineteen.
   14 says so itself in its closing note, and **16 wins.**
5. **"Trend board" vs "Niche Scan".** `03` and the built studio call it the
   trend board; 12 and 16 §5 replace it with the Niche Scan. **16 wins.**
6. **DESIGN.md's own Overview** repeats the narrow audience and will be
   corrected as a factual statement only — no token, component or style in that
   file is touched.

## 10. Where Step 2's allowed fixes meet the locked design

Three of the five allowed fixes cannot be done literally without undoing a
decision Vlad made in the last two days. Flagged rather than actioned.

1. **"Shorten the 3,183px loop section."** That section is now D35's *pinned*
   seven-agent sequence: 7 agents × 320px of scroll = 2,240px of pin spacer
   plus the section itself. The height **is** the mechanic. Shortening it means
   fewer pixels per agent or fewer agents on the stage.
2. **"Remove the lone light band."** The only `band-snow` on the home page is
   the audience section that D36 rebuilt two days ago, and DESIGN.md's public
   site section calls the ink/ink-alt/snow/white alternation deliberate art
   direction. Removing the single light band makes the page uniformly dark.
3. **"Use the hero heading style for all section headings."** The hero is
   Geist Serif display with a gold gradient on **one accent phrase per
   headline, never two** (DESIGN.md). Applied literally to all fourteen section
   headings that rule breaks fourteen times over.
4. **"Align every section to the hero's left edge"** and **"one spacing
   scale"** are clean — no conflict, and both are already most of the way there
   via `Section` and `SectionHeading`.
5. **Already done:** the untrue "run happens on this machine" line and the fake
   "4 places" limit are **not present anywhere** in `apps/` or `packages/`. A
   banned-phrase CI test (Step 7) is what keeps them gone.

A sixth tension sits in Step 3 rather than Step 2: the home hero is asked to
carry a **Business/Individual × New/Existing picker**, but D34 deliberately
moved every interactive control out of the hero — its one action is an anchor.
Putting a four-way picker back in reopens that decision.

## 11. Open questions

1. **Hero picker placement.** Does the picker go in the hero (reopening D34) or
   in the band directly below it, beside the upload control? My default is
   below, preserving D34, unless Vlad says otherwise.
2. **The loop section.** Keep D35's pin at full length, or cut the scroll per
   agent? These are mutually exclusive.
3. **The lone light band.** Remove it (uniform ink) or add a second light band
   so the alternation reads as a rhythm rather than an outlier?
4. **Studio at $79.** v4's table says $79/mo; `01` said $49–$149; 13 says "$79
   from month 2, waitlist now". Taking $79 as settled.
5. **Pilot is "2 weeks"** in v4's table and "12 videos, scheduling, one report"
   in `01`. Writing 09 with both, since the deliverable matters more than the
   duration.
6. **Stripe test-mode checkout** is specified for Pilot and Creator. No Stripe
   keys are in the repo; this will be built behind an adapter and stubbed, and
   recorded under "Needs Vlad".
7. **Supabase.** Same — migrations get written, but they run against a mock
   adapter unless keys exist in `.env.local`.
8. **`/how-it-works` already has screenshots** in `docs/screens-built/` with no
   route behind them. They are stale artefacts of an earlier site and should be
   treated as such, not as a reference to match.
9. **The weekly "Results Ledger" email** is in the funnel but sends nothing in
   the prototype — no real emails is a non-negotiable. The n8n webhook is a
   stub.
