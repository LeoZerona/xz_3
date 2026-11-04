# 移动端交互修复验收（2026-11-04）

本轮保留原工作区已有改动，未升级依赖或改变页面注册。沿用 Vue 3、uni-app、TypeScript、Pinia、Vant、SCSS、pnpm。

## 已实现

- Android SQLite 初始化、快照和提交采用 `plus.sqlite.transaction` 控制事务边界，保留串行队列及失败回滚；空提交无需启动事务。保存失败显示具体错误，重试时禁止重复点击。
- 由各页已有的 `DatabaseStatus` 渲染不透明顶部安全区蒙版，颜色跟随主题。
- “我”页底栏参与 flex 布局，移除重复预留的 88px 底部空间；菜单行高和文字适当增大。
- 日常学习与关卡学习的收藏移动至选择区、输入区右下方；星形填色表达收藏状态，保留答题详情收藏入口，支持键盘操作。
- 斩字操作保持“斩”字并叠加斜线，预览和详情使用同一图形；搜索及详情按钮统一 8px 圆角，详情收藏保持透明背景。
- 搜索详情再次打开搜索复用原搜索页。取消空查询恢复原字与原搜索结果；新查询开始后不再返回旧详情。无匹配查询同样清除旧返回目标。

## 最终验证

- `pnpm type-check`：通过。
- `pnpm test`：57 个文件、222 项测试全部通过。包含真实 SQLite 在第二条语句失败后回滚已执行的第一条写入，以及保存队列失败重试后重启读取。
- `pnpm test:e2e e2e/mobile-interactions.spec.ts e2e/navigation.spec.ts e2e/level-preview-actions.spec.ts e2e/character-detail-scroll.spec.ts e2e/study-progress.spec.ts e2e/theme.spec.ts e2e/reading-controls.spec.ts --output test-results/mobile-acceptance`：40 项全部通过，其中本轮新增 9 项。
- `pnpm build:h5`、`pnpm build:app`：最终源码均构建通过。App 资源位于 `dist/build/app`。
- 检查了个人页 320/390/430px、学习选择题和输入题、详情斩字/收藏、深色主题截图；现有详情滚动及阅读控件覆盖短屏、横屏和桌面视口。
- 独立代码审查及补丁复核无阻断项；相关文件 `git diff --check` 通过。

初次回归确认了旧详情页面栈累积、顶部蒙版缺失和收藏位置问题。扩展回归发现的键盘缺失、取消空搜索后原查询丢失均已修复；输入题测试 fixture 已通过刷新重新读取数据库，避免只改变 hash 时复用旧缓存。上述最终验证无失败项。

## Android 真机边界

用户确认原保存提示发生在 Android App，重试后仍出现。浏览器首次排查未复现原始失败；未取得 Android 原始错误文本。SQLite 调整依据 HTML5+ 原生事务接口，并由桥接适配与真实 SQLite 测试验证，不能据此宣称原真机错误根因已得到实机确认。

`adb devices -l` 未列出任何已连接设备。本轮未安装 APK 或向手机同步资源；需要用 HBuilderX 更新运行资源后确认保存提示是否消失。若仍失败，新提示中的具体错误可用于继续定位。App 构建通过不等于 Android 真机保存验收通过。
