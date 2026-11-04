import { expect, test } from '@playwright/test'
import { LAST_LEVEL_STUDY_KEY } from '../src/study/levelActivity'
import { LEVEL_LAYOUTS, LEVEL_LAYOUT_STORAGE_KEY } from '../src/study/levelLayouts'
import { replaceDatabaseRows } from './databaseHelpers'

test('进入关卡学习默认一级汉字，最近选择可跨分类定位，预览返回保留当前分类', async ({ page }) => {
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await replaceDatabaseRows(page, 'settings', [{
    id: LAST_LEVEL_STUDY_KEY,
    value: JSON.stringify({ category: 'level2', stageId: 'level2-stage-01', index: 1, title: '关卡 01', studiedAt: '2026-11-03T01:00:00Z' }),
  }])
  await page.reload()
  await expect(page.locator('.last-study-title')).toHaveText('二级汉字 · 关卡 01')
  await expect(page.getByRole('tab', { name: '一级汉字', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: '回到上次选择的二级汉字关卡 01' }).click()
  await expect(page.getByRole('tab', { name: '二级汉字', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.locator('.load-more-stages').click()
  await expect(page.locator('.stage-card')).toHaveCount(48)
  const scroller = page.locator('.levels-scroll .uni-scroll-view').last()
  const scrollTop = await scroller.evaluate(element => { element.scrollTop = 260; return element.scrollTop })
  expect(scrollTop).toBeGreaterThan(0)
  const review = page.getByRole('button', { name: '关卡复习', exact: true })
  await review.focus()
  await review.press('Space')
  await expect(page).toHaveURL(/pages\/level-review\/index/)
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.getByRole('tab', { name: '二级汉字', exact: true })).toHaveAttribute('aria-selected', 'true', { timeout: 5000 })
  await expect(page.locator('.stage-card')).toHaveCount(48)
  expect(await scroller.evaluate(element => element.scrollTop)).toBe(scrollTop)
  await page.locator('#stage-level2-stage-01').click()
  await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.getByRole('tab', { name: '二级汉字', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '我', exact: true }).click()
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '关卡学习', exact: true }).click()
  await expect(page.getByRole('tab', { name: '一级汉字', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.last-study-title')).toHaveText('二级汉字 · 关卡 01')
})

for (const layout of LEVEL_LAYOUTS) {
  test(`${layout.name}固定显示进度、复习入口和最近选择，可从进度右侧进入复习`, async ({ page }) => {
    await page.goto('/#/pages/levels/index')
    await expect(page.locator('.stage-card')).toHaveCount(24)
    await replaceDatabaseRows(page, 'stage_progress', [{ id: 'level1-stage-01', completed: 1, updatedAt: '2026-11-03T01:00:00Z' }])
    await replaceDatabaseRows(page, 'settings', [
      { id: LAST_LEVEL_STUDY_KEY, value: JSON.stringify({ category: 'level1', stageId: 'level1-stage-05', index: 5, title: '关卡 05', studiedAt: '2026-11-03T01:00:00Z' }) },
      { id: LEVEL_LAYOUT_STORAGE_KEY, value: JSON.stringify(layout.id) },
    ])
    await page.reload()
    await expect(page.locator('.levels-page')).toHaveAttribute('data-level-layout', layout.id)
    await expect(page.locator('.database-overlay')).toHaveCount(0)
    const overview = page.locator('.level-overview')
    const progress = page.getByRole('progressbar', { name: '一级汉字已完成关卡' })
    const caption = page.locator('.overview-caption')
    const recent = page.locator('.last-study-bar')
    const review = page.getByRole('button', { name: '关卡复习', exact: true })
    await expect(caption).toHaveText('已完成 1 / 351 关')
    await expect(progress).toHaveAttribute('aria-valuenow', '1')
    await expect(progress).toHaveAttribute('aria-valuemax', '351')
    await expect(overview).toHaveText('已完成 1 / 351 关')
    await expect(recent).toContainText('最近选择')
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
      await expect(overview).toBeInViewport()
      await expect(recent).toBeInViewport()
      await expect(review).toBeInViewport()
      const overviewBefore = (await overview.boundingBox())!
      const recentBefore = (await recent.boundingBox())!
      const reviewBefore = (await review.boundingBox())!
      const progressBounds = (await progress.boundingBox())!
      const captionBounds = (await caption.boundingBox())!
      expect(overviewBefore.y + overviewBefore.height).toBeLessThanOrEqual(recentBefore.y)
      expect(overviewBefore.x + overviewBefore.width).toBeLessThanOrEqual(reviewBefore.x)
      expect(Math.abs(overviewBefore.y + overviewBefore.height / 2 - reviewBefore.y - reviewBefore.height / 2)).toBeLessThanOrEqual(1)
      expect(progressBounds.width).toBeGreaterThan(0)
      expect(reviewBefore.height).toBeGreaterThanOrEqual(44)
      expect(Math.abs(progressBounds.y + progressBounds.height / 2 - captionBounds.y - captionBounds.height / 2)).toBeLessThanOrEqual(1)
      expect(progressBounds.x + progressBounds.width).toBeLessThanOrEqual(captionBounds.x)
      const scroller = page.locator('.levels-scroll .uni-scroll-view').last()
      await scroller.evaluate((element) => { element.scrollTop = 260 })
      expect(await overview.boundingBox()).toEqual(overviewBefore)
      expect(await recent.boundingBox()).toEqual(recentBefore)
      expect(await review.boundingBox()).toEqual(reviewBefore)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await scroller.evaluate((element) => { element.scrollTop = 0 })
      await page.screenshot({ path: test.info().outputPath(`${layout.id}-header-${width}.png`), scale: 'css' })
    }
    await review.focus()
    await review.press('Enter')
    await expect(page).toHaveURL(/pages\/level-review\/index/)
    await page.getByRole('button', { name: '返回', exact: true }).click()
    await expect(page.locator('.levels-page')).toHaveAttribute('data-level-layout', layout.id)
    await expect(caption).toHaveText('已完成 1 / 351 关')
  })
}
