# V5 slice 2 — animated brand templates (intro and outro)

Plan only: nothing here is built. Slice 1 is PR #44; this is what `§2.2` of
`docs/plan/V5_VIDEO_PIPELINE_PLAN.md` deferred — "slice 2 is animated brand
templates, and Vlad buys the Company Licence then".

Three things turned up while checking that sentence, and each one changes the
plan rather than decorating it. They are first because two of them are money
and one of them is retention.

---

## 0. Three findings, before the design

### 0.1 You may already be eligible for Remotion's Free Licence — at $0

Read off `LICENSE.md` in the Remotion repository today, not from memory:

> You are eligible to use Remotion for free if you are: an individual; **a
> for-profit organization with up to 3 employees**; a non-profit or
> not-for-profit organization; evaluating whether Remotion is a good fit…

and the grant is explicitly commercial — "to use the software non-commercially
**or commercially** for the purpose of creating videos and images".

So if Mirrorline is a for-profit entity with **three employees or fewer**, the
Company Licence is not required and slice 2 costs nothing in licence fees. You
said you would buy it; **you may not need to yet**, and a purchase made before
the threshold buys prioritised support rather than permission.

**What the Company Licence costs when it applies** (remotion.dev/license,
today):

| Tier | Price | Who it is for |
|---|---|---|
| **Remotion for Automators** | **$0.01 per render, $100/month minimum** (10,000 renders for $100) | Batch rendering and automated video products — **this is us** |
| Remotion for Creators | $25/month per seat | Low-volume manual creation, motion design in Remotion Studio, including with AI agents |
| Enterprise | from $500/month | Custom terms, private support |

Two consequences worth holding on to:

- **$100/month is the largest single line item this stack would have.** Slice
  1's whole infrastructure is ~$1–2/month idle plus ~$0.01–0.02 a video. A
  per-render licence floor is two orders of magnitude above that, so the
  architecture below is deliberately shaped to keep Remotion renders **rare**
  — per brand, not per video.
- **Developers on automation do not need a Creators seat** ("Developers working
  on automation projects do not need a Remotion for Creators seat"), so the
  seat tier only matters if you want Remotion Studio for hand-designing.

**The trigger to write down:** the day Mirrorline is a for-profit company with
a fourth employee, the Automators tier applies and the render telemetry below
becomes mandatory. That is a calendar fact, not an engineering one, and it
belongs in `docs/PROGRESS.md` next to the Stripe and audit items.

### 0.2 Remotion links ffmpeg into its own binary — so it must stay out of the video image

`packages/compositor/Cargo.toml` depends on `ffmpeg-next`, a Rust wrapper that
**statically links the ffmpeg libraries** into Remotion's prebuilt compositor
binary. That is a different posture from the one D150 just chose with care: our
ffmpeg is a pinned LGPL build, unmodified, invoked as a separate process —
never linked, never vendored, which is what keeps it on the right side of
non-negotiable 10 the same way Postiz is.

I cannot tell from the repository whether their compositor is built against a
GPL-configured ffmpeg (x264 enabled, which its default H.264 output hints at)
or an LGPL one. **That is a question for Remotion, not a thing to assume** — and
until it has an answer, putting `@remotion/renderer` in the image that renders
every client video would quietly undo the licence review we just did.

It also has a clean engineering answer, which is §1 below: Remotion renders a
brand's bookends **once**, somewhere else, and the video worker only ever
concatenates finished files with our own ffmpeg. The licence question then
applies to one rarely-run service instead of the hot path, and the answer can
arrive after the design rather than before it.

### 0.3 A pre-roll logo costs watch time — the end card is the part that earns

The brand kit's current strings are honest about the intent:

```
introTemplate: 'Loop mark, 0.6s, warm sand on deep teal'
outroTemplate: '"Book a discovery call" card with the link, 1.5s'
```

A 0.6-second logo sting before the hook is the one thing on a short-form feed
that competes directly with the only moment that matters — the first second
decides whether anybody sees the second. The outro is the opposite: by then the
watch is earned and the card is what converts it.

So my recommendation, which is a product judgement and yours to overrule:

- **Build the outro end card first.** It is where the value is and it carries
  the call to action the script already wrote.
- **Make the intro a brand mark, not a pre-roll** — a small animated mark that
  appears *over* the first seconds of the client's own footage rather than
  before it. Same brand recall, no cost to the hook.
- Keep a true pre-roll intro available as an option, because some formats (a
  series, a podcast clip) genuinely read better with one. It should be a
  choice, not the default.

If you want the pre-roll as the default anyway, say so and it becomes the
default — the templates below cover both shapes either way.

---

## 1. Architecture: bookends are brand assets, not per-video renders

### 1.1 The shape

```
Brand kit changes  ──▶  render-bookends job  ──▶  brand-assets bucket
   (rare)                (Remotion, Chrome)        intro.mov / outro.mov
                                                        │
Per video (often)  ──▶  render-cuts job  ─────────────────┘
                        our pinned LGPL ffmpeg:
                        concat intro + short + outro,
                        per-video text burned by libass
```

**Remotion never enters the `video-worker` image.** It runs in its own place,
on its own cadence, and what reaches the video pipeline is an ordinary video
file.

### 1.2 Why this is the right split, in four ways it pays

| | |
|---|---|
| **Licence** | §0.2's unanswered question applies to one rarely-run service, not to the image that renders every client video. If the answer is "GPL", we can replace or isolate one service instead of unpicking the pipeline. |
| **Cost** | Remotion renders scale with **brands**, not videos. Ten clients who change their brand kit twice a year is ~40 renders a year — inside any tier, and nowhere near the $100/month floor if it ever applies. Per-video Remotion would be one render per short. |
| **Latency** | A render job today is 2–4 minutes dominated by transcription. Adding Chrome start-up plus 90 frames of React to every video adds 30–60 seconds for a bookend that is identical each time. |
| **Image size** | Chrome Headless Shell plus the fourteen shared libraries Remotion's Linux guide lists is ~400 MB on top of the video image's ~1.5 GB, for a capability used once per brand. |

### 1.3 The one thing that must still be per-video, and how it is done without Remotion

An end card wants the **script's own call to action** on it — "Book a discovery
call" is the brand's standing line, but the Call to action beat the agent wrote
for *this* video is better. That is per-video text over a per-brand animation.

**libass does it, and we already ship it.** Slice 1 burns captions from an
`.ass` file with the pinned LGPL ffmpeg; the same file can place a line of
brand-styled text over the outro's frames, with the brand's font and colours
and the same `ass_captions.py` writer. Remotion does the **motion**; libass does
the **words**.

That keeps the per-brand asset genuinely reusable and avoids the trap of
"animated template" quietly meaning "one Remotion render per video".

### 1.4 Where the bookend render runs — three options, with a recommendation

| Option | How | Verdict |
|---|---|---|
| **A. A `render-bookends` job on its own Railway service** *(recommended)* | A third tiny service, `WORKER_KINDS=render-bookends`, built from `Dockerfile.bookends`. Same loop, same heartbeat, same healthcheck. | **Yes.** It is the pattern slice 1 already proved for one environment variable, it keeps Remotion out of both existing images, and it can scale to zero in practice because it runs a handful of times a month. |
| B. A GitHub Actions job that renders and commits the assets | Cheap, no new service, and CI already has Node. | Tempting and wrong: a client's brand kit changing should not require a commit, and committed binaries age badly. Fine as a one-off for *our own* sample brand. |
| C. In the video worker, behind a flag | No new service. | No — §0.2. |

Option A's service is also where `@remotion/licensing`'s `licenseKey` goes:
from Remotion 5.0, usage reporting is **mandatory** for the Automators tier,
and Free-Licence holders declare eligibility with `licenseKey: "free-license"`.
Both are one argument to `renderMedia()`. Two notes that belong in the code
rather than in a PR description: the report is an outbound call to Remotion per
render, so **a failed report must never fail the render**, and the eligibility
string is a claim about the company — it changes the day §0.1's trigger fires.

---

## 2. The templates

Three compositions, parameterised from the brand kit. Not a design system —
three shapes that cover what a client actually needs, each one a React
component in `packages/remotion/`.

| Template | Length | What it is |
|---|---|---|
| `brand-mark` | 1.2s, overlaid | The logo mark drawing itself in the brand's accent, bottom-left, over the client's own first seconds. The recommended default (§0.3). |
| `intro-sting` | 0.6s, pre-roll | The brand kit's current description, built as written, for whoever wants it. |
| `end-card` | 1.5–2.5s | The mark, the business name, and a line of call-to-action text — the per-video line from §1.3, or the brand's standing one. |

**Parameters** come from the brand kit the engine already validates
(`brand.py`): the colours, `headingFont`, `logoLabel`, and the caption style.
Nothing new is invented and nothing is hard-coded per client.

**Type is Geist**, which ships in the repo and is **OFL-1.1** — already on the
licence allow-list (D18), already subset by `scripts/subset-fonts.mjs`. The
bookends therefore match the studio rather than approximating it, which is the
whole argument for doing this in React at all.

**Motion follows `DESIGN.md`**, which has the tokens: `--ease-out`
`cubic-bezier(0.23, 1, 0.32, 1)` for entrances, `--duration-modal` 280ms as the
longest UI move, and the standing rule that "everything collapses under reduced
motion". A rendered video cannot read a user's motion preference, which is
exactly why these are **short and single-move**: one entrance, one hold, no
loops, nothing that strobes.

**No music.** Not a nicety — a stock track is a licence with a holder, and
non-negotiable 1's discipline about other people's material applies to audio
exactly as it does to footage. The bookends are silent and the client's own
audio runs under them where they overlay.

### 2.1 Where the parameters live, and the honest answer for slice 2

`brandKit.introTemplate` is a **sentence** today — `'Loop mark, 0.6s, warm sand
on deep teal'` — in `packages/mock/src/data.ts`, and there is **no brand-kit
table at all**: S9 is a mock screen. Turning a sentence into a render needs a
template id and parameters.

Slice 2 should **not** build the brand-kit table and screen. That is its own
piece of work with its own migration and design review, and bundling it would
make this slice unreviewable. Instead:

- The template choice and parameters are derived in code from the existing
  brand kit, one per brand, the same way `brandForRender()` already derives a
  `brand.json` from `@mirrorline/mock` plus the client's real rights record and
  real business name.
- The display strings on S9 stay as they are, and the plan records that they
  are **descriptions of what gets rendered**, not inputs to it, until the brand
  kit becomes a table.

That is the same "mock brand kit, real rights record" line `ENGINE_WIRING.md`
drew and slice 1 kept.

---

## 3. Data model — one additive migration, one new table

```
brand_bookends                     -- one rendered bookend per brand per kind
  id, workspace_id
  kind         ('brand-mark' | 'intro-sting' | 'end-card')
  template_id  text                -- which composition rendered it
  params       jsonb               -- what it was rendered with, for reproducibility
  storage_path text                -- brand-assets/<workspace_id>/<id>.mov
  duration_s, width, height
  status       ('rendering' | 'ready' | 'failed')
  error text, rendered_at, created_at
  unique (workspace_id, kind)      -- the current bookend; a re-render replaces it
```

and one column on the row slice 1 already writes:

```
renders.bookends jsonb not null default '{}'::jsonb
  -- { "introId": <uuid>, "outroId": <uuid>, "ctaText": "Book a discovery call" }
```

Three decisions inside that:

- **`segments` is not touched, and that is deliberate.** `apps/web/lib/video/segment.ts`
  is the module the AI-GENERATION session imports; adding a third `kind` to
  that union would change a shared contract for something that is not script
  content. A bookend is brand furniture: it has no beat, no coverage and no
  transcript. `renders.bookends` records which ones were used so a short can be
  explained later, and the seam stays exactly as the other session found it.
- **A transparent-capable intermediate** (`.mov`, ProRes 4444 or PNG sequence)
  rather than H.264, because `brand-mark` overlays the client's footage and
  needs an alpha channel. H.264 has none. The final encode is still one pass of
  our own ffmpeg.
- **`unique (workspace_id, kind)`** so a brand has one current bookend per kind
  and a re-render is an upsert — the same shape `transcripts.asset_id` uses, and
  for the same reason: the expensive thing should be idempotent.

A third private bucket, `brand-assets`, with the same posture as the other two:
no `storage.objects` policy, service-role writes, signed URLs for reads.

---

## 4. Keeping Remotion where it belongs — a scope gate

Non-negotiable 10 already has a precedent for a dependency that is allowed in
one part of the product and nowhere else: **GSAP**, admitted by D33 and *scoped*
by D41, enforced by `scripts/gsap-scope.mjs` which fails the licence check if an
import appears outside the marketing scopes.

Remotion needs the same treatment, for a stronger reason — its licence is not
OSI-permissive at all, and an import in the wrong package would change what we
ship:

```
Allowed:   packages/remotion/**            the compositions
           services/bookends/**            the service that renders them
Denied:    apps/web/**                     the studio and the site
           packages/ui/**                  the design system
           services/worker/**              the video worker (§0.2)
```

Implemented as `scripts/remotion-scope.mjs`, a sibling of the GSAP gate, wired
into `pnpm licence-check` as a fourth check beside the ffmpeg pin from D150.
And the licence allow-list is **not** widened: Remotion's `NOASSERTION` must
keep failing for every package that is not named in this exception, with the
exception recording the tier we hold and the date it was checked.

**The agent skills** (`everything-claude-code:remotion-video-creation`) arrive
with the licence and not before, for the same reason: a skill that installs
Remotion into whatever directory it is pointed at would buy the decision by
accident. When they do arrive, they are for `packages/remotion/` only.

---

## 5. Worker and infrastructure impact

| | |
|---|---|
| **New service** | `bookends-worker`, `Dockerfile.bookends`, `WORKER_KINDS=render-bookends`, healthcheck `/healthz`, replica limit 1 vCPU / 2 GB. |
| **Image size** | node:24-slim (~250 MB) + Chrome Headless Shell and Remotion's fourteen Linux libraries (~400 MB) + the compositions (~5 MB) ≈ **700 MB**. Half the video image, and it carries no Python, no ffmpeg and no model. |
| **glibc** | Chrome Headless Shell needs **glibc ≥ 2.35**. `node:24-slim` is Debian bookworm (2.36) ✓ — worth asserting in the build, because the failure mode is a browser that will not start. |
| **Chrome** | Bake it with `ensureBrowser()` at build time, for the same reason the Whisper weights are baked: a container that downloads 150 MB before it can answer `/healthz` fails its deploy whenever the CDN is slow (D125, D128). |
| **Render time** | A 1.5s end card at 1080×1920/30fps is 45 frames: single-digit seconds on 1 vCPU, plus ~2s of Chrome start-up. |
| **Cost per brand** | Compute is cents. The licence is $0 under the Free Licence, or $0.01 per render under Automators — call it **$0.02–0.04 per brand per year** at two re-renders. |
| **Cost per video** | **$0.** The video worker concatenates two cached files; the extra encode is already in slice 1's single pass. |

---

## 6. Compliance, and one new thing for the gate to look at

The end card carries **words** — a call to action, a business name, sometimes a
price. That is the first text in this pipeline that is neither the client's own
speech nor a caption of it, so it has to go through the same gate:

- `check_banned_phrases` must see `ctaText`. "Guaranteed results" on an end card
  is exactly what non-negotiable 7 forbids, and it would otherwise reach a
  platform without passing a rule that already exists.
- The **AI-label rule is unaffected**: a template is ours, animated from the
  brand kit, with nothing generated. `ai_scenes` stays empty unless the
  generation session's clips are in the short itself.
- A bookend rendered from the **sample** brand kit is sample data, and anywhere
  it is shown publicly it says so (non-negotiable 7, and the rule
  `ENGINE_WIRING.md` already applies to the mock brand kit).

---

## 7. Tests

| Level | What |
|---|---|
| **Composition** | `renderStill()` at three keyframes per template, asserted on **dimensions, alpha presence and the brand's accent being the dominant non-transparent colour**. Not a pixel hash — a snapshot that breaks when a font falls back is a test nobody trusts. |
| **Parameters** | Pure unit tests on the brand-kit → params function: the accent chosen, the label truncated at a sane length, a missing colour falling back rather than throwing. |
| **The seam** | `ffmpeg` concat of intro + short + outro asserted on total duration, 1080×1920 and audio continuity, against clips generated in the test run (non-negotiable 1, as ever). |
| **The gate** | `remotion-scope.mjs` has its own test, exactly as `gsap-scope.test.mjs` does: an import in `apps/web` fails, an import in `packages/remotion` passes. |
| **CI cost** | The composition tests need Chrome, so they run **only when `packages/remotion/**` or the bookends service changes** — the `changes` job already does this kind of gating for `pipeline` and `e2e`. |

---

## 8. The thin first slice of slice 2 — demoable in a day

**The demo sentence:** *the same short, now ending on the client's own end card
with the call to action their script wrote.*

1. `packages/remotion/` with **one** composition: `end-card`. No intro, no brand
   mark.
2. The params function, from the brand kit, with unit tests.
3. `brand_bookends` + `renders.bookends` + the `brand-assets` bucket — one
   additive migration, label-gated, which is again the only thing that waits
   for you.
4. `render-bookends` handler and the `bookends-worker` image, rendering to
   ProRes with alpha.
5. The video worker concatenates `short + end-card`, with the CTA line burned by
   libass over the card.
6. `remotion-scope.mjs` and its test, wired into `pnpm licence-check`.
7. Screenshots and a measured timing table; the demo note in `PROGRESS.md`.

**Deliberately not in it:** the brand-mark overlay and the intro sting
(templates two and three), the brand-kit table and S9 wiring, music, per-video
Remotion renders, and Remotion Studio.

---

## 9. What I need from you

| # | Question | Why it cannot be chosen from the specs |
|---|---|---|
| 1 | **Is Mirrorline a for-profit entity with three employees or fewer?** | It decides whether slice 2 needs a licence at all (§0.1). If yes: no purchase, and the code declares `licenseKey: "free-license"`. If no: the Automators tier at $100/month minimum, and I wire the usage reporting. |
| 2 | **End card first, with the intro as an overlaid brand mark — or the pre-roll as the brand kit describes it?** | §0.3 is a product judgement about retention, not a technical constraint. My recommendation is the end card plus an overlay; the pre-roll stays available. |
| 3 | **Ask Remotion which ffmpeg their compositor links** (LGPL or GPL), or accept the isolation as sufficient? | §0.2. The architecture is safe either way, but the answer decides whether a Remotion binary may ever sit in an image we also ship ffmpeg in. |
| 4 | **A third Railway service (`bookends-worker`)**, ~700 MB, a few renders a month | Creating services and the bill are yours. It is the recommendation in §1.4. |
| 5 | **The `migrate-production` label** on the migration, when it comes | Non-negotiable 11, as ever. |

Not on this list: whether to use Remotion at all. You decided that, and the
honest note is that an end card *could* be done with ffmpeg and a PNG for
nothing — what Remotion buys is real motion design, in React, matching the
studio's own type and tokens, which is the difference between a card and a
brand. Worth knowing what the alternative costs so the choice stays yours.
