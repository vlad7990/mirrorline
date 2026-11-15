/**
 * The validation that replaced the browser's, as assertions.
 *
 * This is the test D52 said the stepper was waiting for. The old form leaned
 * on `type="email" required` across fields that were all mounted; the stepper
 * mounts one step at a time, so those checks had to be rewritten by hand —
 * and hand-written validation on a live lead-capture path is exactly the kind
 * of change that looks right and silently drops a field.
 *
 * The case worth naming: **the form must not be able to send an answer the
 * server will refuse.** Both halves of that are asserted here — the step
 * rules reject what `validateNicheScanRequest` rejects, and a complete set of
 * answers is one the server accepts.
 */

import { describe, expect, test } from 'vitest'

import { MAX_NICHE, validateNicheScanRequest } from '@/lib/leads/niche-scan-lead'

import {
  type Answers,
  EMPTY_ANSWERS,
  LAST_STEP,
  STEPS,
  firstProblemStep,
  problemWith,
} from './scan-steps'

/** A set of answers somebody could actually have given. */
const COMPLETE: Answers = {
  niche: 'We run a two-person bookkeeping practice for tradespeople',
  goal: 'leads',
  handles: ['@someone', '', ''],
  email: 'someone@example.org',
}

describe('the steps themselves', () => {
  test('there are four, which is what 19 v2 asks for', () => {
    // Arrange, Act, Assert
    expect(STEPS).toHaveLength(4)
    expect(LAST_STEP).toBe(3)
  })

  test('no two steps share a key', () => {
    // Arrange
    const keys = STEPS.map((step) => step.key)

    // Act
    const unique = new Set(keys)

    // Assert
    expect(unique.size).toBe(keys.length)
  })

  test('every step is labelled, because the rail is the only progress shown', () => {
    // Arrange, Act
    const unlabelled = STEPS.filter((step) => step.label.trim().length === 0)

    // Assert
    expect(unlabelled).toEqual([])
  })
})

describe('step one, the niche', () => {
  test('an empty niche is refused', () => {
    // Arrange, Act, Assert
    expect(problemWith(0, EMPTY_ANSWERS)).toContain('in your own words')
  })

  test('whitespace alone is refused, because trim is what the server does too', () => {
    // Arrange
    const answers = { ...COMPLETE, niche: '   \n  ' }

    // Act, Assert
    expect(problemWith(0, answers)).not.toBeNull()
  })

  test('a niche over the server limit is refused here rather than there', () => {
    // Arrange
    const answers = { ...COMPLETE, niche: 'x'.repeat(MAX_NICHE + 1) }

    // Act, Assert
    expect(problemWith(0, answers)).toContain(String(MAX_NICHE))
  })

  test('an ordinary sentence passes', () => {
    // Arrange, Act, Assert
    expect(problemWith(0, COMPLETE)).toBeNull()
  })
})

describe('steps two and three, which cannot fail', () => {
  /**
   * Asserted rather than assumed. If a required question is ever added to
   * either of these, this test fails and whoever added it has to decide what
   * the rule is — rather than shipping a step that silently accepts nothing.
   */
  test('the goal step passes even on untouched answers, because it has a default', () => {
    // Arrange, Act, Assert
    expect(problemWith(1, EMPTY_ANSWERS)).toBeNull()
  })

  test('the handles step passes with nothing filled in, because it is optional', () => {
    // Arrange, Act, Assert
    expect(problemWith(2, EMPTY_ANSWERS)).toBeNull()
  })
})

describe('step four, the email', () => {
  test('an empty address is refused', () => {
    // Arrange, Act, Assert
    expect(problemWith(3, EMPTY_ANSWERS)).toContain('address')
  })

  test.each(['someone', 'someone@', '@example.org', 'someone@example', 'a b@example.org'])(
    'refuses %j, which the server would also refuse',
    (email) => {
      // Arrange
      const answers = { ...COMPLETE, email }

      // Act
      const problem = problemWith(3, answers)
      const server = validateNicheScanRequest({
        ...answers,
        handles: [...answers.handles],
        audience: 'business',
        stage: 'new',
      })

      // Assert: the form and the server agree that this is not an address.
      expect(problem).not.toBeNull()
      expect(server.ok).toBe(false)
    },
  )

  test('accepts an ordinary address', () => {
    // Arrange, Act, Assert
    expect(problemWith(3, COMPLETE)).toBeNull()
  })
})

describe('firstProblemStep', () => {
  test('is -1 when every answer is good', () => {
    // Arrange, Act, Assert
    expect(firstProblemStep(COMPLETE)).toBe(-1)
  })

  test('is 0 on untouched answers, not 3', () => {
    // Arrange, Act
    const step = firstProblemStep(EMPTY_ANSWERS)

    // Assert: the *first* bad step, because that is the one to send somebody
    // back to. Reporting the last would leave them on a valid-looking screen.
    expect(step).toBe(0)
  })

  test('finds a cleared earlier answer from the last step', () => {
    // Arrange: the case the stepper makes possible and the old form could
    // not produce — a valid email with the niche emptied behind it.
    const answers = { ...COMPLETE, niche: '' }

    // Act, Assert
    expect(firstProblemStep(answers)).toBe(0)
  })
})

describe('the form and the server agree', () => {
  /**
   * The failure this guards against is specific: a form that passes its own
   * checks and is then refused by the route, with a message naming a field
   * three steps back. That is the shape of bug D52 was worried about, and it
   * is cheap to make impossible.
   */
  test('answers that clear every step are answers the server accepts', () => {
    // Arrange
    const payload = {
      email: COMPLETE.email,
      niche: COMPLETE.niche,
      audience: 'business',
      stage: 'new',
      goal: COMPLETE.goal,
      handles: [...COMPLETE.handles],
    }

    // Act
    const noProblem = firstProblemStep(COMPLETE)
    const result = validateNicheScanRequest(payload)

    // Assert
    expect(noProblem).toBe(-1)
    expect(result.ok).toBe(true)
  })
})
