import type { Metadata } from 'next'
import { PageHeader } from '@mirrorline/ui'

import { CaptionStyleCard } from '@/components/brand-kit/caption-style-card'
import { LogoAndColoursCard } from '@/components/brand-kit/logo-and-colours-card'
import { VoiceCard } from '@/components/brand-kit/voice-card'
import { WordsCard } from '@/components/brand-kit/words-card'

/**
 * S9 · Brand kit — "Logo, colours, fonts, caption styles … voice settings …
 * and words to always and never use" (03_SCREENS_SPEC.md).
 *
 * An auto-fit grid, so the four cards sit side by side on a wide screen and
 * stack into one column at 390px without the page scrolling sideways.
 */

export const metadata: Metadata = { title: 'Brand kit' }

export default function BrandKitPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Used by every agent on every video" title="Brand kit" />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-5">
        <LogoAndColoursCard />
        <CaptionStyleCard />
        <VoiceCard />
        <WordsCard />
      </div>
    </div>
  )
}
