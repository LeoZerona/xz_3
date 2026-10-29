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

## 对照文字逐步展示

全屏阅读底部仅显示页码和右下角电量，状态栏高 18px，并缩小底部留白，释放的空间用于正文自动分页。两种对照状态共用同一布局，切换隐藏对照不会改变当前页容量。

点击顶部文件名或右侧菜单图标打开“阅读菜单”，集中使用目录、翻页、夜间模式、隐藏 / 全部显示对照、设置和自动阅读的暂停 / 继续 / 停止。隐藏对照后，菜单中还提供“逐行 / 逐字”“显示下一行 / 显示下一个字”和“重新隐藏”。点击“×”或菜单外正文收起菜单；收起操作不会改变当前页和已展示进度。

隐藏对照时，轻点正文可连续展示答案，左右滑动仍用于翻页，长按、滑动和多指操作不会触发展示；电脑端可按空格展示，按 Esc 展开或收起菜单。

切换展示方式会保留当前进度；翻页、换书、重新进入阅读器或调整排版后，对照文字重新隐藏。隐藏状态和展示方式会保存在本机，当前页已揭示的文字不会保存。逐步展示时会暂停自动翻页，避免倒计时打断练习。

电量读取：Android App 通过 [Native.js](https://www.html5plus.org/doc/zh_cn/android.html) 读取系统电池广播的当前状态，每 30 秒刷新；退出阅读或应用进入后台时停止，回到前台重新读取。H5 在支持的安全环境中使用 [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getBattery)，随电量及充电状态变化更新。浏览器不支持、权限受限或读取失败时显示 `--`，不显示虚构电量。

## 平台范围

阅读器通过 `PdfTextBridge.vue` 的 renderjs 在 WebView 视图层提取 PDF 文字，逻辑层仅负责二进制读取、文本分页和渲染。`build/pdfTextPlugin.ts` 会在开发与生产构建中自动生成离线解析脚本及 CMap/字体资源，资源位于 `static/pdf/`，无需 CDN 或后端接口。App service 不应导入 PDF.js。扫描版 PDF 需先进行 OCR，加密 PDF 需先解除密码。

PDF 专项验证：先执行 `pnpm build:app`，并通过 HBuilderX 运行一次项目生成 `dist/dev/app-plus`，再执行 `pnpm test:e2e -- e2e/pdf-reading.spec.ts --workers=1`。用例会在本地文件、断网、禁用 Worker 和 `structuredClone` 的条件下验证 App 生产/调试脚本，并验证手机视口中的内置 PDF 与上传阅读流程。

项目已配置 **uni-app H5** 与 **App（Android App-vue）** 编译。Vant 4 和当前页面中的部分 DOM 交互依赖 App-vue 的 WebView 渲染，不支持切换为 nvue/uvue 页面，也不能据此宣称兼容小程序；新增平台仍需分别安装对应编译包并验证。
