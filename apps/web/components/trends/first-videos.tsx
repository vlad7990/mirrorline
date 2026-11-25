/**
 * "Your first 3 videos" — where the research stops being research (V2).
 *
 * `BACKEND_PHASE §V2`'s first visible output, and the section that answers the
 * question a client actually has. Everything above it describes a niche; this is
 * things to film this week, built on the formats above, in their voice, each
 * standing on one fact from their own profile.
 *
 * **Nothing here is a draft of someone else's video.** The scripts share the
 * formats' beat structure and no sentence with any source — checked in code by
 * `screenIdeas`, not promised in a prompt.
 *
 * ============================================================================
 * Why this is its own file, and the bug that moved it (D131)
 * ============================================================================
 *
 * The first live report delivered **one** video under "Your first 3 videos ·
 * Three to film this week". The count was a constant and the heading was a
 * sentence, so neither could be wrong about the data — they were simply not
 * about it. Three of the four drafted ideas had been refused, which the report
 * did not mention at all.
 *
 * `§V3` forbids warn-and-continue, and this is its mirror image: a refusal that
 * reaches nobody is the same failure as a warning nobody acts on. So the section
 * renders the count it actually has, and names what was withheld and why.
 *
 * It left `niche-report-panel.tsx` because that file stood at 787 lines against
 * an 800-line ceiling and this change adds to it. `GateVerdict` came with it: it
 * renders nowhere else, and a verdict belongs beside the idea it judged.
 */

import { Card, Eyebrow, StatusChip } from '@mirrorline/ui'

import { refusedBy, type WithheldIdea } from '@/lib/drafts/withheld'
import type { OriginalityOutcome } from '@/lib/originality/gate'
import { splitHookBeat, type VideoIdea } from '@/lib/scripts/video-idea'

/** The word for each outcome. "Rewritten" is the gate working, not a warning. */
const GATE_OUTCOME_LABEL: Record<OriginalityOutcome, string> = {
  passed: 'Passed',
  rewritten: 'Sent back to be rewritten',
  blocked: 'Blocked',
}

/**
 * What the Originality Gate said about one idea (V3, D126).
 *
 * `04 §4`: "The result is shown to the client with the number, the limit, and
 * what the gate did … A gate whose failures are invisible is indistinguishable
 * from a gate that never fires, which is precisely what the predecessor project
 * had." So this renders four things, and none of them is optional:
 *
 * 1. **The word.** Passed, sent back, or blocked.
 * 2. **The number and the limit**, side by side — a percentage with no ceiling
 *    beside it cannot be judged by the person reading it.
 * 3. **What it was compared against**, and separately **what it was not**. The
 *    second list is the honest one: we hold none of the client's own posts yet,
 *    and printing that gap is the alternative to implying we closed it.
 * 4. **The reasons**, when there are any — named lines, so the objection is
 *    arguable rather than an assertion.
 *
 * A `null` verdict reads as "not checked" rather than as a blank space. A report
 * stored before the gate existed carries no verdict, and absence must never look
 * like a clean bill.
 */
function GateVerdict({ verdict }: { verdict: VideoIdea['originality'] }) {
  if (!verdict) {
    return (
      <p className="mt-3 text-meta text-text-muted">
        <span className="font-medium text-text">Originality Gate: </span>
        not checked — this report was written before the gate ran.
      </p>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-meta font-medium text-text">Originality Gate</span>
        <StatusChip status={verdict.outcome === 'blocked' ? 'blocked' : 'passed'}>
          {GATE_OUTCOME_LABEL[verdict.outcome]}
        </StatusChip>
        <span className="text-meta text-text-muted">
          <span className="machine">{verdict.similarity}%</span> of the phrasing is shared · limit{' '}
          <span className="machine">{verdict.limit}%</span>
        </span>
      </div>

      <p className="m-0 max-w-prose text-meta text-text-muted">
        Compared against {verdict.comparedAgainst.join(', ')}.
        {verdict.notComparedAgainst.length > 0
          ? ` Not compared against ${verdict.notComparedAgainst.join(', ')} — we do not hold those yet.`
          : ''}
      </p>

      {verdict.reasons.length > 0 ? (
        <ul className="m-0 mt-1 space-y-1 text-meta text-text-muted">
          {verdict.reasons.map((reason) => (
            <li className="flex gap-2" key={reason}>
              <span aria-hidden="true" className="select-none text-accent">
                ·
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Counts in words, up to the six `parseVideoIdeas` will return.
 *
 * Words rather than digits because these are headings, and "1 to film this week"
 * reads like a spreadsheet. Beyond six it falls back to the digit, which is
 * unreachable today and still correct if the cap ever moves.
 */
const COUNT_WORDS = ['none', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'] as const

function countWord(count: number): string {
  return COUNT_WORDS[count] ?? String(count)
}

/**
 * The heading, which may only describe what is below it (D131).
 *
 * This replaced the literal "Three to film this week". That string was not a
 * rounding error — it was a promise made by the plan rather than by the result,
 * and `15 §honesty rules` is about precisely that difference.
 */
function headingFor(count: number, niche?: string): string {
  const what = `${countWord(count)} to film this week`
  return niche ? `${what} in ${niche}` : what
}

/**
 * The ideas that did not make it — named, counted and explained.
 *
 * Inside the printed report rather than beside it, because this is the sentence
 * that makes the count above it true, and a PDF cropped to the pretty part would
 * be the dishonest version of this feature. `DraftDecisions` further down the
 * page is the surface a client *acts* on; this is the one they *read*.
 */
function Withheld({ ideas }: { ideas: readonly WithheldIdea[] }) {
  if (ideas.length === 0) return null

  return (
    <div className="mt-5 rounded-lg border border-border bg-neutral-soft px-4 py-3">
      <p className="m-0 text-meta font-medium text-on-neutral-soft">
        {ideas.length === 1
          ? 'One more idea was written and withheld before it reached you.'
          : `${countWord(ideas.length)} more ideas were written and withheld before they reached you.`}
      </p>
      <ul className="mt-2 space-y-1.5 text-meta text-on-neutral-soft">
        {ideas.map((idea) => (
          <li className="flex gap-2" key={idea.id}>
            <span aria-hidden="true" className="select-none text-accent">
              ·
            </span>
            <span>
              <span className="font-medium">“{idea.title}”</span> — withheld by {refusedBy(idea)}
              {idea.reason ? `: ${idea.reason}` : '. No reason was recorded.'}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 max-w-prose text-caption text-on-neutral-soft">
        Both checks run before you see anything. An idea that shares phrasing with the research, or
        that stands on a fact we cannot find in your profile, is withheld rather than sent to you
        with a warning attached.
      </p>
    </div>
  )
}

export interface FirstVideosProps {
  readonly ideas: readonly VideoIdea[]
  readonly niche?: string
  /**
   * What screening refused, or `null` when we could not read it.
   *
   * The three states every read in this app keeps apart, and here the middle one
   * earns its keep: `[]` means nothing was withheld and `null` means we cannot
   * say — which must not print as the same thing when the count above is short.
   */
  readonly withheld: readonly WithheldIdea[] | null
}

export function FirstVideos({ ideas, niche, withheld }: FirstVideosProps) {
  const refused = withheld ?? []

  // Nothing kept and nothing refused is a report from before any of this
  // existed, or one whose script agent never ran. Silence is right: there is no
  // claim on the screen to correct. A failed *read* is not silence, because the
  // count above may be short for a reason we are hiding.
  if (ideas.length === 0 && refused.length === 0 && withheld !== null) return null

  return (
    <Card className="p-5">
      <Eyebrow>
        {/* The count is the data's, in both places it appears. */}
        {ideas.length === 1 ? 'Your first video' : `Your first ${ideas.length} videos`}
      </Eyebrow>
      <h3 className="mt-2 font-heading text-title text-text">
        {ideas.length === 0
          ? 'Nothing passed both checks this time'
          : headingFor(ideas.length, niche)}
      </h3>
      <p className="mt-2 max-w-prose text-meta text-text-muted">
        Built from the formats above, in your words, each one standing on something true about your
        business. New script, your footage — we never remake anyone else’s video.
      </p>

      <ol className="mt-4 space-y-5">
        {ideas.map((idea, index) => {
          /*
           * The hook, once (D131).
           *
           * `SCRIPT_SYSTEM` asks for a beat labelled Hook and `idea.hook` holds
           * the same opening line, so printing the hook line and then the whole
           * beat list put "Hook:" on the page twice, four lines apart, for every
           * idea the agent has ever written.
           */
          const { hookBeat, rest } = splitHookBeat(idea.beats, idea.hook)

          return (
            <li className="border-t border-border pt-5 first:border-t-0 first:pt-0" key={idea.title}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="machine text-meta text-text-muted">{index + 1}</span>
                <h4 className="text-body font-medium text-text">{idea.title}</h4>
                <span className="text-meta text-text-muted">from “{idea.formatName}”</span>
              </div>

              {/* The hook is the video. It gets the line it deserves. */}
              <p className="mt-2 max-w-prose text-body text-text">
                <span className="font-medium">Hook: </span>“{idea.hook}”
              </p>

              {/*
                And the direction the Hook beat carried, when it says something
                the line above does not — unlabelled, because the label is
                already spent.
              */}
              {hookBeat ? (
                <p className="mt-1 max-w-prose text-meta text-text-muted">{hookBeat.text}</p>
              ) : null}

              <ol className="mt-3 space-y-1 text-meta text-text-muted">
                {rest.map((beat) => (
                  <li key={beat.label}>
                    <span className="font-medium text-text">{beat.label}: </span>
                    {beat.text}
                  </li>
                ))}
              </ol>

              {idea.footage.length > 0 ? (
                <div className="mt-3">
                  <p className="m-0 text-meta font-medium text-text">What to film</p>
                  <ul className="mt-1 space-y-1 text-meta text-text-muted">
                    {idea.footage.map((shot) => (
                      <li className="flex gap-2" key={shot}>
                        <span aria-hidden="true" className="select-none text-accent">
                          ·
                        </span>
                        <span>{shot}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/*
                The fact is printed, not merely required. §V2 asks every script
                to carry one; showing which one makes it checkable by the person
                who would be quoted on it.
              */}
              <p className="mt-3 text-meta text-text-muted">
                <span className="font-medium text-text">Your fact: </span>
                {idea.fact}
              </p>

              {/*
                And what the gate said about it. On the screen rather than only
                in the row — §V3's "the block is visible in the studio", and the
                line that makes the ideas above auditable.
              */}
              <GateVerdict verdict={idea.originality} />
            </li>
          )
        })}
      </ol>

      {withheld === null ? (
        <p className="mt-5 max-w-prose rounded-lg border border-border bg-neutral-soft px-4 py-3 text-meta text-on-neutral-soft">
          We could not read what the checks decided about this scan’s other ideas. That is about our
          request, not about these videos.
        </p>
      ) : (
        <Withheld ideas={refused} />
      )}
    </Card>
  )
}
