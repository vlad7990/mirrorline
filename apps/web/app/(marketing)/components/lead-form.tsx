'use client'

/**
 * "Start a pilot" and "Book a demo" both open this one form.
 *
 * It posts to /api/leads, which appends the lead to .data/leads.json. If that
 * write fails the form says so and keeps the typed values: a lead we did not
 * store must never look like a lead we did.
 *
 * 02_BRAND_AND_VOICE.md: plain verbs, sentence case, no exclamation marks.
 */

import { Button, Input, Label, Textarea, cn } from '@mirrorline/ui'
import { Check } from 'lucide-react'
import * as React from 'react'

import { Modal } from '@/components/marketing/modal'

export type LeadIntent = 'pilot' | 'demo'

interface IntentCopy {
  readonly buttonLabel: string
  readonly title: string
  readonly description: string
  readonly submitLabel: string
  readonly wantLabel: string
  readonly wantPlaceholder: string
}

const INTENT_COPY: Record<LeadIntent, IntentCopy> = {
  pilot: {
    buttonLabel: 'Start a pilot',
    title: 'Start a pilot',
    description: 'Tell us what you have and what you want. We reply by email.',
    submitLabel: 'Send and start a pilot',
    wantLabel: 'What do you want from the first two weeks?',
    wantPlaceholder: 'For example: turn my weekly podcast into daily posts on Instagram and TikTok.',
  },
  demo: {
    buttonLabel: 'Book a demo',
    title: 'Book a demo',
    description: 'A 20-minute call. We walk through the studio with your own numbers in mind.',
    submitLabel: 'Send and book a demo',
    wantLabel: 'What would you like to see?',
    wantPlaceholder: 'For example: how the compliance gate works before anything posts.',
  },
}

type FormState = 'idle' | 'sending' | 'sent' | 'failed'

type FieldName = 'name' | 'email' | 'company' | 'want'
type FormValues = Record<FieldName, string>

const EMPTY_VALUES: FormValues = { name: '', email: '', company: '', want: '' }

export interface LeadDialogButtonProps {
  intent: LeadIntent
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost'
  size?: 'lg' | 'md'
  fullWidth?: boolean
  className?: string
  /** Overrides the default button label. */
  children?: React.ReactNode
}

/** A button that opens the lead form. Each instance owns its own dialog. */
export function LeadDialogButton({
  intent,
  variant = 'primary',
  size,
  fullWidth = false,
  className,
  children,
}: LeadDialogButtonProps) {
  const [open, setOpen] = React.useState(false)
  const copy = INTENT_COPY[intent]

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children ?? copy.buttonLabel}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={copy.title}
        description={copy.description}
        closeLabel="Close this form"
      >
        <LeadForm intent={intent} onDone={() => setOpen(false)} />
      </Modal>
    </>
  )
}

interface LeadFormProps {
  intent: LeadIntent
  onDone: () => void
}

function LeadForm({ intent, onDone }: LeadFormProps) {
  const copy = INTENT_COPY[intent]
  const [values, setValues] = React.useState<FormValues>(EMPTY_VALUES)
  const [state, setState] = React.useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  function update(field: FieldName, value: string) {
    // Immutable update: a new object every keystroke, never a mutated one.
    setValues((previous) => ({ ...previous, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('sending')
    setErrorMessage(null)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, ...values }),
      })

      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        setErrorMessage(readErrorMessage(payload))
        setState('failed')
        return
      }

      setState('sent')
    } catch {
      setErrorMessage('We could not reach the server. Check your connection and try again.')
      setState('failed')
    }
  }

  if (state === 'sent') {
    return (
      <div className="flex flex-col gap-4">
        <p className="m-0 flex items-start gap-2.5 text-body text-text">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-success-soft text-on-success-soft">
            <Check aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
          </span>
          Thanks. We have your note and will reply to {values.email || 'your email address'} within
          one working day.
        </p>
        <p className="m-0 text-meta text-text-muted">
          Nothing is charged and nothing is scheduled until you say so.
        </p>
        <Button variant="secondary" onClick={onDone}>
          Close
        </Button>
      </div>
    )
  }

  const isSending = state === 'sending'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {state === 'failed' && errorMessage ? (
        <p
          role="alert"
          className={cn(
            'm-0 rounded-md border border-danger-soft bg-danger-soft px-4 py-3',
            'text-meta font-semibold text-on-danger-soft',
          )}
        >
          {errorMessage}
        </p>
      ) : null}

      <Field label="Your name" htmlFor="lead-name">
        <Input
          id="lead-name"
          name="name"
          autoComplete="name"
          required
          value={values.name}
          onChange={(event) => update('name', event.target.value)}
        />
      </Field>

      <Field label="Work email" htmlFor="lead-email" hint="For example: maya@mayatorres.example">
        <Input
          id="lead-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(event) => update('email', event.target.value)}
        />
      </Field>

      <Field label="Company or practice" htmlFor="lead-company">
        <Input
          id="lead-company"
          name="company"
          autoComplete="organization"
          required
          value={values.company}
          onChange={(event) => update('company', event.target.value)}
        />
      </Field>

      <Field label={copy.wantLabel} htmlFor="lead-want">
        <Textarea
          id="lead-want"
          name="want"
          required
          rows={4}
          placeholder={copy.wantPlaceholder}
          value={values.want}
          onChange={(event) => update('want', event.target.value)}
        />
      </Field>

      <Button type="submit" variant="primary" fullWidth loading={isSending} loadingLabel="Sending">
        {isSending ? 'Sending' : copy.submitLabel}
      </Button>

      <p className="m-0 text-meta text-text-muted">
        We use this to reply to you and nothing else. No newsletter, no list.
      </p>
    </form>
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}

function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <span className="text-meta text-text-muted">{hint}</span> : null}
    </div>
  )
}

const FALLBACK_ERROR =
  'We could not save your details. Nothing was sent. Please email hello@mirrorline.example instead.'

/** The route returns { ok: false, error: string }; anything else gets the fallback. */
function readErrorMessage(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const { error } = payload as { error?: unknown }
    if (typeof error === 'string' && error.length > 0) return error
  }
  return FALLBACK_ERROR
}
