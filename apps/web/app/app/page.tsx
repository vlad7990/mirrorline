import { redirect } from 'next/navigation'

/** /app has no screen of its own. Home is the studio's first stop. */
export default function AppIndexPage(): never {
  redirect('/app/home')
}
