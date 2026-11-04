# Review Answer Details Implementation Plan

> **For agentic workers:** Use executing-plans to implement task-by-task. Work is performed in the current user workspace to preserve existing uncommitted changes.

**Goal:** 作答后展示当前文字详情，允许更正答案并手动进入下一字。

**Architecture:** Store 返回作答快照并提供更正方法；两个复习入口复用一个详情面板。更正使用原始快照重新计算排期，并覆盖原活动事件。

**Tech Stack:** Vue 3.4、TypeScript、Pinia、uni-app、pnpm 11、Vitest、Playwright。

**Spec:** `docs/superpowers/specs/2026-11-03-review-answer-details-design.md`

## Global Constraints

- 保留已有用户修改、主题、框架、包管理器及数据库结构。
- Vue 组件使用 script setup lang="ts"，沿用 uni-app 组件和生命周期。
- 本次快照在下一字、切换范围或刷新后失效。

## Review Focus

- 更正已有多轮复习的字，保留历史遗忘次数并从原始阶段计算间隔。
- 反复更正只产生一条活动事件，错题本同步。
- 过期快照不得覆盖之后的新答案。
- 最后一字也先展示详情，随后手动完成；提前复习一轮不重复。
- 小屏长详情可滚动，操作按钮保持可见且支持键盘。

### Task 1: 可更正作答与共享详情

**Files:** `src/stores/levelReview.ts`、`src/stores/levelReview.test.ts`、`src/components/ReviewAnswerPanel.vue`、`src/pages/level-review/useLevelReview.ts`、`src/pages/level-review/index.vue`、`src/pages/review-center/index.vue`、`e2e/level-review.spec.ts`、`e2e/review-center.spec.ts`。

**Interfaces:** `answer` 返回 `ReviewAnswerReceipt | null`，`correctAnswer(receipt, known)` 返回更新后的凭据；面板 props 为 character、known、disabled，emits 为 correct-answer、next。

- [x] 添加并运行失败测试：认识/不认识后的详情停留、更正只算一次、历史排期和活动事件正确、过期保护。
- [x] 实现 store 快照更正与共享详情面板，连接两个复习入口。
- [x] 更新原 E2E 的显式下一字步骤，补充两种答案、更正、完成、提前复习和视口检查。
- [x] 执行 pnpm test、pnpm type-check、H5/App 构建和相关生产版 E2E，查看各视口截图。
- [x] 同步复习说明，检查 diff 并记录未验证平台。

## 验证记录

- RED：新增 store 测试因缺少 correctAnswer 失败；浏览器用例因作答后缺少本字详情失败。
- GREEN：复习 store 单测 7/7；类型检查通过；最终 H5 与 App 构建通过。
- 完整 pnpm test：219 通过，1 失败。未改动的 src/database/sqlite.test.ts:102 中“串行提交事务，查询等待提交完成，并保留特殊文本”失败。独立 Node v22.22.0 参数查询可复现内置 node:sqlite 将含空字符的长度 7 文本读为长度 1，不涉及本次源码；未修改或跳过该断言。
- 生产版回归：pnpm test:e2e -- --config playwright.build.config.ts e2e/level-review.spec.ts e2e/review-center.spec.ts --workers=2，12/12 通过，退出码 0。测试完成后沙箱内服务回收停滞，确认 PID 与命令后仅回收本次创建的 18613 测试服务，测试运行器正常退出。
- 每日复习额外回归：1/1 通过，确认更正保存完成后按钮恢复可用。
- 已查看 320/390/768/1440px 生产版详情截图，核对横向溢出、长详情滚动和底部操作；补测 End 键滚动与 Enter/Space 操作。小屏更正按钮采用“改为不认识 / 改为认识”，可访问名称保留“记错了”上下文。
- 新增/修改 UI 源码的设计 lint 0 FAIL、0 WARN；额外视觉 inspector 因 CDP Page.enable 超时未能运行，使用生产版 Playwright 视口断言和截图完成视觉检查。
- git diff --check 通过。Android 真机尚未验证，App 仅声明构建通过。
