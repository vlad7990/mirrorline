/**
 * What each co-pilot is allowed to know, assembled from the modules that
 * already hold it (spec 18 §3.1, §5, §9.3).
 *
 * Two different jobs, and they are different on purpose.
 *
 * **The website corpus** is the whole of what the public bot may say. 18 §3.1:
 * "it answers only from a corpus built out of our own published pages … No
 * open-web knowledge, no inference from the model's training." So this module
 * *is* the bot's world, and anything missing from it is a question the bot
 * answers with "I don't know, here is a person" — which §3.1 calls a success
 * state.
 *
 * **The studio facts** are rows we hold about one workspace, each carrying the
 * screen it lives on. 18 §2.2 is the rule they exist for: every factual
 * sentence has to carry the thing it came from, "not a footnote: a visible
 * chip the reader can click". A fact with no `href` could not be cited, so the
 * type does not allow one.
 *
 * ## Read from the modules, never copied
 *
 * 18 §9.3 says it plainly: "whoever builds the corpus should read it from the
 * content modules rather than copying prose, or the bot will answer from a
 * site that no longer exists". PR F rewrote sixteen inner pages in a day; a
 * corpus with its own copy of that prose would have been wrong by the
 * evening. Every section below is derived, and the one module that had to
 * change to make that possible was the FAQ — see `faq-text.ts`.
 *
 * ## What is deliberately left out, and why that is the interesting part
 *
 * **Every sample figure.** `PROOF_CARDS` is a fictional client's week,
 * `SAMPLE_RECIPE`'s scores are invented, `SHOWCASE_CARDS` are hooks from
 * accounts that do not exist, and `FeatureTab.stat` is a figure in the
 * machine's voice. All four are honestly labelled on the page — and all four
 * would stop being honest the moment a bot read them back as an answer,
 * because the label is in the section around them and a quoted sentence
 * leaves it behind. Non-negotiable 7 forbids invented customer results, and
 * 18 §3.2 makes "what did you do for X?" a refusal. A corpus that contained
 * those numbers would make that refusal impossible to keep. A test asserts
 * they are absent.
 *
 * **The articles under `/resources/<slug>`.** They are our own pages, so
 * §9.3's wording would admit them, but D53's standard for going there is
 * "useful without us" and a test asserts no article names the product. They
 * are general advice, and a grounded bot quoting them would be doing exactly
 * the "generally, companies like this…" that §3.1 rules out.
 *
 * The **library** on `/resources` itself is a different thing and is in: the
 * glossary defines the words our own KPIs use, and the four templates are
 * printed on the page precisely so that anybody can have them. "What is a
 * send?" answered out of our own glossary is the corpus working.
 *
 * **The rules the bot must follow.** Those are not facts, so they are not
 * here; they live in the system prompt beside the corpus. Facts in the
 * corpus, conduct in the prompt.
 *
 * ## No SDK, on purpose
 *
 * The real token count §5 demands is a `messages.countTokens` call, and
 * `adapter.ts` is the only module allowed to import the SDK (18 §4). So
 * `measureCorpus` takes the counter as an argument rather than reaching for a
 * client. That keeps this module importable by a test, by a route handler and
 * by anything else, with no key and no network.
 */

import { formatKpiValue } from '@/components/kpi/kpi-types'
import {
  KPI_DEFINITIONS,
  SAMPLE_HEADLINE_KPIS,
  SAMPLE_KPIS,
} from '@/components/kpi/sample-dashboard'
import { LOOP_CLOSING_LINE, PUBLIC_AGENTS } from '@/components/marketing/agents'
import { allAnswerCombinations, recommend } from '@/components/marketing/decision-helper-content'
import { FAQ_ENTRIES, faqAnswerText } from '@/components/marketing/faq-text'
import { AUDIENCES, FEATURE_TABS } from '@/components/marketing/home-content'
import { GLOSSARY, TEMPLATES } from '@/components/marketing/resources/library'
import {
  CHANGE_FACTS,
  CONTRAST_ROWS,
  INPUT_ROUTES,
  PROBLEM_CARDS,
  SCAN_STEPS,
} from '@/components/marketing/home/problem-content'
import { PRICING_NOTE, PRICING_TIERS, perDayUsd } from '@/components/marketing/pricing-tiers'
import { PRODUCT_TOUR } from '@/components/marketing/product-tour-content'

import { GOALS } from '../audience/account-type'
import { RAISED_ALERTS } from '../studio/insights'

/**
 * One retrievable chunk of the website corpus.
 *
 * `route` is not decoration: 18 §3.1 wants an answer that quotes our own page,
 * and a quote the visitor cannot go and check is the thing we are trying not
 * to be. C2 renders it as the link under an answer.
 */
export interface CorpusSection {
  readonly id: string
  readonly heading: string
  /** The public page this came from. */
  readonly route: string
  readonly body: string
}

function bullets(lines: readonly string[]): string {
  return lines.map((line) => `- ${line}`).join('\n')
}

/** The plans, with the per-day figure `/pricing` derives rather than stores. */
function plansSection(): CorpusSection {
  const body = PRICING_TIERS.map((tier) => {
    const perDay = perDayUsd(tier)
    const price =
      perDay === null ? tier.price : `${tier.price} ${tier.period} (about $${perDay} a day)`
    const availability =
      tier.comingLaterLabel === null
        ? 'Available now.'
        : `Not open yet — ${tier.comingLaterLabel} only, and there is nothing to pay.`
    return [
      `${tier.name} — ${price}`,
      `  What it is: ${tier.summary}`,
      `  Best for: ${tier.bestFor}`,
      `  Includes: ${tier.includes.join('; ')}`,
      `  ${availability}`,
    ].join('\n')
  }).join('\n\n')

  return {
    id: 'plans',
    heading: 'The plans and what they cost',
    route: '/pricing',
    body: `${body}\n\n${PRICING_NOTE}`,
  }
}

/** The seven agents, from the module `/how-it-works` and `/` both render. */
function agentsSection(): CorpusSection {
  const body = PUBLIC_AGENTS.map((agent) =>
    [
      `${agent.step}. ${agent.name} — ${agent.short}`,
      `  What it does: ${agent.does}`,
      `  What it will not do: ${agent.limit}`,
      `  Where it sits: ${agent.inLoop}`,
    ].join('\n'),
  ).join('\n\n')

  return {
    id: 'agents',
    heading: 'The seven agents and the loop they run',
    route: '/how-it-works',
    body: `${body}\n\n${LOOP_CLOSING_LINE}`,
  }
}

/** The complaints we were built against, as categories — 11 §2, never a brand. */
function problemsSection(): CorpusSection {
  const complaints = PROBLEM_CARDS.map(
    (card) => `${card.problem} ${card.title} ${card.body} Our answer: ${card.answer}`,
  )
  const contrasts = CONTRAST_ROWS.map(
    (row) => `${row.category}: ${row.before} What we do instead: ${row.mirrorline}`,
  )

  return {
    id: 'problems',
    heading: 'What people tell us is wrong with the alternatives',
    route: '/compare',
    body: `${bullets(complaints)}\n\nBy category:\n${bullets(contrasts)}`,
  }
}

/** Why short-form changed, stated as rules because 11's figures move — see CHANGE_FACTS. */
function changeSection(): CorpusSection {
  return {
    id: 'what-changed',
    heading: 'What changed about short video',
    route: '/',
    body: bullets(CHANGE_FACTS.map((fact) => `${fact.headline} ${fact.body}`)),
  }
}

/** The two ways in, and the scan that starts either of them. */
function inputsSection(): CorpusSection {
  const routes = INPUT_ROUTES.map((route) =>
    [
      `${route.title}: ${route.body}`,
      `  ${route.detail.join('; ')}`,
      `  Best for: ${route.bestFor}`,
    ].join('\n'),
  ).join('\n\n')

  const scan = SCAN_STEPS.map((step) => `${step.number} ${step.title}: ${step.body}`)

  return {
    id: 'inputs',
    heading: 'The two ways material reaches us, and the Niche Scan',
    route: '/product',
    body: `${routes}\n\nThe Niche Scan:\n${bullets(scan)}`,
  }
}

/** Account types and goals — 13 §1 and 15 §2, the only segmentation there is. */
function segmentationSection(): CorpusSection {
  const types = AUDIENCES.map(
    (audience) =>
      `${audience.title}: ${audience.body} What they are buying: ${audience.goal}. Plan we pre-select: ${audience.plan}. Cadence: ${audience.cadence}.`,
  )
  const goals = GOALS.map((goal) => `${goal.label} — headline KPI: ${goal.headlineKpi}`)

  return {
    id: 'who-we-serve',
    heading: 'Who we serve, and the goals an account can pick',
    route: '/',
    body: [
      'We are industry-agnostic. There is no industry page and no list to fit into: the agents research whatever niche an account is in. Industry is asked once, in onboarding, in the client’s own words, and only so the Trend Scout can research it.',
      'We do not work on political content, gambling, crypto or adult content, and we do not work with anyone under 18. Regulated work — health, finance, legal, property — is served normally, with the matching rule pack switched on automatically and shown to the client.',
      `Account types:\n${bullets(types)}`,
      `Goals, one per account and optionally a second:\n${bullets(goals)}`,
    ].join('\n\n'),
  }
}

/** What the studio screens actually are, from the /product tour. */
function tourSection(): CorpusSection {
  return {
    id: 'the-app',
    heading: 'What the app does, screen by screen',
    route: '/product',
    body: bullets(PRODUCT_TOUR.map((stop) => `${stop.title} (${stop.path}): ${stop.body}`)),
  }
}

/**
 * Every answer `/compare`'s decision helper can give, including the ones that
 * send the visitor away.
 *
 * Derived by running the helper over all its answer combinations and keeping
 * one of each outcome, so the bot cannot recommend something the page would
 * not. The refusals are the valuable half: a visitor with no footage and no
 * intention of recording is told we are not for them, and a bot that did not
 * know that would sell to them.
 */
function recommendationsSection(): CorpusSection {
  const seen = new Map<string, string>()
  for (const answers of allAnswerCombinations()) {
    const outcome = recommend(answers)
    if (seen.has(outcome.id)) continue
    seen.set(
      outcome.id,
      `${outcome.title}: ${outcome.body}${
        outcome.isUs ? '' : ' (this is us saying we are not the right fit)'
      }`,
    )
  }

  return {
    id: 'is-it-for-you',
    heading: 'What we tell people who are deciding, including when we say no',
    route: '/compare',
    body: bullets([...seen.values()]),
  }
}

/**
 * The four stages of the loop as the home page tells them.
 *
 * `FeatureTab.stat` is left out: the field's own comment calls it "one figure,
 * in the machine's voice", and it is illustrative. The words around it are the
 * product.
 */
function stagesSection(): CorpusSection {
  return {
    id: 'the-four-stages',
    heading: 'The four stages, in order',
    route: '/',
    body: FEATURE_TABS.map((tab) =>
      [
        `${tab.number} ${tab.title} — ${tab.description}`,
        `  ${tab.headline} ${tab.headlineAccent}`,
        `  ${tab.body}`,
      ].join('\n'),
    ).join('\n\n'),
  }
}

/**
 * The glossary, which is where our KPI names are defined in plain words.
 *
 * `caveat` is carried through wherever a term has one. A definition shorn of
 * its caveat is the shape of answer this whole surface exists to avoid — the
 * caveats are usually the honest half ("this is not a measure of quality",
 * "the platforms count this differently").
 */
function glossarySection(): CorpusSection {
  return {
    id: 'glossary',
    heading: 'What the words mean',
    route: '/resources',
    body: bullets(
      GLOSSARY.map((entry) =>
        entry.caveat
          ? `${entry.term}: ${entry.definition} Caveat: ${entry.caveat}`
          : `${entry.term}: ${entry.definition}`,
      ),
    ),
  }
}

/**
 * The four templates, in full.
 *
 * They are printed on `/resources` rather than offered by email — D53: "there
 * is nothing to download because there is no file, and nothing to sign up for
 * because nothing is being withheld". A bot that holds them back would be
 * reintroducing the gate the page refuses to have.
 */
function templatesSection(): CorpusSection {
  return {
    id: 'templates',
    heading: 'The templates we give away, in full',
    route: '/resources',
    body: TEMPLATES.map((template) =>
      [
        `${template.title} — ${template.purpose}`,
        ...template.lines.map((line) => `  ${line}`),
        `  Note: ${template.note}`,
      ].join('\n'),
    ).join('\n\n'),
  }
}

/** The eleven questions, read out of the module the pages render. */
function faqSection(): CorpusSection {
  return {
    id: 'faq',
    heading: 'Frequently asked questions, with our answers',
    route: '/faq',
    body: FAQ_ENTRIES.map((entry) => `Q: ${entry.question}\nA: ${faqAnswerText(entry)}`).join(
      '\n\n',
    ),
  }
}

/**
 * The corpus, in the order a person would want to be told it.
 *
 * A function rather than a bare constant so a test can build it fresh, but
 * the rendered text is memoised below because it is the cached prefix and
 * must be byte-identical on every request (18 §6: a corpus that changes
 * invalidates the prefix and the bill is several times what it should be).
 */
export function buildSiteCorpus(): readonly CorpusSection[] {
  return [
    changeSection(),
    problemsSection(),
    inputsSection(),
    stagesSection(),
    agentsSection(),
    tourSection(),
    plansSection(),
    segmentationSection(),
    recommendationsSection(),
    glossarySection(),
    templatesSection(),
    faqSection(),
  ]
}

export const SITE_CORPUS: readonly CorpusSection[] = buildSiteCorpus()

/** One section as the model sees it, route included so an answer can cite it. */
export function renderCorpusSection(section: CorpusSection): string {
  return `## ${section.heading}\n[source: ${section.route}]\n\n${section.body}`
}

/**
 * The corpus as one block of text.
 *
 * **Nothing in here may vary between requests.** No date, no counter, no
 * random id: this string is the cached prefix, and 18 §6 asks us to watch
 * `cache_read_input_tokens` precisely because a prefix that moves costs money
 * silently. Everything derived here comes from static modules.
 */
export const SITE_CORPUS_TEXT: string = SITE_CORPUS.map(renderCorpusSection).join('\n\n')

/** Haiku 4.5 caches nothing below this. Verified against the live API reference. */
export const HAIKU_CACHE_MINIMUM_TOKENS = 4096

/** Sonnet 5's, for comparison. Four times lower, which is why §0 names both. */
export const SONNET_CACHE_MINIMUM_TOKENS = 1024

/**
 * The most characters a single token could plausibly be worth.
 *
 * Used only to compute a **lower bound** on the token count, for the case
 * where no API key exists and a real count cannot be taken. English prose
 * tokenises at roughly four characters per token; six is pessimistic enough
 * that punctuation and whitespace alone make it unreachable in practice. So
 * `chars / 6` is a number the real count is above, not an estimate of it.
 *
 * This is **not** the check 18 §5 asks for — that one is a real
 * `messages.countTokens` and lives in `measureCorpus` below. This is the
 * floor that holds while there is no key to count with, and it is deliberately
 * the pessimistic direction: it can tell us the corpus is definitely big
 * enough, and it can never wrongly tell us that.
 */
const PESSIMISTIC_CHARS_PER_TOKEN = 6

/** A count the real token count is guaranteed to exceed. */
export function corpusFloorTokens(text: string = SITE_CORPUS_TEXT): number {
  return Math.floor(text.length / PESSIMISTIC_CHARS_PER_TOKEN)
}

export interface CorpusMeasurement {
  readonly chars: number
  /** The real count, when one could be taken. */
  readonly tokens: number | null
  /** The guaranteed lower bound, always available. */
  readonly floorTokens: number
  readonly minimum: number
  /** True only when we know it clears — a floor above the minimum counts. */
  readonly cachesOnHaiku: boolean
  /** Written for a person, and for the handoff. */
  readonly reason: string
}

/** Counts tokens for real. `adapter.ts` supplies the SDK's implementation. */
export type TokenCounter = (text: string) => Promise<number>

/**
 * Measure the corpus against Haiku 4.5's cache minimum.
 *
 * Call with a counter and you get the real number 18 §5 requires. Call
 * without one — no key, so no counting — and you get the pessimistic floor,
 * which still answers the only question that matters in the loud direction.
 *
 * It returns rather than throws. The decision about what to do with a corpus
 * that would not cache belongs to the caller: a route handler should still
 * answer the visitor, and a test should fail.
 */
export async function measureCorpus(
  countTokens?: TokenCounter,
  text: string = SITE_CORPUS_TEXT,
): Promise<CorpusMeasurement> {
  const chars = text.length
  const floorTokens = corpusFloorTokens(text)
  const minimum = HAIKU_CACHE_MINIMUM_TOKENS

  if (!countTokens) {
    return {
      chars,
      tokens: null,
      floorTokens,
      minimum,
      cachesOnHaiku: floorTokens >= minimum,
      reason:
        floorTokens >= minimum
          ? `No token counter available, but ${chars} characters cannot be fewer than ${floorTokens} tokens, which clears Haiku 4.5's ${minimum}. Unverified by a real count until ANTHROPIC_API_KEY exists.`
          : `No token counter available, and ${chars} characters might be as few as ${floorTokens} tokens, which does not clear Haiku 4.5's ${minimum}. Treat the prefix as uncacheable until a real count says otherwise.`,
    }
  }

  const tokens = await countTokens(text)
  return {
    chars,
    tokens,
    floorTokens,
    minimum,
    cachesOnHaiku: tokens >= minimum,
    reason:
      tokens >= minimum
        ? `Counted ${tokens} tokens against Haiku 4.5's ${minimum} minimum. The prefix caches.`
        : `Counted ${tokens} tokens, below Haiku 4.5's ${minimum} minimum. Caching will silently do nothing and every question pays full price for the whole corpus.`,
  }
}

/**
 * One row the studio co-pilot may state, and the chip that proves it.
 *
 * 18 §2.2: "If a claim cannot be tied to a row we hold, the co-pilot says it
 * does not know." That rule is only enforceable if the thing it reads is
 * shaped so that an uncitable fact cannot exist — hence `label`, `source` and
 * `href` all being required.
 */
export interface StudioFact {
  readonly id: string
  /** What the chip says. A KPI name, a post id, a date range. */
  readonly label: string
  /** The fact itself, in words. */
  readonly value: string
  /** Where the number came from — the KPI's own `source` field. */
  readonly source: string
  /** The screen it lives on, so the chip can be clicked. */
  readonly href: string
}

const RESULTS_HREF = '/app/results'

function kpiFact(kpi: (typeof SAMPLE_KPIS)[number]): StudioFact {
  const { definition, value } = kpi

  if (value.state === 'not-connected') {
    return {
      id: definition.key,
      label: definition.name,
      value: `Not connected — ${value.missingSource} has not been linked, so there is no figure. It is not zero; nobody measured it.`,
      source: definition.source,
      href: RESULTS_HREF,
    }
  }

  const formatted = formatKpiValue(value.value, definition.unit)
  const basis =
    value.state === 'projected'
      ? `Projected, not measured — ${value.basis}.`
      : `Measured, captured ${value.capturedAt}.`

  return {
    id: definition.key,
    label: definition.name,
    value: `${formatted}. ${definition.formula}. ${basis}`,
    source: definition.source,
    href: RESULTS_HREF,
  }
}

/**
 * The facts about the demo workspace, each one citable.
 *
 * **These do not go in the cached system block.** 18 §5 puts only
 * `STUDIO_SYSTEM` behind `cache_control`, and that is the right split: a
 * workspace's numbers change, and a prefix that changes caches nothing. The
 * facts ride in the message instead, which is also what lets one cached
 * system prompt serve every workspace.
 */
export function buildStudioFacts(): readonly StudioFact[] {
  const headline = SAMPLE_HEADLINE_KPIS.map(kpiFact)
  const rest = SAMPLE_KPIS.filter(
    (kpi) => !headline.some((fact) => fact.id === kpi.definition.key),
  ).map(kpiFact)

  const alerts = RAISED_ALERTS.map((alert): StudioFact => {
    const definition = KPI_DEFINITIONS.find((entry) => entry.key === alert.kpiKey)
    return {
      id: `alert-${alert.id}`,
      label: definition?.name ?? alert.title,
      value: `Alert: ${alert.title}. ${alert.message}`,
      source: definition?.source ?? 'Our system',
      href: '/app/home',
    }
  })

  return [...headline, ...rest, ...alerts]
}

export const STUDIO_FACTS: readonly StudioFact[] = buildStudioFacts()

/** A fact as the model sees it, with the chip's label first so it can quote it. */
export function renderStudioFact(fact: StudioFact): string {
  return `- [${fact.label}] ${fact.value} (source: ${fact.source}; screen: ${fact.href})`
}
