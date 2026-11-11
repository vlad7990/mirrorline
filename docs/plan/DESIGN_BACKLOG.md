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

**Higgsfield has 0 credits** on a free plan (`vbreygin@gmail.com`). A 9:16
image costs 6.5; the seven frames planned need about 46. The CLI is installed
and authenticated. Nothing can be generated until the account is funded. This
is the single highest-value unblock and it is not something an agent can do.

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

## What the next session should do, in order

1. **`gh search` first.** Non-negotiable per the project's own workflow, and
   skipped every time so far.
2. **Fix the cut wall.** This is the named complaint. With credits, generate
   9:16 stills or short loops and label them. Without credits, say plainly
   that it is blocked rather than shipping another coloured block.
3. **Real motion.** The repo has no animation library. `animation-timeline:
   view()` covers reveals with no dependency, but anything richer wants Motion
   (`motion/react`). Adding it is a licence-check item (MIT, fine) and a
   DECISIONS entry.
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
