import { expect, test } from '@playwright/test'

test('mobile reading supports catalog, automatic paging, and module navigation', async ({ page }) => {
  await page.goto('/#/pages/reading/index')

  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
  await page.getByRole('button', { name: '目录' }).click()
  await expect(page.locator('.catalog-panel')).toBeVisible()

  const txtBook = page.locator('.catalog-item').filter({ has: page.locator('.type-txt') }).first()
  const bookName = (await txtBook.locator('.item-name').textContent()) ?? ''
  await txtBook.click()
  await expect(page.locator('.topbar-sub')).toContainText(bookName)
  await expect(page.locator('.cell-learning').first()).toContainText('资源来源于网络')
  await expect(page.locator('.cell-learning').first()).not.toContainText('�')

  await page.getByRole('button', { name: '表格样式' }).click()
  await page.locator('.style-card').filter({ hasText: '方格稿纸' }).click()
  await expect(page.locator('.reading-table-wrap')).toHaveAttribute('data-table-style', 'manuscript-grid')
  await expect(page.locator('.grid-char').first()).toBeVisible()
  await expect(page.locator('.cell-index')).toHaveCount(0)
  const firstCellPositions = await page.locator('.manuscript-line--learn .grid-cell').evaluateAll((cells) => (
    cells.slice(0, 3).map((cell) => {
      const rect = cell.getBoundingClientRect()
      return { left: Math.round(rect.left), top: Math.round(rect.top) }
    })
  ))
  expect(firstCellPositions).toHaveLength(3)
  expect(new Set(firstCellPositions.map((position) => position.top)).size).toBe(1)
  expect(firstCellPositions[1]!.left).toBeGreaterThan(firstCellPositions[0]!.left)

  const durationInput = page.locator('.duration-input input')
  await durationInput.fill('8')
  await durationInput.blur()
  await page.locator('.toggle-button').click()
  await expect(page.locator('.reading-progress')).toBeVisible()
  const readingScroller = page.locator('.reading-body .uni-scroll-view-scrollbar-hidden').first()
  await expect.poll(() => readingScroller.evaluate((element) => element.scrollTop), { timeout: 2_500 }).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: '暂停自动阅读' })).toBeVisible()
  const scrollSamples: number[] = []
  for (let index = 0; index < 10; index += 1) {
    await page.waitForTimeout(40)
    scrollSamples.push(await readingScroller.evaluate((element) => Math.round(element.scrollTop)))
  }
  expect(new Set(scrollSamples).size).toBeGreaterThanOrEqual(6)
  expect(scrollSamples.every((value, index) => index === 0 || value >= scrollSamples[index - 1]!)).toBe(true)

  await page.getByRole('button', { name: '暂停自动阅读' }).click()
  await expect(page.getByRole('button', { name: '继续自动阅读' })).toBeVisible()
  await expect(page.locator('.reading-progress')).toBeVisible()
  const pausedScrollTop = await readingScroller.evaluate((element) => element.scrollTop)
  const pausedProgressTransform = await page.locator('.reading-progress').evaluate((element) => getComputedStyle(element).transform)
  await page.waitForTimeout(200)
  expect(await readingScroller.evaluate((element) => element.scrollTop)).toBe(pausedScrollTop)
  expect(await page.locator('.reading-progress').evaluate((element) => getComputedStyle(element).transform)).toBe(pausedProgressTransform)

  await page.getByRole('button', { name: '继续自动阅读' }).click()
  await expect.poll(() => readingScroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(pausedScrollTop)
  await readingScroller.dispatchEvent('wheel', { deltaY: -120 })
  await expect(page.getByRole('button', { name: '继续自动阅读' })).toBeVisible()

  await page.locator('.auto-reading-action--stop').click()
  await expect(page.locator('.reading-progress')).toBeHidden()

  await durationInput.fill('3')
  await durationInput.blur()
  await page.locator('.toggle-button').click()
  await expect(page.locator('.page-text')).toContainText('第 2 /', { timeout: 5_000 })

  await page.getByRole('button', { name: '学习', exact: true }).click()
  await expect(page).toHaveURL(/\/#\/$/)
  await expect(page.getByText('今日计划')).toBeVisible()
})
