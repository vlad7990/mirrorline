import type { Metadata } from 'next'

import { CalendarView } from '@/components/calendar/calendar-view'

export const metadata: Metadata = {
  title: 'Calendar',
  description:
    'The week ahead on each platform, and the posts still waiting for your approval.',
}

export default function CalendarPage() {
  return <CalendarView />
}
