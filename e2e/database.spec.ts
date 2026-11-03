import { expect, test, type Page } from '@playwright/test'
import { databaseRows } from './databaseHelpers'

async function records(page: Page, table: string): Promise<Array<Record<string, unknown>>> {
  return databaseRows(page, table)
}

test('数据库保留每日 204 字、完整 3500 字及原关卡顺序', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.database-overlay')).toHaveCount(0, { timeout: 30000 })
  await expect(page.locator('.stage-card')).toHaveCount(24)
  expect(await records(page, 'characters')).toHaveLength(3500)
  expect(await records(page, 'character_sets')).toHaveLength(204)
  const firstStage = (await records(page, 'level_characters')).filter((row) => row.levelId === 'level1-stage-01').sort((a, b) => Number(a.position) - Number(b.position))
  expect(firstStage.slice(0, 3).map((row) => row.characterId)).toEqual(['char-0001', 'char-0002', 'char-0003'])
  await page.locator('.stage-card').first().click()
  await expect(page.getByRole('button', { name: '开始学习', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: '开始学习', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('旧收藏、斩字、书籍和阅读位置迁移后从数据库恢复', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('migration-fixture')) return
    const store = (key: string, data: unknown) => localStorage.setItem(key, JSON.stringify({ type: 'object', data }))
    store('font-learning-character-preferences', { favoriteIds: ['char-0001'], excludedIds: ['char-0002'] })
    store('reading:customBooks', [{ id: 'legacy-book', name: '旧书', fileName: '旧书.txt', ext: 'txt', url: '', source: 'custom', createdAt: 1, text: '原有正文'.repeat(10000) }])
    store('reading:progress', { bookId: 'legacy-book', page: 7, rowsPerPage: 10, characterOffset: 77, tableStyleId: 'light-grid', updatedAt: '2026-10-31T00:00:00.000Z' })
    localStorage.setItem('migration-fixture', '1')
  })
  await page.goto('/#/pages/character-detail/index?id=char-0001')
  await expect(page.locator('.database-overlay')).toHaveCount(0, { timeout: 30000 })
  const preferences = await records(page, 'character_progress')
  expect(preferences.find((row) => row.id === 'char-0001')).toMatchObject({ favorite: 1 })
  expect(preferences.find((row) => row.id === 'char-0002')).toMatchObject({ excluded: 1 })
  expect((await records(page, 'reading_progress'))[0]).toMatchObject({ id: 'legacy-book', page: 7, characterOffset: 77 })
  expect((await records(page, 'books'))[0]).not.toHaveProperty('text')
  expect((await records(page, 'book_chunks')).map((row) => row.text).join('')).toBe('原有正文'.repeat(10000))
  await page.getByRole('button', { name: '取消收藏当前文字', exact: true }).click()
  await expect.poll(async () => (await records(page, 'character_progress')).find((row) => row.id === 'char-0001')?.favorite).toBe(0)
  await page.reload()
  await expect(page.getByRole('button', { name: '收藏当前文字', exact: true })).toBeVisible()
  const legacy = await page.evaluate(() => JSON.parse(localStorage.getItem('font-learning-character-preferences')!).data)
  expect(legacy.favoriteIds).toEqual(['char-0001'])
})

test('迁移中断会回滚、保留旧数据，重试可以完成迁移', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('font-learning-character-preferences', JSON.stringify({ type: 'object', data: { favoriteIds: ['char-0001'] } }))
    const original = IDBObjectStore.prototype.put
    let failOnce = true
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (failOnce && this.name === 'character_progress') { failOnce = false; throw new DOMException('模拟空间不足', 'QuotaExceededError') }
      return original.apply(this, args)
    }
  })
  await page.goto('/#/pages/index/index')
  await expect(page.getByText('本地数据暂时无法读取')).toBeVisible()
  expect(await records(page, 'character_progress')).toHaveLength(0)
  expect((await records(page, 'meta')).find((row) => row.id === 'legacy-v1')).toBeUndefined()
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.locator('.database-overlay')).toHaveCount(0, { timeout: 30000 })
  expect((await records(page, 'character_progress'))[0]).toMatchObject({ id: 'char-0001', favorite: 1 })
})

test('手机搜索和设置备份入口可用，导出后可恢复', async ({ page }) => {
  await page.goto('/#/pages/search/index')
  await expect(page.locator('.database-overlay')).toHaveCount(0, { timeout: 30000 })
  await page.locator('.search-input input').fill('yi')
  await expect(page.locator('.result-character').first()).toHaveText('一')
  await page.locator('.result-item').first().click()
  await expect(page.getByRole('button', { name: '收藏当前文字', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '收藏当前文字', exact: true }).click()
  await expect.poll(async () => (await records(page, 'character_progress')).find((row) => row.id === 'char-0001')?.favorite).toBe(1)
  await page.goto('/#/pages/settings/index')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出数据备份', exact: true }).click()
  const download = await downloadEvent
  const path = await download.path()
  expect(path).toBeTruthy()
  await page.goto('/#/pages/character-detail/index?id=char-0001')
  await page.getByRole('button', { name: '取消收藏当前文字', exact: true }).click()
  await expect.poll(async () => (await records(page, 'character_progress')).find((row) => row.id === 'char-0001')?.favorite).toBe(0)
  await page.goto('/#/pages/settings/index')
  const chooserEvent = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '恢复数据备份', exact: true }).click()
  await (await chooserEvent).setFiles(path!)
  await page.getByText('恢复', { exact: true }).click()
  await expect(page.getByText('备份已恢复', { exact: true })).toBeVisible()
  expect((await records(page, 'character_progress')).find((row) => row.id === 'char-0001')?.favorite).toBe(1)
  await page.screenshot({ path: test.info().outputPath('database-settings-mobile.png'), fullPage: true })
})

test('每日计划与启用模式保存到数据库，重新打开后恢复', async ({ page }) => {
  await page.goto('/#/pages/plan/index')
  await expect(page.locator('.database-overlay')).toHaveCount(0, { timeout: 30000 })
  await page.getByRole('checkbox').nth(2).click()
  await page.locator('.plan-wheel').evaluate((element) => {
    element.scrollTop = 84
    element.dispatchEvent(new Event('scroll'))
  })
  // 滚动吸附可能在下一帧才更新选择，先确认用户看到的目标已选中。
  await expect(page.locator('.plan-wheel')).toHaveAttribute('data-selected-count', '20')
  await page.getByRole('button', { name: '保存计划', exact: true }).click()
  await expect.poll(async () => {
    const row = (await records(page, 'settings')).find((entry) => entry.id === 'font-learning-plan')
    return row ? JSON.parse(String(row.value)) as unknown : null
  }).toEqual({ dailyCount: 20, modes: ['seal-to-reference-choice', 'reference-to-seal-choice'] })
  await page.goto('/#/pages/plan/index')
  await expect(page.locator('.database-overlay')).toHaveCount(0)
  await expect(page.locator('.plan-wheel')).toHaveAttribute('data-selected-count', '20')
  await expect(page.getByRole('checkbox').nth(2)).toHaveAttribute('aria-checked', 'false')
  await page.getByRole('button', { name: '保存计划', exact: true }).click()
  await expect.poll(async () => {
    const row = (await records(page, 'settings')).find((entry) => entry.id === 'font-learning-plan')
    return row ? (JSON.parse(String(row.value)) as { dailyCount: number }).dailyCount : null
  }).toBe(20)
})
