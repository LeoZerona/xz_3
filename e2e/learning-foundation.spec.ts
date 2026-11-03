import { expect, test } from '@playwright/test'
import { replaceDatabaseRows } from './databaseHelpers'

test('首页和个人中心展示实际学习与复习记录，保持既有页面结构', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.home')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.database-overlay')).toHaveCount(0, { timeout: 30000 })
  const stamp = await page.evaluate(() => {
    const date = new Date()
    return { at: date.toISOString(), dateKey: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`, timezoneOffset: date.getTimezoneOffset() }
  })
  await replaceDatabaseRows(page, 'activity_events', [
    { id: 'foundation-review', sessionId: 'review-test', source: 'review', kind: 'answer', characterId: 'char-0001', mode: null, correct: 1, seconds: 0, ...stamp },
    { id: 'foundation-complete', sessionId: 'daily-test', source: 'daily', kind: 'completed', characterId: 'char-0001', mode: null, correct: null, seconds: 0, ...stamp },
  ])
  await replaceDatabaseRows(page, 'character_progress', [{ id: 'char-0001', status: 'completed', firstStartedAt: stamp.at, lastStudiedAt: stamp.at, completedAt: stamp.at, favorite: 0, favoriteChangedAt: null, excluded: 0, excludedChangedAt: null }])
  await page.reload()
  await expect(page.locator('.stat-value').nth(1)).toHaveText('1/20', { timeout: 30000 })
  await expect(page.locator('.font-row')).toHaveCount(2)
  await expect(page.locator('.plan-actions .action-button')).toHaveCount(2)
  await page.getByRole('button', { name: '我', exact: true }).click()
  await expect(page.locator('.study-summary')).toContainText('累计已学 1')
  await expect(page.locator('.study-summary')).toContainText('坚持 1 天')
})

test('答题前台有效计时写回原首页时长位置', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-03T12:00:00.000Z') })
  await page.goto('/#/pages/study/index')
  await expect(page.locator('.prompt-character')).toBeVisible({ timeout: 30000 })
  await page.clock.fastForward(65_000)
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.stat-time')).toContainText('1', { timeout: 30000 })
})
