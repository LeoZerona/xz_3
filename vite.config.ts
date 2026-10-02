import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const uniH5Package = require.resolve("@dcloudio/uni-h5/package.json");
const vueRouterEntry = require.resolve("vue-router/dist/vue-router.mjs", {
  paths: [uniH5Package],
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: [{ find: /^vue-router$/, replacement: vueRouterEntry }],
  },
});
