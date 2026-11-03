import { expect, test, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { themes } from '../src/theme/themes'
import { COMPARISON_STORAGE_KEY } from '../src/comparison/characterComparison'
import { databaseRows } from './databaseHelpers'

async function addComparison(page: Page, text: string): Promise<void> {
  const input = page.locator('.comparison-input input')
  await expect(page.getByRole('button', { name: '添加到比较' })).toBeEnabled()
  await input.fill(text)
  await page.getByRole('button', { name: '添加到比较' }).click()
}

for (const width of [320, 390, 1440]) {
  test(`三个主页面顶部的搜索入口在 ${width}px 可见、可用并能返回`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    for (const route of ['index', 'levels', 'reading']) {
      await page.goto(`/#/pages/${route}/index`)
      const search = page.getByRole('button', { name: '搜索', exact: true })
      await expect(search).toBeInViewport()
      if (route === 'reading') await expect(page.locator('.book-card').first()).toBeInViewport()
      const box = await search.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.y).toBeLessThan(170)
      await search.click()
      await page.locator('.search-input input').fill('未')
      await expect(page.getByRole('button', { name: /^未，/ })).toBeVisible()
      await page.getByRole('button', { name: '取消搜索', exact: true }).click()
      await expect(page.locator(route === 'index' ? '.home' : route === 'levels' ? '.levels-page' : '.reading-page')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: test.info().outputPath(`${route}-${width}.png`) })
    }
  })
}

test('四种关卡布局均有搜索按钮，键盘打开后返回仍保留布局', async ({ page }) => {
  for (const [id, name] of [['cards', '经典卡片'], ['notebook', '手帐字帖'], ['flashcards', '口袋闪卡'], ['board', '闯关棋盘']]) {
    await page.goto('/#/pages/level-layout/index')
    const option = page.getByRole('radio', { name: name!, exact: true })
    await expect(option).toHaveAttribute('aria-disabled', 'false')
    await option.click()
    await page.getByRole('button', { name: '查看关卡学习' }).click()
    const search = page.getByRole('button', { name: '搜索', exact: true })
    await search.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.search-page')).toBeVisible()
    await page.getByRole('button', { name: '取消搜索' }).click()
    await expect(page.locator('.levels-page')).toHaveAttribute('data-level-layout', id!)
  }
})

test('完整字库搜索包含每日字表之外的文字，并保持拼音、分页和搜索记录', async ({ page }) => {
  type Source = { chars: Array<{ id: string; script_forms: { simplified: string } }> }
  const daily = JSON.parse(readFileSync('src/data/character-table/first-level.json', 'utf8')) as Source
  const ids = new Set(daily.chars.map((entry) => entry.id))
  const extra = readdirSync('src/data/character-table/firstLevel').filter((file) => file.endsWith('.json')).flatMap((file) => (JSON.parse(readFileSync('src/data/character-table/firstLevel/' + file, 'utf8')) as Source).chars).find((entry) => !ids.has(entry.id))!
  await page.goto('/#/pages/search/index')
  const input = page.locator('.search-input input')
  await input.fill(extra.script_forms.simplified)
  await expect(page.getByRole('button', { name: new RegExp('^' + extra.script_forms.simplified + '，') })).toBeVisible()
  await input.fill('一')
  await expect(page.locator('.result-item')).toHaveCount(50)
  await page.getByRole('button', { name: '加载更多搜索结果' }).click()
  await expect(page.locator('.result-item')).toHaveCount(100)
  await input.press('Enter')
  await page.getByRole('button', { name: '清空搜索', exact: true }).click()
  await expect(page.getByRole('button', { name: '搜索 一', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '搜索 一', exact: true }).click()
  await expect(page.locator('.result-item')).toHaveCount(50)
})

test('搜索结果可跨查询逐字加入，整组加入去重，并对齐显示两种字体和真实信息', async ({ page }) => {
  await page.goto('/#/pages/search/index')
  const input = page.locator('.search-input input')
  await input.fill('己')
  await page.getByRole('button', { name: '加入比较：己', exact: true }).click()
  await input.fill('已')
  await page.getByRole('button', { name: '加入比较：已', exact: true }).click()
  await input.fill('己已巳')
  await expect(page.locator('.result-item')).toHaveCount(3)
  await page.getByRole('button', { name: '将搜索文字加入比较' }).click()
  await expect(page.locator('.tray-character')).toHaveCount(3)
  await page.getByRole('button', { name: '打开字形比较' }).click()
  await expect(page.locator('.compare-selected-character')).toHaveCount(3)
  await expect(page.locator('.comparison-glyph')).toHaveText(['己', '已', '巳', '己', '已', '巳'])
  await expect(page.locator('.comparison-structure')).toHaveCount(3)
  await expect(page.locator('.comparison-definition')).toHaveCount(3)
  const columns = await page.locator('.matrix-font-row').evaluateAll((rows) => rows.map((row) => [...row.children].map((cell) => Math.round(cell.getBoundingClientRect().x))))
  expect(columns[0]).toEqual(columns[1])
  await page.screenshot({ path: test.info().outputPath('comparison-390.png'), fullPage: true })
  await page.getByRole('button', { name: '查看己的文字详情', exact: true }).click()
  await expect(page.getByText('基本释义', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await expect(page.locator('.compare-selected-character')).toHaveCount(3)
  await page.reload()
  await expect(page.locator('.comparison-glyph')).toHaveCount(6)
  const settings = await databaseRows(page, 'settings')
  expect(JSON.parse(String(settings.find((row) => row.id === COMPARISON_STORAGE_KEY)!.value))).toHaveLength(3)
})

test('直接添加、无效输入、未收录文字、数量上限、移除和清空均有明确反馈', async ({ page }) => {
  await page.goto('/#/pages/character-compare/index')
  await expect(page.getByRole('textbox', { name: '添加要比较的汉字' })).toBeVisible()
  await addComparison(page, 'shi')
  await expect(page.locator('.compare-feedback')).toContainText('请输入汉字')
  await addComparison(page, '己已巳未末土士')
  await expect(page.locator('.compare-selected-character')).toHaveCount(6)
  await expect(page.locator('.compare-feedback')).toContainText('最多比较 6 个字')
  await addComparison(page, '己')
  await expect(page.locator('.compare-feedback')).toContainText('已在比较中')
  await page.getByRole('button', { name: '移除比较文字已', exact: true }).click()
  await addComparison(page, '士')
  await expect(page.locator('.compare-selected-character')).toHaveCount(6)
  await addComparison(page, '𠮷')
  await expect(page.locator('.compare-feedback')).toContainText('字库暂未收录：𠮷')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '清空比较列表' }).click()
  await page.reload()
  await expect(page.locator('.compare-selected-character')).toHaveCount(0)
  await expect(page.locator('.compare-empty')).toBeVisible()
  expect(await databaseRows(page, 'character_progress')).toEqual([])
})

for (const width of [320, 390, 1440]) {
  test(`比较表在 ${width}px 可滚动查看六个字，跟随用户配色与字体`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 })
    await page.goto('/#/pages/character-compare/index')
    await addComparison(page, '己已巳未末土')
    await expect(page.locator('.comparison-glyph')).toHaveCount(12)
    const families = await page.locator('.comparison-glyph').evaluateAll((glyphs) => glyphs.map((glyph) => getComputedStyle(glyph).fontFamily))
    expect(new Set(families.slice(0, 6)).size).toBe(1)
    expect(new Set(families.slice(6)).size).toBe(1)
    await page.getByRole('button', { name: '查看土的文字详情', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('button', { name: '查看土的文字详情', exact: true })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`six-characters-${width}.png`) })
    for (const theme of themes) {
      await page.goto('/#/pages/theme/index')
      await page.getByRole('radio').filter({ hasText: theme.name }).click()
      await page.goto('/#/pages/character-compare/index')
      await expect(page.locator('.character-compare-page')).toHaveCSS('--color-primary', theme.tokens.primary)
      await expect(page.locator('.comparison-glyph').first()).toHaveCSS('--color-text', theme.tokens.text)
      await expect(page.locator('.compare-selected-character')).toHaveCount(6)
      if (theme.mode === 'dark') await page.screenshot({ path: test.info().outputPath(`comparison-night-${width}.png`), fullPage: true })
    }
  })
}

test('阅读器顶部与阅读菜单中的搜索都可用，返回不丢失阅读位置', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('reading:customBooks')) return
    const text = Array.from({ length: 100 }, (_, row) => `第${row}行：己已巳未末土士天地玄黄宇宙洪荒`).join('\n')
    localStorage.setItem('reading:customBooks', JSON.stringify({ type: 'object', data: [{ id: 'compare-reader', name: '形近字阅读测试', fileName: '形近字阅读测试.txt', ext: 'txt', source: 'custom', url: '', text, createdAt: 1 }] }))
  })
  await page.goto('/#/pages/reading/index')
  await page.getByRole('tab', { name: /我的上传/ }).click()
  await page.getByRole('button', { name: '形近字阅读测试', exact: true }).click()
  await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  await page.locator('.reading-page').focus()
  await page.keyboard.press('ArrowRight')
  const position = await page.locator('.reading-page-label').textContent()
  for (const menuOpen of [false, true]) {
    if (menuOpen) await page.getByRole('button', { name: '打开阅读菜单', exact: true }).click()
    const search = page.getByRole('button', { name: '搜索', exact: true })
    await expect(search).toHaveCount(1)
    await expect(search).toBeInViewport()
    await search.click()
    await page.locator('.search-input input').fill('未末')
    await expect(page.locator('.result-item')).toHaveCount(2)
    await page.getByRole('button', { name: '取消搜索' }).click()
    await expect(page.locator('.reading-page-label')).toHaveText(position!)
    await expect(page.locator('.reading-page-stage')).toHaveClass(/is-ready/)
  }
})
