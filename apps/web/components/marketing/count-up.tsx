'use client'

/**
 * A figure that counts up once, when it first comes into view.
 *
 * From docs/design/handoff-v4 §"Website motion system": 1600ms, ease-out
 * cubic, decimals respected.
 *
 * The mechanics — and the three decisions behind them, which have not
 * changed — now live in `lib/motion/use-count-up.ts`, because the studio's
 * KPI cards needed the same count with completely different formatting
 * (17 §2). What is left here is this component's own contract: a fixed number
 * of decimals and a suffix.
 */

import { useCountUp } from '@/lib/motion/use-count-up'

export interface CountUpProps {
  readonly value: number
  /** 2.1 must not render as 2, so this is explicit rather than inferred. */
  readonly decimals?: number
  readonly suffix?: string
  readonly className?: string
}

export function CountUp({ value, decimals = 0, suffix = '', className }: CountUpProps) {
  const { ref, shown } = useCountUp<HTMLSpanElement>(value)

  return (
    <span ref={ref} className={className}>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  )
}
