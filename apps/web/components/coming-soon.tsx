import { PageHeader } from '@mirrorline/ui'

/**
 * A studio screen that has its header and its route, and nothing else yet.
 *
 * Each placeholder page is one call to this, so the nine of them cannot drift
 * apart while they are being filled in one at a time.
 */

export interface ComingSoonProps {
  /** Small uppercase line above the title. Written in sentence case. */
  eyebrow: string
  title: string
  /** One calm line saying what the screen will do. */
  description: string
}

export function ComingSoon({ eyebrow, title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <p className="m-0 text-body text-text-muted">Coming in this build.</p>
    </div>
  )
}
