import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPdfTextBridge } from './pdfTextBridge'
import { extractPdfRawText, parsePdfBuffer } from './bookLoader'

afterEach(() => vi.useRealTimers())

describe('PDF text bridge', () => {
  it('queues binary requests and ignores stale responses', async () => {
    const send = vi.fn()
    const bridge = createPdfTextBridge(send, () => 'binary-base64')
    const first = bridge.extract(new ArrayBuffer(2))
    const second = bridge.extract(new ArrayBuffer(4))
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenLastCalledWith({ id: 1, base64: 'binary-base64' })
    bridge.handleResult({ id: 99, text: 'stale' })
    bridge.handleResult({ id: 1, text: '第一页' })
    await expect(first).resolves.toBe('第一页')
    expect(send).toHaveBeenLastCalledWith({ id: 2, base64: 'binary-base64' })
    bridge.handleResult({ id: 2, text: '第二页' })
    await expect(second).resolves.toBe('第二页')
    bridge.dispose()
  })

  it('rejects timed-out requests and allows a retry', async () => {
    vi.useFakeTimers()
    const bridge = createPdfTextBridge(vi.fn(), () => 'base64', 100)
    const pending = expect(bridge.extract(new ArrayBuffer(1))).rejects.toThrow('超时')
    await vi.advanceTimersByTimeAsync(100)
    await pending
    const retry = bridge.extract(new ArrayBuffer(1))
    bridge.handleResult({ id: 2, text: '重试成功' })
    await expect(retry).resolves.toBe('重试成功')
    bridge.dispose()
  })

  it('rejects active and queued requests when the page closes', async () => {
    const bridge = createPdfTextBridge(vi.fn(), () => 'base64')
    const first = expect(bridge.extract(new ArrayBuffer(1))).rejects.toThrow('已关闭')
    const second = expect(bridge.extract(new ArrayBuffer(1))).rejects.toThrow('已关闭')
    bridge.dispose()
    await Promise.all([first, second])
    await expect(bridge.extract(new ArrayBuffer(1))).rejects.toThrow('已关闭')
  })

  it('returns extraction errors without creating a PDF worker in the service', async () => {
    const bridge = createPdfTextBridge(vi.fn(), () => 'base64')
    const pending = expect(bridge.extract(new ArrayBuffer(1))).rejects.toThrow('文件损坏')
    bridge.handleResult({ id: 1, error: '文件损坏' })
    await pending
    bridge.dispose()
  })

  it('uses returned text for raw uploads and paginated reading', async () => {
    const extract = vi.fn(async () => '第一行文字\n第二行内容')
    const buffer = new ArrayBuffer(8)
    const result = await parsePdfBuffer(buffer, 'pdf-book', 8, extract)
    expect(result.rows.map((row) => row.text)).toEqual(['第一行文字', '第二行内容'])
    expect(result.totalChars).toBe(10)
    expect(await extractPdfRawText(buffer, 'upload', extract)).toBe(result.rawText)
    expect(extract).toHaveBeenCalledWith(buffer)
  })
})
