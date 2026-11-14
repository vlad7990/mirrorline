# 18 — The co-pilot: "Ask Mirrorline" in the studio, "Ask about Mirrorline" on the site

Two assistants, one rule each. The studio one **explains the account and
proposes changes it is not allowed to make**. The website one **answers only
from our own published pages and refuses everything else**. They share an
adapter, a spend cap and a labelling rule, and almost nothing else.

Written at the start of PR C, from the brief in the 14 Nov plan.

---

## 0. The model IDs in the brief are wrong, and this is the correction

The plan named `claude-sonnet-5-5` and `claude-haiku-5-5`. **Neither exists.**
A request to either returns `404 not_found_error`, so this would have been
found at the first real call rather than at review.

| Brief said | Real ID | Notes |
|---|---|---|
| `claude-sonnet-5-5` | **`claude-sonnet-5`** | IDs in this family carry no second version digit and never a date suffix. |
| `claude-haiku-5-5` | **`claude-haiku-4-5`** | **There is no Haiku 5.** Haiku 4.5 is the current Haiku, and it is the right tier for the website bot. |

The *tiers* Vlad chose are kept: Sonnet for the studio, Haiku for the public
site. Only the strings change. Anything in this spec that names a model names
the real one.

**Four API facts follow from those models and shape the design below.** They
are not trivia — each would be a bug if assumed the old way:

1. **On Sonnet 5, thinking is on by default.** Omitting the `thinking`
   parameter runs adaptive thinking, and `max_tokens` is a hard cap on
   thinking *plus* answer. A `max_tokens` sized for the answer alone truncates
   mid-sentence. §5 sets it deliberately.
2. **`thinking: {type: "enabled", budget_tokens: N}` returns 400 on Sonnet 5.**
   Depth is controlled with `output_config.effort`, not a token budget.
3. **`temperature`, `top_p` and `top_k` are rejected on Sonnet 5.** Tone and
   determinism are prompt concerns here, not sampling ones.
4. **The prompt-cache minimum differs by model**: 1024 tokens on Sonnet 5,
   **4096 on Haiku 4.5**. The website bot's grounding corpus must clear 4096
   tokens or caching silently does nothing — no error, just a bill. §5 and §6
   depend on this.

---

## 1. What each one is for

| | Studio · "Ask Mirrorline" | Website · "Ask about Mirrorline" |
|---|---|---|
| Who | A signed-in client, about their own account | Anyone, about the product |
| Model | `claude-sonnet-5` | `claude-haiku-4-5` |
| Knows | The account's KPIs, alerts, calendar, held posts, plan | `09_SERVICES`, pricing, FAQ — and nothing else |
| May | Explain, draft hooks, **propose** actions | Answer, cite, hand off |
| May never | Execute anything without an approval click | Answer from outside the corpus, or promise a result |
| Entry | Side panel + <kbd>⌘K</kbd> | One small launcher, bottom-right |

---

## 2. The studio co-pilot

### 2.1 What it answers

Four jobs, in the order a client actually asks them:

1. **"What am I looking at?"** — explains a KPI, a trend line, an alert, the
   Originality Gate score.
2. **"Why was this held?"** — the Compliance agent's reason, in plain words,
   with the rule it applied.
3. **"What is next week?"** — reads the plan the Performance Analyst produced
   and says what changes and why.
4. **"Write me a hook."** — drafts, clearly as a draft, for a post that exists.

### 2.2 Answers cite the data they used

**Every factual sentence carries the thing it came from** — a KPI name, a post
id, a date range. Not a footnote: a visible chip the reader can click, which
opens the screen that number lives on.

This is the most important rule in the studio surface. An assistant that says
"your sends are up 18%" with nothing behind it is indistinguishable from one
that invented it, and non-negotiable 7 forbids invented results. If a claim
cannot be tied to a row we hold, the co-pilot says it does not know.

### 2.3 It proposes; the person disposes

The co-pilot may **propose** exactly three actions, and may execute none:

| Proposal | What the client sees | What runs on approval |
|---|---|---|
| Move a post | The calendar's own "Move to…" preview, pre-filled | The PR7 move, as if done by hand |
| Swap a format | The remake it would use instead, side by side | A queued remake |
| Pause an account | Which account, and what stops | The Publisher stops posting there |

A proposal renders as a card with **Approve** and **Dismiss**. Nothing happens
until Approve is pressed. There is no auto-approve, no "always allow", and no
setting that adds one — the same shape as non-negotiable 6's Compliance gate,
and it is deliberate that the co-pilot is trusted no further than the agents.

Implementation note: proposals come back as **structured output**
(`output_config.format` with a JSON schema), not parsed out of prose. A regex
over model text deciding whether to pause someone's account is the version of
this feature that must never ship.

### 2.4 Where it lives

A right-hand side panel, and <kbd>⌘K</kbd> from anywhere in `/app/*`.
<kbd>⌘K</kbd> opens the panel focused on the input; <kbd>Esc</kbd> closes it.
The panel is a focus-trapped dialog on narrow screens and an inline aside from
`xl` up — the split the calendar's post panel already uses, so the studio has
one answer to "where does the detail go".

**Motion:** the panel slides in; the stream types. Both drop under
`prefers-reduced-motion`, where the answer simply appears.

---

## 3. The website co-pilot

### 3.1 Grounded, or silent

It answers **only** from a corpus built out of our own published pages:
`09_SERVICES`, the pricing tiers, and the FAQ. Retrieval over our own content,
then an answer that quotes it. No open-web knowledge, no inference from the
model's training, no "generally, companies like this…".

If the answer is not in the corpus, the reply says so — plus a link to the
Niche Scan or a call. **"I don't know, here is a person" is a success state**,
not a failure, and the tests treat it as one.

### 3.2 The refusals are the product

Four categories, refused explicitly and tested in §8:

| Asked for | Answer |
|---|---|
| A guarantee ("will I get 10k followers?") | No guarantee is given — what we measure instead, and the Results Ledger |
| Invented results ("what did you do for X?") | We have no client results to show yet, and says so plainly |
| A competitor claim ("is X worse?") | We do not discuss named competitors; the categories from `11 §2` instead |
| Anything outside the corpus | Not something it can answer; hands off |

These are non-negotiable 7 restated for a surface that talks back. The banned
phrase list the site already tests against applies to generated text too.

### 3.3 Conditions on the launcher

- **Always labelled AI**, on the launcher and in the panel header. Not a
  disclaimer in a footer.
- **Not shown until the cookie banner is dismissed.** A second floating thing
  over a consent prompt is a dark pattern, and the banner is already `fixed`
  to the bottom.
- **Rate-limited** per IP, and it says so when it trips rather than failing
  silently.
- **No personal data stored.** Questions are not logged with identifiers; the
  transcript lives in the tab and dies with it.

---

## 4. One adapter, and it works with no key

```
apps/web/lib/copilot/
  adapter.ts        the only module that imports @anthropic-ai/sdk
  canned.ts         deterministic replies used when no key is set
  grounding.ts      builds the website corpus from our own content
  spend.ts          the cap, and what it counts
```

**`ANTHROPIC_API_KEY` missing is a supported mode, not an error.** The adapter
returns canned responses, every surface works, every test passes, and the UI
says it is in sample mode. This is the rule the engine already follows, and it
is what lets PR C be built, reviewed and previewed before the key exists — see
"Needs Vlad F".

The adapter is **server-side only**. The key never reaches a browser bundle:
calls go through route handlers under `app/api/copilot/*`, and the SDK import
is confined to `adapter.ts` so a stray client component cannot pull it in. A
unit test asserts no `'use client'` module imports it.

**Streaming is the default.** Both surfaces stream — the studio because the
answers are long, the website because a bot that pauses for four seconds reads
as broken. Non-streaming is also the shape most likely to hit an HTTP timeout
at a useful `max_tokens`.

---

## 5. The request shapes

Written out because the defaults are the trap (§0).

**Studio:**

```ts
client.messages.stream({
  model: 'claude-sonnet-5',
  // Thinking is ON by default on this model and shares this budget with the
  // answer. Sized for both; an answer-sized cap truncates mid-sentence.
  max_tokens: 8_000,
  output_config: { effort: 'medium' },   // depth lives here, never budget_tokens
  system: [{ type: 'text', text: STUDIO_SYSTEM, cache_control: { type: 'ephemeral' } }],
  messages,
})
```

No `temperature`, no `top_p`, no `budget_tokens` — all three are 400s on this
model. Effort starts at `medium` and is tuned against real transcripts; the
brief's jobs are explanation, not deep reasoning, and `medium` is the cheaper
honest default.

**Website:**

```ts
client.messages.stream({
  model: 'claude-haiku-4-5',
  max_tokens: 1_024,                     // answers are short by design
  system: [{ type: 'text', text: SITE_SYSTEM + corpus, cache_control: { type: 'ephemeral' } }],
  messages,
})
```

The corpus goes in the **system** block so it is the cached prefix and the
visitor's question is the only thing that changes. **It must clear 4096 tokens
to cache at all on Haiku 4.5.** `grounding.ts` asserts the corpus size and
fails loudly rather than shipping a bill — and the check is a real token count
via `messages.countTokens`, not a character estimate.

---

## 6. Spend caps and usage

A cap **per workspace**, enforced before the call and recorded after it.

- **Before:** `messages.countTokens` on the assembled request. If the
  projected spend would cross the cap, the call is not made and the surface
  says the cap is reached.
- **After:** read real usage off the response — `input_tokens`,
  `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens` —
  and add it to the workspace's month.
- **Reported** in the Agent operations KPIs beside the seven agents, in the
  words the Agents screen already uses ("spend this month $43 of $180 in
  caps"). The co-pilot is an eighth line there, not a separate dashboard.

`cache_read_input_tokens` is logged on purpose: if it is zero across repeated
questions, the corpus prefix is being invalidated and the bill is several
times what it should be. That is the metric that catches it.

The cap is a **hard stop**, not a warning. "No paid API calls beyond test
mode" (non-negotiable 11) means the ceiling has to actually hold.

---

## 7. Failure, and what each surface says

| Condition | Studio | Website |
|---|---|---|
| No API key | Sample answers, labelled | Sample answers, labelled |
| Cap reached | "This workspace has reached its cap for the month." | Falls back to the handoff |
| `RateLimitError` | Retries once, then says it is busy | Says it is busy; link to a call |
| `APIConnectionError` | Says it could not reach the model | Same |
| Model refuses (`stop_reason: 'refusal'`) | Says so; does not retry the same prompt | Same |

Errors are caught as the SDK's **typed classes**, most-specific first — never
by matching on message text. `stop_reason` is checked before reading
`content`, because a refusal returns HTTP 200 with nothing to read.

---

## 8. Tests

**Grounded answers**
- A question answerable from `09_SERVICES` is answered, and the answer quotes
  the corpus.
- A studio answer about a KPI carries a chip naming that KPI.

**Refusals** — one test per category in §3.2, asserting we do *not* produce
the forbidden shape, plus the existing banned-phrase test run over generated
text.

**No key = canned mode** — with `ANTHROPIC_API_KEY` unset: both surfaces
answer, the sample label is visible, and no network call is attempted.

**Proposals never self-execute** — a proposal renders with Approve/Dismiss,
and the underlying mutation has not run until Approve is pressed.

**Server-side only** — no `'use client'` module imports the adapter.

**Corpus size** — the website corpus clears Haiku 4.5's 4096-token cache
minimum.

---

## 9. Open, and for Vlad

1. **`ANTHROPIC_API_KEY`** — "Needs Vlad F". Not a blocker: canned mode is the
   supported path until it exists.
2. **The tier split is worth a second look.** Sonnet for the studio and Haiku
   for the site was chosen on the reasoning that the public bot only reads our
   own pages. That is sound. If refusal quality on Haiku 4.5 does not hold up
   in §8's tests, the honest fix is to move the website bot to
   `claude-sonnet-5` rather than to loosen the refusals — flagged before the
   PR rather than after.
3. **Retrieval is "our own pages", and that set will grow.** PR F rewrites
   sixteen inner pages. Whoever builds the corpus should read it from the
   content modules rather than copying prose, or the bot will answer from a
   site that no longer exists.
