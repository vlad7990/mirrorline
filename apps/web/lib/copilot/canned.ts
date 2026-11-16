/**
 * The answers both surfaces give when there is no API key (spec 18 §4, §7).
 *
 * **No key is a supported mode, not an error.** §4: "the adapter returns
 * canned responses, every surface works, every test passes, and the UI says
 * it is in sample mode. This is the rule the engine already follows, and it
 * is what lets PR C be built, reviewed and previewed before the key exists."
 * So this file is not a stub — it is the thing that makes C2 and C3
 * reviewable, and the shape of every answer here is the shape a real one has.
 *
 * ## Why the answer types live here and not in `adapter.ts`
 *
 * Because `adapter.ts` imports the SDK and nothing else may (18 §4). If the
 * types lived there, every module that wanted to describe an answer would
 * pull the SDK in behind it, and the one rule the server-side test exists to
 * protect would be impossible to keep. Dependencies point one way: the
 * adapter reads this file, this file knows nothing about the adapter.
 *
 * ## The refusals are real refusals, not placeholders
 *
 * §3.2's four categories are answered here in full, because in sample mode
 * these *are* the website bot's refusals and C2 will be reviewed against
 * them. Each one is written to the rule it serves rather than to a tone:
 *
 * - A guarantee is refused and replaced with what we measure instead.
 * - Invented results are refused by saying there are none yet. There are no
 *   customers, so this is simply true, and it stays true until it isn't.
 * - A named competitor is refused by category. **The detector is the banned
 *   phrase list itself**, which is how this file manages to recognise a brand
 *   without containing one: `lib/copy/banned-phrases.ts` already carries that
 *   pattern and already carries the exemption for carrying it. Writing the
 *   names out here would have put eight competitor brands into shipped copy
 *   in order to detect a question about them.
 * - Anything outside the corpus is handed to a person, which §3.1 calls a
 *   success state and the tests treat as one.
 */

import { PRICING_TIERS, type PricingTier } from '@/components/marketing/pricing-tiers'

import { BANNED_PATTERNS } from '../copy/banned-phrases'

import { SITE_CORPUS, STUDIO_FACTS, type CorpusSection, type StudioFact } from './grounding'

/** Live when a key exists, sample when it does not. Never an error. */
export type CopilotMode = 'live' | 'sample'

/** The two surfaces, which share an adapter and almost nothing else. */
export type CopilotSurface = 'site' | 'studio'

/**
 * The thing a chip is made of.
 *
 * 18 §2.2 wants a visible chip the reader can click, so a citation is a label
 * and somewhere to go. There is no third shape — a citation that cannot be
 * clicked is a footnote, and §2.2 rules footnotes out by name.
 */
export interface Citation {
  readonly label: string
  readonly href: string
}

/**
 * Why an answer was refused.
 *
 * The first four are §3.2's categories, on the website surface. `forecast` is
 * the studio's own, and it was added because a test found the gap: asked
 * "what will my revenue be next quarter?", the bot matched the revenue KPI
 * and read this month's figure back. That is not a lie, but it answers a
 * question nobody asked and presents a measurement where a prediction was
 * wanted — which is one step from the thing the Performance Analyst's own
 * limit forbids, "no projected or inflated figure is ever shown as an
 * actual". Refusing the forecast outright is the honest shape.
 */
export type RefusalKind =
  | 'guarantee'
  | 'invented-results'
  | 'competitor'
  | 'outside-corpus'
  | 'forecast'

/** Where an unanswerable question goes. §3.1: "here is a person" is a success. */
export interface Handoff {
  readonly label: string
  readonly href: string
}

export type ProposalKind = 'move-post' | 'swap-format' | 'pause-account'

/**
 * Something the co-pilot would like to do and may not.
 *
 * `requiresApproval` is typed as the literal `true` rather than a boolean, and
 * that is deliberate. 18 §2.3: "There is no auto-approve, no 'always allow',
 * and no setting that adds one." A boolean would let somebody write
 * `requiresApproval: false` and have it compile; the literal makes the
 * auto-approving variant of this feature unrepresentable rather than merely
 * forbidden.
 *
 * There is also no handler, no callback and no mutation anywhere on this
 * type. A proposal is data describing a change, and the only thing that can
 * perform one is the screen the client presses Approve on.
 */
export interface Proposal {
  readonly kind: ProposalKind
  /** One line, for the card's heading. */
  readonly summary: string
  /** What would happen, in full, so Approve is an informed press. */
  readonly detail: string
  readonly requiresApproval: true
}

export interface CopilotAnswer {
  readonly surface: CopilotSurface
  readonly mode: CopilotMode
  readonly text: string
  readonly citations: readonly Citation[]
  readonly proposals: readonly Proposal[]
  /** Set when this answer is a refusal, so a test can name the category. */
  readonly refusal: RefusalKind | null
  readonly handoff: Handoff | null
}

/**
 * The label every sample answer carries.
 *
 * Non-negotiable 7 requires demo data to say so on public pages, and §7 puts
 * "sample answers, labelled" in both surfaces' no-key row. The adapter
 * attaches it to the answer rather than leaving it to the UI, so a surface
 * cannot forget.
 */
export const SAMPLE_NOTICE =
  'Sample answer. No model is connected to this preview, so this reply is scripted from our own pages rather than generated.'

const BOOK_A_CALL: Handoff = { label: 'Talk to a person', href: '/niche-scan' }

function competitorPattern(): RegExp {
  const banned = BANNED_PATTERNS.find((pattern) => pattern.id === 'competitor-brand')
  if (!banned) {
    // The list is the detector. If the entry is renamed, failing loudly is
    // better than silently answering questions about competitors by name.
    throw new Error('banned-phrases no longer carries a competitor-brand pattern')
  }
  return banned.pattern
}

const GUARANTEE_ASK =
  /\b(?:guarantee|guaranteed|promise|will i get|how many (?:followers|views|leads)|can you get me)\b/i

// "Results … client" within a clause, rather than adjacent: the question is
// almost never phrased as tightly as the first draft of this assumed. "What
// results have you got for a client in my industry?" has eighteen characters
// between the two words and was being answered from the corpus.
const RESULTS_ASK =
  /\b(?:case stud(?:y|ies)|testimonials?|results?\b[^.?!]{0,40}\b(?:client|customer)s?\b|(?:client|customer)s?\b[^.?!]{0,40}\bresults?\b|what (?:did|have) you (?:do|done) for|who (?:are|were) your (?:client|customer)s?|show me results)\b/i

const STOPWORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'because',
  'been',
  'before',
  'being',
  'between',
  'both',
  'came',
  'does',
  'doing',
  'done',
  'each',
  'from',
  'have',
  'here',
  'into',
  'just',
  'like',
  'make',
  'many',
  'more',
  'most',
  'much',
  'need',
  'only',
  'other',
  'over',
  'same',
  'some',
  'such',
  'tell',
  'than',
  'that',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'very',
  'want',
  'what',
  'when',
  'where',
  'which',
  'will',
  'with',
  'would',
  'your',
  'yours',
])

/** The words worth matching on: long enough to mean something, not a stopword. */
export function keywords(question: string): readonly string[] {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9$\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word))

  return [...new Set(words)]
}

export interface Hit {
  readonly section: CorpusSection
  readonly score: number
  readonly excerpt: string
}

/** How many question words a section has to contain before it counts as an answer. */
const MINIMUM_HITS = 2

/** The line of a section that carries the most of the question's words. */
function bestLine(body: string, matched: readonly string[]): string {
  const lines = body
    .split('\n')
    .map((line) => line.replace(/^[-\s]+/, '').trim())
    .filter((line) => line.length > 40)

  let bestLineText = lines[0] ?? body.slice(0, 240)
  let bestCount = -1

  for (const line of lines) {
    const lower = line.toLowerCase()
    const count = matched.filter((word) => lower.includes(word)).length
    if (count > bestCount) {
      bestCount = count
      bestLineText = line
    }
  }

  return bestLineText
}

/**
 * The best passage in the corpus for a question, or nothing.
 *
 * Keyword overlap, not embeddings. That is the right call for a corpus of a
 * dozen sections about one product: a vector store would be a dependency, a
 * build step and an index to keep in sync, to improve retrieval over
 * twenty-seven thousand characters. If the corpus grows to the point where
 * this stops working, the thing to reach for is the retrieval 18 §3.1
 * describes properly — not a slightly cleverer regular expression.
 *
 * Returning nothing is a first-class outcome: it is what produces the
 * "I don't know, here is a person" answer §3.1 asks for.
 */
export function retrieve(question: string): Hit | null {
  const words = keywords(question)
  if (words.length === 0) return null

  let best: Hit | null = null

  for (const section of SITE_CORPUS) {
    const haystack = `${section.heading}\n${section.body}`.toLowerCase()
    const matched = words.filter((word) => haystack.includes(word))
    if (matched.length < MINIMUM_HITS) continue

    if (!best || matched.length > best.score) {
      best = { section, score: matched.length, excerpt: bestLine(section.body, matched) }
    }
  }

  return best
}

/**
 * The plan a question names, if it names one.
 *
 * Word-boundary matched against the plan names we publish, so "Scale" the
 * plan is found and "scale up" is not. The figures come from
 * `pricing-tiers.ts`, which is the one place a price is written down (D38) —
 * this reads them, it does not restate them.
 */
function planNamed(question: string): PricingTier | null {
  const asked = question.toLowerCase()
  return (
    PRICING_TIERS.find((tier) => new RegExp(`\\b${tier.name.toLowerCase()}\\b`).test(asked)) ?? null
  )
}

function citationFor(section: CorpusSection): Citation {
  return { label: section.heading, href: section.route }
}

/** Where the category comparison lives — 11 §2, read off the corpus. */
function categoriesRoute(): string {
  return SITE_CORPUS.find((entry) => entry.id === 'problems')?.route ?? '/compare'
}

function siteAnswer(parts: Omit<CopilotAnswer, 'surface' | 'mode'>): CopilotAnswer {
  return { surface: 'site', mode: 'sample', ...parts }
}

/**
 * The website bot's reply, with no model involved.
 *
 * Refusals are checked before retrieval, and the order matters: a question
 * can be both answerable and improper. "Will the Growth plan guarantee me
 * 10,000 followers?" retrieves the Growth plan perfectly well, and answering
 * it from the corpus would mean answering the half we must refuse. The
 * refusal wins.
 */
export function cannedSiteAnswer(question: string): CopilotAnswer {
  if (competitorPattern().test(question)) {
    return siteAnswer({
      text: 'We do not discuss named competitors — we would have to keep that comparison accurate for ever, and we would get it wrong. What we can do is compare by category: clipping tools, agencies and repost pages each leave a different part of the job undone, and our side of each is written out on the comparison page.',
      citations: [{ label: 'How we compare, by category', href: categoriesRoute() }],
      proposals: [],
      refusal: 'competitor',
      handoff: null,
    })
  }

  if (RESULTS_ASK.test(question)) {
    return siteAnswer({
      text: 'We have no client results to show yet, and we are not going to invent any. We are new, there are no case studies, and the figures you can see on this site are labelled as samples because that is what they are. What we can show you is the method and the reporting: every KPI names its source, says how fresh it is, and says “not connected” rather than showing a zero.',
      citations: [{ label: 'What the words mean', href: '/resources' }],
      proposals: [],
      refusal: 'invented-results',
      handoff: BOOK_A_CALL,
    })
  }

  if (GUARANTEE_ASK.test(question)) {
    return siteAnswer({
      text: 'Nobody can honestly promise you a follower count, and we are not going to. Short-form growth depends on your niche, your footage and your offer, and it is slow and uneven. What we do commit to is what you get and when: the posts go out on time, the report runs from views to clicks to calls, and the figures in it are the real ones — including the weeks that go badly. Judge us on that, and leave if the posting stops or the reporting goes quiet.',
      citations: [{ label: 'When do I see results?', href: '/faq' }],
      proposals: [],
      refusal: 'guarantee',
      handoff: BOOK_A_CALL,
    })
  }

  const hit = retrieve(question)
  if (!hit) {
    // Retrieval needs two matching words, and "how much is Creator" only has
    // one that counts. A plan name is a thing we hold exactly, though, so a
    // question that names one is answered from the price list rather than
    // handed to a person — found by the multi-part tests, where the second
    // half of a question is usually this short.
    const plan = planNamed(question)
    if (plan) {
      return siteAnswer({
        text: `${plan.name} is ${plan.price} ${plan.period}. ${plan.summary}`,
        citations: [{ label: 'The plans and what they cost', href: '/pricing' }],
        proposals: [],
        refusal: null,
        handoff: null,
      })
    }

    return siteAnswer({
      text: 'That is not something I can answer from our own pages, and I am not going to guess at it. I only read what we have published. A person can answer it properly — the Niche Scan is the quickest way to get one looking at your account.',
      citations: [],
      proposals: [],
      refusal: 'outside-corpus',
      handoff: BOOK_A_CALL,
    })
  }

  return siteAnswer({
    text: `From our own pages: “${hit.excerpt}”`,
    citations: [citationFor(hit.section)],
    proposals: [],
    refusal: null,
    handoff: null,
  })
}

function studioAnswer(parts: Omit<CopilotAnswer, 'surface' | 'mode'>): CopilotAnswer {
  return { surface: 'studio', mode: 'sample', ...parts }
}

function factCitation(fact: StudioFact): Citation {
  return { label: fact.label, href: fact.href }
}

/**
 * The fact whose KPI name the question comes closest to naming.
 *
 * Needs the same two-word floor the corpus retrieval uses, and for a sharper
 * reason. With a floor of one, "tell me the cost per enquiry on LinkedIn"
 * matched the cost-per-lead row on the single word "cost" and read a real
 * figure back — the right number for a question nobody asked, stated with the
 * confidence of a citation. On this surface that is the §2.2 failure exactly:
 * the answer is tied to a row we hold, and it is still not an answer to what
 * was asked. Two words is the difference between naming a KPI and brushing
 * past one.
 */
export function matchFact(question: string): StudioFact | null {
  const words = keywords(question)
  if (words.length === 0) return null

  let best: StudioFact | null = null
  let bestScore = 0

  for (const fact of STUDIO_FACTS) {
    const haystack = `${fact.label} ${fact.value}`.toLowerCase()
    const score = words.filter((word) => haystack.includes(word)).length
    if (score > bestScore) {
      bestScore = score
      best = fact
    }
  }

  return bestScore >= MINIMUM_HITS ? best : null
}

const MOVE_ASK = /\b(?:move|reschedul\w*|shift|postpone|different (?:day|time)|earlier|later)\b/i
const SWAP_ASK = /\b(?:swap|different format|another format|change the format|replace)\b/i
const PAUSE_ASK = /\b(?:pause|stop posting|hold off|suspend)\b/i
const HOLD_ASK = /\b(?:held|blocked|rejected|compliance)\b/i
const HOOK_ASK = /\b(?:hook|caption|opening line|draft)\b/i

/**
 * A question about the future rather than about a row we hold.
 *
 * Checked before the facts are searched, because the facts will happily
 * match: "what will my revenue be next quarter" contains the word revenue,
 * and we hold a revenue KPI. Reading this month's figure back would answer a
 * question nobody asked, in a shape that invites it to be read as a forecast.
 */
const FORECAST_ASK =
  /\b(?:will (?:i|we|my|the)|going to (?:get|be|reach|hit)|next (?:week|month|quarter|year)|forecast|predict|projection|how long until|when will)\b/i

/**
 * The studio bot's reply, with no model involved.
 *
 * Covers §2.1's four jobs and §2.3's three proposals, because those are what
 * C3 will be reviewed against. Every factual sentence carries its chip, and
 * where there is no row to cite the reply says it does not know rather than
 * producing a plausible number — §2.2, which is the most important rule on
 * this surface.
 */
export function cannedStudioAnswer(question: string): CopilotAnswer {
  if (MOVE_ASK.test(question)) {
    return studioAnswer({
      text: 'I can propose a move, and you would approve it. Nothing is rescheduled until you press Approve — I am not able to move a post myself, by design.',
      citations: [{ label: 'This week’s calendar', href: '/app/calendar' }],
      proposals: [
        {
          kind: 'move-post',
          summary: 'Move the Thursday post to Tuesday, same platform, same time of day',
          detail:
            'Tuesday has done better for this account than Thursday across the last four weeks of posts. The move keeps the platform and the time of day, so only the date changes. On approval this runs the same reschedule as dragging the chip by hand, and the move is logged.',
          requiresApproval: true,
        },
      ],
      refusal: null,
      handoff: null,
    })
  }

  if (SWAP_ASK.test(question)) {
    return studioAnswer({
      text: 'I can propose a different format and show you both side by side before anything is made. Approving it queues a remake; dismissing it changes nothing.',
      citations: [{ label: 'Formats, ranked', href: '/app/results' }],
      proposals: [
        {
          kind: 'swap-format',
          summary: 'Remake this post as “Myth vs fact” instead',
          detail:
            'That format has the better sends-per-thousand of the two on this account. A remake takes the structure only — new script, your footage, your voice — and it still has to pass Compliance before it can be scheduled.',
          requiresApproval: true,
        },
      ],
      refusal: null,
      handoff: null,
    })
  }

  if (PAUSE_ASK.test(question)) {
    return studioAnswer({
      text: 'I can propose pausing an account, and it takes your approval. While an account is paused the Publisher stops posting there and nothing else changes — the drafts, the schedule and the connection all stay as they are.',
      citations: [{ label: 'Connected accounts', href: '/app/accounts' }],
      proposals: [
        {
          kind: 'pause-account',
          summary: 'Pause posting on one connected account',
          detail:
            'The Publisher stops putting posts out on that account until you unpause it. Scheduled posts stay scheduled rather than being deleted, and the other accounts are untouched. You can unpause from the accounts screen at any time.',
          requiresApproval: true,
        },
      ],
      refusal: null,
      handoff: null,
    })
  }

  if (HOLD_ASK.test(question)) {
    return studioAnswer({
      text: 'Compliance holds a video before it can reach the calendar and says which rule it applied — copied footage, copied audio, copied wording over the similarity limit, a missing consent record, a missing AI label, or a promise about results written into a caption. The post itself carries the reason. You can fix it and send it back through, or override the hold yourself; either way the override is logged.',
      citations: [{ label: 'What the Compliance agent checks', href: '/how-it-works' }],
      proposals: [],
      refusal: null,
      handoff: null,
    })
  }

  if (HOOK_ASK.test(question)) {
    return studioAnswer({
      text: 'Here is a draft, and it is a draft — nothing is scheduled from it. “Most people get this backwards.” Then the correction in one line, then one piece of proof from your own work. Every script has to cite at least one true fact about your business, so the proof line is the part I cannot write for you.',
      citations: [{ label: 'Formats, ranked', href: '/app/results' }],
      proposals: [],
      refusal: null,
      handoff: null,
    })
  }

  if (FORECAST_ASK.test(question)) {
    return studioAnswer({
      text: 'I can tell you what happened, not what is going to. I only read rows this workspace already holds, and there is no row for next quarter — anything I said about it would be a guess wearing the clothes of a measurement. Ask me what a KPI did and I will read it back with its source and how fresh it is.',
      citations: [],
      proposals: [],
      refusal: 'forecast',
      handoff: { label: 'Ask the Concierge', href: '/app/home' },
    })
  }

  const fact = matchFact(question)
  if (!fact) {
    return studioAnswer({
      text: 'I do not have a row for that, so I am not going to put a number on it. I can only tell you things this workspace actually holds — if you point me at a screen or name a KPI, I will read it back with its source.',
      citations: [],
      proposals: [],
      refusal: 'outside-corpus',
      handoff: { label: 'Ask the Concierge', href: '/app/home' },
    })
  }

  return studioAnswer({
    text: `${fact.label}: ${fact.value} The source is ${fact.source}.`,
    citations: [factCitation(fact)],
    proposals: [],
    refusal: null,
    handoff: null,
  })
}

/* -------------------------------------------------------------------------- */
/* Two questions in one message                                                */
/* -------------------------------------------------------------------------- */

/**
 * The separate questions inside one message.
 *
 * People do not ask one thing at a time. "Can you guarantee 10k followers?
 * And how much is Creator?" is two questions with different answers — a
 * refusal and a price — and answering only the first leaves the visitor
 * thinking we dodged the second.
 *
 * **Splitting is deliberately conservative.** A question mark is a reliable
 * boundary; the word "and" is not — "leads and bookings" is one question, and
 * splitting it would produce two halves that retrieve nothing. So "and" only
 * splits when what follows announces itself as a question: it opens with an
 * interrogative or a modal, and it has enough words to retrieve against.
 *
 * Three parts at most. A message with five questions in it gets the first two
 * answered properly and a handoff, which is a better outcome than five
 * sentences of nothing.
 */
const QUESTION_OPENER =
  /^(?:and\s+)?(?:how|what|when|where|which|who|why|can|could|do|does|did|will|would|should|is|are|am)\b/i

/** Enough words that retrieval has something to work with. */
const MINIMUM_PART_WORDS = 3

const MAXIMUM_PARTS = 3

export function questionParts(question: string): readonly string[] {
  const bySentence = question
    .split(/[?;]+/)
    .map((part) => part.trim())
    .filter((part) => part.split(/\s+/).filter(Boolean).length >= MINIMUM_PART_WORDS)

  const parts = bySentence.length > 0 ? bySentence : [question.trim()]

  // One sentence can still be two questions: "…followers and how much is
  // Creator". Only split where the second half announces itself.
  const split = parts.flatMap((part) => {
    const match = part.match(/^(.*?[^,\s])\s*,?\s+and\s+(.+)$/i)
    if (!match) return [part]

    const [, first = '', second = ''] = match
    const isSecondAQuestion =
      QUESTION_OPENER.test(second) && second.split(/\s+/).filter(Boolean).length >= MINIMUM_PART_WORDS
    const isFirstLongEnough = first.split(/\s+/).filter(Boolean).length >= MINIMUM_PART_WORDS

    return isSecondAQuestion && isFirstLongEnough ? [first, second] : [part]
  })

  return split.slice(0, MAXIMUM_PARTS)
}

/** Two answers are the same answer when they refuse alike and cite alike. */
function isSameAnswer(first: CopilotAnswer, second: CopilotAnswer): boolean {
  if (first.refusal !== second.refusal) return false
  return first.citations[0]?.href === second.citations[0]?.href
}

/**
 * Answer the second question too, or say plainly which one has not been.
 *
 * 18 §3.1 and §3.2: an answer may be a refusal and a handoff, and both are
 * success states — what is *not* allowed is leaving half a question on the
 * floor without saying so. Where the second part has its own answer in the
 * corpus it is given, with its own citation. Where it does not, its own
 * "I cannot answer that from our pages" text is what gets appended, which
 * names the part being refused and carries the handoff with it.
 */
function withSecondPart(
  parts: readonly string[],
  answerFor: (part: string) => CopilotAnswer,
): CopilotAnswer {
  const primary = answerFor(parts[0] ?? '')
  const second = parts[1]
  if (!second) return primary

  const secondary = answerFor(second)
  if (isSameAnswer(primary, secondary)) return primary

  const citations = [...primary.citations]
  for (const citation of secondary.citations) {
    if (!citations.some((entry) => entry.href === citation.href)) citations.push(citation)
  }

  return {
    ...primary,
    text: `${primary.text}\n\nOn the other half of your question — “${second.trim()}” — ${secondary.text}`,
    citations,
    // A refusal anywhere in the reply is a refusal: the category has to
    // survive, or §8's tests would stop seeing the thing they guard.
    refusal: primary.refusal ?? secondary.refusal,
    handoff: primary.handoff ?? secondary.handoff,
    proposals: primary.proposals.length > 0 ? primary.proposals : secondary.proposals,
  }
}

/** Whichever surface asked. */
export function cannedAnswer(surface: CopilotSurface, question: string): CopilotAnswer {
  const answerFor = surface === 'site' ? cannedSiteAnswer : cannedStudioAnswer
  return withSecondPart(questionParts(question), answerFor)
}
