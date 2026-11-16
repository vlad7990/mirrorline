/**
 * The refusals are the product (spec 18 §3.2, §8).
 *
 * §8 asks for one test per refusal category, "asserting we do *not* produce
 * the forbidden shape, plus the existing banned-phrase test run over
 * generated text". Both halves are here, and the second half is the one that
 * needed `banned-phrases.ts` to stop being a test-local constant.
 *
 * These assertions are about **sample mode**, which is the mode that exists
 * today. That makes them weaker than they will eventually be — a canned reply
 * refuses because it was written to, not because a model decided to — and
 * stronger in one way that matters: they are deterministic, so they can be
 * part of the gate rather than a thing somebody runs by hand. When the key
 * lands, the same assertions want running against live transcripts, and §9.2
 * already names the outcome if Haiku 4.5's refusals do not hold up: move the
 * website bot to Sonnet 5 rather than loosen the refusals.
 */

import { describe, expect, test } from 'vitest'

import { findBannedClaims } from '../copy/banned-phrases'

import {
  SAMPLE_NOTICE,
  cannedAnswer,
  cannedSiteAnswer,
  cannedStudioAnswer,
  keywords,
  questionParts,
  retrieve,
} from './canned'

describe('the website bot answers from our own pages', () => {
  test('answers a question about the plans, and quotes the corpus', () => {
    // §8: "A question answerable from 09_SERVICES is answered, and the answer
    // quotes the corpus." The pricing tiers are transcribed from 09 §11, so
    // this is that test with the module standing in for the spec.
    const answer = cannedSiteAnswer('What does the Growth plan include every month?')

    expect(answer.refusal).toBeNull()
    expect(answer.text).toContain('From our own pages')
    expect(answer.citations.length).toBeGreaterThan(0)
    expect(answer.citations[0]?.href).toBe('/pricing')
  })

  test('answers a question about posting, and cites the page it came from', () => {
    const answer = cannedSiteAnswer('Which platforms do you publish to?')

    expect(answer.refusal).toBeNull()
    expect(answer.citations.length).toBeGreaterThan(0)
    // A chip has to go somewhere. An uncheckable quote is the thing this
    // surface exists not to be.
    expect(answer.citations[0]?.href.startsWith('/')).toBe(true)
  })

  test('hands off rather than guessing when the answer is not on our pages', () => {
    // §3.1: "'I don't know, here is a person' is a success state, not a
    // failure, and the tests treat it as one." So this asserts the handoff
    // exists, not that an answer was produced.
    const answer = cannedSiteAnswer('Do you have an office in Lisbon I could visit?')

    expect(answer.refusal).toBe('outside-corpus')
    expect(answer.citations).toEqual([])
    expect(answer.handoff).not.toBeNull()
    expect(answer.handoff?.href).toBe('/niche-scan')
  })
})

describe('the four refusals of §3.2', () => {
  test('a guarantee is refused, and replaced with what we measure instead', () => {
    const answer = cannedSiteAnswer('Will I get 10k followers if I sign up?')

    expect(answer.refusal).toBe('guarantee')
    // The forbidden shape is a number somebody will get. The replacement
    // shape is what we report. Both are asserted, because refusing without
    // offering the honest alternative is a worse answer than it looks.
    expect(answer.text).toMatch(/cannot|not going to|nobody can/i)
    expect(answer.text).toMatch(/report|measure|figures/i)
    expect(answer.text).not.toMatch(/\b10k\b|10,000/)
  })

  test('invented results are refused by saying there are none', () => {
    const answer = cannedSiteAnswer('What results have you got for a client in my industry?')

    expect(answer.refusal).toBe('invented-results')
    expect(answer.text).toMatch(/no client results|no case studies/i)
    expect(answer.handoff).not.toBeNull()
  })

  test('a named competitor is refused by category, and the reply names no brand', () => {
    // The question names one; the answer must not. The categories from 11 §2
    // are the substitute §3.2 specifies.
    const answer = cannedSiteAnswer('Is Opus Clip worse than you?')

    expect(answer.refusal).toBe('competitor')
    expect(answer.text).toMatch(/clipping tools|agencies|repost pages/i)
    expect(findBannedClaims(answer.text)).toEqual([])
  })

  test('a question outside the corpus is handed to a person', () => {
    const answer = cannedSiteAnswer('What is the capital of Portugal?')

    expect(answer.refusal).toBe('outside-corpus')
    expect(answer.handoff).not.toBeNull()
  })

  test('a question that is both answerable and improper is refused, not answered', () => {
    // "Does the Growth plan guarantee leads?" retrieves the Growth plan
    // perfectly well. Answering it from the corpus would mean answering the
    // half we have to refuse, so the refusal has to win — and the order of
    // the checks in `cannedSiteAnswer` is what makes it.
    const answer = cannedSiteAnswer('Does the Growth plan guarantee me leads every week?')

    expect(answer.refusal).toBe('guarantee')
  })
})

describe('the banned-phrase list, run over generated text', () => {
  test('no canned reply on either surface makes a claim we may not make', () => {
    // §3.2's last line: the list "applies to generated text too". In sample
    // mode the canned replies *are* the generated text, so this is that test
    // at full strength rather than a placeholder for it.
    const questions = [
      'Will I get 10k followers?',
      'What results have you got for a client?',
      'Is Opus Clip worse than you?',
      'What is the capital of Portugal?',
      'What does the Growth plan include?',
      'Which platforms do you post to?',
      'What about copyright?',
      'Can you move my Thursday post?',
      'Can you swap this to a different format?',
      'Can you pause my Instagram account?',
      'Why was this video held?',
      'Write me a hook.',
      'How many posts published this week?',
    ]

    const findings = questions.flatMap((question) =>
      (['site', 'studio'] as const).flatMap((surface) =>
        findBannedClaims(cannedAnswer(surface, question).text).map(
          (finding) => `[${surface}] “${question}” → ${finding.id}: ${finding.context}`,
        ),
      ),
    )

    expect(findings, findings.join('\n')).toEqual([])
  })

  test('the sample notice itself is clean and says what it is', () => {
    expect(findBannedClaims(SAMPLE_NOTICE)).toEqual([])
    expect(SAMPLE_NOTICE).toMatch(/sample/i)
    expect(SAMPLE_NOTICE).toMatch(/scripted|not generated|no model/i)
  })
})

describe('the studio bot cites what it says', () => {
  test('an answer about a KPI carries a citation naming that KPI', () => {
    // §8: "A studio answer about a KPI carries a chip naming that KPI." C3
    // renders the chip; this is the data behind it.
    const answer = cannedStudioAnswer('How many posts were published this week?')

    expect(answer.refusal).toBeNull()
    expect(answer.citations.length).toBeGreaterThan(0)
    expect(answer.citations[0]?.label).toBe('Posts published')
    expect(answer.citations[0]?.href.startsWith('/app/')).toBe(true)
  })

  test('says it does not know rather than producing a plausible number', () => {
    // §2.2 is the most important rule on this surface: "If a claim cannot be
    // tied to a row we hold, the co-pilot says it does not know." The
    // forbidden shape is a figure, so the assertion is that there is no digit
    // in the reply at all.
    //
    // This question is one incidental word away from a real row — "cost"
    // appears in the cost-per-lead KPI — and the first version of the bot
    // answered it with that figure: the right number for a question nobody
    // asked. The two-word floor in `matchFact` is what makes it a refusal.
    const answer = cannedStudioAnswer('Tell me the cost per enquiry on LinkedIn.')

    expect(answer.refusal).toBe('outside-corpus')
    expect(answer.citations).toEqual([])
    expect(answer.text).toMatch(/do not have a row|not going to put a number/i)
    expect(answer.text).not.toMatch(/\d/)
  })

  test('refuses a forecast rather than reading a measurement back as one', () => {
    // This test is the reason `forecast` exists as a refusal kind. The first
    // version of the bot answered "what will my revenue be next quarter?"
    // with this month's revenue — true, cited, and an answer to a different
    // question. A measurement offered where a prediction was asked for is
    // one step from the thing the Performance Analyst's own limit forbids.
    const answer = cannedStudioAnswer('What will my revenue be next quarter?')

    expect(answer.refusal).toBe('forecast')
    expect(answer.citations).toEqual([])
    expect(answer.text).toMatch(/what happened, not what is going to/i)
    expect(answer.text).not.toMatch(/\d/)
  })
})

describe('proposals are inert', () => {
  const proposalQuestions = [
    ['move-post', 'Can you move my Thursday post to Tuesday?'],
    ['swap-format', 'Can you swap this to a different format?'],
    ['pause-account', 'Can you pause posting on my Instagram account?'],
  ] as const

  test.each(proposalQuestions)('%s comes back needing approval', (kind, question) => {
    const answer = cannedStudioAnswer(question)

    expect(answer.proposals.length).toBe(1)
    const proposal = answer.proposals[0]
    expect(proposal?.kind).toBe(kind)
    // §2.3: "Nothing happens until Approve is pressed." The type makes
    // `false` impossible to write; this asserts the value is actually there,
    // because a type is not a runtime guarantee once JSON is involved.
    expect(proposal?.requiresApproval).toBe(true)
    expect(proposal?.detail.length).toBeGreaterThan(80)
  })

  test('a proposal carries no handler, callback or mutation of any kind', () => {
    // The strongest form of "never self-executes" available to a unit test:
    // the object is data. If a function ever appears on one, something has
    // been given the ability to act without the client's press.
    const answer = cannedStudioAnswer('Can you pause my Instagram account?')
    const proposal = answer.proposals[0]

    expect(proposal).toBeDefined()
    for (const value of Object.values(proposal as object)) {
      expect(typeof value).not.toBe('function')
    }
    expect(JSON.parse(JSON.stringify(proposal))).toEqual(proposal)
  })

  test('the co-pilot says out loud that it cannot act', () => {
    const answer = cannedStudioAnswer('Move my Thursday post to Tuesday.')
    expect(answer.text).toMatch(/until you press Approve|not able to/i)
  })

  test('an explaining answer proposes nothing', () => {
    // A proposal that appeared beside an explanation would put an Approve
    // button in front of somebody who only asked a question.
    expect(cannedStudioAnswer('Why was this video held?').proposals).toEqual([])
    expect(cannedSiteAnswer('What does the Pilot plan include?').proposals).toEqual([])
  })
})

describe('retrieval', () => {
  test('drops stopwords and short words, so “what is the” matches nothing', () => {
    expect(keywords('what is the')).toEqual([])
    expect(keywords('Which platforms do you publish to?')).toContain('platforms')
  })

  test('needs more than one matching word before it calls something an answer', () => {
    // One incidental word in common is not a retrieval. Without a floor the
    // bot would answer every question with whichever section happened to
    // contain the word "post".
    expect(retrieve('xylophone')).toBeNull()
    expect(retrieve('')).toBeNull()
  })

  test('returns the section whose words the question actually used', () => {
    const hit = retrieve('How much does the Pilot plan cost for two weeks?')
    expect(hit?.section.route).toBe('/pricing')
    expect(hit?.excerpt.length).toBeGreaterThan(40)
  })
})

describe('every canned answer is labelled a sample', () => {
  test('both surfaces report sample mode on the answer itself', () => {
    // Attached to the answer rather than left to the UI, so a surface cannot
    // forget to say it — non-negotiable 7 and §7's no-key row.
    expect(cannedSiteAnswer('What does Growth include?').mode).toBe('sample')
    expect(cannedStudioAnswer('How many posts published?').mode).toBe('sample')
  })
})

describe('two questions in one message', () => {
  // Found in review: "guarantee 10k followers? and how much is Creator?"
  // answered the first half and silently dropped the second. A bot that
  // answers the comfortable half of a question and ignores the rest reads as
  // evasion, which is the opposite of what §3.2's refusals are for.
  const MIXED = 'Can you guarantee 10,000 followers? And how much is Creator?'

  test('splits on a question mark, and on "and" only when a question follows', () => {
    expect(questionParts(MIXED)).toEqual([
      'Can you guarantee 10,000 followers',
      'And how much is Creator',
    ])

    // "leads and bookings" is one question. Splitting it would leave two
    // halves that retrieve nothing.
    expect(questionParts('Do you report leads and bookings per post?')).toEqual([
      'Do you report leads and bookings per post',
    ])
  })

  test('answers both halves: the refusal, and then the price', () => {
    const answer = cannedAnswer('site', MIXED)

    // The refusal still happens, and is still categorised as one.
    expect(answer.refusal).toBe('guarantee')
    expect(answer.text).toContain('Nobody can honestly promise you a follower count')

    // And the second half is answered rather than dropped.
    expect(answer.text).toContain('On the other half of your question')
    expect(answer.text).toContain('Creator')
    expect(answer.citations.some((citation) => citation.href === '/pricing')).toBe(true)
  })

  test('names the half it cannot answer, and hands that half to a person', () => {
    const answer = cannedAnswer(
      'site',
      'What does the Growth plan include? And can you design my logo?',
    )

    expect(answer.text).toContain('On the other half of your question')
    expect(answer.text).toContain('logo')
    expect(answer.refusal).toBe('outside-corpus')
    expect(answer.handoff).not.toBeNull()
  })

  test('does not repeat itself when both halves have the same answer', () => {
    const answer = cannedAnswer(
      'site',
      'What does the Growth plan include? And what does Scale include?',
    )

    const mentions = answer.text.split('On the other half').length - 1
    expect(mentions).toBeLessThanOrEqual(1)
  })

  test('the studio surface gets the same treatment', () => {
    const answer = cannedAnswer(
      'studio',
      'How many posts went out this week? And what will revenue be next quarter?',
    )

    // The forecast half is refused rather than answered with a measurement,
    // which is the bug D56 found in the single-question path.
    expect(answer.text).toContain('On the other half of your question')
    expect(answer.refusal).toBe('forecast')
  })

  test('a single question is untouched by any of this', () => {
    const single = cannedSiteAnswer('What does the Growth plan include every month?')
    const throughComposer = cannedAnswer('site', 'What does the Growth plan include every month?')

    expect(throughComposer.text).toBe(single.text)
    expect(throughComposer.citations).toEqual(single.citations)
  })
})
