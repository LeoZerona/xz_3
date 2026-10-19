export type PdfTextExtractor = (buffer: ArrayBuffer) => Promise<string>

export interface PdfTextRequest {
  id: number
  base64: string
}

interface PendingRequest {
  id: number
  buffer: ArrayBuffer
  resolve: (text: string) => void
  reject: (error: Error) => void
}

export interface PdfTextBridgeApi {
  extract: PdfTextExtractor
}

/** 每个阅读页独立排队，避免同一 tick 的 prop 更新覆盖请求。 */
export function createPdfTextBridge(
  send: (request: PdfTextRequest | null) => void,
  encode: (buffer: ArrayBuffer) => string,
  timeoutMs = 120_000,
) {
  const queue: PendingRequest[] = []
  let active: PendingRequest | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let nextId = 0
  let disposed = false

  function finish(error?: Error, text = ''): void {
    if (!active) return
    const request = active
    active = undefined
    clearTimeout(timer)
    send(null)
    if (error) request.reject(error)
    else request.resolve(text)
    startNext()
  }

  function startNext(): void {
    if (disposed || active || !queue.length) return
    active = queue.shift()!
    timer = setTimeout(() => finish(new Error('PDF 文字提取超时，请重试或选择较小的文件')), timeoutMs)
    try {
      send({ id: active.id, base64: encode(active.buffer) })
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)))
    }
  }

  const extract: PdfTextExtractor = (buffer) => new Promise((resolve, reject) => {
    if (disposed) {
      reject(new Error('阅读页面已关闭'))
      return
    }
    queue.push({ id: ++nextId, buffer, resolve, reject })
    startNext()
  })

  function handleResult(result: unknown): void {
    if (!active || !result || typeof result !== 'object') return
    const message = result as { id?: unknown; text?: unknown; error?: unknown }
    if (message.id !== active.id) return
    if (typeof message.error === 'string') finish(new Error(message.error))
    else if (typeof message.text === 'string') finish(undefined, message.text)
    else finish(new Error('PDF 文字提取返回了无效数据'))
  }

  function dispose(): void {
    disposed = true
    clearTimeout(timer)
    const requests = active ? [active, ...queue] : [...queue]
    active = undefined
    queue.length = 0
    send(null)
    for (const request of requests) request.reject(new Error('阅读页面已关闭'))
  }

  return { extract, handleResult, dispose }
}
