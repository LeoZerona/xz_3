// adb forward tcp:19223 localabstract:webview_devtools_remote_<HBuilder PID>
import { writeFile } from 'node:fs/promises'

const deadline = setTimeout(() => {
  console.error('Android WebView 检查超时，请确认手机已解锁并停留在阅读页')
  process.exit(1)
}, 60_000)
const targets = await (await fetch('http://127.0.0.1:19223/json/list')).json()
const target = targets.find((page) => page.title.startsWith('pages/reading/index'))
if (!target) throw new Error('手机尚未打开当前项目的阅读页面')
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})
let nextId = 0
const pending = new Map()
socket.addEventListener('message', ({ data }) => {
  const response = JSON.parse(data)
  const callback = pending.get(response.id)
  if (callback) {
    pending.delete(response.id)
    if (response.error) callback.reject(new Error(response.error.message))
    else callback.resolve(response.result)
  }
})
async function command(method, params) {
  const id = ++nextId
  const response = new Promise((resolve, reject) => { pending.set(id, { resolve, reject }) })
  socket.send(JSON.stringify({ id, method, params }))
  return response
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}
async function waitFor(expression) {
  const started = Date.now()
  while (Date.now() - started < 20_000) {
    const value = await evaluate(expression)
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error(`手机页面等待超时：${expression}`)
}
async function openLibrary() {
  if (await evaluate(`Boolean(document.querySelector('.library-view'))`)) return
  await evaluate(`document.querySelector('.reader-content-inner')?.click()`)
  await waitFor(`Boolean(document.querySelector('.top-back-btn'))`)
  await evaluate(`document.querySelector('.top-back-btn').click()`)
  await waitFor(`Boolean(document.querySelector('.library-view'))`)
}
try {
  console.log(JSON.stringify(await evaluate(`({
    userAgent: navigator.userAgent,
    structuredClone: typeof structuredClone,
    cards: Array.from(document.querySelectorAll('.book-card')).map(card => card.getAttribute('aria-label')),
    rows: document.querySelectorAll('.reading-row').length,
    error: document.querySelector('.state-card--error')?.textContent,
    text: document.querySelector('.reading-table-wrap')?.textContent?.slice(0, 400)
  })`), null, 2))
  if (process.argv.includes('--verify')) {
    for (const book of ['sample-english', '《曾国藩家书》全集']) {
      await openLibrary()
      await evaluate(`document.querySelector('.book-card[aria-label=${JSON.stringify(book)}]').click()`)
      await waitFor(`document.querySelector('.state-card--error')?.textContent || document.querySelector('.reading-table-wrap')?.textContent`)
      const result = await evaluate(`({
        error: document.querySelector('.state-card--error')?.textContent,
        rows: document.querySelectorAll('.reading-row').length,
        text: document.querySelector('.reading-table-wrap')?.textContent?.slice(0, 250)
      })`)
      if (result.error || !result.rows) throw new Error(JSON.stringify(result))
      console.log(JSON.stringify({ book, ...result }))
    }
    const screenshot = await command('Page.captureScreenshot', { format: 'png' })
    await writeFile('test-results/android-pdf-reading.png', Buffer.from(screenshot.data, 'base64'))
  }
} finally {
  clearTimeout(deadline)
  socket.close()
}
