export type ThemeMode = 'light' | 'dark'

export type ThemeTokens = {
  primary: string
  primaryStrong: string
  primarySoft: string
  onPrimary: string
  page: string
  topbar: string
  surface: string
  surfaceMuted: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  selection: string
  progress: string
  coverOne: string
  coverTwo: string
  shadow: string
}

export type ThemeDefinition = {
  id: string
  name: string
  description: string
  mode: ThemeMode
  seasonal?: boolean
  tokens: ThemeTokens
}
