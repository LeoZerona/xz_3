import { expect, it } from 'vitest'

it('App 静态资源路径仅含 ASCII 字符，避免 HBuilderX 拒绝导出', () => {
  const paths = Object.keys(import.meta.glob('../static/**/*', { query: '?url' }))
  expect(paths.length).toBeGreaterThan(0)
  expect(paths.filter((file) => /[^\x00-\x7f]/.test(file))).toEqual([])
})
