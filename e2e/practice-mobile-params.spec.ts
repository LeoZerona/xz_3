import { expect, test, type Page } from '@playwright/test'
import { databaseRows, replaceDatabaseRows } from './databaseHelpers'

/** App 的 onLoad 保留业务编码，H5 会额外解码；直接重放页面钩子以覆盖 App 参数契约。 */
async function loadWithAppQuery(page: Page, expectedRoute: string, options: Record<string, string>): Promise<void> {
  await expect.poll(() => page.evaluate((route) => {
    const runtime = window as unknown as {
      getCurrentPages: () => Array<{ route: string; $vm: { $: { onLoad?: unknown[]; m?: unknown[] } } }>
    }
    const pages = runtime.getCurrentPages()
    const current = pages[pages.length - 1]
    return current?.route === route && Boolean(current.$vm.$.onLoad?.length && current.$vm.$.m?.length)
  }, expectedRoute)).toBe(true)
  await page.evaluate((query) => {
    const runtime = window as unknown as {
      plus?: unknown
      getCurrentPages: () => Array<{ $vm: { $: {
        onLoad: Array<(options: Record<string, string>) => void>
        m: Array<() => void>
      } } }>
    }
    const pages = runtime.getCurrentPages()
    const instance = pages[pages.length - 1]!.$vm.$
    const nativeBridge = runtime.plus
    runtime.plus = {}
    try { for (const hook of instance.onLoad) hook(query) }
    finally {
      if (nativeBridge === undefined) delete runtime.plus
      else runtime.plus = nativeBridge
    }
    // 重新执行页面的数据加载，保留真实页面、题单和数据库实现。
    for (const hook of instance.m) hook()
  }, options)
}

for (const mode of ['seal-to-reference-choice', 'reference-to-seal-choice', 'seal-to-reference-input'] as const) {
  test(`App 编码练习 ID 可加载、继续并查看结果：${mode}`, async ({ page }) => {
    await page.goto('/#/pages/practice-setup/index?source=custom')
    await page.getByLabel('练习汉字').fill('未')
    await page.getByLabel('本次练习字数').fill('1')
    const labels = {
      'seal-to-reference-choice': '查看学习字体选择对照字体',
      'reference-to-seal-choice': '查看对照字体选择学习字体',
      'seal-to-reference-input': '查看学习字体输入对照字体',
    }
    for (const [id, label] of Object.entries(labels)) {
      if (id !== mode) await page.getByRole('checkbox', { name: new RegExp(label) }).click()
    }
    await page.getByRole('button', { name: '开始独立练习', exact: true }).click()
    await expect(page.locator('.prompt-card')).toBeVisible()
    const [session] = await databaseRows(page, 'practice_sessions')
    const encodedId = encodeURIComponent(String(session!.id))
    expect(encodedId).toContain('%3A')

    await loadWithAppQuery(page, 'pages/practice-session/index', { id: encodedId })
    await expect(page.locator('.prompt-card')).toBeVisible()
    await expect(page.getByText('练习不存在，请返回重新配置', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: '返回', exact: true }).click()
    await page.getByRole('button', { name: /自选汉字练习.*0 \/ 1 题/ }).click()
    await expect(page.locator('.prompt-card')).toBeVisible()
    await loadWithAppQuery(page, 'pages/practice-session/index', { id: encodedId })
    await expect(page.locator('.prompt-card')).toBeVisible()
    if (mode === 'seal-to-reference-input') {
      await page.locator('.answer-input input').fill('未')
      await page.getByRole('button', { name: '确认输入答案', exact: true }).click()
    } else await page.getByRole('button', { name: '选择文字未', exact: true }).click()
    await page.getByRole('button', { name: '查看练习结果', exact: true }).click()
    await expect(page).toHaveURL(/practice-result/)
    await loadWithAppQuery(page, 'pages/practice-result/index', { id: encodedId })
    await expect(page.getByText('100%', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '重新练习同一范围', exact: true }).click()
    await expect(page.locator('.prompt-card')).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('practice-mobile.png') })
    expect(await databaseRows(page, 'character_progress')).toHaveLength(0)
    expect(await databaseRows(page, 'level_review')).toHaveLength(0)
  })
}

test('App 编码字单 ID 可配置独立练习并管理字单', async ({ page }) => {
  await page.goto('/#/pages/practice-setup/index?source=custom')
  await page.getByLabel('练习汉字').waitFor()
  const [character] = (await databaseRows(page, 'characters')).filter(row => row.simplified === '未')
  const id = 'collection:mobile-practice'
  const at = '2026-11-04T00:00:00.000Z'
  await replaceDatabaseRows(page, 'collections', [{ id, name: '手机专项字单', description: '', createdAt: at, updatedAt: at }])
  await replaceDatabaseRows(page, 'collection_items', [{ id: 'mobile-member', collectionId: id, characterId: character!.id, position: 0, addedAt: at }])

  await loadWithAppQuery(page, 'pages/practice-setup/index', { source: 'collection', id: encodeURIComponent(id) })
  await expect(page.getByRole('heading', { name: '手机专项字单', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始独立练习', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '开始独立练习', exact: true }).click()
  await expect(page.locator('.prompt-card')).toBeVisible()
  expect(await databaseRows(page, 'practice_sessions')).toMatchObject([{ source: 'collection', sourceId: id }])

  await page.goto(`/#/pages/collection-detail/index?id=${encodeURIComponent(id)}`)
  await expect(page.getByRole('heading', { name: '手机专项字单', exact: true })).toBeVisible()
  await loadWithAppQuery(page, 'pages/collection-detail/index', { id: encodeURIComponent(id) })
  await expect(page.getByRole('heading', { name: '手机专项字单', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '编辑字单', exact: true }).click()
  await loadWithAppQuery(page, 'pages/collection-edit/index', { id: encodeURIComponent(id) })
  await expect(page.getByLabel('字单名称')).toHaveValue('手机专项字单')
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await page.getByRole('button', { name: '管理文字', exact: true }).click()
  await loadWithAppQuery(page, 'pages/collection-members/index', { id: encodeURIComponent(id) })
  await expect(page.getByRole('checkbox', { name: '选择未', exact: true })).toBeChecked()
})

for (const [source, name] of [['favorites', '收藏字练习'], ['slashed', '已斩文字练习'], ['mistakes', '错题专项']] as const) {
  test(`App ${name}可创建并加载独立练习`, async ({ page }) => {
    await page.goto('/#/pages/practice-setup/index?source=custom')
    await page.getByLabel('练习汉字').waitFor()
    const [character] = (await databaseRows(page, 'characters')).filter(row => row.simplified === '未')
    await replaceDatabaseRows(page, 'character_progress', [{ id: character!.id, favorite: 1, excluded: 1 }])
    await replaceDatabaseRows(page, 'character_mode_progress', [{
      id: 'mobile-mistake', characterId: character!.id, mode: 'seal-to-reference-choice', mistakes: 1,
    }])
    await loadWithAppQuery(page, 'pages/practice-setup/index', { source })
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '开始独立练习', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: '开始独立练习', exact: true }).click()
    await expect(page.locator('.prompt-card')).toBeVisible()
    const [session] = await databaseRows(page, 'practice_sessions')
    expect(session!.source).toBe(source)
    await loadWithAppQuery(page, 'pages/practice-session/index', { id: encodeURIComponent(String(session!.id)) })
    await expect(page.locator('.prompt-card')).toBeVisible()
    await expect(page.locator('.prompt-character')).toHaveText('未')
  })
}
