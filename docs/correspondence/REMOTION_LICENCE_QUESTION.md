# Email to Remotion — which ffmpeg does the compositor link?

**For Vlad to send.** To `hi@remotion.dev` (the address on their contact page);
their support policy also offers a Discord, and either is fine — the answer is
the thing, not the channel.

**Why we are asking, in one line:** our own ffmpeg is a deliberately chosen
LGPL build, and we need to know whether adding Remotion to an image would put a
GPL-linked binary beside it (D150, D152 §3).

**What a good answer looks like:** "LGPL, no GPL components" or "GPL, x264
enabled" — either is usable. A version-dependent answer is also fine, as long as
we know which.

---

## Subject

Licensing question: which ffmpeg configuration does @remotion/renderer's compositor link?

## Body

Hello,

I'm evaluating Remotion for the animated intro and outro cards in a
short-video product. We expect to be inside the Free Licence — we're a
for-profit company with three employees — and the question below is about
ffmpeg rather than about your licence.

We render the main video with ffmpeg ourselves, and we deliberately use an
**LGPL** build: no libx264, no libx265, H.264 via libopenh264. That choice is
written down and enforced by a check in our CI, because the rest of our code is
MIT/Apache-licensed and we don't want a GPL-linked binary in the images we ship.

I can see from `packages/compositor/Cargo.toml` that the compositor links
ffmpeg statically through `ffmpeg-next`. Three things would help us a lot:

1. **Is the ffmpeg that ships inside `@remotion/renderer`'s compositor built
   with `--enable-gpl` (for example with libx264 or libx265), or is it an
   LGPL configuration?**
2. If it is LGPL, which encoder provides the default H.264 output — libopenh264,
   a platform encoder, or something else?
3. Is there a supported way to run a render that produces only **PNG frames or
   a ProRes intermediate**, so that the H.264 encode can be done by our own
   ffmpeg? (We're currently assuming `renderFrames()` plus our own encode, and
   would like to know if that is a path you support rather than a trick.)

For context on scale: we would render two or three short brand animations per
customer, not per video — a few dozen renders a year — and the output is
concatenated with the customer's own footage by our pipeline.

Thank you,
Vlad Breygin
VN & MN Product Group

---

## What to do with the answer

| Answer | What changes |
|---|---|
| **LGPL, no GPL components** | Remotion may share an image with our own ffmpeg. The plan's isolation (its own service) stays anyway, for cost and latency, but the licence constraint relaxes. |
| **GPL (x264 enabled)** | The isolation becomes load-bearing: Remotion stays in its own image, which we treat the way `Dockerfile` treats the GPL build it refuses to carry. Record it in D15x and move on. |
| **No answer in two weeks** | Build slice 2 as planned — the architecture already assumes the worse answer — and note the question as open. |
