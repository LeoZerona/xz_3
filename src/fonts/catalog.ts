import type { LearningFont } from './types'

export const DEFAULT_FONT_ID = 'font-one'
export const DEFAULT_ADDED_FONT_IDS = [DEFAULT_FONT_ID, 'font-two']

export const fontCatalog: LearningFont[] = [
  {
    id: DEFAULT_FONT_ID,
    name: '字体一',
    description: '端正规整，笔画舒展，适合日常书写入门。',
    sample: '一',
    fontFamily: "KaiTi, STKaiti, 'Kaiti SC', serif",
    coverTone: 'green',
    dailyCount: 15,
    remainingDays: 20,
    learned: 45,
    total: 345,
    progress: 13,
  },
  {
    id: 'font-two',
    name: '字体二',
    description: '清晰利落，结构均衡，适合进阶临摹练习。',
    sample: '二',
    fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
    coverTone: 'blue',
    dailyCount: 15,
    remainingDays: 30,
    learned: 0,
    total: 450,
    progress: 0,
  },
  {
    id: 'regular-script',
    name: '楷书',
    description: '横平竖直、法度严谨，适合认识汉字的基本结构。',
    sample: '楷',
    fontFamily: "KaiTi, STKaiti, 'Kaiti SC', serif",
    coverTone: 'orange',
    dailyCount: 15,
    remainingDays: 28,
    learned: 0,
    total: 420,
    progress: 0,
  },
  {
    id: 'song-typeface',
    name: '宋体',
    description: '笔画对比鲜明、字面端庄，适合阅读与规范字练习。',
    sample: '宋',
    fontFamily: "SimSun, Songti SC, 'Noto Serif CJK SC', serif",
    coverTone: 'rose',
    dailyCount: 15,
    remainingDays: 32,
    learned: 0,
    total: 480,
    progress: 0,
  },
  {
    id: 'fang-song',
    name: '仿宋',
    description: '字形修长、起落分明，适合公文与硬笔字形练习。',
    sample: '仿',
    fontFamily: "FangSong, STFangsong, 'FangSong SC', serif",
    coverTone: 'teal',
    dailyCount: 15,
    remainingDays: 26,
    learned: 0,
    total: 390,
    progress: 0,
  },
]

export function getFont(fontId: unknown): LearningFont | undefined {
  return fontCatalog.find((font) => font.id === fontId)
}
