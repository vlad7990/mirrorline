/**
 * Research notes — what leg one hands leg two (D132).
 *
 * ============================================================================
 * Why notes exist at all
 * ============================================================================
 *
 * Of three live production scans, **one produced a report**. Job `5c20fa06` is
 * the shape of the other two: leg one ran 329 seconds, made 22 searches,
 * returned `end_turn` — it *finished* — and the report was rejected for
 * `placeholder-text` with **7 placeholder fields**. The model did not fail. It
 * was asked to research a niche and emit a complete, polished, placeholder-free
 * structured report in one turn, under a clock, and it did the research and then
 * padded the report.
 *
 * So the work is split, and these notes are the seam. Leg one researches and
 * writes down **what it saw and where** — facts, with urls. Leg two gets no
 * tools, its own time and token budget, and one job: turn the notes into the
 * report schema. If leg two is rejected for placeholders it is retried **from
 * the same notes**, which costs one short call and no searches, because the
 * expensive half is already done and stored.
 *
 * ============================================================================
 * Notes are deliberately rawer than the report
 * ============================================================================
 *
 * The temptation is to make this schema the report schema, so leg two is a
 * reformat. That would be pointless: the placeholders came from the *shaping*
 * work — a one-sentence `whyItWorks` per format, a `fit` score argued from the
 * client's profile, lengths as ranges, a `basis` on every claim — and moving it
 * to a leg with no budget of its own moves the problem rather than solving it.
 *
 * So the division is by **kind of work**, not by format:
 *
 * - **Leg one records observations.** `howItGoes` is prose: the structure as it
 *   was actually seen. `whereSeen` is urls. Numbers appear only where a page
 *   showed them.
 * - **Leg two does the shaping.** It writes the beats, scores the fit against
 *   the profile, turns length notes into ranges, and assigns each claim its
 *   basis — with every fact already in front of it and nothing left to look up.
 *
 * A retry is then meaningful rather than a re-roll of the same dice.
 */

import 'server-only'

/** Where a note came from. The report's `basis`, asked one leg earlier. */
export type NoteBasis = 'posts' | 'guidance'

const BASES: readonly NoteBasis[] = ['posts', 'guidance']

export type PageKind = 'post' | 'guide'

const PAGE_KINDS: readonly PageKind[] = ['post', 'guide']

export const NOTE_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'linkedin'] as const

export type NotePlatform = (typeof NOTE_PLATFORMS)[number]

/** One claim, with where it came from. Leg two turns these into `Claim`s. */
export interface Note {
  readonly text: string
  readonly basis: NoteBasis
}

/**
 * A format as it was observed, before anybody turned it into a recipe.
 *
 * `howItGoes` is prose on purpose — "text claim on screen for two seconds, then
 * the person corrects it to camera, then one tip" — because that is what a
 * researcher can honestly write down. Leg two splits it into named beats, which
 * is a writing job and not a looking one.
 */
export interface FormatNote {
  readonly name: string
  readonly howItGoes: string
  /** Post urls this format was read off. May be empty for a guidance-only read. */
  readonly whereSeen: readonly string[]
  readonly basis: NoteBasis
}

/**
 * One post, with only the numbers its page actually showed.
 *
 * Every optional field is optional for the same reason rule 5 exists: a missing
 * value is honest and an invented one is not. Leg two may not fill these in.
 */
export interface ExampleNote {
  readonly url: string
  readonly platform: NotePlatform
  readonly formatName: string
  readonly whatHappens: string
  readonly sourceNote: string
  readonly hookType: string | null
  readonly lengthSeconds: number | null
  readonly views: number | null
  readonly viewsPerFollower: number | null
  readonly accountSizeBucket: string | null
  readonly postedAt: string | null
}

export interface PageNote {
  readonly title: string
  readonly url: string
  readonly kind: PageKind
}

export interface ResearchNotes {
  readonly formats: readonly FormatNote[]
  readonly hookNotes: readonly Note[]
  readonly topicNotes: readonly Note[]
  readonly lengthNotes: readonly Note[]
  readonly patternNotes: readonly Note[]
  readonly examples: readonly ExampleNote[]
  readonly pages: readonly PageNote[]
  /**
   * What the research covered and what it could not find.
   *
   * Not decoration. Rule 14 says a thin niche is a finding rather than a
   * failure, and leg two cannot tell "we found nothing" from "we ran out of
   * time" unless leg one says which. A leg two that cannot tell them apart
   * invents coverage, which is where placeholders come from.
   */
  readonly coverage: string
}

export const EMPTY_NOTES: ResearchNotes = {
  formats: [],
  hookNotes: [],
  topicNotes: [],
  lengthNotes: [],
  patternNotes: [],
  examples: [],
  pages: [],
  coverage: '',
}

/**
 * What the parser keeps, section by section (D137).
 *
 * Deliberately a little **above** `RESEARCH_NOTE_CAPS`, which is what leg one is
 * asked for. The two answer different questions: the ask is sized so a normal
 * run's reply fits inside its output ceiling, and this is sized so a model that
 * overshoots the ask is not punished for it — both passing dog-trainer runs
 * recorded six formats where four were asked for, and those tokens are already
 * spent by the time they arrive. `notes.test.ts` asserts this never drops below
 * the ask, which is the direction that would silently discard paid-for work.
 *
 * Both are far below the old numbers (12 examples, 20 pages), because the cost
 * of a section is not the parse — it is the length leg one spends writing it and
 * leg two spends reading it.
 */
export const NOTE_KEEP_CAPS = {
  formats: 6,
  examples: 8,
  hookNotes: 6,
  topicNotes: 8,
  lengthNotes: 4,
  patternNotes: 6,
  pages: 12,
} as const

/**
 * The longest a single field may be, in characters.
 *
 * About seven characters a word against `RESEARCH_NOTE_CAPS`' word limits, with
 * room to finish a sentence. A backstop rather than the rule: the prompt is
 * where brevity is asked for, and this is what stops one runaway field being
 * carried into the write prompt in full.
 */
const FIELD_CHARS = {
  note: 220,
  howItGoes: 400,
  whatHappens: 260,
  coverage: 700,
} as const

const NOTE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'basis'],
  properties: {
    text: { type: 'string' },
    basis: { type: 'string', enum: ['posts', 'guidance'] },
  },
} as const

/**
 * The shape leg one must return.
 *
 * Inlined rather than `$ref`-ed, for the reason `scan.ts`'s `CLAIM_SCHEMA`
 * records: structured output is sent to the API, and an inlined object is what
 * every provider accepts without question.
 */
export const NOTES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['formats', 'hookNotes', 'topicNotes', 'lengthNotes', 'patternNotes', 'coverage'],
  properties: {
    formats: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'howItGoes', 'whereSeen', 'basis'],
        properties: {
          name: { type: 'string' },
          howItGoes: { type: 'string' },
          whereSeen: { type: 'array', items: { type: 'string' } },
          basis: { type: 'string', enum: ['posts', 'guidance'] },
        },
      },
    },
    hookNotes: { type: 'array', items: NOTE_SCHEMA },
    topicNotes: { type: 'array', items: NOTE_SCHEMA },
    lengthNotes: { type: 'array', items: NOTE_SCHEMA },
    patternNotes: { type: 'array', items: NOTE_SCHEMA },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['url', 'platform', 'formatName', 'whatHappens', 'sourceNote'],
        properties: {
          url: { type: 'string' },
          platform: { type: 'string', enum: [...NOTE_PLATFORMS] },
          formatName: { type: 'string' },
          whatHappens: { type: 'string' },
          sourceNote: { type: 'string' },
          hookType: { type: 'string' },
          // No `minimum`/`maximum`: structured output rejects them on integers
          // (a 400, found by a live run). The parser carries the guarantee.
          lengthSeconds: { type: 'integer' },
          views: { type: 'integer' },
          viewsPerFollower: { type: 'number' },
          accountSizeBucket: {
            type: 'string',
            enum: ['under_1k', '1k_10k', '10k_100k', '100k_1m', 'over_1m'],
          },
          postedAt: { type: 'string' },
        },
      },
    },
    pages: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'url', 'kind'],
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          kind: { type: 'string', enum: ['post', 'guide'] },
        },
      },
    },
    coverage: { type: 'string' },
  },
} as const

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function num(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return value
}

function int(value: unknown): number | null {
  const parsed = num(value)
  return parsed === null ? null : Math.round(parsed)
}

function basis(value: unknown): NoteBasis {
  // Unknown becomes `guidance`, which is the cautious direction: `posts` is a
  // claim that we measured something. The report's own parser does the same.
  return BASES.find((entry) => entry === value) ?? 'guidance'
}

function notes(value: unknown, cap: number): readonly Note[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry): Note | null => {
      if (typeof entry === 'string') {
        const text = str(entry, FIELD_CHARS.note)
        return text ? { text, basis: 'guidance' } : null
      }
      if (typeof entry !== 'object' || entry === null) return null
      const row = entry as Record<string, unknown>
      const text = str(row.text, FIELD_CHARS.note)
      return text ? { text, basis: basis(row.basis) } : null
    })
    .filter((entry): entry is Note => entry !== null)
    .slice(0, cap)
}

/**
 * Is this a link to a page rather than to a media file?
 *
 * The same rule `report.ts` applies to examples, applied one leg earlier so a
 * disallowed url never reaches the write prompt — non-negotiable 1. We hold the
 * pointer, never the work.
 */
const MEDIA_EXTENSIONS = /\.(mp4|mov|m4a|m4v|mp3|wav|jpe?g|png|gif|webp|webm|avi)(\?|#|$)/i

export function isPageUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false
  return !MEDIA_EXTENSIONS.test(url)
}

function urls(value: unknown, cap: number): readonly string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => str(entry, 500))
    .filter((entry): entry is string => entry !== null && isPageUrl(entry))
    .slice(0, cap)
}

function formats(value: unknown): readonly FormatNote[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry): FormatNote | null => {
      if (typeof entry !== 'object' || entry === null) return null
      const row = entry as Record<string, unknown>
      const name = str(row.name, 120)
      const howItGoes = str(row.howItGoes ?? row.how_it_goes, FIELD_CHARS.howItGoes)
      if (!name || !howItGoes) return null
      return {
        name,
        howItGoes,
        whereSeen: urls(row.whereSeen ?? row.where_seen, 4),
        basis: basis(row.basis),
      }
    })
    .filter((entry): entry is FormatNote => entry !== null)
    .slice(0, NOTE_KEEP_CAPS.formats)
}

function examples(value: unknown): readonly ExampleNote[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry): ExampleNote | null => {
      if (typeof entry !== 'object' || entry === null) return null
      const row = entry as Record<string, unknown>
      const url = str(row.url, 500)
      const formatName = str(row.formatName ?? row.format_name, 120)
      const whatHappens = str(row.whatHappens ?? row.what_happens, FIELD_CHARS.whatHappens)
      const sourceNote = str(row.sourceNote ?? row.source_note, 200)
      const platform = NOTE_PLATFORMS.find((candidate) => candidate === row.platform)

      // Every one of these is required by the report, so an example missing any
      // of them cannot become a row. Dropped here rather than carried into the
      // write prompt as a half-example leg two would be tempted to complete.
      if (!url || !isPageUrl(url) || !formatName || !whatHappens || !sourceNote || !platform) {
        return null
      }

      return {
        url,
        platform,
        formatName,
        whatHappens,
        sourceNote,
        hookType: str(row.hookType ?? row.hook_type, 120),
        lengthSeconds: int(row.lengthSeconds ?? row.length_seconds),
        views: int(row.views),
        viewsPerFollower: num(row.viewsPerFollower ?? row.views_per_follower),
        accountSizeBucket: str(row.accountSizeBucket ?? row.account_size_bucket, 40),
        postedAt: str(row.postedAt ?? row.posted_at, 40),
      }
    })
    .filter((entry): entry is ExampleNote => entry !== null)
    .slice(0, NOTE_KEEP_CAPS.examples)
}

function pages(value: unknown): readonly PageNote[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry): PageNote | null => {
      if (typeof entry !== 'object' || entry === null) return null
      const row = entry as Record<string, unknown>
      const title = str(row.title, 200)
      const url = str(row.url, 500)
      const kind = PAGE_KINDS.find((candidate) => candidate === row.kind)
      if (!title || !url || !isPageUrl(url) || !kind) return null
      return { title, url, kind }
    })
    .filter((entry): entry is PageNote => entry !== null)
    .slice(0, NOTE_KEEP_CAPS.pages)
}

/** jsonb and model replies alike: parsed, never cast. */
export function parseNotes(value: unknown): ResearchNotes {
  if (typeof value !== 'object' || value === null) return EMPTY_NOTES
  const root = value as Record<string, unknown>

  return {
    formats: formats(root.formats),
    hookNotes: notes(root.hookNotes ?? root.hook_notes, NOTE_KEEP_CAPS.hookNotes),
    topicNotes: notes(root.topicNotes ?? root.topic_notes, NOTE_KEEP_CAPS.topicNotes),
    lengthNotes: notes(root.lengthNotes ?? root.length_notes, NOTE_KEEP_CAPS.lengthNotes),
    patternNotes: notes(root.patternNotes ?? root.pattern_notes, NOTE_KEEP_CAPS.patternNotes),
    examples: examples(root.examples),
    pages: pages(root.pages),
    coverage: str(root.coverage, FIELD_CHARS.coverage) ?? '',
  }
}

/**
 * Did leg one find enough to be worth writing from?
 *
 * **A format or a claim.** Not examples: rule 14 is explicit that a niche with
 * no linkable public short video is a finding, and a report written from
 * guidance with an empty examples list is one we accept. What we will not do is
 * spend a write leg on nothing at all — that is the run that comes back as
 * placeholders, because a model asked to write a report from no notes will
 * write one anyway.
 */
export function notesAreUsable(found: ResearchNotes): boolean {
  return (
    found.formats.length > 0 ||
    found.hookNotes.length > 0 ||
    found.topicNotes.length > 0 ||
    found.patternNotes.length > 0
  )
}

export interface NotesCounts {
  readonly formats: number
  readonly hooks: number
  readonly topics: number
  readonly lengths: number
  readonly patterns: number
  readonly examples: number
  readonly pages: number
}

/** The eleven integers' equivalent for leg one, so Railway can tell legs apart. */
export function notesCounts(found: ResearchNotes): NotesCounts {
  return {
    formats: found.formats.length,
    hooks: found.hookNotes.length,
    topics: found.topicNotes.length,
    lengths: found.lengthNotes.length,
    patterns: found.patternNotes.length,
    examples: found.examples.length,
    pages: found.pages.length,
  }
}

export function notesCountLine(found: ResearchNotes): string {
  const counts = notesCounts(found)
  return (
    `formats=${counts.formats} hooks=${counts.hooks} topics=${counts.topics} ` +
    `lengths=${counts.lengths} patterns=${counts.patterns} ` +
    `examples=${counts.examples} pages=${counts.pages}`
  )
}

function noteLines(label: string, entries: readonly Note[]): string {
  if (entries.length === 0) return `${label}: nothing recorded.`
  return `${label}:\n${entries.map((entry) => `- [${entry.basis}] ${entry.text}`).join('\n')}`
}

/**
 * The notes as leg two reads them.
 *
 * Plain text rather than the JSON leg one returned, and that is deliberate: the
 * JSON's field names are *almost* the report's, and a model handed a nearly
 * matching object copies it across field by field — including the shaping work
 * it was supposed to do. Prose makes leg two read the facts and write the
 * report, which is the whole point of the split.
 *
 * Absent sections say "nothing recorded" rather than being omitted. A model
 * given a gap fills it; a model told the gap is real reports it (rule 14).
 */
export function notesBrief(found: ResearchNotes): string {
  const formatLines =
    found.formats.length === 0
      ? 'Formats observed: none recorded.'
      : `Formats observed:\n${found.formats
          .map(
            (format, index) =>
              `${index + 1}. ${format.name} [${format.basis}]\n` +
              `   How it goes: ${format.howItGoes}\n` +
              `   Seen at: ${
                format.whereSeen.length > 0 ? format.whereSeen.join(', ') : 'no post link recorded'
              }`,
          )
          .join('\n')}`

  const exampleLines =
    found.examples.length === 0
      ? 'Posts found: none. There is no public post in these notes to link to.'
      : `Posts found:\n${found.examples
          .map((example) => {
            const numbers = [
              example.hookType ? `hook ${example.hookType}` : null,
              example.lengthSeconds !== null ? `${example.lengthSeconds}s` : null,
              example.views !== null ? `${example.views} views` : null,
              example.viewsPerFollower !== null
                ? `${example.viewsPerFollower} views per follower`
                : null,
              example.accountSizeBucket,
              example.postedAt,
            ]
              .filter(Boolean)
              .join(', ')
            return (
              `- ${example.url} (${example.platform}) — format "${example.formatName}"\n` +
              `  What happens: ${example.whatHappens}\n` +
              `  Where I looked: ${example.sourceNote}\n` +
              `  Numbers the page showed: ${numbers || 'none'}`
            )
          })
          .join('\n')}`

  const pageLines =
    found.pages.length === 0
      ? 'Pages read: none recorded.'
      : `Pages read:\n${found.pages
          .map((page) => `- ${page.title} — ${page.url} (${page.kind})`)
          .join('\n')}`

  return [
    formatLines,
    noteLines('Hook notes', found.hookNotes),
    noteLines('Topic notes', found.topicNotes),
    noteLines('Length notes', found.lengthNotes),
    noteLines('Posting-pattern notes', found.patternNotes),
    exampleLines,
    pageLines,
    `What the research covered: ${found.coverage || 'not stated.'}`,
  ].join('\n\n')
}
