import { Page, sleep } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/cdp.mjs'

// 内置离线字库首次导入需要数秒；检查用户实际得到的就绪页面。
const goto = Page.prototype.goto
Page.prototype.goto = async function (...args) {
  const result = await goto.apply(this, args)
  for (let attempt = 0; attempt < 100; attempt++) {
    const ready = await this.eval(`Boolean(document.querySelector('.review-page') && !document.querySelector('.database-overlay') && (document.querySelector('.review-glyph') || document.querySelector('.review-state')))`)
    if (ready) return result
    await sleep(200)
  }
  throw new Error('复习页面未在 20 秒内就绪')
}
await import('file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/inspect.mjs')
