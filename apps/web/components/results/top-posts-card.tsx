/**
 * "Top posts" — a real semantic table.
 *
 * StatTable renders `<th scope>` headers, tabular figures and the `.scroll-x`
 * wrapper DESIGN.md "Layout" asks for, so the table scrolls inside its card
 * rather than breaking the page at 390px.
 */

import type { TopPost } from '@mirrorline/mock'
import { topPosts } from '@mirrorline/mock'
import { Card, StatTable, type StatColumn } from '@mirrorline/ui'

function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}

const COLUMNS: readonly StatColumn<TopPost>[] = [
  {
    key: 'post',
    header: 'Post',
    rowHeader: true,
    cell: (post) => (
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-9 w-[22px] shrink-0 rounded-sm"
          style={{ backgroundColor: post.thumbnailColor }}
        />
        {post.hook}
      </span>
    ),
  },
  { key: 'platform', header: 'Platform', cell: (post) => post.platformLabel },
  {
    key: 'views',
    header: 'Views',
    align: 'right',
    numeric: true,
    cell: (post) => formatCount(post.views),
  },
  {
    key: 'clicks',
    header: 'Clicks',
    align: 'right',
    numeric: true,
    cell: (post) => formatCount(post.clicks),
  },
  {
    key: 'calls',
    header: 'Calls',
    align: 'right',
    numeric: true,
    cell: (post) => <span className="font-semibold">{formatCount(post.calls)}</span>,
  },
]

export function TopPostsCard() {
  return (
    <Card as="section" aria-labelledby="top-posts-heading" className="flex min-w-0 flex-col gap-2">
      <h2 id="top-posts-heading" className="m-0 mb-1.5 font-heading text-title text-text">
        Top posts
      </h2>
      <StatTable
        caption="Top posts of the last 7 days, with views, link clicks and calls booked"
        captionHidden
        columns={COLUMNS}
        rows={topPosts}
        rowKey={(post) => post.id}
      />
    </Card>
  )
}
