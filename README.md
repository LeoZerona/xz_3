# 字体学习（uni-app H5 / App）

一个可在手机浏览器或 Android HBuilderX 真机运行基座中打开的 uni-app 应用，采用 Vue 3、TypeScript、Pinia、Vant 和本地持久化。

## 环境要求

- Node.js 22 或更高版本（本项目创建和验证时使用 Node.js 24）
- pnpm 11
- 手机与开发电脑连接同一个局域网

本机安装 pnpm：

```bash
npm install -g pnpm@11
```

## 安装与启动

本项目固定使用 pnpm 11，并由 `pnpm-lock.yaml` 管理依赖。不要在现有目录中运行 `npm install`，npm 无法安全复用 pnpm 的 `node_modules/.pnpm` 链接结构，也会尝试生成与项目不一致的 `package-lock.json`。

```bash
pnpm install
pnpm dev:h5
```

终端会输出本机局域网访问地址。在手机浏览器中打开 `http://电脑局域网 IP:终端显示的端口/`，即可看到首页。开发服务监听 `0.0.0.0`，可从同一局域网的手机访问；如无法访问，请检查电脑防火墙是否允许该端口。

常用命令：

```bash
pnpm dev:app      # 生成 App 调试产物（供 HBuilderX/基座使用）
pnpm build:app    # 生成 dist/build/app App 资源
pnpm type-check   # TypeScript 类型检查
pnpm test         # Vitest 单元测试
pnpm test:e2e     # Playwright 手机视口测试（使用本机 Google Chrome）
pnpm build:h5     # 生成 dist/build/h5
```

## HBuilderX Android 真机运行

1. 在 HBuilderX 中打开本仓库根目录（包含 `package.json` 的目录），不要只打开 `src` 或 `dist/build/app`。
2. 先在终端执行 `pnpm install`。项目必须安装与其他 DCloud 编译包完全同版本的 `@dcloudio/uni-app-plus`，否则 `uni build -p app` 会错误地产生 H5 的 `index.html/assets`，HBuilderX 无法向真机基座同步 App 资源。
3. 手机开启开发者模式与 USB 调试，连接电脑，并允许这台电脑进行 USB 调试。
4. 在 HBuilderX 选择“运行 → 运行到手机或模拟器 → 运行到 Android App 基座”，选择检测到的设备。必须从 HBuilderX 发起运行；直接点击手机上的“HTML5+ Runtime”基座只会显示“本应用无法独立运行”的提示页，这是基座的正常行为。
5. 若手机仍停留在提示页，停止运行后删除手机上的旧基座，再从 HBuilderX 重新安装并运行；同时确认 HBuilderX 控制台出现编译完成与应用资源同步成功信息。

## 创建与安装过程

1. 从 [DCloud 的 uni-app Vue 3 + TypeScript 模板](https://github.com/dcloudio/uni-preset-vue/tree/vite-ts) 的 `vite-ts` 分支获取项目骨架，复制到当前空仓库。保留 `src/main.ts`、`src/pages.json`、`src/manifest.json`、`index.html`、`vite.config.ts` 和 TypeScript 配置。
2. 将模板的依赖精简为 H5 所需的 `@dcloudio/uni-app`、`@dcloudio/uni-components`、`@dcloudio/uni-h5`、Vue 3、Vue I18n，以及匹配该模板的 `@dcloudio/vite-plugin-uni` 和 Vite 5.2.8。所有 DCloud 构建包固定在同一个 `3.0.0-5020420260813003` 版本，避免混用编译器版本。
3. 在 `package.json` 中加入 Pinia 2.3.1、Vant 4、`@vant/use`、`@vant/popperjs`、Vitest 2、Playwright、TypeScript 和 `vue-tsc`。随后执行 `pnpm install`，生成 `pnpm-lock.yaml`。`pnpm-workspace.yaml` 明确允许 esbuild 等依赖运行安装时所需的构建脚本。
4. 在 `src/styles/reset.css` 重置常见 HTML 标签默认样式；在 `src/styles/theme.css` 设置字体、背景和 Vant 主色；在 `src/main.ts` 注册 Pinia 与使用到的 Vant 组件。
5. 用 `src/data/tasks.json` 提供首页任务；`src/stores/day.ts` 管理完成状态；`src/utils/storage.ts` 在 H5 优先使用 IndexedDB，失败或不可用时回退到 uni Storage。首页的日出图案使用 SVG，装饰圆弧由 Canvas 绘制。
6. 运行类型检查、Vitest、H5 构建以及 Playwright 的手机视口测试，验证页面显示、任务交互和刷新后的状态保留。

## 平台范围

项目已配置 **uni-app H5** 与 **App（Android App-vue）** 编译。Vant 4 和当前页面中的部分 DOM 交互依赖 App-vue 的 WebView 渲染，不支持切换为 nvue/uvue 页面，也不能据此宣称兼容小程序；新增平台仍需分别安装对应编译包并验证。
