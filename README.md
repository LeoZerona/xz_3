# 字体学习（uni-app H5 / App）

一个可在手机浏览器或 Android HBuilderX 真机运行基座中打开的 uni-app 应用，采用 Vue 3、TypeScript、Pinia、Vant 和本地持久化。

## 离线个人学习模块

保留原有页面与四个主入口，通过原占位菜单进入新增模块：

- 收藏、斩字与自建字单：筛选、搜索、批量成员管理、导入预览及专项练习。
- 独立专项、复习中心、错题本：固定会话可继续，结果和错题可追溯；专项和测评不修改正式已学。
- 学习档案、月历、每日会话、7/30 日报告、课程覆盖、识字样本测评与次日生效的计划设置。
- 图书管理、阅读历史、书签、原文摘录、笔记、TXT/PDF 导入及词语/句子/文章本地检索。
- 完整 8105 字课程：一级 3500、二级 3000、三级 1605；二三级分别 300、161 关，保留原一级与部首 ID。
- 本机消息、前台提醒、ICS 日历导出、头像裁剪、资料码预览导入、资源检查与字体回退。
- 备份预览、整体恢复、恢复前快照、独立缓存管理、隐私清单、帮助目录和本地反馈草稿。

H5 生产版可从“数据与隐私 → 本机资源状态 → H5 离线启动资源”准备离线资源。需要 HTTPS 或 localhost；准备完成后支持断网刷新与新标签页打开。未缓存的内置图书需先在线打开，改用未缓存字体后需重新准备。清理离线缓存保留用户数据库。浏览器可能回收存储，重要内容请另行备份。

本期没有账号服务器、云同步、社区、OCR 或在线反馈发送。应用提醒只在前台运行时检查，未启用后台系统定时通知；日历导出需手动导入。App 使用安装包资源；没有通用文件选择器时可粘贴正文或通过原备份路径恢复，Android 相机/相册/扫码、权限与后台行为仍需真机验证。自定义字体在 H5 的数据可随备份保存，App 本地路径不能替代跨设备字体文件副本。

模块设计、实现计划与字库来源分别见 [设计](docs/superpowers/specs/2026-11-03-offline-learning-design.md)、[计划](docs/superpowers/plans/2026-11-03-offline-learning-implementation.md)、[来源许可](src/data/character-table/SOURCES.md)。

## 环境要求

- Node.js 22.13 或更高版本，推荐 Node.js 24（数据库单元测试使用 Node 内置 SQLite）
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

项目 DCloud 编译包已统一为 `3.0.0-5030420261029002`（HBuilderX 5.34 对应的 Vue 3 CLI 版本），`@dcloudio/types` 为 3.4.31。截图中 5.24 编译产物运行在 5.34 SDK 上的启动告警由版本错配引起；本项目通过同步编译器版本处理，未配置 `compatible.ignoreVersion` 隐藏检查。[DCloud 官方版本说明](https://uniapp.dcloud.net.cn/tutorial/version.html)。

更新后先执行 `pnpm install`、`pnpm build:app`，停止 HBuilderX 中的旧运行任务，再用 HBuilderX 5.34 重新运行至 5.34 Android 基座。若用自定义基座或离线 SDK，也需保持 5.34 并重新制作基座 / 打包；旧 APK 不会因修改源码而自动更新。不要通过卸载正式应用清理告警，以免丢失本地学习数据。

1. 在 HBuilderX 中打开本仓库根目录（包含 `package.json` 的目录），不要只打开 `src` 或 `dist/build/app`。
2. 先在终端执行 `pnpm install`。项目必须安装与其他 DCloud 编译包完全同版本的 `@dcloudio/uni-app-plus`，否则 `uni build -p app` 会错误地产生 H5 的 `index.html/assets`，HBuilderX 无法向真机基座同步 App 资源。
3. 手机开启开发者模式与 USB 调试，连接电脑，并允许这台电脑进行 USB 调试。
4. 在 HBuilderX 选择“运行 → 运行到手机或模拟器 → 运行到 Android App 基座”，选择检测到的设备。必须从 HBuilderX 发起运行；直接点击手机上的“HTML5+ Runtime”基座只会显示“本应用无法独立运行”的提示页，这是基座的正常行为。
5. 若手机仍停留在提示页，停止运行后删除手机上的旧基座，再从 HBuilderX 重新安装并运行；同时确认 HBuilderX 控制台出现编译完成与应用资源同步成功信息。

## 创建与安装过程

1. 从 [DCloud 的 uni-app Vue 3 + TypeScript 模板](https://github.com/dcloudio/uni-preset-vue/tree/vite-ts) 的 `vite-ts` 分支获取项目骨架，复制到当前空仓库。保留 `src/main.ts`、`src/pages.json`、`src/manifest.json`、`index.html`、`vite.config.ts` 和 TypeScript 配置。
2. 将模板的依赖精简为 H5 所需的 `@dcloudio/uni-app`、`@dcloudio/uni-components`、`@dcloudio/uni-h5`、Vue 3、Vue I18n，以及匹配该模板的 `@dcloudio/vite-plugin-uni` 和 Vite 5.2.8。所有 DCloud 构建包固定在同一个 `3.0.0-5030420261029002` 版本，避免混用编译器版本。
3. 在 `package.json` 中加入 Pinia 2.3.1、Vant 4、`@vant/use`、`@vant/popperjs`、Vitest 2、Playwright、TypeScript 和 `vue-tsc`。随后执行 `pnpm install`，生成 `pnpm-lock.yaml`。`pnpm-workspace.yaml` 明确允许 esbuild 等依赖运行安装时所需的构建脚本。
4. 在 `src/styles/reset.css` 重置常见 HTML 标签默认样式；在 `src/styles/theme.css` 设置字体、背景和 Vant 主色；在 `src/main.ts` 注册 Pinia 与使用到的 Vant 组件。
5. `src/database/` 提供本地数据库与数据访问层：App 使用 `plus.sqlite`，H5 使用 IndexedDB；`src/utils/storage.ts` 通过这一层持久化少量设置。数据库初始化或迁移失败时显示重试入口，不回退写入旧 Storage。静态任务配置保留在 `src/data/tasks.json`。
6. 运行类型检查、Vitest、H5 构建以及 Playwright 的手机视口测试，验证页面显示、任务交互和刷新后的状态保留。

## 文字搜索与字形比较

“学习”“关卡学习”“对照阅读”顶部都有文字搜索按钮，阅读器正文顶部和阅读菜单中也可搜索。文字搜索覆盖完整内置字库，支持汉字与拼音；输入多个汉字（如“己已巳”）可逐字查询并一起加入比较。

搜索结果旁的“比较”可以逐个加入文字，再打开“字形比较”并排查看学习字体、对照字体、读音、笔画、结构、释义与常用词。比较页也可直接输入汉字组，最多 6 个，支持去重、移除、清空和自动保存；不改变学习进度。较窄屏幕中，整个比较表可横向滚动，各字体和释义列保持对齐。

## 关卡布局

在底部“我”菜单或“个人设置”中打开“关卡布局”，可选择经典卡片、手帐字帖、口袋闪卡和闯关棋盘。默认使用现有的经典卡片布局，选择后立即生效并保存到本机，下次打开仍会保留。

四种布局共用关卡、学习进度和分类，配色始终跟随用户主题设置。切换布局不会重置学习记录；闪卡和棋盘可以继续浏览后续批次的关卡。

关卡页头部保留分类和搜索。点击关卡卡片即保存最近选择，只打开预览也会更新；棋盘点选和闪卡选关共用该记录，默认展示不自动记为选择。从其他主页面进入关卡页或重新打开应用后，会恢复分类、加载到目标批次并滚动到对应卡片。从关卡预览 / 答题页面返回则保留当前目录滚动位置，不强制重新定位。卡片使用浅主题底色、主题边框及“上次选择”标记区分，不改变学习进度。分类下方以单行显示“最近选择”和关卡名称，点击整行“回到该关”可重新定位；没有记录时隐藏该入口。

一级汉字已补齐为 3500 字、351 关，目录继续分批显示以保持手机浏览流畅，末关可直接加载。原字 ID、前 256 关、每日字单与部首关卡保持原样，第 256 关原有 7 字不变，补充文字另起第 257–351 关。数据来源与补充字段的范围见 [字库说明](src/data/character-table/SOURCES.md)。

已完成的关卡可点击“再次学习”，每轮均使用独立答题进度，只有本轮所有未斩文字完成所选练习模式才增加训练次数；退出后可继续未完成的一轮。旧已完成关卡按 1 次计数。重新开始本轮不清除长期学习记录、收藏、斩字和历史训练次数。

## 关卡复习

首页“关卡复习”、关卡页入口和“我 → 关卡复习”打开同一个模块。只复习关卡中实际答题、查看详情或执行斩字的文字；升级前已完成的关卡及逐字完成记录自动补入，单纯浏览关卡预览不会将整关标记为已学。支持“全部 / 斩列表 / 收藏列表”，筛选范围内只显示学习字体，以及“认识 / 不认识”两个作答按钮；各范围分别保存当前字，退出、刷新和重启后继续。

采用以遗忘曲线为依据的间隔策略：首次学习后 5 分钟开始，认识后依次安排 30 分钟、12 小时、1 / 2 / 4 / 7 / 15 / 30 天；不认识则回到 5 分钟。到期文字按最早到期、最久未复习排序，不随机截取或按每日数量丢弃旧字。没有到期字时可以“提前复习”，每字在该轮最多出现一次。复习次数、遗忘次数、排期与当前位置保存在本地并纳入备份；重复关卡训练不会重置已有排期。这是一套可执行的间隔策略，并不声称能精确预测每个人的遗忘时间。

## 对照文字逐步展示

全屏阅读底部仅显示页码和右下角电量，状态栏高 18px，并缩小底部留白，释放的空间用于正文自动分页。两种对照状态共用同一布局，切换隐藏对照不会改变当前页容量。

点击顶部文件名或右侧菜单图标打开“阅读菜单”，集中使用目录、翻页、夜间模式、隐藏 / 全部显示对照、设置和自动阅读的暂停 / 继续 / 停止。隐藏对照后，菜单中还提供“逐行 / 逐字”“显示下一行 / 显示下一个字”和“重新隐藏”。点击“×”或菜单外正文收起菜单；收起操作不会改变当前页和已展示进度。

隐藏对照时，轻点正文可连续展示答案，左右滑动仍用于翻页，长按、滑动和多指操作不会触发展示；电脑端可按空格展示，按 Esc 展开或收起菜单。

切换展示方式会保留当前进度；翻页、换书、重新进入阅读器或调整排版后，对照文字重新隐藏。隐藏状态和展示方式会保存在本机，当前页已揭示的文字不会保存。逐步展示时会暂停自动翻页，避免倒计时打断练习。

电量读取：Android App 通过 [Native.js](https://www.html5plus.org/doc/zh_cn/android.html) 读取系统电池广播的当前状态，每 30 秒刷新；退出阅读或应用进入后台时停止，回到前台重新读取。H5 在支持的安全环境中使用 [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getBattery)，随电量及充电状态变化更新。浏览器不支持、权限受限或读取失败时显示 `--`，不显示虚构电量。

## 平台范围

本地数据结构、字库导入、旧数据迁移、备份恢复和专项验证见 [数据库说明](src/database/README.md)。首次运行会导入内置字库；之后页面通过数据库读取内容。App 已声明 SQLite 模块，真机运行时需要包含 SQLite 的运行基座；旧基座缺少该模块时，应用会给出重新打包提示。

阅读器通过 `PdfTextBridge.vue` 的 renderjs 在 WebView 视图层提取 PDF 文字，逻辑层仅负责二进制读取、文本分页和渲染。`build/pdfTextPlugin.ts` 会在开发与生产构建中自动生成离线解析脚本及 CMap/字体资源，资源位于 `static/pdf/`，无需 CDN 或后端接口。App service 不应导入 PDF.js。扫描版 PDF 需先进行 OCR，加密 PDF 需先解除密码。

PDF 专项验证：先执行 `pnpm build:app`，并通过 HBuilderX 运行一次项目生成 `dist/dev/app-plus`，再执行 `pnpm test:e2e -- e2e/pdf-reading.spec.ts --workers=1`。用例会在本地文件、断网、禁用 Worker 和 `structuredClone` 的条件下验证 App 生产/调试脚本，并验证手机视口中的内置 PDF 与上传阅读流程。

项目已配置 **uni-app H5** 与 **App（Android App-vue）** 编译。Vant 4 和当前页面中的部分 DOM 交互依赖 App-vue 的 WebView 渲染，不支持切换为 nvue/uvue 页面，也不能据此宣称兼容小程序；新增平台仍需分别安装对应编译包并验证。
