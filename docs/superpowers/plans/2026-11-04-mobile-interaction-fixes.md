# 移动端保存、布局与搜索返回修复

**目标：** 按本次反馈修复 Android 保存路径、顶部遮盖、个人页留白、学习收藏位置、斩字状态和搜索返回。

**技术约束：** 保持 Vue 3、uni-app、TypeScript、Pinia、Vant、SCSS 和 pnpm；保留工作区已有改动。浏览器测试不等于 Android 真机验收。

**界面决定：** 保持当前主题；44px 点击区配 8px 圆角；收藏只改变星形填色；斩字保留“斩”并叠加斜线。个人页由正常文档流底栏分配空间，菜单适当增大。学习收藏由共用题卡提供，置于答案区域右下方，正确后的详情也保留入口。

**搜索：** 搜索详情再次打开搜索时复用已有搜索页，临时保存原详情地址、查询和模式；空搜索取消恢复原详情，并保留原搜索结果。新查询开始后清除临时返回地址，新详情返回当前搜索页，页面栈不积累旧详情。

## 步骤与验收

- [x] 在 `src/database/sqlite.test.ts` 覆盖原生事务 API 的提交和失败回滚；在 `src/database/persistence.test.ts` 覆盖保留失败队列、重试保存和重载。回滚通过真实 SQLite trigger 在第二条 SQL 执行时失败验证。
- [x] `src/database/sqlite.ts` 使用 HTML5+ 的 `transaction` 管理事务边界；保存提示展示错误详情，重试进行中防止重复触发。参考官方接口：https://www.html5plus.org/doc/zh_cn/sqlite.html#plus.sqlite.transaction
- [x] `e2e/mobile-interactions.spec.ts` 先验证旧实现在顶部遮盖、个人页底部空间、收藏位置、斩字及两种搜索返回上的失败。
- [x] 在 `DatabaseStatus.vue` 渲染主题蒙版，`profile/index.vue` 改为普通流底栏；共用 `StudyQuestionCard.vue` 提供收藏入口，日常/关卡父页面传递状态与事件。
- [x] 搜索按钮与详情按钮统一圆角反馈；共用斩字图形。`src/search/navigation.ts` 管理一次性的空搜索返回地址，搜索页消费并在新查询后失效。
- [x] 运行类型检查、单元测试、相关 E2E、H5/App 构建，检查 320/390/430px 与深色主题截图；Android 真机尚未验证。最终结果见 `docs/reviews/2026-11-04-mobile-interaction-acceptance.md`。

## 回归重点

保存失败不能丢掉待保存数据；重试成功后能重新读取。空查询、无匹配查询、连续多次搜索、从非搜索入口进入详情均须可返回。收藏不能提交答案或切换题目；斩字保持原有可恢复语义；短屏可滚动且底栏不遮挡菜单。
