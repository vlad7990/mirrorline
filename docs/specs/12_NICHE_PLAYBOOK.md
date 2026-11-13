# 12 — Niche playbook and Niche Scan

The playbook below is our starting hypothesis per niche. It is not proof. For each client, the Niche Scan (section 1) replaces these defaults with what is actually growing in their niche this month, and the client's own results then tune it week by week.

## 1. Niche Scan (onboarding step and weekly job)

**Goal:** find who is growing in the client's niche and *why*, then turn that into format recipes we can remake with new script, new footage and the client's voice.

**Allowed sources (legitimate only):**
- TikTok Creative Center (trending hashtags, songs, top ads by industry)
- Meta Ad Library (what competitors run as ads)
- YouTube Data API search (public Shorts, view counts, publish dates)
- The client's own Instagram, TikTok and YouTube insights via official APIs
- Manual review by our strategist of up to 30 public examples the client or we pick

**Never:** scraping private data, logging into other accounts, downloading or storing other creators' videos or audio, bulk collection tools (tt_collect.py and ig_account_dump.py stay banned).

**What we record per example (stored in `trends`, links only, no media):**
- url, platform, account size bucket, posted date, views, views per follower, growth velocity (views in first 7 days where visible)
- format_name (e.g. "myth vs fact", "day in the life", "3 mistakes"), hook type, length, beats (json), CTA type
- why it works (one sentence), fit_score for this client (0–100)

**Output to the client (S4 Trend board):** 5–10 format recipes ranked by fit_score, each with "why it's growing" and "how we'd make it yours". The client approves which ones we remake.

**Who is "best" in a niche:** rank by views per follower and consistency over 30 days, not raw follower count. A 4k-follower account getting 40k views per video is a better model than a 2M account coasting.

## 2. Starting recipes (internal examples for the agents)

These rows are internal starting points for the Trend Scout, not website pages or target segments. Any industry works: for niches not listed, the Niche Scan builds the recipes from scratch.

| Niche | Formats that tend to work | Hook patterns | Cadence | Main CTA and outcome metric | Rule pack |
|---|---|---|---|---|---|
| Coaches and consultants | Talking-head tips cut from webinars; myth vs fact; client story (with consent); "3 mistakes" | "Stop doing X if you want Y"; contrarian claim; specific number | 2–3/day across platforms | DM keyword or booking link; booked calls | No income or result guarantees |
| Local home services | Before/after; "what this repair should cost"; job-site walk-through; FAQ answered in 20s | Price reveal; "never do this to your…"; visible transformation | 1–2/day | Call or quote form; quote requests | Licences named correctly |
| Clinics, med-spas, dentists | Procedure explained; myth vs fact; team intro; FAQ | Common fear named; "what nobody tells you about…" | 1/day | Booking link; consults booked | Health rule pack: no outcome promises, no before/after without consent and local rules, disclaimers |
| Salons, gyms, studios | Transformation; class snippet; trainer tip; member story (consent) | Visual result in first second; quick challenge | 1–2/day | Trial booking; trials booked | Consent for every person shown |
| Restaurants and food | Close-up dish; "how we make it"; menu item in 15s; staff pick | Sizzle/close-up first frame; price; limited-time | 1–2/day | Order or reservation link; orders | Allergen claims checked |
| E-commerce and retail | Demo; problem → product; unboxing; UGC-style review (real customers, consent) | Problem in first second; "I didn't expect…" | 2–3/day | Product link; sales | No fake reviews or testimonials |
| Real estate | Listing tour in 30s; "what $X buys in [area]"; market update | Price + place; surprising feature | 1/day | Lead form; showings booked | Fair-housing wording check |
| B2B and SaaS founders | Founder opinion; product in 20s; customer problem; behind the build | Contrarian take; specific metric | 1/day (LinkedIn + Shorts) | Demo booking; demos | No unverified customer logos |
| Existing creators | Clips from long-form; series; reply-to-comment videos | Cliffhanger; series number; direct question | 2–4/day | Follows, saves, sends; follower growth | Keep their own style |
| New accounts | 3 repeatable series; daily face-to-camera; niche FAQ | Simple promise per series | 1–2/day | Follows per 1,000 views | Coaching on consistency, not volume |

## 3. Turning a winning format into the client's video (Format Remix)

1. Take the recipe's beats (hook → setup → payoff → CTA), never its footage or audio.
2. Write a new script from the client's Voice and Facts profile (at least one real business fact per script).
3. Make the visuals from the client's footage, or AI scenes (labelled), or both.
4. Use the client's voice (consent on file) or captions-only.
5. Originality Gate: compare against the source example and the client's last 60 posts. Block if visual, audio or script similarity is above threshold. Blocked items are rewritten, never perturbed to slip under the threshold.

## 4. What we measure per niche (feeds the Results Ledger)

- Content health: 3-second hold, completion rate, sends and saves per reach
- Account growth: follows per 1,000 views, profile visits
- Business outcome: the niche's main metric from the table above, tracked through our own links, DM keywords and booking integrations

Weekly, the Strategist agent re-ranks formats per client by business outcome, not views.
