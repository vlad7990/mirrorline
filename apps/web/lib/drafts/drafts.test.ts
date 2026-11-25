/**
 * The approval rules, from three directions: the row, the reply, and the SQL.
 *
 * Every test here asks one question in a different disguise: **can anything
 * that is not a passing verdict end up approved?** The answer has to be no at
 * each layer, because `04 §Originality Gate` forbids an override "from
 * anywhere" — and the predecessor project's gate became optional one convenient
 * exception at a time.
 *
 * The last block reads the migration. That is unusual and deliberate: the
 * attempt ceiling is written twice, once as `MAX_ATTEMPTS` and once as a check
 * constraint, and two numbers that must agree are worth an assertion rather
 * than a comment.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { MAX_ATTEMPTS, type OriginalityVerdict } from '../originality/gate'
import { screenIdeas, type VideoIdea } from '../scripts/video-idea'

import { readApproveReply } from './approve-reply'
import { approvalBlockedReason, isApprovableDraft, parseDraft, type DraftSummary } from './types'
import { attemptsForVerdict, draftRowsFor, statusForDraft } from './write-drafts'

const REPO_ROOT = path.resolve(__dirname, '../../../..')

const MIGRATION = path.join(REPO_ROOT, 'supabase/migrations/20261124190000_drafts.sql')

function verdict(overrides: Partial<OriginalityVerdict> = {}): OriginalityVerdict {
  return {
    outcome: 'passed',
    similarity: 11,
    limit: 30,
    longestPhrase: { words: 4, phrase: 'in the first week' },
    phraseWordLimit: 8,
    copiedSentences: [],
    reasons: [],
    attempt: 1,
    isTerminal: true,
    comparedAgainst: ['the format we remade'],
    notComparedAgainst: ['your own last 90 posts'],
    ...overrides,
  }
}

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'draft-1',
    kind: 'video-idea',
    title: 'The 20-minute reactive-dog fix',
    status: 'needs-review',
    originality: verdict(),
    attempts: 1,
    approved_at: null,
    ...overrides,
  }
}

const parsed = (overrides: Record<string, unknown> = {}): DraftSummary => {
  const draft = parseDraft(row(overrides))
  if (draft === null) throw new Error('the fixture should parse')
  return draft
}

describe('reading a draft row', () => {
  it('parses the columns the studio needs', () => {
    // Act
    const draft = parsed()

    // Assert
    expect(draft.id).toBe('draft-1')
    expect(draft.status).toBe('needs-review')
    expect(draft.originality?.outcome).toBe('passed')
    expect(draft.attempts).toBe(1)
  })

  it('drops a row with no id or no title rather than half-building one', () => {
    expect(parseDraft(row({ id: 42 }))).toBeNull()
    expect(parseDraft(row({ title: null }))).toBeNull()
    expect(parseDraft(null)).toBeNull()
  })

  it('reads an unrecognised status as undecided rather than as a decision', () => {
    // A stored 'ok' or 'cleared' must not become an approval; it becomes the
    // state that still has to be decided.
    expect(parsed({ status: 'cleared' }).status).toBe('needs-review')
  })

  it('treats an absent or unreadable verdict as not checked, which is a refusal', () => {
    for (const originality of [null, 'nonsense', { outcome: 'ok' }]) {
      const draft = parsed({ originality })

      expect(draft.originality).toBeNull()
      expect(isApprovableDraft(draft)).toBe(false)
      expect(approvalBlockedReason(draft)).toContain('Originality Gate')
    }
  })
})

describe('what the screen may offer', () => {
  it('offers approval only for a passing verdict that nobody has decided on', () => {
    expect(isApprovableDraft(parsed())).toBe(true)
    expect(approvalBlockedReason(parsed())).toBeNull()
  })

  it('withholds it from every failing verdict', () => {
    for (const outcome of ['rewritten', 'blocked'] as const) {
      const draft = parsed({
        originality: verdict({ outcome }),
        status: outcome === 'blocked' ? 'blocked' : 'rejected',
      })

      expect(isApprovableDraft(draft)).toBe(false)
      expect(approvalBlockedReason(draft)).not.toBeNull()
    }
  })

  it('withholds it from a draft already decided, even with a clean verdict', () => {
    expect(isApprovableDraft(parsed({ status: 'approved' }))).toBe(false)
    expect(approvalBlockedReason(parsed({ status: 'approved' }))).toBe('Already approved.')
  })
})

describe('reading what the database answered', () => {
  it('approves only on ok === true', () => {
    expect(readApproveReply({ ok: true, status: 'approved', reason: null })).toEqual({
      status: 'approved',
    })
  })

  it('does not approve on anything that merely looks true', () => {
    for (const ok of ['true', 1, {}, null, undefined]) {
      expect(readApproveReply({ ok, reason: 'no' }).status).not.toBe('approved')
    }
  })

  it('carries the database’s own sentence through a refusal', () => {
    const reply = readApproveReply({
      ok: false,
      status: 'rejected',
      reason: 'The Originality Gate has not passed this draft, so it cannot be approved.',
    })

    expect(reply).toEqual({
      status: 'refused',
      reason: 'The Originality Gate has not passed this draft, so it cannot be approved.',
    })
  })

  it('refuses a reply with no sentence rather than succeeding', () => {
    expect(readApproveReply({ ok: false }).status).toBe('refused')
  })

  it('calls an unreadable reply an error, which is not the same as a refusal', () => {
    // A refusal is the gate working (`18 §6`); an error is ours. Collapsing
    // them would teach the reader to distrust a control that is working.
    expect(readApproveReply('yes').status).toBe('error')
    expect(readApproveReply(null).status).toBe('error')
  })
})

describe('the status a new draft is written with', () => {
  it('forces blocked onto a blocked verdict, as the constraint requires', () => {
    expect(statusForDraft(verdict({ outcome: 'blocked' }), 'kept')).toBe('blocked')
    expect(statusForDraft(verdict({ outcome: 'blocked' }), 'refused')).toBe('blocked')
  })

  it('never leaves a refused draft waiting for review', () => {
    // The case that would quietly repeal the fact check: the gate runs first,
    // so an idea refused for an ungrounded fact carries a **passing** verdict.
    expect(statusForDraft(verdict({ outcome: 'passed' }), 'refused')).toBe('rejected')
  })

  it('leaves a kept draft waiting for a person', () => {
    expect(statusForDraft(verdict(), 'kept')).toBe('needs-review')
  })

  it('clamps the attempt count to what the schema allows', () => {
    expect(attemptsForVerdict(verdict({ attempt: 1 }))).toBe(1)
    expect(attemptsForVerdict(verdict({ attempt: 2 }))).toBe(2)
    // A verdict from a future version must not fail the whole insert.
    expect(attemptsForVerdict(verdict({ attempt: 9 }))).toBe(MAX_ATTEMPTS)
    expect(attemptsForVerdict(null)).toBe(1)
  })
})

describe('the rows a scan writes', () => {
  const idea: VideoIdea = {
    title: 'The 20-minute reactive-dog fix',
    formatName: 'One myth, one correction',
    hook: 'Your dog is not being stubborn.',
    beats: [{ label: 'Hook', text: 'Your dog is not being stubborn.' }],
    footage: ['You, talking to camera in the yard'],
    fact: 'four-session Reactive Dog Intensive',
    originality: verdict(),
  }

  it('writes a row for the refused ideas too, which is the whole point', () => {
    // Arrange: an idea whose draft is lifted word for word from the source.
    const copied: VideoIdea = {
      ...idea,
      hook: 'The exact sentence the source used in its opening line here.',
      beats: [
        { label: 'Hook', text: 'The exact sentence the source used in its opening line here.' },
      ],
    }

    const screened = screenIdeas({
      ideas: [copied],
      corpora: [
        {
          label: 'the format we remade',
          texts: ['The exact sentence the source used in its opening line here.'],
        },
      ],
      facts: ['four-session Reactive Dog Intensive'],
    })

    // Act
    const rows = draftRowsFor({
      workspaceId: 'ws-1',
      reportId: 'report-1',
      kept: screened.kept,
      refused: screened.rejected,
    })

    // Assert: the refusal is a row, with the verdict on it. Before D129 it was
    // a console.warn and a number in a note.
    expect(screened.kept).toHaveLength(0)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('rejected')
    expect(rows[0]?.originality_outcome).toBe('rewritten')
  })

  it('keeps the outcome column and the stored verdict in step', () => {
    // Act
    const rows = draftRowsFor({
      workspaceId: 'ws-1',
      reportId: 'report-1',
      kept: [idea],
      refused: [],
    })

    // Assert: the column exists so the *database* can enforce the rule without
    // parsing jsonb. If the two disagreed, the constraint would be guarding a
    // different fact from the one the studio shows.
    expect(rows[0]?.originality_outcome).toBe('passed')
    expect((rows[0]?.originality as OriginalityVerdict).outcome).toBe('passed')
    expect(rows[0]?.status).toBe('needs-review')
    expect(rows[0]?.report_id).toBe('report-1')
  })

  it('writes nothing when there is nothing judged', () => {
    expect(draftRowsFor({ workspaceId: 'ws-1', reportId: 'r', kept: [], refused: [] })).toEqual([])
  })
})

describe('the migration and the gate agree', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('bounds attempts at MAX_ATTEMPTS', () => {
    // Two numbers that must agree: `04 §3`'s "a draft that fails twice is
    // blocked", written once in TypeScript and once as a constraint.
    expect(sql).toContain(`check (attempts between 1 and ${MAX_ATTEMPTS})`)
  })

  it('makes an approval impossible without a passing verdict', () => {
    // The constraint, not the policy and not the action. This is the one that
    // binds the service role too.
    expect(sql).toContain('constraint drafts_approved_passed')
    expect(sql).toContain("status <> 'approved' or (originality_outcome = 'passed'")
  })

  it('makes a blocked verdict terminal', () => {
    expect(sql).toContain('constraint drafts_blocked_is_terminal')
  })

  it('gives a browser no way to write the table', () => {
    expect(sql).toContain('revoke insert, update, delete on public.drafts from authenticated, anon')
    // And there is no update policy either, so the missing grant is not the
    // only thing standing there.
    expect(sql).not.toContain('for update')
  })
})
