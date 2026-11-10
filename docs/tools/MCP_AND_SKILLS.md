# MCPs, skills and tools for this project

Claude Code: at the start, run `claude mcp list` and check which skills are installed. Use what's available below. If something is missing, use the fallback, and add the item to "Needs Vlad" in `docs/PROGRESS.md`. Never install an MCP server from an unofficial source. Get install commands from the vendor's own docs.

## Design

| Tool | Use it for | Fallback |
|---|---|---|
| `DESIGN.md` (Google format) | Single source for tokens and design rules. Lint it with `npx @google/design.md lint DESIGN.md` | Read `docs/design/design-tokens.json` |
| Google Stitch skills (google-labs-code `stitch-skills`, e.g. `design-md`), if installed | Read DESIGN.md and the Stitch exports consistently | Read `docs/design/stitch/code/*.html` directly |
| Figma MCP, if Vlad exports Stitch screens to Figma | Pull exact layout and variables | Use the PNGs and HTML in `docs/design/` |
| 21st.dev Magic MCP or the `21st-ui` skill, if installed | High-quality React components (tables, calendars, pricing, forms) restyled to our tokens | shadcn/ui |
| `frontend-design` skill, if installed | Visual polish and layout decisions | DESIGN.md "Do's and Don'ts" |
| Accessibility and design-critique skills, if installed | M5 quality pass | axe-core with Playwright |
| Playwright MCP, or the Playwright CLI | Screenshots at 1440px and 390px, end-to-end demo path, comparison with reference PNGs | `pnpm test:e2e` |

## Build, data and deploy

| Tool | Use it for | Rules |
|---|---|---|
| GitHub (`gh` CLI or GitHub MCP) | Private repo, branches, pull requests, Actions | No force-push; don't merge pull requests nobody has approved |
| Vercel MCP or CLI | Preview deployments | **Preview only**, never `--prod` |
| Supabase MCP or CLI | Auth, Postgres schema, storage, row-level security (from week 3; tonight only if keys exist) | Use migrations; no destructive SQL on remote projects |
| Stripe MCP or CLI | Test-mode products and prices for Pilot, Growth and Scale | **Test mode only** |
| Context7 or docs MCPs, if installed | Current docs for Next.js, Supabase, Remotion and Postiz | Vendor docs on the web |

## Automation

| Tool | Use it for | Rules |
|---|---|---|
| n8n (self-hosted via Docker; its API or MCP, if configured) | Back-office workflows: onboarding, report delivery, alerts, CRM | Workflows exported to `automation/n8n/workflows/` and **inactive** by default; clients never build or see workflows (licence condition) |
| Zapier MCP, if connected | Low-volume links to tools without an API | Only when n8n can't do it; mind per-task cost |

## Media and AI (from week 1, not tonight)

| Tool | Use it for | Licence |
|---|---|---|
| Claude API | Hooks, scripts, captions, clip selection, reports | Commercial API |
| ffmpeg, WhisperX, ClipsAI | Transcribe, find moments, cut, reframe to 9:16 | LGPL/GPL builds of ffmpeg run as a separate binary; ClipsAI MIT; check the WhisperX licence |
| Remotion | Brand templates and captions | Free up to 3 employees, then a company licence |
| Wan 2.2 (via ComfyUI) or a paid video API | Labelled AI B-roll | Apache-2.0 |
| FLUX.1 schnell | Images | Apache-2.0. **Never FLUX.1 dev** |
| Kokoro-82M or ElevenLabs | Voice; a clone only with consent | Apache-2.0 / commercial |
| Postiz (self-hosted, unmodified) | Publishing through official APIs | AGPL-3.0: separate service only |
| Hugging Face MCP, if installed | Look up models and their licences | n/a |

## Not allowed

- Browser or phone automation for posting.
- Unofficial Instagram or TikTok APIs (including HikerAPI).
- Proxies, app clones, scrapers of other creators' content.
- Any tool whose licence forbids commercial use.
