ROUND 1
Seen in one second: 关卡复习的范围选择、中央大字、底部认识与不认识。
Idea (one sentence): 沿用现有字体和主题，让用户一次只判断一个已学字。
Live thing: 作答后按到期时间切换下一字，各列表保存独立位置。
Layout words by section: header=title / filters=segmented / content=glyph / actions=pair
Scores: design 7 · usability 8 · creativity 6 · content 8 → overall 7.3
Caps applied: Operate 局部功能沿用项目设计，没有重新抽取风格或更换主题；照片与营销动效不适用于纯文字复习任务。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 首次 inspect 截到了数据库导入遮罩，不能据此判断页面；已加就绪等待包装，重新检查所有视口。
2. 首轮 populated-review-320.png 中按钮文字靠上；uni-app 标签转换使后代 button 选择器未匹配，已改为类选择器与 flex 居中。
3. 12px 排期说明偏小；已增至 13px，最终 lint 为 0 FAIL / 0 WARN，inspect 为 0 FAIL / 1 WARN。

ROUND 2
Seen in one second: 标题与三个筛选，空状态提供返回学习；有数据时中央为学习字形。
Idea (one sentence): 识字判断使用最大空间，其他信息保持次要。
Live thing: 认识延长间隔，不认识五分钟后再安排；优先处理最早到期的旧字。
Layout words by section: header=title / filters=segmented / content=glyph-or-empty / actions=pair-or-return
Scores: design 7.5 · usability 8.5 · creativity 6 · content 8.5 → overall 7.7
Caps applied: 保留现有系统与单列学习宽度，无重新设计品牌。没有摄影、插图或模拟用户内容。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. desktop-fold.jpg 的 hero-void 警告保留：这是首次使用的空字表及与学习页一致的 560px 单列，中央有明确返回学习操作，不用装饰填空。
2. 手机上的空状态有较多留白：与单字复习区共用固定全屏骨架，避免空 / 有数据切换时操作区域失去位置；有数据的 320/390/768/1440 视口另经浏览器测试与截图检查。
3. 尚无 Android 真机截图：仅确认 App 构建和 manifest 的 5.34 版本，当前 adb 无连接设备。

已逐张查看最终 inspect 的六张 fold / page 图片；数据状态使用真实字库文字与独立测试复习记录。没有新增图片资产、外部字体或运行时网络依赖。
