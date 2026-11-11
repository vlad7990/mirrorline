# Design backlog: the complaint that is still open

Vlad has raised the same objection twice. It is still substantially correct,
and this file exists so the next session starts from that rather than from a
fresh round of self-congratulation.

## The objection, verbatim

> Our site pages do not look modern, we don't have any motions or macro and
> micro animations. Text fonts look as if we are in 2001 and not 2027. Index
> cards look very plain and the site is not catchy at all. How are we planning
> to catch an eye of those who wants us to create reels, grow their accounts
> and other related items with the site like this. You should be using
> Higgsfield MCP to replace empty reel cards with some type of reels

## What is actually done, and what is not

| Asked for | State |
|---|---|
| Reels in the cut cards | **Not done.** The landing page cut wall is still coloured `<div>`s with text. This is the thing named twice and still missing. |
| Macro animation | **Barely.** One scroll reveal (`.reveal`, transform only). No orchestrated entrance, no scroll-telling, no pinning. |
| Micro-interactions | **Barely.** A 3% press dip, a chevron rotation, overlay enter/exit. Nothing that reads as craft. |
| Modern type | **Partly done.** `.text-hero` / `.text-section` are fluid `clamp()` now; before this there was no `clamp()` in the repo at all. The studio keeps a fixed scale deliberately. |
| Cards not plain | **One section done.** The how-it-works agent list is a 2-col grid now. Landing page cards, pricing bodies and trust bodies are untouched. |
| Catchy | **No.** The site is honest and legible. It is not yet memorable. |

## The one hard blocker

**Higgsfield has 0 credits** on the account the CLI is signed in to
(`vbreygin@gmail.com`, free plan). A 9:16 image costs 6.5; the seven frames
planned need about 46.

**Update 2026-11-11:** Vlad has credits, on a different login —
`filmreecon@gmail.com`. That does not unblock it by itself. `higgsfield auth`
is OAuth 2.0 PKCE with a browser redirect and stores its token in
`~/.higgsfield/credentials.json`; there is no API key to hand to an agent, so
the account holder has to run the login:

```
higgsfield auth logout   # drops the unfunded vbreygin token
higgsfield auth login    # sign in as filmreecon@gmail.com in the browser
```

Then `higgsfield account status` should report the funded account. If the
credits sit on a team rather than a personal account, `status` still reads 0
and `higgsfield workspace list` / `workspace set <id>` points the CLI at the
funded workspace.

When funded: `higgsfield generate create gpt_image_2 --prompt "..."
--aspect_ratio 9:16 --wait`, or Seedance 2.0 for actual motion. Generated
footage on a public page **must** carry the AI label (non-negotiable 4) and
stay marked sample data (non-negotiable 7). That is on-brand rather than a
compromise: the product's whole promise is that generated material is
labelled.

## Tools that were asked for and never used

Be honest about this with Vlad rather than quietly skipping them again.

- **GitHub code search.** `docs/.../development-workflow.md` makes this step 0,
  mandatory, before any new implementation: `gh search repos`, `gh search code`
  for existing implementations to adopt or port. It has never been run in any
  session. Do this first for the reel-card and motion work; landing pages with
  strong motion are a solved problem and there is no reason to hand-roll.
- **21st.dev / Magic MCP** (`mcp__magic__*`). Used for dense studio widgets in
  an early session, never for the public site. `mcp__magic__search` and
  `mcp__magic__get_inspiration` are the relevant calls.
- **Stitch MCP** (`mcp__stitch__*`). Used only to read references.
- **ui-ux-pro-max.** Used on the original M4 site, never on the glass-box one.

## Step 1 result: `gh search` has now been run (2026-11-11)

Searched `gh search repos` and `gh search code` for vertical/reel video cards,
hover- and in-view autoplay video grids, scroll-driven landing pages, and
animated React component libraries.

**Reel card: nothing worth adopting.** Every repo-level hit was a toy or a
TikTok clone with no licence. The one genuinely reusable piece of prior art is
the pattern, not a package: an `IntersectionObserver` that plays a `muted`
`playsInline` `loop` video when the tile enters the viewport and pauses it when
it leaves, with `poster` as the pre-load frame. That is ~40 lines against the
existing `VideoThumb`. Hand-rolling is the correct call here, and this line
exists so it is a recorded finding rather than a skipped step.

**Motion: adopt `motion`.** npm `motion@14.12.0`, **MIT**, 35.1k stars
(`motiondivision/motion`) — the maintained successor to `framer-motion`, same
API, `motion/react` entry point. MIT clears non-negotiable 10. This closes the
"no animation library in the repo" gap and is the dependency for anything
richer than a one-shot reveal. Needs a `docs/DECISIONS.md` entry.

**Smooth scroll: `lenis` is available if wanted.** npm `lenis@1.3.27`, **MIT**,
17.2k stars. Not adopted yet — it overrides global scroll behaviour and is an
accessibility risk. Only pull it in if a specific section needs it.

**Rejected: GSAP.** Its licence is not on the non-negotiable-10 allowlist.

**Also noted:** `magicuidesign/magicui` (23.2k) is copy-paste components rather
than a dependency; usable as reference for individual effects, not as a base.

## What the next session should do, in order

1. ~~**`gh search` first.**~~ **Done 2026-11-11** — see the section above.
   Conclusion: hand-roll the reel card, adopt `motion` (MIT) for motion work.
2. **Fix the cut wall.** This is the named complaint. **Half done 2026-11-11:**
   the plumbing is in and tested — `VideoThumb` takes a `media` slot,
   `ReelMedia` plays a file while it is in view, and
   `apps/web/components/marketing/reel-assets.ts` is the manifest that says
   which cuts have footage. The manifest is empty, so the page is visually
   unchanged and nothing claims to be a reel. **Still blocked on credits** for
   the other half: generate 9:16 stills or loops, drop them in
   `public/reels/`, add one manifest line each. Do not fill the manifest with
   anything that is not a real generated file.
3. **Real motion.** Still open. `motion@14.12.0` is MIT and cleared (D19), and
   is the right choice when it is needed; it is deliberately **not** installed
   yet, because nothing imports it. `animation-timeline: view()` in
   `packages/ui/src/styles/theme.css` already covers reveals with no
   dependency. Do not bolt motion onto the coloured blocks — that is the
   anti-pattern below. Motion work lands on real footage.
4. **The remaining bodies.** Landing page cards, pricing, trust, and the lower
   half of how-it-works are all still the original flat stacks.

## What not to repeat

- Do not run another *review* skill and call it design work. `emil-design-eng`
  and `impeccable` find defects; they do not make anything distinctive. Both
  have already been run and their findings are in `docs/TOOLING.md`.
- Do not file a finding and move on. `impeccable` flagged "colored blocks
  where a hero photo belongs" and it was recorded as an accepted trade-off
  instead of fixed. That is how this complaint reached a second round.
- Do not claim the site is modern because the type scale changed. Measure it
  against the objection above.
