// PDF.js 4.x 在旧版 Android WebView (< Chrome 119) 上会因 Promise.withResolvers 未定义而崩溃。
// legacy 构建自带 core-js polyfill，但为保险（包括后续若切回标准构建），此处提供显式兜底。
// 必须在任何 pdfjs 导入之前执行，因此在 main.ts 顶部最先引入。

if (typeof Promise !== 'undefined' && typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !== 'function') {
  ;(Promise as unknown as { withResolvers: <T>() => { promise: Promise<T>; resolve: (value: T | PromiseLike<T>) => void; reject: (reason?: unknown) => void } }).withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}
