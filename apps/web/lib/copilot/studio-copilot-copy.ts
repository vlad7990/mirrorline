/**
 * Every word the studio co-pilot's UI says in its own voice.
 *
 * Beside `site-copilot-copy.ts` and for the same two reasons: the
 * banned-phrase sweep reads source files rather than JSX, and Vitest cannot
 * import a `.tsx` under `jsx: "preserve"`, so a sentence that needs a test has
 * to live outside the component that renders it.
 *
 * **It is a separate file rather than a second branch of the website's**,
 * because almost nothing is shared. The website bot answers from published
 * pages and hands off to a person; this one answers from the signed-in
 * client's own rows and proposes changes to their account. The two sentences
 * that *are* the same shape — what to say when a request does not get through
 * — are the two `stream.ts` takes as an argument, and they still differ: the
 * website offers a call, the studio does not, because the person reading this
 * one is already a client with a human they can reach.
 */

import { AI_TAG } from './site-copilot-copy'

export { AI_TAG }

export const STUDIO_COPILOT_COPY = {
  /** ⌘K opens it; this is what the button and the header say. */
  launcherLabel: 'Ask Milo',
  launcherAria: 'Ask Milo about this account — AI assistant',
  panelTitle: 'Ask Milo',
  closeLabel: 'Close the assistant',

  /**
   * The header line, which states the limit before the first question.
   *
   * 18 §2.2 and §2.3 in one sentence: answers come from the rows on these
   * screens and cite them, and the co-pilot can propose but never act.
   */
  grounding:
    'An AI assistant. It answers from this account’s own rows, names the row each figure came from, and can propose changes — it cannot make them.',

  /** §3.3's privacy rule applies to both surfaces. */
  privacy:
    'Nothing here is stored. This conversation stays in this tab and goes when you close it.',

  emptyState:
    'Ask about this week’s numbers, why something was held, or what to change — and I will show you the row I read it from.',
  suggestionsLabel: 'Try one of these',
  suggestions: [
    'How is follower growth going this month?',
    'Can you move my Thursday post to Tuesday?',
    'Why was this video held?',
  ],

  questionLabel: 'Your question',
  questionPlaceholder: 'Ask about this account',
  submitLabel: 'Ask',
  sendingLabel: 'Asking…',
  thinking: 'Reading your rows…',

  youSaid: 'You asked',
  citationsLabel: 'Rows this came from',

  /** The ⌘K hint, shown on the trigger so the shortcut is discoverable. */
  shortcutHint: '⌘K',
  shortcutAria: 'Press Command K to open the assistant',

  /* ----------------------------------------------------------------------- */
  /* Proposals (18 §2.3)                                                      */
  /* ----------------------------------------------------------------------- */

  proposalsLabel: 'Proposed, waiting on you',
  approveLabel: 'Approve',
  dismissLabel: 'Dismiss',

  /**
   * Said on the card, before either button is pressed.
   *
   * §2.3: "Nothing happens until Approve is pressed." The card says so in
   * advance rather than only confirming afterwards, because the sentence that
   * matters is the one read before the press.
   */
  proposalNote: 'Nothing happens until you press Approve.',

  /**
   * What a performed move changes, and what it does not.
   *
   * It said "Sample data, not saved" until B2.2, when the move became a write
   * to `scheduled_posts`. The second half of that sentence is the half that is
   * still true and still worth saying: the schedule changed, and nothing was
   * published, because the Publisher does not exist yet.
   */
  approvedMove: 'Moved on the calendar and saved. Nothing has been published.',

  /**
   * When the write is refused.
   *
   * A proposal card that reported a move it did not make would be the one
   * failure §2.3 is written to prevent, and an optimistic confirmation is
   * exactly how that happens by accident. So the panel corrects itself.
   */
  approvedMoveFailed: 'Not moved — the calendar refused it. The post is still where it was.',

  /**
   * What the other two kinds say instead of acting.
   *
   * `swap-format` would queue a remake and `pause-account` would stop the
   * Publisher, and neither screen exists. Approving one says so rather than
   * reporting a success: a confirmation for a thing that did not happen is
   * the one failure a proposal card must not have.
   */
  approvedNotBuilt:
    'Noted. This one is not wired up yet, so nothing has run — it needs the screen that performs it.',

  dismissed: 'Dismissed. Nothing ran.',

  /* ----------------------------------------------------------------------- */
  /* Failure (18 §7)                                                          */
  /* ----------------------------------------------------------------------- */

  /**
   * No call to book here, unlike the website.
   *
   * §7 gives the studio "Says it could not reach the model" and gives the
   * website a link to a call. The person reading this is already a client.
   */
  transportFailure: 'I could not reach the model just then. Try again in a moment.',
  rateLimited: 'That is a lot of questions in a short space of time. Try again in a minute.',

  /* ----------------------------------------------------------------------- */
  /* Mode                                                                     */
  /* ----------------------------------------------------------------------- */

  sampleBadge: 'Sample answers',
  sampleExplainer:
    'No model is connected here, so the replies are scripted from this account’s sample rows rather than generated.',
} as const
