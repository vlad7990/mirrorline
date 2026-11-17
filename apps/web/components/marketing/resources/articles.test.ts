/**
 * The rules /resources states in prose, as assertions.
 *
 * Three of these are the kind that pass review and fail in the browser or in
 * a year's time: a renamed cover still typechecks, a category with nothing in
 * it still renders (as an empty page, reached from a chip that looks live),
 * and an article that has quietly turned into a pitch still reads fine
 * sentence by sentence. Each is cheap to assert and expensive to notice by
 * eye, which is the whole argument for putting them here.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

import {
  ARTICLE_CATEGORIES,
  ARTICLES,
  articlesIn,
  findArticle,
  isCategoryKey,
  relatedArticles,
} from './articles'
import { GLOSSARY, TEMPLATES } from './library'

/** `public/` holds the covers the manifest names. */
const PUBLIC_DIR = join(import.meta.dirname, '..', '..', '..', 'public')

/** Every word of an article, as one lower-case string. */
function bodyOf(article: (typeof ARTICLES)[number]): string {
  return [
    article.title,
    article.summary,
    ...article.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...(section.list ?? []),
    ]),
  ]
    .join(' ')
    .toLowerCase()
}

describe('article covers', () => {
  test('every cover named in the manifest exists on disk', () => {
    // Arrange
    const sources = ARTICLES.map((article) => article.cover.src)

    // Act
    const missing = sources.filter((src) => !existsSync(join(PUBLIC_DIR, src)))

    // Assert
    expect(missing).toEqual([])
  })

  test('no two articles share a cover', () => {
    // Arrange
    const sources = ARTICLES.map((article) => article.cover.src)

    // Act
    const unique = new Set(sources)

    // Assert
    expect(unique.size).toBe(sources.length)
  })

  test('every cover carries a described alt, because it is the hero on the article page', () => {
    // Arrange, Act
    const undescribed = ARTICLES.filter((article) => article.cover.alt.trim().length < 20)

    // Assert
    expect(undescribed.map((article) => article.slug)).toEqual([])
  })
})

describe('articles', () => {
  test('no two articles share a slug', () => {
    // Arrange
    const slugs = ARTICLES.map((article) => article.slug)

    // Act
    const unique = new Set(slugs)

    // Assert
    expect(unique.size).toBe(slugs.length)
  })

  test('every article has a reading time that is a positive whole number', () => {
    // Arrange, Act
    const wrong = ARTICLES.filter(
      (article) => !Number.isInteger(article.readingMinutes) || article.readingMinutes <= 0,
    )

    // Assert
    expect(wrong.map((article) => article.slug)).toEqual([])
  })

  /**
   * The "useful without us" rule, which is the one that drifts.
   *
   * An article does not become a sales page in one edit. It becomes one a
   * sentence at a time, each of which reads as a helpful aside — "the studio
   * does this for you", "our compliance gate catches it". Naming the product
   * at all is the earliest point at which that is detectable, so that is
   * where the line is drawn, and it is drawn in a test rather than in a
   * review checklist because checklists are not run.
   */
  test('no article names the product, because each has to stand up without it', () => {
    // Arrange
    const banned = ['mirrorline', 'our studio', 'our agents', 'our pilot', 'sign up']

    // Act
    const offenders = ARTICLES.flatMap((article) => {
      const body = bodyOf(article)
      return banned
        .filter((phrase) => body.includes(phrase))
        .map((phrase) => `${article.slug}: ${phrase}`)
    })

    // Assert
    expect(offenders).toEqual([])
  })

  test('no article quotes a benchmark figure, because 11 says its own numbers are directional', () => {
    // Arrange: a percentage is the shape a borrowed benchmark arrives in.
    //
    // "three-second hold" and "per 1,000 reach" are names of metrics rather
    // than claims about their values, so the pattern looks for a number
    // immediately followed by a percent sign — "47%", "up 12%" — which is
    // what a benchmark looks like and what a metric name never does.
    const percentage = /\d+\s?%/

    // Act
    const offenders = ARTICLES.filter((article) => percentage.test(bodyOf(article)))

    // Assert
    expect(offenders.map((article) => article.slug)).toEqual([])
  })
})

describe('categories', () => {
  test('every article sits in a category that exists', () => {
    // Arrange
    const keys = new Set<string>(ARTICLE_CATEGORIES.map((category) => category.key))

    // Act
    const orphans = ARTICLES.filter((article) => !keys.has(article.category))

    // Assert
    expect(orphans.map((article) => article.slug)).toEqual([])
  })

  /**
   * A chip that leads to an empty page is worse than no chip: it reads as the
   * site being broken rather than as the category being new.
   */
  test('every category has at least one article in it', () => {
    // Arrange, Act
    const empty = ARTICLE_CATEGORIES.filter((category) => articlesIn(category.key).length === 0)

    // Assert
    expect(empty.map((category) => category.key)).toEqual([])
  })

  test('isCategoryKey accepts the real keys and rejects anything else', () => {
    // Arrange
    const real = ARTICLE_CATEGORIES.map((category) => category.key)

    // Act, Assert
    expect(real.every((key) => isCategoryKey(key))).toBe(true)
    expect(isCategoryKey('measuring ')).toBe(false)
    expect(isCategoryKey('everything')).toBe(false)
    expect(isCategoryKey(undefined)).toBe(false)
  })

  test('articlesIn(undefined) is the whole library, not an empty filter', () => {
    // Arrange, Act, Assert
    expect(articlesIn(undefined)).toHaveLength(ARTICLES.length)
  })
})

describe('relatedArticles', () => {
  test('never includes the article it was asked about', () => {
    // Arrange, Act
    const offenders = ARTICLES.filter((article) =>
      relatedArticles(article.slug).some((related) => related.slug === article.slug),
    )

    // Assert
    expect(offenders.map((article) => article.slug)).toEqual([])
  })

  test('puts same-category articles first, because that is the only ordering that is true', () => {
    // Arrange: an article whose category has at least one other member.
    const subject = ARTICLES.find((article) => articlesIn(article.category).length > 1)
    expect(subject).toBeDefined()

    // Act
    const related = relatedArticles(subject!.slug)

    // Assert
    expect(related[0]?.category).toBe(subject!.category)
  })

  test('returns at most the limit it was given', () => {
    // Arrange, Act
    const related = relatedArticles(ARTICLES[0]!.slug, 2)

    // Assert
    expect(related).toHaveLength(2)
  })
})

describe('findArticle', () => {
  test('finds every slug in the manifest and nothing else', () => {
    // Arrange, Act, Assert
    expect(ARTICLES.every((article) => findArticle(article.slug) !== undefined)).toBe(true)
    expect(findArticle('no-such-article')).toBeUndefined()
  })
})

describe('templates and glossary', () => {
  /**
   * 19 v2 ★4: "each a real list rather than a promise of one". The failure
   * mode is a card that describes a template instead of being one, and it is
   * invisible in review because the description reads perfectly well.
   */
  test('every template prints its actual lines', () => {
    // Arrange, Act
    const thin = TEMPLATES.filter((template) => template.lines.length < 5)

    // Assert
    expect(thin.map((template) => template.id)).toEqual([])
  })

  test('no template offers a download or asks for an address', () => {
    // Arrange
    const banned = ['download', 'subscribe', 'enter your email', 'get the pdf']

    // Act
    const offenders = TEMPLATES.flatMap((template) => {
      const body = [template.title, template.purpose, template.note, ...template.lines]
        .join(' ')
        .toLowerCase()
      return banned
        .filter((phrase) => body.includes(phrase))
        .map((phrase) => `${template.id}: ${phrase}`)
    })

    // Assert
    expect(offenders).toEqual([])
  })

  test('the glossary is alphabetical, so a reader can find a term by scanning', () => {
    // Arrange
    const terms = GLOSSARY.map((entry) => entry.term)

    // Act
    const sorted = [...terms].sort((a, b) => a.localeCompare(b, 'en'))

    // Assert
    expect(terms).toEqual(sorted)
  })

  test('no glossary term is defined twice', () => {
    // Arrange
    const terms = GLOSSARY.map((entry) => entry.term.toLowerCase())

    // Act
    const unique = new Set(terms)

    // Assert
    expect(unique.size).toBe(terms.length)
  })
})
