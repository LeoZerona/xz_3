# 第二轮：重构关卡布局

2026-11-01。保留 Vue 3、uni-app、TypeScript、Pinia、Vant、SCSS 和 pnpm。

## 先解决布局问题

上一版将进度和关卡放进等权矩形，形成了“总览面板＋卡片墙”。字体放大了，但没有让“这次学哪关”成为主线。检查器没有发现违规，不能据此判断设计已经适合用户。

本次首先回答：**现在从哪一关继续，同时还能方便地浏览其他关卡？**

参考官方资料：

- [Duolingo：学习路径改版](https://blog.duolingo.com/new-duolingo-home-screen-design/)：借鉴突出当前学习位置的顺序组织方式。
- [Skritter：Dashboard Overview](https://docs.skritter.com/article/197-dashboard-overview)：借鉴字表范围、直接学习、按列表学习之间的层级。
- [Skritter：Getting Started](https://docs.skritter.com/article/202-getting-started)：确认字表是学习内容的实际组织单位。

实现采用独立设计，不使用这些产品的图片、吉祥物、奖励或锁关规则。所有未学关卡仍可直接进入。

## 方向与内容

本次选中 **Accent ladder / Open plane**，seed **1011454191**。按用户反馈重新选择整体方向；本次选择后未重抽。保留 palette、type；用用户当前主题的 primarySoft 展开当前关卡，primaryStrong 用于单一学习行动。保留夜间和节日主题的既有颜色。

Idea：**每关十个真实汉字，成为学习路线中可展开的一站。**

Face：真实汉字构成主体；唯一展开的关卡与紧凑目录行形成明确大小对比。Live thing：进行中的已加载关卡优先置顶，整行点击进入现有关卡预览；完成状态、已学字数和动作名称取现有进度。

真实内容延续上一轮 inventory：四个字表、一级 256 关、首批 24 关、每批增加 24 关、每关实际成员、部首分类、二三级占位、完整/部分/未学状态、现有三种练习、遮盖和斩字、五个用户主题、四个底栏入口。没有新增样例数据、外部图片或字体。

## 新结构

- 桌面：左侧 220px 字表索引，右侧独立滚动的关卡目录；内容边界为 1100px = 220 + 44 + 836。
- 手机和平板：字表索引折叠为顶部四项分段选择，目录使用整行宽度。
- 总进度缩成标题下的一行，不再单独占一个大面板。
- 当前关卡只出现一次，展开十字和学习行动；其他关卡以单行字形预览、学习状态、进度节点呈现。
- 节点表达已完成、进行中、未开始和待上线；部分进度环来自实际比例。
- 首选关卡只从当前已加载数据中选择；其余关卡保持原顺序。没有更改持久化、解锁规则或练习内容。

| 结构项目 | 上一版 | 本轮 |
| --- | --- | --- |
| 手机当前学习内容开始位置 | 约 405px | 约 252px |
| 进度区域 | 单独的大面板及快捷入口 | 两行标题与进度 |
| 关卡 | 4/3/2 列等权卡片 | 当前关卡展开，其余紧凑行 |
| 桌面分类 | 内容上方页签 | 左侧字表索引及真实关卡数 |
| 默认主题三视口检查 | 0 FAIL / 0 WARN | 0 FAIL / 0 WARN |

## 视觉复查

ROUND 1
Seen in one second: 当前关卡与连续目录。
Idea (one sentence): 每关十个真实汉字成为路线中可展开的一站。
Live thing: 根据真实进度展开要学的一关，其他关卡可直接选择。
Layout words by section: 字表=侧栏/分段选择 · 进度=行 · 当前关卡=展开行 · 其余关卡=连续列表。
Scores: design 7.4 · usability 7.8 · creativity 7.0 · content 8.5 → overall 7.6。
Caps applied: 应用屏幕不使用营销页图片数量、动效数量要求。路线式结构是已知方式的具体应用，创意不按独创概念评分。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. mobile-fold.jpg：独立“学习路线”标题与说明又加了一层阅读台阶；删除重复标题。
2. desktop-fold.jpg：主题浅色区域上的字数和选中字表关卡数只有 4.3:1 对比；改为主题正文色。
3. tablet-fold.jpg：标题旁口号重复“每关十字”；删除，保留实际字表说明。

ROUND 2
Seen in one second: 当前关卡，十字预览与开始学习。
Idea (one sentence): 每关十个真实汉字成为路线中可展开的一站。
Live thing: 继续、开始和复习由已有进度决定，全部目录仍可自由进入。
Layout words by section: 字表=侧栏/分段选择 · 进度=行 · 当前关卡=展开行 · 其余关卡=连续列表。
Scores: design 7.7 · usability 8.1 · creativity 7.0 · content 8.5 → overall 7.7。
Caps applied: 分数只作内部复查，不能替代用户审美判断。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 默认主题的六张最终输出截图已全部查看，没有剩余阻断问题。
2. 短屏 320px 需要继续滚动查看后续关卡，这是放大当前学习内容的取舍。
3. 长字表仍需逐批加载；首选关卡也只基于已加载批次，未增加查询全量关卡的行为。

## 本轮验证

- `pnpm type-check`：通过。
- `pnpm build:h5`：通过。
- `pnpm build:app`：通过编译；未做 Android 真机验证。
- 生产构建 `levels-design.spec.ts` 与 `levels.spec.ts`：**26 个测试通过**。覆盖 320/390/768/1440px、键盘分类、五种主题、刷新保留、关卡进度、原有预览与练习、斩字、导航、返回后批次保留。
- 最终生产检查：**1440/768/390px 均 0 FAIL / 0 WARN**；六张输出截图均已查看。另查看青竹绿、墨夜的手机效果与墨夜桌面效果。
- 源扫描：0 FAIL；唯一 WARN 为移除共享底栏阴影的 `box-shadow: none`，实际渲染没有阴影问题。未跳过检查项。
- `git diff --check`：通过。

父页面保持加载、分类、派生视图和导航编排；三个子组件分别承担字表选择、进度说明、关卡呈现。父页面和关卡组件超过约 300 行的部分主要是当前改版的响应式样式；评估后保留同一交互对象的完整布局，未将样式机械迁移到其他文件。

未新增依赖、路由或存储。其他已有工作区改动保留。
