import { expect, test } from '@playwright/test'
import { databaseRows, replaceDatabaseRows } from './databaseHelpers'

test('缺少 Array.at 时带学习记录重新启动，正常生成消息且不显示保存失败', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.addInitScript(() => {
    Reflect.deleteProperty(Array.prototype, 'at')
  })
  await page.goto('/#/pages/index/index')
  await expect(page.getByRole('button', { name: '开始学习', exact: true })).toBeVisible()
  await expect(page.locator('.database-overlay')).toHaveCount(0)
  await replaceDatabaseRows(page, 'activity_events', [{
    id: 'startup-completed', sessionId: 'daily-session', source: 'daily', kind: 'completed',
    characterId: 'char-0001', mode: null, correct: null, at: '2026-11-03T01:00:00.000Z',
    dateKey: '2026-11-3', seconds: 0, timezoneOffset: 0,
  }])

  await page.reload()
  await expect(page.getByRole('button', { name: '开始学习', exact: true })).toBeVisible()
  await expect.poll(async () => (await databaseRows(page, 'local_messages')).length).toBe(1)
  await expect(page.locator('.database-banner')).toHaveCount(0)
  await expect(page.locator('.database-overlay')).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath('startup-compatible-mobile.png'), fullPage: true })

  await page.getByRole('button', { name: '消息提示', exact: true }).click()
  await expect(page.getByText('2026-11-3 完成了 1 个文字的正式学习。', { exact: true })).toBeVisible()
  expect(await databaseRows(page, 'local_messages')).toMatchObject([{
    id: 'learning:2026-11-3', at: '2026-11-03T01:00:00.000Z', readAt: null,
  }])
  expect(await databaseRows(page, 'activity_events')).toHaveLength(1)
  expect(errors).toEqual([])
})
