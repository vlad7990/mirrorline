# Testing slice 1 on preview, with your own phone footage

For Vlad, 25 November 2026. PR **#44**, branch `feat/video-v5-slice-1`,
migration `20261125183653_video_pipeline` **already applied to preview**.

Thirty minutes end to end, most of it waiting for a transcription. **Nothing
here spends model money** unless you choose Route B in step 2 — a render makes
no model calls at all.

---

## 0. Before you start — two installs and one check

Run these in the repo root (`~/Developer/mirrorline/mirrorline-video`).

```sh
# 1. An ffmpeg that can burn subtitles. Yours is 8.1.1 without libass, which is
#    the one thing that stops a render on this machine (D16 recorded it).
brew upgrade ffmpeg

# 2. Prove it worked. This must print a line; empty output means stop and tell me.
ffmpeg -hide_banner -filters | grep ' ass '

# 3. The transcriber. ~250 MB of model on first use, then cached.
cd services/pipeline && uv sync --no-editable --extra transcribe && cd ../..
```

If step 2 prints nothing after the upgrade, **stop and send me the output of
`ffmpeg -hide_banner -version | head -3`**. The render leg now refuses up front
with a sentence rather than failing mid-way, so you will see:

> this ffmpeg has no `ass` filter, so captions cannot be burned…

---

## 1. The preview URL, and signing in

```
https://mirrorline-git-feat-video-v5-slice-1-vn-mn-product-group.vercel.app
```

That is #44's own preview deployment, and it points at the **preview** Supabase
project (`qypakxvxnjmsvxmxiynf`) — the one you just migrated.

- Deployment protection is on, so open it while signed in to Vercel.
- **Account:** sign in with whatever account you already have on *preview*. If
  you have none, use `/sign-up` with an email and a password (not the magic
  link — that sender is rate-limited, D79/D84). Any address works; preview is
  not production.
- **Workspace:** the one your account owns. If sign-up hands you onboarding,
  complete it — the niche and goal are two fields and the scan in step 2 reads
  them.
- Avoid any address starting `e2e+`: the end-to-end suite's teardown deletes
  those accounts, and it would delete yours mid-test.

---

## 2. Get one approved video idea

The upload box only offers ideas you have **approved** — V3's rule, and the
reason is that a render spends CPU on a script the Originality Gate passed.

### Route A — free, 5 minutes, and it answers the open question (do this first)

A keyless scan writes the **sample** report, and the sample's three ideas are
stored as drafts you can approve. It costs nothing.

```sh
# A scan worker with no API key: it saves the sample report instead of calling a model.
set -a; . ./apps/web/.env.local; set +a
ANTHROPIC_API_KEY= WORKER_KINDS=niche-scan pnpm --filter @mirrorline/worker start
```

Then in the browser: **Niche Scan → Run a scan**. It finishes in seconds and
the page shows a sample report with "Your first 3 videos". **Approve one** —
note its four beats; you are about to say them out loud. Stop that worker with
`Ctrl-C`.

> If an idea shows "Needs review" and the Approve button refuses, the sample's
> gate verdict is not `passed` on that one — approve a different one, and if
> none can be approved, use Route B.

**Why this route is interesting rather than a shortcut:** the sample's beats are
*directions* ("Open on the price range, said plainly") rather than lines. The
one thing slice 1 has never been tested against is how well the aligner finds a
beat in footage of somebody saying something adjacent to it — and this is
exactly that case. The worker now logs the coverage per beat, so this run
produces the number.

### Route B — a real scan, ~$2, real beats for your niche

Same thing with the key left in place:

```sh
set -a; . ./apps/web/.env.local; set +a
WORKER_KINDS=niche-scan pnpm --filter @mirrorline/worker start
```

The $20-per-workspace cap and the $2-per-request ceiling are both on and
unchanged; the scan takes four to six minutes. Then approve one of the three
real ideas. Route B is the closer test of the product — the beats are lines a
person would actually say — so it is worth doing **after** Route A works.

---

## 3. Film the footage

Phone, vertical or horizontal, either is fine — it gets cropped to 9:16.

- **Say the four beats, in order**, in your own words. Pause briefly between
  them. Paraphrasing is the point: the aligner scores shared content words, not
  sentences, and testing it against a word-perfect reading would prove nothing.
- **45–60 seconds total** is plenty. Four beats of 5–15 seconds each.
- **Under 50 MB.** Preview's global Storage limit is still the 50 MB default, so
  a bigger file is refused by Supabase and not by us. On iPhone, *Settings →
  Camera → Formats → High Efficiency* gets a minute of 1080p into ~25 MB. If
  you would rather raise the limit: *Storage → Settings → Global file size
  limit → 5 GB* (Pro allows up to 500 GB), and then any phone clip is fine.
- Speak clearly and avoid a noisy room: everything downstream reads the
  transcript, and `small`-model Whisper on a windy street is a bad test of the
  aligner.
- **.mov and .mp4 both work.** HEVC is fine — the decoder is native.

---

## 4. Start the video worker against preview

One terminal, left running. This is the process that does the work; **no worker
is deployed against preview**, so nothing happens until this is up.

```sh
cd ~/Developer/mirrorline/mirrorline-video
git checkout feat/video-v5-slice-1 && git pull

# Load preview's credentials from the file the app already uses.
set -a; . ./apps/web/.env.local; set +a

# Check they are loaded (prints yes/yes — never the values).
[ -n "$SUPABASE_URL" ] && echo "url: yes"; [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && echo "key: yes"

# And run it. The render path makes no model calls, so the key is irrelevant here.
WORKER_KINDS=render-cuts pnpm --filter @mirrorline/worker start
```

You should see:

```
[worker] claiming render-cuts
```

Leave it. It polls every few seconds and will pick up the job the moment the
upload finishes.

---

## 5. Upload, and watch both windows

In the browser: **Upload** (`/app/upload`). The panel at the top is the real
one; the sample screen below it is the old mock, unchanged.

1. **Which idea is this footage for?** — the one you approved.
2. **Your video** — the clip.
3. **Who owns this footage?** — your business name.
4. Tick **I own this footage**.
5. **Send it and make the video.**

The progress bar is the upload going **straight to Supabase Storage** — it does
not pass through Vercel. When it reaches 100% the page says *"we are making
your video"*, and the worker terminal starts talking:

```
[worker] claimed render-cuts <uuid>
[worker] beat Hook: 72% of its words
[worker] beat Setup: 64% of its words
[worker] beat Payoff: 58% of its words
[worker] beat Call to action: 81% of its words
[worker] encoded with libx264, font DejaVu Sans (not the brand’s own)
[worker] <uuid> complete in 96s
```

Expect **1–3 minutes** for a 60-second clip: transcription is the slow part, at
roughly a third of the clip's length, plus 10–25 seconds to encode.

Then **reload the Upload page**. The card appears: poster, a player, the beat
count and length, the Compliance verdict, and **Approve**.

---

## 6. What to send me back

Five things, and the first two matter most:

1. **The worker terminal's output** for the render — in particular the four
   `beat … % of its words` lines. That is the measurement slice 1 has never
   had, and it decides whether the 40% floor is right, or whether the script
   agent's prompt should write beats as spoken lines.
2. **The finished video**, or a screen recording of it playing. What I need to
   see is whether the captions land on the words and whether the four cuts
   sound like a sentence rather than four fragments.
3. **A screenshot of the card** — the verdict, the length, the beat count.
4. **Whether the cut is of the right moments** — did it find the beat you meant,
   or a window that happens to share words with it?
5. **Anything that read badly**: a refusal you did not understand, a wait with
   no explanation, a button that looked disabled for no reason.

If it **refused**, that is a result rather than a failure — send me the sentence
it gave you verbatim. "The Payoff beat is not in this footage (best match 18% of
its words)" tells me something precise; "it didn't work" does not.

---

## Troubleshooting, in the order you are likely to meet it

| What you see | What it is | What to do |
|---|---|---|
| Upload refused at ~50 MB | Preview's global Storage limit is still the 50 MB default | Shoot shorter/HEVC, or raise it: Storage → Settings → Global file size limit → 5 GB |
| *"Approve one of your video ideas first"* | No approved draft in this workspace | Step 2 |
| Nothing happens after the upload | The worker is not running, or is running with the wrong kinds | Check the terminal says `claiming render-cuts` |
| *"this ffmpeg has no `ass` filter"* | The upgrade in step 0 did not take | `brew upgrade ffmpeg`, re-check, then tell me |
| *"We could not get the words out of that file"* | faster-whisper is not installed, or the clip has no audio track | `cd services/pipeline && uv sync --no-editable --extra transcribe` |
| *"the Payoff beat is not in this footage"* | The aligner refused rather than guessing | Expected behaviour — send me the sentence; it is the most useful failure here |
| *"We are already making a video for you"* | One render at a time per workspace (`jobs_one_pending_per_kind`) | Wait for the first to finish |
| The card says the link could not be signed | Storage had a bad minute | Reload the page; the URL is re-signed on every render |

One thing that is **not** a bug: the font will say *DejaVu Sans* or similar
rather than the brand's own face, and the encoder will say `libx264` on your Mac
where the container uses `libopenh264`. Both are reported on purpose — the point
is that the summary never implies more than it knows.
