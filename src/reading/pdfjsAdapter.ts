import { GlobalWorkerOptions, getDocument, version } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

export { GlobalWorkerOptions, getDocument, version, workerSrc }

function ensureGlobalUrl(): void {
  try {
    // uni-app WebView \u6216\u90E8\u5206\u73AF\u5883\u4E2D URL \u53EA\u5728 window \u4E0A\uFF0CglobalThis.URL \u4E3A undefined\uFF0C\u4F1A\u5BFC\u81F4 pdfjs \u5185 new URL \u629B URL is not defined
    if (typeof globalThis !== 'undefined' && typeof (globalThis as unknown as { URL?: unknown }).URL === 'undefined') {
      const winUrl = typeof window !== 'undefined' ? (window as unknown as { URL?: unknown }).URL : undefined
      if (winUrl) {
        ;(globalThis as unknown as { URL: unknown }).URL = winUrl
      }
    }
  } catch {}
  try {
    if (typeof globalThis !== 'undefined' && typeof (globalThis as unknown as { URL?: unknown }).URL === 'undefined') {
      // \u6781\u7AEF\u517C\u5BB9\uFF1A\u63D0\u4F9B\u6700\u5C0F\u5B9E\u73B0\u9632\u6B62 ReferenceError\uFF0C\u8BA9 pdfjs \u5185\u90E8\u7684 try/catch \u80FD\u6B63\u5E38\u56DE\u9000\u5230 fake worker
      class FallbackURL {
        href: string
        origin: string
        protocol: string
        constructor(url: string, base?: string) {
          const str = String(url)
          this.href = base ? String(base) + str : str
          this.protocol = str.startsWith('https:') ? 'https:' : str.startsWith('http:') ? 'http:' : 'http:'
          this.origin = 'null'
          try {
            if (str.startsWith('http://') || str.startsWith('https://')) {
              const idx = str.indexOf('/', 8)
              this.origin = idx > 0 ? str.slice(0, idx) : str
            }
          } catch {}
        }
        static createObjectURL() {
          return ''
        }
        static revokeObjectURL() {}
      }
      ;(globalThis as unknown as { URL: unknown }).URL = FallbackURL as unknown
    }
  } catch {}
  try {
    const GUrl = (globalThis as unknown as { URL?: { createObjectURL?: unknown; revokeObjectURL?: unknown } }).URL
    if (GUrl && typeof GUrl.createObjectURL !== 'function') {
      ;(GUrl as unknown as { createObjectURL: () => string }).createObjectURL = () => ''
    }
    if (GUrl && typeof GUrl.revokeObjectURL !== 'function') {
      ;(GUrl as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {}
    }
    if (typeof globalThis !== 'undefined' && typeof (globalThis as unknown as { Blob?: unknown }).Blob === 'undefined' && typeof window !== 'undefined' && (window as unknown as { Blob?: unknown }).Blob) {
      ;(globalThis as unknown as { Blob: unknown }).Blob = (window as unknown as { Blob: unknown }).Blob
    }
  } catch {}
}

export function ensurePdfGlobalPolyfill(): void {
  ensureGlobalUrl()
}

/**
 * \u914D\u7F6E pdf.js Worker\uFF0C\u517C\u5BB9 H5 \u624B\u673A\u7AEF\u4E0E App-plus \u73AF\u5883\u3002
 * - H5\uFF08\u5305\u62EC\u79FB\u52A8\u6D4F\u89C8\u5668\uFF09\uFF1A\u8BBE\u7F6E workerSrc \u4E3A Vite \u53D1\u51FA\u7684 /assets/pdf.worker-*.mjs\uFF0C\u786E\u4FDD getDocument \u80FD\u5728\u6D4F\u89C8\u5668\u7EBF\u7A0B\u4E2D\u89E3\u6790
 * - App-plus\uFF08HTML5+ Runtime\uFF09\uFF1AWebWorker \u901A\u8FC7 URL \u52A0\u8F7D\u4E0D\u53EF\u9760\uFF0C\u8BE5\u73AF\u5883\u4E0B\u5E94\u7981\u7528 Worker\uFF0C\u8C03\u7528\u65B9\u9700\u4F7F\u7528\u517C\u5BB9\u540E\u9000
 */
export function configurePdfWorker(): void {
  ensureGlobalUrl()
  // App-plus \u73AF\u5883\uFF1A\u4E0D\u8BBE\u7F6E workerSrc\uFF0C\u8BA9\u8C03\u7528\u65B9\u4F7F\u7528 fake worker \u540E\u9000
  // \u901A\u8FC7 typeof plus \u5224\u65AD\uFF0C\u907F\u514D\u5728 H5 \u52A0\u8F7D\u5931\u8D25
  const isPlus = typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
  if (isPlus) return
  if (typeof window === 'undefined') return
  if (GlobalWorkerOptions.workerSrc) return
  try {
    GlobalWorkerOptions.workerSrc = workerSrc
  } catch {
    // \u5FFD\u7565\u8BBE\u7F6E\u5931\u8D25\uFF0C\u8C03\u7528\u65B9\u4F1A\u5C1D\u8BD5 fake worker \u540E\u9000
  }
}

export function isPlusEnvironment(): boolean {
  return typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
}
