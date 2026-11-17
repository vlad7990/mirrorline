# Services audit

Every outside service this repo knows about: what it is for, whether it is
connected, and what would happen if a key appeared. Checked against the working
tree on 13 November 2026, at commit `2885279` on `v4/site-and-metrics`.

**Nothing in this repo calls a paid or production service.** That is
non-negotiable 11, and this audit exists so it can be demonstrated rather than
asserted.

## The table

| Service | Used for | State | Key | What happens without it |
|---|---|---|---|---|
| **Supabase** | Leads, and the 15 §7 metrics schema | **Not connected.** Schema written, never applied — no project exists. | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | The lead store writes to `.data/niche-scans.json`, git-ignored. Every studio screen reads sample data regardless. |
| **Stripe** | Plan selection from `/pricing` | **Not connected**, and **test mode only** by construction. | `STRIPE_TEST_SECRET_KEY` | `lib/billing/checkout.ts` returns a stub result. A `sk_live_` key is rejected rather than used — there is a unit test for that. |
| **Vercel** | Hosting | **Connected, previews only.** | Vercel CLI auth, outside the repo | — |
| **Postiz / platform APIs** | Publishing (Instagram, TikTok, YouTube) | **Not connected. No post has ever been made.** No client, no adapter, no call site. | — | Posting is fixtures end to end. |
| **n8n** | Back-office flows | **Not connected.** `N8N_WEBHOOK_URL` is read, and nothing in this repo sets it. | `N8N_WEBHOOK_URL` | `notifyN8n` returns false and the lead is still stored. |
| **Anthropic API** | Agent writing, later | **Not called.** No client, no SDK dependency. | `ANTHROPIC_API_KEY` | The agents are fixtures. |
| **Email** | — | **Nothing sends email.** No provider, no dependency, no call site. | — | The weekly ledger and the scan report are delivered by hand until n8n exists. |
| **Analytics / tracking** | — | **None.** No vendor, no pixel, no third-party script. The eleven funnel events go to a console adapter that makes no network call and sets no cookie. | — | The cookie banner declines non-essential by default and has nothing to decline. |

## How this was checked, so it can be rechecked

```sh
# Every outbound call in the app. Seven, listed below.
grep -rn 'fetch(' --include='*.ts' --include='*.tsx' apps packages | grep -v '\.test\.'

# Every environment variable the code reads.
grep -rhoE 'process\.env\.[A-Z_]+' --include='*.ts' --include='*.tsx' apps packages scripts | sort -u

# Every absolute URL in app code.
grep -rnoE 'https?://[a-zA-Z0-9.-]+' --include='*.ts' --include='*.tsx' apps/web/app apps/web/components apps/web/lib
```

**Seven `fetch` call sites, and five are our own routes:**

| Call site | Target |
|---|---|
| `app/(marketing)/niche-scan/scan-form.tsx:43` | `/api/niche-scan` |
| `app/(marketing)/components/lead-form.tsx:127` | `/api/leads` |
| `lib/engine/use-engine-job.ts:76, 118, 158` | `/api/engine/*` |
| `lib/leads/scan-store.ts:75` | Supabase PostgREST — **only when both keys are set** |
| `lib/leads/scan-store.ts:134` | `N8N_WEBHOOK_URL` — **only when it is set**, and nothing sets it |

**Five environment variables are read:** `NODE_ENV`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_TEST_SECRET_KEY`, `N8N_WEBHOOK_URL`.

**One absolute external URL in app code:** `https://example.com`, in a
placeholder. No CDN, no font host, no script tag, no pixel.

**424 dependencies, every licence on the allow-list** (`pnpm licence-check`).
The only exception is the GSAP family — `gsap` and `@gsap/react` — pinned by
package name and by licence URL in `scripts/licence-check.mjs` on Vlad's
decision (D33, scoped by D41); it widens nothing else. That command now runs a
second gate as well: `scripts/gsap-scope.mjs` fails any GSAP import from
outside the marketing site, and fails ScrollSmoother or Lenis anywhere.

## Three findings

**1 · `.env.example` disagreed with the code on four names. Fixed 13 November.**
The file offered `STRIPE_SECRET_KEY` while `lib/billing/checkout.ts:41` reads
`STRIPE_TEST_SECRET_KEY`; it offered `NEXT_PUBLIC_SUPABASE_URL` where the code
reads `SUPABASE_URL`; and it offered `N8N_BASE_URL` plus `N8N_API_KEY` where
the code reads `N8N_WEBHOOK_URL`. Someone pasting a Stripe key into
`STRIPE_SECRET_KEY` got a silent no-op and would have concluded billing was
broken.

Three names were also removed because nothing read them:
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and
`N8N_API_KEY`. The two `NEXT_PUBLIC_` ones were worse than unused — the only
Supabase access is server-side through the service-role key, which is correct,
so those two invited someone to wire up a browser client this app does not
have.

The file now has three sections — read today, not read yet, and set on the
command line — so it is honest about which keys do anything, and it carries
rename instructions for an existing `.env.local`. Held as a finding for a day
on purpose: renaming a variable while Vlad may already have a populated
`.env.local` was a change to make with him watching, and he authorised it.

**2 · The Stripe key name is load-bearing, and that is deliberate.**
`STRIPE_TEST_SECRET_KEY` rather than `STRIPE_SECRET_KEY` means a live key
cannot be supplied out of habit. `checkout.ts` also rejects a key that does not
start with `sk_test_`, with a unit test holding it. That is the belt and the
braces for non-negotiable 11, and it should stay.

**3 · Nothing here is production-shaped, and the gap is in the keys, not the
code.** Every integration sits behind an adapter that falls back to local data.
That is the right posture for a preview, and it also means **none of these
paths has ever run against the real service.** The Supabase insert, the Stripe
call and the n8n webhook are written and reviewed but unexecuted. Treat the
first run of each as a first run.

## Needs Vlad

- A Supabase project, and `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Nothing
  else unblocks the lead store or the metrics schema.
- A Stripe **test-mode** key as `STRIPE_TEST_SECRET_KEY`. Not a live key, and
  the code will refuse one.
- A decision on finding 1 before anyone sets up a second machine from
  `.env.example`.
