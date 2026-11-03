import { expect, test, type Page } from '@playwright/test'
import { databaseRows, replaceDatabaseRows } from './databaseHelpers'
import { createReviewRecord, REVIEW_SESSION_KEY } from '../src/study/levelReview'

const reviewUrl = '/#/pages/level-review/index'
async function seedReview(page: Page): Promise<void> {
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.levels-page')).toBeVisible()
  await expect(page.locator('.database-overlay')).toHaveCount(0, { timeout: 30000 })
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await replaceDatabaseRows(page, 'level_review', [
    { id: 'char-0001', ...createReviewRecord('2026-01-01T00:00:00.000Z') },
    { id: 'char-0002', ...createReviewRecord('2026-01-02T00:00:00.000Z') },
    { id: 'char-0003', ...createReviewRecord('2026-01-03T00:00:00.000Z') },
  ])
  const progress = (id: string, favorite: number, excluded: number) => ({ id, status: 'learning', firstStartedAt: null, lastStudiedAt: null, completedAt: null, favorite, excluded, favoriteChangedAt: null, excludedChangedAt: null })
  await replaceDatabaseRows(page, 'character_progress', [progress('char-0001', 1, 0), progress('char-0002', 0, 1), progress('char-0003', 1, 0)])
  await page.goto(reviewUrl)
  await page.reload()
}

test('复习只呈现学习字形和两个答案操作，按到期顺序前进并恢复当前位置', async ({ page }) => {
  await seedReview(page)
  await expect(page.locator('.review-glyph')).toHaveText('一')
  await expect(page.locator('.review-actions').getByRole('button')).toHaveCount(2)
  await expect(page.locator('.review-total')).toHaveText('3 字')
  await expect(page.locator('.review-glyph')).toHaveCSS('font-family', /builtin-/)
  await page.getByRole('button', { name: '认识', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('乙')
  await page.reload()
  await expect(page.locator('.review-glyph')).toHaveText('乙')
  await page.getByRole('button', { name: '不认识', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('二')
  const records = await databaseRows(page, 'level_review')
  expect(records.find((row) => row.id === 'char-0001')).toMatchObject({ step: 1, reviewCount: 1 })
  expect(records.find((row) => row.id === 'char-0002')).toMatchObject({ step: 0, reviewCount: 1, forgottenCount: 1 })
  const reopened = await page.context().newPage()
  await reopened.goto(reviewUrl)
  await expect(reopened.locator('.review-glyph')).toHaveText('二')
})

test('斩列表和收藏列表只筛选关卡已学文字，各自保存位置，空状态可恢复', async ({ page }) => {
  await seedReview(page)
  await page.getByRole('tab', { name: '斩列表', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('乙')
  await expect(page.locator('.review-total')).toHaveText('1 字')
  await page.getByRole('tab', { name: '收藏列表', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('一')
  await page.getByRole('button', { name: '认识', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('二')
  await page.getByRole('tab', { name: '斩列表', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('乙')
  await page.getByRole('tab', { name: '收藏列表', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('二')
  await page.reload()
  await expect(page.getByRole('tab', { name: '收藏列表', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.review-glyph')).toHaveText('二')
  const session = (await databaseRows(page, 'settings')).find((row) => row.id === REVIEW_SESSION_KEY)
  expect(JSON.parse(String(session?.value))).toMatchObject({ filter: 'favorites', currentIds: { slashed: 'char-0002', favorites: 'char-0003' } })
  await page.getByRole('button', { name: '认识', exact: true }).click()
  await expect(page.getByText('本轮复习完成', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '提前复习全部 2 字' }).click()
  await expect(page.locator('.review-glyph')).toBeVisible()
})

test('在另一范围答过的字，不因旧当前位置在切回后重复出现', async ({ page }) => {
  await seedReview(page)
  await expect(page.locator('.review-glyph')).toHaveText('一')
  await page.getByRole('tab', { name: '收藏列表', exact: true }).click()
  await page.getByRole('button', { name: '认识', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('二')
  await page.getByRole('tab', { name: '全部', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('乙')
})

for (const width of [320, 390, 768, 1440]) {
  test(`复习页在 ${width}px 无溢出，字形与两个按钮在首屏`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    await seedReview(page)
    await expect(page.locator('.review-glyph')).toBeInViewport()
    await expect(page.getByRole('button', { name: '认识', exact: true })).toBeInViewport()
    await expect(page.getByRole('button', { name: '不认识', exact: true })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.screenshot({ path: test.info().outputPath(`review-${width}.png`) })
  })
}

test('首页、关卡页和个人页可以进入复习，空字表显示学习入口', async ({ page }) => {
  for (const url of ['/#/pages/index/index', '/#/pages/levels/index', '/#/pages/profile/index']) {
    await page.goto(url)
    await page.getByRole('button', { name: '关卡复习', exact: true }).click()
    await expect(page).toHaveURL(/pages\/level-review\/index/)
    await expect(page.getByText('这里还没有文字', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '返回学习' })).toBeVisible()
  }
})
