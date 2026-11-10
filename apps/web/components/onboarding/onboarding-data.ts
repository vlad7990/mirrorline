/**
 * The fixed choices the onboarding wizard offers, and the brand draft it
 * builds. Values come from @mirrorline/mock where the demo client already has
 * an answer, so onboarding and the rest of the studio agree.
 *
 * The one exception is the account list: the shared fixture carries the S10
 * "Reconnect Instagram" error state, which is not what a brand new client sees
 * on day one.
 */

import { brandKit, workspace } from '@mirrorline/mock'

/* -------------------------------------------------------------------------- */
/* Colours                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * How one brand colour paints the 9:16 preview.
 *
 * Raw hex, not tokens: these are the client's colours, and DESIGN.md allows
 * the demo brand palette "inside thumbnails only". Every pair clears 4.5:1.
 */
export interface PreviewPalette {
  readonly background: string
  readonly caption: string
  readonly highlightBackground: string
  readonly highlightText: string
  readonly handle: string
}

export interface BrandColourOption {
  readonly id: string
  readonly name: string
  readonly hex: string
  readonly preview: PreviewPalette
}

const INK = '#14171C'
const SAND = '#F3E9DC'
const TEAL = '#12545A'

const PREVIEW_PALETTES: Readonly<Record<string, PreviewPalette>> = {
  'deep-teal': {
    background: TEAL,
    caption: '#FFFFFF',
    highlightBackground: SAND,
    highlightText: TEAL,
    handle: SAND,
  },
  'warm-sand': {
    background: SAND,
    caption: INK,
    highlightBackground: TEAL,
    highlightText: SAND,
    handle: '#4A5260',
  },
  // DESIGN.md: never white text on the bright accent — so coral takes ink.
  coral: {
    background: '#FF5A36',
    caption: INK,
    highlightBackground: INK,
    highlightText: '#FFE8E1',
    handle: '#3A1407',
  },
  ink: {
    background: INK,
    caption: '#F2F2EE',
    highlightBackground: SAND,
    highlightText: INK,
    handle: SAND,
  },
}

const FALLBACK_PREVIEW: PreviewPalette = {
  background: TEAL,
  caption: '#FFFFFF',
  highlightBackground: SAND,
  highlightText: TEAL,
  handle: SAND,
}

export const DEFAULT_COLOUR_ID = 'deep-teal'

const FALLBACK_COLOUR: BrandColourOption = {
  id: DEFAULT_COLOUR_ID,
  name: 'Deep teal',
  hex: TEAL,
  preview: FALLBACK_PREVIEW,
}

/** The four colours the brand kit suggests from the logo. */
export const BRAND_COLOURS: readonly BrandColourOption[] = brandKit.colors.map((colour) => ({
  id: colour.id,
  name: colour.name,
  hex: colour.hex,
  preview: PREVIEW_PALETTES[colour.id] ?? FALLBACK_PREVIEW,
}))

export function findColour(id: string): BrandColourOption {
  return BRAND_COLOURS.find((colour) => colour.id === id) ?? FALLBACK_COLOUR
}

/* -------------------------------------------------------------------------- */
/* Caption font                                                                */
/* -------------------------------------------------------------------------- */

export interface CaptionFontOption {
  readonly value: string
  readonly label: string
  /** Applied to the preview caption, so the choice is visible. */
  readonly stack: string
  readonly weight: number
}

export const CAPTION_FONTS: readonly CaptionFontOption[] = [
  {
    value: 'inter-tight-bold',
    label: 'Inter Tight Bold',
    stack: 'var(--font-heading)',
    weight: 700,
  },
  {
    value: 'dm-serif-display',
    label: 'DM Serif Display',
    stack: "Georgia, 'Times New Roman', serif",
    weight: 400,
  },
  {
    value: 'space-grotesk',
    label: 'Space Grotesk',
    stack: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    weight: 600,
  },
]

export const DEFAULT_FONT_VALUE = 'inter-tight-bold'

const FALLBACK_FONT: CaptionFontOption = {
  value: DEFAULT_FONT_VALUE,
  label: 'Inter Tight Bold',
  stack: 'var(--font-heading)',
  weight: 700,
}

export function findFont(value: string): CaptionFontOption {
  return CAPTION_FONTS.find((font) => font.value === value) ?? FALLBACK_FONT
}

/* -------------------------------------------------------------------------- */
/* How you talk                                                                */
/* -------------------------------------------------------------------------- */

export type ToneAxisId = 'formal-casual' | 'calm-energetic' | 'expert-friendly'

export interface ToneAxis {
  readonly id: ToneAxisId
  readonly leftLabel: string
  readonly rightLabel: string
  /** The slider's accessible name. */
  readonly accessibleName: string
  /** The word the preview uses at the low, middle and high end. */
  readonly words: readonly [string, string, string]
}

export const TONE_AXES: readonly ToneAxis[] = [
  {
    id: 'formal-casual',
    leftLabel: 'Formal',
    rightLabel: 'Casual',
    accessibleName: 'Formal to casual',
    words: ['Formal', 'Direct', 'Casual'],
  },
  {
    id: 'calm-energetic',
    leftLabel: 'Calm',
    rightLabel: 'Energetic',
    accessibleName: 'Calm to energetic',
    words: ['Calm', 'Steady', 'Energetic'],
  },
  {
    id: 'expert-friendly',
    leftLabel: 'Expert',
    rightLabel: 'Friendly',
    accessibleName: 'Expert to friendly',
    words: ['Expert', 'Warm', 'Friendly'],
  },
]

export type ToneValues = Readonly<Record<ToneAxisId, number>>

export const DEFAULT_TONE: ToneValues = {
  'formal-casual': 62,
  'calm-energetic': 35,
  'expert-friendly': 55,
}

const LOW_MAX = 35
const MID_MAX = 70

function wordFor(id: ToneAxisId, tone: ToneValues): string {
  const axis = TONE_AXES.find((candidate) => candidate.id === id)
  if (axis === undefined) return ''

  const [low, mid, high] = axis.words
  const value = tone[id]

  if (value <= LOW_MAX) return low
  if (value <= MID_MAX) return mid
  return high
}

/**
 * The one-line summary under the preview. At the defaults it reads
 * "Calm, direct, warm." — energy first, then formality, then warmth.
 */
export function describeTone(tone: ToneValues): string {
  const energy = wordFor('calm-energetic', tone)
  const formality = wordFor('formal-casual', tone).toLowerCase()
  const warmth = wordFor('expert-friendly', tone).toLowerCase()

  return `${energy}, ${formality}, ${warmth}.`
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                    */
/* -------------------------------------------------------------------------- */

export interface OnboardingAccount {
  readonly id: string
  readonly platform: string
  /** The handle, or what we show when there is nothing to show. */
  readonly detail: string
  readonly isConnected: boolean
  readonly statusLabel: string
  readonly note: string | null
  /** Amber for an honest platform limit, quiet grey for a roadmap note. */
  readonly noteTone: 'warning' | 'muted'
  readonly actionLabel: string
  /** LinkedIn is post-MVP, so its button is there but not live yet. */
  readonly isComingSoon: boolean
}

export const ONBOARDING_ACCOUNTS: readonly OnboardingAccount[] = [
  {
    id: 'instagram',
    platform: 'Instagram',
    detail: '@mayatorres.coach',
    isConnected: true,
    statusLabel: 'Connected',
    note: null,
    noteTone: 'muted',
    actionLabel: 'Manage',
    isComingSoon: false,
  },
  {
    id: 'tiktok',
    platform: 'TikTok',
    detail: '@mayaleads',
    isConnected: true,
    statusLabel: 'Connected',
    note: 'Posts stay private until our app is approved by TikTok.',
    noteTone: 'warning',
    actionLabel: 'Manage',
    isComingSoon: false,
  },
  {
    id: 'youtube',
    platform: 'YouTube',
    detail: 'Maya Torres',
    isConnected: true,
    statusLabel: 'Connected',
    note: null,
    noteTone: 'muted',
    actionLabel: 'Manage',
    isComingSoon: false,
  },
  {
    id: 'linkedin',
    platform: 'LinkedIn',
    detail: 'Not connected',
    isConnected: false,
    statusLabel: 'Off',
    note: 'Coming soon. LinkedIn follows the first release.',
    noteTone: 'muted',
    actionLabel: 'Connect',
    isComingSoon: true,
  },
]

export const RIGHTS_CONFIRMATION = 'I own or have the rights to everything I upload.'

/* -------------------------------------------------------------------------- */
/* Niche and goal                                                              */
/* -------------------------------------------------------------------------- */

export interface ChoiceOption {
  readonly value: string
  readonly label: string
}

export const NICHE_OPTIONS: readonly ChoiceOption[] = [
  { value: 'Coaching', label: 'Coaching' },
  { value: 'Local service', label: 'Local service' },
  { value: 'Product brand', label: 'Product brand' },
]

export const GOAL_OPTIONS: readonly ChoiceOption[] = [
  { value: 'Book discovery calls', label: 'Book discovery calls' },
  { value: 'Grow followers', label: 'Grow followers' },
  { value: 'Sell a product', label: 'Sell a product' },
]

export const POSTS_PER_DAY_OPTIONS: readonly ChoiceOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
]

/** Offered one at a time by the "+ Add" chip. */
export const NEARBY_NICHE_SUGGESTIONS: readonly string[] = [
  'Mindset',
  'Career growth',
  'Small business',
  'Habits',
]

export const DEFAULT_NICHE = workspace.niche
export const DEFAULT_NEARBY_NICHES: readonly string[] = workspace.nearbyNiches
export const DEFAULT_GOAL = workspace.goal
export const DEFAULT_GOAL_LINK = workspace.goalLink
export const DEFAULT_POSTS_PER_DAY = String(workspace.postsPerDayPerPlatform)

/* -------------------------------------------------------------------------- */
/* Logo                                                                        */
/* -------------------------------------------------------------------------- */

export const LOGO_FILE_NAME = 'maya-torres-logo.png'
/** The two letters on the teal tile. */
export const LOGO_INITIALS = 'MT'
