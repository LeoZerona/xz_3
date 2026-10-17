import { expect, test } from '@playwright/test'

test('mobile levels load in batches and open a stage', async ({ page }) => {
  await page.goto('/#/pages/levels/index')

  await expect(page.locator('.stage-card')).toHaveCount(24)
  await expect(page.locator('.load-more-stages')).toContainText('已显示 24/256')

  await page.locator('.load-more-stages').click()
  await expect(page.locator('.stage-card')).toHaveCount(48)
  await expect(page.locator('.load-more-stages')).toContainText('已显示 48/256')

  await page.locator('.stage-card').first().click()
  await expect(page).toHaveURL(/\/pages\/level-study\/index\?category=level1&stageId=level1-stage-01/)
  await expect(page.locator('.prompt-character')).toBeVisible()
})
