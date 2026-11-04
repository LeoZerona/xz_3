import { expect, test } from '@playwright/test'

const detailUrl = '/#/pages/character-detail/index?id=char-0190'
const viewports = [
  { width: 320, height: 568, input: 'touch' },
  { width: 390, height: 844, input: 'touch' },
  { width: 844, height: 390, input: 'touch' },
  { width: 1280, height: 720, input: 'wheel' },
] as const

for (const viewport of viewports) {
  test(`文字详情在 ${viewport.width}×${viewport.height} 可用${viewport.input}滚到末尾并返回顶部`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto(detailUrl)
    const lastTag = page.locator('.detail-page .tag-list .tag').last()
    await expect(lastTag).toBeVisible()
    await expect(lastTag).not.toBeInViewport()
    const favorite = page.locator('.detail-content .character-favorite-button')
    const definitionCard = page.locator('.info-card').filter({ hasText: '基本释义' })
    await expect(favorite).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('detail-top.png'), scale: 'css' })
    const buttonBounds = (await favorite.boundingBox())!
    const cardBounds = (await definitionCard.boundingBox())!
    expect(buttonBounds.y + buttonBounds.height).toBeLessThanOrEqual(cardBounds.y)
    expect(Math.abs(buttonBounds.x + buttonBounds.width - cardBounds.x - cardBounds.width)).toBeLessThanOrEqual(1)
    const point = { x: viewport.width / 2, y: viewport.height * 0.7 }
    const session = viewport.input === 'touch' ? await page.context().newCDPSession(page) : null
    const scroll = async (distance: number): Promise<void> => {
      if (session) {
        const startY = distance > 0 ? viewport.height - 40 : 120
        const endY = distance > 0 ? 120 : viewport.height - 40
        for (let swipe = 0; swipe < 3; swipe += 1) {
          await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: startY }] })
          for (let step = 1; step <= 12; step += 1) {
            const y = startY + (endY - startY) * step / 12
            await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x, y }] })
            // 为真实触摸轨迹提供帧间隔，避免浏览器把连续事件合并为一次点击。
            await page.waitForTimeout(16)
          }
          await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        }
      } else {
        await page.mouse.move(point.x, point.y)
        await page.mouse.wheel(0, distance)
      }
    }

    await scroll(3000)
    await expect(lastTag).toBeInViewport({ ratio: 1, timeout: 5000 })
    await expect(page.locator('.translation')).toBeInViewport({ ratio: 1 })
    const bottomSpace = await lastTag.evaluate((element) => innerHeight - element.getBoundingClientRect().bottom)
    expect(bottomSpace).toBeGreaterThanOrEqual(20)
    await expect(page.getByRole('button', { name: '返回', exact: true })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath('detail-bottom.png') })

    await scroll(-3000)
    await expect(page.locator('.font-comparison')).toBeInViewport({ ratio: 1 })
    await page.getByRole('button', { name: '收藏当前文字', exact: true }).click()
    await expect(page.getByRole('button', { name: '取消收藏当前文字', exact: true })).toHaveAttribute('aria-pressed', 'true')
  })
}
