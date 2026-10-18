import { GlobalWorkerOptions, getDocument, version } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'

export { GlobalWorkerOptions, getDocument, version, workerSrc }

/**
 * 配置 pdf.js Worker，兼容 H5 手机端与 App-plus 环境。
 * - H5（包括移动浏览器）：设置 workerSrc 为 Vite 发出的 /assets/pdf.worker-*.mjs，确保 getDocument 能在浏览器线程中解析
 * - App-plus（HTML5+ Runtime）：WebWorker 通过 URL 加载不可靠，该环境下应禁用 Worker，调用方需使用 disableWorker 后退
 */
export function configurePdfWorker(): void {
  // App-plus 环境：不设置 workerSrc，让调用方使用 disableWorker
  // 通过 typeof plus 判断，避免在 H5 加载失败
  const isPlus = typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
  if (isPlus) return
  if (typeof window === 'undefined') return
  if (GlobalWorkerOptions.workerSrc) return
  try {
    GlobalWorkerOptions.workerSrc = workerSrc
  } catch {
    // 忽略设置失败，调用方会尝试 disableWorker 后退
  }
}

export function isPlusEnvironment(): boolean {
  return typeof (globalThis as unknown as { plus?: unknown }).plus !== 'undefined'
}