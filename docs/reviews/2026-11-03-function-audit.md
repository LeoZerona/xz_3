# 字体学习：功能现状与缺口审计

日期：2026-11-03。基线：`main` 的 `ad547a4`。用户已选择首期完善离线学习闭环，账号、云同步、社区留待后续。

用户追加约束：**已有功能模块 UI 保持原样，仅完善功能或修复问题；只绘制、实现原本没有的功能页面。** 后续不以竞品参考或组件拆分为由调整旧页面布局和样式。

## 1. 项目事实与检查范围

- 技术栈：Vue 3.4.21、Composition API、TypeScript、uni-app 5.34 对应编译包、Vite 5.2.8、Pinia 2、Vant 4、CSS/SCSS 与既有主题 token。
- 平台：H5 与 Android App-vue；不能据此声明小程序、nvue、uvue、iOS 可用。
- 数据：H5 IndexedDB、App `plus.sqlite`，数据库版本 2；没有账号服务端。
- 包管理器：pnpm 11.19.0，现有 `pnpm-lock.yaml`；Node 本次实际为 22.22.0。
- 已注册 17 个页面；32 个单元测试文件、20 个 E2E 文件。
- 实际脚本：`type-check`、`test`、`test:e2e`、`build:h5`、`build:app`；没有 lint 脚本。
- 审计覆盖导航、17 个页面的入口及主要处理逻辑、学习/复习 store、字库生成、阅读存储、schema、备份、现有测试。初始工作区干净。
- 证据等级：下表区分源码确认和运行验证；“已有实现”不等于所有设备均已验收。

## 2. 模块清单

| 模块 | 已有实现 | 缺口及影响 | 源码证据 | 优先级 |
| --- | --- | --- | --- | --- |
| 今日学习与计划 | 每日固定字单、三种题型、预览、断点、收藏/斩字、计划滚轮 | 每日范围只有 204 字；完成日期写死；缺少计划范围、历史和统一结果页 | `src/pages/plan/index.vue`、`src/study/README.md`、`build/catalogSeed.ts` | P0/P1 |
| 关卡学习 | 一级 3500 字/351 关、四种布局、最近选择、重复训练与独立进度 | 二级 15 个、三级 12 个空占位关卡；“偏旁部首”实际为旧字库中 30 个部首组各取一字，不能视为完整部首课程 | `build/catalogSeed.ts`、`src/study/levelData.ts` | P1 |
| 关卡复习 | 到期排序、认识/不认识、提前复习、全部/斩字/收藏独立游标、间隔排期 | 仅关卡已学字进入；没有统一复习总览、错题本、会话报告；不更新首页复习数 | `src/pages/level-review/useLevelReview.ts`、`src/stores/levelReview.ts` | P0/P1 |
| 学习时长 | 存储有 `studySeconds`，store 有累计方法 | 每日答题页仅声明 `studyTimer`；学习页、关卡页、复习流程没有调用累计时长方法，首页时长缺乏实际来源 | `src/pages/study/index.vue`、`src/stores/dailyProgress.ts` | P0 |
| 字典搜索与比较 | 完整当前字库汉字/拼音搜索、历史、分页、字组查询、最多 6 字比较、文字详情 | 词语、句子、文章三个模式明确未开放；词语 chip 无详情联动 | `src/pages/search/useCharacterSearch.ts`、`src/pages/search/index.vue`、`src/pages/character-detail/components/CharacterDetailContent.vue` | P1 |
| 收藏与斩字 | 单字已有收藏和斩字持久化；复习可按它们筛选 | “我的收藏”无页面；没有总列表、搜索、批量管理或自定义字单 | `src/stores/characterLearning.ts`、`src/pages/profile/index.vue` | P1 |
| 学习统计、日历、识字量 | 有长期单字和每日会话等历史数据 | 三个个人菜单均占位；累计已学与坚持天数写死为 0；现有累计字段无法还原每一次历史作答 | `src/pages/profile/index.vue`、`src/database/schema.ts` | P0/P1 |
| 阅读与图书 | 内置/导入 TXT、PDF、书架检索、目录、自动翻页、排版、隐藏对照及逐步展示、阅读位置 | “我的图书”入口未联通；无书籍详情、书签、摘录、笔记、全文命中跳转；单个 `reading/index.vue` 承担多流程 | `src/pages/reading/index.vue`、`src/reading/customBooks.ts` | P1 |
| 字体、主题、布局 | 字体浏览/导入/切换、主题、四种关卡布局 | 字体缺字提示与导入失败恢复需补；备份不含独立字体文件；长辈版只改变设置页局部字号与行高 | `src/pages/plan/components/FontCatalog.vue`、`src/pages/settings/index.vue`、`src/components/DatabaseBackupPanel.vue` | P1/P2 |
| 个人资料 | 昵称、性别、生日、地区可编辑并持久化 | 头像是占位；BczID 固定；IP 属地固定为“福建”，却提示根据网络信息展示 | `src/pages/profile/index.vue`、`src/pages/personal-profile/index.vue`、`src/profile/types.ts` | P0/P2 |
| 消息与提醒 | 首页有消息按钮，两个提醒菜单 | 消息按钮无事件；提醒均占位；目前 manifest 只有 SQLite 模块，不能承诺系统通知已支持 | `src/pages/index/index.vue`、`src/pages/profile/index.vue`、`src/manifest.json` | P1/P2 |
| 设置、数据与帮助 | 数据库失败重试、JSON 备份恢复、旧数据迁移、恢复前快照 | 学习设置、隐私、缓存、信息清单、第三方清单、帮助、关于均未落地；账号、退出、扫一扫无实现 | `src/pages/settings/index.vue`、`src/pages/profile/index.vue`、`src/database/README.md` | P1/P2 |

## 3. 必须优先解决的数据口径

1. **新学、关卡完成与掌握不能混为一个数字。** 单字去重统计“已学”；训练按轮计数；“熟练”需要有后续复习证据。斩字不直接等于掌握。
2. **首页“已复习”需要真实作答来源。** 现有首页读 `dailyProgress.reviewedCount`，关卡复习只写 `level_review`，两条链路没有接通。
3. **时长需要真正采集。** 存在字段和显示并不代表计时已工作；计时要处理后台、空闲和跨日，避免多个页面重复累计。
4. **每日 204 字是既有兼容范围。** 不能扩充时直接改旧字单或重建当日任务；需要新增可选课程范围并保留历史。
5. **老记录不具备逐题历史。** 可以迁移已知总量与真实日期，不能据此补造某天的每次答题、阅读分钟或错题来源。
6. **缺少内容不能伪装成功。** 二三级课程、词语释义、说文内容需真实来源；已有“未收录”字段不应由模型补写成权威解释。

## 4. 本次运行基线

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm type-check` | 通过，exit 0 | 本次实际运行 |
| `pnpm test` | 157 通过、1 失败，共 158 | 32 文件中 31 通过；失败为 SQLite 含 NUL 特殊文本测试 |
| `pnpm build:h5` | 通过，exit 0 | 本次实际运行 |
| `pnpm build:app` | 通过，exit 0 | 仅 App 资源构建，不等于真机测试 |
| 手机 E2E：home/navigation/level-review/reading | 21 通过、9 失败 | 30 项、2 workers，3.2 分钟；详见下述分类 |
| 复跑 `e2e/level-review.spec.ts --workers=1` | 8/8 通过 | 覆盖排期/恢复、三范围与多视口；首轮该文件首条等待失败未复现 |
| Android 真机 | 未验证 | 仍需 HBuilderX SQLite 基座、文件读写、后台和通知验证 |

沙箱内首次 Vitest 在装载配置前因 esbuild 无法读取祖先目录而失败；授权的沙箱外运行才产生上述测试结果，这两类失败不可混为一谈。

特殊文本问题的最小核查：Node 22.22.0 直接执行 `SELECT '一'||char(0)||'O''Reilly'`，返回 JS 字符串为“一”，同一查询得到的 `hex(...)` 为 `E4B880004F275265696C6C79`，说明 SQLite 内字节完整、当前 Node 文本读取结果截断。尚未据此确认 Android 桥接存在相同问题；实施阶段应明确测试运行时支持范围并核实真机，保留特殊文本断言。

E2E 失败分类：

- `home.spec.ts` 的字体管理仍要求固定“楷体/微软雅黑”，实际资源目录生成的默认字体是“方正特雅宋简体/方正小篆体”；阅读老用例在尚未打开书的书架页查找阅读器“目录”按钮；导航重入用例仍只查“开始学习”，当前未完成轮次显示“继续本轮学习”。这些与当前源码/失败快照一致，不能据此反向改旧 UI。
- 个人页老用例用整个 document 的滚动高度判断，但当前使用 `scroll-view`；需要以实际滚动容器验证功能，不能为了用例改回整页滚动。
- 首页/预览/关卡复习首批出现 5 秒内页面元素未就绪；复习文件完整复跑 8/8 通过。冷启动、等待条件和剩余预览断言需实施阶段分别核实，尚不声称全部只是测试问题。
- 首页老用例后续还保留 `x/y`、`xxx min` 等旧占位预期，当前源码已为实际数值；本轮先记录测试债务，不降低断言或改产品匹配它们。

## 5. 竞品参考与采用边界

以下为官方公开资料的功能参考，非对商业产品界面的复制。查阅日期 2026-11-03。

| 参考 | 可核查能力 | 本项目采用 |
| --- | --- | --- |
| [Anki 筛选牌组](https://docs.ankiweb.net/manual/filtered-decks) | 按状态/标签选材、复习错题、提前学习 | 收藏/错题/课程筛选生成练习；临时练习与正式排期明确区分 |
| [Anki 统计](https://docs.ankiweb.net/manual/stats) | 当日和历史统计、单卡复习信息 | 数据总览→日期→明细，区分字数与作答次数 |
| [Duolingo 专项练习](https://blog.duolingo.com/guide-to-duolingo-practice-hub/) | 错误回顾、专项技能练习 | 复习中心、错题专项、结果后推荐下一步 |
| [Pleco 阅读器](https://android.pleco.com/manual/310/reader.html) | 阅读中查字及加入闪卡 | 查字→收藏→字单练习→返回原文，保留阅读位置 |
| [Readwise 批注](https://docs.readwise.io/reader/docs/faqs/highlights-tags-notes) | 摘录、笔记、标签 | 书籍→书签/摘录→笔记→原文定位 |
| [教育部字表说明](https://www.moe.gov.cn/jyb_xwfb/s271/202009/t20200915_488073.html) | 一级 3500、二级 3000、三级 1605，共 8105 字 | 作为课程范围核对依据；具体导入材料与字典内容仍需来源和许可检查 |

完整的页面、数据设计、交付边界见 [离线学习模块设计](../superpowers/specs/2026-11-03-offline-learning-design.md)。

## 5.1 设计交付与验证

- [新增模块交互草图 v2](../superpowers/mockups/new-modules-only-v2.html)：12 个主视图及关联编辑/详情，仅绘制未有的页面；旧详情、答题和复习只说明复用边界。
- 浏览器验证：12 个视图在 320/390/430px 共 36 个组合无内容横向溢出；收藏→字单编辑→专项配置→旧答题复用说明→报告、提醒编辑→保存、搜索无匹配等路径可操作；无页面 JavaScript 错误，检查深色主题及 390px 整页。
- 设计完成一次可执行性审阅及一次 UI 约束复审，排期、专项、正式完成和 H5 离线启动合同已明确；复审结论为无重大未决问题。
- 本轮只新增文档与 HTML 草图，未修改 `src/`、依赖或产品构建配置；基线测试重写的三张历史截图已恢复。

## 6. 审计工作清单

- [x] 识别真实栈、平台、包管理器、脚本和仓库状态。
- [x] 核查页面、占位入口及关联数据流。
- [x] 查阅学习软件官方模块说明。
- [x] 与用户确定离线优先范围。
- [x] 运行类型检查、单元测试、H5/App 构建。
- [x] 汇总手机 E2E 结果与失败分类。
- [x] 完成设计可执行性审阅并明确四项数据/离线合同。
- [x] 按用户补充要求冻结已有模块 UI，草图仅展示新页面。
- [ ] 由用户确认设计，随后编写实施计划；本轮尚未改产品代码。
