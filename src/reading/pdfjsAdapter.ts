// 必须在 pdfjs 之前注入 Promise.withResolvers 等旧 WebView 缺口
import '../utils/polyfills'
import { GlobalWorkerOptions, getDocument, version } from 'pdfjs-dist/build/pdf.mjs'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

export { GlobalWorkerOptions, getDocument, version, workerSrc }

function ensureGlobalUrl(): void {
  try {
    if (typeof globalThis !== 'undefined' && typeof (globalThis as unknown as { URL?: unknown }).URL === 'undefined') {
      const winUrl = typeof window !== 'undefined' ? (window as unknown as { URL?: unknown }).URL : undefined
      if (winUrl) {
        ;(globalThis as unknown as { URL: unknown }).URL = winUrl
      }
    }
  } catch {}
  try {
    if (typeof globalThis !== 'undefined' && typeof (globalThis as unknown as { URL?: unknown }).URL === 'undefined') {
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
        static createObjectURL() { return '' }
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

export function configurePdfWorker(): void {
  ensureGlobalUrl()
  const isPlus = typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
  if (isPlus) return
  if (typeof window === 'undefined') return
  if (GlobalWorkerOptions.workerSrc) return
  try {
    GlobalWorkerOptions.workerSrc = workerSrc
  } catch {}
}

export function isPlusEnvironment(): boolean {
  return typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
}
