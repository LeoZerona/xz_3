import { GlobalWorkerOptions, getDocument, version } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

export { GlobalWorkerOptions, getDocument, version, workerSrc }

/**
 * \u914d\u7f6e pdf.js Worker\uff0c\u517c\u5bb9 H5 \u624b\u673a\u7aef\u4e0e App-plus \u73af\u5883\u3002
 * - H5\uff08\u5305\u62ec\u79fb\u52a8\u6d4f\u89c8\u5668\uff09\uff1a\u8bbe\u7f6e workerSrc \u4e3a Vite \u53d1\u51fa\u7684 /assets/pdf.worker-*.mjs\uff0c\u786e\u4fdd getDocument \u80fd\u5728\u6d4f\u89c8\u5668\u7ebf\u7a0b\u4e2d\u89e3\u6790
 * - App-plus\uff08HTML5+ Runtime\uff09\uff1aWebWorker \u901a\u8fc7 URL \u52a0\u8f7d\u4e0d\u53ef\u9760\uff0c\u8be5\u73af\u5883\u4e0b\u5e94\u7981\u7528 Worker\uff0c\u8c03\u7528\u65b9\u9700\u4f7f\u7528 disableWorker \u540e\u9000
 */
export function configurePdfWorker(): void {
  // App-plus \u73af\u5883\uff1a\u4e0d\u8bbe\u7f6e workerSrc\uff0c\u8ba9\u8c03\u7528\u65b9\u4f7f\u7528 disableWorker
  // \u901a\u8fc7 typeof plus \u5224\u65ad\uff0c\u907f\u514d\u5728 H5 \u52a0\u8f7d\u5931\u8d25
  const isPlus = typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
  if (isPlus) return
  if (typeof window === 'undefined') return
  if (GlobalWorkerOptions.workerSrc) return
  try {
    GlobalWorkerOptions.workerSrc = workerSrc
  } catch {
    // \u5ffd\u7565\u8bbe\u7f6e\u5931\u8d25\uff0c\u8c03\u7528\u65b9\u4f1a\u5c1d\u8bd5 disableWorker \u540e\u9000
  }
}

export function isPlusEnvironment(): boolean {
  return typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
}
