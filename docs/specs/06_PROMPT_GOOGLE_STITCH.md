# 06 · Prompts for Google Stitch

Stitch works best one screen per prompt. Paste the **style preamble** first, then one screen prompt at a time, in order. After each screen, ask Stitch to keep the same style for the next one. Export to Figma or HTML when done and pass the exports to Claude Code.

## Style preamble (paste first)

> Web app called Mirrorline, an AI content studio for coaches and local businesses. Desktop 1440px, light theme. Background #FAFAF7, cards white with a #E6E4DD border and 12px radius. Text #14171C, secondary #5F6672. Primary buttons #C8401C with white text; brighter coral #FF5A36 only for accents. Status colours: green #1F9D6B, amber #C98A12, red #D23F3F, blue #2F6FDE. Font Inter, headings Inter Tight 600. Left sidebar 240px: Home, Create, Calendar, Results, Agents, Brand kit, Settings. Calm editorial style, lots of white space, vertical 9:16 video thumbnails as the hero. No gradients, no robots, no sparkles. Fictional people only.

## Screen prompts

**S1 Onboarding.** A 3-step onboarding wizard, showing step 1 "Your brand": logo upload, 4 auto-suggested colour swatches, font picker, three tone sliders (Formal–Casual, Calm–Energetic, Expert–Friendly), and a live preview of a vertical video caption in the chosen style. Step indicator at the top, "Continue" button.

**S2 Home.** Dashboard for "Maya Torres Coaching". Four metric tiles with sparklines: Posts this week 21, Views 48.3K, Link clicks 214, Calls booked 6. A "Needs you" panel with 3 cuts to approve and 1 blocked. A "Today" timeline of 6 scheduled posts across Instagram, TikTok and YouTube with times and status chips. A live agent activity feed on the right. A card at the bottom: "This week's winner: question hooks, 2.1× average views."

**S3 Upload and multiply.** Left: a drag-and-drop upload zone showing "Episode 47: Why good managers burn out (52 min)" and progress steps Transcribing, Finding moments, Cutting, Captioning, Compliance check, all done. Right: a grid of 12 vertical video cards with captions, each with a hook line, length, format tag, strength score and a green, amber or red compliance badge. Summary: "12 cuts ready · 9 passed · 3 need your eye."

**S4 Trend board.** A grid of 8 trend cards. Each shows a format name, for example "The 3-word reframe", its source niche, growth "+340% this week", an abstract 4-frame storyboard of labelled beats (Hook, Problem, Reframe, Call to action) drawn as simple frames, a fit score, and an accent button "Remake for my brand". Filters at the top: My niche / Nearby niches / All, platform, 24h / 7d. Info banner: "We remake the format, never the footage."

**S5 Remake studio.** Three columns. Left: format recipe with beats and timings. Middle: a new script in the brand voice and a shot list mixing "Client footage" and "AI scene" items with small AI labels. Right: a vertical video preview and 3 alternative hooks. Bottom: a compliance checklist, all ticked green (no original footage, no original audio, new wording 12% similar, AI scenes labelled, no real likeness), status "Passed". Buttons "Approve and make 5 variants", "Edit", "Discard".

**S6 Calendar and approvals.** A week calendar with days as columns and Instagram, TikTok and YouTube as rows. Each cell has 2–3 small post chips with time, thumbnail and status colour. A right drawer shows the selected post's preview, caption, link and an AI label toggle. Top switch: "Approve each post" / "Auto-approve after 24h". Bottom bar: "Approve all 9 for tomorrow".

**S7 Results.** A horizontal funnel: Views 48,300 → Profile visits 1,930 → Link clicks 214 → Leads 31 → Calls booked 6. Below: a top posts table with thumbnail, hook, platform, views, clicks and calls; a "What's working" panel ranking hook types; a posting-time heatmap; and a "Download weekly report" button.

**S8 Agents.** At the top, a simple loop diagram linking 7 agents. Below, 7 agent cards: Trend Scout, Remake Producer, Multiplier, Compliance, Client Concierge, Publisher, Performance Analyst. Each card shows a status pill (Working, Idle, Waiting), last action, items done this week, a monthly spend bar against its cap, and an on/off toggle.

**S9 Brand kit.** Logo, colour palette, fonts, 3 caption style presets with previews, intro and outro templates, voice settings ("My own voice", consent signed 9 Nov 2026), and lists of words to always use and never use.

**S10 Settings and billing.** Connected accounts with status and disconnect buttons, plan card "Growth, $1,500/month, 90 posts", usage meter "63 of 90 posts", invoices list, team members, and a "Data and rights" section.

**M1 Mobile approvals (390px).** A full-screen vertical video preview with caption. Counter "3 to review". Large approve (right) and send back (left) buttons, and reason chips: wrong tone, wrong fact, change the hook.

**M2 Mobile home (390px).** Today's 4 metric tiles, the next 3 scheduled posts, and the "Needs you" items.
