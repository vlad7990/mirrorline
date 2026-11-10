/**
 * The routes more than one component needs to name.
 *
 * `/app` only redirects to `/app/home`, so both spellings worked — which is
 * why they had drifted apart between the sign-in form and the onboarding
 * wizard. Declared once here, the canonical screen wins.
 */

/** The studio's first screen, and where signing in lands. */
export const STUDIO_HOME = '/app/home'

/** The three-step setup a brand new workspace starts in. */
export const ONBOARDING = '/app/onboarding'
