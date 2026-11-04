import type { FontCoverTone, LearningFont } from './types'

export interface BuiltinFont extends LearningFont {
  fontFaceFamily: string
  fontSource: string
}

const FONT_TONES: FontCoverTone[] = ['green', 'blue', 'orange', 'rose', 'teal']
// 物理文件名满足 App 打包限制，原名称继续用于显示及生成持久化字体 ID。
const BUILTIN_FONT_FILE_NAMES: Readonly<Record<string, string>> = {
  'fz-teya-song.TTF': '方正特雅宋简体.TTF',
  'fz-xiaozhuan.ttf': '方正小篆体.ttf',
  'hanyi-kaiti-fan.ttf': '汉仪楷体繁.ttf',
  'youshe-title-black.ttf': '优设标题黑.ttf',
}
const builtinFontModules = import.meta.glob(
  ['../static/fronts/*.ttf', '../static/fronts/*.TTF'],
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

function getFileName(path: string): string {
  const fileName = path.split('/').pop() ?? path
  return BUILTIN_FONT_FILE_NAMES[fileName] ?? fileName
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
      const originalPath = path.slice(0, path.lastIndexOf('/') + 1) + getFileName(path)
      const suffix = createStableSuffix(originalPath)
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

export const fontCatalog: BuiltinFont[] = buildFontCatalog(builtinFontModules)
export const DEFAULT_FONT_ID = fontCatalog[0]?.id ?? ''
export const DEFAULT_ADDED_FONT_IDS = fontCatalog.slice(0, 2).map((font) => font.id)

export function getFont(fontId: unknown): LearningFont | undefined {
  return fontCatalog.find((font) => font.id === fontId)
}
