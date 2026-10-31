import { expect, test, type Page } from '@playwright/test'

async function pageRoutes(page: Page): Promise<string[]> {
  return page.evaluate('getCurrentPages().map(page => page.route)')
}

async function watchNavigation(page: Page): Promise<void> {
  await page.evaluate(() => {
    const runtime = window as unknown as {
      uni: { addInterceptor: (api: string, interceptor: { invoke: () => boolean | void }) => void }
      navigationCounts: { back: number; relaunch: number }
    }
    runtime.navigationCounts = { back: 0, relaunch: 0 }
    runtime.uni.addInterceptor('navigateBack', {
      invoke() {
        runtime.navigationCounts.back += 1
        // 限制有缺陷的递归，避免回归时卡死测试浏览器。
        if (runtime.navigationCounts.back > 10) return false
      },
    })
    runtime.uni.addInterceptor('reLaunch', {
      invoke() { runtime.navigationCounts.relaunch += 1 },
    })
  })
}

for (const from of ['button', 'backbutton'] as const) {
  test(`关卡反复连点进入并通过 ${from} 退出，不重启页面或堆积学习页`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/#/pages/levels/index')
    await expect(page.locator('.stage-card')).toHaveCount(24)
    await page.locator('.load-more-stages').evaluate((element) => (element as HTMLElement).click())
    await expect(page.locator('.stage-card')).toHaveCount(48)
    await watchNavigation(page)

    for (let iteration = 0; iteration < 4; iteration += 1) {
      await page.locator('.stage-card').first().evaluate((element) => {
        for (let click = 0; click < 5; click += 1) (element as HTMLElement).click()
      })
      await expect(page.getByRole('region', { name: '关卡预览' })).toBeVisible()
      expect(await pageRoutes(page)).toEqual(['pages/levels/index', 'pages/level-study/index'])
      await page.getByRole('button', { name: '开始学习', exact: true }).click()
      await expect(page.locator('.prompt-character')).toBeVisible()
      await page.evaluate('window.navigationCounts.back = 0')
      if (from === 'button') {
        await page.getByLabel('返回', { exact: true }).click()
      } else {
        await page.evaluate("uni.navigateBack({ from: 'backbutton', success() {}, fail() {} })")
      }
      await expect(page).toHaveURL(/\/pages\/levels\/index$/)
      await expect(page.locator('.stage-card')).toHaveCount(48)
      expect(await pageRoutes(page)).toEqual(['pages/levels/index'])
      expect(await page.evaluate('window.navigationCounts')).toEqual({ back: from === 'button' ? 1 : 2, relaunch: 0 })
    }
    expect(errors).toEqual([])
  })
}

test('主导航反复切换复用已有页面，不积累页面栈或重新加载首页', async ({ page }) => {
  await page.goto('/#/pages/index/index')
  await expect(page.locator('.home')).toBeVisible()
  await watchNavigation(page)
  for (let iteration = 0; iteration < 5; iteration += 1) {
    for (const [label, route] of [
      ['关卡学习', 'levels'], ['对照阅读', 'reading'], ['我', 'profile'], ['学习', 'index'],
    ]) {
      await page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: label, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/pages/${route}/index$`))
      const routes = await pageRoutes(page)
      expect(new Set(routes).size).toBe(routes.length)
      expect(routes.length).toBeLessThanOrEqual(4)
    }
  }
  expect(await pageRoutes(page)).toEqual(['pages/index/index'])
  expect(await page.evaluate('window.navigationCounts.relaunch')).toBe(0)
})

for (const route of ['study-preview', 'study', 'character-detail', 'search', 'plan', 'personal-profile', 'region-picker']) {
  test(`${route} 返回上一页只执行一次导航`, async ({ page }) => {
    await page.goto('/#/pages/index/index')
    await expect(page.locator('.home')).toBeVisible()
    await watchNavigation(page)
    const url = `/pages/${route}/index${route === 'character-detail' ? '?id=char-0001' : ''}`
    await page.evaluate((url) => {
      const runtime = window as unknown as {
        uni: { navigateTo: (options: { url: string; success: () => void; fail: () => void }) => void }
      }
      runtime.uni.navigateTo({ url, success() {}, fail() {} })
    }, url)
    await page.getByLabel(route === 'search' ? '取消搜索' : '返回', { exact: true }).click()
    await expect(page).toHaveURL(/\/pages\/index\/index$/)
    expect(await pageRoutes(page)).toEqual(['pages/index/index'])
    expect(await page.evaluate('window.navigationCounts')).toEqual({ back: 1, relaunch: 0 })
  })
}

test('切换失败提示重试并解除点击锁，不清空页面重新加载', async ({ page }) => {
  await page.goto('/#/pages/index/index')
  await expect(page.locator('.home')).toBeVisible()
  await watchNavigation(page)
  await page.evaluate(() => {
    interface NavigateOptions { fail?: (error: { errMsg: string }) => void }
    const runtime = window as unknown as { uni: { navigateTo: (options: NavigateOptions) => void } }
    const navigateTo = runtime.uni.navigateTo
    runtime.uni.navigateTo = (options) => {
      runtime.uni.navigateTo = navigateTo
      options.fail?.({ errMsg: 'navigateTo:fail page limit exceeded' })
    }
  })
  const levelsTab = page.getByRole('navigation', { name: '主导航' }).getByRole('button', { name: '关卡学习', exact: true })
  await levelsTab.click()
  await expect(page.getByText('暂时无法切换页面，请重试', { exact: true })).toBeVisible()
  expect(await pageRoutes(page)).toEqual(['pages/index/index'])
  expect(await page.evaluate('window.navigationCounts.relaunch')).toBe(0)
  await levelsTab.click()
  await expect(page).toHaveURL(/\/pages\/levels\/index$/)
})
