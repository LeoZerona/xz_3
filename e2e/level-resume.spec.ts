import { expect, test, type Page } from '@playwright/test'
import { LAST_LEVEL_STUDY_KEY } from '../src/study/levelActivity'
import { themes } from '../src/theme/themes'
import { databaseRows, replaceDatabaseRows } from './databaseHelpers'

async function prepareRecent(page: Page, stage = 87, category = 'level1'): Promise<void> {
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.stage-card')).toHaveCount(24)
  const suffix = String(stage).padStart(2, '0')
  await replaceDatabaseRows(page, 'settings', [{ id: LAST_LEVEL_STUDY_KEY, value: JSON.stringify({ category, stageId: `${category}-stage-${suffix}`, index: stage, title: `关卡 ${suffix}`, studiedAt: '2026-11-01T02:00:00.000Z' }) }])
  await page.reload()
}

test('点击卡片只看预览也立即保存选择，返回后高亮，再选其他卡片会更新', async ({ page }) => {
  await page.goto('/#/pages/levels/index')
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await expect(page.locator('.header-description, .overview-start')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '关卡学习', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '搜索', exact: true })).toBeInViewport()
  await expect(page.locator('.stage-card.is-current, .last-study-bar')).toHaveCount(0)
  await page.locator('#stage-level1-stage-05').click()
  await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  await expect.poll(async () => {
    const row = (await databaseRows(page, 'settings')).find((entry) => entry.id === LAST_LEVEL_STUDY_KEY)
    return row ? (JSON.parse(String(row.value)) as { stageId: string }).stageId : null
  }).toBe('level1-stage-05')
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.stage-card.is-current')).toHaveAttribute('id', 'stage-level1-stage-05')
  await expect(page.locator('.last-study-label')).toHaveText('最近选择')
  await page.locator('#stage-level1-stage-06').click()
  await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.stage-card.is-current')).toHaveAttribute('id', 'stage-level1-stage-06')
  expect(await databaseRows(page, 'stage_progress')).toEqual([])
})

test('从关卡预览返回保留目录滚动位置，从其他主页面进入才自动定位', async ({ page }) => {
  await prepareRecent(page, 5)
  await expect(page.locator('#stage-level1-stage-05')).toBeInViewport()
  const chosen = page.locator('#stage-level1-stage-10')
  await chosen.scrollIntoViewIfNeeded()
  const scroller = page.locator('.levels-scroll .uni-scroll-view-scrollbar-hidden')
  const before = await scroller.evaluate((element) => element.scrollTop)
  await chosen.click()
  await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('#stage-level1-stage-10')).toHaveClass(/is-current/)
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(before)
  await scroller.evaluate((element) => { element.scrollTop = 0 })
  await expect(chosen).not.toBeInViewport()
  await page.getByRole('button', { name: '我', exact: true }).click()
  await page.getByRole('button', { name: '关卡学习', exact: true }).click()
  await expect(page.locator('#stage-level1-stage-10')).toBeInViewport()
})

test('仅预览不答题，刷新和关闭页面后重新打开都恢复同一选择', async ({ page }) => {
  await page.goto('/#/pages/levels/index')
  await page.locator('#stage-level1-stage-05').click()
  await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.last-study-title')).toHaveText('一级汉字 · 关卡 05')
  await expect(page.locator('.stage-card.is-current')).toHaveAttribute('id', 'stage-level1-stage-05')
  await expect(page.locator('.stage-card').first()).toHaveAttribute('id', 'stage-level1-stage-01')
  await expect(page.locator('.stage-card.is-current .stage-progress-text')).toHaveText('0 / 10 字')
  await expect(page.locator('.stage-card.is-current .stage-status')).toHaveText('上次选择')
  await page.reload()
  await expect(page.locator('.stage-card.is-current')).toHaveAttribute('id', 'stage-level1-stage-05')
  const settings = await databaseRows(page, 'settings')
  expect(JSON.parse(String(settings.find((row) => row.id === LAST_LEVEL_STUDY_KEY)!.value))).toMatchObject({ category: 'level1', stageId: 'level1-stage-05', index: 5 })
  const reopened = await page.context().newPage()
  await page.close()
  await reopened.goto('/#/pages/levels/index')
  await expect(reopened.locator('.stage-card.is-current')).toHaveAttribute('id', 'stage-level1-stage-05')
  await expect(reopened.locator('.last-study-title')).toHaveText('一级汉字 · 关卡 05')
})

for (const width of [320, 390, 1440]) {
  test(`在 ${width}px 自动找回后段关卡，可跨分类重复定位，并继续进入学习`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    await prepareRecent(page)
    const recent = page.locator('#stage-level1-stage-87')
    await expect(page.locator('.stage-card')).toHaveCount(96)
    await expect(recent).toHaveClass(/is-current/)
    await expect(recent).toBeInViewport()
    const historyBar = await page.locator('.last-study-bar').boundingBox()
    const panel = await page.locator('.levels-scroll').boundingBox()
    expect(historyBar && panel && panel.y - historyBar.y - historyBar.height).toBeGreaterThanOrEqual(20)
    await expect(page.locator('.stage-card').first()).toHaveAttribute('id', 'stage-level1-stage-01')
    await page.getByRole('tab', { name: '偏旁部首' }).click()
    await expect(page.locator('.stage-card')).toHaveCount(3)
    expect(historyBar?.height).toBe(44)
    const locate = page.getByRole('button', { name: '回到上次选择的一级汉字关卡 87' })
    await locate.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('tab', { name: '一级汉字' })).toHaveAttribute('aria-selected', 'true')
    await expect(recent).toBeInViewport()
    await expect(recent).toBeFocused()
    await page.locator('#stage-level1-stage-01').scrollIntoViewIfNeeded()
    await locate.click()
    await expect(recent).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`cards-${width}.png`) })
    await recent.click()
    await expect(page).toHaveURL(/stageId=level1-stage-87/)
    await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  })
}

test('跨分类仅预览也更新最近选择，已完成的上次关卡仍保持高亮', async ({ page }) => {
  await prepareRecent(page, 2, 'radical')
  await expect(page.getByRole('tab', { name: '偏旁部首' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.stage-card.is-current')).toHaveAttribute('id', 'stage-radical-stage-02')
  await page.getByRole('tab', { name: '一级汉字' }).click()
  await page.locator('#stage-level1-stage-03').click()
  await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.last-study-title')).toHaveText('一级汉字 · 关卡 03')
  await replaceDatabaseRows(page, 'stage_progress', [{ id: 'level1-stage-03', completed: 1, updatedAt: '2026-11-01T02:10:00Z' }])
  await page.reload()
  await expect(page.locator('.stage-card.is-current')).toHaveAttribute('id', 'stage-level1-stage-03')
  await expect(page.locator('.stage-card.is-current .stage-status')).toHaveText('上次选择 · 已完成')
})

for (const [id, name] of [['notebook', '手帐字帖'], ['flashcards', '口袋闪卡'], ['board', '闯关棋盘']]) {
  test(`${name} 使用同一记录并可定位到对应字帖、闪卡或棋盘`, async ({ page }) => {
    await prepareRecent(page)
    await page.goto('/#/pages/level-layout/index')
    await page.getByRole('radio', { name: name!, exact: true }).click()
    await page.getByRole('button', { name: '查看关卡学习' }).click()
    await expect(page.locator('.levels-page')).toHaveAttribute('data-level-layout', id!)
    await expect(page.locator('.last-study-title')).toHaveText('一级汉字 · 关卡 87')
    await page.getByRole('tab', { name: '偏旁部首' }).click()
    await page.getByRole('button', { name: '回到上次选择的一级汉字关卡 87' }).click()
    await expect(page.locator('#stage-level1-stage-87')).toBeInViewport()
    if (id === 'notebook') await expect(page.locator('.notebook-page')).toHaveClass(/is-recent/)
    if (id === 'flashcards') await expect(page.locator('.flash-card h2')).toHaveText('关卡 87')
    if (id === 'board') await expect(page.locator('.board-tile.is-active')).toHaveAttribute('id', 'stage-level1-stage-87')
    await expect(page.getByRole('button', { name: '继续学习，关卡 87', exact: true })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath(`${id}-390.png`) })
  })
}

test('失效历史回退为空，不将待上线关卡标为上次选择', async ({ page }) => {
  await prepareRecent(page, 999)
  await expect(page.locator('.stage-card')).toHaveCount(24)
  await expect(page.locator('.stage-card.is-current, .last-study-bar')).toHaveCount(0)
})

for (const [id, name] of [['board', '闯关棋盘'], ['flashcards', '口袋闪卡']]) {
  test(`${name} 默认展示不记历史，点击选择即保存且重新打开后恢复`, async ({ page }) => {
    await page.goto('/#/pages/level-layout/index')
    await page.getByRole('radio', { name: name!, exact: true }).click()
    await page.getByRole('button', { name: '查看关卡学习' }).click()
    await expect(page.locator(id === 'board' ? '.board-tile' : '.flash-card').first()).toBeVisible()
    await expect(page.locator('.last-study-bar')).toHaveCount(0)
    const choice = id === 'board'
      ? page.getByRole('button', { name: /^选择关卡 03，/ })
      : page.getByRole('button', { name: '选择关卡 03', exact: true })
    await choice.click()
    await expect(page.locator('.last-study-title')).toHaveText('一级汉字 · 关卡 03')
    await page.reload()
    await expect(page.locator('.last-study-title')).toHaveText('一级汉字 · 关卡 03')
    if (id === 'board') await expect(page.locator('.board-tile.is-recent')).toHaveAttribute('id', 'stage-level1-stage-03')
    else await expect(page.locator('.flash-card.is-recent h2')).toHaveText('关卡 03')
    await page.getByRole('tab', { name: '二级汉字' }).click()
    await page.locator(id === 'board' ? '.dock-start' : '.flash-start').click()
    await expect(page.getByText('该关卡敬请期待', { exact: true })).toBeVisible()
    await expect(page.locator('.last-study-title')).toHaveText('一级汉字 · 关卡 03')
  })
}

test('闪卡跨加载批次选择后，保存实际显示的下一关', async ({ page }) => {
  await prepareRecent(page, 24)
  await page.goto('/#/pages/level-layout/index')
  await page.getByRole('radio', { name: '口袋闪卡', exact: true }).click()
  await page.getByRole('button', { name: '查看关卡学习' }).click()
  await expect(page.locator('.flash-card h2')).toHaveText('关卡 24')
  await page.getByRole('button', { name: '下一关', exact: true }).click()
  await expect(page.locator('.flash-card h2')).toHaveText('关卡 25')
  await expect(page.locator('.last-study-title')).toHaveText('一级汉字 · 关卡 25')
  await page.reload()
  await expect(page.locator('.flash-card.is-recent h2')).toHaveText('关卡 25')
})

test('上次选择使用浅色背景，单行返回入口跟随全部用户配色', async ({ page }) => {
  test.setTimeout(60_000)
  await prepareRecent(page, 5)
  for (const theme of themes) {
    await page.goto('/#/pages/theme/index')
    await page.getByRole('radio').filter({ hasText: theme.name }).click()
    await page.goto('/#/pages/levels/index')
    await expect(page.locator('.stage-card.is-current')).toBeVisible()
    const colors = await page.locator('.levels-page').evaluate((element, palette) => {
      const reference = document.createElement('span')
      reference.style.color = palette.primarySoft
      element.append(reference)
      const background = getComputedStyle(reference).color
      reference.style.color = palette.primaryStrong
      const ink = getComputedStyle(reference).color
      reference.style.color = palette.text
      const foreground = getComputedStyle(reference).color
      reference.style.color = palette.surface
      const surface = getComputedStyle(reference).color
      reference.remove()
      return { background, ink, foreground, surface }
    }, theme.tokens)
    await page.screenshot({ path: test.info().outputPath(`cards-${theme.id}-390.png`) })
    await expect(page.locator('.stage-card.is-current')).toHaveCSS('background-color', colors.background)
    await expect(page.locator('.stage-card.is-current')).toHaveCSS('color', colors.foreground)
    await expect(page.locator('.stage-card.is-current .stage-title')).toHaveCSS('color', colors.ink)
    await expect(page.locator('.stage-card.is-current .stage-footer')).toHaveCSS('color', colors.foreground)
    await expect(page.locator('.stage-card.is-current .stage-footer .van-icon')).toHaveCSS('color', colors.ink)
    await expect(page.locator('.stage-card.is-current .stage-status')).toHaveCSS('color', colors.ink)
    await expect(page.locator('.stage-card').first()).toHaveCSS('background-color', colors.surface)
    expect(colors.background).not.toBe(colors.surface)
    await expect(page.locator('.locate-last-study')).toHaveCSS('color', colors.ink)
  }
})
