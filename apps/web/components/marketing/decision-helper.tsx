'use client'

/**
 * Three questions, answered in place, with a verdict that is usually not us.
 *
 * The logic is in `decision-helper-content.ts` and is tested there; this is
 * only the shape it is asked in. Two things about that shape are deliberate.
 *
 * **Nothing is hidden behind a "next" button.** All three questions are on
 * screen at once, as radio groups, and the verdict appears once all three are
 * answered. A stepper would make the page feel like a funnel, and a funnel is
 * precisely the reading this section has to avoid — it exists to tell some
 * people to go elsewhere.
 *
 * **The verdict is announced, not just drawn.** Its region is
 * `aria-live="polite"`, so a screen-reader user hears the answer change
 * rather than discovering it by chance later. Not `assertive`: nothing here
 * is urgent enough to interrupt what someone is already reading.
 */

import { Button, Card, cn } from '@mirrorline/ui'
import * as React from 'react'

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'

import {
  CADENCE_QUESTION,
  CONTROL_QUESTION,
  FOOTAGE_QUESTION,
  recommend,
  type CadenceAnswer,
  type ControlAnswer,
  type DecisionQuestion,
  type FootageAnswer,
} from './decision-helper-content'

export function DecisionHelper() {
  const [footage, setFootage] = React.useState<FootageAnswer | null>(null)
  const [cadence, setCadence] = React.useState<CadenceAnswer | null>(null)
  const [control, setControl] = React.useState<ControlAnswer | null>(null)

  const isComplete = footage !== null && cadence !== null && control !== null
  const verdict = isComplete ? recommend({ footage, cadence, control }) : null

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <QuestionGroup entry={FOOTAGE_QUESTION} value={footage} onChange={setFootage} />
        <QuestionGroup entry={CADENCE_QUESTION} value={cadence} onChange={setCadence} />
        <QuestionGroup entry={CONTROL_QUESTION} value={control} onChange={setControl} />

        {isComplete ? (
          <Button
            variant="tertiary"
            className="self-start"
            onClick={() => {
              setFootage(null)
              setCadence(null)
              setControl(null)
            }}
          >
            Start again
          </Button>
        ) : null}
      </div>

      <div className="lg:col-span-5" aria-live="polite">
        {verdict === null ? (
          <Card className="flex h-full flex-col justify-center gap-2">
            <p className="m-0 text-meta text-text-muted">
              Answer the three questions and this will say what we think you should do — including
              when that is not us.
            </p>
          </Card>
        ) : (
          <Card
            className={cn(
              'flex h-full flex-col gap-4',
              // The gold is reserved for the outcomes where we are the
              // answer. A "go elsewhere" verdict dressed in the brand's
              // primary would read as a sales card whatever it said.
              verdict.isUs ? 'border-gold bg-gold/5' : null,
            )}
          >
            <span className="eyebrow">{verdict.isUs ? 'Probably us' : 'Probably not us'}</span>
            <h3 className="m-0 font-heading text-title text-text">{verdict.title}</h3>
            <p className="m-0 text-body text-text-muted">{verdict.body}</p>

            {/* A plan and an action only where the verdict is us. Every other
                branch ends here, with no button — which is the whole point of
                the section (19 v2 ★4). */}
            {verdict.isUs ? (
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <LeadDialogButton intent="pilot" variant="gold" size="lg" fullWidth />
                <p className="m-0 text-caption text-text-muted">
                  Starts with the two-week pilot, whichever plan follows it.
                </p>
              </div>
            ) : null}
          </Card>
        )}
      </div>
    </div>
  )
}

interface QuestionGroupProps<T extends string> {
  readonly entry: DecisionQuestion<T>
  readonly value: T | null
  readonly onChange: (value: T) => void
}

/**
 * One question as a labelled radio group.
 *
 * Native `<input type="radio">` rather than buttons with `role="radio"`: a
 * real radio group gives arrow-key navigation, a single tab stop and form
 * semantics for free, and there is nothing here that needs the control to
 * look like something a radio cannot.
 */
function QuestionGroup<T extends string>({ entry, value, onChange }: QuestionGroupProps<T>) {
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="m-0 p-0 font-heading text-subtitle text-text">{entry.question}</legend>
      <div className="flex flex-col gap-2">
        {entry.options.map((option) => {
          const id = `${entry.id}-${option.value}`
          const isChosen = value === option.value

          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                'flex min-h-touch cursor-pointer items-center gap-3 rounded-md border px-4 py-3',
                'text-meta transition-colors duration-[var(--duration-dropdown)] ease-out',
                isChosen
                  ? 'border-gold bg-gold/5 text-text'
                  : 'border-border text-text-muted hover:border-border-strong hover:text-text',
              )}
            >
              <input
                type="radio"
                id={id}
                name={entry.id}
                value={option.value}
                checked={isChosen}
                onChange={() => onChange(option.value)}
                className="size-4 accent-gold-deep"
              />
              {option.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
