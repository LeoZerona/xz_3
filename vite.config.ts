import { defineConfig, type Plugin } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pdfTextPlugin } from './build/pdfTextPlugin'

const require = createRequire(import.meta.url)
const uniH5Package = require.resolve('@dcloudio/uni-h5/package.json')
const vueRouterEntry = require.resolve('vue-router/dist/vue-router.mjs', {
  paths: [uniH5Package],
})

function inlineAppDynamicImports(): Plugin {
  return {
    name: 'inline-app-dynamic-imports',
    enforce: 'post',
    configResolved(config) {
      if (process.env.UNI_PLATFORM !== 'app') return
      const output = config.build.rollupOptions.output
      if (Array.isArray(output)) {
        output.forEach((item) => {
          delete item.manualChunks
          item.inlineDynamicImports = true
        })
      } else if (output) {
        delete output.manualChunks
        output.inlineDynamicImports = true
      } else {
        config.build.rollupOptions.output = { inlineDynamicImports: true }
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni(), inlineAppDynamicImports(), pdfTextPlugin()],
  resolve: {
    alias: [
      { find: /^vue-router$/, replacement: vueRouterEntry },
      { find: /^@\//, replacement: path.resolve(process.cwd(), 'src') + '/' },
      // pdfjs 的可选依赖，H5/App 均不安装，浏览器环境也不需要
      { find: /^canvas$/, replacement: path.resolve(process.cwd(), 'src/utils/emptyShim.ts') },
      { find: /^path2d$/, replacement: path.resolve(process.cwd(), 'src/utils/emptyShim.ts') },
    ],
  },
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler', silenceDeprecations: ['legacy-js-api'] } as any,
      sass: { api: 'modern-compiler', silenceDeprecations: ['legacy-js-api'] } as any,
    },
  },
})
