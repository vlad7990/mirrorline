/**
 * Putting library-rendered figures into the machine's voice.
 *
 * DESIGN.md "Typography — two voices": Geist is the studio talking to a person,
 * Geist Mono is "everything the agents produced or measured", and the split is
 * "semantic, not decorative". The studio screens follow that rule directly
 * wherever they render a figure themselves — `.machine` on the span.
 *
 * Three figures are drawn inside @mirrorline/ui instead: the big number on a
 * metric tile, the numeric columns of a stat table, and the row headings on the
 * best-times heatmap. Those components take a `className` but not a node for
 * the figure, so the studio reaches them through the class the library already
 * puts on every measured number — `.tabular`, the tabular-figures utility from
 * theme.css — and through the element the figure sits in.
 *
 * Both selectors are deliberately narrow rather than a blanket `font-mono` on
 * the card: a tile's label, its delta sentence, a table's column headers and a
 * post's hook are the studio's voice and must stay in Geist.
 */

/**
 * Every tabular figure inside this subtree is a measurement, so it reads in the
 * machine's voice. Covers `MetricTile`'s value and `StatTable`'s numeric
 * columns without touching their labels or headers.
 */
export const MACHINE_FIGURES = '[&_.tabular]:font-mono'

/**
 * `Heatmap` row headings are clock times ("7:30 am"), which DESIGN.md lists
 * under the machine's voice alongside costs and timings. The column headings
 * stay in Geist: "Mon" is a word, not a measurement.
 */
export const MACHINE_HEATMAP_TIMES = '[&_tbody_th]:font-mono'
