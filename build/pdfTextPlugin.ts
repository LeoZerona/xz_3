import { build, type Plugin } from 'vite'
import { createRequire } from 'node:module'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

/** 生成普通脚本：在 App WebView 中可离线加载，没有运行时 ESM/worker 导入。 */
export function pdfTextPlugin(): Plugin {
  const require = createRequire(import.meta.url)
  const pdfRoot = path.dirname(require.resolve('pdfjs-dist/package.json'))
  let parser: Promise<string> | undefined

  function buildParser(): Promise<string> {
    parser ??= build({
      configFile: false,
      publicDir: false,
      logLevel: 'error',
      resolve: {
        alias: {
          canvas: path.resolve('src/utils/emptyShim.ts'),
          path2d: path.resolve('src/utils/emptyShim.ts'),
        },
      },
      build: {
        target: 'es2018',
        write: false,
        lib: { entry: path.resolve('src/reading/pdfTextBrowser.ts'), name: 'ReadingPdfText', formats: ['iife'] },
        rollupOptions: { output: { inlineDynamicImports: true } },
      },
    }).then((result) => {
      const outputs = Array.isArray(result) ? result : [result]
      for (const output of outputs) {
        if (!('output' in output)) continue
        const chunk = output.output.find((item) => item.type === 'chunk' && item.isEntry)
        if (chunk?.type === 'chunk') return chunk.code
      }
      throw new Error('PDF 文字提取脚本构建失败')
    })
    return parser
  }

  return {
    name: 'pdf-text-webview-parser',
    async buildStart() {
      this.addWatchFile(path.resolve('src/reading/pdfTextBrowser.ts'))
      this.addWatchFile(path.resolve('src/utils/polyfills.ts'))
      if (this.meta.watchMode) parser = undefined
      const source = await buildParser()
      this.emitFile({ type: 'asset', fileName: 'static/pdf/pdf-text-parser.js', source })
      this.emitFile({ type: 'asset', fileName: 'static/pdf/LICENSE', source: await readFile(path.join(pdfRoot, 'LICENSE')) })
      for (const folder of ['cmaps', 'standard_fonts']) {
        for (const file of await readdir(path.join(pdfRoot, folder))) {
          if (!/\.(bcmap|pfb|ttf)$/.test(file) && !file.startsWith('LICENSE')) continue
          this.emitFile({ type: 'asset', fileName: `static/pdf/${folder}/${file}`, source: await readFile(path.join(pdfRoot, folder, file)) })
        }
      }
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = request.url?.split('?')[0] ?? ''
        try {
          if (url === '/static/pdf/pdf-text-parser.js') {
            response.setHeader('Content-Type', 'text/javascript')
            response.end(await buildParser())
            return
          }
          const resource = /^\/static\/pdf\/(cmaps|standard_fonts)\/([\w.-]+)$/.exec(url)
          if (resource) {
            response.end(await readFile(path.join(pdfRoot, resource[1], resource[2])))
            return
          }
          next()
        } catch (error) {
          next(error)
        }
      })
    },
  }
}
