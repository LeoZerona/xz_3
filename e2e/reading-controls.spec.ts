import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openReader(page: Page) {
  await page.goto('/#/pages/reading/index')
  await page.locator('.book-card').filter({ has: page.locator('[data-ext="txt"]') }).first().click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  await page.locator('.reader-file-name').click()
}

test('settings close button clears the status area and night colors reach the reader', async ({ page }) => {
  await openReader(page)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  const close = page.getByRole('button', { name: '关闭设置', exact: true })
  const box = await close.boundingBox()
  expect(box!.y).toBeGreaterThanOrEqual(40)
  await close.click()
  await expect(page.getByText('阅读设置', { exact: true })).toBeHidden()

  await page.getByRole('button', { name: '夜间模式', exact: true }).click()
  await expect(page.locator('.reader-immersive')).toHaveCSS('background-color', 'rgb(21, 25, 34)')
  // App service 没有 document；移除 H5 根节点的主题变量，验证页面仍有独立的响应式颜色。
  await page.evaluate(() => document.documentElement.removeAttribute('style'))
  await expect(page.locator('.reader-immersive')).toHaveCSS('background-color', 'rgb(21, 25, 34)')
  await expect(page.locator('.cell-learning').first()).toHaveCSS('color', 'rgb(241, 244, 250)')
  await page.getByRole('button', { name: '日间模式', exact: true }).click()
  await expect(page.locator('.reader-immersive')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

test('reference text hides without moving manuscript cells, rows or pagination', async ({ page }) => {
  await openReader(page)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('.style-card').filter({ hasText: '方格稿纸' }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  const reference = page.locator('.ref-char').first()
  const cell = page.locator('.ref-cell').first()
  const beforeCell = await cell.boundingBox()
  const beforeTable = await page.locator('.reading-table-wrap').boundingBox()
  const rowCount = await page.locator('.reading-row').count()
  await page.getByRole('button', { name: '隐藏对照文字', exact: true }).click()
  await expect(reference).toBeHidden()
  await expect(cell).toBeVisible()
  expect(await cell.boundingBox()).toEqual(beforeCell)
  expect(await page.locator('.reading-table-wrap').boundingBox()).toEqual(beforeTable)
  expect(await page.locator('.reading-row').count()).toBe(rowCount)
  await expect(page.locator('.learn-char').first()).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '最近阅读入口，点击继续阅读' }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  await expect(page.locator('.ref-char').first()).toBeHidden()
  await page.locator('.reader-file-name').click()
  await page.getByRole('button', { name: '显示对照文字', exact: true }).click()
  await expect(page.locator('.ref-char').first()).toBeVisible()
})

test('bottom menu opens smooth automatic paging with pause, resume and stop', async ({ page }) => {
  await openReader(page)
  await page.getByRole('button', { name: '自动翻页', exact: true }).click()
  const panel = page.locator('.auto-page-control')
  await expect(panel).toBeVisible()
  const duration = panel.locator('input').last()
  await duration.fill('3')
  await duration.blur()
  await panel.getByRole('button', { name: '开始', exact: true }).click()
  const progress = page.locator('.reading-progress')
  await expect(progress).toBeVisible()
  const samples = await progress.evaluate(async (element) => {
    const values: number[] = []
    for (let index = 0; index < 12; index++) {
      await new Promise((resolve) => setTimeout(resolve, 35))
      values.push(new DOMMatrixReadOnly(getComputedStyle(element).transform).m22)
    }
    return values
  })
  expect(new Set(samples).size).toBeGreaterThanOrEqual(9)
  expect(samples.every((value, index) => index === 0 || value >= samples[index - 1]!)).toBe(true)
  await panel.getByRole('button', { name: '暂停', exact: true }).click()
  const paused = await progress.evaluate((element) => getComputedStyle(element).transform)
  await page.waitForTimeout(300)
  expect(await progress.evaluate((element) => getComputedStyle(element).transform)).toBe(paused)
  await panel.getByRole('button', { name: '继续', exact: true }).click()
  await expect.poll(() => page.locator('.reading-row').first().getAttribute('aria-rowindex'), { timeout: 5_000 }).not.toBe('1')
  await panel.getByRole('button', { name: '停止自动阅读', exact: true }).click()
  await expect(progress).toBeHidden()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.locator('.settings-drawer .auto-page-control')).toHaveCount(0)
})

for (const viewport of [{ width: 320, height: 690 }, { width: 1280, height: 800 }]) {
  test(`reading panels fit ${viewport.width}px viewport`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    await openReader(page)
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.screenshot({ path: testInfo.outputPath('settings.png') })
    await page.getByRole('button', { name: '关闭设置', exact: true }).click()
    await page.getByRole('button', { name: '夜间模式', exact: true }).click()
    await page.getByRole('button', { name: '自动翻页', exact: true }).click()
    await expect(page.locator('.auto-page-control')).toBeVisible()
    for (const selector of ['.auto-page-control', '.bottom-actions-row', '.duration-field']) {
      const box = await page.locator(selector).boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
      expect(box!.y).toBeGreaterThanOrEqual(30)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
    }
    await page.screenshot({ path: testInfo.outputPath('auto-night.png') })
    await page.getByRole('button', { name: '收起自动翻页', exact: true }).click()
    await expect(page.locator('.auto-page-control')).toBeHidden()
  })
}
