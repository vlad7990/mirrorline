/**
 * /reset-password — where a reset link lands once its code has been exchanged.
 *
 * `requestPasswordReset` has been pointing mail at this path since the action
 * was written; until this file existed the path did not, which would have made
 * the reset flow a dead end one click from the end.
 *
 * `noindex`, because a page that means nothing without a one-time link has no
 * business in a search result.
 */

import type { Metadata } from 'next'

import { SetPasswordForm } from './set-password-form'

export const metadata: Metadata = {
  title: 'Set a new password',
  description: 'Choose a new password for your Mirrorline account.',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return <SetPasswordForm />
}
