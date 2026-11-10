import type { Metadata } from 'next'
import Link from 'next/link'
import { Button, EmptyState } from '@mirrorline/ui'

export const metadata: Metadata = { title: 'Page not found' }

/**
 * The 404. EmptyState already carries the loop motif, which DESIGN.md asks for
 * here: "The loop motif repeats in empty states and the learning-loop card."
 *
 * This page sits outside the studio shell, so it carries its own <main> for the
 * skip link in the root layout to land on.
 */
export default function NotFound() {
  // tabIndex -1: Safari scrolls to a skip-link target without moving focus, so
  // the next Tab would otherwise start again from the top of the document.
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-dvh items-center justify-center px-[18px] py-10 sm:px-8"
    >
      <EmptyState
        className="w-full max-w-[32rem]"
        title="We can't find that page"
        description="The link may be old, or the page may have moved. Home has today's posts and anything waiting for you."
        action={
          <Button variant="primary" asChild>
            <Link href="/app/home">Go to home</Link>
          </Button>
        }
      />
    </main>
  )
}
