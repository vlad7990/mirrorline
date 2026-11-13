# Sweep report

A pass over the whole working tree for things that should not be in it:
forbidden code, forbidden claims, secrets, and dead weight left by the v4
rebuild. Run on 13 November 2026 against `v4/site-and-metrics`, seven commits
past `fdce06d`.

**Two live problems found, both fixed in this PR. One piece of dead code found
and deliberately left.** Details below, with the commands, so this can be rerun
rather than believed.

---

## 1 · Drive code: none

CLAUDE.md non-negotiable 8 and `docs/provenance.md`.

```sh
grep -rniE 'uniquify|camera_mov|tt_collect|ig_account_dump|imouse|hikerapi|keitaro|bypass ai detection' \
  --include='*.ts' --include='*.tsx' --include='*.py' --include='*.md' .
```

Six hits, **all of them documentation saying these things are banned**:
`docs/specs/12`, `docs/specs/04`, `docs/specs/11`,
`docs/tools/MCP_AND_SKILLS.md`, and one line of marketing copy contrasting us
with what the predecessor did (`components/marketing/home/trust-sections.tsx:45`
— "Uniquifying and metadata spoofing, to slip past detection", in the *them*
column of a table).

**No executable drive code. `docs/provenance.md`'s register is empty and
correct.**

---

## 2 · Secrets: none

```sh
grep -rnE '(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY)' \
  --include='*.ts' --include='*.tsx' --include='*.json' --include='*.sql' --include='*.md' .
```

Zero hits. `.env.local` is git-ignored and was not read for this report. The
only key-shaped strings in the repo are `sk_test_example` and `sk_live_example`
in `lib/leads/niche-scan-lead.test.ts`, which exist to prove the Stripe adapter
rejects a live key.

---

## 3 · Claims: two found, both live, both fixed

This is the section that justifies the sweep.

### Finding 1 — industry wording still live in the privacy policy · **fixed**

`app/(marketing)/legal/privacy/page.tsx:34` read:

> "Mirrorline is an AI content studio **for coaches, consultants and local
> service businesses**."

D38 removed that positioning from the product in PR2 and corrected CLAUDE.md.
It had survived in a legal document — a page nobody rereads, which is exactly
where a superseded claim lives longest. A privacy policy describing a narrower
set of customers than the product serves is wrong in the direction that is
hardest to notice and most awkward to explain.

Now reads "for any business or individual, in any industry, with a new or an
existing account."

### Finding 2 — "going viral" in the site description · **fixed**

`app/layout.tsx:29`, the `metadata.description` every search result and link
preview shows, read "the formats **going viral** in its niche". Descriptive of
what the Niche Scan finds rather than a promise about the reader's account —
and in a one-line snippet, read quickly, it is the promise. Replaced with "the
formats growing fastest in its niche", which is what we actually measure (views
per follower over 30 days, 12 §1).

### Everything else came back clean

| Checked for | Result |
|---|---|
| Guarantees of results | 19 hits, **every one a negation or an explanation** — "we do not guarantee views", "never guarantees", "no guarantees anywhere", plus the acceptable-use page listing guarantees as a thing we refuse to make for clients |
| "10x", "#1", "best in the world" | None |
| Competitor brand names in shipped copy | None. Three mentions of `repurpose.io` and one each of OpusClip and Vizard exist, **all in code comments** explaining a pricing-presentation or interaction decision — stripped before matching, and never rendered |
| "run happens on this machine" | One live instance, `components/upload/engine-live.tsx:81`. **Not a finding:** that component renders only after `/api/engine/status` confirms the engine is present, which is only ever a local checkout. The sentence is true everywhere it is visible |
| Fake testimonials, ratings, certifications, SOC-2 | None |

**All of the above is now a test.** `apps/web/lib/copy/banned-phrases.test.ts`
sweeps every `.ts` and `.tsx` under `apps/web/{app,components,lib}` and
`packages/*/src` on every `pnpm test`. It strips comments first, matches the
claim rather than the word so negations survive, and carries three allowlisted
files each with its reason written out. A further test fails if an exemption
stops being needed — which it immediately did, catching an entry I had added
for the changelog that turned out not to match anything.

---

## 4 · Dead code: one file, now removed

`components/results/report-button.tsx` had no call sites. It opened a toast
saying the weekly-report PDF was not ready; the Ledger tab has a real CSV
download and a real print-to-PDF, so the stub was superseded and contradicted
the shipped behaviour.

It sat here as a finding for a day because CLAUDE.md's working rules say
"never delete files you did not create", which made the deletion Vlad's to
make. **He authorised it on 13 November and it is gone**, along with the
comment in `ledger-export.tsx` that pointed at it — a comment naming a deleted
file is the next person's wild goose chase.

`components/results/funnel-card.tsx` was checked for the same reason and is
**not** dead — it is still the four-stage funnel used elsewhere.

---

## 5 · Counts

| | |
|---|---|
| Routes with a page | 42 |
| TypeScript files in `apps/web` | 251 |
| Unit tests | 371, all passing |
| End-to-end tests | 215 passing, 1 known-flaky (the theme no-flash dev-server artefact documented in `e2e/theme.spec.ts`) |
| Dependencies | 423, every licence on the allow-list |
| Serious or critical axe violations | 0, across every route in light and dark |

---

## Needs Vlad

- **Nothing blocking.** Both findings are fixed and both are now covered by a
  test.
- `git rm apps/web/components/results/report-button.tsx` when you are happy to
  lose it — see §4.
- The `.env.example` naming drift in `SERVICES_AUDIT.md` §Findings 1, which is
  the one item in either audit touching a file you may already have a populated
  copy of.
