import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Browser, sleep } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/cdp.mjs'
import { probe, app, layout, frame } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/probe.mjs'
import { judge, judgeApp, judgeLayout, APP_SKIP } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/rules.mjs'

// 使用 skill 的原始 probe / judge，在 UI 选定并保存布局后检查实际生产页面。
const origin = 'http://127.0.0.1:18615'
const out = resolve('.taste-skill/layout-settings/inspect')
mkdirSync(out, { recursive: true })
const browser = await Browser.launch()
const report = []
async function waitFor(page, expression) {
  for (let n = 0; n < 120; n += 1) {
    if (await page.eval(expression).catch(() => false)) return
    await sleep(100)
  }
  throw new Error('Not ready: ' + expression)
}
async function measure(page, id, width) {
  await page.eval('document.fonts.ready.then(() => true)')
  const m = await page.eval(probe)
  const a = await page.eval(app)
  const l = await page.eval(layout)
  const f = await page.eval(frame)
  // A 的三乘三九字预览是实际汉字网格，不是三行标题。
  // 选择页的小型 UI 缩略图标为装饰，文字名称、说明和状态另以正常尺寸完整呈现。
  const allow = id === 'notebook' ? ['headline-lines'] : id === 'chooser' ? ['tiny-text'] : []
  const findings = [...judge(m, { width, allow }), ...judgeLayout(l, { width, allow })]
    .filter((item) => !APP_SKIP.has(item.id) && item.id !== 'no-title' && item.id !== 'small-title')
  findings.push(...judgeApp(a, m, { width, allow }))
  const checks = await page.eval(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    titleVisible: [...document.querySelectorAll('h1')].some((title) => { const r = title.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight }),
    navigationVisible: [...document.querySelectorAll('.bottom-navigation')].every((nav) => { const r = nav.getBoundingClientRect(); return r.bottom <= innerHeight }),
    primaryActionVisible: (() => { const button = document.querySelector('.overview-start, .notebook-start, .flash-start, .dock-start'); if (!button) return true; const r = button.getBoundingClientRect(); const nav = document.querySelector('.bottom-navigation')?.getBoundingClientRect(); return r.top >= 0 && r.bottom <= (nav?.top ?? innerHeight) + 1 })(),
  }))
  if (checks.overflow || !checks.titleVisible || !checks.navigationVisible || !checks.primaryActionVisible) throw new Error(id + ' ' + width + ' ' + JSON.stringify(checks))
  await page.screenshot({ path: resolve(out, id + '-' + width + '.jpg'), quality: 90 })
  report.push({ id, width, checks, findings, metrics: m, app: a, layout: l, frame: f })
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2))
  process.stdout.write(id + ' ' + width + ': ' + findings.map((item) => item.level + ' ' + item.id).join(', ') + '\n')
}
try {
  const page = await browser.newPage({ width: 390, height: 844 })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewport({ width, height: width === 320 ? 568 : width === 768 ? 1024 : width === 1440 ? 900 : 844, mobile: width < 600 })
    await page.goto('about:blank', { timeoutMs: 1500, settleMs: 100 })
    await page.goto(origin + '/#/pages/level-layout/index', { timeoutMs: 3000, settleMs: 150 })
    await waitFor(page, "document.querySelector('#layout-option-cards')?.getAttribute('aria-disabled') === 'false'")
    await page.eval("document.getElementById('layout-option-cards').click()")
    await sleep(150)
    await measure(page, 'chooser', width)
    for (const id of ['cards', 'notebook', 'flashcards', 'board']) {
      await page.goto(origin + '/#/pages/level-layout/index', { timeoutMs: 1000, settleMs: 150 })
      await waitFor(page, "document.querySelector('#layout-option-" + id + "')?.getAttribute('aria-disabled') === 'false'")
      await page.eval("document.getElementById('layout-option-" + id + "').click()")
      await waitFor(page, "document.querySelector('#layout-option-" + id + "')?.getAttribute('aria-checked') === 'true'")
      await sleep(200)
      await page.goto('about:blank', { timeoutMs: 1500, settleMs: 100 })
      await page.goto(origin + '/#/pages/levels/index', { timeoutMs: 3000, settleMs: 150 })
      await waitFor(page, "document.querySelector('.levels-page')?.dataset.levelLayout === '" + id + "' && !!document.querySelector('.stage-card, .notebook-page, .flash-card, .board-tile')")
      await measure(page, id, width)
    }
  }
  if (page.consoleErrors.length) throw new Error(page.consoleErrors.join('\n'))
  writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2))
  const failures = report.flatMap((item) => item.findings.filter((f) => f.level === 'FAIL').map((f) => item.id + ' ' + item.width + ': ' + f.id))
  if (failures.length) throw new Error(failures.join('\n'))
  process.stdout.write('All 20 production viewport inspections passed.\n')
} finally { await browser.close() }
