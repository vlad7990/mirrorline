/**
 * The caveat two surfaces owe each other.
 *
 * These are not tests that the template interpolates — a template that
 * interpolates is not in doubt. They test that **the two sentences cannot
 * drift**, which is the property PR D was asked for ("in the same words the
 * calendar legend uses for TikTok") and the one a comment cannot hold.
 *
 * The last test is the load-bearing one: it reads `week-grid.tsx` off disk and
 * fails if the legend ever stops rendering the shared constant. Without it,
 * somebody types the sentence back inline, every other assertion here still
 * passes, and the guarantee is gone while the suite stays green.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import {
  TIKTOK_PRIVATE_UNTIL_APPROVED,
  YOUTUBE_PRIVATE_UNTIL_APPROVED,
  privateUntilApproved,
} from './platform-limits'

describe('privateUntilApproved', () => {
  test('the two platforms differ by the platform name and nothing else', () => {
    // Arrange: the one property PR D has to hold. Strip the platform from
    // each sentence; what is left has to be identical.
    const tiktokRemainder = TIKTOK_PRIVATE_UNTIL_APPROVED.replace('TikTok', '')
    const youtubeRemainder = YOUTUBE_PRIVATE_UNTIL_APPROVED.replace('YouTube', '')

    // Assert
    expect(youtubeRemainder).toBe(tiktokRemainder)
  })

  test('says the limit plainly, in the present tense, with no promised date', () => {
    // Act
    const sentence = privateUntilApproved('YouTube')

    // Assert
    expect(sentence).toBe('YouTube posts stay private until our app is approved.')
    // 02_BRAND_AND_VOICE: do not hedge the limit into something softer, and
    // name no date we do not control. "Soon" and "shortly" are the words that
    // turn a limit into a promise.
    expect(sentence).not.toMatch(/soon|shortly|temporar|currently|at the moment/i)
  })

  test('the calendar legend renders the shared constant rather than its own copy', () => {
    // Arrange: the guard that makes the first test mean anything. A legend
    // that reverts to an inline string keeps every other assertion green.
    const weekGrid = readFileSync(join(__dirname, '../../components/calendar/week-grid.tsx'), 'utf8')

    // Assert: it imports the constant and renders it...
    expect(weekGrid).toContain('TIKTOK_PRIVATE_UNTIL_APPROVED')
    expect(weekGrid).toContain('{TIKTOK_PRIVATE_UNTIL_APPROVED}')

    // ...and no longer carries the claim as a literal. The comment above the
    // span names the platform, so this looks for the claim rather than a word.
    expect(weekGrid).not.toContain('TikTok posts stay private')
  })
})
