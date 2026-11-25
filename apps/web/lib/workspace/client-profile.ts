/**
 * The Voice and Facts profile — what we know about the client's business.
 *
 * `BACKEND_PHASE §V2` asks the script agent to write "from the client's Voice
 * and Facts profile with at least one real business fact per script". `12 §3`
 * asks the Trend Scout to score fit against the same facts. It is one profile,
 * read by both, and that is the point: a scan that knows the client runs
 * reactive-dog sessions in Miami, beside a script agent that does not, would
 * recommend formats it cannot then write.
 *
 * ## Free text, because the product is industry-agnostic
 *
 * CLAUDE.md: we do not build industry pages. So `method` is the client's own
 * sentence — "positive reinforcement only", "balanced, leash and e-collar",
 * "I never put a client on a crash diet" — rather than an enum that would make
 * this a dog-training product. `avoid` is what that method rules out, and it
 * is the field with teeth: a format contradicting it is not a weak suggestion,
 * it is one the client would have to refuse publicly in their own niche.
 *
 * ## Parsed, never cast
 *
 * Three of the five columns are `jsonb` written through a definer function. A
 * row is still a row from a database, so every field is checked on the way
 * out — the same rule the niche report's `top_formats` follows.
 */

/** One thing the client sells, and what they say it costs. */
export interface ClientService {
  readonly name: string
  /**
   * Text, never a number. "from $120", "£90 an hour" and "free consult, then
   * $200" are all real answers; a numeric field makes a client either lie or
   * leave it blank, and nothing bills off this.
   */
  readonly price: string | null
}

export const PROFILE_PLATFORMS = ['instagram', 'tiktok', 'youtube'] as const

export type ProfilePlatform = (typeof PROFILE_PLATFORMS)[number]

export interface ClientProfile {
  /**
   * The name the client trades under (D131).
   *
   * The report's cover used to print the *workspace* name — ours, the account
   * label — on a PDF addressed to a prospect. It lives here rather than on
   * `workspaces` because the agents may say it: a hook that names the business
   * is grounded only if the name is in `profileFacts`.
   *
   * Null means not told, and the cover's existing rule applies — leave the row
   * out rather than print a placeholder. The fallback to the workspace name is
   * the renderer's, never the stored value's.
   */
  readonly brandName: string | null
  /** "Miami", "South London", "online only". */
  readonly serviceArea: string | null
  /** How they work, in their words. */
  readonly method: string | null
  /** What their method rules out. Passed to agents as "never suggest". */
  readonly avoid: readonly string[]
  readonly services: readonly ClientService[]
  /** Their own accounts, if they said. Not a connection — see `social_accounts`. */
  readonly handles: Partial<Record<ProfilePlatform, string>>
}

export const EMPTY_PROFILE: ClientProfile = {
  brandName: null,
  serviceArea: null,
  method: null,
  avoid: [],
  services: [],
  handles: {},
}

function str(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function strList(value: unknown, max: number): readonly string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => str(entry))
    .filter((entry): entry is string => entry !== null)
    .slice(0, max)
}

function parseServices(value: unknown): readonly ClientService[] {
  if (!Array.isArray(value)) return []

  return value
    .map((entry): ClientService | null => {
      // A bare string is a service with no price, which is a complete answer.
      if (typeof entry === 'string') {
        const name = str(entry, 120)
        return name ? { name, price: null } : null
      }
      if (typeof entry !== 'object' || entry === null) return null
      const row = entry as Record<string, unknown>
      const name = str(row.name, 120)
      if (!name) return null
      return { name, price: str(row.price, 80) }
    })
    .filter((entry): entry is ClientService => entry !== null)
    .slice(0, 8)
}

function parseHandles(value: unknown): Partial<Record<ProfilePlatform, string>> {
  if (typeof value !== 'object' || value === null) return {}
  const row = value as Record<string, unknown>

  return PROFILE_PLATFORMS.reduce<Partial<Record<ProfilePlatform, string>>>((handles, platform) => {
    const handle = str(row[platform], 60)
    return handle ? { ...handles, [platform]: handle } : handles
  }, {})
}

export function parseClientProfile(value: unknown): ClientProfile {
  if (typeof value !== 'object' || value === null) return EMPTY_PROFILE
  const row = value as Record<string, unknown>

  return {
    brandName: str(row.brandName ?? row.brand_name, 120),
    serviceArea: str(row.serviceArea ?? row.service_area, 120),
    method: str(row.method, 400),
    avoid: strList(row.avoid, 10),
    services: parseServices(row.services),
    handles: parseHandles(row.handles),
  }
}

/** Has the client told us anything? Drives the "tell us about your business" copy. */
export function isProfileEmpty(profile: ClientProfile): boolean {
  return (
    profile.brandName === null &&
    profile.serviceArea === null &&
    profile.method === null &&
    profile.avoid.length === 0 &&
    profile.services.length === 0 &&
    Object.keys(profile.handles).length === 0
  )
}

/**
 * The facts a script is allowed to claim, as plain strings.
 *
 * This is the list `BACKEND_PHASE §V2`'s "at least one real business fact per
 * script" is checked against — and that check is the only reason it exists as
 * a function rather than as prose in a prompt. A script that says "we are
 * based in Miami" is grounded if "Miami" is in here; inventing one is the
 * failure the check catches.
 *
 * The niche is included because it is a fact about the business that the
 * client typed at onboarding, and it is often the only one a new workspace has.
 */
export function profileFacts(profile: ClientProfile, niche?: string | null): readonly string[] {
  const facts = [
    // The trading name is a fact about the business, and the one a hook is most
    // likely to want (D131). Without it here, "book with Oakline this week"
    // would be refused by the fact check as an invention.
    profile.brandName,
    profile.serviceArea,
    profile.method,
    niche ?? null,
    ...profile.services.map((service) => service.name),
    ...profile.services.map((service) => service.price),
    ...Object.values(profile.handles),
  ]

  return facts.filter((fact): fact is string => typeof fact === 'string' && fact.trim().length > 0)
}

/**
 * The profile as the agents read it. Empty sections are omitted rather than
 * sent as "none", which a model reads as an instruction about nothing.
 */
export function profileBrief(profile: ClientProfile): string {
  const lines: string[] = []

  if (profile.brandName) lines.push(`What the business is called: ${profile.brandName}`)
  if (profile.serviceArea) lines.push(`Where they work: ${profile.serviceArea}`)
  if (profile.method) lines.push(`Their method, in their words: ${profile.method}`)
  if (profile.avoid.length > 0) {
    lines.push(`They never recommend, and you must never suggest: ${profile.avoid.join('; ')}`)
  }
  if (profile.services.length > 0) {
    const services = profile.services
      .map((service) => (service.price ? `${service.name} (${service.price})` : service.name))
      .join('; ')
    lines.push(`What they sell: ${services}`)
  }
  const handles = Object.entries(profile.handles)
    .map(([platform, handle]) => `${platform} ${handle}`)
    .join(', ')
  if (handles) lines.push(`Their own accounts: ${handles}`)

  return lines.join('\n')
}
