import { expect, test } from '@playwright/test'

test('mobile reading supports catalog, automatic paging, and module navigation', async ({ page }) => {
  await page.goto('/#/pages/reading/index')

  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
  await page.getByRole('button', { name: '目录' }).click()
  await expect(page.locator('.catalog-panel')).toBeVisible()

  await page.getByLabel('失了老师说她全家搬去了国外再次见').click()
  await expect(page.locator('.topbar-sub')).toContainText('失了老师说她全家搬去了国外再次见')

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
  await durationInput.fill('1')
  await durationInput.blur()
  await page.locator('.toggle-button').click()
  await expect(page.locator('.reading-progress')).toBeVisible()
  await expect(page.locator('.page-text')).toContainText('第 2 /', { timeout: 3_000 })

  await page.getByRole('button', { name: '学习', exact: true }).click()
  await expect(page).toHaveURL(/\/#\/$/)
  await expect(page.getByText('今日计划')).toBeVisible()
})
