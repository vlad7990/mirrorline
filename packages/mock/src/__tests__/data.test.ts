import { describe, expect, test } from 'vitest'

import {
  accounts,
  agentFeed,
  agents,
  brandKit,
  cutSummary,
  cuts,
  funnel,
  hookTypeRanking,
  invoices,
  metrics,
  sourceVideo,
  teamMembers,
  todaySchedule,
  topPosts,
  trends,
  weekDays,
  weekPosts,
  weekSchedule,
  workspace,
} from '../index'

/**
 * These assertions are the contract with docs/specs/08_MOCK_DATA.md.
 * If a figure changes there, change it here in the same commit.
 */

describe('workspace', () => {
  test('is on the Growth plan with 63 of 90 posts used', () => {
    expect(workspace.name).toBe('Maya Torres Coaching')
    expect(workspace.planName).toBe('Growth')
    expect(workspace.planPriceUsdPerMonth).toBe(1500)
    expect(workspace.postsUsed).toBe(63)
    expect(workspace.postsIncluded).toBe(90)
  })

  test('sits in the Coaching niche with three nearby niches', () => {
    expect(workspace.niche).toBe('Coaching')
    expect(workspace.nearbyNiches).toEqual(['Leadership', 'Productivity', 'Wellness'])
    expect(workspace.goal).toBe('Book discovery calls')
    expect(workspace.goalLink).toBe('mayatorres.example/call')
  })
})

describe('accounts', () => {
  test('cover four platforms, with Instagram needing a reconnect', () => {
    expect(accounts).toHaveLength(4)
    expect(accounts.find((account) => account.platform === 'instagram')?.status).toBe(
      'reconnect-needed',
    )
    expect(accounts.find((account) => account.platform === 'linkedin')?.status).toBe(
      'not-connected',
    )
  })

  test('TikTok posts stay private until the app is approved', () => {
    const tiktok = accounts.find((account) => account.platform === 'tiktok')
    expect(tiktok?.handle).toBe('@mayaleads')
    expect(tiktok?.isPrivatePosting).toBe(true)
  })
})

describe('source video', () => {
  test('is Episode 47, 52:14, uploaded at 9:12 am today', () => {
    expect(sourceVideo.title).toBe('Episode 47: Why good managers burn out')
    expect(sourceVideo.durationLabel).toBe('52:14')
    expect(sourceVideo.durationSeconds).toBe(3134)
    expect(sourceVideo.uploadedOn).toBe('2026-11-09')
    expect(sourceVideo.uploadedAtLabel).toBe('9:12 am')
  })
})

describe('cuts', () => {
  test('there are 12 cuts from Episode 47', () => {
    expect(cuts).toHaveLength(12)
    expect(cutSummary.total).toBe(12)
  })

  test('compliance splits 9 passed, 2 need review, 1 blocked', () => {
    expect(cutSummary.passed).toBe(9)
    expect(cutSummary.needsReview).toBe(2)
    expect(cutSummary.blocked).toBe(1)
    expect(cutSummary.needsYourEye).toBe(3)
  })

  test('scores run from 92 down to 61 in the spec order', () => {
    expect(cuts.map((cut) => cut.score)).toEqual([92, 88, 86, 84, 83, 80, 79, 77, 75, 74, 72, 61])
  })

  test('the blocked cut is the venue-music offsite story', () => {
    const blocked = cuts.filter((cut) => cut.compliance === 'blocked')
    expect(blocked).toHaveLength(1)
    expect(blocked[0]?.hook).toBe('Funny story about my first team offsite')
    expect(blocked[0]?.complianceReason).toBe('Background music from a venue; replace the audio')
  })

  test('every length label parses to its seconds', () => {
    expect(cuts.map((cut) => cut.lengthSeconds)).toEqual([
      24, 52, 31, 44, 28, 58, 19, 36, 47, 33, 40, 29,
    ])
  })

  test('every highlight phrase is a real substring of its hook', () => {
    // VideoThumb renders the caption plain when the phrase is not found, so a
    // typo here would silently drop the signature sand-on-teal treatment.
    for (const cut of cuts) {
      expect(cut.highlightPhrase).toBeTypeOf('string')
      expect(cut.hook).toContain(cut.highlightPhrase)
    }
  })

  test('thumbnails rotate through four colours', () => {
    expect(new Set(cuts.map((cut) => cut.thumbnailColor)).size).toBe(4)
    expect(cuts[0]?.thumbnailColor).toBe('#12545A')
    expect(cuts[4]?.thumbnailColor).toBe('#12545A')
  })
})

describe('trends', () => {
  test('there are 8 trend cards, led by the 3-word reframe at +340%', () => {
    expect(trends).toHaveLength(8)
    expect(trends[0]?.format).toBe('The 3-word reframe')
    expect(trends[0]?.fromNiche).toBe('Leadership')
    expect(trends[0]?.growthPercent).toBe(340)
    expect(trends[0]?.growthLabel).toBe('+340%')
    expect(trends[0]?.fit).toBe(94)
  })

  test('growth descends and every card has 3-5 beats', () => {
    expect(trends.map((trend) => trend.growthPercent)).toEqual([
      340, 210, 180, 160, 120, 95, 90, 70,
    ])
    for (const trend of trends) {
      expect(trend.beats.length).toBeGreaterThanOrEqual(3)
      expect(trend.beats.length).toBeLessThanOrEqual(5)
    }
  })

  test('two cards come from the client own niche', () => {
    expect(trends.filter((trend) => trend.isFromMyNiche)).toHaveLength(2)
  })
})

describe('metrics', () => {
  test('match the last-7-days figures', () => {
    expect(metrics.posts).toBe(21)
    expect(metrics.views).toBe(48300)
    expect(metrics.profileVisits).toBe(1930)
    expect(metrics.linkClicks).toBe(214)
    expect(metrics.leads).toBe(31)
    expect(metrics.callsBooked).toBe(6)
  })

  test('views by day cover Monday to Sunday', () => {
    expect(metrics.viewsByDay).toEqual([4100, 5600, 6200, 7900, 8400, 7300, 8800])
  })

  test('deltas and best times are set', () => {
    expect(metrics.deltas.views.label).toBe('+18%')
    expect(metrics.deltas.linkClicks.label).toBe('+22%')
    expect(metrics.deltas.callsBooked.label).toBe('+2')
    expect(metrics.bestTimes.map((time) => time.timeLabel)).toEqual([
      '7:30 am',
      '12:15 pm',
      '7:45 pm',
    ])
  })
})

describe('schedule', () => {
  test("today's timeline has the 6 spec rows in time order", () => {
    expect(todaySchedule).toHaveLength(6)
    expect(todaySchedule.map((post) => post.time24)).toEqual([
      '07:30',
      '09:00',
      '12:15',
      '14:15',
      '17:00',
      '19:45',
    ])
    expect(todaySchedule.map((post) => post.status)).toEqual([
      'published',
      'published',
      'published-private',
      'scheduled',
      'scheduled',
      'needs-review',
    ])
  })

  test('the AI remake is labelled', () => {
    const aiPosts = todaySchedule.filter((post) => post.hasAiScenes)
    expect(aiPosts).toHaveLength(1)
    expect(aiPosts[0]?.title).toBe('"The 3-word reframe" remake (AI scenes)')
  })

  test('the week runs Mon 9 to Sun 15 November 2026 with three platform rows', () => {
    expect(weekDays.map((day) => day.date)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ])
    expect(weekDays.filter((day) => day.isToday)).toHaveLength(1)
    expect(weekSchedule.rows.map((row) => row.platformLabel)).toEqual([
      'Instagram',
      'TikTok',
      'YouTube Shorts',
    ])
  })

  test('every cell holds 2 or 3 chips', () => {
    for (const row of weekSchedule.rows) {
      expect(row.cells).toHaveLength(7)
      for (const cell of row.cells) {
        expect(cell.posts.length).toBeGreaterThanOrEqual(2)
        expect(cell.posts.length).toBeLessThanOrEqual(3)
      }
    }
  })

  test('tomorrow has the 9 posts the batch bar offers to approve', () => {
    const tomorrow = weekPosts.filter((post) => post.date === '2026-11-10')
    expect(tomorrow).toHaveLength(9)
    expect(tomorrow.every((post) => post.status === 'needs-review')).toBe(true)
  })

  test('no blocked cut ever reaches the calendar', () => {
    const blockedIds = cuts.filter((cut) => cut.compliance === 'blocked').map((cut) => cut.id)
    expect(weekPosts.some((post) => post.cutId !== null && blockedIds.includes(post.cutId))).toBe(
      false,
    )
  })
})

describe('agents', () => {
  test('there are 7 agents with spend inside their caps', () => {
    expect(agents).toHaveLength(7)
    expect(agents.map((agent) => agent.name)).toEqual([
      'Trend Scout',
      'Remake Producer',
      'Multiplier',
      'Compliance',
      'Client Concierge',
      'Publisher',
      'Performance Analyst',
    ])
    for (const agent of agents) {
      expect(agent.spendUsd).toBeLessThanOrEqual(agent.capUsd)
    }
  })

  test('the feed has the 6 sample lines, one with a cost', () => {
    expect(agentFeed).toHaveLength(6)
    expect(agentFeed[0]?.timeLabel).toBe('9:41 am')
    expect(agentFeed[0]?.agentName).toBe('Multiplier')
    expect(agentFeed[0]?.costUsd).toBe(1.84)
    expect(agentFeed.filter((entry) => entry.costUsd !== null)).toHaveLength(1)
  })
})

describe('results', () => {
  test('the funnel runs 48,300 to 6', () => {
    expect(funnel.map((stage) => stage.value)).toEqual([48300, 1930, 214, 31, 6])
    expect(funnel.map((stage) => stage.valueLabel)).toEqual(['48,300', '1,930', '214', '31', '6'])
  })

  test('the top posts table has 5 rows with the spec figures', () => {
    expect(topPosts.map((post) => post.views)).toEqual([9840, 7210, 6560, 5120, 3980])
    expect(topPosts.map((post) => post.clicks)).toEqual([52, 38, 29, 31, 17])
    expect(topPosts.map((post) => post.calls)).toEqual([2, 1, 1, 1, 1])
  })

  test('hook types rank question first', () => {
    expect(hookTypeRanking.map((rank) => rank.label)).toEqual([
      'Question',
      'Bold claim',
      'Story opener',
      'List',
    ])
    expect(hookTypeRanking.map((rank) => rank.averageViews)).toEqual([4410, 2530, 2180, 1650])
  })
})

describe('brand kit', () => {
  test('carries the four brand colours', () => {
    expect(brandKit.colors.map((color) => color.hex)).toEqual([
      '#12545A',
      '#F3E9DC',
      '#FF5A36',
      '#14171C',
    ])
  })

  test('has three caption styles with one selected', () => {
    expect(brandKit.captionStyles.map((style) => style.name)).toEqual([
      'Bold highlight',
      'Editorial serif',
      'Clean minimal',
    ])
    expect(brandKit.captionStyles.filter((style) => style.isSelected)).toHaveLength(1)
  })

  test('uses the client own voice with a signed consent record', () => {
    expect(brandKit.voice.mode).toBe('my-own-voice')
    expect(brandKit.voice.consent.status).toBe('signed')
    expect(brandKit.voice.consent.signedOn).toBe('2026-11-09')
  })

  test('lists the always and never words', () => {
    expect(brandKit.wordsAlways).toEqual(['first-time managers', 'burnout', 'reframe', '1:1'])
    expect(brandKit.wordsNever).toEqual(['hustle', 'crush it', 'guaranteed'])
  })
})

describe('billing', () => {
  test('has the two invoices from the spec', () => {
    expect(invoices.map((invoice) => invoice.dateLabel)).toEqual(['1 Nov 2026', '15 Oct 2026'])
    expect(invoices.map((invoice) => invoice.planName)).toEqual(['Growth', 'Pilot'])
    expect(invoices.map((invoice) => invoice.amountLabel)).toEqual(['$1,500.00', '$750.00'])
  })

  test('has an owner who approves posts and an assistant who edits captions', () => {
    expect(teamMembers).toHaveLength(2)
    expect(teamMembers[0]).toMatchObject({
      name: 'Maya Torres',
      role: 'Owner',
      permission: 'Approves posts',
    })
    expect(teamMembers[1]).toMatchObject({
      name: 'Sam Lee',
      role: 'Assistant',
      permission: 'Can edit captions',
    })
  })
})
