/**
 * Turn Milo's renders into the WebPs the app ships. `node scripts/mascot-assets.mjs`.
 *
 * The renders in `docs/design/mascot/` are 1536×1024 PNGs, about 1.7 MB each.
 * What the app needs is a handful of small WebPs at twice their display size,
 * under a 150 KB first-load budget — so this is a build step rather than
 * something done by hand, because the remaining state renders are coming
 * later and "run the script again" is the only instruction that will still be
 * true then.
 *
 * ## Why these are badges and not cut-outs
 *
 * The brief asked for transparent WebP. **These renders cannot give one**, and
 * the reason is worth writing down so nobody spends the afternoon on it twice.
 *
 * They are opaque PNGs on a dark navy field, and that field is not flat: the
 * generator baked a **polygonal lighting artefact** into it, a lighter region
 * with straight diagonal edges running right across the background, measuring
 * 30–45 away from the corner colour in RGB. Four approaches were tried and
 * each failed on a different rock:
 *
 * 1. **Key the navy out.** Removes the visor and the headphone cups with it —
 *    they are *darker* than the background they sit on.
 * 2. **Difference matte, then fill enclosed holes.** Fixes the visor and then
 *    fills the background trapped inside the loop of the gold swoosh, so Milo
 *    arrives sitting in a black puddle.
 * 3. **Erode first so thin walls break.** The swoosh does break, but so does
 *    the helmet: its panel seams are dark lines that cut the rim, and the
 *    visor escapes through them.
 * 4. **A coarse silhouette as a trimap, with a diffused background field.**
 *    Gets the silhouette right, and still cannot separate the artefact from
 *    the glow, because at the artefact's edge they are the same distance from
 *    the background.
 *
 * The honest fix is upstream and costs one setting: **re-export the renders
 * with an alpha channel.** That is "Needs Vlad" — and until then, a circular
 * ink badge is not a consolation prize. The art is *lit* for a dark field;
 * keeping the field is faithful to it, it reads as deliberate on both the
 * light and the dark theme, and it is the treatment most product mascots get
 * anyway. The rounding is CSS, not pixels, so it stays crisp at any size and
 * costs nothing in the file.
 *
 * ## The crops
 *
 * Measured, never hard-coded. A bright-pixel mask gives the content bounding
 * box, and the avatar is a square anchored at the top of it and centred on the
 * **head's** horizontal centroid rather than the figure's — Milo's arm is
 * outstretched and the gold swoosh is wider than he is, so the figure's centre
 * sits well to the right of his face.
 */

import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = path.join(ROOT, 'docs/design/mascot')
const OUT_DIR = path.join(ROOT, 'apps/web/public/mascot')

/**
 * The reference render, used for any state whose own render does not exist.
 *
 * `milo-concept-v1-blue.png` is deliberately not here: it is superseded
 * colours, and a fallback that could silently reach it would put the wrong
 * palette on the site the first time a filename was mistyped.
 */
const CONCEPT = 'milo-concept-v2.png'

/**
 * The five states the co-pilot can be in.
 *
 * `avatar` is not a state. If `milo-avatar.png` ever exists it is a dedicated
 * head-and-shoulders render, and it is preferred for the avatar crop of any
 * state that has no render of its own.
 */
const STATES = ['idle', 'greeting', 'thinking', 'answering', 'declined']

const AVATAR_SOURCE = 'milo-avatar.png'

/** 2× the display sizes: 32px in a panel header, 56px on the launcher. */
const AVATAR_SIZES = [64, 112]

/** 2× a ~180px display in the chat empty state, onboarding and /about. */
const FULL_WIDTH = 360

/** How far above the background a pixel must be to count as the character. */
const SUBJECT_THRESHOLD = 40

/** Padding around the measured content, as a share of its longest side. */
const PAD = 0.04

/**
 * The slice of the figure the head is looked for in.
 *
 * Half, which comfortably contains the helmet and nothing of the legs.
 */
const HEAD_BAND = 0.5

/**
 * The avatar square, as a multiple of the head's longest side.
 *
 * Not cosmetic. The avatar is rounded to a circle in CSS, and the circle
 * inscribed in this square has the square's side as its *diameter* — so a
 * square cut tight to the head clips both ears and the top of the helmet.
 * A third again leaves the head inside the circle with the shoulders showing.
 */
const AVATAR_ZOOM = 1.35

/**
 * How far a row must narrow below the helmet's widest to count as the neck.
 *
 * Three quarters. Tighter and a seam or a highlight on the helmet reads as a
 * neck; looser and the shoulders are taken for one.
 */
const NECK_RATIO = 0.75

/** Wide enough to locate a subject, small enough to be instant. */
const PROBE_WIDTH = 384

/**
 * Where the character is, and where its head is, measured at low resolution.
 *
 * Low resolution on purpose: the only questions being asked are "which pixels
 * are clearly brighter than the background" and "where is the middle of the
 * top third of them", and both survive an eightfold downscale while the noise
 * in the background does not.
 */
async function locate(file) {
  const sourceWidth = (await sharp(file).metadata()).width
  const probe = await sharp(file).resize({ width: PROBE_WIDTH }).raw().toBuffer({
    resolveWithObject: true,
  })
  const { width, height, channels } = probe.info
  const data = probe.data

  const background = [data[0], data[1], data[2]]
  const isSubject = new Uint8Array(width * height)
  for (let index = 0; index < width * height; index += 1) {
    const at = index * channels
    const distance = Math.hypot(
      data[at] - background[0],
      data[at + 1] - background[1],
      data[at + 2] - background[2],
    )
    isSubject[index] = distance > SUBJECT_THRESHOLD ? 1 : 0
  }

  let left = width
  let right = -1
  let top = height
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (isSubject[y * width + x] === 0) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }

  if (right < 0) throw new Error(`found no subject in ${path.basename(file)}`)

  const scale = sourceWidth / width
  const band = { top, bottom: top + Math.round((bottom - top) * HEAD_BAND), left, right }

  return {
    box: {
      left: left * scale,
      top: top * scale,
      width: (right - left + 1) * scale,
      height: (bottom - top + 1) * scale,
    },
    head: scaleBox(headFromProfile(isSubject, width, band), scale),
  }
}

/**
 * The head, found from the row-width profile down to the neck.
 *
 * A connected-blob search does not work here and it is worth saying why: the
 * helmet and the torso are one blob, so "the largest blob in the top half"
 * returns the whole figure and the avatar zooms out to a full body.
 *
 * The shape is the signal instead. Scanning down from the top, the widest
 * contiguous run of subject pixels in each row traces the helmet — widening
 * to the ears, then narrowing sharply at the neck before the shoulders widen
 * again. The first row below the helmet's widest point that falls under
 * `NECK_RATIO` of it is the neck, and everything above it is the head.
 *
 * The widest *run* rather than the row's extent, because the raised hand sits
 * at head height on the far side of the figure: an extent spans both and
 * centres the avatar on Milo's shoulder. A run cannot span the gap.
 */
function headFromProfile(isSubject, width, band) {
  const runs = []

  for (let y = band.top; y <= band.bottom; y += 1) {
    let best = null
    let runStart = -1

    for (let x = band.left; x <= band.right + 1; x += 1) {
      const filled = x <= band.right && isSubject[y * width + x] === 1
      if (filled && runStart === -1) runStart = x
      if (filled) continue
      if (runStart === -1) continue

      const run = { left: runStart, right: x - 1, width: x - runStart }
      if (!best || run.width > best.width) best = run
      runStart = -1
    }

    runs.push(best)
  }

  let widestAt = 0
  for (let index = 0; index < runs.length; index += 1) {
    if ((runs[index]?.width ?? 0) > (runs[widestAt]?.width ?? 0)) widestAt = index
  }

  const widest = runs[widestAt]?.width ?? 0
  if (widest === 0) throw new Error('found no head in the top band')

  let neckAt = runs.length - 1
  for (let index = widestAt + 1; index < runs.length; index += 1) {
    if ((runs[index]?.width ?? 0) < widest * NECK_RATIO) {
      neckAt = index
      break
    }
  }

  let left = width
  let right = -1
  for (let index = 0; index <= neckAt; index += 1) {
    const run = runs[index]
    if (!run) continue
    if (run.left < left) left = run.left
    if (run.right > right) right = run.right
  }

  return {
    left,
    top: band.top,
    width: right - left + 1,
    height: neckAt + 1,
  }
}

function scaleBox(box, scale) {
  return {
    left: box.left * scale,
    top: box.top * scale,
    width: box.width * scale,
    height: box.height * scale,
  }
}

function clampBox(box, width, height) {
  const left = Math.max(0, Math.min(Math.round(box.left), width - 1))
  const top = Math.max(0, Math.min(Math.round(box.top), height - 1))
  return {
    left,
    top,
    width: Math.max(1, Math.min(Math.round(box.width), width - left)),
    height: Math.max(1, Math.min(Math.round(box.height), height - top)),
  }
}

function paddedBox(box, width, height) {
  const pad = Math.round(Math.max(box.width, box.height) * PAD)
  return clampBox(
    {
      left: box.left - pad,
      top: box.top - pad,
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    },
    width,
    height,
  )
}

function avatarBox(found, width, height) {
  const { head } = found
  const side = Math.round(Math.max(head.width, head.height) * AVATAR_ZOOM)

  return clampBox(
    {
      left: head.left + head.width / 2 - side / 2,
      top: head.top + head.height / 2 - side / 2,
      width: side,
      height: side,
    },
    width,
    height,
  )
}

async function writeWebp(pipeline, file) {
  // Lossy at a high quality: the character has flat cream panels that band
  // badly under an aggressive setting, and a crisp edge matters more than the
  // last kilobyte at these sizes.
  const buffer = await pipeline.webp({ quality: 88, effort: 6 }).toBuffer()
  writeFileSync(file, buffer)
  return buffer.length
}

/**
 * Build one render's files, once.
 *
 * Keyed by source name rather than by state, because four of the five states
 * currently share the concept render and writing four identical copies of
 * every file would put a quarter of a megabyte of duplicates in the repo. The
 * manifest maps a state to the files it should use.
 */
async function buildSource(name, built) {
  const existing = built.get(name)
  if (existing) return existing

  const file = path.join(SOURCE_DIR, name)
  const { width, height } = await sharp(file).metadata()
  const found = await locate(file)
  const slug = name.replace(/^milo-/, '').replace(/\.png$/, '')

  const fullName = `milo-${slug}-full-${FULL_WIDTH}.webp`
  await writeWebp(
    sharp(file).extract(paddedBox(found.box, width, height)).resize({ width: FULL_WIDTH }),
    path.join(OUT_DIR, fullName),
  )

  const crop = avatarBox(found, width, height)
  const avatars = {}
  for (const size of AVATAR_SIZES) {
    const avatarName = `milo-${slug}-avatar-${size}.webp`
    await writeWebp(
      sharp(file).extract(crop).resize({ width: size, height: size }),
      path.join(OUT_DIR, avatarName),
    )
    avatars[size] = avatarName
  }

  const files = { full: fullName, avatars }
  built.set(name, files)
  return files
}

async function build() {
  if (!existsSync(SOURCE_DIR)) throw new Error(`no mascot renders at ${SOURCE_DIR}`)
  if (!existsSync(path.join(SOURCE_DIR, CONCEPT))) {
    throw new Error(`the fallback render ${CONCEPT} is missing, so no state could be built`)
  }

  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const built = new Map()
  const states = []

  for (const state of STATES) {
    const own = `milo-${state}.png`
    const hasOwn = existsSync(path.join(SOURCE_DIR, own))
    const hasDedicatedAvatar = existsSync(path.join(SOURCE_DIR, AVATAR_SOURCE))

    const fullSource = hasOwn ? own : CONCEPT
    let avatarSource = CONCEPT
    if (hasOwn) avatarSource = own
    else if (hasDedicatedAvatar) avatarSource = AVATAR_SOURCE

    const fullFiles = await buildSource(fullSource, built)
    const avatarFiles = await buildSource(avatarSource, built)

    states.push({
      state,
      // The flag the app reads to say so out loud. `lib/mascot/milo.ts` keeps
      // its own copy and `milo.test.ts` fails if the two disagree — so a
      // render landing without the flag being flipped is a failing test rather
      // than a placeholder quietly becoming the finished thing.
      isPlaceholder: !hasOwn,
      full: fullFiles.full,
      avatars: Object.fromEntries(AVATAR_SIZES.map((size) => [size, avatarFiles.avatars[size]])),
    })
  }

  writeFileSync(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify({ states }, null, 2)}\n`)

  const all = readdirSync(OUT_DIR).filter((file) => file.endsWith('.webp'))
  const total = all.reduce((sum, file) => sum + statSync(path.join(OUT_DIR, file)).size, 0)

  // What a first paint actually fetches: the launcher's avatar in whichever of
  // the two resting states it is in. Everything else is lazy.
  const firstLoadFiles = new Set(
    states
      .filter((entry) => entry.state === 'idle' || entry.state === 'greeting')
      .flatMap((entry) => Object.values(entry.avatars)),
  )
  const firstLoad = [...firstLoadFiles].reduce(
    (sum, file) => sum + statSync(path.join(OUT_DIR, file)).size,
    0,
  )

  const placeholders = states.filter((entry) => entry.isPlaceholder).map((entry) => entry.state)

  process.stdout.write(
    [
      `mascot: ${states.length} states from ${built.size} renders, ${all.length} files, ${(total / 1024).toFixed(1)} KB`,
      `  placeholders: ${placeholders.join(', ') || 'none'}`,
      `  first load (resting avatars): ${(firstLoad / 1024).toFixed(1)} KB of a 150 KB budget`,
      '',
    ].join('\n'),
  )
}

await build()
