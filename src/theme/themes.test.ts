import { describe, expect, it, vi } from 'vitest'
import { applyTheme } from './applyTheme'
import { DEFAULT_THEME_ID, getTheme, themes } from './themes'

describe('主题系统', () => {
  it('未知主题会安全回退到默认主题', () => {
    expect(getTheme('not-exists').id).toBe(DEFAULT_THEME_ID)
  })

  it('内置多个可切换的测试主题', () => {
    expect(themes.length).toBeGreaterThanOrEqual(5)
    expect(new Set(themes.map((theme) => theme.id)).size).toBe(themes.length)
    expect(themes.some((theme) => theme.mode === 'dark')).toBe(true)
    expect(themes.some((theme) => theme.seasonal)).toBe(true)
  })

  it('把选中主题转换为根节点 CSS 变量', () => {
    const setAttribute = vi.fn()
    const setProperty = vi.fn()
    const theme = getTheme('spring-festival')
    applyTheme(theme, { setAttribute, style: { setProperty } })

    expect(setAttribute).toHaveBeenCalledWith('data-theme', 'spring-festival')
    expect(setAttribute).toHaveBeenCalledWith('data-theme-mode', 'light')
    expect(setProperty).toHaveBeenCalledWith('--color-primary', theme.tokens.primary)
    expect(setProperty).toHaveBeenCalledWith('--color-page', theme.tokens.page)
  })
})
