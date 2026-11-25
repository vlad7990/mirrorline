# Engine v0

One client video becomes 8 to 12 captioned 9:16 cuts, each one checked by the
compliance gate, plus a `summary.json` a salesperson can read.

This is the week-1 line of `docs/plan/30_DAY_PLAN.md`: "upload → transcribe →
clip → captioned 9:16 render", and the success test it sets — "one client video
becomes 10 captioned clips with no hand editing".

## Setup

Needs [uv](https://docs.astral.sh/uv/) and ffmpeg.

```sh
brew install uv ffmpeg          # macOS
uv sync --no-editable --dev     # creates .venv and installs
```

`--no-editable` is not a style preference. This Python ignores `.pth` files
whose names begin with an underscore, and that is exactly what hatchling's
editable wheel writes, so an editable install is not importable. Details and
the way back in `docs/DECISIONS.md` D17. After changing the source, re-run
`uv sync --no-editable` before using the CLI; the tests read `src/` directly
and need no re-sync.

Optional extras, none of them installed by default:

```sh
uv sync --extra transcribe            # faster-whisper
uv sync --extra transcribe-whisperx   # whisperx (licence unverified, see below)
uv sync --extra claude                # the anthropic SDK
```

## Making samples

```sh
uv run --no-editable make-samples episode-47.mp4 brand.json --out samples/
```

Output:

```
samples/cut-01.mp4 … cut-09.mp4   1080x1920, captions burned in
samples/summary.json              hook, format, length, score, compliance per cut
```

`examples/brand.sample.json` is a brand file to copy. It mirrors the Brand kit
screen (S9) and `packages/mock`'s `brandKit`: colours, caption style, the words
to favour, the words to never use, and the rights record.

### Options

| Flag | Default | What it does |
|---|---|---|
| `--out` | `samples/` | Where the cuts go |
| `--cuts` | `12` | How many to aim for; short sources give fewer |
| `--transcriber` | best available | Pin one: `whisperx`, `faster-whisper`, `script-sidecar` |
| `--use-claude` | **off** | Let Claude pick the moments. Spends money |
| `--max-spend-usd` | `0.0` | Hard cap for `--use-claude`; zero refuses |

Exit codes: `0` samples written, `1` nothing could be made, `2` bad input.
A batch where the gate blocks every cut still exits `0` and still writes the
summary — the engine worked, and the answer is in the file.

## Cutting an approved script (V5)

`make-samples` answers "what is worth cutting out of this video". The V5 pair
answers a different question — "where in this video did they say the four beats
of a script they already approved" — and the worker drives both from a
container.

```sh
# The words, once. Stored by the worker in `transcripts`, so a second cut of
# the same upload never pays for this again.
uv run --no-editable transcribe-source episode-47.mp4 > words.json

# The short. `plan.json` carries the source, the four beats, the words and the
# brand kit; see `pipeline.short.read_plan` for the shape.
uv run --no-editable render-short plan.json
```

Output, beside the plan:

```
out/short.mp4      1080x1920, captions burned in by libass
out/poster.jpg     one frame, a second in
out/captions.ass   the subtitle file, readable when a line looks wrong
out/summary.json   segments with their coverage, compliance, encoder, font
```

Exit codes: `0` a short was written, `1` nothing could be made — **and
`summary.json` says why in words**, which is the sentence the client is shown —
`2` the plan was wrong, which is our bug rather than their footage.

Three things worth knowing before reading the code:

* **It refuses rather than approximating.** `beats.py` scores how much of a
  beat's content words appear in a window, and raises `BeatNotFound` when
  nothing clears the floor: *"the Payoff beat is not in this footage (best match
  18% of its words)"*. A video whose Payoff is forty seconds of unrelated
  conversation costs the client the watch to find out.
* **Captions are a real `.ass` file.** The worker image ships a pinned **LGPL**
  ffmpeg, which carries libass — so `-vf ass=` replaces the Pillow PNG
  compositing on this path. The Pillow path stays for `make-samples`, because
  the Homebrew ffmpeg on a laptop still has no text filters at all (D16).
* **H.264 comes from openh264 in the container**, since an LGPL build has no
  libx264. `pick_h264_encoder` prefers openh264 even where x264 exists, so what
  gets judged is what ships.

## Where the words come from

The transcriber chain is whisperx → faster-whisper → script sidecar, and
`summary.json` always names the one that answered.

With no model installed, the engine reads a file you put next to the video:

* `episode-47.mp4.transcript.json` — `{"words": [{"text", "start", "end"}]}`,
  real timings.
* `episode-47.mp4.script.txt` — plain text; timings are spread evenly and the
  summary says `estimated timings` so nobody mistakes it for alignment.

With neither, it stops. **Nothing in this engine invents words.** A made-up
transcript becomes a made-up hook and then a sample shown to a client, which
CLAUDE.md non-negotiable 7 does not allow.

## The compliance gate

Four rules, in `src/pipeline/compliance/rules.py`. Every cut gets all four, and
the worst finding decides it — nothing averages to a pass.

| Rule | Verdict | Serves |
|---|---|---|
| `rights-flag` | **blocked** with no rights record in `brand.json` | Non-negotiable 1 |
| `near-duplicate` | **needs review** above 30% similarity to another cut | Non-negotiable 2 |
| `banned-phrases` | **blocked** on guarantees, zero-claims, growth promises, certifications, testimonials; **needs review** on the brand's own `wordsNever` | Non-negotiable 7 |
| `ai-label` | **blocked** when a cut has a generated scene and no label | Non-negotiable 4 |

30% is the limit the public site already states, so the code and the claim
match. v0 generates no footage, so no cut carries an AI scene yet; the rule is
wired now so the label is already required the day B-roll arrives.

## Tests

```sh
uv run --no-editable pytest -q      # 108 tests, about 25s
```

Every adapter and every compliance rule has tests. The footage they run on is
generated by ffmpeg (`testsrc2` plus a silent track) inside the test run —
nothing is ever downloaded, per non-negotiable 1.

The Claude tests never call the API. They prove the refusals: no cap, no key,
an empty key, and a reply whose hook is not in the transcript.

## Layout

```
src/pipeline/
  adapters/      Anything that talks to a model, an API or a binary
    base.py           The Protocols: Transcriber, MomentFinder, CaptionBurner
    transcribe.py     whisperx → faster-whisper → script sidecar
  multiplier/    The Multiplier agent
    moments.py        Heuristic scoring, the default finder
    claude_moments.py The Claude finder, off unless asked for twice
    captions.py       Word grouping, then drawing the lines (Pillow)
    ass_captions.py   The same lines as a .ass file, for libass (V5)
    render.py         Moments to files
  compliance/    The Compliance agent: the four rules
  beats.py       V5: where each beat of an approved script is in the footage
  short.py       V5: align, caption, encode, check, write summary.json
  ffmpeg.py      The only place that shells out
  brand.py       Reading and checking brand.json
  cli.py         make-samples
  cli_short.py   render-short
  cli_transcribe.py  transcribe-source
```

## Known limits

Honest list; these are v0 shortcomings, not secrets.

* **Centre crop, nothing smarter.** No face or speaker tracking. A speaker
  standing off to one side will be cropped badly.
* **Captions are drawn by Pillow, not ffmpeg.** The Homebrew ffmpeg here has
  no libass and no libfreetype, so `drawtext`, `subtitles` and `ass` are all
  missing (`docs/DECISIONS.md` D16). Captions are rasterised as PNGs and
  composited with `overlay`.
* **The caption font is whatever the machine has.** Geist ships as woff2,
  which Pillow cannot read, so `brand.json` can name a TTF and otherwise the
  engine falls back and records which font it used.
* **No intro, no outro.** `introTemplate` and `outroTemplate` are in the brand
  kit and are not rendered yet; those are week 2's Remotion templates.
* **No B-roll, no voice, no face.** Nothing is generated, so nothing needs a
  consent record beyond the rights flag.
* ~~**whisperx's licence is unverified**~~ — **it is BSD-2-Clause**, read off the
  repository on 25 November 2026, so it is on non-negotiable 10's list. It stays
  an opt-in extra for a different reason: it wants torch, torchvision,
  transformers and pyannote-audio, whose models are gated behind accepted
  Hugging Face conditions, for word timings faster-whisper already returns. The
  worker image installs **faster-whisper** only (D150).
* **`render-short` makes one short per run.** The schema is built for a
  60-minute source yielding several (`renders.cut_index`), and slice 1 does not
  yet loop. Nothing has to change to add it.
