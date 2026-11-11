/**
 * How many pilot places are open — the one number on the public site that is
 * a commitment rather than sample data.
 *
 * This began as its own bar above the header (D21). The v4 handoff puts the
 * same idea in the header's gold announcement strip (D25), so `SiteHeader`
 * renders it now and only the constant lives here. Kept in its own module
 * rather than inlined because it is a business fact, not a layout detail, and
 * it is the thing most likely to be edited by someone who is not reading the
 * header's markup.
 *
 * Borrowed from beCreatives ("5 dedicated editor spots open this week"), the
 * one proof device our non-negotiables leave open to us. Every reference site
 * leads with volume proof — "20M+ creators", "980,434+ creators", Trustpilot
 * 4.8/5 — and CLAUDE.md non-negotiable 7 forbids inventing any of it. A
 * capacity line is ours to state: a fact about how many clients we are
 * willing to take, not a claim about how many we have.
 */

/**
 * Pilot places open in the current intake.
 *
 * **This must track reality.** A capacity line that never changes is the
 * manufactured scarcity non-negotiable 7 exists to prevent. Change it when
 * the intake changes; set it to zero and the announcement removes itself.
 *
 * Annotated `number` rather than left to infer the literal, so the zero check
 * and the plural branch in the header are not dead code to the compiler.
 */
export const PILOT_PLACES: number = 4
