/**
 * Shared constants and helpers for the demo fixtures.
 *
 * Nothing here calls Date.now(), new Date() or Math.random(): the whole demo
 * is deterministic so screenshots and end-to-end tests stay stable.
 */

import type { ComplianceStatus, Platform, PostStatus } from './types'

/** The demo's "today". Fixed so the whole story is reproducible. */
export const TODAY = '2026-11-09'

/**
 * Thumbnails rotate through these four, in this order.
 * Mirrors THUMBNAIL_COLORS in packages/ui/src/tokens.ts (DESIGN.md "Colors");
 * duplicated here so @mirrorline/mock stays dependency-free.
 */
const THUMBNAIL_COLORS = ['#12545A', '#1E3A40', '#2F3E46', '#6B4F3A'] as const
const FALLBACK_THUMBNAIL_COLOR = '#12545A'

/** Deterministic thumbnail colour for a 0-based card position. */
export function thumbnailColorAt(index: number): string {
  const colorCount = THUMBNAIL_COLORS.length
  const position = ((index % colorCount) + colorCount) % colorCount
  return THUMBNAIL_COLORS[position] ?? FALLBACK_THUMBNAIL_COLOR
}

/** 'm:ss' or 'mm:ss' to whole seconds. */
export function secondsFromClockLabel(label: string): number {
  const parts = label.split(':')
  const minutes = Number(parts[0])
  const seconds = Number(parts[1])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    throw new Error(`Invalid clock label: ${label}`)
  }
  return minutes * 60 + seconds
}

/** Zero-padded id suffix, so ids sort the way the lists read. */
export function idSuffix(position: number): string {
  return String(position).padStart(2, '0')
}

export const COMPLIANCE_LABELS: Record<ComplianceStatus, string> = {
  passed: 'Passed',
  'needs-review': 'Needs review',
  blocked: 'Blocked',
}

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  published: 'Published',
  'published-private': 'Published (private)',
  scheduled: 'Scheduled',
  'needs-review': 'Needs review',
  approved: 'Approved',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube Shorts',
  linkedin: 'LinkedIn',
}
