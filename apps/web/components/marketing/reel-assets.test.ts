/**
 * The reel manifest is the join between a mock cut and a real generated file.
 *
 * It exists so the cut wall can show actual 9:16 imagery for the cuts we have
 * generated and fall back to the flat demo colour for the ones we have not,
 * without either case being a special branch at the call site. All twelve are
 * generated now (D28), so the interesting expectations moved: the manifest
 * must cover every cut the wall renders, and every file it names must really
 * be on disk.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

import { cuts } from '@mirrorline/mock'
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
  it('covers every cut the wall renders', () => {
    // The wall reads `cuts` straight from the mock, so a cut with no entry is
    // a hole in the grid. This is the expectation that replaced "the manifest
    // is empty while Higgsfield has no credits".
    for (const cut of cuts) {
      expect(REEL_MANIFEST[cut.id], `${cut.id} has no generated still`).toBeDefined()
    }
  })

  it('names every entry with a cut id and a 9:16 file', () => {
    // Arrange
    const entries = Object.entries(REEL_MANIFEST)

    // Assert
    expect(entries.length).toBeGreaterThan(0)
    for (const [cutId, asset] of entries) {
      expect(cutId, 'cut ids come from @mirrorline/mock').toMatch(/^cut-\d{2}$/)
      expect(asset.posterSrc).toMatch(/^\/reels\/[\w-]+\.(jpg|webp|avif)$/)
      // Optional, but when present it must be a real video extension rather
      // than a second still smuggled into the motion slot.
      if (asset.videoSrc !== undefined) {
        expect(asset.videoSrc).toMatch(/^\/reels\/[\w-]+\.(mp4|webm)$/)
      }
    }
  })

  it('points every listed file at one that actually exists', () => {
    // The module promises that no frame claims to be footage when the file is
    // not there. Only the filesystem can keep that promise honest: a renamed
    // or deleted asset would otherwise ship as a broken image on the landing
    // page and pass every other test here.
    const publicDir = path.join(__dirname, '..', '..', 'public')

    for (const [cutId, asset] of Object.entries(REEL_MANIFEST)) {
      for (const src of [asset.posterSrc, asset.videoSrc]) {
        if (src === undefined) continue
        const onDisk = path.join(publicDir, src)
        expect(existsSync(onDisk), `${cutId}: ${src} is listed but missing`).toBe(true)
      }
    }
  })
})
