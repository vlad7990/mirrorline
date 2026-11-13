/**
 * /contact — how to reach us, with the booking link as a placeholder (16 §4).
 *
 * The booking link is honestly a placeholder: no calendar is connected, so
 * the page says "we reply and propose times" rather than showing a scheduler
 * that would go nowhere. A fake Book-a-time button is the kind of small lie
 * that costs more than the convenience is worth.
 */

import { Card } from '@mirrorline/ui'
import type { Metadata } from 'next'
import * as React from 'react'

import { LeadDialogButton } from '@/app/(marketing)/components/lead-form'
import { PageHero } from '@/components/marketing/page-hero'
import { Section, SectionHeading } from '@/components/marketing/primitives'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Ask us anything, book a call, or report an accessibility problem. A person answers, usually within a working day.',
}

interface Route {
  readonly id: string
  readonly title: string
  readonly body: string
}

const ROUTES: readonly Route[] = [
  {
    id: 'pilot',
    title: 'You want to start',
    body: 'The fastest route is the free Niche Scan — it costs nothing and tells you what we would make before you decide anything. If you would rather talk first, say so and we will propose times.',
  },
  {
    id: 'question',
    title: 'You have a question about the product',
    body: 'Ask it directly. If the honest answer is “we cannot promise that”, that is the answer you will get — the same one the FAQ gives.',
  },
  {
    id: 'accessibility',
    title: 'Something here is not accessible',
    body: 'Tell us what happened and we treat it as a defect, not a request. You do not need to name a standard or explain why it matters.',
  },
  {
    id: 'legal',
    title: 'You are a platform, a lawyer or a rights holder',
    body: 'Say so in the first line and it goes straight to a person rather than through the usual queue. Everything we do is meant to be explicable to you, and if something is not, we want to know first.',
  },
]

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            A person answers, <span className="gold-phrase">usually within a day.</span>
          </>
        }
        lead="There is no support ticket system and no chatbot. Tell us what you need and we will reply, including when the answer is no."
        action={
          <>
            <LeadDialogButton intent="demo" variant="gold" size="lg">
              Send us a message
            </LeadDialogButton>
            <LeadDialogButton intent="pilot" variant="secondary" size="lg">
              Ask about a pilot
            </LeadDialogButton>
          </>
        }
        index={ROUTES.map((route, position) => ({
          number: String(position + 1).padStart(2, '0'),
          title: route.title,
        }))}
        marginNote="no ticket system · no chatbot"
      />

      <Section aria-labelledby="routes-heading">
        <SectionHeading
          id="routes-heading"
          eyebrow="What are you after?"
          title={
            <>
              Four reasons people write, <span className="gold-phrase">and what happens next.</span>
            </>
          }
          headingClassName="text-site-h2 font-serif"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
          {ROUTES.map((route, position) => (
            <li
              key={route.id}
              className="reveal-item"
              style={{ '--index': position % 2 } as React.CSSProperties}
            >
              <Card className="flex h-full flex-col gap-2">
                <h3 className="m-0 font-heading text-subtitle text-text">{route.title}</h3>
                <p className="m-0 text-meta text-text-muted">{route.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="subtle" size="md" aria-labelledby="booking-heading">
        <SectionHeading
          id="booking-heading"
          eyebrow="Booking a call"
          title="No scheduler yet, on purpose"
          headingClassName="text-site-h2 font-serif"
        />
        <p className="mt-6 mb-0 max-w-[72ch] text-body text-text-muted">
          We have not connected a calendar, so there is no “pick a slot” button here. Rather than
          showing one that goes nowhere, we reply to your message with two or three times. When a
          scheduler is connected this page will say so, and the button will do what it says.
        </p>
      </Section>
    </>
  )
}
