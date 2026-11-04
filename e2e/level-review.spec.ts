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

test('作答后展示当前字详情，手动下一字后按到期顺序前进并恢复位置', async ({ page }) => {
  await seedReview(page)
  await expect(page.locator('.review-glyph')).toHaveText('一')
  await expect(page.locator('.review-actions').getByRole('button')).toHaveCount(2)
  await expect(page.locator('.review-total')).toHaveText('3 字')
  await expect(page.locator('.review-glyph')).toHaveCSS('font-family', /builtin-/)
  await page.getByRole('button', { name: '认识', exact: true }).click()
  await expect(page.getByRole('region', { name: '本字详情' })).toBeVisible()
  await expect(page.locator('.review-answer-panel .definition')).not.toBeEmpty()
  await expect(page.locator('.review-answer-panel .is-reference .font-character')).toHaveText('一')
  await expect(page.locator('.review-feedback')).toHaveText('已选择：认识')
  await page.getByRole('button', { name: '下一字', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('乙')
  await page.reload()
  await expect(page.locator('.review-glyph')).toHaveText('乙')
  await page.getByRole('button', { name: '不认识', exact: true }).click()
  await expect(page.locator('.review-feedback')).toHaveText('已选择：不认识')
  await expect(page.getByRole('region', { name: '本字详情' })).toContainText('乙')
  await page.getByRole('button', { name: '下一字', exact: true }).click()
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
  await page.getByRole('button', { name: '下一字', exact: true }).click()
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
  await expect(page.locator('.review-answer-panel')).toBeVisible()
  await page.getByRole('button', { name: '下一字', exact: true }).click()
  await expect(page.getByText('本轮复习完成', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '提前复习全部 2 字' }).click()
  await expect(page.locator('.review-glyph')).toBeVisible()
})

test('在另一范围答过的字，不因旧当前位置在切回后重复出现', async ({ page }) => {
  await seedReview(page)
  await expect(page.locator('.review-glyph')).toHaveText('一')
  await page.getByRole('tab', { name: '收藏列表', exact: true }).click()
  await page.getByRole('button', { name: '认识', exact: true }).click()
  await page.getByRole('button', { name: '下一字', exact: true }).click()
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
    await page.getByRole('button', { name: '认识', exact: true }).click()
    await expect(page.getByRole('region', { name: '本字详情' })).toBeInViewport()
    await expect(page.getByRole('button', { name: '下一字', exact: true })).toBeInViewport()
    await expect(page.getByRole('button', { name: '记错了，改为不认识' })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.screenshot({ path: test.info().outputPath(`review-details-${width}.png`) })
    const details = page.getByRole('region', { name: '本字详情' })
    await details.focus()
    await page.keyboard.press('End')
    await expect(page.locator('.review-answer-panel .translation')).toBeInViewport()
    await expect(page.getByRole('button', { name: '下一字', exact: true })).toBeInViewport()
  })
}

test('详情中可反复更正，保留当前字且只记一次复习，下一字恢复辨认状态', async ({ page }) => {
  await seedReview(page)
  await page.getByRole('button', { name: '认识', exact: true }).click()
  await page.getByRole('button', { name: '记错了，改为不认识' }).click()
  await expect(page.locator('.review-feedback')).toHaveText('已选择：不认识')
  await expect.poll(async () => (await databaseRows(page, 'level_review')).find(row => row.id === 'char-0001')).toMatchObject({ reviewCount: 1, forgottenCount: 1, step: 0 })
  await page.getByRole('button', { name: '记错了，改为认识', exact: true }).click()
  await expect(page.locator('.review-feedback')).toHaveText('已选择：认识')
  await expect.poll(async () => (await databaseRows(page, 'level_review')).find(row => row.id === 'char-0001')).toMatchObject({ reviewCount: 1, forgottenCount: 0, step: 1 })
  expect((await databaseRows(page, 'activity_events')).filter(row => row.kind === 'answer')).toMatchObject([{ characterId: 'char-0001', correct: 1 }])
  await page.getByRole('button', { name: '下一字', exact: true }).click()
  await expect(page.locator('.review-glyph')).toHaveText('乙')
  await expect(page.locator('.review-answer-panel')).toHaveCount(0)
})

test('提前复习每字只出现一次，最后一字先核对详情再完成', async ({ page }) => {
  await seedReview(page)
  for (const glyph of ['一', '乙', '二']) {
    await expect(page.locator('.review-glyph')).toHaveText(glyph)
    await page.getByRole('button', { name: '认识', exact: true }).click()
    await page.getByRole('button', { name: '下一字', exact: true }).click()
  }
  await expect(page.getByText('本轮复习完成', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '提前复习全部 3 字' }).click()
  const seen = new Set<string>()
  for (let index = 0; index < 3; index++) {
    const glyph = await page.locator('.review-glyph').innerText()
    expect(seen.has(glyph)).toBe(false)
    seen.add(glyph)
    const unknown = page.getByRole('button', { name: '不认识', exact: true })
    await unknown.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.review-feedback')).toHaveText('已选择：不认识')
    const correction = page.getByRole('button', { name: '记错了，改为认识', exact: true })
    await correction.focus()
    await page.keyboard.press('Space')
    await expect(page.locator('.review-feedback')).toHaveText('已选择：认识')
    await expect(page.getByText('本轮复习完成', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '下一字', exact: true }).click()
  }
  await expect(page.getByText('本轮复习完成', { exact: true })).toBeVisible()
  expect((await databaseRows(page, 'level_review')).every(row => row.reviewCount === 2 && row.forgottenCount === 0)).toBe(true)
})

test('学习首页只保留开始学习，点击后进入今日学习预览', async ({ page }) => {
  await page.goto('/#/pages/index/index')
  const actions = page.locator('.plan-actions')
  await expect(actions.getByRole('button', { name: '开始学习', exact: true })).toBeVisible()
  await expect(page.locator('.database-overlay')).toHaveCount(0)
  await expect(actions.getByRole('button')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '关卡复习', exact: true })).toHaveCount(0)
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    await expect(actions.getByRole('button', { name: '开始学习', exact: true })).toBeInViewport()
    const actionBounds = await actions.boundingBox()
    const buttonBounds = await actions.getByRole('button').boundingBox()
    expect(buttonBounds?.width).toBe(actionBounds?.width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.screenshot({ path: test.info().outputPath(`study-home-${width}.png`), scale: 'css' })
  }
  await actions.getByRole('button', { name: '开始学习', exact: true }).click()
  await expect(page).toHaveURL(/pages\/study-preview\/index/)
  await expect(page.getByRole('button', { name: '开始今日学习', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '关卡复习', exact: true })).toHaveCount(0)
})

test('关卡目录顶部可进入复习并返回，关卡预览保留开始学习', async ({ page }) => {
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await expect(page.getByRole('button', { name: '关卡复习', exact: true })).toBeVisible()
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    await expect(page.locator('.stage-card').first()).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.screenshot({ path: test.info().outputPath(`level-directory-${width}.png`), scale: 'css' })
  }
  await page.getByRole('button', { name: '关卡复习', exact: true }).click()
  await expect(page).toHaveURL(/pages\/level-review\/index/)
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await page.locator('.stage-card').first().click()
  await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始学习', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '关卡复习', exact: true })).toHaveCount(0)
})

test('关卡学习和复习中心提供复习入口，个人页旧入口移除，空字表显示学习入口', async ({ page }) => {
  await page.goto('/#/pages/profile/index')
  await expect(page.locator('.menu-area')).toBeVisible()
  await expect(page.getByRole('button', { name: '关卡复习', exact: true })).toHaveCount(0)
  for (const url of ['/#/pages/levels/index', '/#/pages/review-center/index']) {
    await page.goto(url)
    await page.getByRole('button', { name: /^关卡复习(?: · 0)?$/ }).click()
    await expect(page).toHaveURL(/pages\/level-review\/index/)
    await expect(page.getByText('这里还没有文字', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '返回学习' })).toBeVisible()
  }
})
