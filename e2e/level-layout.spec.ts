import { expect, test, type Page } from '@playwright/test'
import { LEVEL_LAYOUTS, LEVEL_LAYOUT_STORAGE_KEY, type LevelLayoutId } from '../src/study/levelLayouts'
import { themes } from '../src/theme/themes'
import { replaceDatabaseRows } from './databaseHelpers'
import { LAST_LEVEL_STUDY_KEY } from '../src/study/levelActivity'

async function chooseLayout(page: Page, id: LevelLayoutId): Promise<void> {
  await page.goto('/#/pages/level-layout/index')
  const name = LEVEL_LAYOUTS.find((item) => item.id === id)!.name
  const option = page.getByRole('radio', { name, exact: true })
  await expect(page.locator('.database-overlay')).toHaveCount(0, { timeout: 30000 })
  await expect(option).toHaveAttribute('aria-disabled', 'false')
  await option.click()
  await expect(option).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: '查看关卡学习' }).click()
  await expect(page.locator('.levels-page')).toHaveAttribute('data-level-layout', id)
}

test('默认保留当前卡片，从“我”菜单选布局并自动保存，返回与刷新后仍然生效', async ({ page }) => {
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.levels-page')).toHaveAttribute('data-level-layout', 'cards')
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '我', exact: true }).click()
  await page.getByRole('button', { name: '关卡布局', exact: true }).click()
  await expect(page.getByRole('radio', { name: '经典卡片', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio')).toHaveCount(4)
  await page.screenshot({ path: test.info().outputPath('chooser-390.png'), fullPage: true })
  await page.getByRole('radio', { name: '口袋闪卡' }).click()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.getByRole('button', { name: '关卡布局', exact: true })).toContainText('口袋闪卡')
  await page.getByRole('button', { name: '个人设置' }).click()
  await expect(page.getByRole('button', { name: '关卡布局', exact: true })).toContainText('口袋闪卡')
  await page.getByRole('button', { name: '关卡布局', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('radio', { name: '口袋闪卡' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: '查看关卡学习' }).click()
  await expect(page.locator('.flash-card')).toBeVisible()
  await page.reload()
  await expect(page.locator('.flash-glyphs > uni-text')).toHaveCount(10)
})

for (const width of [320, 390, 1440]) {
  for (const id of ['notebook', 'flashcards', 'board'] as const) {
    test(`${id} 在 ${width}px 可选关、滚动并进入原有学习流程`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
      await chooseLayout(page, id)
      let stageId = 'level1-stage-01'
      if (id === 'notebook') {
        await expect(page.locator('.notebook-lesson')).toHaveCount(23)
        await page.locator('.load-more-stages').click()
        await expect(page.locator('.notebook-lesson')).toHaveCount(47)
        await page.locator('.notebook-feature').scrollIntoViewIfNeeded()
      } else if (id === 'flashcards') {
        await expect(page.locator('.flash-glyphs > uni-text')).toHaveCount(10)
        await page.getByRole('button', { name: '下一关', exact: true }).click()
        await expect(page.locator('.flash-card h2')).toHaveText('关卡 02')
        await page.getByRole('button', { name: '选择关卡 03', exact: true }).click()
        await expect(page.locator('.flash-card h2')).toHaveText('关卡 03')
        stageId = 'level1-stage-03'
        await page.locator('.flash-card').scrollIntoViewIfNeeded()
      } else {
        await expect(page.locator('.board-tile')).toHaveCount(12)
        await page.getByRole('button', { name: /^选择关卡 02，/ }).click()
        await expect(page.locator('.dock-title')).toContainText('关卡 02')
        await page.getByRole('button', { name: '下一组关卡' }).click()
        await expect(page.locator('.board-tile').first()).toContainText('关卡 13')
        await page.getByRole('button', { name: '下一组关卡' }).click()
        await expect(page.locator('.board-tile').first()).toContainText('关卡 25')
        await expect(page.locator('.dock-title')).toContainText('关卡 25')
        await expect(page.locator('.board-dock')).toBeInViewport()
        stageId = 'level1-stage-25'
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await expect(page.getByRole('navigation', { name: '主导航' })).toBeInViewport()
      await page.screenshot({ path: test.info().outputPath(`${id}-${width}.png`) })
      const action = id === 'notebook' ? '.notebook-start' : id === 'flashcards' ? '.flash-start' : '.dock-start'
      await page.locator(action).click()
      await expect(page).toHaveURL(new RegExp('stageId=' + stageId))
      await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
    })
  }
}

test('四种布局共用已完成进度、进行中关卡，并可切换完整二级课程', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await replaceDatabaseRows(page, 'stage_progress', [{ id: 'level1-stage-01', completed: 1, updatedAt: '2026-11-01T01:00:00Z' }])
  await replaceDatabaseRows(page, 'stage_character_progress', [{ id: 'layout-progress', stageId: 'level1-stage-02', characterId: 'char-0011', position: 0 }])
  await replaceDatabaseRows(page, 'settings', [{ id: LAST_LEVEL_STUDY_KEY, value: JSON.stringify({ category: 'level1', stageId: 'level1-stage-02', index: 2, title: '关卡 02', studiedAt: '2026-11-01T01:00:00Z' }) }])
  await page.reload()
  for (const { id } of LEVEL_LAYOUTS) {
    await chooseLayout(page, id)
    await expect(page.locator('.overview-caption')).toHaveText('已完成 1 / 351 关')
    const action = id === 'cards' ? '.stage-card.is-current' : id === 'notebook' ? '.notebook-start' : id === 'flashcards' ? '.flash-start' : '.dock-start'
    await expect(page.locator(action)).toHaveAttribute('aria-label', /继续学习/)
    await expect(page.locator('.last-study-title')).toHaveText('一级汉字 · 关卡 02')
    await page.getByRole('tab', { name: '偏旁部首' }).click()
    await expect(page.getByRole('progressbar', { name: '偏旁部首已完成关卡' })).toHaveAttribute('aria-valuemax', '3')
    await page.getByRole('tab', { name: '二级汉字' }).click()
    await expect(page.locator('.overview-pending')).toHaveCount(0)
    await expect(page.locator('.overview-caption')).toHaveText('已完成 0 / 300 关')
    await page.getByRole('tab', { name: '一级汉字' }).click()
  }
})

test('新布局跟随五套主题，App 无全局 DOM 配色时页面绑定仍生效', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    const setProperty = CSSStyleDeclaration.prototype.setProperty
    CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
      if (this === document.documentElement.style && name.startsWith('--color-')) return
      setProperty.call(this, name, value, priority)
    }
  })
  for (const theme of themes) {
    await page.goto('/#/pages/theme/index')
    await page.getByRole('radio').filter({ hasText: theme.name }).click()
    for (const id of ['notebook', 'flashcards', 'board'] as const) {
      await chooseLayout(page, id)
      await expect(page.locator('.levels-page')).toHaveCSS('--color-primary', theme.tokens.primary)
      await expect(page.locator('.levels-page')).toHaveCSS('--color-text', theme.tokens.text)
      const button = page.locator(id === 'notebook' ? '.notebook-start' : id === 'flashcards' ? '.flash-start' : '.dock-start')
      await expect(button).toHaveCSS('--level-action-fill', theme.tokens.primaryStrong)
      if (theme.id === 'jade-green' || theme.id === 'ink-night') {
        await page.screenshot({ path: test.info().outputPath(`${id}-${theme.id}.png`) })
      }
    }
  }
  await page.reload()
  await expect(page.locator('.levels-page')).toHaveAttribute('data-level-layout', 'board')
  await expect(page.locator('.levels-page')).toHaveCSS('--color-primary', '#c92d32')
})

test('布局选项支持键盘切换，失效存储安全回退当前卡片布局', async ({ page }) => {
  await page.goto('/#/pages/level-layout/index')
  const defaultOption = page.getByRole('radio', { name: '经典卡片', exact: true })
  await expect(defaultOption).toHaveAttribute('aria-disabled', 'false')
  await defaultOption.focus()
  await page.keyboard.press('End')
  await expect(page.getByRole('radio', { name: '闯关棋盘' })).toBeFocused()
  await expect(page.getByRole('radio', { name: '闯关棋盘' })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('radio', { name: '口袋闪卡' })).toHaveAttribute('aria-checked', 'true')
  await replaceDatabaseRows(page, 'settings', [{ id: LEVEL_LAYOUT_STORAGE_KEY, value: JSON.stringify('obsolete-layout') }])
  await page.reload()
  await expect(defaultOption).toHaveAttribute('aria-checked', 'true')
})
