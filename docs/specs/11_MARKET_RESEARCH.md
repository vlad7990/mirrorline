# 11 — Market research: the big problems we solve

Status: research pass of 12 Nov 2026. Sources are listed at the end. Reddit could not be read directly by our research tools, so complaint patterns come from Trustpilot, G2, Capterra, review roundups and platform announcements. Treat the figures as directional and re-check them before quoting any on the public site.

## 1. The one-line finding

Every competitor sells one piece of the job: a clip, a caption, a scheduled post, or a monthly batch of generic posts. Nobody owns the result: original content, published every day to the customer's own accounts, measured in leads, bookings and sales. At the same time the platforms have started punishing the cheap shortcut (reposts and farms). That gap is our product.

## 2. Big problems, with evidence → what Mirrorline does

| # | Problem people complain about | Evidence (see sources) | Mirrorline answer (feature) |
|---|---|---|---|
| P1 | Tools make clips but don't grow the account. Cost has nothing to do with results. | Content Rewards: alternatives "clip but never distribute"; every tool charges the same "whether the clip earns 10 views or 10 million". | We publish daily to the client's accounts and report outcomes (Results Ledger). Plans priced per posts delivered, with outcome reporting built in. |
| P2 | Many AI clips are unusable and miss the point. | BIGVU test: about 40% of Opus Clip output discarded. Reddit users (via eesel) say the AI often misses the main point. Users report low-scored clips beating the "winners". | Quality Gate: a human-reviewed shortlist; only clips that pass hook, story and brand checks reach the calendar. Scores learn from the client's own results, not a generic "virality" number. |
| P3 | Billing traps: per-minute credits, charges after cancelling, files deleted. | Opus Clip credits charged per source minute; Trustpilot 2026 ~22% 1-star, citing failures, hidden refunds, post-cancel charges. Submagic: charges after cancellation, projects lost. BlitzCut: "billing is the real risk" across tools. | Plain billing: flat monthly plans, cancel in one click, no credits, client keeps every file forever (export anytime). |
| P4 | Jobs stall or fail; support is slow. | Trustpilot: "lately the system is really slow and so many failed projects" (Mar 2026). | Our job queue retries, alerts us (Telegram alerts reused from the drives), and a human fixes it before the client notices. Status visible in the Agents screen. |
| P5 | Broken reframes and bad captions in other languages. | Content Rewards: multi-speaker reframes cut faces; French caption sync needs a full manual pass. | Compliance and QA agent checks face framing and caption timing; multilingual caption review is part of the pipeline. |
| P6 | "It didn't sound like us." Generic AI content. | Feedbird: the most common complaint from people leaving other services. Several 2026 articles: generic AI content doesn't build trust or convert. | Voice and Facts profile: tone sliders, words to use and avoid, real offers, FAQs, reviews, service area. Every script must cite at least one business fact. |
| P7 | Agencies: long contracts, setup fees, vanity metrics, no link to leads. | Agency red-flag lists: vanity-only reporting, no attribution to leads or revenue, long lock-ins. $99 Social comparison: big agencies charge $2,000–5,000/mo with 6–12 month contracts and setup fees. | Month-to-month, no setup fee (Pilot is the paid trial). Reports show leads, bookings and sales per post, not just views. |
| P8 | The posting treadmill burns people out. | Billion Dollar Boy 2025: 52% of creators have experienced burnout; Patreon: 75% believe platforms punish inconsistent posting. | Posting Agent posts several times a day; the client spends ~15 minutes a week approving. One upload becomes a month of posts. |
| P9 | Reposts and recycled content now lose reach. | Instagram (30 Apr 2026): accounts that mostly post unoriginal content are no longer recommended to non-followers; now covers photos and carousels too. Meta: "material edits" required; watermarks and minor crops don't count. | Originality Gate (check_uniq.py reused in reverse) blocks anything too close to a source. Viral remakes copy the format only: new script, new footage, client's own voice. |
| P10 | Their own videos get stolen by repost pages, and small creators can't get Meta's protection. | Meta Content Protection works only on Reels posted to Facebook or shared there, and is rolling out first to monetised creators; smaller creators are left exposed. | Repost Watch: we crosspost originals to the client's Facebook page so they're eligible, and a checklist shows them how to enrol and act. We never file claims for them. |

## 3. How the platforms rank in 2026 (what "growing" means)

- Instagram's top signals: watch time, likes per reach, and sends per reach (shares in DMs). Mosseri: "sends are one of the biggest signals we use in ranking."
- Shares, saves, watch time and private sends now matter more than passive likes.
- Originality is a ranking signal. Accounts that mostly repost lose non-follower reach.
- Category-specific, local and audience-specific content beats generic content.
- Short-form benchmarks to aim for (third-party, directional): 15–30s Reels ~5.8% engagement; best length 21–34s; 50%+ retention on 15–30s clips. YouTube Shorts views are up sharply in 2026 (Dash Social: Shorts views +109% across industries).

**So our success metric per video is:** 3-second hold, completion rate, sends and saves per reach, profile visits, then link clicks and leads. Likes and raw views are secondary.

## 4. Beating the social media farms (legitimately)

The farm we investigated is our best case study of what not to do. Its own numbers:

| Farm metric (from our investigation) | What it shows | What we do instead |
|---|---|---|
| ~0.06% click rate from views to link | Reach from fake or recycled accounts doesn't convert. | Content on the client's real, owned account, with a clear CTA per post. |
| Median 5 followers per account | Thousands of throwaway accounts, no audience built. | One owned account per platform that compounds. |
| ~14,027 views per sign-up; 3,002 → 359 drop in the funnel | Volume without trust. | Measure leads per 1,000 views; optimise for that. |
| No revenue anywhere in the evidence | The model didn't pay. | Revenue proof in the client's Results Ledger. |
| Uniquifying, camera spoofing, label stripping | Evasion; now detected and penalised by the platforms. | Original or materially transformed content; AI scenes labelled; official APIs only. |

Public positioning (no names of real farms, no fear-mongering): "Reposts and fake accounts are now penalised. Grow the account you own, with content that's yours."

## 5. Who we serve: everyone, industry-agnostic

Mirrorline serves any business or individual, in any industry, with a new or existing account. The problems in section 2 are the same everywhere; only the niche changes, and our agents research the niche for each account (12 §1). Segmentation is by account type and goal only (see 13 and 15).

Not served: political, gambling, crypto, adult, anyone under 18.

## 6. What makes us unique (the proposal)

"We don't sell clips. We run your short-video growth: a niche scan, original content made from your videos or remade from proven formats in your niche, posted every day to your accounts, and a weekly ledger of the leads and sales it brought in. No credits, no contracts, no reposts, no fake accounts."

Seven differentiators, each tied to a problem above:
1. Niche Scan before any content (P6, P2).
2. Two inputs: your footage, or AI-made videos remade from formats that are growing in your niche (P1, P8).
3. Originality Gate (P9).
4. Daily Posting Agent on your own accounts (P1, P8).
5. Results Ledger: leads, bookings, sales (P1, P7).
6. Plain billing, files yours forever (P3).
7. Repost Watch (P10).

## Sources

- Opus Clip complaints and pricing: bigvu.tv (Jul 2026 test), smartremotegigs.com, vantaige.io, eesel.ai, twoaveragegamers.com, contentrewards.com, blitzcutai.com
- Submagic and Vizard: hackceleration.com, vmake.ai, fluxnote.io, capterra.com
- Repurpose.io: blotato.com, trustpilot.com
- Agencies and done-for-you: feedbird.com, upgrowth.in, 99dollarsocial.com/compare, boomp.net
- Generic AI content: cloudcampaign.com, woodlandsonline.com, everything-pr.com, kompozy.io
- Platform enforcement: tubefilter.com (30 Apr 2026), petapixel.com, dataconomy.com, emarketer.com, exchange4media.com, sotrender.com
- Meta Content Protection: engadget.com, routenote.com, broadcastmediaafrica.com, socialmediatoday.com
- Burnout: voxbooster.com (compiling Billion Dollar Boy, Patreon, Creators 4 Mental Health)
- Benchmarks: dashsocial.com (H1 2026 reports), kapwing.com, blog.mean.ceo
- Farm metrics: our GenAIUniq investigation (internal; do not publish names or identifying details)
