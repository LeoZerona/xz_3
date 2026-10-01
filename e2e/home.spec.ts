import { expect, test } from '@playwright/test'

test('手机首页显示计划，完成状态刷新后仍保留', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('今天要做的事')).toBeVisible()
  await expect(page.getByText('今日进度')).toBeVisible()
  await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: true })
  const firstTask = page.getByText('写下今天的三个重点')
  await firstTask.click()
  await expect(page.getByText('1 / 3')).toBeVisible()
  await page.reload()
  await expect(page.getByText('1 / 3')).toBeVisible()
})
