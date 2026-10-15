import type { FontCoverTone, LearningFont } from './types'

interface BuiltinFont extends LearningFont {
  fontFaceFamily: string
  fontSource: string
}

const FONT_TONES: FontCoverTone[] = ['green', 'blue', 'orange', 'rose', 'teal']
const builtinFontModules = import.meta.glob(
  ['../static/fronts/*.ttf', '../static/fronts/*.TTF'],
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

function getFileName(path: string): string {
  return path.split('/').pop() ?? path
}

function getFontName(path: string): string {
  return getFileName(path).replace(/\.ttf$/i, '')
}

function createStableSuffix(value: string): string {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function buildFontCatalog(fontModules: Record<string, string>): BuiltinFont[] {
  return Object.entries(fontModules)
    .filter(([path]) => /\.ttf$/i.test(path))
    .sort(([left], [right]) => getFileName(left).localeCompare(getFileName(right), 'zh-CN'))
    .map(([path, fontSource], index) => {
      const name = getFontName(path)
      const suffix = createStableSuffix(path)
      return {
        id: `builtin-${suffix}`,
        name,
        description: '系统内置的本地字体资源。',
        sample: name.slice(0, 1) || '永',
        fontFamily: `builtin-${suffix}, serif`,
        fontFaceFamily: `builtin-${suffix}`,
        fontSource,
        coverTone: FONT_TONES[index % FONT_TONES.length]!,
        dailyCount: 15,
        remainingDays: 30,
        learned: 0,
        total: 350,
        progress: 0,
      }
    })
}

export const fontCatalog: LearningFont[] = buildFontCatalog(builtinFontModules)
export const DEFAULT_FONT_ID = fontCatalog[0]?.id ?? ''
export const DEFAULT_ADDED_FONT_IDS = fontCatalog.slice(0, 2).map((font) => font.id)

const registeredFontFamilies = new Set<string>()

export function registerBuiltinFontFaces(): void {
  for (const font of fontCatalog as BuiltinFont[]) {
    if (registeredFontFamilies.has(font.fontFaceFamily)) continue

    if (typeof document !== 'undefined' && document.head) {
      const style = document.createElement('style')
      style.dataset.builtinFont = font.fontFaceFamily
      style.textContent = `@font-face{font-family:"${font.fontFaceFamily}";src:url("${font.fontSource}") format("truetype");font-display:swap;}`
      document.head.appendChild(style)
      registeredFontFamilies.add(font.fontFaceFamily)
      continue
    }

    const uniWithFontFace = typeof uni === 'undefined'
      ? undefined
      : uni as unknown as {
          loadFontFace?: (options: {
            family: string
            source: string
            success?: () => void
            fail?: (error: unknown) => void
          }) => void
        }

    if (typeof uniWithFontFace?.loadFontFace === 'function') {
      uniWithFontFace.loadFontFace({
        family: font.fontFaceFamily,
        source: `url("${font.fontSource}")`,
        success: () => registeredFontFamilies.add(font.fontFaceFamily),
        fail: () => { /* 字体加载失败时保留系统衬线字体回退。 */ },
      })
    }
  }
}

export function getFont(fontId: unknown): LearningFont | undefined {
  return fontCatalog.find((font) => font.id === fontId)
}
