import type { ThemeDefinition } from './types'

export const DEFAULT_THEME_ID = 'ocean-blue'
export const THEME_STORAGE_KEY = 'morning-pages:theme'

export const themes: ThemeDefinition[] = [
  {
    id: DEFAULT_THEME_ID,
    name: '晴空蓝',
    description: '清爽、专注的默认配色',
    mode: 'light',
    tokens: {
      primary: '#1755e9', primaryStrong: '#1045c6', primarySoft: '#e7edff', onPrimary: '#ffffff',
      page: '#ffffff', topbar: '#fafafa', surface: '#ffffff', surfaceMuted: '#f7f8fa',
      text: '#20242d', textSecondary: '#66707e', textMuted: '#9aa3af', border: '#edf0f4',
      selection: '#e6efff', progress: '#90b5ff', coverOne: '#17b684', coverTwo: '#4476e8', shadow: '#20242d0d',
    },
  },
  {
    id: 'jade-green',
    name: '青竹绿',
    description: '柔和自然，适合长时间阅读',
    mode: 'light',
    tokens: {
      primary: '#16856b', primaryStrong: '#0d6c56', primarySoft: '#dff5ed', onPrimary: '#ffffff',
      page: '#fbfdfb', topbar: '#f3f8f5', surface: '#ffffff', surfaceMuted: '#eef6f2',
      text: '#20342e', textSecondary: '#5e746d', textMuted: '#8fa099', border: '#dce9e3',
      selection: '#d8f0e6', progress: '#79cbb1', coverOne: '#18a981', coverTwo: '#5b8f7e', shadow: '#163d300f',
    },
  },
  {
    id: 'sunset-orange',
    name: '落日橙',
    description: '温暖活力，突出学习进度',
    mode: 'light',
    tokens: {
      primary: '#e7652b', primaryStrong: '#c94c18', primarySoft: '#fff0e8', onPrimary: '#ffffff',
      page: '#fffdf9', topbar: '#fff8f2', surface: '#ffffff', surfaceMuted: '#faf2ea',
      text: '#392820', textSecondary: '#79675d', textMuted: '#a4948b', border: '#eee0d6',
      selection: '#ffeadc', progress: '#f5a77f', coverOne: '#e38c3f', coverTwo: '#bd6654', shadow: '#4f28120f',
    },
  },
  {
    id: 'ink-night',
    name: '墨夜',
    description: '低亮度深色主题，夜间更舒适',
    mode: 'dark',
    tokens: {
      primary: '#7da2ff', primaryStrong: '#a2bbff', primarySoft: '#26375c', onPrimary: '#101624',
      page: '#151922', topbar: '#1a1f2b', surface: '#202633', surfaceMuted: '#1b212c',
      text: '#f1f4fa', textSecondary: '#bac2d0', textMuted: '#8993a3', border: '#303847',
      selection: '#293a60', progress: '#7297ef', coverOne: '#278c72', coverTwo: '#536fc0', shadow: '#0000003d',
    },
  },
  {
    id: 'spring-festival',
    name: '新春红',
    description: '节日限定配色示例',
    mode: 'light',
    seasonal: true,
    tokens: {
      primary: '#c92d32', primaryStrong: '#a91e24', primarySoft: '#ffebe5', onPrimary: '#fffaf0',
      page: '#fffaf2', topbar: '#fff1e3', surface: '#fffdf8', surfaceMuted: '#faeee2',
      text: '#46231d', textSecondary: '#7d5d53', textMuted: '#a58b80', border: '#efd7ca',
      selection: '#ffe2d3', progress: '#e99577', coverOne: '#d9473f', coverTwo: '#d19a32', shadow: '#6e241612',
    },
  },
]

export function getTheme(themeId: unknown): ThemeDefinition {
  return themes.find((theme) => theme.id === themeId) ?? themes[0]!
}
