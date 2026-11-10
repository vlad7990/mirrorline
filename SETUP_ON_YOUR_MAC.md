# Setup for Vlad (10 minutes, before you sleep)

1. **Put the folder in place:** move this `mirrorline` folder to `~/Projects/mirrorline`. Avoid Downloads, Desktop or iCloud-synced folders, so syncing doesn't fight the build.
2. **Make it a git repo:**
   ```bash
   cd ~/Projects/mirrorline
   git init && git add -A && git commit -m "Project kit: specs, designs, plan"
   ```
   Optional: `gh repo create mirrorline --private --source . --push`
3. **Check tools:** Node 20+, pnpm (`npm i -g pnpm`), Docker Desktop (for n8n), and the Vercel CLI logged in (`vercel login`). The GitHub CLI should be logged in (`gh auth login`).
4. **Optional keys:** copy `.env.example` to `.env.local` and add Supabase and Stripe **test** keys. Blank keys are fine; the prototype runs on mock data.
5. **Check MCPs and skills:** start `claude` in the folder and run `/mcp`. Connect what you have: Vercel, Supabase, Stripe (test), GitHub, Playwright, Figma, 21st.dev, n8n and Zapier if needed. See `docs/tools/MCP_AND_SKILLS.md`.
6. **Keep the Mac awake and start in auto mode:**
   ```bash
   cd ~/Projects/mirrorline
   caffeinate -dimsu claude --permission-mode auto
   ```
   Then paste the prompt from `KICKOFF_PROMPT.md`. Keep the Mac plugged in, with the lid open.
7. **In the morning:** open `docs/PROGRESS.md` for the preview link, what's done, and anything under "Needs Vlad".

**Safety built in:**
- Auto mode checks every action in the background.
- `.claude/settings.json` blocks production deploys, force-pushes, hard resets and live Stripe.
- CLAUDE.md forbids paid API calls, real posting, and adding code from the old drives.
