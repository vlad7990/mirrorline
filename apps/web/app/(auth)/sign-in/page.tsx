/**
 * /sign-in — form on the left, today's studio on the right.
 *
 * The right-hand panel is the Stitch "live session teaser", rebuilt from the
 * demo fixtures and labelled "Sample data", because it belongs to a fictional
 * client and not to whoever is signing in.
 */

import { agents, todaySchedule, workspace } from '@mirrorline/mock'
import { AgentStatusPill, Card, StatusChip } from '@mirrorline/ui'
import type { Metadata } from 'next'

import { SampleDataLabel } from '@/components/marketing/primitives'

import { SignInForm } from '../components/auth-forms'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Mirrorline studio.',
}

/** Enough agents to show the loop is running, without filling the column. */
const AGENTS_SHOWN = 4

export default function SignInPage() {
  const shownAgents = agents.slice(0, AGENTS_SHOWN)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-10">
      {/* Form ----------------------------------------------------------- */}
      <Card padding="lg" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Sign in</span>
          <h1 className="m-0 font-heading text-headline text-text">Welcome back</h1>
          <p className="m-0 max-w-[48ch] text-body text-text-muted">
            Pick up where you left off: today&rsquo;s cuts, what needs your eye, and what is going
            out this evening.
          </p>
        </div>
        <SignInForm />
      </Card>

      {/* Context panel --------------------------------------------------- */}
      <aside aria-labelledby="studio-today-heading" className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="studio-today-heading" className="m-0 font-heading text-title text-text">
                Today in the studio
              </h2>
              <p className="m-0 text-meta text-text-muted">{workspace.name}</p>
            </div>
            <SampleDataLabel />
          </div>

          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {todaySchedule.map((post) => (
              <li
                key={post.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-surface-subtle px-3 py-2.5"
              >
                <span className="tabular w-[72px] shrink-0 text-meta text-text-muted">
                  {post.timeLabel}
                </span>
                <span className="min-w-0 flex-1 text-meta text-text">
                  <span className="font-semibold">{post.platformLabel}</span> · {post.title}
                </span>
                <StatusChip status={post.status} />
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <h3 className="eyebrow m-0">The seven agents</h3>
            <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0">
              {shownAgents.map((agent) => (
                <li key={agent.id} className="flex items-center gap-2">
                  <span className="text-meta text-text">{agent.name}</span>
                  <AgentStatusPill status={agent.status} short />
                </li>
              ))}
            </ul>
          </div>

          <p className="m-0 text-meta text-text-muted">
            Sample data from Maya Torres Coaching, a fictional demo workspace. Your own studio will
            show your posts and your numbers.
          </p>
        </Card>
      </aside>
    </div>
  )
}
