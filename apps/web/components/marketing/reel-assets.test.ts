/**
 * The reel manifest is the join between a mock cut and a real generated file.
 *
 * It exists so the cut wall can show actual 9:16 footage for the cuts we have
 * generated and fall back to the flat demo colour for the ones we have not,
 * without either case being a special branch at the call site. Today the
 * manifest is empty — Higgsfield has no credits — so every lookup misses and
 * the wall renders exactly as it does now. That is the point: the plumbing
 * lands tested before the assets exist, and nothing on the page claims to be
 * a reel until a file is really there.
 */

import { describe, expect, it } from 'vitest'

import { REEL_MANIFEST, reelAsset, type ReelAsset } from './reel-assets'

describe('reelAsset', () => {
  it('returns null for a cut with no generated reel', () => {
    // Arrange
    const manifest: Readonly<Record<string, ReelAsset>> = {}

    // Act
    const asset = reelAsset('cut-01', manifest)

    // Assert
    expect(asset).toBeNull()
  })

  it('returns the asset when the manifest has an entry for the cut', () => {
    // Arrange
    const entry: ReelAsset = { videoSrc: '/reels/cut-01.mp4', posterSrc: '/reels/cut-01.jpg' }
    const manifest: Readonly<Record<string, ReelAsset>> = { 'cut-01': entry }

    // Act
    const asset = reelAsset('cut-01', manifest)

    // Assert
    expect(asset).toEqual(entry)
  })

  it('does not fall back to another cut when the requested one is missing', () => {
    // Arrange
    const manifest: Readonly<Record<string, ReelAsset>> = {
      'cut-01': { videoSrc: '/reels/cut-01.mp4', posterSrc: '/reels/cut-01.jpg' },
    }

    // Act
    const asset = reelAsset('cut-02', manifest)

    // Assert
    expect(asset).toBeNull()
  })

  it('ignores inherited object properties so a cut id cannot borrow one', () => {
    // Arrange: 'toString' resolves on any plain object's prototype chain.
    const manifest: Readonly<Record<string, ReelAsset>> = {}

    // Act
    const asset = reelAsset('toString', manifest)

    // Assert
    expect(asset).toBeNull()
  })

  it('reads the live manifest by default', () => {
    // Act
    const asset = reelAsset('cut-01')

    // Assert: whatever the manifest holds, the default lookup agrees with it.
    expect(asset).toEqual(REEL_MANIFEST['cut-01'] ?? null)
  })
})

describe('REEL_MANIFEST', () => {
  it('is empty while Higgsfield has no credits', () => {
    // The one place that records the blocker in code rather than in a doc.
    // Delete this expectation in the same commit that adds the first asset.
    expect(Object.keys(REEL_MANIFEST)).toHaveLength(0)
  })

  it('points every entry it does have at a real 9:16 file pair', () => {
    // Arrange
    const entries = Object.entries(REEL_MANIFEST)

    // Assert
    for (const [cutId, asset] of entries) {
      expect(cutId, 'cut ids come from @mirrorline/mock').toMatch(/^cut-\d{2}$/)
      expect(asset.videoSrc).toMatch(/^\/reels\/[\w-]+\.(mp4|webm)$/)
      expect(asset.posterSrc).toMatch(/^\/reels\/[\w-]+\.(jpg|webp|avif)$/)
    }
  })
})
