'use client'

import { teamMembers } from '@mirrorline/mock'
import { Button, Card, Divider } from '@mirrorline/ui'

/**
 * "Team" — who is in the workspace and what each person may do.
 *
 * 03_SCREENS_SPEC.md "S10 · Settings and billing" lists "team members". The
 * permission reads as the tail of a sentence after the role, which is why its
 * first letter is lowered here rather than stored twice in the fixtures.
 */

export interface TeamCardProps {
  /** Shows a toast, because invites are not wired up in this preview. */
  onNotice: (title: string, description: string) => void
}

function asSentenceTail(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export function TeamCard({ onNotice }: TeamCardProps) {
  return (
    <Card as="section" className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-subtitle text-text">Team</h2>

      <ul className="m-0 flex list-none flex-col p-0">
        {teamMembers.map((member) => (
          <li key={member.id} className="flex flex-col gap-2 pt-2">
            <Divider />
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-1">
              <span className="text-body text-text">{member.name}</span>
              <span className="text-meta text-text-muted">
                {member.role} · {asSentenceTail(member.permission)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        className="self-start"
        onClick={() =>
          onNotice('Invites are not connected', 'This preview does not send email yet.')
        }
      >
        Invite someone
      </Button>
    </Card>
  )
}
