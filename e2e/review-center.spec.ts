import { expect, test } from '@playwright/test'
import { databaseRows, replaceDatabaseRows } from './databaseHelpers'
import { createReviewRecord } from '../src/study/levelReview'
test('跨来源排期去重，旧关卡仍只筛关卡来源，错题可追溯', async ({ page }) => {
  await page.goto('/#/pages/review-center/index')
  await expect(page.getByText('每日课程暂无到期文字。', { exact: false })).toBeVisible({ timeout: 30000 })
  await replaceDatabaseRows(page, 'level_review', ['char-0001', 'char-0002'].map(id => ({ id, ...createReviewRecord('2026-01-01T00:00:00Z') })))
  await replaceDatabaseRows(page, 'settings', [...await databaseRows(page, 'settings'), { id: 'font-learning-review-sources', value: JSON.stringify({ 'char-0001': ['daily'], 'char-0002': ['daily', 'level'] }) }])
  await page.reload()
  await expect(page.getByText('2 字等待复习', { exact: true })).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.daily-review-glyph')).toHaveText('一')
  await page.getByRole('button', { name: '还不认识', exact: true }).click()
  await expect(page.locator('.daily-review-glyph')).toHaveText('乙')
  await page.getByRole('button', { name: '关卡复习 · 1', exact: true }).click()
  await expect(page.locator('.review-total')).toHaveText('1 字')
  await expect(page.locator('.review-glyph')).toHaveText('乙')
  await page.goto('/#/pages/mistakes/index')
  await expect(page.getByText('错误 1 次 · 待巩固', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /一 认识判断/ }).click()
  await expect(page.getByText('回答错误', { exact: true })).toBeVisible()
  expect((await databaseRows(page, 'level_review')).find(row => row.id === 'char-0001')?.reviewCount).toBe(1)
})
