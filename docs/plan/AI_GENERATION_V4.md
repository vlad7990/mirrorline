# V4 · "Generate with AI" — plan for approval

**Status: approved 25 November 2026, and slice 1 is built.**

Vlad's five decisions and the choices they forced are recorded as **D137** in
`docs/DECISIONS.md`, which supersedes §5 of this document: xAI primary with zero
data retention, Google later and paid-tier only, Runway not at all, $15 a month
and $0.50 a request. §4.2 steps 1–3 and 5 are in `apps/web/lib/generation/`;
steps 4 and 6 wait on an `XAI_API_KEY`. The one question still open is the AUP
reading in §2.5, which is on the lawyer list and blocks billing a client for
generated output rather than blocking the build.

§§1–4 are left as written rather than back-edited, so the plan can still be read
against what was actually built.

Session scope: generators as swappable, labelled adapters behind one interface,
producing B-roll clips and images that the video pipeline can drop into a beat.

Not this session: `lib/niche-scan` and the script agent (SCAN session owns
them — read-only here); cutting, captions and render (VIDEO PIPELINE session
owns those). This plan therefore ends at "a labelled asset with provenance and
a cost, addressed to a beat". Who composes it into a timeline is not ours.

Serves **P4** (originals for accounts with no footage to send), the *"we create"*
half of the two ways in named in `CLAUDE.md`, and the **Tier-2 KPI** of videos
delivered per week — a workspace with nothing to cut currently delivers zero.

---

## 0. What the non-negotiables already decide for us

Four of them are load-bearing here, and they decide more of the design than any
provider comparison does.

1. **Non-negotiable 4 — AI scenes are always labelled.** The label is already
   enforced in two places: `scheduled_posts.has_ai_scenes` is a stored column
   with no `UPDATE` grant to `authenticated` (so a member cannot claim a post
   has no AI scenes when it does), and `components/calendar/post-panel.tsx`
   locks the toggle on when it is true. `ShotSource = 'client-footage' |
   'ai-scene' | 'graphic'` in `components/remake/remake-plans.ts` is the
   vocabulary the studio already renders. **Our adapters produce `ai-scene`
   shots and nothing else.** There is no path by which an adapter's output
   reaches a timeline without that classification, because the classification is
   part of the asset, not a flag somebody sets afterwards.

2. **Non-negotiable 5 — no face-swaps; voice or likeness only with a stored
   consent record.** We hold no consent records today. The honest consequence is
   not "ask for consent later" but **a capability subset enforced in code**: no
   reference images, no voice references, no lip-sync, no first/last-frame
   pinning from a photograph of a person. Those are exactly the features
   `grok-imagine-video-1.5` is sold on, and we deliberately do not use them.
   B-roll is places, objects, hands, textures, abstractions — the shots a
   voice-over plays over. That is also the cheap half of every provider's menu,
   which is a happy coincidence rather than the reason.

3. **Non-negotiable 1 and 2 — client-owned inputs only; remakes copy the format
   only.** A generator takes a *text prompt written by our own script agent from
   our own research* plus the client's brand kit. It never takes a frame, a
   still or an audio clip from somebody else's video. The adapter interface has
   no field for a source frame from a third party, which is the only way to make
   that true rather than aspirational — the same trick
   `20261123020000_jobs.sql` already plays by having no column for a blob.

4. **Non-negotiable 6 — the Compliance agent gates everything, and the
   Originality Gate applies.** A generated asset is a draft input, not a
   shippable thing. It carries its verdicts with it.

And one that bites in a way worth naming up front: **non-negotiable 11** means a
new `jobs.kind` is a migration, and a migration is `migrate-production` — which
is Vlad's label and one of the four things I stop for. §4's first slice is
designed to need no migration at all for exactly that reason.

---

## 1. The adapter interface, and where it plugs in

### 1.1 The shape of the chokepoint

The model to copy is `lib/agents/anthropic-client.ts`, and it is worth being
precise about *what* is copied, because the valuable part is not the file — it is
the assertion. `lib/copilot/server-only.test.ts` asserts that **exactly one**
file imports `@anthropic-ai/sdk` and **exactly one** reads `ANTHROPIC_API_KEY`,
as "exactly one, named" rather than "at most one". That is the check that would
catch a key reaching a browser bundle.

So: **one module per provider holds that provider's key and its HTTP calls, and a
test asserts the count by name.** Not a shared `fetch` wrapper — a shared *type*
and a registry, with the keys isolated per provider so an audit of "what can
leak" is a list of three files rather than a search.

```
apps/web/lib/generation/
  types.ts              no 'server-only' — the shapes both sides import
  registry.ts           name → adapter; the only place a provider is chosen
  spend.ts              media pricing + projection (the media analogue of copilot/spend.ts)
  ledger.ts             writes agent_runs with an explicit usd
  safety.ts             the prompt filters of §3
  providers/
    xai.ts              reads XAI_API_KEY. The only reader.
    canned.ts           no key; returns fixtures. The default when no key exists.
  server-only.test.ts   asserts the key-reader counts, by name
```

`types.ts` carries no `server-only` for the same reason `lib/jobs/types.ts`
carries none: a `'use client'` panel needs `AiAsset` to render the label and the
provenance line, and a type is erased at compile time. Everything that reads an
environment variable sits in `providers/*`, which do import `server-only`.

### 1.2 The request

```ts
/** What a beat needs filling, in words, with no third-party media anywhere in it. */
export interface GenerationRequest {
  readonly workspaceId: string
  /** Which beat this is for: the idea's title and the beat label, for the log and the UI. */
  readonly beat: { readonly ideaTitle: string; readonly label: string }
  /**
   * The prompt, written by the script agent from the client's own profile and
   * our own research. Plain description of a scene — never a sentence lifted
   * from a source example (non-negotiable 2, and `video-idea.ts` already
   * enforces that at the sentence level).
   */
  readonly prompt: string
  /** The client's own look. Colours and type only — never a logo file to redraw. */
  readonly brand: BrandKit
  readonly kind: 'clip' | 'image'
  /** Vertical by default, because every platform we post to is vertical. */
  readonly aspectRatio: '9:16' | '1:1' | '16:9'
  /** Clips only. Bounded in code, not by the provider's maximum. */
  readonly seconds?: number
  readonly resolution: '480p' | '720p' | '1080p'
}
```

`BrandKit` comes from what we already have — `ClientProfile` in
`lib/workspace/client-profile.ts` plus the brand name from D131 — rendered into
prompt text ("muted sage and warm cream, clean sans type"). It is **not** a logo
upload passed to the model to reproduce: a model asked to draw a logo produces a
wrong logo, and a wrong logo on a client's account is worse than none. Logos are
composited by the renderer from the file the client gave us, which is the video
pipeline session's job and is also the only legally clean way to do it.

Note what the request *cannot* express: no `referenceImages`, no `voiceReference`,
no `sourceFrame`, no `lipSync`, no `person`. Non-negotiable 5 is enforced by the
type, not by a code review.

### 1.3 The result

```ts
export type GenerationOutcome =
  | { readonly status: 'ok'; readonly asset: AiAsset }
  /** The provider's moderation, or ours. Not an error — see §3.2. */
  | { readonly status: 'refused'; readonly provenance: Provenance; readonly reason: string; readonly message: string }
  /** The spend cap, before any call was made. Costs nothing, and is logged. */
  | { readonly status: 'capped'; readonly reason: string; readonly message: string }
  | { readonly status: 'failed'; readonly provenance: Provenance; readonly message: string }

export interface AiAsset {
  readonly kind: 'clip' | 'image'
  /** Where the bytes are. A local path in dev, a bucket key once §4's slice 2 lands. */
  readonly location: string
  readonly width: number
  readonly height: number
  readonly seconds: number | null
  /**
   * Always `'ai-scene'`. A literal rather than a parameter, and the one field
   * with no legitimate second value — non-negotiable 4 is not a default.
   */
  readonly source: 'ai-scene'
  /** The sentence the UI and the platform caption both use. */
  readonly label: 'AI-generated'
  readonly provenance: Provenance
  readonly originality: OriginalityVerdict | null
}

export interface Provenance {
  /** 'xai' | 'canned' | … — carried into the UI, like `EngineSummary.adapters`. */
  readonly adapter: string
  /** e.g. 'grok-imagine-video-1.5-lite'. The real model, not an alias. */
  readonly model: string
  readonly requestedAt: string
  /** What it actually cost, in USD, as billed — not as projected. */
  readonly usd: number
  /** The provider's own job id, so a dispute has something to point at. */
  readonly providerRequestId: string | null
  /**
   * Whether the provider says it embedded a watermark or provenance metadata.
   * `null` means it did not say — which must never render as "clean" (§3.3).
   */
  readonly providerWatermark: boolean | null
}
```

`Provenance` on the asset mirrors a decision this codebase already made twice:
`EngineSummary.adapters` carries *which implementation answered* into the UI
because "a run backed by a script sidecar must never read like a run backed by a
model", and `VideoIdea.originality` is `null` for "not checked" because an absent
verdict must never read as a clean one. Same rule, same shape.

### 1.4 The adapter

```ts
export interface GenerationAdapter {
  readonly name: string
  readonly models: { readonly clip: string; readonly image: string }
  /** Is there a key. The adapter answers; the caller decides (as `hasAnthropicKey` does). */
  hasKey(env?: EnvLike): boolean
  /** What this request will cost before it is made, for the cap. */
  projectUsd(request: GenerationRequest): number
  generate(request: GenerationRequest): Promise<GenerationOutcome>
}
```

Three deliberate choices:

- **`projectUsd` is on the adapter, not shared.** Per-second pricing by
  resolution differs per provider by a factor of twelve (xAI Lite 1080p is
  $0.14/s; its own non-Lite 1080p is $0.25/s). One shared formula would be a
  cap that is soft by whichever provider it was not written for. The *decision*
  stays central, in `spend.ts`, which reads `projectUsd` and compares.
- **The adapter never decides whether to call.** `anthropic-client.ts` says this
  about itself — "it does not decide whether to call… this hands out a client and
  answers one question — is there a key" — and the cap is the caller's. Same here.
- **A refusal is a return value, not an exception.** `18 §6` and the whole
  `JobOutcome` design: a working control that is rendered as an error teaches the
  reader to distrust it.

### 1.5 Where it plugs into the queue

The honest answer is **nowhere, in the first slice**, and that is the point.

`jobs.kind` is `check (kind in ('niche-scan', 'render-cuts'))`. A
`generate-assets` kind is a migration, and a migration is Vlad's label. There is
also no storage bucket in the tree at all — `20261123020000_jobs.sql` says so
explicitly and says what the fix is: *"when B5 needs to hold our own rendered
output, that is a storage bucket and its own review, not a column quietly added
here."* That review has not happened.

So the plug-in point arrives in two steps:

- **Slice 1 (no migration).** The generator is called from a server action
  behind a feature flag, writes bytes to a local path, and logs its cost to
  `agent_runs` — which needs no migration because `agent` and `model` are free
  text and `usd` is a `numeric` column already there. Demoable, reversible, and
  it cannot touch production data.
- **Slice 2 (one migration, Vlad's label).** Adds `'generate-assets'` to the
  `jobs.kind` check and a storage bucket with its own RLS review. The worker's
  `handle()` switch gains one `case`; nothing else about `services/worker` changes
  — its own header already anticipates this ("when B5 lands it shells out… and
  nothing in this file's shape changes").

The budget arithmetic is not optional at that point. `JOB_LEASE_SECONDS` is
1200 and `budget.test.ts` asserts the agents' budgets sum to less than it with
margin. A clip generation is a poll-until-done loop against an async provider
endpoint, so it needs a declared wall-clock ceiling in the same test — two
workers generating the same billable clip is precisely the failure
`claim_job`'s `skip locked` exists to prevent, and D136 is the scar tissue from
getting that inequality wrong once already.

---

## 2. Provider shortlist

All figures below are from the provider's own documentation, read 25 November
2026. `x.ai` serves 403 to automated fetches, so the two legal documents are
cited to their canonical URLs and were read via the Internet Archive's snapshots
of those exact URLs (dated inline). `docs.x.ai` was read directly.

Note: xAI now trades as **SpaceX Super Intelligence LLC ("SpaceXSI")** in its own
docs and contracts. Same API, same `api.x.ai` host.

### 2.1 Primary — xAI Grok Imagine

| Field | Detail |
| --- | --- |
| Clip models | `grok-imagine-video-1.5-lite`, `grok-imagine-video-1.5` |
| Lite price/sec | **$0.02** (480p) · **$0.03** (720p) · **$0.14** (1080p, upscaled from 720p) |
| 1.5 price/sec | **$0.08** (480p) · **$0.14** (720p) · **$0.25** (1080p, native) |
| Media input | $0.01 per input image (both clip models) |
| Image model | `grok-imagine-image-2.0`: **$0.04** (1K low) · $0.05 (1.5K low) · $0.06 (2K low) · $0.06 (1K medium) · $0.07 (1.5K medium) · $0.08 (2K medium); $0.01 per input image |
| Older image model | `grok-imagine-image`: **$0.02** per image at 1K or 2K; $0.002 per input image |
| Clip length | **1–15 s**, both models |
| Resolutions | 480p / 720p / 1080p |
| Aspect ratios | 1:1, 16:9, **9:16**, 4:3, 3:4, 3:2, 2:3, 21:9, 5:2 — images take the same set plus 9:19.5 and 9:20 |
| Audio | Generated, including lip-synced speech. **We do not use it** (non-negotiable 5) |
| Shape | Async: `POST /v1/videos/generations` → `request_id` → poll `GET /v1/videos/{id}` until `status: done` |
| Refusal signal | Images expose `respect_moderation` on the response; clips fail with `error.code: invalid_argument`, whose documented causes include "content blocked by moderation" |
| Output ownership | **Customer owns it.** "Customer… owns all right, title, and interest in the Output in perpetuity and, to the fullest extent possible under applicable law, SpaceXSI hereby assigns to Customer all of its right, title, and interest in such Output" |
| Attribution required | None contractually. But: "Customer will not… misrepresent that any Output was human-generated" — which our AI label satisfies by design |
| Service for clients | **Expressly permitted, in a specific shape.** §1.1 grants the right to "use SpaceXSI's APIs to develop integrations between the Services and Customer's own products or services (each, a 'Bundled Service')" and to "distribute or otherwise make the Bundled Service available to Customer's end users". Our studio is a Bundled Service; our clients are End Users. ⚠️ See §2.5 |
| Data retention | All User Content (inputs **and** outputs) "automatically and permanently deleted no later than 30 days after the end of the interaction". A **ZDR-enabled API** option deletes within one hour of inference or on delivery of the response, whichever is earlier, with no logs or backups retained |
| Training | No training on inputs or outputs. De-identified/aggregated data only, and not at all under ZDR |
| Watermark / provenance | The AUP forbids "stripping, altering or circumventing embedded provenance metadata or watermarks", so outputs are asserted to carry some. **The watermarking doc covers text (SynthID Text) and audio only — it says nothing about images or video.** Treat `providerWatermark` as `null` for media, and do not rely on it |
| Output IP indemnity | Effectively **none for our use.** xAI defends IP claims on authorised use of the *Services*, but carves out "Output intentionally or recklessly prompted… to be infringing", and the Customer indemnity covers "Customer's use or distribution of Outputs" |

Sources: [Image & Video overview](https://docs.x.ai/developers/model-capabilities/imagine) ·
[API pricing](https://docs.x.ai/developers/pricing) ·
[Video overview](https://docs.x.ai/developers/model-capabilities/video/overview) ·
[Video generation](https://docs.x.ai/developers/model-capabilities/video/generation) ·
[Image generation](https://docs.x.ai/developers/model-capabilities/images/generation) ·
[Output watermarking](https://docs.x.ai/developers/advanced-api-usage/watermarking) ·
[Terms of Service — Enterprise](https://x.ai/legal/terms-of-service-enterprise) (last updated 27 October 2026; read via the 17 November 2026 snapshot) ·
[Acceptable Use Policy](https://x.ai/legal/acceptable-use-policy) (effective 14 August 2026; read via the 25 November 2026 snapshot)

**Why it goes first.** Lite at 480–720p is $0.02–$0.03/s, which is between four
and seven times cheaper than the next thing on this list, and B-roll under a
voice-over is the one use where 480p is often genuinely enough. 9:16 is native.
Ownership is assigned in writing. Retention has a one-hour option. The AUP's
privacy clauses — no "deceptively impersonating a real person", no "altering a
real person's image or likeness" — read like our non-negotiable 5 written by
somebody else, which is a good sign for a provider we intend to argue in front
of a platform.

### 2.2 Alternative — Google Gemini Developer API

| Field | Detail |
| --- | --- |
| Clip model | `gemini-omni-1.2-flash` — video generation and editing with native audio |
| Clip price/sec | Token-billed at **$12.00 / 1M output tokens**, with Google's own conversion: 5,792 tokens per second of 720p ⇒ **≈$0.07/s**; **$0.023/s** at 360p (1,931 tok/s); **$0.104/s** at 1080p upsampled (8,688 tok/s); $0.209/s at 4K. ~$0.70 for a 10 s clip, ~$1.04 for 15 s |
| Image models | `gemini-nano-banana-2.1`: **$0.0336** per 1K image (1,120 tokens), $0.0504 per 2K, $0.113 per 4K. `gemini-3.1-flash-lite-image`: **$0.0336** per 1K image. Batch halves both |
| Clip length | Up to **15 s** |
| Image resolutions | 1K / 2K / 4K; **9:16** is 768×1376 at 1K, 1536×2752 at 2K |
| Audio | Native, generated. Not used by us |
| Output ownership | "Some of our Services allow you to generate original content. **Google won't claim ownership over that content.**" With the caveat, stated in the same breath, that Google "may generate the same or similar content for others" |
| Attribution required | No fixed credit line. Terms note compliance with law "may require the provision of attribution to your users when returned as part of an API call" |
| Service for clients | Permitted — the terms are written around "making API Clients available to users". Two conditions that matter: **paid services only** for end users in the EEA, Switzerland or the UK, and no using the service to build a competitor to Gemini |
| Data retention | **Paid tier:** Google "doesn't use your prompts… or responses to improve our products"; prompts and responses are logged "for a limited period of time, solely for detecting and preventing violations" of the prohibited-use policy. **Free tier:** content *is* used to improve products and "human reviewers may read, annotate, and process your API input and output" |
| Watermark / provenance | **"All generated images include a SynthID watermark."** Stated plainly in the image-generation docs — the strongest provenance commitment of the three |
| Output IP indemnity | Not offered on the Developer API terms. (Google's generative-AI indemnity attaches to certain Cloud/Vertex products, which is a different contract and a different bill.) |

Sources: [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing) ·
[Image generation](https://ai.google.dev/gemini-api/docs/image-generation) ·
[Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms)

**Why it is the one to keep warm.** It is 2–3× the price of Grok Lite and it is
the only provider that *commits in its docs* to a watermark on every generated
image. If a platform ever asks us to prove a scene was machine-made, SynthID is
an answer and "the AUP forbids stripping the metadata" is not. **The free tier is
unusable for us** — human reviewers reading client inputs is incompatible with
what we tell clients — so this is a paid-tier-only adapter, and the code must
refuse to run it without billing enabled rather than silently fall back.

### 2.3 Alternative — Runway Dev (aggregator)

| Field | Detail |
| --- | --- |
| What it is | One API fronting many third-party models, billed in credits at **$0.01 per credit** |
| Grok Lite, resold | `grok_imagine_1_5_lite`: 2 / 3 / 14 credits per second at 480p / 720p / 1080p ⇒ **$0.02 / $0.03 / $0.14** — identical to xAI direct, plus 1 credit for a start frame |
| Grok 1.5, resold | 10 / 16 / 29 credits/s ⇒ $0.10 / $0.16 / $0.29 — a ~15% markup on direct |
| Cheapest clip | `wan3`: 5 / 10 / 20 credits/s ⇒ **$0.05 / $0.10 / $0.20** at 480p / 720p / 1080p |
| Images | `grok_imagine_image_2` at 4–8 credits (**$0.04–$0.08**), `gemini_2.5_flash` at 5 credits (**$0.05**) flat, plus Seedream, Ideogram, GPT Image 2 and others |
| Model router | Yes — billed at the selected model's rate, and "the response metadata reports the model used and the realized cost in credits" |
| Output ownership | Not an assignment. "Subject to your compliance with the Agreement, the Company does not restrict your commercial use of your Outputs" — permission, not title |
| Data retention / training | 🚨 **"You acknowledge that Inputs and Outputs may be used by the Company to train and improve its AI models"**, together with a "non-exclusive, irrevocable, perpetual, worldwide, royalty-free… sublicensable" licence over inputs and outputs |
| Service for clients | The licence to use the software application is "solely for your own personal or internal business purposes" — which is a thinner permission than xAI's Bundled Service clause |

Sources: [Runway Dev API pricing](https://docs.dev.runwayml.com/guides/pricing/) ·
[Runway Terms of Use](https://runwayml.com/terms-of-use)

**Why it is on the list, and why it does not ship.** Structurally it is the
perfect second adapter — one key, a dozen models, published per-second prices,
and it even resells Grok Lite at cost, so switching to it costs nothing on the
cheap path. But the published terms are the opposite of what we tell clients: a
perpetual sublicensable licence over inputs and outputs, with training
permitted. I could not find separate Runway Dev / API terms at any of the
obvious URLs. **Recommendation: build the adapter (it is ~80 lines once the
interface exists) and leave it dark until Vlad has a separate API agreement in
writing.** It is the hedge against xAI changing its mind, not a day-one path.

### 2.4 Ruled out — OpenAI, for clips

Worth recording because the obvious instinct is to reach for it. **OpenAI's
Videos API, `sora-2`, `sora-2-pro` and all their dated snapshots were shut down
on 24 September 2026, with "no one-to-one replacement"** per OpenAI's own
deprecations table. The `sora` models no longer appear on the pricing page at
all. OpenAI remains a credible *image* provider — `gpt-image-2` and the 2.5/2.6
Flare and Sunburst variants are token-billed at $30/1M image output tokens, with
`gpt-image-1-mini` at $8/1M — but there is no OpenAI clip path to adapt to.

Sources: [Deprecations](https://platform.openai.com/docs/deprecations) ·
[Pricing](https://platform.openai.com/docs/pricing)

Adobe Firefly Services was considered as a fourth — it is the obvious fit for a
project whose whole premise is legal defensibility, since it trains on licensed
content, stamps C2PA Content Credentials, and offers enterprise IP
indemnification. **I could not verify its pricing or video-API availability:
`helpx.adobe.com` and `adobe.com/legal` both serve 403 to automated fetches and
the Firefly Services video endpoints 404 at the documented paths.** Rather than
cite a number I have not read on Adobe's own page, I am leaving it as a research
task for Vlad to settle with an Adobe rep, flagged in §5.

### 2.5 The one legal question I cannot settle myself

xAI's **ToS §1.1** expressly permits building a Bundled Service on the API and
distributing it to End Users. xAI's **AUP** forbids "scraping, harvesting or
**reselling** any Input or Output".

Read together, the sensible reading is: shipping generated scenes *inside* our
product, to a client who pays for the product, is the Bundled Service the ToS
contemplates; selling raw generated clips as a commodity (a stock-footage
marketplace) is the reselling the AUP forbids. We are plainly the first. But
"plainly" is doing a lot of work in a sentence that decides whether our supply
chain is contractually sound, and the two documents are not drafted to resolve
each other.

**This is a lawyer question, not a code question.** It does not block §4's first
slice, which spends a few cents of Vlad's own key behind a flag. It does block
charging a client for output generated this way. Flagged in §5.

---

## 3. Safety

Three layers, in the order they run. The principle is the one `video-idea.ts`
already states: *"A prompt is a request; a check is a rule."* The model is told
the rules **and** the rules are enforced in code, because a prompt is not a gate.

### 3.1 Before the call — the prompt filter

`lib/generation/safety.ts`, pure functions over strings, fully unit-testable with
no network. It rejects a request rather than sanitising it: silently editing a
prompt produces a scene nobody asked for and hides the fact that a rule fired.

Four checks:

1. **Named real people.** Any capitalised multi-word person-shaped token not
   present in the client's own `ClientProfile`, plus a maintained deny-list of
   public figures, plus the obvious patterns ("a celebrity who", "looks like
   [name]", "in the style of [person]", "deepfake", "lookalike"). Rejected.
2. **Brands, logos and trade dress.** A deny-list of major marks plus the
   structural patterns ("logo", "brand name on", "wearing [brand]", "the
   [brand] logo", packaging-shot phrasings). The client's **own** brand name
   and service names pass — they are the one party entitled to appear.
   Everything else is rejected, because a competitor's cup in frame on a
   client's post is their trademark problem and our fault.
3. **Identifiable people at all.** Prompts asking for a recognisable face,
   a talking head, a spokesperson, a person speaking to camera, or any
   lip-sync. Rejected under non-negotiable 5 — we have no consent records, so
   "a generic person" is not a safe harbour, it is an unverifiable claim.
   B-roll of hands, silhouettes, backs of heads and crowds at distance is the
   allowed subset, and it is an *allow*-list in the prompt we send, not a
   deny-list we hope holds.
4. **Our own existing copy rules.** `lib/copy/banned-phrases.ts` and
   `lib/copy/youtube-claims.ts` already exist and already run on client-facing
   text. A generated scene that renders a claim as on-screen text would route
   around them, so the prompt text goes through them too.

The filter also writes the allow-list framing into the provider prompt: scene,
place, object, texture, motion — plus an explicit "no identifiable faces, no
logos, no on-screen text". Cheaper to pass first time than to be refused.

### 3.2 At the call — the provider's own moderation, shown honestly

Both signals are documented and both are handled as **`refused`, not `failed`**:
images via `respect_moderation` on the response, clips via `error.code:
invalid_argument` whose documented causes include content blocked by moderation.

This is the same distinction `JobOutcome` already draws, and it exists for the
same reason `lib/jobs/types.ts` spells out at length: *"a scan the cap refused is
not an error, and rendering it as one would teach the reader to distrust a
control that is working exactly as asked."* A refusal is therefore:

- **not retried.** The answer will not change, and a retry is money spent to be
  told the same thing. (Our own filter refusing costs nothing and is never
  retried either.)
- **named on the screen, with what fired.** The pattern for this is already
  built and already load-bearing: D129 is the decision that a blocked draft
  must reach the database *with its verdict*, because "a blocked draft never
  reached the database, so the studio could render a block perfectly and was
  never given one". `RejectedIdea` carries its reason and its verdict. A
  refused generation does the same: the beat shows "No AI scene — the prompt
  asked for a named person", not an empty slot and not a spinner.
- **counted.** A row in `agent_runs` at `status: 'refused'`, `usd: 0`. The
  schema's own comment is the argument: *"a cap that is working looks identical
  to a feature nobody used"* if refusals leave no row. Same for safety gates.

What the client is told, in our voice and without hedging: the beat is empty, the
reason in one sentence, and the two ways forward — reword it, or film it
themselves (`VideoIdea.footage` already tells them what to shoot). No "something
went wrong". No silent substitution of a different scene, which would be the
worst option available: a client who asked for X and got Y without being told has
been lied to by a product that is supposed to be the honest one.

### 3.3 After the call — the label, the gate, and the provenance

- **The label.** `AiAsset.label` is the literal `'AI-generated'` and
  `AiAsset.source` is the literal `'ai-scene'`. Any composed post containing one
  sets `scheduled_posts.has_ai_scenes = true`, which has no `UPDATE` grant to
  `authenticated` and locks the UI toggle on. The label is in the UI *and* in the
  platform caption — non-negotiable 4 says both.
- **`providerWatermark` is three-valued and the third value is honest.** `true`,
  `false`, or `null` for "the provider did not say". For xAI media that is `null`
  today, since the watermarking doc covers only text and audio. The UI reads "we
  label this ourselves" rather than claiming a watermark we cannot evidence —
  the same rule as `VideoIdea.originality`'s `null`: an absent verdict must never
  read as a clean one.
- **The Originality Gate applies.** It compares *expression*, so for a clip the
  comparable artefact is the prompt and the scene description, not the pixels:
  a scene description lifted from a source example's wording is the failure mode
  the gate is for. `judgeOriginality` takes `ComparisonCorpus[]` and already
  runs over the script; the asset's prompt joins the draft text it screens, and
  the verdict rides on `AiAsset.originality`. Pixel-level similarity to a
  specific source clip is out of scope here and genuinely unsolved — which is
  itself an argument for text-prompt-only generation with no reference images,
  since an adapter that cannot be handed a source frame cannot reproduce one.
- **The Compliance agent still gates scheduling.** Nothing this session produces
  is schedulable. Non-negotiable 6 is unchanged and untouched.

---

## 4. Cost, and the thin first slice

### 4.1 What a typical short costs

Taking the brief's example — two 5-second B-roll clips — and adding the one
cover image a short usually wants:

| Shape | Clips | Images | Per short |
| --- | --- | --- | --- |
| **Default: Lite @ 720p** | 2 × 5 s × $0.03 = **$0.30** | 1 × 1K low $0.04 | **$0.34** |
| Cheapest: Lite @ 480p | 2 × 5 s × $0.02 = $0.20 | 1 × 1K low $0.04 | **$0.24** |
| Lite @ 1080p | 2 × 5 s × $0.14 = $1.40 | $0.04 | $1.44 |
| Grok 1.5 @ 720p | 2 × 5 s × $0.14 = $1.40 | $0.04 | $1.44 |
| Google @ 720p | 2 × 5 s × ≈$0.07 ≈ $0.70 | 1 × 1K $0.0336 | ≈**$0.73** |
| Google @ 360p | 2 × 5 s × $0.023 ≈ $0.23 | $0.0336 | ≈$0.26 |

**720p Lite is the default**, and it is a real decision rather than a shrug.
Instagram and TikTok re-encode hard, these clips sit under captions and a
voice-over for three to five seconds each, and 1080p costs 4.7× for a
difference that does not survive the platform's own transcode. The resolution is
a parameter, so a client who wants 1080p can have it and can see what it costs.

**At $0.34 a short, the posting cadence is the number that matters.** Three
shorts a day is ~$31/month of generation per workspace, which fits inside the
existing `DEFAULT_MONTHLY_CAP_USD` of $20 **only if generation shares the cap
with the scan and the co-pilot — and it does not fit.** So:

- A **separate per-workspace monthly cap for media**, defaulting to **$15**,
  env-overridable as `GENERATION_MONTHLY_CAP_USD`, read through
  `lib/generation/spend.ts`. Fifteen dollars buys ~44 shorts at the default
  shape, which is a fortnight of three-a-day. It is deliberately small, for the
  same reason the co-pilot's is: a ceiling nobody ever reaches is not a ceiling.
- A **per-request ceiling** of **$0.50**, matching `MAX_REQUEST_USD`, which by
  arithmetic forbids a single 15-second 1080p clip ($2.10) outright. A run too
  large to do in one go says so, in the sentence `checkAgentSpend` already uses.
- **Order of operations, non-negotiably: read the month, project, refuse
  *before* calling.** `ledger.ts`'s header is the rule — and so is its other
  rule: a read that fails returns `null`, never `0`, and `null` is a refusal.
  "A database hiccup would reset every workspace's cap to 'plenty of room left',
  which is the one direction a spend guard must never fail in."
- **Every call logged, including refusals and failures**, with the real billed
  cost. Because `usd` is projected *before* and known *after*, and per-second
  billing means the two can differ when a provider returns 4.8 seconds for a
  5-second request, the log records what was billed and the projection is only
  ever used for the decision.

### 4.2 The thin slice, demoable in a day, with no migration

Six steps, in order, each one green before the next:

1. **`types.ts` + `canned.ts` + `registry.ts`.** The interface, a fixture
   adapter, and the selector. Tests only; no key, no network. Canned is the
   default when no key exists — the same pattern as the scan's canned mode, and
   the reason the e2e suite can run at all.
2. **`safety.ts`.** The §3.1 filters, TDD, pure functions. This is the piece I
   want reviewed hardest, because it is the piece that is load-bearing for
   non-negotiable 5 and the only one with no provider to blame.
3. **`spend.ts` + `ledger.ts`.** Media pricing tables, `projectUsd`, the cap
   decision, and an `agent_runs` insert with an **explicit** `usd`.
   `recordRun` in `lib/agents/ledger.ts` derives `usd` from token rates and
   would record a media call as $0.00, so this is a sibling function in a new
   file rather than an edit to a file the SCAN session reads. `monthStartIso`
   and `readMonthUsd` are imported, not reimplemented — "two implementations of
   'what does this cost' is how a cap and an invoice start disagreeing".
4. **`providers/xai.ts`.** The one reader of `XAI_API_KEY`. Submit, poll,
   download, map `respect_moderation` and `invalid_argument` onto `refused`.
   Typed errors, most-specific-first, never matched on message text.
5. **`server-only.test.ts`.** Asserts exactly one file reads `XAI_API_KEY` and
   exactly one imports the provider SDK/client, **by name**, in the same
   "exactly one, named" form `lib/copilot/server-only.test.ts` uses. This is the
   test that keeps the chokepoint a chokepoint after the second provider lands.
6. **The demo.** A dev-only route at `/app/dev/generate` behind
   `GENERATION_ENABLED`, taking a prompt and a beat label, showing: the asset,
   the **AI-generated** badge, the provenance line (adapter, model, cost,
   `providerWatermark: not stated`), and — the part worth showing Vlad — a
   deliberately bad prompt naming a celebrity, refused by our own filter before
   any money was spent, with the reason on the screen and a `refused` row in
   `agent_runs` at $0.00.

**What a user can do at the end of day one:** type a scene description for a beat
and get back a labelled vertical clip with its cost and its provenance on
screen — or, if the prompt asks for a real person or a brand, a refusal that
says which rule fired and costs nothing. Both halves demoed, because a gate you
cannot watch fire is a gate nobody believes in.

Needed from Vlad for step 4 and 6 only: an `XAI_API_KEY` in `.env.local`. Steps
1–3 and 5 are green without one, and the canned adapter means the e2e suite
never needs a key at all.

Est. ~400 lines of implementation plus tests, which fits the one-PR-under-400-lines
rule if steps 1–3 and 5 go in one PR and steps 4 and 6 in a second.

---

## 5. What I need from Vlad

Three of these are the "stop and ask" kind; the rest are logged and I proceed.

1. **Approve or amend this plan.** Phase 1 ends here by instruction.
2. **The legal question in §2.5** — ToS §1.1 permits a Bundled Service; the AUP
   forbids reselling Output. Our reading is that we are the former. A lawyer
   should confirm before a client is billed for generated output. Does not block
   the first slice.
3. **Decide whether to buy ZDR.** xAI's default is 30-day retention of inputs
   and outputs; ZDR is one hour or on-delivery, with no logs. Our data-rights
   card already tells clients what we do with their material, and 30 days of a
   third party holding client-derived prompts is a thing we would have to
   disclose. ZDR is the cleaner story and is an Order Form line item.
4. **`XAI_API_KEY`** in `.env.local` for steps 4 and 6. Preview only.
5. **Confirm the media cap at $15/workspace/month**, or name a different number.
   I will implement $15 as the default and log it if I hear nothing.
6. **Adobe Firefly**, if the licensed-training-data and IP-indemnity story is
   worth a conversation — I could not verify its pricing from Adobe's own pages
   (403s and 404s), so it needs a human with an account or a rep.
7. **Runway Dev API terms**, if we want the hedge. The public terms permit
   training on inputs and outputs; I would not point client material at it
   without something separate in writing.

On approval I will log this as **D137** in `docs/DECISIONS.md` — the adapter
interface, the 720p Lite default, the media cap, the consent-driven capability
subset (no references, no voices, no lip-sync), and the refusal-is-not-failure
rule — and start at §4.2 step 1.
