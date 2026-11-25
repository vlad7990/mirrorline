/**
 * What may be asked of a generator, and what the client is told when it may not.
 *
 * ============================================================================
 * A prompt is a request; a check is a rule
 * ============================================================================
 *
 * `video-idea.ts` says it first and this module is the second application:
 * the model is *told* the rules — `scenePrompt` frames every request as an
 * allow-list — **and** the rules are enforced here as functions over data. A
 * draft that passes first time is cheaper than one the provider refuses, so
 * both halves pay for themselves. But only one of them is a gate.
 *
 * ============================================================================
 * It rejects rather than rewrites
 * ============================================================================
 *
 * The tempting alternative is to strip the offending words and call the
 * provider anyway. That produces a scene nobody asked for and — worse — it
 * hides the fact that a rule fired. A client who wrote "a trainer wearing
 * Nike" and silently got a trainer wearing nothing recognisable has been
 * quietly overruled by software. D129's lesson applies: a gate whose failures
 * are invisible is indistinguishable from a gate that never fires.
 *
 * ============================================================================
 * Two audiences, two strings
 * ============================================================================
 *
 * `reason` is for the log and **never contains the prompt**.
 * `agent_runs.reason`'s own comment is the rule: *"Never the prompt and never
 * the question — 18 §3.3 is that questions are not logged with identifiers…
 * 'cap reached' belongs here; the client's text does not."*
 *
 * `message` is for the person reading the screen, and it *may* quote what
 * matched — they wrote the sentence and they are the one who has to change it.
 * The distinction is the audience, not squeamishness, and `safety.test.ts`
 * asserts both directions: that no distinctive word of a refused prompt
 * reaches `reason`, and that the matched term does reach `message`.
 */

import { findBannedClaims } from '../copy/banned-phrases'
import type { BrandKit, GenerationRequest } from './types'

/**
 * Which rule fired. Named rather than boolean, because the studio shows the
 * client *what* to change and a single "refused" could not.
 */
export type SafetyRule =
  | 'empty'
  | 'too-long'
  | 'named-person'
  | 'identifiable-person'
  | 'brand-or-logo'
  | 'banned-claim'

export type SafetyVerdict =
  | { readonly allowed: true }
  | {
      readonly allowed: false
      readonly rule: SafetyRule
      /** For the log. Names the rule, never the sentence. */
      readonly reason: string
      /** For the client. May quote what matched. */
      readonly message: string
    }

/**
 * The longest scene description we will send.
 *
 * Not a provider limit — it is the ceiling that keeps a runaway prompt from
 * becoming a runaway bill, in the unit the mistake is made in. A B-roll scene
 * is a sentence or two; six hundred characters is generous for one and
 * obviously wrong for a pasted transcript.
 */
export const MAX_PROMPT_CHARS = 600

/**
 * Marks we will not render, as a floor rather than a ceiling.
 *
 * **Ambiguous common nouns are deliberately absent.** `apple`, `shell`,
 * `dove`, `visa`, `puma` and `supreme` are all marks and all ordinary English
 * words, and a filter that refused "a sliced apple on a board" would be wrong
 * about the sentence. Worse, it would teach the script agent to avoid ordinary
 * nouns — a drift we would never see, in exchange for a trademark risk nobody
 * has ever been sued over for filming fruit.
 *
 * So the list holds marks that are *only* marks. It will be incomplete
 * forever, which is why it is one rule of several rather than the whole
 * defence, and why the framing in `scenePrompt` asks the model for no brands
 * at all.
 */
const KNOWN_MARKS: readonly string[] = [
  'nike',
  'adidas',
  'reebok',
  'starbucks',
  'mcdonald',
  'burger king',
  'coca-cola',
  'pepsi',
  'gucci',
  'prada',
  'chanel',
  'rolex',
  'louis vuitton',
  'disney',
  'marvel',
  'pixar',
  'lego',
  'ikea',
  'tesla',
  'ferrari',
  'porsche',
  'lamborghini',
  'the north face',
  'lululemon',
]

/**
 * People we will not depict, as the same kind of floor.
 *
 * A deny-list of public figures cannot be complete and is not trying to be.
 * The patterns below do the structural work — "looks like", "lookalike",
 * "deepfake", a title-led name — and this catches the common case of a name
 * dropped in with no structure around it.
 *
 * The obvious-seeming alternative was a heuristic: flag any capitalised
 * two-word phrase not in the client's own profile. It was rejected because it
 * refuses "Golden Retriever", "New York" and "Border Collie", which is most of
 * what a dog trainer's B-roll is about.
 */
const KNOWN_FIGURES: readonly string[] = [
  'taylor swift',
  'elon musk',
  'donald trump',
  'joe rogan',
  'mrbeast',
  'oprah',
  'zendaya',
  'beyonce',
  'cristiano ronaldo',
  'lionel messi',
  'kim kardashian',
  'tom cruise',
  'dwayne johnson',
  'kanye',
  'rihanna',
]

/**
 * Asking for a real person by structure rather than by name.
 *
 * Case-sensitive where a capital is the signal: "looks like Elon" is a person
 * and "looks like rain" is weather, and the only thing separating them in a
 * prompt is the capital letter. Same for "in the style of Annie Leibovitz"
 * versus "in the style of a 1970s documentary" — the second is a legitimate
 * and useful instruction, and a case-insensitive pattern would lose it.
 */
const PERSON_PATTERNS: readonly RegExp[] = [
  /\bdeepfakes?\b/i,
  /\blook[\s-]?alikes?\b/i,
  /\blooks?\s+like\s+[A-Z][a-z]+/,
  /\bin\s+the\s+style\s+of\s+[A-Z][a-z]+\s+[A-Z][a-z]+/,
  /\bimpersonat\w*/i,
  /\bcelebrit(?:y|ies)\b/i,
  /\bfamous\s+(?:person|people|actor|actress|singer|musician|athlete|influencer)\b/i,
  // The title is written both ways by hand rather than with an `i` flag, and
  // that is forced rather than clumsy: the flag would apply to the whole
  // pattern and make `[A-Z]` match a lowercase letter, losing the capital on
  // the *name* — which is the only part of "President Vance" that
  // distinguishes it from "president of the club".
  /\b(?:[Pp]resident|[Ss]enator|[Gg]overnor|[Mm]ayor|[Pp]rince|[Pp]rincess|[Kk]ing|[Qq]ueen|[Pp]ope|[Pp]rofessor)\s+[A-Z][a-z]+/,
]

/**
 * Asking for a face we would have to have consent for.
 *
 * **Non-negotiable 5, and the honest reading of it.** We hold no consent
 * records, so "a generic person" is not a safe harbour — it is an unverifiable
 * claim about a face a model invented, which may or may not resemble somebody
 * real. The allowed subset is therefore people-*adjacent* rather than
 * people-free: hands, silhouettes, backs of heads, crowds at distance. None of
 * those is a likeness.
 *
 * Note what is not here: a bare `\bperson\b`. "A silhouette of a person on a
 * hill" is exactly the shot this module exists to permit, and a rule that
 * refused the word would refuse the allowed subset along with the banned one.
 */
const IDENTIFIABLE_PATTERNS: readonly RegExp[] = [
  /\btalking\s+head\b/i,
  /\b(?:speaking|talking)\s+to\s+(?:the\s+)?camera\b/i,
  /\b(?:piece|face)\s+to\s+camera\b/i,
  /\bspokes(?:person|man|woman|model)\b/i,
  /\bpresenter\b/i,
  /\blip[\s-]?sync\w*/i,
  /\brecogni[sz]able\s+face\b/i,
  /\bclose[\s-]?up\s+(?:of|on)\s+(?:a|the|her|his)?\s*face\b/i,
  /\bportrait\s+of\s+(?:a|the)\s+(?:man|woman|person|girl|boy)\b/i,
  /\b(?:man|woman)\s+(?:looking|smiling)\s+at\s+the\s+camera\b/i,
]

/**
 * Asking for a mark by structure.
 *
 * There is deliberately no `wearing\s+[A-Z][a-z]+` here, though it would have
 * caught the test's "wearing Nike". It also catches "wearing Wellington
 * boots", which is a real scene somebody will legitimately want, and the mark
 * list catches the Nike case anyway. Where a capitalisation heuristic and a
 * name list reach the same verdict, the name list is the one that does not
 * also refuse the innocent sentence.
 */
const MARK_PATTERNS: readonly RegExp[] = [
  /\blogos?\b/i,
  /\btrade[\s-]?marks?(?:ed)?\b/i,
  /\bbrand\s+(?:name|mark|logo)\b/i,
  /\bbranded\s+(?:packaging|merchandise|apparel)\b/i,
]

function refuse(rule: SafetyRule, reason: string, message: string): SafetyVerdict {
  return { allowed: false, rule, reason, message }
}

/**
 * The client's own name, removed before the mark rules run.
 *
 * A client called "Nike Dog Training" is entitled to appear in their own
 * video, and the mark list cannot tell their name from the sportswear
 * company's. Stripping it first means the rules only ever see *other people's*
 * marks — which is what they are actually about.
 */
function withoutOwnBrand(prompt: string, brand: BrandKit): string {
  if (!brand.brandName) return prompt
  const escaped = brand.brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return prompt.replace(new RegExp(escaped, 'gi'), ' ')
}

function firstMatch(text: string, needles: readonly string[]): string | null {
  const lower = text.toLowerCase()
  for (const needle of needles) {
    if (lower.includes(needle)) return needle
  }
  return null
}

/**
 * May this prompt be sent.
 *
 * Checks run cheapest-and-most-certain first, so the rule the client is shown
 * is the clearest one rather than whichever regex happened to be earlier in a
 * list. A prompt that breaks three rules is refused for the first; telling
 * somebody all three at once is a worse screen than telling them one and
 * letting them fix it.
 */
export function screenPrompt(prompt: string, brand: BrandKit): SafetyVerdict {
  const trimmed = prompt.trim()

  if (trimmed === '') {
    return refuse(
      'empty',
      'the request carried no scene to generate',
      'There is nothing here to generate yet. Describe the scene in a sentence.',
    )
  }

  if (trimmed.length > MAX_PROMPT_CHARS) {
    return refuse(
      'too-long',
      `the scene description ran past the ${MAX_PROMPT_CHARS}-character ceiling`,
      `That scene description is too long — keep it under ${MAX_PROMPT_CHARS} characters. One or two sentences is what works best.`,
    )
  }

  const figure = firstMatch(trimmed, KNOWN_FIGURES)
  if (figure) {
    return refuse(
      'named-person',
      'the scene named a real public figure',
      `We cannot generate a real person’s likeness — “${figure}” has to come out. There is no consent record for anyone outside your own team, so this is a no from us rather than from the model.`,
    )
  }

  if (PERSON_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return refuse(
      'named-person',
      'the scene asked for the likeness of a real individual',
      'We cannot generate a real person’s likeness, or anything asked to resemble one. Describe the scene without that reference and we will make it.',
    )
  }

  if (IDENTIFIABLE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return refuse(
      'identifiable-person',
      'the scene asked for an identifiable individual, and no consent record exists',
      'We only generate scenes with no identifiable faces in them. Hands, a silhouette, an object or a wide shot all work — or film that moment yourself and we will cut it in.',
    )
  }

  const ownBrandRemoved = withoutOwnBrand(trimmed, brand)

  const mark = firstMatch(ownBrandRemoved, KNOWN_MARKS)
  if (mark) {
    return refuse(
      'brand-or-logo',
      'the scene referred to a third party’s mark',
      `We keep other companies’ marks out of your videos — “${mark}” has to come out. Their trademark becomes your problem the moment it is on your account.`,
    )
  }

  if (MARK_PATTERNS.some((pattern) => pattern.test(ownBrandRemoved))) {
    return refuse(
      'brand-or-logo',
      'the scene asked for a mark to be drawn',
      'We do not have the model draw logos — it produces a wrong one, and a wrong logo is worse than none. Your real mark is added at the render step, from the file you gave us.',
    )
  }

  const claim = findBannedClaims(trimmed)[0]
  if (claim) {
    return refuse(
      'banned-claim',
      `the scene would render a claim we do not make (${claim.id})`,
      `That scene would put a claim on screen that we do not make. ${claim.why}`,
    )
  }

  return { allowed: true }
}

/**
 * The scene as the provider is asked for it: an allow-list, not a deny-list.
 *
 * The ordering matters more than it looks. The scene goes **first**, because it
 * is what the model should attend to, and the constraints follow as
 * constraints. A prompt that opens with four prohibitions produces a cautious,
 * empty-looking shot — the model spends its attention on what to avoid.
 *
 * It repeats rules `screenPrompt` has already enforced, and that duplication is
 * intentional and cheap: the gate stops the *request* that breaks a rule, and
 * this stops the *output* that breaks one the gate could not see coming. A
 * scene described innocently can still come back with a face in it.
 */
export function scenePrompt(request: GenerationRequest): string {
  const { prompt, brand } = request
  const lines: string[] = [prompt.trim()]

  if (brand.look) lines.push(`Look: ${brand.look}.`)
  if (brand.captionStyle) {
    // Not an instruction to render a caption — the renderer burns those. It
    // tells the model to leave the room they will need.
    lines.push('Leave the lower third of the frame uncluttered for captions.')
  }
  if (brand.avoid.length > 0) lines.push(`Never show: ${brand.avoid.join(', ')}.`)

  lines.push(
    'Constraints: no identifiable faces, no logos, trademarks or brand marks, no on-screen text, no recognisable real people.',
  )

  return lines.join('\n')
}
