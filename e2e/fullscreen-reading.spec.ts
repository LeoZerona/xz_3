import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function openMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: '打开阅读菜单', exact: true }).click()
  await expect(page.locator('.reader-bottom-overlay')).toBeVisible()
}

async function closeMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: '收起阅读菜单', exact: true }).click()
  await expect(page.locator('.reader-bottom-overlay')).toHaveCount(0)
}

async function openFullscreenReader(page: Page, styleId = 'light-grid') {
  await page.goto('/#/pages/reading/index')
  await page.locator('.book-card').filter({ has: page.locator('[data-ext="txt"]') }).first().click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  await openMenu(page)
  if (styleId !== 'light-grid') {
    await page.getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: '表格样式', exact: true }).click()
    await page.locator('.style-card').filter({ has: page.locator(`[data-mini-style="${styleId}"]`) }).click()
    await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
    await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  }
  await page.getByRole('button', { name: '隐藏对照文字', exact: true }).click()
  await closeMenu(page)
  await expect(page.locator('.reading-status-bar')).toBeVisible()
}

async function visibleReferenceCount(page: Page): Promise<number> {
  return page.locator('.reference-char').evaluateAll((elements) => elements.filter((element) =>
    element.textContent?.trim() && getComputedStyle(element).visibility === 'visible').length)
}

async function firstRowCharacterCount(page: Page): Promise<number> {
  return page.locator('.reading-row').first().locator('.reference-char').evaluateAll((elements) =>
    elements.filter((element) => element.textContent?.trim()).length)
}

async function tapReadingArea(page: Page): Promise<void> {
  const stage = await page.locator('.reading-page-stage').boundingBox()
  await page.touchscreen.tap(stage!.x + stage!.width / 2, stage!.y + Math.min(stage!.height / 2, 80))
}

test('footer only shows page and battery in both reference states, and menu keeps reveal progress', async ({ page }) => {
  await openFullscreenReader(page)
  const status = page.locator('.reading-status-bar')
  await expect(status.locator('button, [role="button"]')).toHaveCount(0)
  await expect(page.locator('.reading-page-label')).toContainText('第 1 /')
  await expect(page.locator('.reading-battery')).toBeVisible()
  const before = await page.locator('.reading-table-wrap').boundingBox()
  await tapReadingArea(page)
  const firstRowCount = await firstRowCharacterCount(page)
  expect(await visibleReferenceCount(page)).toBe(firstRowCount)
  await expect(page.locator('.reader-bottom-overlay')).toHaveCount(0)
  await openMenu(page)
  await expect(page.locator('.reveal-progress')).toContainText(`已显示 ${firstRowCount} /`)
  await page.getByRole('button', { name: '逐字', exact: true }).click()
  await page.getByRole('button', { name: '显示下一个字', exact: true }).click()
  expect(await visibleReferenceCount(page)).toBe(firstRowCount + 1)
  await closeMenu(page)
  await tapReadingArea(page)
  expect(await visibleReferenceCount(page)).toBe(firstRowCount + 2)
  expect(await page.locator('.reading-table-wrap').boundingBox()).toEqual(before)
  await openMenu(page)
  await page.getByRole('button', { name: '重新隐藏', exact: true }).click()
  expect(await visibleReferenceCount(page)).toBe(0)
  await page.getByRole('button', { name: '显示对照文字', exact: true }).click()
  await closeMenu(page)
  await expect(page.locator('.reference-char.is-reference-char-hidden')).toHaveCount(0)
  await expect(status).toBeVisible()
  await expect(status.locator('button, [role="button"]')).toHaveCount(0)
  expect(await page.locator('.reading-table-wrap').boundingBox()).toEqual(before)
})

test('swiping changes pages without revealing an answer or opening menus', async ({ page }) => {
  await openFullscreenReader(page)
  await tapReadingArea(page)
  const firstRowIndex = await page.locator('.reading-row').first().getAttribute('aria-rowindex')
  const stage = await page.locator('.reading-page-stage').boundingBox()
  const client = await page.context().newCDPSession(page)
  const y = stage!.y + 80
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 220, y }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100, y }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.locator('#reading-scroll').dispatchEvent('click')
  await expect(page.locator('.reading-row').first()).not.toHaveAttribute('aria-rowindex', firstRowIndex!)
  await expect(page.locator('.reading-page-label')).toContainText('第 2 /')
  expect(await visibleReferenceCount(page)).toBe(0)
  await expect(page.locator('.reader-bottom-overlay')).toHaveCount(0)
  await tapReadingArea(page)
  expect(await visibleReferenceCount(page)).toBe(await firstRowCharacterCount(page))
  await client.detach()
})

test('long presses and cancelled touches do not reveal answers', async ({ page }) => {
  await openFullscreenReader(page)
  const stage = await page.locator('.reading-page-stage').boundingBox()
  const client = await page.context().newCDPSession(page)
  const point = { x: 5, y: stage!.y + 80 }
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await page.waitForTimeout(550)
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.locator('#reading-scroll').dispatchEvent('click')
  expect(await visibleReferenceCount(page)).toBe(0)
  await expect(page.locator('.reader-bottom-overlay')).toHaveCount(0)
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] })
  await page.locator('#reading-scroll').dispatchEvent('click')
  expect(await visibleReferenceCount(page)).toBe(0)
  await client.detach()
})

test('space reveals once, Escape toggles menus and arrow keys still turn pages', async ({ page }) => {
  await openFullscreenReader(page)
  await openMenu(page)
  await page.getByRole('button', { name: '逐字', exact: true }).click()
  await closeMenu(page)
  const reader = page.locator('.reading-page')
  await reader.focus()
  await page.keyboard.down('Space')
  expect(await visibleReferenceCount(page)).toBe(1)
  await page.keyboard.down('Space')
  expect(await visibleReferenceCount(page)).toBe(1)
  await page.keyboard.up('Space')
  await reader.press('Escape')
  await expect(page.locator('.reader-bottom-overlay')).toBeVisible()
  await page.getByRole('button', { name: '显示下一个字', exact: true }).press('Enter')
  expect(await visibleReferenceCount(page)).toBe(2)
  await reader.press('Escape')
  await expect(page.locator('.reader-bottom-overlay')).toHaveCount(0)
  await reader.press('ArrowRight')
  expect(await visibleReferenceCount(page)).toBe(0)
  await expect(page.locator('.reading-page-label')).toContainText('第 2 /')
})

test('finishing a page stays immersive and allows a new round from the menu', async ({ page }) => {
  await openFullscreenReader(page)
  const rowCount = await page.locator('.reading-row').count()
  for (let index = 0; index < rowCount; index += 1) await tapReadingArea(page)
  await expect(page.locator('.reference-char.is-reference-char-hidden')).toHaveCount(0)
  await tapReadingArea(page)
  await expect(page.locator('.reader-bottom-overlay')).toHaveCount(0)
  await openMenu(page)
  await expect(page.getByRole('button', { name: '显示下一行', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '重新隐藏', exact: true }).click()
  expect(await visibleReferenceCount(page)).toBe(0)
  await closeMenu(page)
})

test('compact status gives the page at least one more row than the former footer', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 690 })
  await openFullscreenReader(page)
  const compactRows = await page.locator('.reading-row').count()
  const oldLayout = await page.addStyleTag({ content: '.reader-content-inner { padding-bottom: calc(20px + env(safe-area-inset-bottom)) !important; gap: 8px !important; } .reading-status-bar { height: 44px !important; }' })
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  const oldRows = await page.locator('.reading-row').count()
  expect(compactRows).toBeGreaterThanOrEqual(oldRows + 1)
  await oldLayout.evaluate((element) => element.remove())
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  await expect(page.locator('.reading-row')).toHaveCount(compactRows)
})

test('battery shows real readings and updates both charge and charging state', async ({ page }) => {
  await page.addInitScript(() => {
    const battery = Object.assign(new EventTarget(), { level: 0.72, charging: false })
    Object.defineProperty(navigator, 'getBattery', { configurable: true, value: async () => battery })
    Object.assign(window, { testBattery: battery })
  })
  await openFullscreenReader(page)
  const battery = page.locator('.reading-battery')
  await expect(battery).toHaveAccessibleName('电量 72%')
  await expect(battery).toContainText('72%')
  await page.evaluate(() => {
    const source = (window as unknown as { testBattery: EventTarget & { level: number; charging: boolean } }).testBattery
    source.level = 0.18
    source.charging = true
    source.dispatchEvent(new Event('levelchange'))
    source.dispatchEvent(new Event('chargingchange'))
  })
  await expect(battery).toHaveAccessibleName('电量 18%，正在充电')
  await expect(battery.locator('.battery-charging')).toBeVisible()
})

for (const mode of ['unsupported', 'rejected']) {
  test(`battery has an honest fallback when ${mode}`, async ({ page }) => {
    await page.addInitScript((state) => {
      Object.defineProperty(navigator, 'getBattery', {
        configurable: true,
        value: state === 'unsupported' ? undefined : () => Promise.reject(new Error('blocked')),
      })
    }, mode)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await openFullscreenReader(page)
    await expect(page.locator('.battery-value')).toHaveText('--')
    await expect(page.locator('.reading-battery')).toHaveAccessibleName('当前设备不支持读取电量')
    await tapReadingArea(page)
    expect(await visibleReferenceCount(page)).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })
}

test('auto-reading actions live in the menu and remain available after hiding it', async ({ page }) => {
  await openFullscreenReader(page)
  await openMenu(page)
  await page.getByRole('button', { name: '显示对照文字', exact: true }).click()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '自动翻页', exact: true }).click()
  await page.locator('.auto-page-control').getByRole('button', { name: '开始', exact: true }).click()
  await page.getByRole('button', { name: '关闭设置', exact: true }).click()
  await expect(page.locator('.reader-bottom-overlay .auto-reading-actions')).toBeVisible()
  await closeMenu(page)
  await expect(page.locator('.auto-reading-actions')).toHaveCount(0)
  await expect(page.locator('.reading-status-bar')).toBeVisible()
  await openMenu(page)
  await page.getByRole('button', { name: '暂停自动阅读', exact: true }).click()
  await expect(page.getByRole('button', { name: '继续自动阅读', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '停止自动阅读', exact: true }).click()
  await expect(page.locator('.reading-progress')).toHaveCount(0)
})

for (const viewport of [{ width: 320, height: 568 }, { width: 320, height: 690 }, { width: 390, height: 844 }, { width: 740, height: 360 }, { width: 1280, height: 800 }]) {
  test(`status and every row fit ${viewport.width}x${viewport.height} viewport`, async ({ page }, testInfo) => {
    await openFullscreenReader(page, 'manuscript-grid')
    await page.setViewportSize(viewport)
    await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
    await tapReadingArea(page)
    const footer = await page.locator('.reading-status-bar').boundingBox()
    const stage = await page.locator('.reading-page-stage').boundingBox()
    const table = await page.locator('.reading-table-wrap').boundingBox()
    const lastRow = await page.locator('.reading-row').last().boundingBox()
    const battery = await page.locator('.reading-battery').boundingBox()
    expect(footer!.height).toBe(18)
    expect(table!.y + table!.height).toBeLessThanOrEqual(stage!.y + stage!.height + 1)
    expect(lastRow!.y + lastRow!.height).toBeLessThanOrEqual(footer!.y)
    expect(stage!.y + stage!.height).toBeLessThanOrEqual(footer!.y)
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(viewport.height)
    expect(battery!.x + battery!.width).toBeCloseTo(footer!.x + footer!.width, 0)
    await expect(page.locator('.reader-top-overlay, .reader-bottom-overlay')).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath('fullscreen-reading.png') })
    await openMenu(page)
    await page.getByRole('button', { name: '夜间模式', exact: true }).click()
    await closeMenu(page)
    expect(await page.locator('.reading-table-wrap').boundingBox()).toEqual(table)
    await expect(page.locator('.reading-battery')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('fullscreen-reading-night.png') })
  })
}
