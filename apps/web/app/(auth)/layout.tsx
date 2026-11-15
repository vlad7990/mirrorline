/**
 * Chrome for sign-in and sign-up (19 v2 ★/sign-in item 1).
 *
 * **These pages were wearing the studio's chrome, and they are the wrong side
 * of the door for it.** A white app bar over a light page is what the studio
 * looks like once you are in; a visitor reaching /sign-up has come off the
 * marketing site and should not pass through a palette change on the way. So
 * the whole thing is `band-ink` with the gold accent, like every public page,
 * and the form sits on the ink rather than on an app surface.
 *
 * That change costs nothing in the components. The band utilities remap the
 * semantic tokens (D40), so `Input`, `Checkbox` and `Button` render against
 * ink here with no auth-specific variants — which is the whole reason the
 * bands were built to remap rather than to colour themselves. The trap D52
 * names does not arise: nothing on these pages is a component with its own
 * pinned palette and a `surface` prop that has to be kept in step.
 *
 * **One shared image, down one side, and only where there is a side.** 19 v2
 * §asset budget bought a single picture for both pages rather than one each,
 * because they are the same moment. Below `lg` it is not rendered at all: a
 * sign-in form on a 390px screen wants to be the form, and a decorative
 * picture above it is a screen of scrolling before the first field.
 *
 * The jargon stays gone. docs/design/STITCH_REVIEW.md item 7 replaced "Studio
 * Access · Secure Vault" and "Auth Node 04 Online" with plain words, and item
 * 2 removed the certification badges along the bottom.
 */

import { AiLabel, LogoWordmark } from '@mirrorline/ui'
import Image from 'next/image'
import Link from 'next/link'

import { PAGE_HERO_IMAGES } from '@/components/marketing/kit/page-media'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="band-ink flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,42%)_minmax(0,1fr)] lg:grid-rows-1">
      {/* The picture ----------------------------------------------------- */}
      <aside className="relative hidden lg:block">
        {/* `loading="lazy"` rather than `priority`, and that is about the
            phone rather than the desktop. The column is `display: none`
            below `lg`, and a lazy image inside a hidden box is never
            fetched — where a priority one is fetched on every phone that
            will never show it. On a wide screen the image is in view at
            first paint, so a lazy image is requested immediately anyway and
            nothing has been given up. The same reasoning `InsetCycle`
            records about its first frame. */}
        <Image
          src={PAGE_HERO_IMAGES.auth.src}
          alt={PAGE_HERO_IMAGES.auth.alt}
          fill
          loading="lazy"
          sizes="42vw"
          quality={60}
          className="object-cover"
        />

        {/* Bottom-weighted, so the line at the foot sits on near-black
            whatever the picture is doing behind it. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-ink/10"
        />

        <span className="absolute left-6 top-6">
          <AiLabel>AI-generated image</AiLabel>
        </span>

        <p className="absolute inset-x-6 bottom-6 m-0 max-w-[36ch] text-subtitle font-normal text-on-ink-muted">
          Your own footage, your own accounts, and a record of what each post did.
        </p>
      </aside>

      {/* The door -------------------------------------------------------- */}
      <div className="flex min-h-dvh flex-col lg:min-h-0">
        <header className="border-b border-border">
          <div className="mx-auto flex h-16 w-full max-w-[560px] items-center justify-between gap-4 px-5 sm:px-8">
            <Link
              href="/"
              className="inline-flex items-center rounded-md"
              aria-label="Mirrorline, home"
            >
              <LogoWordmark size={26} />
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-md px-3 text-label text-text-muted hover:text-text"
            >
              Back to the website
            </Link>
          </div>
        </header>

        {/* tabIndex -1: Safari scrolls to a skip-link target without moving
            focus, so the next Tab would start again from the top of the page. */}
        <main id="main" tabIndex={-1} className="flex-1">
          <div className="mx-auto w-full max-w-[560px] px-5 py-10 sm:px-8 sm:py-14">{children}</div>
        </main>

        <footer className="border-t border-border">
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-2 px-5 py-6 text-meta text-text-muted sm:px-8">
            <p className="m-0">&ldquo;Mirrorline&rdquo; is a placeholder product name.</p>
            <span className="flex flex-wrap gap-4">
              <Link href="/privacy" className="hover:text-text">
                Privacy notice (draft)
              </Link>
              <Link href="/terms" className="hover:text-text">
                Terms (draft)
              </Link>
              <Link href="/trust" className="hover:text-text">
                Our rules
              </Link>
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
