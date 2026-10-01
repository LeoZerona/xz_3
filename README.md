# 晨间计划（uni-app H5）

一个可在手机浏览器打开的 uni-app 首页，采用 Vue 3、TypeScript、Pinia、Vant、SVG、Canvas 和本地持久化。

## 环境要求

- Node.js 22 或更高版本（本项目创建和验证时使用 Node.js 24）
- pnpm 11
- 手机与开发电脑连接同一个局域网

本机安装 pnpm：

```bash
npm install -g pnpm@11
```

## 安装与启动

```bash
pnpm install
pnpm dev:h5
```

终端会输出本机局域网访问地址。在手机浏览器中打开 `http://电脑局域网 IP:终端显示的端口/`，即可看到首页。开发服务监听 `0.0.0.0`，可从同一局域网的手机访问；如无法访问，请检查电脑防火墙是否允许该端口。

常用命令：

```bash
pnpm type-check   # TypeScript 类型检查
pnpm test         # Vitest 单元测试
pnpm test:e2e     # Playwright 手机视口测试（使用本机 Google Chrome）
pnpm build:h5     # 生成 dist/build/h5
```

## 创建与安装过程

1. 从 [DCloud 的 uni-app Vue 3 + TypeScript 模板](https://github.com/dcloudio/uni-preset-vue/tree/vite-ts) 的 `vite-ts` 分支获取项目骨架，复制到当前空仓库。保留 `src/main.ts`、`src/pages.json`、`src/manifest.json`、`index.html`、`vite.config.ts` 和 TypeScript 配置。
2. 将模板的依赖精简为 H5 所需的 `@dcloudio/uni-app`、`@dcloudio/uni-components`、`@dcloudio/uni-h5`、Vue 3、Vue I18n，以及匹配该模板的 `@dcloudio/vite-plugin-uni` 和 Vite 5.2.8。所有 DCloud 构建包固定在同一个 `3.0.0-5020420260813003` 版本，避免混用编译器版本。
3. 在 `package.json` 中加入 Pinia 2.3.1、Vant 4、`@vant/use`、`@vant/popperjs`、Vitest 2、Playwright、TypeScript 和 `vue-tsc`。随后执行 `pnpm install`，生成 `pnpm-lock.yaml`。`pnpm-workspace.yaml` 明确允许 esbuild 等依赖运行安装时所需的构建脚本。
4. 在 `src/styles/reset.css` 重置常见 HTML 标签默认样式；在 `src/styles/theme.css` 设置字体、背景和 Vant 主色；在 `src/main.ts` 注册 Pinia 与使用到的 Vant 组件。
5. 用 `src/data/tasks.json` 提供首页任务；`src/stores/day.ts` 管理完成状态；`src/utils/storage.ts` 在 H5 优先使用 IndexedDB，失败或不可用时回退到 uni Storage。首页的日出图案使用 SVG，装饰圆弧由 Canvas 绘制。
6. 运行类型检查、Vitest、H5 构建以及 Playwright 的手机视口测试，验证页面显示、任务交互和刷新后的状态保留。

## 平台范围

Vant 4 是移动网页 UI 库，因此本项目当前按 **uni-app H5** 配置和验证，手机上通过浏览器预览。原生 App 和小程序若也需要发布，应改用相应平台兼容的 UI 组件，并分别安装、验证对应平台依赖。
