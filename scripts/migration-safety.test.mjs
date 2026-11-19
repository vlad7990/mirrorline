/**
 * The expand/contract gate's own tests.
 *
 * The risk in a regex gate runs both ways at once: a false negative lets a
 * `drop column` through, and a false positive makes the gate something people
 * route around. Both are asserted here, and the false positives are the ones
 * that would actually get it switched off — a migration whose *comment*
 * explains why a column is not being dropped yet must pass.
 */

import { describe, expect, test } from 'vitest'

import {
  auditMigrations,
  CONTRACT_MARKER,
  findDestructive,
  isContractApproved,
} from './migration-safety.mjs'

describe('findDestructive', () => {
  test('flags a dropped column', () => {
    expect(findDestructive('alter table public.posts drop column slug;')).toEqual(['drop column'])
  })

  test('flags a dropped table', () => {
    expect(findDestructive('drop table public.posts;')).toEqual(['drop table'])
  })

  // Two separate statements, and the patterns do not overlap: in
  // `rename column slug to handle` the word after `rename` is `column`, so only
  // the column pattern matches. Asserted apart so a change to either is visible.
  test('flags a renamed column', () => {
    expect(findDestructive('alter table public.posts rename column slug to handle;')).toEqual([
      'rename column',
    ])
  })

  test('flags a renamed table', () => {
    expect(findDestructive('alter table public.posts rename to public.entries;')).toEqual([
      'rename to',
    ])
  })

  test('flags a changed column type', () => {
    expect(findDestructive('alter table public.posts alter column views type bigint;')).toEqual([
      'alter column … type',
    ])
  })

  test('flags a column made not null, which breaks writers that omit it', () => {
    expect(findDestructive('alter table public.posts alter column slug set not null;')).toEqual([
      'set not null',
    ])
  })

  test('passes an additive migration', () => {
    expect(findDestructive('alter table public.posts add column slug text;')).toEqual([])
  })

  test('passes a replaced function, which is how every RPC here is revised', () => {
    expect(findDestructive('create or replace function public.f() returns void as $$ $$;')).toEqual(
      [],
    )
  })

  test('passes a replaced policy', () => {
    const sql = [
      'drop policy if exists posts_select on public.posts;',
      'create policy posts_select on public.posts for select using (true);',
    ].join('\n')
    expect(findDestructive(sql)).toEqual([])
  })

  // The false positive that would get this gate switched off: a migration that
  // *talks* about dropping something while doing the additive half.
  test('ignores a line comment that mentions dropping a column', () => {
    const sql = [
      '-- The old `slug` column stays for now; we drop column slug in a later PR,',
      '-- once nothing reads it.',
      'alter table public.posts add column handle text;',
    ].join('\n')
    expect(findDestructive(sql)).toEqual([])
  })

  test('ignores a block comment that mentions renaming', () => {
    const sql = [
      '/* we will rename to handle eventually */',
      'alter table public.posts add column handle text;',
    ].join('\n')
    expect(findDestructive(sql)).toEqual([])
  })
})

describe('isContractApproved', () => {
  test('recognises the marker', () => {
    expect(isContractApproved(`${CONTRACT_MARKER}\ndrop table public.posts;`)).toBe(true)
  })

  test('is case-insensitive, because SQL files are shouted at inconsistently', () => {
    expect(isContractApproved('-- CONTRACT-MIGRATION: APPROVED\ndrop table x;')).toBe(true)
  })

  test('does not accept a near miss', () => {
    expect(isContractApproved('-- contract migration approved\ndrop table x;')).toBe(false)
  })
})

describe('auditMigrations', () => {
  test('reports only the destructive, unmarked migrations', () => {
    const findings = auditMigrations([
      { name: '001_additive.sql', sql: 'alter table t add column a text;' },
      { name: '002_destructive.sql', sql: 'alter table t drop column a;' },
      { name: '003_approved.sql', sql: `${CONTRACT_MARKER}\nalter table t drop column b;` },
    ])

    expect(findings).toEqual([{ name: '002_destructive.sql', destructive: ['drop column'] }])
  })

  test('is empty for an all-additive set', () => {
    expect(
      auditMigrations([{ name: '001.sql', sql: 'create table t (id uuid primary key);' }]),
    ).toEqual([])
  })
})

describe('the migrations in this repo', () => {
  // The gate has to pass on the repo as it stands, or it lands already broken
  // and the first person to see it red will assume it always is.
  test('are all additive or marked', async () => {
    const { readdirSync, readFileSync } = await import('node:fs')
    const { join } = await import('node:path')

    const dir = join(process.cwd(), 'supabase', 'migrations')
    const files = readdirSync(dir)
      .filter((name) => name.endsWith('.sql'))
      .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }))

    expect(files.length).toBeGreaterThan(0)
    expect(auditMigrations(files)).toEqual([])
  })
})
