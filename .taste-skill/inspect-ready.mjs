// The catalog imports into IndexedDB on first use. Measure the loaded screen,
// while keeping the inspector's own layout and contrast checks unchanged.
import { Page, sleep } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/cdp.mjs'
const goto = Page.prototype.goto
Page.prototype.goto = async function (url, options) {
  const result = await goto.call(this, url, options)
  if (/^https?:/.test(url)) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (await this.eval("document.querySelectorAll('.stage-card').length > 0 && !document.querySelector('.database-overlay')")) return result
      await sleep(250)
    }
    throw new Error('Level catalog did not become ready within 30 seconds')
  }
  return result
}
await import('file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/inspect.mjs')
