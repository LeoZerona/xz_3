import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { Browser, sleep } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/cdp.mjs'

const root = resolve('.taste-skill/mobile-options')
const captures = resolve(root, 'captures')
mkdirSync(captures, { recursive: true })
const before = JSON.parse(readFileSync(resolve(root, 'source-before.json'), 'utf8'))
for (const [file, hash] of Object.entries(before)) {
  if (createHash('sha256').update(readFileSync(file)).digest('hex') !== hash) throw new Error('Business source changed: ' + file)
}
const browser = await Browser.launch()
const results = []
async function ready(page) {
  for (let count = 0; count < 80; count += 1) {
    if (await page.eval("document.documentElement.dataset.ready === 'true'")) return
    await sleep(100)
  }
  throw new Error('Preview did not load')
}
try {
  const page = await browser.newPage({ width: 1440, height: 1110 })
  for (const theme of ['ocean-blue', 'jade-green', 'ink-night']) {
    await page.goto('http://127.0.0.1:18624/?theme=' + theme)
    await ready(page)
    await page.screenshot({ path: resolve(captures, 'comparison-' + theme + '.jpg'), quality: 90, fullPage: true })
    const measured = await page.eval(() => ({ theme: document.documentElement.dataset.previewTheme, overflow: document.documentElement.scrollWidth > innerWidth, phones: [...document.querySelectorAll('.phone')].map((phone) => ({ width: phone.getBoundingClientRect().width, height: phone.getBoundingClientRect().height })) }))
    if (measured.overflow) throw new Error('Comparison overflows')
    results.push(measured)
  }
  await page.eval(() => { const control = document.querySelector('#theme-select'); control.value = 'sunset-orange'; control.dispatchEvent(new Event('change', { bubbles: true })) })
  if (!(await page.eval("document.documentElement.dataset.previewTheme === 'sunset-orange' && getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#e7652b'"))) throw new Error('Theme control failed')
  await page.eval(() => { const control = document.querySelector('#theme-select'); control.value = 'spring-festival'; control.dispatchEvent(new Event('change', { bubbles: true })) })
  if (!(await page.eval("document.documentElement.dataset.previewTheme === 'spring-festival' && getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() === '#c92d32'"))) throw new Error('Seasonal theme failed')
  await page.eval(() => document.getElementById('b-next').click())
  if (!(await page.eval("document.querySelector('#flash-card h2').textContent === '关卡 02'"))) throw new Error('Flash card navigation failed')
  await page.eval(() => document.querySelector('[data-board="3"]').click())
  if (!(await page.eval("document.getElementById('c-dock').textContent.includes('关卡 04')"))) throw new Error('Board selection failed')
  await page.eval(() => document.querySelector('#c-dock [data-preview]').click())
  if (!(await page.eval("document.getElementById('lesson-dialog').open && document.querySelectorAll('.dialog-character').length === 10"))) throw new Error('Lesson preview failed')
  await page.eval(() => document.getElementById('lesson-dialog').close())
  for (const concept of ['a', 'b', 'c']) {
    await page.setViewport({ width: 390, height: 844, mobile: true })
    for (const theme of ['ocean-blue', 'jade-green', 'ink-night']) {
      await page.goto('http://127.0.0.1:18624/?only=' + concept + '&theme=' + theme)
      await ready(page)
      await page.screenshot({ path: resolve(captures, concept + '-' + theme + '.jpg'), quality: 92 })
      const check = await page.eval(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, nav: document.querySelector('.concept.chosen .app-nav').getBoundingClientRect().bottom <= innerHeight, errors: [...document.querySelectorAll('.concept.chosen button')].filter((button) => { const r = button.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44) }).length }))
      if (check.overflow || !check.nav || check.errors) throw new Error('Phone layout failed: ' + concept + ' ' + theme + ' ' + JSON.stringify(check))
      results.push({ concept, theme, ...check })
    }
    await page.setViewport({ width: 320, height: 568, mobile: true })
    await page.goto('http://127.0.0.1:18624/?only=' + concept)
    await ready(page)
    if (await page.eval('document.documentElement.scrollWidth > innerWidth')) throw new Error('Small phone overflow: ' + concept)
    await page.screenshot({ path: resolve(captures, concept + '-320.jpg'), quality: 88 })
  }
  const errors = page.consoleErrors
  if (errors.length) throw new Error('Browser errors: ' + errors.join('\n'))
  writeFileSync(resolve(root, 'validation.json'), JSON.stringify({ businessSourceUnchanged: true, screenshots: 15, themeSwitch: true, flashNavigation: true, boardSelection: true, lessonPreview: true, results }, null, 2))
  process.stdout.write('Captured 3 comparisons + 9 theme/phone views + 3 narrow phone views; all interactions checked; business source unchanged.\n')
} finally {
  await browser.close()
}
