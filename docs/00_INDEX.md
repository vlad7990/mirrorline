# Index of project files

| Path | What it is | Read when |
|---|---|---|
| `docs/PROGRESS.md` | **Start here.** Morning handoff: preview link, how to run it, what's done, what's stubbed, "Needs Vlad", next 5 tasks | First thing each morning |
| `docs/DECISIONS.md` | Every choice made without asking, with the reason and the source that settled it | When something looks surprising |
| `docs/TOOLING.md` | Which MCPs, skills and agents exist, what each is for, and what each actually produced | Before reaching for a tool |
| `docs/RESEARCH_BRIEF.md` | **v4 Step 0.** What the v4 specs say, in plain words: who we serve, P1–P10, the story, the metrics, the agents, the reuse list, the spec conflicts and the open questions | Before any v4 work |
| `docs/screens-built/` | Playwright screenshots of every route at 1440 and 390, light and dark | Comparing the build with the references |
| `docs/screens-built/before-v4/` | The frozen "before" set, captured 2026-11-13 at commit `2959de5`, for the v4 before/after pairs. Do not overwrite — `SCREENSHOT_OUT_DIR` is what redirects a sweep here | Reporting what v4 changed |
| `CLAUDE.md` | Project memory: what, why, stack, rules | Every session |
| `KICKOFF_PROMPT.md` | Overnight milestones and definition of done | Start of the overnight run |
| `DESIGN.md` | Design system (Google DESIGN.md format, lint-clean) | Before any UI work |
| `docs/plan/30_DAY_PLAN.md` | Plan, prices, timeline, gates, agent order | Planning and PROGRESS updates |
| `docs/specs/09_SERVICES.md` | **The services and the plans. The one place a price is written down.** Two inputs, seven agents, Niche Scan, approvals, posting, Originality Gate, KPIs, ledger, Repost Watch, plain billing | Any page that describes or prices the service |
| `docs/specs/10_SALES_FOCUS.md` | Our own outreach, by account type and goal. Why there is no industry focus and no industry page | Outreach; checking copy for industry-exclusive wording |
| `docs/specs/11_MARKET_RESEARCH.md` | P1–P10, the evidence, how platforms rank in 2026, why we are not a farm | Problem copy; `/compare` |
| `docs/specs/12_NICHE_PLAYBOOK.md` | The Niche Scan: allowed and banned sources, what we record, internal starting recipes | Trend Scout; the Niche Scan screens |
| `docs/specs/13_PERSONA_ALIGNMENT.md` | The four account types and the seven goals — the only segmentation we use | Pickers; onboarding; "best for" |
| `docs/specs/14_STORY_AND_FUNNEL.md` | The eight story beats, the funnel and the events we track | Page structure; `/admin/funnel` |
| `docs/specs/15_METRICS_AND_KPIS.md` | Goals → KPIs cascade, seven KPI tiers, the seven Results tabs, the honesty rules | Anything with a number in it |
| `docs/specs/16_SITE_MAP_AND_GAPS.md` | The 19-section home order, every route marked New or Update, and the app-screen gaps | The build order for v4 |
| `docs/specs/01_PRODUCT_BRIEF.md` | Product, customers, problems, rules. **Superseded on audience and prices by 09/11/13/16 (D38)** | Copy and features |
| `docs/specs/02_BRAND_AND_VOICE.md` | Voice and microcopy. **Stale on colour and type — DESIGN.md wins (D38)** | Writing UI text |
| `docs/specs/03_SCREENS_SPEC.md` | Every screen's purpose, layout and states | Building screens |
| `docs/specs/04_AGENTS_SPEC.md` | The seven agents | Agents screen; engine |
| `docs/specs/07_CLAUDE_CODE_HANDOFF.md` | Stack, data model, drive-reuse rules, first issues | Architecture |
| `docs/specs/08_MOCK_DATA.md` | All demo data | `packages/mock` |
| `docs/design/claude-design/screens/` | Approved mockup PNGs | Visual reference |
| `docs/design/claude-design/source/` | Mockup source with interactions (.dc.html) | Behaviour reference |
| `docs/design/stitch/screens/`, `code/` | Stitch PNGs and HTML (Tailwind) | Polish reference |
| `docs/design/STITCH_REVIEW.md` | Stitch content that must not ship | Marketing and auth pages |
| `docs/design/design-tokens.json`, `.css` | Tokens as data | Theme generation |
| `docs/tools/MCP_AND_SKILLS.md` | Which MCPs and skills to use, with fallbacks | Before using tools |
| `docs/automation/N8N_AND_ZAPIER.md` | Automation plan | M7 and week 1+ |
| `docs/specs/05_*`, `06_*` | Prompts used for Claude Design and Stitch | History only |
| `docs/design/stitch/claude_code_export_pack.md` | Stitch's own Next.js notes and route map | Optional; CLAUDE.md wins on conflicts |
