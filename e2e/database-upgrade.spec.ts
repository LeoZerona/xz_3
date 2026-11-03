import { expect, test } from '@playwright/test'
import { tables } from '../src/database/schema'
import { databaseRows } from './databaseHelpers'

test('版本 1 的浏览器数据库升级后保留已完成关卡，并补齐复习记录', async ({ page }) => {
  await page.route('**/upgrade-fixture', (route) => route.fulfill({ contentType: 'text/html', body: '<title>数据库升级测试</title>' }))
  await page.goto('/upgrade-fixture')
  const legacyTables = tables.filter((name) => !['stage_training', 'stage_training_modes', 'level_review'].includes(name))
  await page.evaluate((names) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('font-learning', 1)
    request.onupgradeneeded = () => { for (const name of names) request.result.createObjectStore(name, { keyPath: 'id' }) }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(['meta', 'stage_progress', 'stage_character_progress'], 'readwrite')
      tx.objectStore('meta').put({ id: 'legacy-v1', value: 'complete' })
      tx.objectStore('stage_progress').put({ id: 'level1-stage-01', completed: 1, updatedAt: '2026-01-01T00:00:00.000Z' })
      tx.objectStore('stage_character_progress').put({ id: 'legacy-character', stageId: 'level1-stage-01', characterId: 'char-0001', position: 0 })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onabort = () => { db.close(); reject(tx.error) }
    }
  }), legacyTables)
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.database-overlay')).toHaveCount(0,{timeout:45000})
  await expect(page.locator('#stage-level1-stage-01')).toContainText('已训练 1 次')
  expect((await databaseRows(page, 'stage_progress'))[0]).toMatchObject({ completed: 1 })
  await page.getByRole('button', { name: '关卡复习', exact: true }).click()
  await expect(page.locator('.review-total')).toHaveText('10 字')
  await expect(page.locator('.review-glyph')).toHaveText('一')
  expect(await databaseRows(page, 'level_review')).toHaveLength(10)
})
