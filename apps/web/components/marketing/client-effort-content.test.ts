/**
 * The fifteen minutes, and the division of labour under it.
 *
 * The number is the only quantified promise on `/how-it-works`, so it gets
 * the treatment every other figure on this site gets: it comes from a source,
 * it is arithmetic rather than copy, and a test fails if the two drift apart.
 * 11 §2 P8 is the source.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import { CLIENT_EFFORT, DIVISION_OF_LABOUR, totalEffortMinutes } from './client-effort-content'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const RESEARCH = readFileSync(path.join(REPO_ROOT, 'docs/specs/11_MARKET_RESEARCH.md'), 'utf8')
  .replace(/\s+/g, ' ')
  .trim()

describe('what we need from you', () => {
  test('the claim it quantifies is still in the research', () => {
    expect(RESEARCH).toContain('~15 minutes a week')
  })

  test('the itemised minutes add up to the figure we publish', () => {
    // The point of itemising: a reader can check the total, and so can this.
    expect(totalEffortMinutes()).toBe(15)
  })

  test('every item says how long and when, because a total with no shape is a slogan', () => {
    expect(CLIENT_EFFORT.length).toBeGreaterThanOrEqual(3)
    for (const item of CLIENT_EFFORT) {
      expect(item.minutes, item.id).toBeGreaterThan(0)
      expect(item.when.length, item.id).toBeGreaterThan(20)
      expect(item.task.length, item.id).toBeGreaterThan(25)
    }
  })

  test('approving is the largest item, which is where P8 says the time goes', () => {
    const largest = [...CLIENT_EFFORT].sort((a, b) => b.minutes - a.minutes)[0]
    expect(largest?.id).toBe('approve')
  })
})

describe('the division of labour', () => {
  test('every row has both sides', () => {
    expect(DIVISION_OF_LABOUR.length).toBeGreaterThanOrEqual(4)
    for (const row of DIVISION_OF_LABOUR) {
      expect(row.agents.length, row.id).toBeGreaterThan(30)
      expect(row.person.length, row.id).toBeGreaterThan(30)
    }
  })

  test('the person’s column is decisions, never production work', () => {
    // If "edit", "cut the" or "write the script" ever appears on the client's
    // side, the division has quietly become the thing we said we removed.
    const labour = /\b(?:edit|edits|editing|cut the|write the script|caption|upload each)\b/i
    for (const row of DIVISION_OF_LABOUR) {
      expect(labour.test(row.person), `${row.id}: the client is doing production work`).toBe(false)
    }
  })

  test('approval sits on the person’s side and nowhere else', () => {
    // Non-negotiable 6: the agents may prepare, never approve.
    const approves = DIVISION_OF_LABOUR.filter((row) => /approv/i.test(row.person))
    expect(approves.length).toBeGreaterThan(0)
    for (const row of DIVISION_OF_LABOUR) {
      expect(/\bapprove(s|d)? (?:the|every|each) (?:post|week)/i.test(row.agents), row.id).toBe(
        false,
      )
    }
  })
})
