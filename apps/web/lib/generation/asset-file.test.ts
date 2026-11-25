/**
 * A name is either one we produced, or it is not served.
 *
 * The interesting cases are all refusals, which is the shape of every test
 * worth writing about a path. An allow-list is only as good as the things it
 * turns away, and the things it turns away are invisible in the implementation
 * — `SERVABLE_NAME.test(value)` looks equally correct whether it admits a
 * traversal or not.
 */

import os from 'node:os'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import {
  assetContentType,
  generatedAssetPath,
  generatedAssetUrl,
  generationOutputDirectory,
  isServableAssetName,
  servableAssetName,
} from './asset-file'

/** The shape the two builders really produce, as a constant to vary from. */
const GOOD_CLIP = 'prompt_6b9f0a2c1d8e4f03-hook.mp4'
const GOOD_IMAGE = 'prompt_6b9f0a2c1d8e4f03-call-to-action.jpg'

const ELSEWHERE = { GENERATION_OUTPUT_DIR: '/var/tmp/generated' }

describe('where the bytes are written', () => {
  test('is the configured directory when there is one', () => {
    expect(generationOutputDirectory(ELSEWHERE)).toBe('/var/tmp/generated')
  })

  test('falls back to a temp directory, never into the repository', () => {
    const fallback = generationOutputDirectory({})

    // The reason, in one assertion: generated media in a working tree gets
    // committed once and explained forever.
    expect(fallback).toBe(path.join(os.tmpdir(), 'mirrorline-ai'))
  })
})

describe('the names this product produces', () => {
  test.each([GOOD_CLIP, GOOD_IMAGE])('accepts %s', (name) => {
    expect(isServableAssetName(name)).toBe(true)
  })

  test.each([
    ['a traversal', '../../../etc/passwd'],
    ['a traversal that ends in a real extension', '../prompt_6b9f0a2c1d8e4f03-hook.mp4'],
    ['a separator anywhere in it', 'sub/prompt_6b9f0a2c1d8e4f03-hook.mp4'],
    ['a reference that is not sixteen hex digits', 'prompt_6b9f-hook.mp4'],
    ['a reference that is not hex at all', 'prompt_nothexnothexnot-hook.mp4'],
    ['an uppercase reference, which promptRef never emits', 'prompt_6B9F0A2C1D8E4F03-hook.mp4'],
    ['an extension we do not write', 'prompt_6b9f0a2c1d8e4f03-hook.webm'],
    ['no beat at all', 'prompt_6b9f0a2c1d8e4f03.mp4'],
    ['an absolute path', '/etc/passwd'],
    ['nothing', ''],
  ])('refuses %s', (_label, name) => {
    expect(isServableAssetName(name)).toBe(false)
  })
})

describe('reading a name out of a location', () => {
  test('takes the basename of a real path', () => {
    expect(servableAssetName(`/var/tmp/generated/${GOOD_CLIP}`)).toBe(GOOD_CLIP)
  })

  test('refuses the sample adapter’s URI, because there are no bytes behind it', () => {
    // Not an error and not a placeholder. The screen renders the asset with no
    // preview and the words "Sample data", which is the honest pair.
    expect(servableAssetName('sample://ai-scene/prompt_6b9f0a2c1d8e4f03')).toBeNull()
  })

  test('refuses a path whose last segment is not one of ours', () => {
    expect(servableAssetName('/var/tmp/generated/id_rsa')).toBeNull()
  })

  test('cannot be talked out of the directory by a dotted path', () => {
    // `path.basename` resolves the dots, so the name that gets checked is the
    // last segment. This asserts the composition rather than trusting it.
    expect(servableAssetName('/var/tmp/generated/../../etc/passwd')).toBeNull()
  })
})

describe('rebuilding the path, which is the only way one gets made', () => {
  test('joins a validated name onto the configured directory', () => {
    expect(generatedAssetPath(GOOD_CLIP, ELSEWHERE)).toBe(`/var/tmp/generated/${GOOD_CLIP}`)
  })

  test('throws rather than returning a path for a name it does not recognise', () => {
    // Throwing is the point. Returning something and relying on the caller to
    // have checked first is the shape of every traversal bug ever written.
    expect(() => generatedAssetPath('../../etc/passwd', ELSEWHERE)).toThrow(
      'not a generated asset name',
    )
  })
})

describe('the URL a screen points at', () => {
  test('is a route, never the path on disk', () => {
    expect(generatedAssetUrl(`/var/tmp/generated/${GOOD_CLIP}`)).toBe(
      `/api/generation/asset/${GOOD_CLIP}`,
    )
  })

  test('is null for a sample, so nothing renders a broken element', () => {
    expect(generatedAssetUrl('sample://ai-scene/prompt_6b9f0a2c1d8e4f03')).toBeNull()
  })
})

describe('what it is sent as', () => {
  test('a clip is video', () => {
    expect(assetContentType(GOOD_CLIP)).toBe('video/mp4')
  })

  test('an image is a jpeg', () => {
    expect(assetContentType(GOOD_IMAGE)).toBe('image/jpeg')
  })
})
