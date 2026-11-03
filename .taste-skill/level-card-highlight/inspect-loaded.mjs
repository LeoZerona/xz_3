import { Browser, sleep } from 'file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/lib/cdp.mjs'

// 通用检查器的等待时间短于首次导入；在检查环境等待真实关卡并准备上次学习记录。
const newPage = Browser.prototype.newPage
Browser.prototype.newPage = async function (...options) {
  const page = await newPage.apply(this, options)
  const goto = page.goto.bind(page)
  async function waitFor(selector) {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (await page.eval((value) => Boolean(document.querySelector(value)), selector)) return
      await sleep(100)
    }
    throw new Error('关卡检查等待超时：' + selector)
  }
  page.goto = async function (url, options) {
    const result = await goto(url, options)
    if (!url.includes('#/pages/levels/index')) return result
    await waitFor('.stage-card')
    await page.eval(() => new Promise((resolve, reject) => {
      const request = indexedDB.open('font-learning', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction('settings', 'readwrite')
        transaction.objectStore('settings').put({
          id: 'morning-pages:last-level-study',
          value: JSON.stringify({ category: 'level1', stageId: 'level1-stage-05', index: 5, title: '关卡 05', studiedAt: '2026-11-01T02:00:00.000Z' }),
        })
        transaction.oncomplete = () => { db.close(); resolve(true) }
        transaction.onabort = () => { db.close(); reject(transaction.error) }
      }
    }))
    // 同一个 hash URL 的 CDP 导航不会重建应用，先离开页面以便从数据库重新加载。
    await goto('about:blank', options)
    await goto(url, options)
    await waitFor('#stage-level1-stage-05.is-current')
    return result
  }
  return page
}

await import('file:///C:/Users/22640/.codex/skills/design-taste-frontend/scripts/inspect.mjs')
