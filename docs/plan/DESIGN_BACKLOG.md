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
| Reels in the cut cards | **Done 2026-11-12.** All twelve cuts carry generated 9:16 footage, and so do the three held-back frames on the agents page, which were the biggest empty blocks on the site. See D28. |
| Macro animation | **Improved 2026-11-12** (D30). The cut wall's entrance was firing on mount, twelve sections below the fold, so it had none — `.log-in` is a mount animation and `.stagger` sets a delay a view timeline ignores. `.reveal-item` staggers by scroll *range* instead, and the wall and audience grid now arrive as a cascade. Scroll-telling and pinning are **done 2026-11-12** (D35): the seven-agent loop pins from lg and advances one agent per scroll step, falling back to the full ladder on narrow screens and under reduced motion. |
| Micro-interactions | **One real one added 2026-11-12** (D31), and it was a defect rather than a flourish: the hero said "Drop a talk, podcast or webinar" and ignored the drop, which also meant the browser navigated away from the page. It accepts a drag now, and the gold ring widens to answer. The rest still stands — a 3% press dip, a chevron rotation, overlay enter/exit. |
| Modern type | **Partly done.** `.text-hero` / `.text-section` are fluid `clamp()` now; before this there was no `clamp()` in the repo at all. The studio keeps a fixed scale deliberately. |
| Cards not plain | **Done 2026-11-12.** Trust is a two-column rule/meaning split (4c09249); pricing was already a row table; the home audience cards are now a sample frame beside their detail (D36). The last flat stack is gone. |
| Catchy | **No.** The site is honest and legible. It is not yet memorable. |

## The one hard blocker — CLEARED 2026-11-12

Vlad ran the login. One wrinkle worth keeping, because it will recur: the CLI
authenticated as `filmreecon@gmail.com` and `account status` still failed with
`workspace_membership_required`, because the funded workspace was not
*selected*. `higgsfield workspace list` showed it (`Private`, starter, 200
credits, SELECTED empty) and `higgsfield workspace set <id>` fixed it. **A
status that reads 0 — or errors — never means "there is no money".**

Spent so far: 32.5 credits on twelve stills plus a reference portrait and one
regeneration, and 7.5 on a test clip. The original estimate below was for
seven frames; twelve cost less than that, because Nano Banana Pro is 2 credits
at 9:16 rather than the 6.5 assumed.

The historical note follows, since the arithmetic is still the reference:

**Higgsfield had 0 credits** on the account the CLI was signed in to
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

~~**Rejected: GSAP.** Its licence is not on the non-negotiable-10 allowlist.~~
**Reversed 2026-11-12 by Vlad (D33).** Still not on the allowlist and still
not an OSI-permissive licence — it is in as a *named* exception pinned to the
package, with the termination and non-compete terms written into the rule. It
is used for two things only, both of which CSS cannot do: splitting a heading
into words (D33) and pinning a section (D35).

**Also noted:** `magicuidesign/magicui` (23.2k) is copy-paste components rather
than a dependency; usable as reference for individual effects, not as a base.

## What the next session should do, in order

1. ~~**`gh search` first.**~~ **Done 2026-11-11** — see the section above.
   Conclusion: hand-roll the reel card, adopt `motion` (MIT) for motion work.
2. ~~**Fix the cut wall.**~~ **Done 2026-11-12** (D28). Twelve generated 9:16
   frames, one per cut, all from a single reference portrait because they are
   twelve cuts of one episode and the room cannot drift between them. The
   media branch lives in `components/marketing/cut-media.tsx` so every surface
   shares it, which is what pulled the agents page's three held-back frames in
   too. Every frame carries the AI label, because `VideoThumb`'s own contract
   requires it whenever AI footage is used and nothing in the mock schedule
   would have triggered it. A test asserts each manifest file exists on disk.
3. **Real motion.** **The reels move, done 2026-11-12** (D29): every cut has a
   five-second silent loop, staggered 1.3s apart so no two tiles play the same
   frame — in lockstep they read as a shop-window video wall rather than
   twelve cuts. Nothing plays under `prefers-reduced-motion`.

   `motion@14.12.0` is still **not** installed, and still MIT and cleared
   (D19) for when something needs it. It was not needed here: the motion that
   answers the complaint is footage, not tweened DOM.
   `animation-timeline: view()` in `packages/ui/src/styles/theme.css` still
   covers the reveals with no dependency. **Interface** motion — orchestrated
   entrances, real micro-interactions — remains open and is where `motion`
   would earn its place.
4. **The remaining bodies.** Partly done 2026-11-12, and the list above was
   partly stale — checked by looking at each page rather than trusting it.
   - **Trust: done.** Seven rules were one stack of full-width cards whose
     text ran to 68ch, leaving the right half of each empty. Two columns from
     lg now, rule left and meaning right.
   - **Agents: done**, and it was the worst case on the site despite not being
     on this list — see item 2.
   - **Pricing: already fine.** The tier table is row-based with per-day
     figures, a highlighted tier and per-tier CTAs; the lower band is a
     two-column checklist. Nothing to do.
   - **Home audience cards: left alone, deliberately.** Four plain cards, but
     they are not interactive, and the obvious "fix" — a hover lift — would
     imply they are clickable when they are not. They need a real idea rather
     than a hover state.

## What not to repeat

- Do not run another *review* skill and call it design work. `emil-design-eng`
  and `impeccable` find defects; they do not make anything distinctive. Both
  have already been run and their findings are in `docs/TOOLING.md`.
- Do not file a finding and move on. `impeccable` flagged "colored blocks
  where a hero photo belongs" and it was recorded as an accepted trade-off
  instead of fixed. That is how this complaint reached a second round.
- Do not claim the site is modern because the type scale changed. Measure it
  against the objection above.
