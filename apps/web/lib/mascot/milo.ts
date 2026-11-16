/**
 * Milo — the mascot, his five states, and what each one is allowed to claim.
 *
 * "Milo 2.0, Mirrorline edition". The reference is
 * `docs/design/mascot/milo-concept-v2.png`; `milo-concept-v1-blue.png` is
 * superseded colours and is referenced nowhere.
 *
 * ## Why this file duplicates the manifest
 *
 * `scripts/mascot-assets.mjs` writes `public/mascot/manifest.json` and this
 * module says the same things in TypeScript. That looks like the duplication
 * the house style forbids, and it is deliberate: importing JSON into a client
 * component ships the whole manifest to the browser and gives the compiler no
 * way to know that `thinking` is a state and `thinkng` is not.
 *
 * The duplication is held honest by `milo.test.ts`, which reads the manifest
 * off disk and fails if the two disagree on a single filename or flag. So a
 * render landing without `isPlaceholder` being flipped is a failing test
 * rather than a placeholder quietly becoming the finished thing.
 *
 * ## The states are a view of the co-pilot's events, not a second machine
 *
 * `events.ts` already says what is happening — `meta`, `delta`, `proposal`,
 * `done`, `error` — and `miloStateFor` is a pure function from that to a
 * state. There is no timer, no reducer and nothing to keep in sync, because a
 * mascot that could disagree with the panel beside it is worse than no
 * mascot.
 *
 * It is also the seam a Rive file replaces later. A runtime that swaps images
 * today and drives a state machine tomorrow reads the same five names from
 * the same function; nothing in `lib/copilot` has to know which it is.
 */

import type { CopilotEvent } from '@/lib/copilot/events'

export const MILO_STATES = ['idle', 'greeting', 'thinking', 'answering', 'declined'] as const

export type MiloState = (typeof MILO_STATES)[number]

/** The two avatar widths the build produces: 2× a 32px and a 56px display. */
export const MILO_AVATAR_SIZES = [64, 112] as const

export type MiloAvatarSize = (typeof MILO_AVATAR_SIZES)[number]

/** 2× a ~180px display. Lazy-loaded everywhere it appears. */
export const MILO_FULL_WIDTH = 360

const BASE = '/mascot'

export interface MiloArt {
  /** Head and shoulders, by asset width. */
  readonly avatars: Readonly<Record<MiloAvatarSize, string>>
  /** The whole character, for the empty state, onboarding and /about. */
  readonly full: string
  /**
   * True while this state is drawn from the concept render.
   *
   * Four of the five are, and saying so in the data is the point: the
   * component puts it on the element as `data-milo-placeholder`, the test
   * cross-checks it against what is actually on disk, and "the remaining Milo
   * state renders" is a "Needs Vlad" item rather than a thing somebody has to
   * remember.
   */
  readonly isPlaceholder: boolean
  /**
   * What a screen reader is told.
   *
   * Describes the character and what it means, never the file. "Milo, the
   * Mirrorline assistant, thinking" is useful; "milo-thinking-avatar-112" is
   * not — and neither is the word "placeholder", because that is a fact about
   * our build rather than about the page, and a screen-reader user hearing it
   * would be told something no sighted visitor is.
   */
  readonly alt: string
}

function art(avatarSlug: string, fullSlug: string, isPlaceholder: boolean, alt: string): MiloArt {
  return {
    avatars: {
      64: `${BASE}/milo-${avatarSlug}-avatar-64.webp`,
      112: `${BASE}/milo-${avatarSlug}-avatar-112.webp`,
    },
    full: `${BASE}/milo-${fullSlug}-full-${MILO_FULL_WIDTH}.webp`,
    isPlaceholder,
    alt,
  }
}

const CONCEPT = 'concept-v2'

export const MILO_ART: Readonly<Record<MiloState, MiloArt>> = {
  idle: art(CONCEPT, CONCEPT, true, 'Milo, the Mirrorline assistant'),
  greeting: art('greeting', 'greeting', false, 'Milo, the Mirrorline assistant, waving hello'),
  thinking: art(CONCEPT, CONCEPT, true, 'Milo, the Mirrorline assistant, thinking'),
  answering: art(CONCEPT, CONCEPT, true, 'Milo, the Mirrorline assistant, answering'),
  declined: art(
    CONCEPT,
    CONCEPT,
    true,
    'Milo, the Mirrorline assistant, declining to answer that one',
  ),
}

/**
 * What the co-pilot is doing, as a state.
 *
 * `null` means "nothing in this event changes it" and the caller keeps what it
 * had — which is what makes a run of `delta` events one continuous
 * `answering` rather than a flicker.
 *
 * `declined` is **not** an error state. 18 §3.1 and §3.2: a refusal is an
 * answer and "I don't know, here is a person" is a success. What reaches
 * `declined` is the surface being unable to answer at all, and even then the
 * expression is a shrug rather than a fault — the panel beside it carries the
 * detail, in words.
 */
export function miloStateFor(event: CopilotEvent): MiloState | null {
  switch (event.type) {
    case 'meta':
      return 'thinking'
    case 'delta':
      return 'answering'
    case 'citation':
    case 'proposal':
      return null
    case 'done':
      return 'idle'
    case 'error':
      return 'declined'
    default:
      return null
  }
}

/**
 * The copy, in one place so the banned-phrase sweep can read it.
 *
 * The AI label is part of the name everywhere it appears (18 §3.3: "Always
 * labelled AI… Not a disclaimer in a footer").
 */
export const MILO_COPY = {
  name: 'Milo',
  launcherLabel: 'Ask Milo',
  launcherAria: 'Ask Milo about Mirrorline — AI assistant',
  panelTitle: 'Ask Milo',
  aiTag: 'AI assistant',
} as const
