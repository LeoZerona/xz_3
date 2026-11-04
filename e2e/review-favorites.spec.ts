import { expect, test } from '@playwright/test'
import { databaseRows, replaceDatabaseRows } from './databaseHelpers'
import { createReviewRecord } from '../src/study/levelReview'

for (const scenario of [
  { route: 'level-review', answerLabel: '认识', width: 320, height: 568 },
  { route: 'review-center', answerLabel: '已经认识', width: 390, height: 844 },
]) {
  test(`${scenario.route} 基本释义外部右上方收藏可切换、同步并持久化`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: scenario.height })
    await page.goto(`/#/pages/${scenario.route}/index`)
    await expect(page.locator('.database-overlay')).toHaveCount(0)
    await expect(page.getByText('这里还没有文字', { exact: true }).or(page.getByText('每日课程暂无到期文字。', { exact: false }))).toBeVisible()
    await replaceDatabaseRows(page, 'level_review', ['char-0001', 'char-0002'].map(id => ({
      id, ...createReviewRecord('2026-01-01T00:00:00Z'),
    })))
    await replaceDatabaseRows(page, 'character_progress', ['char-0001', 'char-0002'].map(id => ({
      id, status: 'learning', firstStartedAt: null, lastStudiedAt: null, completedAt: null,
      favorite: 1, excluded: 0, favoriteChangedAt: null, excludedChangedAt: null,
    })))
    await replaceDatabaseRows(page, 'settings', [{
      id: 'font-learning-review-sources',
      value: JSON.stringify({ 'char-0001': ['daily', 'level'], 'char-0002': ['daily', 'level'] }),
    }])
    await page.reload()
    if (scenario.route === 'level-review') await page.getByRole('tab', { name: '收藏列表', exact: true }).click()
    await page.getByRole('button', { name: scenario.answerLabel, exact: true }).click()
    const card = page.locator('.review-answer-panel .info-card').first()
    const favorite = page.locator('.review-answer-panel .character-favorite-button')
    await expect(favorite).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 })
    await favorite.scrollIntoViewIfNeeded()
    const cardBounds = (await card.boundingBox())!
    const buttonBounds = (await favorite.boundingBox())!
    expect(Math.abs(buttonBounds.x + buttonBounds.width - cardBounds.x - cardBounds.width)).toBeLessThanOrEqual(1)
    expect(buttonBounds.y + buttonBounds.height).toBeLessThanOrEqual(cardBounds.y)
    await favorite.click()
    await expect(favorite).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('.review-feedback')).toHaveText('已选择：认识')
    await expect(page.locator('.review-answer-panel .font-character').first()).toHaveText('一')
    await expect.poll(async () => (await databaseRows(page, 'character_progress')).find(row => row.id === 'char-0001')?.favorite).toBe(0)
    await favorite.focus()
    await favorite.press('Space')
    await expect(favorite).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await databaseRows(page, 'character_progress')).find(row => row.id === 'char-0001')?.favorite).toBe(1)
    expect((await databaseRows(page, 'level_review')).find(row => row.id === 'char-0001')?.reviewCount).toBe(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`${scenario.route}-favorite.png`), scale: 'css' })
    await page.getByRole('button', { name: '下一字', exact: true }).click()
    await expect(page.locator(scenario.route === 'level-review' ? '.review-glyph' : '.daily-review-glyph')).toHaveText('乙')
    await page.goto('/#/pages/character-detail/index?id=char-0001')
    const detailFavorite = page.locator('.detail-content .character-favorite-button')
    await expect(detailFavorite).toHaveAttribute('aria-pressed', 'true')
    await detailFavorite.focus()
    await detailFavorite.press('Enter')
    await expect(detailFavorite).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(async () => (await databaseRows(page, 'character_progress')).find(row => row.id === 'char-0001')?.favorite).toBe(0)
    await page.reload()
    await expect(detailFavorite).toHaveAttribute('aria-pressed', 'false')
  })
}
