import type { TableStyleId } from './types'

export interface TableStyleMeta {
  id: TableStyleId
  name: string
  description: string
  badge: string
}

export const TABLE_STYLES: TableStyleMeta[] = [
  { id: 'manuscript-grid', name: '方格稿纸', description: '绿色方格 · 每字一格', badge: '方格' },
  { id: 'manuscript-line', name: '横线稿纸', description: '绿色横线 · 行线书写', badge: '横线' },
  { id: 'light-grid', name: '浅色网格', description: 'Word 网格表 · 细线边框', badge: '默认' },
  { id: 'light-shading', name: '浅色底纹', description: '隔行浅灰底纹，无竖线', badge: '底纹' },
  { id: 'medium-grid', name: '中等网格', description: '加粗外框 + 网格内线', badge: '中等' },
  { id: 'accent-stripe', name: '主题条纹', description: '主题色淡条纹', badge: '主题' },
  { id: 'borderless', name: '极简无框', description: '卡片式无框，行间距留白', badge: '极简' },
  { id: 'dark-header', name: '深色表头', description: '首行深色反白，余行网格', badge: '表头' },
]

export function getTableStyle(id: unknown): TableStyleMeta {
  return TABLE_STYLES.find((s) => s.id === id) ?? TABLE_STYLES[0]!
}

export function isTableStyleId(value: unknown): value is TableStyleId {
  return TABLE_STYLES.some((s) => s.id === value)
}
