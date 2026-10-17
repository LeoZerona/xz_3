import { defineConfig, type Plugin } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const uniH5Package = require.resolve("@dcloudio/uni-h5/package.json");
const vueRouterEntry = require.resolve("vue-router/dist/vue-router.mjs", {
  paths: [uniH5Package],
});

function inlineAppDynamicImports(): Plugin {
  return {
    name: "inline-app-dynamic-imports",
    enforce: "post",
    configResolved(config) {
      if (process.env.UNI_PLATFORM !== "app") return;

      const output = config.build.rollupOptions.output;
      if (Array.isArray(output)) {
        output.forEach((item) => {
          delete item.manualChunks;
          item.inlineDynamicImports = true;
        });
      } else if (output) {
        delete output.manualChunks;
        output.inlineDynamicImports = true;
      } else {
        config.build.rollupOptions.output = { inlineDynamicImports: true };
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni(), inlineAppDynamicImports()],
  resolve: {
    alias: [{ find: /^vue-router$/, replacement: vueRouterEntry }],
  },
  css: {
    // 修复 Dart Sass legacy-js-api 警告：Vite 5.2 内部使用 sass.render（legacy API）
    // Vite >=5.4/6 会识别 api: "modern-compiler" 自动切换到 compileStringAsync
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        silenceDeprecations: ["legacy-js-api"],
      } as any,
      sass: {
        api: "modern-compiler",
        silenceDeprecations: ["legacy-js-api"],
      } as any,
    },
  },
});
