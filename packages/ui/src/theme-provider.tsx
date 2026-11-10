'use client'

import * as React from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'mirrorline-theme'
const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (PREFERENCES as readonly string[]).includes(value)
}

/**
 * Runs before paint, so the page never flashes the wrong theme.
 * Kept as a string because it has to be inlined into <head>.
 */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var p=(s==='light'||s==='dark'||s==='system')?s:'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})()`

type ThemeContextValue = {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (next: ThemePreference) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function resolve(preference: ThemePreference, systemIsDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemIsDark ? 'dark' : 'light'
  return preference
}

function applyToDocument(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start from "system" on the server; the inline script has already put the
  // right class on <html>, and the effect below re-syncs after hydration.
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system')
  const [systemIsDark, setSystemIsDark] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemIsDark(media.matches)

    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
      // Storage can be unavailable (private mode, blocked cookies). "system"
      // is a correct fallback, so there is nothing to recover from.
    }
    if (isThemePreference(stored)) setPreferenceState(stored)

    const onChange = (event: MediaQueryListEvent) => setSystemIsDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolved = resolve(preference, systemIsDark)

  React.useEffect(() => {
    applyToDocument(resolved)
  }, [resolved])

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // The preference simply will not persist across reloads. The UI still works.
    }
  }, [])

  const value = React.useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
