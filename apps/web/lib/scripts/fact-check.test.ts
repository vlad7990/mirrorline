/**
 * The three facts the gate refused tonight, and the inventions it must keep
 * refusing (D133).
 *
 * Maya Torres Coaching, niche "independent dog trainers". All three of these are
 * in the profile and all three were withheld, because the check was substring
 * containment and every one of them is an inserted word away from the stored
 * string.
 *
 * Vlad's target: **3 of 3 ideas pass on this profile.** The first describe block
 * is that target, written as the three exact cases he gave.
 */

import { describe, expect, test } from 'vitest'

import { parseClientProfile, profileFacts } from '../workspace/client-profile'

import { contentTokens, factIsGrounded, numbersIn, singular } from './fact-check'

/**
 * The profile as the form stores it.
 *
 * The services are **one string each**, which is the root of the bug:
 * `parseServiceLine` splits a service from its price on a *spaced dash*, and
 * these were typed with commas, so the comma stays inside the name.
 */
const MAYA = parseClientProfile({
  brand_name: 'Maya Torres Coaching',
  service_area: 'Austin, Texas',
  method: 'positive reinforcement, force-free, no prong, choke or e-collars',
  avoid: ['prong collars', 'e-collars', 'dominance theory'],
  services: [
    { name: 'Private reactive-dog sessions, $150 per session', price: null },
    { name: 'Reactive Rover 6-week package, $750', price: null },
    { name: 'Puppy foundations, $90 per session', price: null },
  ],
  handles: { instagram: '@mayatorrescoaching' },
})

const FACTS = profileFacts(MAYA, 'independent dog trainers')

describe('the three facts that were withheld tonight', () => {
  test('"Private reactive-dog sessions are $150 per session"', () => {
    // Arrange — the profile holds "...sessions, $150 per session". One word apart.
    const claimed = 'Private reactive-dog sessions are $150 per session'

    // Act
    const grounded = factIsGrounded(claimed, FACTS)

    // Assert
    expect(grounded).toBe(true)
  })

  test('"Reactive Rover 6-week package is $750"', () => {
    expect(factIsGrounded('Reactive Rover 6-week package is $750', FACTS)).toBe(true)
  })

  test('"Method is positive reinforcement, force-free, with no prong, choke or e-collars"', () => {
    const claimed = 'Method is positive reinforcement, force-free, with no prong, choke or e-collars'

    expect(factIsGrounded(claimed, FACTS)).toBe(true)
  })

  test('all three pass together, which is the 3-of-3 target', () => {
    const claims = [
      'Private reactive-dog sessions are $150 per session',
      'Reactive Rover 6-week package is $750',
      'Method is positive reinforcement, force-free, with no prong, choke or e-collars',
    ]

    expect(claims.filter((claim) => factIsGrounded(claim, FACTS))).toHaveLength(3)
  })
})

/**
 * The fourth true fact, withheld on the third eval run (D137).
 *
 * Dog-trainer profile, run 3: three videos out, **one withheld**, and the
 * refused fact was "force-free, no prong, choke or e-collar method" against a
 * profile reading "Positive reinforcement, force-free. No prong, choke or
 * e-collars." The claim is the profile's own method, said with a label on the
 * end and one plural dropped.
 */
describe('a plural and a field label are not a different fact', () => {
  const method = profileFacts(
    parseClientProfile({
      method: 'Positive reinforcement, force-free. No prong, choke or e-collars.',
    }),
  )

  test('"force-free, no prong, choke or e-collar method"', () => {
    // Arrange — the exact string the eval withheld.
    const claimed = 'force-free, no prong, choke or e-collar method'

    // Act
    const grounded = factIsGrounded(claimed, method)

    // Assert
    expect(grounded).toBe(true)
  })

  test('and against the full profile, where the method is one fact among many', () => {
    expect(factIsGrounded('force-free, no prong, choke or e-collar method', FACTS)).toBe(true)
  })

  test('a plural in the other direction too', () => {
    expect(factIsGrounded('Private reactive-dog session, $150 per session', FACTS)).toBe(true)
  })

  test('the label still cannot carry a claim on its own', () => {
    // "method" is ignored, not magic: a sentence whose only other content word
    // is invented is still refused.
    expect(factIsGrounded('Balanced training method', method)).toBe(false)
  })

  test('and it still refuses the inverted method', () => {
    // The protection that matters most here: dropping a label must not drop a
    // negation with it.
    expect(factIsGrounded('prong and choke collar method', method)).toBe(false)
  })
})

describe('still strict on invented facts', () => {
  test('refuses a number nobody gave us', () => {
    // The plausible, unverifiable sentence a client would be quoted on.
    expect(factIsGrounded('She has trained over 500 dogs', FACTS)).toBe(false)
  })

  test('refuses the right service at the wrong price', () => {
    // Arrange — every word is in the profile except the figure.
    const claimed = 'Private reactive-dog sessions are $195 per session'

    // Act
    const grounded = factIsGrounded(claimed, FACTS)

    // Assert
    expect(grounded).toBe(false)
  })

  test('refuses an invented service', () => {
    expect(factIsGrounded('Board-and-train programme, $2,000 for two weeks', FACTS)).toBe(false)
  })

  test('refuses a claim about a different city', () => {
    expect(factIsGrounded('Based in Miami and Fort Lauderdale', FACTS)).toBe(false)
  })

  test('refuses an inverted method, even though every word is in the profile', () => {
    // The one way substance matching could go badly wrong in public: the method
    // says "no prong, choke or e-collars", and those words are all present in a
    // claim that recommends them.
    expect(factIsGrounded('Uses prong collars when needed', FACTS)).toBe(false)
  })

  test('refuses a claim of one word, because one word is not a business fact', () => {
    // "Austin" as a script's whole fact says nothing a reader could check.
    expect(factIsGrounded('Austin', FACTS)).toBe(false)
  })

  test('refuses an empty claim', () => {
    expect(factIsGrounded('   ', FACTS)).toBe(false)
  })

  test('refuses everything when the profile is empty', () => {
    expect(factIsGrounded('Private reactive-dog sessions are $150 per session', [])).toBe(false)
  })
})

describe('what the old check got right, and still does', () => {
  test('a fact split across a service name and its price', () => {
    // The case the old docstring was written about: a profile holding
    // "Reactive dog intensive" and "$450 for 4 sessions" separately.
    const split = profileFacts(
      parseClientProfile({
        service_area: 'Miami',
        services: [{ name: 'Reactive dog intensive', price: '$450 for 4 sessions' }],
      }),
    )

    expect(factIsGrounded('her reactive-dog intensive, $450 for four sessions', split)).toBe(true)
  })

  test('a partial quote of a longer method', () => {
    // Legitimate, and the reverse direction is what allows it.
    const soft = profileFacts(
      parseClientProfile({ method: 'positive reinforcement only, built around play' }),
    )

    expect(factIsGrounded('positive reinforcement only', soft)).toBe(true)
  })

  test('the brand name is a fact a script may stand on', () => {
    expect(factIsGrounded('Maya Torres Coaching runs these sessions', FACTS)).toBe(true)
  })
})

/**
 * A one-word profile fact — almost always a service area.
 *
 * It has to ground the same fact said in more words, and it must not become a
 * permission slip for a claim that is about something else entirely.
 */
describe('a one-word fact grounds that word and nothing more', () => {
  const local = profileFacts(parseClientProfile({ service_area: 'Miami' }))

  test('grounds a claim that is essentially that word', () => {
    // The case the old substring check got right, and which a blunt "a fact
    // needs two words" rule would have regressed.
    expect(factIsGrounded('based in Miami', local)).toBe(true)
  })

  test('does not ground a rating that merely mentions the place', () => {
    // Non-negotiable 7: no invented ratings. A service area must not license one.
    expect(factIsGrounded('the most trusted trainer in Miami', local)).toBe(false)
  })
})

describe('contentTokens', () => {
  test('drops the words that carry no assertion', () => {
    expect(contentTokens('the sessions are in Austin')).toEqual(['sessions', 'austin'])
  })

  test('keeps negations, because dropping them would flip a meaning', () => {
    expect(contentTokens('no prong collars')).toEqual(['no', 'prong', 'collars'])
  })

  test('maps a spelled number to its digits', () => {
    expect(contentTokens('four sessions')).toEqual(['4', 'sessions'])
  })
})

describe('singular', () => {
  test('drops a plural s', () => {
    expect(singular('collars')).toBe('collar')
    expect(singular('sessions')).toBe('session')
  })

  test('leaves a word that merely ends in a vowel and an s', () => {
    // "texas" must not become "texa", and a service area is exactly where this
    // would bite.
    expect(singular('texas')).toBe('texas')
    expect(singular('videos')).toBe('videos')
  })

  test('leaves short words and double-s endings alone', () => {
    expect(singular('yes')).toBe('yes')
    expect(singular('class')).toBe('class')
  })

  test('handles the -ies and -es plurals', () => {
    expect(singular('puppies')).toBe('puppy')
    expect(singular('classes')).toBe('class')
    expect(singular('prices')).toBe('price')
  })
})

describe('numbersIn', () => {
  test('reads a price regardless of the currency symbol', () => {
    expect(numbersIn('$150 per session')).toEqual(['150'])
  })

  test('reads a number out of a compound word', () => {
    expect(numbersIn('6-week package')).toEqual(['6'])
  })

  test('finds nothing in a sentence with no numbers', () => {
    expect(numbersIn('positive reinforcement only')).toEqual([])
  })
})
