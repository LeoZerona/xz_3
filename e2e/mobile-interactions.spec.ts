import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { databaseRows, replaceDatabaseRows } from './databaseHelpers'

async function ready(page: Page, route: string): Promise<void> {
  await page.goto(`/#/pages/${route}/index`)
  await expect(page.locator('.database-overlay')).toHaveCount(0)
}

async function searchFor(page: Page, query: string): Promise<void> {
  await page.locator('.search-input input').fill(query)
  await expect(page.locator('.result-detail').first().locator('.result-character')).toHaveText(query)
}

async function expectFracturedMark(mark: Locator): Promise<void> {
  const lower = await mark.evaluate(element => {
    const style = getComputedStyle(element, '::after')
    return { content: style.content, clipPath: style.clipPath, transform: style.transform, background: style.backgroundColor, shadow: style.boxShadow }
  })
  expect(lower.content).toBe('"斩"')
  expect(lower.clipPath).toMatch(/^polygon\(/)
  expect(lower.transform).not.toBe('none')
  expect(lower.background).toBe('rgba(0, 0, 0, 0)')
  expect(lower.shadow).toBe('none')
  const upper = mark.locator('.slash-mark__glyph')
  await expect(upper).toHaveText('斩')
  await expect(upper).not.toHaveCSS('clip-path', 'none')
  await expect(upper).not.toHaveCSS('transform', lower.transform)
}

test('搜索详情的空搜索返回原字，新搜索返回当前结果且不积累旧详情', async ({ page }) => {
  await ready(page, 'index')
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await searchFor(page, '一')
  await page.locator('.result-detail').first().click()
  await expect(page.locator('.detail-page')).toBeVisible()
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await expect(page.locator('.search-input input')).toHaveValue('')
  await page.getByRole('button', { name: '取消搜索' }).click()
  await expect(page.locator('.detail-page')).toBeVisible()
  await expect(page.locator('.font-character').first()).toHaveText('一')
  await expect(page.locator('.detail-content .character-favorite-button')).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.search-input input')).toHaveValue('一')
  await page.locator('.result-detail').first().click()
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await searchFor(page, '二')
  await page.locator('.result-detail').first().click()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.search-input input')).toHaveValue('二')
  expect(await page.evaluate('getCurrentPages().map(page => page.route)')).toEqual(['pages/index/index', 'pages/search/index'])
  await page.getByRole('button', { name: '取消搜索' }).click()
  await expect(page.locator('.home')).toBeVisible()
})

test('详情收藏仅填色，激活斩字呈折裂错位且取消后恢复完整字形', async ({ page }) => {
  await page.goto('/#/pages/character-detail/index?id=char-0001')
  const favorite = page.locator('.detail-content .character-favorite-button')
  await expect(favorite).toBeEnabled()
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true')
  await expect(favorite).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const slash = page.locator('.exclude-button')
  await slash.click()
  await expect(slash).toHaveAttribute('aria-pressed', 'true')
  await expect(slash).toHaveText('斩')
  await expect(slash).toHaveCSS('border-radius', '8px')
  await expectFracturedMark(slash.locator('.slash-mark'))
  await page.screenshot({ path: test.info().outputPath('detail-actions.png') })
  await slash.click()
  await expect(slash).toHaveAttribute('aria-pressed', 'false')
  await expect(slash.locator('.slash-mark__glyph')).toHaveCSS('clip-path', 'none')
  await expect(slash.locator('.slash-mark__glyph')).toHaveCSS('transform', 'none')
  expect(await slash.locator('.slash-mark').evaluate(element => getComputedStyle(element, '::after').content)).toBe('none')
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.getByRole('button', { name: '取消搜索' }).click()
  await expect(page.locator('.detail-page')).toBeVisible()
})

test('关卡预览斩字折裂状态刷新后保留，窄屏与深色主题不溢出', async ({ page }) => {
  const previewUrl = '/#/pages/level-study/index?category=level1&stageId=level1-stage-01'
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto(previewUrl)
  const slash = page.locator('.character-row').first().locator('.slash-button')
  await expect(slash).toHaveAttribute('aria-pressed', 'false')
  const inactiveBox = await slash.boundingBox()
  await slash.click()
  await expect(slash).toHaveAttribute('aria-pressed', 'true')
  await expectFracturedMark(slash.locator('.slash-mark'))
  expect(await slash.boundingBox()).toEqual(inactiveBox)
  await page.screenshot({ path: test.info().outputPath('preview-slash-320.png') })
  await page.reload()
  await expect(slash).toHaveAttribute('aria-pressed', 'true')
  await expectFracturedMark(slash.locator('.slash-mark'))
  await ready(page, 'theme')
  await page.getByRole('radio', { name: /墨夜/ }).click()
  await page.setViewportSize({ width: 430, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(previewUrl)
  await expect(slash).toHaveAttribute('aria-pressed', 'true')
  await expectFracturedMark(slash.locator('.slash-mark'))
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.screenshot({ path: test.info().outputPath('preview-slash-dark-430.png') })
  await slash.click()
  await expect(slash).toHaveAttribute('aria-pressed', 'false')
  await expect(slash.locator('.slash-mark__glyph')).toHaveCSS('clip-path', 'none')
})

test('个人页滚动有顶部遮盖，内容紧接底栏，手机宽度不溢出', async ({ page }) => {
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await ready(page, 'profile')
    const mask = page.locator('.profile-page .app-safe-mask')
    await expect(mask).toBeVisible()
    await expect(mask).toHaveCSS('position', 'fixed')
    await expect(mask).toHaveCSS('pointer-events', 'none')
    const scroller = page.locator('.profile-scroll .uni-scroll-view').last()
    await scroller.evaluate(element => { element.scrollTop = element.scrollHeight })
    const hint = await page.locator('.scroll-hint').boundingBox()
    const nav = await page.locator('.bottom-navigation').boundingBox()
    expect(hint).not.toBeNull()
    expect(nav).not.toBeNull()
    expect(nav!.y - (hint!.y + hint!.height)).toBeLessThanOrEqual(20)
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await expect(page.locator('.database-banner')).toHaveCount(0)
    await page.screenshot({ path: test.info().outputPath(`profile-${width}.png`) })
  }
})

for (const route of ['study', 'level-study']) for (const mode of ['choice', 'input']) {
  test(`${route} ${mode} 答题区右上方能收藏当前字`, async ({ page }) => {
    if (mode === 'input') {
      await ready(page, 'index')
      await expect(page.locator('.home .action-primary')).toBeVisible()
      await expect(page.locator('.database-overlay')).toHaveCount(0)
      await replaceDatabaseRows(page, 'settings', [{ id: 'font-learning-plan', value: JSON.stringify({ dailyCount: 15, modes: ['seal-to-reference-input'] }) }])
      // H5 修改 hash 不会重建缓存；重新加载后才以数据库中的输入题计划启动。
      await page.reload()
      await expect(page.locator('.database-overlay')).toHaveCount(0)
    }
    await page.goto(route === 'study' ? '/#/pages/study/index' : '/#/pages/level-study/index?category=level1&stageId=level1-stage-01')
    if (route === 'level-study') await page.getByRole('button', { name: '开始学习', exact: true }).click()
    const answerArea = page.locator(mode === 'choice' ? '.choice-grid' : '.input-panel')
    await expect(answerArea).toBeVisible()
    const favorite = page.getByRole('button', { name: '收藏当前文字', exact: true })
    await expect(page.locator('.question-content').getByRole('button', { name: '收藏当前文字', exact: true })).toBeVisible()
    const answer = await answerArea.boundingBox()
    const action = await favorite.boundingBox()
    expect(action!.y + action!.height).toBeLessThanOrEqual(answer!.y)
    expect(action!.x + action!.width).toBeGreaterThanOrEqual(answer!.x + answer!.width - 4)
    await favorite.click()
    await expect(page.getByRole('button', { name: '取消收藏当前文字', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(answerArea).toBeVisible()
    await expect(page.getByText('已收藏', { exact: true })).toBeHidden()
    await page.screenshot({ path: test.info().outputPath(`${route}-${mode}-favorite.png`) })
    const unfavorite = page.getByRole('button', { name: '取消收藏当前文字', exact: true })
    await unfavorite.focus()
    await unfavorite.press('Enter')
    await expect(page.getByRole('button', { name: '收藏当前文字', exact: true })).toBeVisible()
  })
}

test('真实写入失败展示错误原因，点击重试后保存且清除提示', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put
    let failed = false
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (!failed && this.name === 'settings' && (args[0] as { id?: string }).id === 'font-learning-search-history') {
        failed = true
        throw new DOMException('模拟空间不足', 'QuotaExceededError')
      }
      return put.apply(this, args)
    }
  })
  await ready(page, 'search')
  await searchFor(page, '一')
  await page.locator('.search-input input').press('Enter')
  const banner = page.locator('.database-banner')
  await expect(banner).toContainText('模拟空间不足')
  await page.getByRole('button', { name: '重试保存', exact: true }).click()
  await expect(banner).toHaveCount(0)
  await expect.poll(async () => (await databaseRows(page, 'settings')).find(row => row.id === 'font-learning-search-history')?.value).toBe('["一"]')
})

test('深色主题的顶部遮盖与圆角按钮仍生效，空匹配搜索不返回旧详情', async ({ page }) => {
  await ready(page, 'theme')
  await page.getByRole('radio', { name: /墨夜/ }).click()
  await ready(page, 'index')
  await expect(page.locator('.home .app-safe-mask')).toHaveCSS('background-color', 'rgb(26, 31, 43)')
  const search = page.getByRole('button', { name: '搜索', exact: true })
  await expect(search).toHaveCSS('border-radius', '8px')
  await search.click()
  await searchFor(page, '一')
  await page.locator('.result-detail').first().click()
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.locator('.search-input input').fill('不存在的字xyz')
  await expect(page.getByText('没有找到相关单字', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '取消搜索' }).click()
  await expect(page.locator('.home')).toBeVisible()
  await page.getByRole('button', { name: '我', exact: true }).click()
  await expect(page.locator('.profile-page .app-safe-mask')).toHaveCSS('background-color', 'rgb(26, 31, 43)')
  await page.screenshot({ path: test.info().outputPath('profile-dark.png') })
})
