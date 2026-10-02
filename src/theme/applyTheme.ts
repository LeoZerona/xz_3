import type { ThemeDefinition } from './types'

const tokenProperties: Record<keyof ThemeDefinition['tokens'], string> = {
  primary: '--color-primary',
  primaryStrong: '--color-primary-strong',
  primarySoft: '--color-primary-soft',
  onPrimary: '--color-on-primary',
  page: '--color-page',
  topbar: '--color-topbar',
  surface: '--color-surface',
  surfaceMuted: '--color-surface-muted',
  text: '--color-text',
  textSecondary: '--color-text-secondary',
  textMuted: '--color-text-muted',
  border: '--color-border',
  selection: '--color-selection',
  progress: '--color-progress',
  coverOne: '--color-cover-one',
  coverTwo: '--color-cover-two',
  shadow: '--color-shadow',
}

export type ThemeTarget = {
  setAttribute(name: string, value: string): void
  style: { setProperty(name: string, value: string): void }
}

export function applyTheme(theme: ThemeDefinition, target?: ThemeTarget | null) {
  const root = target ?? (typeof document === 'undefined' ? null : document.documentElement)
  if (!root) return

  root.setAttribute('data-theme', theme.id)
  root.setAttribute('data-theme-mode', theme.mode)
  Object.entries(theme.tokens).forEach(([token, value]) => {
    root.style.setProperty(tokenProperties[token as keyof ThemeDefinition['tokens']], value)
  })
}
