import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('reading:customBooks')) return
    const books = ['甲', '乙'].map((name, index) => ({
      id: `position-book-${index}`,
      name: `${name}书进度测试`,
      fileName: `${name}书进度测试.${index === 0 ? 'txt' : 'pdf'}`,
      ext: index === 0 ? 'txt' : 'pdf',
      source: 'custom',
      url: '',
      createdAt: index,
      text: Array.from({ length: 240 }, (_, row) => `${name}${String(row).padStart(3, '0')}天地玄黄宇宙洪荒`).join('\n'),
    }))
    const store = (key: string, data: unknown) => localStorage.setItem(key, JSON.stringify({ type: 'object', data }))
    store('reading:customBooks', books)
    store('reading:progress', {
      bookId: books[0]!.id, page: 1, rowsPerPage: 10, tableStyleId: 'light-grid', updatedAt: '2026-10-29T00:00:00.000Z',
    })
  })
})

async function openBook(page: Page, name = '甲'): Promise<void> {
  await page.getByRole('tab', { name: /我的上传/ }).click()
  await page.getByRole('button', { name: `${name}书进度测试`, exact: true }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
}

async function turnPages(page: Page, count: number): Promise<void> {
  const reader = page.locator('.reading-page')
  await reader.focus()
  for (let index = 0; index < Math.abs(count); index++) {
    await reader.press(count > 0 ? 'ArrowRight' : 'ArrowLeft')
  }
}

async function exitReader(page: Page): Promise<void> {
  await page.getByRole('button', { name: '打开阅读菜单', exact: true }).click()
  await page.getByRole('button', { name: '返回书库', exact: true }).click()
}

async function visiblePosition(page: Page) {
  return {
    label: await page.locator('.reading-page-label').textContent(),
    rows: await page.locator('.reading-row').allTextContents(),
  }
}

async function swipe(page: Page, direction: 'next' | 'previous'): Promise<void> {
  const stage = await page.locator('.reading-page-stage').boundingBox()
  const client = await page.context().newCDPSession(page)
  const startX = direction === 'next' ? 300 : 80
  const endX = direction === 'next' ? 80 : 300
  const y = stage!.y + 80
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: endX, y }] })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await client.detach()
}

test('refresh restores the exact page and both directions remain adjacent', async ({ page }) => {
  await page.goto('/#/pages/reading/index')
  await openBook(page)
  await turnPages(page, 12)
  const saved = await visiblePosition(page)
  await page.reload()
  await page.getByRole('button', { name: '最近阅读入口，点击继续阅读' }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visiblePosition(page)).toEqual(saved)
  const lastIndex = Number(await page.locator('.reading-row').last().getAttribute('aria-rowindex'))
  await swipe(page, 'next')
  await expect(page.locator('.reading-row').first()).toHaveAttribute('aria-rowindex', String(lastIndex + 1))
  await swipe(page, 'previous')
  expect(await visiblePosition(page)).toEqual(saved)
})

test('each TXT and PDF book keeps its own page after switching and restarting', async ({ page }) => {
  await page.goto('/#/pages/reading/index')
  await openBook(page)
  await turnPages(page, 3)
  const firstBook = await visiblePosition(page)
  await exitReader(page)
  await openBook(page, '乙')
  await turnPages(page, 2)
  const secondBook = await visiblePosition(page)
  await exitReader(page)
  await openBook(page)
  expect(await visiblePosition(page)).toEqual(firstBook)
  await page.reload()
  await openBook(page, '乙')
  expect(await visiblePosition(page)).toEqual(secondBook)
})

test('rotation and restarting in a different viewport preserve the original content anchor', async ({ page }) => {
  await page.goto('/#/pages/reading/index')
  await openBook(page)
  await turnPages(page, 12)
  const original = await visiblePosition(page)
  const anchorRow = Number(await page.locator('.reading-row').first().getAttribute('aria-rowindex'))
  const portrait = page.viewportSize()!
  await page.setViewportSize({ width: 740, height: 360 })
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  const landscape = await visiblePosition(page)
  expect(Number(await page.locator('.reading-row').first().getAttribute('aria-rowindex'))).toBeLessThanOrEqual(anchorRow)
  expect(Number(await page.locator('.reading-row').last().getAttribute('aria-rowindex'))).toBeGreaterThanOrEqual(anchorRow)
  await page.reload()
  await page.getByRole('button', { name: '最近阅读入口，点击继续阅读' }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visiblePosition(page)).toEqual(landscape)
  await page.setViewportSize(portrait)
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visiblePosition(page)).toEqual(original)
})

test('changing page style and characters per line does not drift the position or break reopening', async ({ page }) => {
  await page.goto('/#/pages/reading/index')
  await openBook(page)
  await turnPages(page, 12)
  const original = await visiblePosition(page)
  await page.getByRole('button', { name: '打开阅读菜单', exact: true }).click()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '表格样式', exact: true }).click()
  await page.locator('.style-card').filter({ has: page.locator('[data-mini-style="manuscript-line"]') }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  await page.locator('.style-card').filter({ has: page.locator('[data-mini-style="light-grid"]') }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visiblePosition(page)).toEqual(original)
  await page.getByRole('button', { name: '每行字数', exact: true }).click()
  await page.getByRole('radio', { name: '10字', exact: true }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  const reparsed = await visiblePosition(page)
  await page.reload()
  await page.getByRole('button', { name: '最近阅读入口，点击继续阅读' }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visiblePosition(page)).toEqual(reparsed)
  await turnPages(page, 1)
  await turnPages(page, -1)
  expect(await visiblePosition(page)).toEqual(reparsed)
})

test('a failed load keeps the saved page and retry restores it', async ({ page }) => {
  await page.goto('/#/pages/reading/index')
  await openBook(page)
  await turnPages(page, 12)
  const original = await visiblePosition(page)
  const originalBooks = await page.evaluate(() => {
    const original = localStorage.getItem('reading:customBooks')!
    const stored = JSON.parse(original)
    stored.data[0].text = ''
    localStorage.setItem('reading:customBooks', JSON.stringify(stored))
    return original
  })
  await page.reload()
  // 刷新离开阅读器时会正常保存一次；从本次加载开始比较，包含更新时间。
  const saved = await page.evaluate(() => localStorage.getItem('reading:progress'))
  await page.getByRole('button', { name: '最近阅读入口，点击继续阅读' }).click()
  await expect(page.locator('.state-card--error')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('reading:progress'))).toBe(saved)
  await page.evaluate((books) => localStorage.setItem('reading:customBooks', books), originalBooks)
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visiblePosition(page)).toEqual(original)
})

test('an older saved page migrates after measuring the actual page capacity', async ({ page }) => {
  await page.goto('/#/pages/reading/index')
  await expect(page.locator('.library-view')).toBeVisible()
  await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('reading:progress')!)
    stored.data.page = 13
    localStorage.setItem('reading:progress', JSON.stringify(stored))
  })
  await openBook(page)
  await expect(page.locator('.reading-page-label')).toContainText('第 13 /')
  const capacity = await page.locator('.reading-row').count()
  await expect(page.locator('.reading-row').first()).toHaveAttribute('aria-rowindex', String(12 * capacity + 1))
  const migrated = await visiblePosition(page)
  await page.reload()
  await page.getByRole('button', { name: '最近阅读入口，点击继续阅读' }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  expect(await visiblePosition(page)).toEqual(migrated)
})

test('a late load from another book cannot replace the current book or its progress', async ({ page }) => {
  let releaseLoad: () => void = () => {}
  let notifyStarted: () => void = () => {}
  const released = new Promise<void>((resolve) => { releaseLoad = resolve })
  const started = new Promise<void>((resolve) => { notifyStarted = resolve })
  await page.route(/\/static\/books\/.*\.txt(?:\?.*)?$/, async (route) => {
    if (route.request().resourceType() !== 'fetch') {
      await route.continue()
      return
    }
    notifyStarted()
    await released
    await route.fulfill({ status: 200, contentType: 'text/plain', body: '这是延迟加载的另一本书籍内容。' })
  })
  try {
    await page.goto('/#/pages/reading/index')
    await page.locator('.book-card').filter({ has: page.locator('[data-ext="txt"]') }).first().click()
    await started
    await expect(page.locator('.state-card')).toContainText('正在加载书籍')
    await exitReader(page)
    await openBook(page)
    await turnPages(page, 3)
    const original = await visiblePosition(page)
    const saved = await page.evaluate(() => localStorage.getItem('reading:progress'))
    const response = page.waitForResponse((item) => item.request().resourceType() === 'fetch' && /\.txt(?:\?.*)?$/.test(item.url()))
    releaseLoad()
    await (await response).finished()
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect(await visiblePosition(page)).toEqual(original)
    expect(await page.evaluate(() => localStorage.getItem('reading:progress'))).toBe(saved)
  } finally {
    releaseLoad()
  }
})
