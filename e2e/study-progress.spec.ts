import { expect, test } from '@playwright/test'

test('每个文字完成三种练习后才计入今日新学', async ({ page }) => {
  await page.goto('/#/pages/study-preview/index')
  await expect(page.getByText('每字需完成三种练习')).toBeVisible()
  await page.getByRole('button', { name: '开始今日学习' }).click()

  await expect(page.getByText('本字第 1/3 种')).toBeVisible()
  await page.getByRole('button', { name: '选择文字一' }).click()
  await page.getByRole('button', { name: '进入当前文字的下一种练习' }).click()

  await expect(page.getByText('本字第 2/3 种')).toBeVisible()
  await page.getByRole('button', { name: '选择文字一' }).click()
  await page.getByRole('button', { name: '进入当前文字的下一种练习' }).click()

  await expect(page.getByText('本字第 3/3 种')).toBeVisible()
  await page.locator('.answer-input input').fill('一')
  await page.getByRole('button', { name: '确认输入答案' }).click()
  await page.getByRole('button', { name: '进入下一字' }).click()

  await expect(page.getByText('本字第 1/3 种')).toBeVisible()
  await expect(page.locator('.prompt-character')).toHaveText('乙')
  await expect(page.locator('.progress-item').filter({ hasText: '今日新学' }).locator('.progress-value')).toHaveText('1/15')
})
