import { expect, test } from '@playwright/test'
import { themes } from '../src/theme/themes'
import { replaceDatabaseRows } from './databaseHelpers'
import { LAST_LEVEL_STUDY_KEY } from '../src/study/levelActivity'

for (const width of [320, 390, 768, 1440]) {
  test(`关卡目录在 ${width}px 保持可读、滚动与键盘入口`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    await page.goto('/#/pages/levels/index')
    await expect(page.locator('.stage-card')).toHaveCount(24)
    await expect(page.getByRole('heading', { name: '关卡学习', exact: true })).toHaveCount(0)
    await expect(page.getByRole('tab', { name: '一级汉字', exact: true })).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.overview-heading, .overview-description')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^关卡 01.*开始学习$/ })).toBeInViewport()
    await expect(page.locator('.stage-card').first()).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('.stage-card.is-current')).toHaveCount(0)
    await expect(page.locator('.header-description, .overview-start')).toHaveCount(0)
    const firstRow = await page.locator('.stage-card').first().boundingBox()
    const secondRow = await page.locator('.stage-card').nth(1).boundingBox()
    expect(firstRow && secondRow && (
      secondRow.x >= firstRow.x + firstRow.width || secondRow.y >= firstRow.y + firstRow.height
    )).toBeTruthy()
    const tabs = await page.getByRole('tab', { name: '一级汉字' }).boundingBox()
    const scrollPanel = page.locator('.levels-scroll')
    const panelBeforeScroll = await scrollPanel.boundingBox()
    expect(tabs && panelBeforeScroll && panelBeforeScroll.y - tabs.y - tabs.height).toBeGreaterThanOrEqual(20)
    const scrollViewport = scrollPanel.locator('.uni-scroll-view').last()
    await scrollViewport.evaluate((element) => { element.scrollTop = 260 })
    await expect.poll(() => scrollViewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(200)
    expect((await page.locator('.stage-card').first().boundingBox())!.y).toBeLessThan(firstRow!.y)
    const panelAfterScroll = await scrollPanel.boundingBox()
    expect(panelAfterScroll?.y).toBe(panelBeforeScroll?.y)
    expect(await page.getByRole('tab', { name: '一级汉字' }).boundingBox()).toEqual(tabs)
    await scrollViewport.evaluate((element) => { element.scrollTop = 0 })
    await page.screenshot({ path: test.info().outputPath(`levels-${width}.png`) })
    await page.locator('.load-more-stages').click()
    await expect(page.locator('.stage-card')).toHaveCount(48)
    await page.getByRole('tab', { name: '一级汉字' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: '二级汉字' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: '二级汉字' })).toBeFocused()
    await expect(page.locator('.stage-card.is-placeholder')).toHaveCount(0)
    await expect(page.locator('.overview-caption')).toHaveText('已完成 0 / 300 关')
    await page.locator('.stage-card').first().click()
    await expect(page.getByRole('region',{name:'关卡预览'})).toBeVisible()
    await expect(page.locator('.character-row')).toHaveCount(10)
    await page.getByRole('button',{name:'返回',exact:true}).click()
    await page.getByRole('tab', { name: '偏旁部首' }).click()
    await expect(page.getByRole('progressbar', { name: '偏旁部首已完成关卡' })).toHaveAttribute('aria-valuemax', '3')
    await expect(page.locator('.stage-card')).toHaveCount(3)
    await expect(page.locator('.stage-card').first()).toHaveAttribute('aria-label', /关卡 01/)
    await page.getByRole('tab', { name: '一级汉字' }).click()
    await expect(page.locator('.stage-card')).toHaveCount(24)
    await page.locator('.stage-card').first().focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/stageId=level1-stage-01/)
    await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  })
}

for (const width of [390, 1440]) {
  test(`关卡目录跟随全部用户配色并在刷新后保留（${width}px）`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: 900 })
    // 页面 style 绑定独立生效，覆盖 App 逻辑层不能操作 document 的场景。
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
      await page.goto('/#/pages/levels/index')
      await expect(page.locator('.stage-card')).toHaveCount(24)
      await expect(page.locator('.levels-page')).toHaveCSS('--color-primary', theme.tokens.primary)
      await expect(page.locator('.levels-page')).toHaveCSS('--level-action-fill', theme.tokens.primaryStrong)
      const expectedColor = await page.locator('.levels-page').evaluate((element) => getComputedStyle(element).getPropertyValue('--color-text').trim())
      expect(expectedColor).toBe(theme.tokens.text)
      await page.screenshot({ path: test.info().outputPath(`levels-${theme.id}-${width}.png`) })
      await page.reload()
      await expect(page.locator('.levels-page')).toHaveCSS('--color-primary', theme.tokens.primary)
    }
  })
}

test('真实关卡进度同时驱动卡片、总进度与继续学习入口', async ({ page }) => {
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await replaceDatabaseRows(page, 'stage_progress', [{ id: 'level1-stage-01', completed: 1, updatedAt: '2026-11-01T01:00:00Z' }])
  await replaceDatabaseRows(page, 'stage_character_progress', [{ id: 'design-progress', stageId: 'level1-stage-02', characterId: 'char-0011', position: 0 }])
  await replaceDatabaseRows(page, 'settings', [{ id: LAST_LEVEL_STUDY_KEY, value: JSON.stringify({ category: 'level1', stageId: 'level1-stage-02', index: 2, title: '关卡 02', studiedAt: '2026-11-01T01:00:00Z' }) }])
  await page.reload()
  await expect(page.locator('.overview-caption')).toHaveText('已完成 1 / 351 关')
  await expect(page.getByRole('progressbar', { name: '一级汉字已完成关卡' })).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByRole('progressbar', { name: '一级汉字已完成关卡' })).toHaveAttribute('aria-valuemax', '351')
  const completedStage = page.getByRole('button', { name: /^关卡 01，/ })
  await expect(completedStage).toHaveClass(/is-done/)
  await expect(completedStage).toHaveAttribute('aria-label', /已训练 1 次/)
  await expect(page.locator('.stage-card.is-current .stage-title')).toHaveText('关卡 02')
  await expect(page.locator('.stage-card.is-current')).toHaveAttribute('aria-label', /1 \/ 10 字/)
  await page.getByRole('button', { name: /^关卡 02.*继续学习$/ }).click()
  await expect(page).toHaveURL(/stageId=level1-stage-02/)
})

test('生产版主导航可用，关卡返回保留已加载目录', async ({ page }) => {
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await page.locator('.load-more-stages').click()
  await expect(page.locator('.stage-card')).toHaveCount(48)
  for (let visit = 0; visit < 2; visit += 1) {
    await page.locator('.stage-card').first().click()
    await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
    await page.getByLabel('返回', { exact: true }).click()
    await expect(page.locator('.stage-card')).toHaveCount(48)
  }
  for (const [label, route] of [
    ['我', 'profile'], ['学习', 'index'], ['关卡学习', 'levels'],
    ['对照阅读', 'reading'], ['关卡学习', 'levels'],
  ]) {
    const destination = page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: label, exact: true })
    await expect(destination).toHaveAttribute('aria-disabled', 'false')
    await destination.click()
    // uni-app 生产包将首页归一为 #/，其余页面保留页面路径。
    await expect(page).toHaveURL(route === 'index' ? /#\/(?:pages\/index\/index)?$/ : new RegExp(`/pages/${route}/index$`))
  }
  // 从首页重新打开目录沿用原有行为：重新加载首批 24 关。
  await expect(page.locator('.stage-card')).toHaveCount(24)
})
