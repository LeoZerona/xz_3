# 第三轮：轻松的学习 App

用户明确选择：“整体像后台，想更像轻松的学习 App”。本轮以这一偏好为依据，替代上一轮课程后台式布局。

采用 **Pastel consumer**，seed **85710821**，保留用户已有 palette / type。示例 shell 的侧栏与用户明确要求冲突，因此不采用侧栏，使用已有四个底栏入口；未重新抽取。No new assets / sample data：没有新增图片、字体或样例字表。

屏幕的问题：**这次想学哪十个字？**

Idea：**一关十字成为一张可以拿起来学习的字卡。**

Face：真实汉字本身，五字两行、直接放在柔和底色上。Live thing：从现有进度挑选当前关卡，顶部一个动作进入学习，任何字卡也可直接进入原有关卡预览。

## 结构变化

- 去掉桌面侧栏、路线圆点与连接线。
- 移除大面积展开关卡，改为同尺寸同类字卡；当前一关只用主题浅色与“从这里开始/进行中/已完成”区分。
- 桌面三列，手机和平板双列。圆角 20px，无边框与静态阴影，汉字周围不再套独立白色小块。
- 分类是顶部四个简单选项，桌面保持内容宽度，手机适应屏宽。
- 学习按钮移至标题旁，支持开始、继续和复习；进度只保留真实已学字数及完成关数，取消总览式大数字。
- 当前主题的 surfaceMuted、primarySoft、primaryStrong、onPrimary、text 等变量完整继承；没有新增固定配色。

仍保留：四类字表、二三级占位提示、每关全部十字预览、24 关分批加载、状态持久化、整卡与键盘进入学习、原有预览/遮盖/斩字/练习与底栏导航。字卡排序与快捷学习仍基于已有已加载批次。

## 视觉复查

ROUND 1
Seen in one second: 汉字字卡与开始学习。
Idea (one sentence): 一关十字成为一张可直接进入学习的字卡。
Live thing: 开始/继续/复习及整卡选择。
Layout words by section: 标题=文案与行动 / 分类=简单选项 / 字表=小标题与完成关数 / 关卡=柔和字卡。
Scores: design 7.3 · usability 7.8 · creativity 6.8 · content 8.3 → overall 7.5。
Caps applied: 应用屏幕规则，分数不代表用户审美验收。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. desktop-fold.jpg：选中分类背景被拉得过宽；分类改为内容宽度，手机保持均分。
2. mobile-fold.jpg：字数及完成关数为 12px；提高到 13px。
3. 浅色区域的强调字在部分主题中对比偏弱；选中分类与当前卡标题改为主题正文色。

ROUND 2
Seen in one second: 本次字卡和单一学习行动。
Idea (one sentence): 每关十字直接作为字卡主体，不使用课程后台的路线装饰。
Live thing: 开始/继续/复习由真实进度驱动。
Layout words by section: 标题=文案与行动 / 分类=简单选项 / 字表=小标题与完成关数 / 关卡=柔和字卡。
Scores: design 7.5 · usability 8.0 · creativity 6.8 · content 8.3 → overall 7.6。
Caps applied: 已知字卡方式的具体应用，创意不作独创概念评分。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 最终默认主题的全部六张截图已查看，无可见阻断问题。
2. 桌面首屏显示 9/24 个关卡，检查器给出 below-fold 警告；这是完整字表的可滚动分批目录，24 关无需同时塞进一屏。保留正常字号与原有批次。
3. 当前一关带额外状态文字，会令同排卡片保留一行状态空间；卡片底边对齐，后续行不强制填入无意义状态。

## 验证

- `pnpm type-check`：通过。
- `pnpm build:h5`、`pnpm build:app`：通过。
- 生产版 `levels-design.spec.ts`、`levels.spec.ts`：**26 个 E2E 全部通过**。
- 覆盖 320/390/768/1440px、五种主题与刷新保留、分类键盘选择、当前关卡、批次加载、学习反馈、斩字、导航和返回后目录保留。
- 生产视觉检查 1440/768/390：**0 FAIL / 1 WARN**；警告为上文解释的完整目录 below-fold，没有关闭检查。
- 源扫描 0 FAIL；唯一 WARN 来自移除共享底栏阴影的 `box-shadow: none`。
- 查看默认三视口全部截图，以及青竹绿、墨夜手机截图。
- `git diff --check`：通过。未运行新的单元测试；本轮主要为布局与样式，行为由以上 E2E 覆盖。

父页面保留加载、派生数据与导航，样式仅涉及该页面。字卡组件从 326 行减为约 203 行；父页面超过 300 行已评估，主要是页面编排和响应式样式，未机械移走样式规避行数。

未验证 Android 真机和原生安全区；App 构建通过不等于真机运行验证。
