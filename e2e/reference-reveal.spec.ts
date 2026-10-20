import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { TABLE_STYLES } from '../src/reading/tableStyles'

async function openHiddenReader(page: Page, styleId = 'light-grid') {
  await page.goto('/#/pages/reading/index')
  await page.locator('.book-card').filter({ has: page.locator('[data-ext="txt"]') }).first().click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  await page.locator('.reader-file-name').click()
  if (styleId !== 'light-grid') {
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '表格样式', exact: true }).click()
    await page.locator('.style-card').filter({ has: page.locator(`[data-mini-style="${styleId}"]`) }).click()
    await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
    await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  }
  await page.getByRole('button', { name: '隐藏对照文字', exact: true }).click()
  await expect(page.getByRole('group', { name: '逐步显示对照文字', exact: true })).toBeVisible()
}

async function visibleReferenceCount(page: Page): Promise<number> {
  return page.locator('.reference-char').evaluateAll((elements) => elements.filter((element) =>
    element.textContent?.trim() && getComputedStyle(element).visibility === 'visible').length)
}

async function firstRowCharacterCount(page: Page): Promise<number> {
  return page.locator('.reading-row').first().locator('.reference-char').evaluateAll((elements) =>
    elements.filter((element) => element.textContent?.trim()).length)
}

for (const style of TABLE_STYLES) {
  test(`${style.id}: row and character reveal keep layout stable and other reference text hidden`, async ({ page }) => {
    await openHiddenReader(page, style.id)
    expect(await visibleReferenceCount(page)).toBe(0)
    const before = await page.locator('.reading-table-wrap').boundingBox()
    const firstRowCount = await firstRowCharacterCount(page)
    const rowCount = await page.locator('.reading-row').count()
    await page.getByRole('button', { name: '显示下一行', exact: true }).click()
    expect(await visibleReferenceCount(page)).toBe(firstRowCount)
    await expect(page.locator('.reading-row').nth(1).locator('.reference-char').first()).toBeHidden()
    await page.getByRole('button', { name: '逐字', exact: true }).click()
    expect(await visibleReferenceCount(page)).toBe(firstRowCount)
    await page.getByRole('button', { name: '显示下一个字', exact: true }).click()
    expect(await visibleReferenceCount(page)).toBe(firstRowCount + 1)
    expect(await page.locator('.reading-table-wrap').boundingBox()).toEqual(before)
    expect(await page.locator('.reading-row').count()).toBe(rowCount)
    await page.getByRole('button', { name: '重新隐藏', exact: true }).click()
    expect(await visibleReferenceCount(page)).toBe(0)
    await page.getByRole('button', { name: '显示对照文字', exact: true }).click()
    await expect(page.locator('.reference-char.is-reference-char-hidden')).toHaveCount(0)
    await expect(page.locator('.reference-reveal-control')).toHaveCount(0)
  })
}

test('reveals exactly one character per keyboard action and preserves progress when changing modes', async ({ page }) => {
  await openHiddenReader(page)
  await page.getByRole('button', { name: '逐字', exact: true }).press('Enter')
  await page.getByRole('button', { name: '显示下一个字', exact: true }).press('Enter')
  expect(await visibleReferenceCount(page)).toBe(1)
  await page.getByRole('button', { name: '显示下一个字', exact: true }).press('Space')
  expect(await visibleReferenceCount(page)).toBe(2)
  await page.getByRole('button', { name: '逐行', exact: true }).press('Space')
  expect(await visibleReferenceCount(page)).toBe(2)
  await page.getByRole('button', { name: '显示下一行', exact: true }).press('Enter')
  expect(await visibleReferenceCount(page)).toBe(await firstRowCharacterCount(page))
})

test('page changes and refresh reset revealed answers while retaining the preferred mode', async ({ page }) => {
  await openHiddenReader(page)
  await page.getByRole('button', { name: '逐字', exact: true }).click()
  await page.getByRole('button', { name: '显示下一个字', exact: true }).click()
  const firstRow = await page.locator('.reading-row').first().getAttribute('aria-rowindex')
  await page.getByRole('button', { name: '下一页', exact: true }).click()
  await expect(page.locator('.reading-row').first()).not.toHaveAttribute('aria-rowindex', firstRow!)
  expect(await visibleReferenceCount(page)).toBe(0)
  await page.getByRole('button', { name: '显示下一个字', exact: true }).click()
  expect(await visibleReferenceCount(page)).toBe(1)
  await page.getByRole('button', { name: '上一页', exact: true }).click()
  expect(await visibleReferenceCount(page)).toBe(0)
  await page.getByRole('button', { name: '显示下一个字', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '最近阅读入口，点击继续阅读' }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visibleReferenceCount(page)).toBe(0)
  await page.locator('.reader-file-name').click()
  await expect(page.getByRole('button', { name: '逐字', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('page completion disables further reveal and reset starts a new round', async ({ page }) => {
  await openHiddenReader(page)
  const rowCount = await page.locator('.reading-row').count()
  for (let index = 0; index < rowCount; index += 1) {
    await page.getByRole('button', { name: '显示下一行', exact: true }).click()
  }
  await expect(page.locator('.reveal-progress')).toContainText('本页已全部展示')
  await expect(page.getByRole('button', { name: '显示下一行', exact: true })).toBeDisabled()
  await expect(page.locator('.reference-char.is-reference-char-hidden')).toHaveCount(0)
  await page.getByRole('button', { name: '重新隐藏', exact: true }).click()
  expect(await visibleReferenceCount(page)).toBe(0)
  await expect(page.getByRole('button', { name: '显示下一行', exact: true })).toBeEnabled()
})

test('layout changes, re-entering the reader and changing books clear revealed answers', async ({ page }) => {
  await openHiddenReader(page)
  await page.getByRole('button', { name: '显示下一行', exact: true }).click()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '表格样式', exact: true }).click()
  await page.locator('.style-card').filter({ has: page.locator('[data-mini-style="manuscript-line"]') }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visibleReferenceCount(page)).toBe(0)
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  await page.getByRole('button', { name: '显示下一行', exact: true }).click()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '每行字数', exact: true }).click()
  await page.getByRole('radio', { name: '18字', exact: true }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visibleReferenceCount(page)).toBe(0)
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  await page.getByRole('button', { name: '显示下一行', exact: true }).click()
  await page.locator('.top-overlay-actions').getByRole('button', { name: '交换字体', exact: true }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visibleReferenceCount(page)).toBe(0)
  await page.getByRole('button', { name: '显示下一行', exact: true }).click()
  await page.getByRole('button', { name: '返回书库', exact: true }).click()
  await page.locator('.book-card').filter({ has: page.locator('[data-ext="txt"]') }).first().click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visibleReferenceCount(page)).toBe(0)
  await page.locator('.reader-file-name').click()
  await page.getByRole('button', { name: '显示下一行', exact: true }).click()
  await page.locator('.bottom-actions-row').getByRole('button', { name: '目录', exact: true }).click()
  await page.locator('.catalog-item').filter({ has: page.locator('.type-txt') }).nth(1).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visibleReferenceCount(page)).toBe(0)
})

test('revealing an answer pauses automatic paging', async ({ page }) => {
  await openHiddenReader(page)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '自动翻页', exact: true }).click()
  await page.getByRole('button', { name: '开始', exact: true }).click()
  await expect(page.locator('.reading-progress')).toBeVisible()
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  await page.getByRole('button', { name: '显示下一行', exact: true }).click()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '自动翻页', exact: true }).click()
  await expect(page.getByRole('button', { name: '继续', exact: true })).toBeVisible()
})

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 740, height: 360 }, { width: 1280, height: 800 }]) {
  test(`reveal controls fit ${viewport.width}x${viewport.height} and support night mode`, async ({ page }, testInfo) => {
    await openHiddenReader(page, 'manuscript-grid')
    await page.setViewportSize(viewport)
    await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
    await page.getByRole('button', { name: '夜间模式', exact: true }).click()
    await page.getByRole('button', { name: '逐字', exact: true }).click()
    await page.getByRole('button', { name: '显示下一个字', exact: true }).click()
    for (const selector of ['.reference-reveal-control', '.reveal-next', '.reveal-reset', '.reader-bottom-overlay']) {
      const box = await page.locator(selector).boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
      expect(box!.y).toBeGreaterThanOrEqual(30)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
    }
    const revealedCharacter = await page.locator('.reference-char').first().boundingBox()
    const topOverlay = await page.locator('.reader-top-overlay').boundingBox()
    const bottomOverlay = await page.locator('.reader-bottom-overlay').boundingBox()
    expect(revealedCharacter!.y).toBeGreaterThanOrEqual(topOverlay!.y + topOverlay!.height)
    expect(revealedCharacter!.y + revealedCharacter!.height).toBeLessThanOrEqual(bottomOverlay!.y)
    await page.screenshot({ path: testInfo.outputPath('reference-reveal-night.png') })
  })
}
