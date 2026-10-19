import type { PdfTextRequest } from '../reading/pdfTextBridge'

declare module 'vue' {
  interface ComponentCustomProperties {
    /** uni-app 编译器注入的 renderjs 模块，vue-tsc 不会解析 lang="renderjs"。 */
    readonly pdfText: {
      onRequest: (request: PdfTextRequest | null, previous: PdfTextRequest | null, ownerInstance: {
        callMethod: (method: string, result: unknown) => void
      }) => Promise<void>
    }
  }
}
