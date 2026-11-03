# Offline Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 用户已明确由主代理编写、测试、提交，并于 2026-11-03 授权开始执行；不再逐任务请求确认。

**Goal:** 完成设计中的离线个人学习闭环与缺失页面，同时保持所有已有页面 UI 和可用流程。

**Architecture:** 沿用本地数据库及 Pinia，增量增加学习事件、字单、批注和提醒等实体。新页面接既有占位入口，学习题卡/复习/阅读器直接复用。新表通过 SQLite/IndexedDB 同步迁移，用户数据纳入备份。

**Tech Stack:** Vue 3.4.21 / TypeScript / uni-app App-vue + H5 / Pinia 2 / Vant 4 / pnpm 11.19.0 / Vitest / Playwright。

**Spec:** [已确认的模块设计 v2](../specs/2026-11-03-offline-learning-design.md)

## Global Constraints

- 现有功能模块的 UI 完全保留，只完善原功能和修复问题；只为尚不存在的功能绘制、实现新界面。
- 不改既有布局、颜色、字号、间距、卡片/按钮/导航样式；不为新模块在旧页面加统计区、工具栏、菜单项或新 tab。
- 四个主入口、17 个原页面 URL、旧字/关卡 ID、当前复习规则及各游标保持兼容。
- 每字只有一个正式排期；来源单独记录。专项不写正式完成、新学/复习目标或排期。
- 首次正式完成是持久事实；更换必修题型不回退已学。
- 数据按真实来源呈现，历史缺失不补造；无来源字典字段显示未收录。
- 用户已选择离线优先；账号服务端、云同步、社区、在线 AI、OCR 不纳入首期。
- 使用现有 pnpm、锁文件和 UI/CSS 体系；默认不推送、不合并主干。
- 各任务 RED→GREEN 后提交；只提交相关文件。现有基线失败见审计，不通过降低断言消除。

## Review Focus

1. 同一题连点/后台切换/保存重试：事件一次、状态不丢；任务 1/4 测事件幂等与失败后重试。
2. 跨午夜/改时区/空闲：按发生日本地日归属，后台不计时；任务 1/2 测午夜拆分和单调计时。
3. 老数据/旧备份/未知新版本：用户数据保持，缺少新增表可迁移；任务 1/12 测迁移与往返。
4. 删除字单/书籍/清缓存：组织关系、原文引用及学习历史边界正确；任务 3/7/12 测独立删除。
5. 已有 UI 与导航：相同数据状态对比无样式/布局改变；任务 2/14 做前后快照与行为回归。

## 文件职责与共用合同

- `src/learning/`：活动事件/会话、日期汇总、有效计时；不存 DOM。
- `src/collections/`：字单校验与数据访问；`src/practice/`：专项题单、独立进度与结果。
- `src/library/`：书籍管理、书签/摘录及本地正文检索；复用 `src/reading/` 解析/定位。
- `src/notifications/`：提醒、消息、日历导出与平台能力。
- `src/components/FeaturePage.vue`、`src/styles/features.css`：仅供新增页面使用，不作用于既有页面。
- `src/database/schema.ts`：新增表及版本；`records.ts`/`backup.ts`：用户表与向后兼容。
- 新实体一律稳定 ID、明确类型、分页、错误反馈；新增页面登记 `src/pages.json`。

核心接口：

```ts
type ActivitySource = 'daily' | 'level' | 'review' | 'practice' | 'reading'
interface ActivityEvent {
  id: string; sessionId: string; source: ActivitySource; kind: 'answer' | 'completed' | 'time'
  characterId: string | null; mode: StudyMode | null; correct: boolean | null
  at: string; dateKey: string; seconds: number
}
// 记录幂等的事实；不会由专项事件设置正式学习完成。
recordActivity(event: ActivityEvent): void
readActivities(options: { dateKey?: string; sessionId?: string }): Promise<ActivityEvent[]>
// 写入进入既有持久化队列，失败保留并显示 DatabaseStatus。
enqueueDatabaseChanges(changes: Change[]): void
```

## Task 1: 数据迁移、学习事件和稳定完成事实

**Files:** Modify `src/database/{schema,records,persistence,backup,sqlite}.ts`, `src/study/learningData.ts`, `src/stores/characterLearning.ts`; Create `src/learning/{types,activity,summary,clock}.ts`; Test `src/learning/{activity,summary,clock}.test.ts`, `src/database/backup.test.ts`, `src/stores/characterPreferences.test.ts`。

**Interfaces:** Produces 上述 ActivityEvent、recordActivity/readActivities/enqueueDatabaseChanges，以及 `summarizeActivities(events, legacy): LearningSummary`、`createActivityClock(options): ActivityClock`。旧 completedAt/明确 completed 状态永久保留，显式重置操作例外。

- [ ] 写失败测试：重复事件 ID 只出现一次；专项正确不变正式完成；启用更多模式后已学仍保留；新表升级保留已有 settings；旧备份缺少新表可恢复；午夜前后各计 10 秒；后台/超过 120 秒空闲不累计。
- [ ] Run `pnpm test -- src/learning src/database/backup.test.ts src/stores/characterPreferences.test.ts`，确认新合同未实现导致失败。
- [ ] 新表采用新增列之外的独立表，升级从 v2 建新表，避免改变现有列。持久化队列和备份白名单纳入新表，正式完成依赖稳定事实而非全局题型重算。
- [ ] Run 同上及 `pnpm type-check`；预期相关测试全通过，现有 NUL/Node22 失败另核查 Node24 运行时，保留断言。
- [ ] 提交 `feat: 增加学习事件与稳定的完成记录`。

## Task 2: 修复既有统计、计时与固定日期，冻结 UI

**Files:** Modify `src/pages/{index,study,level-study,plan,profile,personal-profile}/index.vue`, `src/pages/level-review/useLevelReview.ts`, `src/stores/dailyProgress.ts`; Create `src/learning/useActivityClock.ts`, `src/learning/plan.ts`; Test `src/learning/plan.test.ts`, `e2e/learning-foundation.spec.ts`。

**Interfaces:** Consumes task 1；Produces 每日/关卡/复习事件及真实时长；`estimatePlan(remaining: number, dailyCount: number, from: Date): PlanEstimate`；原 UI 只替换动态值和事件绑定。

- [ ] 写失败测试：复习一次首页增加一次；学习计时前台有效、后台停止；累计已学非固定 0；完成日期按剩余/每日量变化；日期数据不会把昨天字单复制到今天。
- [ ] Run `pnpm exec playwright test e2e/learning-foundation.spec.ts --workers=1` 观察失败。
- [ ] 在既有处理函数记录事件并挂生命周期计时；首页与个人中心读同一统计源；原模板层级和所有样式不动；固定 ID/IP 改真实/未获取文本。
- [ ] Run 相关单元测试、上述 E2E、type-check 和 H5 构建；按相同字体/主题/数据状态核对既有截图。
- [ ] 提交 `fix: 接通学习统计计时并修复计划日期`。

## Task 3: 收藏、字单和斩字管理完整流程

**Files:** Create `src/collections/{types,repository,model}.ts`, `src/components/FeaturePage.vue`, `src/styles/features.css`, `src/pages/{collections,collection-detail,collection-edit,collection-members}/index.vue`; Modify `src/pages/profile/index.vue`、`src/pages.json`；Test `src/collections/repository.test.ts`, `e2e/collections.spec.ts`。

**Interfaces:** `listCollections(): Promise<Collection[]>`、`saveCollection(input: CollectionInput): Promise<string>`、`setCollectionMembers(id: string, characterIds: string[]): Promise<void>`、`deleteCollection(id: string): Promise<void>`；只收字库内单字，同字唯一；名字 trim 后 1–30 字。

- [ ] 写失败测试：空名拒绝；添加“未末未”保留两字；未知 ID 拒绝；删字单保留收藏和学习记录；备份恢复字单成员顺序不变。
- [ ] Run `pnpm test -- src/collections` 观察失败。
- [ ] 实现字单表、分页数据访问和 4 个页面：三类列表、搜索/排序/筛选、批量操作、编辑/导入预览；原“我的收藏”菜单仅接路由。
- [ ] Run 单测、`e2e/collections.spec.ts`、type-check、H5/App 构建；验证 320/390/430px、深浅主题。
- [ ] 提交 `feat: 完善收藏字单与斩字管理`。

## Task 4: 可恢复的独立专项会话

**Files:** Create `src/practice/{types,repository,questions}.ts`, `src/pages/{practice-setup,practice-session,practice-result}/index.vue`; Reuse `src/pages/study/components/StudyQuestionCard.vue` without style changes；Test `src/practice/repository.test.ts`, `e2e/practice.spec.ts`。

**Interfaces:** `createPractice(input: PracticeInput): Promise<string>`、`readPractice(id: string): Promise<PracticeSession>`、`answerPractice(id: string, questionId: string, value: string): Promise<PracticeSession>`；固定题单/题型，连续提交幂等，未学不变正式已学/排期。

- [ ] 写失败测试：退出继续题单不变；同一题重复提交一次记录；错误后未完成题保留；完成写结果；不变 character_progress/level_review。
- [ ] Run `pnpm test -- src/practice`，确认未实现失败。
- [ ] 实现配置→复用题卡答题→结果，支持字单/收藏/错题来源、空范围、继续与重新练习；独立数据入备份。
- [ ] Run 单测、专项 E2E、type-check、构建；检查既有题卡样式无改动。
- [ ] 提交 `feat: 增加独立专项练习与结果报告`。

## Task 5: 复习中心与错题本

**Files:** Create `src/review/{sources,mistakes}.ts`, `src/pages/{review-center,mistakes,mistake-detail}/index.vue`; Modify `src/stores/levelReview.ts`、既有日常首次作答入口；Test `src/review/mistakes.test.ts`, `src/stores/levelReview.test.ts`, `e2e/review-center.spec.ts`。

**Interfaces:** `listMistakes(filter: MistakeFilter): Promise<MistakeItem[]>`、`listDueReviews(source?: 'daily' | 'level'): Promise<ReviewItem[]>`；每字唯一排期，来源单独保存；原关卡页只筛 level 来源。

- [ ] 写失败测试：日常/关卡同字不重置已有排期；一次正式回答推进一次；连续两次正确巩固同模式错题；历史累计无伪造时间；切回旧关卡范围仍不出现仅日常字。
- [ ] Run 相关 Vitest 与 `e2e/level-review.spec.ts` 确认新增合同失败。
- [ ] 新总览/错题列表/详情接专项；原复习三个范围/游标/UI/导航保持。
- [ ] Run 新旧复习相关测试及构建。
- [ ] 提交 `feat: 增加复习中心与可追溯错题本`。

## Task 6: 学习记录、日历、识字测评和学习设置

**Files:** Create `src/pages/{learning-records,learning-calendar,learning-day,learning-report,literacy,assessment-setup,assessment-session,assessment-result,learning-settings}/index.vue`, `src/learning/{history,assessment,settings}.ts`; Modify 既有占位菜单及 `src/database/catalog.ts` 的选课读取；Test `src/learning/{history,assessment,settings}.test.ts`, `e2e/learning-records.spec.ts`。

**Interfaces:** `readLearningHistory(range): Promise<LearningHistory>`；`startAssessment(input): Promise<string>`/`answerAssessment(...)`；`readLearningSettings(): LearningSettings`/`saveLearningSettings(input): Promise<void>`。新用户默认一级，老用户保留 daily 204；计划改动次日生效，已有会话保留题型快照。

- [ ] 写失败测试：日历按日期显示事件；空日期无假记录；正式已学按字去重；专项/测评分开；测评固定 30 字或实际可用较小值，不改正式数据；新设置不替换当日任务。
- [ ] Run 相关 Vitest 确认失败。
- [ ] 实现总览→月历→当日→会话、7/30 日回顾与课程覆盖；测评说明→复用题卡→样本报告/历史；新增设置承接课程与目标，旧计划 UI 不加控件。
- [ ] Run 新 E2E、type-check、构建并检查月末/跨年/深色/空数据。
- [ ] 提交 `feat: 完善学习记录日历测评与设置`。

## Task 7: 我的图书、书签与摘录笔记

**Files:** Create `src/library/{repository,annotations,types}.ts`, `src/pages/{my-books,book-detail,bookmarks,annotation-edit,excerpt-workspace,reading-history}/index.vue`; Modify `src/reading/customBooks.ts`、原阅读器的偏移参数读取及“我的图书”占位跳转；Test `src/library/annotations.test.ts`, `e2e/library.spec.ts`。

**Interfaces:** `listLibrary(filter): Promise<BookSummary[]>`、`saveAnnotation(input): Promise<string>`、`listAnnotations(bookId): Promise<Annotation[]>`、`deleteBookWithRelations(id): Promise<void>`。锚点=bookId/正文指纹/UTF-16偏移/原文片段。

- [ ] 写失败测试：重排版定位同偏移；书签/摘录编辑持久化；删书同时删关联/索引但不删学习；正文变化的失效锚点有明确状态。
- [ ] Run `pnpm test -- src/library` 观察失败。
- [ ] 新管理页提供状态筛选/排序/重命名/详情；书签与工作台经新模块操作，原阅读器不加菜单/新手势。
- [ ] Run 图书 E2E、阅读位置/逐字揭示回归、构建。
- [ ] 提交 `feat: 增加图书管理书签与摘录笔记`。

## Task 8: 导入中心和本地全文检索

**Files:** Create `src/library/{importer,search}.ts`, `src/pages/{book-import,import-result,content-results,word-detail,context-detail}/index.vue`; Extract necessary existing TXT/PDF adapters without changing old UI；Modify `src/pages/search/{useCharacterSearch,index.vue}` only missing tab contents；Test `src/library/{importer,search}.test.ts`, `e2e/content-search.spec.ts`。

**Interfaces:** `importDocument(input: DocumentInput): Promise<ImportResult>`、`searchContent(query, mode, options): Promise<SearchResult>`。原单字 50 条分页保持，词语来自去重 character_words，句/文章来自本地正文。

- [ ] 写失败测试：重复正文指纹提示；解析失败/取消无半本书；词语不拼接单字释义；跨 chunk 原句可查；旧请求不覆盖新结果；原文命中偏移有效。
- [ ] Run 相关 Vitest 观察失败。
- [ ] 新导入状态/结果页，单独保存和查询索引；新结果支持上下文/原文跳转，不重画已有单字搜索。
- [ ] Run 搜索/导入 E2E、PDF 回归、构建。
- [ ] 提交 `feat: 完成本地资料导入与多类型检索`。

## Task 9: 二三级课程与来源核验

**Files:** Create `build/completeCatalog.mjs`, source snapshots under `src/data/character-table/` and source/license notes；Modify `build/catalog{Seed,Plugin}.ts`；Test `src/database/catalog.test.ts`, `e2e/levels.spec.ts`。

**Interfaces:** 内置字库一级 3500/二级 3000/三级 1605，稳定 ID 和来源字段；二级300关、三级161关；旧一级351关和部首代表字保留。

- [ ] 写失败测试：完整 8105 字唯一与等级分布；原一级 IDs/关256成员不变；二三级末关可读可答；无可靠字段保持未收录。
- [ ] Run 字库测试确认缺失级别失败。
- [ ] 核查现有相邻仓库只读字表与教育部范围、MIT 字典/Apache OpenCC 来源，生成可复现静态快照；只在数据验收后将占位转正式内容，不抓商业软件内容。
- [ ] Run 字库单测、后段关卡 E2E、H5/App 构建及升级数据保留检查。
- [ ] 提交 `feat: 补全二三级离线汉字课程`。

## Task 10: 消息、提醒和日历导出

**Files:** Create `src/notifications/{repository,schedule,calendar,platform}.ts`, `src/pages/{messages,message-detail,reminders,reminder-edit,reminder-capabilities}/index.vue`；Modify existing placeholder handlers only；Test `src/notifications/{schedule,calendar}.test.ts`, `e2e/reminders.spec.ts`。

**Interfaces:** `saveReminder(input): Promise<string>`、`nextReminderAt(reminder, from): Date | null`、`createCalendarReminder(reminder): string`、`listMessages(): Promise<LocalMessage[]>`。改/关撤销旧排程，勿扰、完成免打扰，消息来自真实事件。

- [ ] 写失败测试：星期/午夜/勿扰推迟；关闭不再排程；改时取消旧触发；ICS 转义/时区正确；重复事件不生成重复消息。
- [ ] Run 通知单测观察失败。
- [ ] 实现所有新页面与 H5 应用内/ICS；Android 官方本地通知模块先验证，无可靠系统调度时明确能力限制，不虚构成功。
- [ ] Run 通知 E2E、构建；真机权限/后台/重启单独记录。
- [ ] 提交 `feat: 增加本地消息学习提醒与日历导出`。

## Task 11: 个人资料、头像、资料码与资源状态

**Files:** Create `src/profile/{avatar,identity,importCode}.ts`, `src/pages/{avatar-edit,account-status,scan-import,resources,resource-detail}/index.vue`; Modify original existing handlers/data fields only；Test `src/profile/{avatar,importCode}.test.ts`, `e2e/profile-completion.spec.ts`。

**Interfaces:** `parseImportCode(text: string): ImportPreview` 仅本应用字单/汉字；`saveAvatar(input): Promise<void>`，≤2MB 源图，输出小图入备份；真实本机 ID，离线 IP 未获取。

- [ ] 写失败测试：URL/脚本码拒绝；汉字去重并显示未收录；非法图片不覆盖旧头像；无登录态退出不清数据；缺字体恢复回退可读。
- [ ] Run 相关单测观察失败。
- [ ] 保持全部旧入口名称/行/样式，新增头像预览/资料导入/资源详情；H5 扫码按能力提供图片/文本备选，原生权限实际验证。
- [ ] Run 相关 E2E、字体回归、构建。
- [ ] 提交 `feat: 完善本机资料头像导入与资源恢复`。

## Task 12: 数据隐私、备份、缓存与帮助

**Files:** Create `src/data-management/{service,policies}.ts`, `src/pages/{data-privacy,backup-preview,backup-result,cache-management,privacy-information,help,help-article,feedback,feedback-detail,about}/index.vue`; Modify `src/database/backup.ts` for all relations；Test `src/data-management/service.test.ts`, `e2e/data-management.spec.ts`。

**Interfaces:** `previewBackup(text): BackupPreview`、`restoreBackup(text): Promise<void>` 保持兼容；`clearRebuildableCache(): Promise<void>` 不删学习/原文/字体；`saveFeedback(input): Promise<string>` 离线保存并导出，无后台不显示发送。

- [ ] 写失败测试：所有新增实体备份往返；旧备份缺新表；损坏引用/未来版本拒绝且现有数据不变；恢复前快照可还原；清缓存保留学习/书/笔记；反馈不附隐私正文。
- [ ] Run 数据管理/备份测试观察失败。
- [ ] 原备份面板外观保持，仅改服务；新数据页提供明细和范围确认；帮助覆盖学习/字体/PDF/备份/错误恢复，许可来源和清单来自真实项目。
- [ ] Run 新 E2E、数据库升级测试、构建。
- [ ] 提交 `feat: 完善数据隐私备份恢复与帮助反馈`。

## Task 13: H5 离线准备与重启

**Files:** Create `build/offlinePlugin.ts`, `src/offline/client.ts`, `src/pages/offline-resources/index.vue`; Modify Vite plugin registration and App lifecycle only；Test `e2e/offline.spec.ts` against built H5。

**Interfaces:** 原子版本缓存应用壳/字库/当前字体/PDF解析资源；其余按需；`prepareOffline(): Promise<OfflineStatus>`、`readOfflineStatus(): Promise<OfflineStatus>`。

- [ ] 写生产 E2E：在线准备→断网刷新→新页重开→学习与已缓存阅读；缓存失败保留上一版本；普通 HTTP 给能力说明；清缓存不清用户库。
- [ ] Run 新 E2E 观察缺少 SW 导致失败。
- [ ] 使用现有 Vite 构建 API 和原生 Service Worker，不引新 UI 库；状态只在新增资源页面显示，不改旧首页。
- [ ] Run 生产离线 E2E、H5/App 构建。
- [ ] 提交 `feat: 支持 H5 资源准备与离线重新启动`。

## Task 14: 全流程验收、旧测试修正与分支审阅

**Files:** Existing/new tests and README/database docs；必要 bugfix 先加回归测试。

**Interfaces:** 以上全部模块；所有旧 UI 默认样式与原导航保护。

- [ ] 核查基线旧测试与真实默认字体、scroll-view、继续本轮按钮/先打开书等差异；改用实际可观察行为，保留断言强度，不修改产品 UI 迎合旧测试。
- [ ] Run `pnpm type-check`、完整 Vitest、`pnpm build:h5`、`pnpm build:app`、完整合理 E2E；平台专项未具备条件的如实记录而非声称通过。
- [ ] 对比原17页相同状态截图，新页 320/390/430px/深色/键盘/缩放；补遗漏回归。
- [ ] 一次独立全分支审阅；重要问题本人 RED→GREEN 修复，完整套件验证。
- [ ] 提交必要修复与最终验收记录；工作区干净，报告分支/提交和未验证真机项目，不默认合并或推送。

## 预检与执行记录

任务接口依赖：1→2/3/4/5/6；3→4；4→5/6；7→8；8/9→6 的完整测评范围；10/11→12；12→13；全部→14。

实施细节和任务结果逐项记入本计划的执行账本，已经完成的任务按提交恢复，不重复实现。设计整体已确认；按用户“开始执行”继续完成，不在任务之间等待新的许可。
