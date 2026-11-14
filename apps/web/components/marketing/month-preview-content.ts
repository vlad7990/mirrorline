/**
 * How a plan's posts fall across its days.
 *
 * 19 v2 ★3 asks /pricing for a "what a month looks like" mini-calendar per
 * plan. The honest version of that picture has to answer a question the
 * headline number does not: 40 posts a month is not "1.33 posts on Tuesday",
 * it is some days with two and most with one.
 *
 * A pure function rather than arithmetic inside the component, because this
 * is the part with edge cases — remainders, a fortnight rather than a month,
 * and a plan with no volume at all — and those are cheap to assert and
 * tedious to eyeball in a rendered grid.
 */

/**
 * Spread `total` posts across `days` as evenly as a whole number of posts
 * allows.
 *
 * Every day gets the floor, and the remainder goes one extra to the earliest
 * days. That is a real scheduling choice and not only a rounding one: the
 * calendar reads left to right, so front-loading the busier days puts them
 * where a reader starts rather than leaving the week trailing off.
 *
 * Returns an empty array for a plan with no volume — the caller draws nothing
 * rather than drawing an empty month, which would look like a plan that
 * delivers nothing instead of a plan that is not for sale.
 */
export function distributePosts(total: number, days: number): readonly number[] {
  if (days <= 0) return []
  if (total <= 0) return []

  const floor = Math.floor(total / days)
  const remainder = total % days

  return Array.from({ length: days }, (_, index) => (index < remainder ? floor + 1 : floor))
}

/**
 * The busiest day in a distribution, for sizing the grid's rows.
 *
 * Separate from the distribution itself so the component does not have to
 * reduce over the array to know how tall a cell must be.
 */
export function busiestDay(distribution: readonly number[]): number {
  return distribution.reduce((most, count) => Math.max(most, count), 0)
}
