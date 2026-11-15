'use client'

/**
 * The Niche Scan form (14 §3's lead magnet), as four steps — 19 v2
 * ★/niche-scan item 2, the last ★ left open after F1–F5.
 *
 * **Free text for the niche, never a dropdown.** A list of industries here
 * would quietly become the list of industries we serve, which is the thing
 * 16 §1 forbids — and the agents research whatever is typed, so a list would
 * also be a constraint the product does not have.
 *
 * The thank-you replaces the form in place rather than routing away: the
 * submission is the end of the interaction, and a navigation would lose the
 * answers if anything went wrong.
 *
 * ---
 *
 * **Why this was not built in F4, and what had to change (D52).**
 *
 * The form used to read its answers off the DOM at submit:
 * `new FormData(event.currentTarget)` for `niche` and `email`. That is fine
 * for a form whose fields are all mounted, and it makes a stepper impossible
 * in two different ways. Unmount the inactive steps and those inputs are not
 * in the form, so `FormData` returns nothing for them and the lead posts with
 * a blank niche and a blank address — silently, because the server's
 * rejection then names a field the user cannot see. Keep them mounted behind
 * `hidden` instead, and native `required` blocks the submit on a field that
 * is not on screen, which the browser reports by trying to focus something
 * invisible and otherwise doing nothing at all.
 *
 * So both fields are controlled, the payload is built from state, and the
 * validation native `required` was doing is now explicit, per step. **Those
 * rules are in `scan-steps.ts`, not here**, because a `.tsx` module cannot be
 * imported by a Vitest spec — and hand-written validation on a lead form is
 * the thing that most wants a test. The email check is imported rather than
 * rewritten: `isValidEmail` is the server's own, and two copies of that rule
 * is how a form starts accepting what the route rejects.
 *
 * **One form element, four steps.** Not four forms, and not a div: a single
 * `<form>` means the Enter key does the obvious thing on every step, which
 * `onSubmit` reads as "advance" on steps one to three and as "send" on step
 * four. A stepper built out of divs and click handlers loses that, and nobody
 * notices until somebody tries to use it from a keyboard.
 */

import { AlertBar, Button, Card, Input, Label, cn } from '@mirrorline/ui'
import * as React from 'react'

import { SubmitMorph, type SubmitPhase } from '@/components/marketing/submit-morph'
import { track } from '@/lib/analytics/events'
import { GOALS } from '@/lib/audience/account-type'
import { useAccountChoice } from '@/lib/audience/account-type-context'
import { MAX_HANDLES, MAX_NICHE, MAX_SHORT } from '@/lib/leads/niche-scan-lead'

import {
  type Answers,
  EMPTY_ANSWERS,
  LAST_STEP,
  STEPS,
  firstProblemStep,
  problemWith,
} from './scan-steps'
import { ScanStepper } from './scan-stepper'

/**
 * `confirming` is 17 §2's beat: the request is stored and the button is
 * drawing its checkmark, but the thank-you has not replaced the form yet.
 */
type State = 'idle' | 'sending' | 'confirming' | 'sent'

/** The form's states in the morph's vocabulary. A failure returns to idle and
 *  the `AlertBar` below the fields says what went wrong. */
const MORPH_PHASE: Record<State, SubmitPhase> = {
  idle: 'idle',
  sending: 'sending',
  confirming: 'done',
  sent: 'done',
}

export function ScanForm() {
  const { choice } = useAccountChoice()
  const [state, setState] = React.useState<State>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [stepProblem, setStepProblem] = React.useState<string | null>(null)
  const [step, setStep] = React.useState(0)
  const [answers, setAnswers] = React.useState<Answers>(EMPTY_ANSWERS)
  const headingId = React.useId()
  const problemId = React.useId()

  /**
   * The "Step n of 4" line, focused when the step changes.
   *
   * Without this a keyboard or screen-reader user presses "Next", the
   * question changes, and focus is left on a button that has just been
   * replaced — which drops them back to the top of the document. Moving focus
   * here both announces the new step and puts the next Tab in the right
   * place. `tabIndex={-1}` makes it focusable without adding it to the tab
   * order.
   */
  const stepLineRef = React.useRef<HTMLParagraphElement>(null)
  // The first render is the page loading, not a step change: focusing then
  // would scroll the form into view over whatever the visitor was reading.
  const hasMoved = React.useRef(false)

  React.useEffect(() => {
    if (!hasMoved.current) {
      hasMoved.current = true
      return
    }
    stepLineRef.current?.focus()
  }, [step])

  function update<K extends keyof Answers>(field: K, value: Answers[K]) {
    setAnswers((current) => ({ ...current, [field]: value }))
    setStepProblem(null)
  }

  async function send() {
    setError(null)
    setState('sending')
    track('niche_scan_submitted', {
      audience: choice.audience,
      stage: choice.stage,
      goal: answers.goal,
    })

    try {
      const response = await fetch('/api/niche-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // From state, not from the DOM. This is the whole of D52's fix: the
          // answers to steps one to three are long unmounted by the time
          // anybody presses the button on step four.
          email: answers.email,
          niche: answers.niche,
          audience: choice.audience,
          stage: choice.stage,
          goal: answers.goal,
          handles: answers.handles.filter((handle) => handle.trim().length > 0),
        }),
      })

      const result: unknown = await response.json()
      const payload = (result ?? {}) as { ok?: boolean; error?: string }

      if (!response.ok || payload.ok !== true) {
        setError(payload.error ?? 'We could not save that just now. Please try again.')
        setState('idle')
        return
      }

      // Not 'sent': the checkmark draws first, and `SubmitMorph` says when it
      // has landed.
      setState('confirming')
    } catch {
      // Network failure. Never leave the button spinning, and never claim the
      // scan is on its way when nothing reached us.
      setError('We could not reach the server. Please try again in a moment.')
      setState('idle')
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return

    const problem = problemWith(step, answers)
    if (problem) {
      setStepProblem(problem)
      return
    }

    if (step < LAST_STEP) {
      setStepProblem(null)
      setStep(step + 1)
      return
    }

    // Every step again, not only the last one. Belt and braces for a form
    // somebody could reach step four of with an earlier answer cleared — and
    // the step it finds is the step it sends them back to, because an error
    // about a question that is not on screen is not an error anybody can act
    // on. This is the same failure the old `FormData` read produced silently.
    const firstBad = firstProblemStep(answers)
    if (firstBad !== -1) {
      setStep(firstBad)
      setStepProblem(problemWith(firstBad, answers))
      return
    }

    void send()
  }

  function goBack() {
    setStepProblem(null)
    setStep((current) => Math.max(0, current - 1))
  }

  if (state === 'sent') return <ThankYou />

  const isLast = step === LAST_STEP

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 id={headingId} className="m-0 font-heading text-title text-text">
          Request your scan
        </h2>
        <ScanStepper steps={STEPS} current={step} />
      </div>

      {/* `noValidate` so there is exactly one validation path, which is the
          point of the rewrite rather than a detail of it. Left on, the
          browser's own check runs first and stops `onSubmit` ever firing for
          a malformed address — so the step would be refused by a native
          bubble on some steps and by our own message on others, which is two
          behaviours for one rule. `type="email"` stays: it is what gives a
          phone the right keyboard, and that is not validation. */}
      <form
        onSubmit={onSubmit}
        noValidate
        aria-labelledby={headingId}
        className="flex flex-col gap-5"
      >
        <p
          ref={stepLineRef}
          tabIndex={-1}
          className="machine m-0 text-mono text-text-muted outline-none"
        >
          Step {step + 1} of {STEPS.length}
        </p>

        {step === 0 ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="scan-niche">What do you do? In your own words.</Label>
            <Input
              id="scan-niche"
              name="niche"
              maxLength={MAX_NICHE}
              aria-invalid={stepProblem !== null || undefined}
              aria-describedby={stepProblem ? problemId : undefined}
              placeholder="We run a two-person bookkeeping practice for tradespeople"
              value={answers.niche}
              onChange={(event) => update('niche', event.target.value)}
            />
            <p className="m-0 text-caption text-text-muted">
              There is no industry list, here or anywhere on this site. Whatever you type is what
              the agents go and research.
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-label font-semibold text-text">
              What should the scan aim at?
            </legend>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((option) => {
                const isSelected = option.key === answers.goal
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      update('goal', option.key)
                      track('goal_selected', { goal: option.key })
                    }}
                    className={cn(
                      'press min-h-11 rounded-full border px-4 text-label font-medium transition-colors',
                      isSelected
                        ? 'border-gold bg-gold-wash text-ink-900'
                        : 'border-border-strong bg-surface text-text-muted hover:text-text',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            <p className="m-0 text-caption text-text-muted">
              One goal, and it decides which numbers the scan leads with. You can change it later.
            </p>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-label font-semibold text-text">
              Up to {MAX_HANDLES} accounts you admire (optional)
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {answers.handles.map((handle, index) => (
                <div key={index} className="flex flex-col">
                  <Label htmlFor={`scan-handle-${index}`} className="sr-only">
                    Account {index + 1}
                  </Label>
                  <Input
                    id={`scan-handle-${index}`}
                    value={handle}
                    maxLength={MAX_SHORT}
                    placeholder="@someone"
                    onChange={(event) =>
                      update(
                        'handles',
                        answers.handles.map((value, position) =>
                          position === index ? event.target.value : value,
                        ),
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <p className="m-0 text-caption text-text-muted">
              We only read what is public, and we never download anyone’s video or audio. Leave
              this empty if nothing comes to mind.
            </p>
          </fieldset>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="scan-email">Where should the scan go?</Label>
            <Input
              id="scan-email"
              name="email"
              type="email"
              maxLength={MAX_SHORT}
              aria-invalid={stepProblem !== null || undefined}
              aria-describedby={stepProblem ? problemId : undefined}
              placeholder="you@your-business.example"
              value={answers.email}
              onChange={(event) => update('email', event.target.value)}
            />
          </div>
        ) : null}

        {/* The step's own problem, next to the field it is about. Distinct
            from the `AlertBar` below, which is the server saying no — two
            different failures, and collapsing them into one message is how a
            typo starts reading like an outage. */}
        {stepProblem ? (
          <p id={problemId} role="alert" className="m-0 text-meta font-semibold text-on-danger-soft">
            {stepProblem}
          </p>
        ) : null}

        {error ? <AlertBar tone="danger" title="That did not send" description={error} /> : null}

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {step > 0 ? (
              <Button type="button" variant="secondary" className="press" onClick={goBack}>
                Back
              </Button>
            ) : null}

            {isLast ? (
              /* 17 §2: the button collapses to a spinner, then draws a
                 checkmark, and only then does the thank-you take its place. */
              <SubmitMorph
                phase={MORPH_PHASE[state]}
                variant="gold"
                sendingLabel="Sending"
                doneLabel="Sent"
                onSettled={() => setState('sent')}
              >
                Get my free Niche Scan
              </SubmitMorph>
            ) : (
              <Button type="submit" variant="gold" className="press">
                Next
              </Button>
            )}
          </div>

          <p className="m-0 text-caption text-text-muted">
            No card, no call booked automatically, and we do not add you to a mailing list. We use
            your email to send the scan and to answer you.
          </p>
        </div>
      </form>
    </Card>
  )
}

/**
 * The thank-you. It says what happens next and, importantly, what does not:
 * the prototype stores the request and nothing is emailed yet.
 */
function ThankYou() {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="m-0 font-heading text-title text-text">That is with us.</h2>
      <p className="m-0 max-w-[62ch] text-body text-text-muted">
        A strategist reads it by hand before anything is sent, which is why it takes about 48 hours
        rather than arriving instantly. You will get five to ten format recipes, each with why it
        is growing in your niche and how we would make it yours.
      </p>
      <p className="m-0 max-w-[62ch] rounded-md border border-border bg-surface-subtle p-4 text-meta text-text-muted">
        <strong className="font-semibold text-text">While this is a prototype:</strong> your
        request has been stored, and no email has been sent. Nothing in this build sends mail to
        anyone.
      </p>
      <p className="m-0 text-meta text-text-muted">
        In the meantime, the{' '}
        <a href="/niche-scan/sample" className="underline underline-offset-4">
          sample report
        </a>{' '}
        shows exactly what arrives.
      </p>
    </Card>
  )
}
