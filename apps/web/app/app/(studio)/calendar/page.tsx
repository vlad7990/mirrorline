import type { Metadata } from 'next'

import { CalendarView } from '@/components/calendar/calendar-view'
import { readWeekSchedule } from '@/lib/workspace/read-week-schedule'

export const metadata: Metadata = {
  title: 'Calendar',
  description:
    'The week ahead on each platform, and the posts still waiting for your approval.',
}

/**
 * A server component since B2.2, so the week is this workspace's own.
 *
 * `readWeekSchedule` runs as the signed-in user and RLS decides the rows, which
 * is why no workspace id appears here. The view stays a client component — it
 * owns the drag, the panel and the toast — and receives the week as props.
 */
export default async function CalendarPage() {
  const { schedule, posts } = await readWeekSchedule()

  return <CalendarView schedule={schedule} posts={posts} />
}
