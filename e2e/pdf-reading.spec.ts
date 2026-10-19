import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

for (const output of ['build', 'dev']) {
  test(`App ${output} renderjs extracts real PDF text offline from local files`, async ({ page, context }) => {
    const appDirectory = output === 'dev' ? 'app-plus' : 'app'
    const service = await readFile(path.resolve(`dist/${output}/${appDirectory}/app-service.js`), 'utf8')
    expect(service).not.toContain('WorkerMessageHandler')
    expect(service).not.toContain('pdfjsWorker')
    await context.setOffline(true)
    await page.addInitScript(() => {
      Reflect.deleteProperty(window, 'structuredClone')
      // App 路径应使用已经打包的解析器，禁止 Worker 另行加载模块。
      window.Worker = class { constructor() { throw new Error('Unexpected worker') } } as typeof Worker
    })
    await page.goto(`${pathToFileURL(path.resolve('e2e/fixtures/pdf-webview.html')).href}?output=${output}`)
    for (const file of ['sample-english.pdf', '《曾国藩家书》全集.pdf']) {
      const base64 = (await readFile(path.resolve('src/static/books', file))).toString('base64')
      const result = await page.evaluate(async (base64) => {
        const view = window as unknown as {
          __renderjsModules: Record<string, { default: { methods: {
            onRequest: (request: { id: number; base64: string }, previous: null, owner: {
              callMethod: (name: string, result: { text?: string; error?: string }) => void
            }) => Promise<void>
          } } }>
        }
        const module = Object.values(view.__renderjsModules)[0].default
        return await new Promise<{ text?: string; error?: string }>((resolve) => {
          void module.methods.onRequest({ id: 1, base64 }, null, { callMethod: (_name, result) => resolve(result) })
        })
      }, base64)
      expect(result.error).toBeUndefined()
      if (file === 'sample-english.pdf') expect(result.text).toContain('Duizhao Reading Sample')
      else {
        expect(result.text).toContain('曾国藩')
        expect(result.text!.length).toBeGreaterThan(10_000)
      }
    }
  })
}

test('mobile reader extracts and displays builtin and uploaded PDFs', async ({ page }, testInfo) => {
  await page.goto('/#/pages/reading/index')
  await page.getByRole('button', { name: 'sample-english', exact: true }).click()
  await expect(page.locator('.reading-table-wrap')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.reading-row').first()).toContainText('Duizhao')
  await expect(page.locator('.state-card--error')).toHaveCount(0)

  await page.reload()
  await expect(page.locator('.library-view')).toBeVisible()
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '上传文件', exact: true }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'uploaded.pdf',
    mimeType: 'application/pdf',
    buffer: await readFile(path.resolve('src/static/books/sample-english.pdf')),
  })
  await page.getByRole('tab', { name: /我的上传/ }).click()
  await page.getByRole('button', { name: 'uploaded', exact: true }).click()
  await expect(page.locator('.reading-row').first()).toContainText('Duizhao')
  await expect(page.locator('.state-card--error')).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('pdf-reading-mobile.png') })
})
