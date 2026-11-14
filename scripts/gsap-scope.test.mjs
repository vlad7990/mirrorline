import { describe, expect, test } from 'vitest';

import { checkGsapScope, findViolations } from './gsap-scope.mjs';

const file = (path, source) => ({ path, source });

const MARKETING_COMPONENT = 'apps/web/components/marketing/output-sequence.tsx';
const MARKETING_ROUTE = 'apps/web/app/(marketing)/page.tsx';
const STUDIO_SCREEN = 'apps/web/app/app/(studio)/calendar/page.tsx';
const STUDIO_COMPONENT = 'apps/web/components/studio/alerts-board.tsx';
const SHARED_UI = 'packages/ui/src/components/button.tsx';
const REMOTION_TEMPLATE = 'services/pipeline/remotion/templates/cut.tsx';

describe('scope: GSAP is for the public marketing site only', () => {
  test('allows gsap and its cleared plugins inside a marketing component', () => {
    // Arrange
    const files = [
      file(
        MARKETING_COMPONENT,
        `import { gsap } from 'gsap'
         import { ScrollTrigger } from 'gsap/ScrollTrigger'
         import { SplitText } from 'gsap/SplitText'
         import { useGSAP } from '@gsap/react'`,
      ),
    ];

    // Act
    const violations = findViolations(files);

    // Assert
    expect(violations).toEqual([]);
  });

  test('allows gsap inside the marketing route group', () => {
    const violations = findViolations([file(MARKETING_ROUTE, `import { gsap } from 'gsap'`)]);

    expect(violations).toEqual([]);
  });

  test.each([
    ['the studio app', STUDIO_SCREEN],
    ['a studio component', STUDIO_COMPONENT],
    ['packages/ui', SHARED_UI],
    ['a Remotion template', REMOTION_TEMPLATE],
  ])('denies gsap in %s', (_label, path) => {
    const violations = findViolations([file(path, `import { gsap } from 'gsap'`)]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ path, specifier: 'gsap', kind: 'out-of-scope' });
  });

  test('denies @gsap/react outside marketing, so useGSAP cannot smuggle it in', () => {
    const violations = findViolations([
      file(STUDIO_COMPONENT, `import { useGSAP } from '@gsap/react'`),
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('out-of-scope');
  });

  test('denies a dynamic import as firmly as a static one', () => {
    const violations = findViolations([
      file(STUDIO_COMPONENT, `const { gsap } = await import('gsap')`),
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('out-of-scope');
  });

  test('names the allowed scopes in the failure, so the fix is obvious', () => {
    const [violation] = findViolations([file(SHARED_UI, `import 'gsap'`)]);

    expect(violation.reason).toContain('apps/web/components/marketing/');
    expect(violation.reason).toContain('D41');
  });
});

describe('banned outright: ScrollSmoother and Lenis, marketing included', () => {
  test.each([
    'gsap/ScrollSmoother',
    'gsap/dist/ScrollSmoother',
    'lenis',
    'lenis/react',
    '@studio-freight/lenis',
  ])('bans %s even in a marketing component', (specifier) => {
    const violations = findViolations([file(MARKETING_COMPONENT, `import x from '${specifier}'`)]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ specifier, kind: 'banned-module' });
  });

  test('bans ScrollSmoother written with a file extension', () => {
    const violations = findViolations([
      file(MARKETING_COMPONENT, `import x from 'gsap/ScrollSmoother.js'`),
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('banned-module');
  });

  test('bans gsap/all, which would pull ScrollSmoother in through the side door', () => {
    const violations = findViolations([file(MARKETING_COMPONENT, `import 'gsap/all'`)]);

    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toContain('re-exports every plugin');
  });

  test('reports a banned module once, not also as out-of-scope', () => {
    const violations = findViolations([
      file(STUDIO_COMPONENT, `import x from 'gsap/ScrollSmoother'`),
    ]);

    expect(violations).toHaveLength(1);
    expect(violations[0].kind).toBe('banned-module');
  });
});

describe('prose is not an import', () => {
  test('a comment explaining why ScrollSmoother is banned is not a violation', () => {
    // The existing marketing components carry exactly this kind of comment
    // (D32). A word-level search would fail them for documenting the rule.
    const files = [
      file(
        MARKETING_COMPONENT,
        `/**
          * Arigo does this with GSAP ScrollTrigger and ScrollSmoother. We ruled
          * ScrollSmoother out in D32 — Lenis too — so this is native scroll.
          */
         export const Thing = () => null`,
      ),
    ];

    expect(findViolations(files)).toEqual([]);
  });

  test('the word gsap in a studio comment is not a violation', () => {
    const violations = findViolations([
      file(STUDIO_COMPONENT, `// No gsap in here: the studio uses CSS and motion (D41).`),
    ]);

    expect(violations).toEqual([]);
  });
});

describe('the repository itself', () => {
  test('has no GSAP scope violations', () => {
    expect(checkGsapScope()).toEqual([]);
  });
});
