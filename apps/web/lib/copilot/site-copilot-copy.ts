/**
 * Every word the website co-pilot's UI says in its own voice.
 *
 * In a `.ts` module for two reasons, and both have bitten this repo before.
 * The banned-phrase sweep reads source files, and copy buried in a component
 * is copy the sweep has to dig out of JSX. And Vitest cannot import a `.tsx`
 * at all under `jsx: "preserve"`, so a sentence that needs a test has to live
 * outside the component that renders it.
 *
 * The answers themselves are not here — those come from the server, grounded
 * in `grounding.ts`'s corpus. This is only the chrome: the label on the
 * launcher, what the panel says before anyone has asked anything, and what it
 * says when the request did not get through.
 */

/**
 * 18 §3.3: "Always labelled AI, on the launcher and in the panel header. Not
 * a disclaimer in a footer." So the tag is part of both labels rather than a
 * line somebody has to scroll to find.
 */
export const AI_TAG = 'AI'

export const SITE_COPILOT_COPY = {
  /**
   * On the floating button, and in its accessible name.
   *
   * The mascot's name is in the label because the mascot is on the button: a
   * picture of a character beside the words "Ask about Mirrorline" leaves a
   * screen-reader user with no idea there is a character at all. "Ask Milo
   * about Mirrorline — AI assistant" says who, about what, and what he is, in
   * that order, and keeps the AI label where §3.3 wants it.
   */
  launcherLabel: 'Ask Milo',
  launcherAria: 'Ask Milo about Mirrorline — AI assistant',
  panelTitle: 'Ask Milo about Mirrorline',
  closeLabel: 'Close the assistant',

  /**
   * The bubble, once a visit, three seconds in.
   *
   * It offers and it does not promise: "about Mirrorline" names the subject,
   * which is the same limit `grounding` states — this assistant answers from
   * our own pages. "Ask me anything", unqualified, is the sentence a refusal
   * later contradicts.
   *
   * No exclamation mark: 02's voice is plain, and a mascot shouting hello at
   * someone three seconds into reading is the register we are avoiding.
   */
  greeting: "Hi, I'm Milo — ask me anything about Mirrorline",
  greetingDismiss: 'Dismiss Milo’s greeting',

  /**
   * The header line. It states the limit before the first question rather
   * than after a disappointing answer: §3.1 is that this bot answers from our
   * own published pages or not at all.
   */
  grounding:
    'An AI assistant. It answers from our own published pages — the services, the plans and the FAQ — and says so plainly when the answer is not in them.',

  /** §3.3: "the transcript lives in the tab and dies with it." */
  privacy:
    'Nothing here is stored. This conversation stays in this tab and goes when you close it.',

  emptyState: 'Ask about the plans, how the work actually gets done, or what we will not do.',
  suggestionsLabel: 'Try one of these',
  suggestions: [
    'What does the Growth plan include every month?',
    'Where do the videos come from if I do not send any?',
    'Will I get 10,000 followers?',
  ],

  questionLabel: 'Your question',
  questionPlaceholder: 'Ask a question about Mirrorline',
  submitLabel: 'Ask',
  sendingLabel: 'Asking…',
  thinking: 'Reading our pages…',

  youSaid: 'You asked',
  citationsLabel: 'Where this came from',
  handoffLead: 'If that is not enough:',

  /**
   * What we say when the request itself did not get through.
   *
   * Only transport failures land here. A refusal is an answer and never
   * reaches this text — see `transcript.ts`.
   */
  transportFailure:
    'I could not reach the answer service just then. Try again in a moment, or talk to a person.',
  /** The server sends its own words for a rate limit; this is the fallback. */
  rateLimited: 'That is a lot of questions in a short space of time. Try again in a minute.',
  /** Where a failed answer sends someone, because a dead end is not an answer. */
  failureHandoff: { label: 'Talk to a person', href: '/niche-scan' },

  /**
   * The mode label, read from `/api/copilot/status` and never inferred.
   *
   * Non-negotiable 7 puts demo data in the open on public pages, and §4 makes
   * sample mode the supported state rather than a degraded one — so it is
   * named, calmly, and the panel still works.
   */
  sampleBadge: 'Sample answers',
  sampleExplainer:
    'No model is connected to this preview, so the replies are scripted from our own pages rather than generated.',
} as const
