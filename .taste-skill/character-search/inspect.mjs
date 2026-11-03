import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Browser, sleep } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/cdp.mjs'
import { probe, app, layout } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/probe.mjs'
import { judge, judgeApp, judgeLayout, APP_SKIP } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/rules.mjs'

const out = resolve('.taste-skill/character-search/inspect')
mkdirSync(out, { recursive: true })
const browser = await Browser.launch()
const report = []
async function ready(page, expression) {
  for (let count = 0; count < 100; count++) {
    if (await page.eval(expression).catch(() => false)) return
    await sleep(100)
  }
  throw new Error('Page not ready: ' + expression)
}
try {
  const page = await browser.newPage({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:18615/#/pages/character-compare/index', { timeoutMs: 10000, settleMs: 200 })
  await ready(page, "document.querySelector('.compare-add')?.getAttribute('disabled') === null && !!document.querySelector('.compare-example')")
  await page.eval("document.querySelector('.compare-example').click()")
  await ready(page, "document.querySelectorAll('.comparison-glyph').length === 6")
  await page.eval('document.fonts.ready.then(() => true)')
  for (const width of [320, 390, 1440]) {
    await page.setViewport({ width, height: width === 320 ? 568 : width === 390 ? 844 : 900, mobile: width < 600 })
    await sleep(200)
    const m = await page.eval(probe)
    const a = await page.eval(app)
    const l = await page.eval(layout)
    // 字体比较本身需要 UI、学习字体与对照字体；大字是字形数据，不是标题。
    const allow = ['font-count', 'headline-lines']
    const findings = [...judge(m, { width, allow }), ...judgeLayout(l, { width, allow })]
      .filter((finding) => !APP_SKIP.has(finding.id) && finding.id !== 'no-title' && finding.id !== 'small-title')
    findings.push(...judgeApp(a, m, { width, allow }))
    const checks = await page.eval(() => ({
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
      glyphs: [...document.querySelectorAll('.matrix-font-row')].map((row) => [...row.children].map((glyph) => Math.round(glyph.getBoundingClientRect().left))),
      smallTargets: [...document.querySelectorAll('button, uni-button')].filter((button) => { const r = button.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44) }).map((button) => button.className),
    }))
    if (checks.pageOverflow || checks.smallTargets.length || JSON.stringify(checks.glyphs[0]) !== JSON.stringify(checks.glyphs[1])) throw new Error(JSON.stringify(checks))
    await page.screenshot({ path: resolve(out, 'comparison-' + width + '.jpg'), quality: 90, fullPage: true })
    report.push({ width, checks, findings, metrics: m, app: a, layout: l })
    writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2))
    process.stdout.write(width + ': ' + findings.map((finding) => finding.level + ' ' + finding.id).join(', ') + '\n')
  }
  if (page.consoleErrors.length) throw new Error(page.consoleErrors.join('\n'))
  if (report.some((result) => result.findings.some((finding) => finding.level === 'FAIL'))) throw new Error('Inspector reported failures')
  process.stdout.write('Phone and desktop comparison checks passed.\n')
} finally { await browser.close() }
