import { expect, test } from '@playwright/test'

for (const width of [390, 1280]) {
  test(`主题在无全局 DOM 配色的页面中生效并保持（${width}px）`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: 844 })
    // 模拟 App 逻辑层不能更新 WebView document 的情况，保留正常的页面渲染。
    await page.addInitScript(() => {
      const setProperty = CSSStyleDeclaration.prototype.setProperty
      CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
        if (this === document.documentElement.style && name.startsWith('--color-')) return
        setProperty.call(this, name, value, priority)
      }
    })

    await page.goto('/#/pages/profile/index')
    await page.getByRole('button', { name: '个人设置' }).click()
    await page.getByRole('button', { name: '显示设置' }).click()
    await page.getByRole('radio', { name: /青竹绿/ }).click()
    await expect(page.locator('.theme-page')).toHaveCSS('background-color', 'rgb(251, 253, 251)')
    await expect(page.locator('.theme-title')).toHaveCSS('color', 'rgb(32, 52, 46)')
    await expect(page.locator('.theme-card.is-active')).toHaveCSS('border-color', 'rgb(22, 133, 107)')

    await page.getByRole('radio', { name: /墨夜/ }).click()
    await expect(page.locator('.theme-page')).toHaveCSS('background-color', 'rgb(21, 25, 34)')
    await expect(page.locator('.theme-title')).toHaveCSS('color', 'rgb(241, 244, 250)')
    await page.screenshot({ path: test.info().outputPath('theme-settings-night.png') })
    await page.getByRole('button', { name: '返回', exact: true }).click()
    await expect(page.locator('.settings-page')).toHaveCSS('color', 'rgb(241, 244, 250)')
    const seniorSwitch = page.getByRole('switch', { name: '长辈版' })
    await seniorSwitch.click()
    await expect(seniorSwitch).toHaveCSS('background-color', 'rgb(125, 162, 255)')
    await page.getByRole('button', { name: '返回', exact: true }).click()
    await expect(page.locator('.profile-page')).toHaveCSS('color', 'rgb(241, 244, 250)')
    await page.getByLabel('学习', { exact: true }).click()
    await expect(page.locator('.home')).toHaveCSS('background-color', 'rgb(21, 25, 34)')
    await expect(page.locator('.action-primary')).toHaveCSS('background-color', 'rgb(125, 162, 255)')
    await page.reload()
    await expect(page.locator('.home')).toHaveCSS('background-color', 'rgb(21, 25, 34)')

    const routes: [string, string][] = [
      ['plan', '.plan-page'], ['study-preview', '.preview-page'], ['study', '.study-page'],
      ['character-detail', '.detail-page'], ['search', '.search-page'],
      ['personal-profile', '.personal-profile-page'], ['region-picker', '.region-page'],
      ['levels', '.levels-page'], ['level-study', '.study-page'], ['reading', '.reading-page'],
    ]
    for (const [route, selector] of routes) {
      await page.goto(`/#/pages/${route}/index`)
      await expect(page.locator(selector)).toHaveCSS('--color-primary', '#7da2ff')
      await expect(page.locator(selector)).toHaveCSS('--color-page', '#151922')
      await expect(page.locator(selector)).toHaveCSS('--van-primary-color', '#7da2ff')
    }
    await page.screenshot({ path: test.info().outputPath('theme-night.png') })
  })
}
