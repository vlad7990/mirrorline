'use client'

/**
 * The Niche Scan form (14 §3's lead magnet).
 *
 * **Free text for the niche, never a dropdown.** A list of industries here
 * would quietly become the list of industries we serve, which is the thing
 * 16 §1 forbids — and the agents research whatever is typed, so a list would
 * also be a constraint the product does not have.
 *
 * The thank-you replaces the form in place rather than routing away: the
 * submission is the end of the interaction, and a navigation would lose the
 * answers if anything went wrong.
 */

import { AlertBar, Button, Card, Input, Label, cn } from '@mirrorline/ui'
import * as React from 'react'

import { track } from '@/lib/analytics/events'
import { GOALS, type GoalKey } from '@/lib/audience/account-type'
import { useAccountChoice } from '@/lib/audience/account-type-context'
import { MAX_HANDLES } from '@/lib/leads/niche-scan-lead'

type State = 'idle' | 'sending' | 'sent'

export function ScanForm() {
  const { choice } = useAccountChoice()
  const [state, setState] = React.useState<State>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [goal, setGoal] = React.useState<GoalKey>('leads')
  const [handles, setHandles] = React.useState<string[]>(['', '', ''])
  const headingId = React.useId()

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setState('sending')

    const data = new FormData(event.currentTarget)
    track('niche_scan_submitted', { audience: choice.audience, stage: choice.stage, goal })

    try {
      const response = await fetch('/api/niche-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          niche: data.get('niche'),
          audience: choice.audience,
          stage: choice.stage,
          goal,
          handles: handles.filter((handle) => handle.trim().length > 0),
        }),
      })

      const result: unknown = await response.json()
      const payload = (result ?? {}) as { ok?: boolean; error?: string }

      if (!response.ok || payload.ok !== true) {
        setError(payload.error ?? 'We could not save that just now. Please try again.')
        setState('idle')
        return
      }

      setState('sent')
    } catch {
      // Network failure. Never leave the button spinning, and never claim the
      // scan is on its way when nothing reached us.
      setError('We could not reach the server. Please try again in a moment.')
      setState('idle')
    }
  }

  if (state === 'sent') return <ThankYou />

  return (
    <Card className="flex flex-col gap-6">
      <h2 id={headingId} className="m-0 font-heading text-title text-text">
        Request your scan
      </h2>

      <form onSubmit={onSubmit} aria-labelledby={headingId} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="scan-niche">What do you do? In your own words.</Label>
          <Input
            id="scan-niche"
            name="niche"
            required
            maxLength={400}
            placeholder="We run a two-person bookkeeping practice for tradespeople"
          />
          <p className="m-0 text-caption text-text-muted">
            There is no industry list, here or anywhere on this site. Whatever you type is what the
            agents go and research.
          </p>
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-label font-semibold text-text">
            What should the scan aim at?
          </legend>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((option) => {
              const isSelected = option.key === goal
              return (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setGoal(option.key)
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
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 text-label font-semibold text-text">
            Up to {MAX_HANDLES} accounts you admire (optional)
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {handles.map((handle, index) => (
              <div key={index} className="flex flex-col">
                <Label htmlFor={`scan-handle-${index}`} className="sr-only">
                  Account {index + 1}
                </Label>
                <Input
                  id={`scan-handle-${index}`}
                  value={handle}
                  maxLength={200}
                  placeholder="@someone"
                  onChange={(event) =>
                    setHandles((current) =>
                      current.map((value, position) =>
                        position === index ? event.target.value : value,
                      ),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <p className="m-0 text-caption text-text-muted">
            We only read what is public, and we never download anyone’s video or audio.
          </p>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="scan-email">Where should the scan go?</Label>
          <Input
            id="scan-email"
            name="email"
            type="email"
            required
            maxLength={200}
            placeholder="you@example.com"
          />
        </div>

        {error ? <AlertBar tone="danger" title="That did not send" description={error} /> : null}

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" variant="gold" disabled={state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Get my free Niche Scan'}
          </Button>
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
