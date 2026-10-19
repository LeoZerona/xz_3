// 此入口只在 WebView 中作为独立脚本运行，不进入 App service bundle。
import '../utils/polyfills'
import { getDocument, PDFWorker } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'

const scriptUrl = (document.currentScript as HTMLScriptElement | null)?.src
const resourceBase = scriptUrl ? new URL('./', scriptUrl).href : './static/pdf/'

function pageTextLines(items: TextItem[]): string[] {
  const lines: string[] = []
  let parts: string[] = []
  let previousY: number | undefined
  const hasLineEndings = items.some((item) => item.hasEOL)
  const flush = () => {
    const line = parts.join('').replace(/\uFEFF/g, '').trim()
    if (line) lines.push(line)
    parts = []
  }
  for (const item of items) {
    const y: number = item.transform[5]
    if (!hasLineEndings && previousY !== undefined && Math.abs(previousY - y) > 2) flush()
    parts.push(item.str)
    previousY = y
    if (item.hasEOL) flush()
  }
  flush()
  return lines
}

export async function extractTextFromBase64(base64: string): Promise<string> {
  const binary = atob(base64)
  const data = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) data[index] = binary.charCodeAt(index)
  // Chrome 97 没有 structuredClone，原生 MessageChannel 可完成同样的数据复制。
  const channel = new MessageChannel()
  WorkerMessageHandler.initializeFromPort(channel.port2)
  // PDF.js 实际只需要 postMessage/addEventListener；其声明将 MessagePort 限定成了 Worker。
  const worker: PDFWorker = PDFWorker.fromPort({ port: channel.port1 as unknown as Worker })
  channel.port1.start()
  channel.port2.start()
  const task = getDocument({
    data,
    worker,
    cMapUrl: `${resourceBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${resourceBase}standard_fonts/`,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
    isOffscreenCanvasSupported: false,
  })
  try {
    const pdf = await task.promise
    const lines: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      lines.push(...pageTextLines(content.items.filter((item): item is TextItem => 'str' in item)))
      page.cleanup()
    }
    if (!lines.length) throw new Error('PDF 未提取到文字，扫描版 PDF 需要先进行文字识别（OCR）')
    return lines.join('\n')
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('PDF 已加密，请先解除密码后导入')
    throw error
  } finally {
    try {
      await task.destroy()
    } finally {
      worker.destroy()
      channel.port1.close()
      channel.port2.close()
    }
  }
}
