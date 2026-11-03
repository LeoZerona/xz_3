import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const skill = 'C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/'
const { probe, layout, app, colourShare } = await import(pathToFileURL(skill + 'probe.mjs').href)
const { judge, judgeLayout, judgeApp, APP_SKIP } = await import(pathToFileURL(skill + 'rules.mjs').href)
const output = resolve('.taste-skill/levels-polish/verified')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = []

try {
  for (const [width, height, theme] of [[320, 568, 'default'], [390, 844, 'default'], [768, 1024, 'default'], [1440, 900, 'default'], [390, 844, '墨夜']]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    if (theme !== 'default') {
      await page.goto('http://127.0.0.1:18617/#/pages/theme/index')
      await page.getByRole('radio').filter({ hasText: theme }).click()
    }
    await page.goto('http://127.0.0.1:18617/#/pages/levels/index')
    // 数据库初始化是异步的；测量可操作目录，避免把数据库准备蒙层误判为空白。
    await page.locator('.stage-card').nth(23).waitFor({ timeout: 30000 })
    await page.evaluate(() => document.fonts.ready)
    const screenshot = await page.screenshot({ path: resolve(output, `${theme}-${width}.png`) })
    const metrics = await page.evaluate(probe)
    const geometry = await page.evaluate(layout)
    const application = await page.evaluate(app)
    application.colourShare = await page.evaluate(colourShare, 'data:image/png;base64,' + screenshot.toString('base64'))
    const findings = [...judge(metrics, { width }), ...judgeLayout(geometry, { width }), ...judgeApp(application, metrics, { width })].filter((finding) => !APP_SKIP.has(finding.id))
    const spacing = await page.locator('.levels-page').evaluate((element) => {
      const tab = element.querySelector('.category-tab.is-active').getBoundingClientRect()
      const panel = element.querySelector('.levels-scroll').getBoundingClientRect()
      return { tabToScroll: panel.top - tab.bottom, overflow: document.documentElement.scrollWidth > innerWidth }
    })
    const scrollViewport = page.locator('.levels-scroll .uni-scroll-view').last()
    await scrollViewport.evaluate((element) => { element.scrollTop = 260 })
    await page.screenshot({ path: resolve(output, `${theme}-${width}-scrolled.png`) })
    report.push({ width, height, theme, spacing, errors, findings })
    console.log(JSON.stringify(report.at(-1)))
    await page.close()
  }
} finally {
  await browser.close()
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2))
}
if (report.some((result) => result.errors.length || result.spacing.overflow || result.findings.some((finding) => finding.level === 'FAIL'))) process.exitCode = 1
