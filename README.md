# Mirrorline

A multi-agent short-video growth service for **everyone** — any business or
individual, in any industry, with a new or an existing account. Seven AI agents
turn a client's own long videos, or originals remade from formats growing in
their niche, into original short vertical videos, and post them to the client's
own accounts through official platform APIs.

"Mirrorline" is a placeholder name. Owner: Vlad Breygin.

**This file is how you run the repo.** What the product *is* and what may be
built is in [`CLAUDE.md`](CLAUDE.md) and [`docs/specs/`](docs/specs); every
decision and its reasoning is in [`docs/DECISIONS.md`](docs/DECISIONS.md); the
current state of play is the handoff at the top of
[`docs/PROGRESS.md`](docs/PROGRESS.md).

## Running it

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

### `pnpm dev` cannot spend money. `pnpm dev:live` can.

The co-pilot is the one part of this app that calls a paid API. There are
several ways to reach it, and **all of them are now explicit about which**:

| Command | Co-pilot answers from | Costs money |
|---|---|---|
| `pnpm dev` | the sample fixtures in `lib/copilot/canned.ts` | no |
| `pnpm dev:live` | the real Anthropic API | **yes** |
| `pnpm test:copilot-live` | the real Anthropic API | **yes**, about $0.011 a run |
| `pnpm test:e2e` | the sample fixtures | no |

Both dev commands print which mode they are in before the server starts.

**`pnpm dev` ignores `ANTHROPIC_API_KEY` even when `.env.local` sets one**, and
that is deliberate rather than a limitation. Next loads `.env.local` itself, so
until this existed a routine screenshot run answered from the live model and
spent real money before anyone noticed. The pin is a flag the app honours —
`MIRRORLINE_COPILOT_SAMPLE`, set by `pnpm dev` and read by `copilotMode()` in
`apps/web/lib/copilot/adapter.ts`, where the reasoning is written down.

It is an **opt-out, not an opt-in**: previews and production answer live when a
key is present, which is the intent there. Only `pnpm dev` pins.

### The rest of the commands

| Command | What it does |
|---|---|
| `pnpm build` · `pnpm start` | production build, and serve it |
| `pnpm lint` · `pnpm typecheck` | ESLint; `tsc --noEmit` across the workspace |
| `pnpm test` | Vitest units |
| `pnpm test:e2e` | Playwright, including axe and the screenshot sweep |
| `pnpm screenshots` | just the screenshot project |
| `pnpm licence-check` | dependency licences, and the GSAP scope gate |
| `node scripts/mascot-assets.mjs` | rebuild Milo's WebP assets from the renders |

**All of these must pass before a pull request lands**, plus Lighthouse mobile
≥ 90 on `/product`, `/how-it-works` and `/pricing`.

## Layout

```
apps/web/            Next.js: marketing site at "/", client studio at "/app/*"
packages/ui/         Shared tokens, theme, components
packages/mock/       Typed mock data — no clock, no randomness, so demos are stable
services/pipeline/   Python media workers (engine v0)
automation/n8n/      docker-compose and workflow JSON, inactive by default
docs/                Specs, plan, designs, decisions, progress
```

## Things that will cost you time if you do not know them

- **Mascot art is a build step.** `node scripts/mascot-assets.mjs`. Only
  `greeting` has real art; the other four states use the concept render and are
  marked as placeholders in four places that cannot drift apart. The header of
  that script explains the four transparency approaches that failed — read it
  before trying a fifth.
- **GSAP is allowed on the marketing site only**, and ScrollSmoother and Lenis
  are banned everywhere. Both halves are enforced by `pnpm licence-check`
  (CLAUDE.md non-negotiable 10, D41).
- **Nothing is promoted.** Preview deployments only, Stripe test mode only, no
  real social posting.
- **Sample data is labelled everywhere it appears**, and so is AI-generated
  imagery. These are not style preferences; they are non-negotiables in
  `CLAUDE.md`.

## Open items needing Vlad

Kept in one place, at the end of [`docs/PROGRESS.md`](docs/PROGRESS.md) under
"Needs Vlad" — API audits, spend limits, asset rights and the like. Anything
blocked on him is there rather than scattered through the code.
