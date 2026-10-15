import { expect, test } from '@playwright/test'

test('方正小篆体通过全局 family 完成加载', async ({ page }) => {
  await page.goto('/')

  const loadResult = await page.evaluate(async () => {
    const declaration = '48px "builtin-q5yuss"'
    const faces = await document.fonts.load(declaration, '永篆')
    return {
      faceCount: faces.length,
      isReady: document.fonts.check(declaration, '永篆'),
    }
  })

  expect(loadResult.faceCount).toBeGreaterThan(0)
  expect(loadResult.isReady).toBe(true)
})
