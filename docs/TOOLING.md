# Tooling: MCPs, skills and agents

What is installed, what each is for, and where it was actually used.
`docs/tools/MCP_AND_SKILLS.md` says what we *want*; this file records what we *have*
and what we *did*. Checked with `claude mcp list` at the start of the 2026-11-09 run.

---

## MCP servers

### Connected and used

| Server | For | Used on |
|---|---|---|
| **context7** | Current library docs — the stack moves faster than any model's training data | Tailwind v4 CSS-first config: confirmed `@theme` and `@custom-variant dark (&:where(.dark, .dark *))` are the v4 way, which is why there is no `tailwind.config.ts` (D3) |
| **GitHub** (`github`, and `gh` CLI) | Private repo, branches, CI | `gh repo create mirrorline --private` → github.com/vlad7990/mirrorline; push after each milestone so Actions runs |
| **Vercel** (claude.ai server + `vercel` CLI, logged in as `veltrixcpo-7194`) | Preview deployments only | M6 |
| **Playwright** (`plugin:playwright`) | Screenshots at 1440 and 390, end-to-end demo path | M5 |
| **Stitch** | Reading the design references | M4 website structure |
| **Magic / 21st.dev** | Component starting points for the dense widgets — calendar grid, tables, charts, pricing, forms — restyled to our tokens | M3/M4 |
| **Supabase** | Auth and Postgres from week 3 | Not tonight — no keys in `.env.local`, so auth runs on a mock session |

### Connected, not needed tonight

`exa` (web research), `huggingface` (model licences, week 1+), `canva`,
`google-workspace`, `pinecone`, `webclaw`, `sequential-thinking`,
`claude-mem`, `context-mode`.

### Missing or broken — fallback in use

| Missing | Why it matters | Fallback actually used |
|---|---|---|
| **Figma MCP** | Would give exact layout values | The reference PNGs plus `docs/design/claude-design/source/*.dc.html` and `docs/design/stitch/code/*.html` |
| **Stripe MCP** (needs auth; `stripe` CLI present but not logged in) | Test-mode products for the three tiers | None needed — pricing page is static copy tonight (D10) |
| **n8n / Zapier MCP** | Back-office flows | Out of scope tonight (D10) |
| **Google Stitch `design-md` skill** | Lint DESIGN.md | `npx @google/design.md lint DESIGN.md`, wired as `pnpm design:lint` |
| **21st-ui skill** | Named in MCP_AND_SKILLS.md | Magic MCP covers the same ground |
| **greptile** (HTTP 403), **sentry** (bad content type), **plugin:vercel** and bare **vercel** MCP entries (auth / 404) | — | The claude.ai Vercel server works; the broken duplicates are ignorable config cruft |

---

## Skills

| Skill | For | Used on |
|---|---|---|
| `frontend-design` | Layout, hierarchy, visual polish | Shell and screen reviews |
| `ui-design:design-review` | Reviewing built screens against the reference PNGs and DESIGN.md | After every milestone, by a reviewer who did not build the screen |
| `ui-design:accessibility-audit`, `everything-claude-code:accessibility` | WCAG AA | M5 |
| `ui-ux-pro-max`, `design-taste-frontend` | Website storytelling and anti-template layout | M4 |
| `vercel:nextjs`, `vercel:shadcn`, `vercel:react-best-practices` | App Router and component patterns | M1–M4 |
| `vercel:deploy`, `vercel:deployments-cicd` | Preview deploy | M6 |
| `browse`, `qa` | Driving the running app | M5 |
| `superpowers:verification-before-completion` | Not declaring done without evidence | Every milestone |

## Agents

| Agent | Role in this build |
|---|---|
| `general-purpose` | The parallel builders: mock data, web config + CI, UI primitives, and one per screen group |
| `everything-claude-code:a11y-architect` | WCAG AA audit, M5 |
| `code-reviewer` / `everything-claude-code:typescript-reviewer` | Fresh-eyes code review after each milestone |
| `everything-claude-code:e2e-runner` | Playwright demo path and the 1440/390 screenshot sweep |

---

## Use log

Appended as work happens. Each line: what was asked, which tool, what came back.

- **Session start** · `claude mcp list` → 40 servers enumerated; 7 need auth, 3 failed to
  connect. Full inventory above. Confirmed Figma, Stripe, n8n and Zapier are unavailable
  and recorded their fallbacks.
- **M1 · token system** · `context7` → `/tailwindlabs/tailwindcss.com`, query on v4
  CSS-first config. Returned the `@theme` directive and the `@custom-variant dark` class
  strategy verbatim from the v4 docs. This changed the build: the Stitch export pack's
  `tailwind.config.ts` was discarded in favour of `packages/ui/src/styles/theme.css` (D3).
- **M1 · versions** · `npm view` → pinned next 15.5.29, react 19.2.0, tailwindcss 4.3.5,
  @playwright/test 1.65.0, vitest 5.1.0. Chose Next 15 over the current 16.4 (D2).
- **M1 · repo** · `gh repo create mirrorline --private --source .` → private repo created
  at github.com/vlad7990/mirrorline, `origin` wired.
- **M1 · parallel build** · three `general-purpose` agents dispatched concurrently:
  `packages/mock` (typed fixtures from 08_MOCK_DATA.md), `apps/web` config + CI +
  licence check, and the `packages/ui` component library with a real WCAG contrast test.
